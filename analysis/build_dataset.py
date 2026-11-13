"""Build the Furrow field bundle for the Ashulia demo field.

Reads the raw NASA pulls in data/raw/ and writes:
  data/derived/ashulia.json          the bundle (committed; small)
  mobile/src/data/ashulia.json       same file, bundled into the app as the offline fallback
  supabase/seed.sql                  the same rows for the Supabase tables

Standard library only.

Real NASA data: POWER daily (weather, soil wetness), MODIS MOD13Q1 NDVI,
NEX-GDDP-CMIP6 (sampled years, if data/raw/cmip6_point.json exists).
DEMO data, labelled as such everywhere: drone flights (synthetic, seeded),
soil profile values. Thresholds used here are literature defaults for the
agronomy lead to confirm (see THRESHOLDS).

Usage:  python3 analysis/build_dataset.py
"""

from __future__ import annotations

import json
import math
import statistics as st
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
FIELD_ID = "ashulia-demo"
LAT, LON = 23.9, 90.3

BASE_YEARS = range(2001, 2026)  # 25 complete years for climatologies
CURRENT_YEAR = 2026
# POWER rain, soil wetness and temperature shift abruptly from 2017 at this location
# (annual rain ~1,600 mm before, 2,000-4,000 mm after). Cause not confirmed; we do not
# fit trends across it. Trends use 1996-2016 only.
BREAK_YEAR = 2017

THRESHOLDS = {
    "heat_c": 35.0,  # rice spikelet sterility above ~35 degC at anthesis (Jagadish et al. 2008; confirm)
    "cold_c": 15.0,  # cold injury risk when Tmin falls below ~15 degC near booting/flowering (confirm)
    "dry_mm": 1.0,  # a "dry day" has less than 1 mm rain
}


# ----------------------------------------------------------------------------- helpers
def r(x: float | None, n: int = 1) -> float | None:
    return None if x is None else round(x, n)


def mean(xs):
    xs = [x for x in xs if x is not None]
    return st.fmean(xs) if xs else None


def pct(xs, p):
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    k = (len(xs) - 1) * p
    f, c = math.floor(k), math.ceil(k)
    return xs[f] if f == c else xs[f] + (xs[c] - xs[f]) * (k - f)


def linfit(xs, ys):
    mx, my = st.fmean(xs), st.fmean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    a = my - b * mx
    resid = [y - (a + b * x) for x, y in zip(xs, ys)]
    sd = math.sqrt(sum(e * e for e in resid) / (len(xs) - 2))
    return a, b, sd


def extraterrestrial_radiation(doy: int, lat_deg: float) -> float:
    """FAO-56 eq. 21, MJ m-2 day-1."""
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)
    delta = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
    ws = math.acos(-math.tan(phi) * math.tan(delta))
    return 24 * 60 / math.pi * 0.0820 * dr * (
        ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws)
    )


def et0_hargreaves(tmax: float, tmin: float, doy: int) -> float:
    """FAO-56 eq. 52 (Hargreaves), mm/day."""
    tmean = (tmax + tmin) / 2
    return 0.0023 * (tmean + 17.8) * math.sqrt(max(tmax - tmin, 0)) * 0.408 * extraterrestrial_radiation(doy, LAT)


def mulberry32(seed: int):
    state = seed & 0xFFFFFFFF

    def rnd() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rnd


# ----------------------------------------------------------------------------- POWER
def load_cmip6():
    data = {}
    for path in sorted(RAW.glob("cmip6_point*.json")):
        data.update(json.loads(path.read_text()))
    return data


def tmax_offsets(raw_days, cmip6):
    """Monthly offset that brings POWER Tmax to the NEX-GDDP-CMIP6 historical level.

    NEX-GDDP-CMIP6 is bias-corrected to observations (GMFD). POWER (reanalysis, ~0.5 deg)
    runs 2-4 degC warm here in Mar-May. Offset = CMIP6 historical sampled-year monthly
    mean minus POWER 2001-2014 monthly mean, smoothed over 3 months.
    """
    hist = defaultdict(list)
    for key, e in cmip6.items():
        model, scen, var, year = key.split("|")
        if scen != "historical" or var != "tasmax":
            continue
        d0 = date(int(year), 1, 1)
        for i, v in enumerate(e["values"]):
            hist[(d0 + timedelta(days=i)).month].append(v)
    if not hist:
        return [0.0] * 12
    pw = defaultdict(list)
    for d in raw_days:
        if 2001 <= d["date"].year <= 2014:
            pw[d["date"].month].append(d["T2M_MAX"])
    raw = [st.fmean(hist[m]) - st.fmean(pw[m]) for m in range(1, 13)]
    return [round((raw[(i - 1) % 12] + raw[i] + raw[(i + 1) % 12]) / 3, 2) for i in range(12)]


def load_power(offsets=None):
    raw = json.loads((RAW / "power_daily.json").read_text())
    p = raw["properties"]["parameter"]
    days = []
    for k in sorted(p["T2M"]):
        row = {name: p[name][k] for name in p}
        if any(v == -999 for v in row.values()):
            continue
        d = date(int(k[:4]), int(k[4:6]), int(k[6:]))
        row["date"] = d
        if offsets:
            off = offsets[d.month - 1]
            row["T2M_MAX_RAW"] = row["T2M_MAX"]
            row["T2M_MAX"] = row["T2M_MAX"] + off
            row["T2M"] = row["T2M"] + off / 2  # Tmin left as is; mean moves by half
        row["et0"] = et0_hargreaves(row["T2M_MAX"], row["T2M_MIN"], d.timetuple().tm_yday)
        days.append(row)
    return days


def longest_run(flags):
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f else 0
        best = max(best, cur)
    return best


def climate_tables(days):
    by_year = defaultdict(list)
    by_ym = defaultdict(list)
    for d in days:
        by_year[d["date"].year].append(d)
        by_ym[(d["date"].year, d["date"].month)].append(d)

    annual = []
    for y in sorted(by_year):
        ds = by_year[y]
        if len(ds) < 360:
            continue  # partial year
        ma = [d for d in ds if d["date"].month in (3, 4)]
        aman = [d for d in ds if 7 <= d["date"].month <= 10]
        annual.append(
            {
                "field_id": FIELD_ID,
                "year": y,
                "tmean": r(mean(d["T2M"] for d in ds), 2),
                "tmax": r(mean(d["T2M_MAX"] for d in ds), 2),
                "rain_mm": r(sum(d["PRECTOTCORR"] for d in ds), 0),
                "heat_days": sum(d["T2M_MAX"] >= THRESHOLDS["heat_c"] for d in ds),
                "heat_days_mar_apr": sum(d["T2M_MAX"] >= THRESHOLDS["heat_c"] for d in ma),
                "aman_rain_mm": r(sum(d["PRECTOTCORR"] for d in aman), 0),
                "aman_dry_spell": longest_run(d["PRECTOTCORR"] < THRESHOLDS["dry_mm"] for d in aman),
                "heavy_rain_days": sum(d["PRECTOTCORR"] >= 50 for d in ds),
                "max_day_rain": r(max(d["PRECTOTCORR"] for d in ds), 0),
                "rain_jul_sep": r(sum(d["PRECTOTCORR"] for d in ds if 7 <= d["date"].month <= 9), 0),
                "rain_nov_apr": r(sum(d["PRECTOTCORR"] for d in ds if d["date"].month >= 11 or d["date"].month <= 4), 0),
                "gwet_root": r(mean(d["GWETROOT"] for d in ds), 3),
                "gwet_root_dry": r(mean(d["GWETROOT"] for d in ds if d["date"].month in (1, 2, 3, 4)), 3),
            }
        )

    monthly_series = []
    for (y, m), ds in sorted(by_ym.items()):
        monthly_series.append(
            {
                "field_id": FIELD_ID,
                "year": y,
                "month": m,
                "days": len(ds),
                "tmax": r(mean(d["T2M_MAX"] for d in ds), 2),
                "tmin": r(mean(d["T2M_MIN"] for d in ds), 2),
                "rain_mm": r(sum(d["PRECTOTCORR"] for d in ds), 1),
                "et0_mm": r(sum(d["et0"] for d in ds), 1),
                "heat_days": sum(d["T2M_MAX"] >= THRESHOLDS["heat_c"] for d in ds),
                "hot38_days": sum(d["T2M_MAX"] >= 38 for d in ds),
                "cold_days": sum(d["T2M_MIN"] < THRESHOLDS["cold_c"] for d in ds),
                "heavy_days": sum(d["PRECTOTCORR"] >= 50 for d in ds),
                "gwet_root": r(mean(d["GWETROOT"] for d in ds), 3),
            }
        )

    monthly = []
    for m in range(1, 13):
        rows = [x for x in monthly_series if x["month"] == m and x["year"] in BASE_YEARS]
        cur = next((x for x in monthly_series if x["year"] == CURRENT_YEAR and x["month"] == m and x["days"] >= 25), None)
        monthly.append(
            {
                "field_id": FIELD_ID,
                "month": m,
                "tmax": r(mean(x["tmax"] for x in rows), 2),
                "tmin": r(mean(x["tmin"] for x in rows), 2),
                "rain_mm": r(mean(x["rain_mm"] for x in rows), 1),
                "rain_p20": r(pct([x["rain_mm"] for x in rows], 0.2), 1),
                "rain_p80": r(pct([x["rain_mm"] for x in rows], 0.8), 1),
                "et0_mm": r(mean(x["et0_mm"] for x in rows), 1),
                "heat_days": r(mean(x["heat_days"] for x in rows), 2),
                "hot38_days": r(mean(x["hot38_days"] for x in rows), 2),
                "cold_days": r(mean(x["cold_days"] for x in rows), 2),
                "heavy_days": r(mean(x["heavy_days"] for x in rows), 2),
                "gwet_root": r(mean(x["gwet_root"] for x in rows), 3),
                "rain_current": cur and cur["rain_mm"],
                "tmax_current": cur and cur["tmax"],
                "gwet_root_current": cur and cur["gwet_root"],
            }
        )

    last = days[-1]["date"]
    recent = [
        {
            "field_id": FIELD_ID,
            "date": d["date"].isoformat(),
            "tmax": r(d["T2M_MAX"], 1),
            "tmin": r(d["T2M_MIN"], 1),
            "rain_mm": r(d["PRECTOTCORR"], 1),
            "gwet_root": r(d["GWETROOT"], 3),
            "gwet_top": r(d["GWETTOP"], 3),
            "rh": r(d["RH2M"], 0),
        }
        for d in days
        if d["date"] > last - timedelta(days=90)
    ]
    return annual, monthly_series, monthly, recent


def trends(annual):
    out = {}
    pre = [a for a in annual if a["year"] < BREAK_YEAR]
    years = [a["year"] for a in pre]
    for key in ["tmean", "tmax", "rain_mm", "heat_days", "heat_days_mar_apr", "aman_rain_mm", "aman_dry_spell", "gwet_root", "gwet_root_dry"]:
        ys = [a[key] for a in pre]
        a, b, sd = linfit(years, ys)
        first = mean(ys[:10])
        last10 = mean(ys[-10:])
        out[key] = {
            "per_decade": r(b * 10, 3),
            "first_decade": r(first, 3),
            "last_decade": r(last10, 3),
            "first_label": f"{years[0]}–{years[9]}",
            "last_label": f"{years[-10]}–{years[-1]}",
            "fit_a": a,
            "fit_b": b,
            "resid_sd": sd,
        }
    return out


# ----------------------------------------------------------------------------- MODIS
def ndvi_tables():
    path = RAW / "modis_mod13q1.json"
    raw = json.loads(path.read_text())
    series = []
    for s in raw["series"]:
        v = s.get("250m_16_days_NDVI")
        rel = s.get("250m_16_days_pixel_reliability")
        if v is None or v <= -3000:
            continue
        series.append({"field_id": FIELD_ID, "date": s["date"], "ndvi": round(v * 1e-4, 3), "reliability": rel})

    good = [s for s in series if s["reliability"] in (0, 1)]

    def doy(s):
        return date.fromisoformat(s["date"]).timetuple().tm_yday

    clim = []
    for slot in sorted({doy(s) for s in series}):
        base = [s["ndvi"] for s in good if doy(s) == slot and int(s["date"][:4]) in BASE_YEARS]
        cur = next((s for s in series if doy(s) == slot and s["date"].startswith(str(CURRENT_YEAR))), None)
        if len(base) < 5:
            continue
        clim.append(
            {
                "field_id": FIELD_ID,
                "doy": slot,
                "mean": r(st.fmean(base), 3),
                "p10": r(pct(base, 0.1), 3),
                "p90": r(pct(base, 0.9), 3),
                "current": cur and cur["ndvi"],
                "current_reliability": cur and cur["reliability"],
            }
        )

    peaks = []
    years = sorted({int(s["date"][:4]) for s in good})
    for y in years:
        boro = [s["ndvi"] for s in good if s["date"][:4] == str(y) and 2 <= int(s["date"][5:7]) <= 4]
        aman = [s["ndvi"] for s in good if s["date"][:4] == str(y) and 9 <= int(s["date"][5:7]) <= 11]
        peaks.append({"year": y, "boro_peak": r(max(boro), 3) if boro else None, "aman_peak": r(max(aman), 3) if aman else None})
    return series, clim, peaks


# ----------------------------------------------------------------------------- CMIP6
SEASONS = {"DJF": (12, 1, 2), "MAM": (3, 4, 5), "JJAS": (6, 7, 8, 9), "ON": (10, 11)}


def season_of(m):
    return next(k for k, ms in SEASONS.items() if m in ms)


def cmip6_futures(days):
    data = {}
    for path in sorted(RAW.glob("cmip6_point*.json")):
        data.update(json.loads(path.read_text()))
    if not data:
        return [], []

    def series(model, scen, var, year):
        e = data.get(f"{model}|{scen}|{var}|{year}")
        return e and e["values"]

    def season_stats(model, scen, years):
        """Seasonal mean tasmax and seasonal rain total; rain is None if no year has it."""
        tm, pr = defaultdict(list), defaultdict(float)
        nt = npr = 0
        for y in years:
            t, p = series(model, scen, "tasmax", y), series(model, scen, "pr", y)
            d0 = date(y, 1, 1)
            if t:
                nt += 1
                for i, tv in enumerate(t):
                    tm[season_of((d0 + timedelta(days=i)).month)].append(tv)
            if p:
                npr += 1
                for i, pv in enumerate(p):
                    pr[season_of((d0 + timedelta(days=i)).month)] += pv
        if nt == 0:
            return None
        return {s: (st.fmean(tm[s]), pr[s] / npr if npr else None) for s in SEASONS}

    models = sorted({k.split("|")[0] for k in data})
    horizons = {"2030s": [2035, 2040], "2050s": [2055, 2060]}  # uses whichever sampled years exist
    futures, deltas = [], []
    base_days = [d for d in days if d["date"].year in BASE_YEARS]
    for model in models:
        hist = season_stats(model, "historical", [2005, 2012])
        if not hist:
            continue
        for scen in ("ssp245", "ssp585"):
            for hz, yrs in horizons.items():
                fut = season_stats(model, scen, yrs)
                if not fut:
                    continue
                dt = {s: fut[s][0] - hist[s][0] for s in SEASONS}
                has_pr = all(fut[s][1] is not None and hist[s][1] is not None for s in SEASONS)
                pr_ratio = {s: min(max(fut[s][1] / hist[s][1], 0.5), 2.0) if has_pr and hist[s][1] > 1 else 1.0 for s in SEASONS}
                deltas.append({"model": model, "scenario": scen, "horizon": hz, "dt": {k: r(v, 2) for k, v in dt.items()}, "pr_ratio": {k: r(v, 3) for k, v in pr_ratio.items()} if has_pr else None})
                f = shifted_future(f"{model}-{scen}-{hz}", model, scen, hz, base_days, dt, pr_ratio)
                f["has_rain_change"] = has_pr
                futures.append(f)
    return futures, deltas


def shifted_future(fid, model, scen, hz, base_days, dt, pr_ratio):
    """Delta method: shift observed 2001-2025 POWER days by the model's seasonal change."""
    acc = defaultdict(lambda: defaultdict(float))
    years = len(BASE_YEARS)
    for d in base_days:
        m = d["date"].month
        s = season_of(m)
        tx, tn = d["T2M_MAX"] + dt[s], d["T2M_MIN"] + dt[s]
        a = acc[m]
        a["rain_mm"] += d["PRECTOTCORR"] * pr_ratio[s]
        a["et0_mm"] += et0_hargreaves(tx, tn, d["date"].timetuple().tm_yday)
        a["heat_days"] += tx >= THRESHOLDS["heat_c"]
        a["hot38_days"] += tx >= 38
        a["cold_days"] += tn < THRESHOLDS["cold_c"]
        a["tmax"] += tx
        a["n"] += 1
    monthly = [
        {
            "month": m,
            "rain_mm": r(acc[m]["rain_mm"] / years, 1),
            "et0_mm": r(acc[m]["et0_mm"] / years, 1),
            "heat_days": r(acc[m]["heat_days"] / years, 2),
            "hot38_days": r(acc[m]["hot38_days"] / years, 2),
            "cold_days": r(acc[m]["cold_days"] / years, 2),
            "tmax": r(acc[m]["tmax"] / acc[m]["n"], 2),
        }
        for m in range(1, 13)
    ]
    return {"field_id": FIELD_ID, "id": fid, "model": model, "scenario": scen, "horizon": hz, "monthly": monthly}


def baseline_future(monthly):
    return {
        "field_id": FIELD_ID,
        "id": "observed-2001-2025",
        "model": "Observed (POWER)",
        "scenario": "observed",
        "horizon": "now",
        "has_rain_change": True,
        "monthly": [
            {k: m[k] for k in ("month", "rain_mm", "et0_mm", "heat_days", "hot38_days", "cold_days", "tmax")} for m in monthly
        ],
    }


# ----------------------------------------------------------------------------- predictions
def boro_transplant_window(days, futures):
    """Expected stress days in a 10-day flowering window, by transplant date.

    Boro HYV (BRRI dhan28-type): flowering starts ~70 days after transplanting.
    Heat: Tmax >= 35 degC; cold: Tmin < 15 degC. Averaged over 2011-2025.
    """
    recent = [d for d in days if 2011 <= d["date"].year <= 2025]
    lookup = {d["date"]: d for d in recent}
    ssp_dt = None
    mid = [f for f in futures if f.get("scenario") == "ssp245" and f.get("horizon") == "2050s"]
    if mid:
        ssp_dt = mid  # used only for the label below
    rows = []
    start = date(2001, 12, 1)
    for k in range(0, 91, 5):  # Dec 1 .. Feb 28
        t = start + timedelta(days=k)
        heat = cold = n = 0
        for y in range(2011, 2025):
            tp = date(y, t.month, t.day)
            for j in range(70, 80):
                d = lookup.get(tp + timedelta(days=j))
                if d is None:
                    continue
                heat += d["T2M_MAX"] >= THRESHOLDS["heat_c"]
                cold += d["T2M_MIN"] < THRESHOLDS["cold_c"]
                n += 1
        yrs = n / 10 if n else 1
        rows.append({"transplant": f"{t.month:02d}-{t.day:02d}", "heat_days": r(heat / yrs, 2), "cold_days": r(cold / yrs, 2)})
    best = min(rows, key=lambda x: x["heat_days"] + x["cold_days"])
    floor = best["heat_days"] + best["cold_days"]
    ok = [x["transplant"] for x in rows if x["heat_days"] + x["cold_days"] <= max(floor * 1.25, floor + 1.0)]
    return {"rows": rows, "best": best["transplant"], "window": [ok[0], ok[-1]], "uses_future": bool(ssp_dt)}


def predictions(annual, tr, peaks, clim, window, futures):
    out = []
    nxt = CURRENT_YEAR + 1
    past = [a["heat_days_mar_apr"] for a in annual if a["year"] in BASE_YEARS]
    obs = futures[0]
    ma = lambda f: f["monthly"][2]["heat_days"] + f["monthly"][3]["heat_days"]
    near = [ma(f) - ma(obs) for f in futures if f["scenario"] == "ssp245" and f["horizon"] == "2030s"]
    shift = st.median(near) if near else 0.0
    out.append(
        {
            "field_id": FIELD_ID,
            "id": "heat-mar-apr-2027",
            "title": f"Hot days in Mar–Apr {nxt}",
            "value": r(st.median(past) + shift, 0),
            "unit": "days ≥35 °C",
            "range_low": r(max(pct(past, 0.1) + shift, 0), 0),
            "range_high": r(pct(past, 0.9) + shift, 0),
            "method": "Year-to-year spread of bias-adjusted POWER Tmax 2001–2025 (median, 10th–90th percentile), shifted by the CMIP6 SSP2-4.5 2030s median change.",
            "detail": {"baseline": r(st.median(past), 1), "baseline_label": "2001–2025 median", "shift": r(shift, 1), "models": len(near)},
        }
    )

    aman = [p["aman_peak"] for p in peaks if p["aman_peak"] is not None and p["year"] in BASE_YEARS]
    cur = next((p["aman_peak"] for p in peaks if p["year"] == CURRENT_YEAR), None)
    if cur is not None and aman:
        rank = sum(a <= cur for a in aman) / len(aman)
        out.append(
            {
                "field_id": FIELD_ID,
                "id": "aman-2026-condition",
                "title": f"Aman {CURRENT_YEAR} crop condition",
                "value": r(cur, 2),
                "unit": "peak NDVI",
                "range_low": r(pct(aman, 0.2), 2),
                "range_high": r(pct(aman, 0.8), 2),
                "method": "Peak MODIS NDVI Sep–Nov this year, against the 2001–2025 peaks (20th–80th percentile shown).",
                "detail": {"percentile": round(rank * 100), "normal": r(st.fmean(aman), 2)},
            }
        )

    out.append(
        {
            "field_id": FIELD_ID,
            "id": "boro-transplant-window",
            "title": f"Best Boro transplant window {CURRENT_YEAR}–{str(nxt)[2:]}",
            "value": None,
            "unit": "date range",
            "range_low": None,
            "range_high": None,
            "method": "Expected heat (≥35 °C) and cold (<15 °C) days during flowering, ~70 days after transplanting, from POWER 2011–2025.",
            "detail": {"window": window["window"], "best": window["best"]},
        }
    )
    return out


# ----------------------------------------------------------------------------- demo drone
def drone_demo(ndvi_series):
    """Synthetic drone flights, seeded. Clearly labelled DEMO in the app."""
    rnd = mulberry32(20261114)
    cols, rows, cell = 28, 18, 5
    good = [s for s in ndvi_series if s["reliability"] in (0, 1)]

    def ndvi_near(d: str):
        """MODIS NDVI linearly interpolated to the flight date; also returns the nearest composite date."""
        target = date.fromisoformat(d)
        pts = sorted(good, key=lambda s: s["date"])
        before = max((s for s in pts if s["date"] <= d), key=lambda s: s["date"])
        after = min((s for s in pts if s["date"] > d), key=lambda s: s["date"], default=before)
        t0, t1 = date.fromisoformat(before["date"]), date.fromisoformat(after["date"])
        w = 0 if t1 == t0 else (target - t0).days / (t1 - t0).days
        v = before["ndvi"] + w * (after["ndvi"] - before["ndvi"])
        nearest = before if abs((target - t0).days) <= abs((t1 - target).days) else after
        return round(v, 3), nearest["date"]

    mask = [[not (x >= cols - 5 and y >= rows - 4 and (x - (cols - 5)) + (y - (rows - 4)) >= 3) for x in range(cols)] for y in range(rows)]
    phases = [(rnd() * 6.28, rnd() * 6.28, 0.6 + rnd() * 0.8) for _ in range(4)]

    def texture(x, y):
        return sum(math.sin(x / (3 + i) * f + a) * math.cos(y / (2.5 + i) * f + b) for i, (a, b, f) in enumerate(phases)) / 4

    flights_spec = [
        ("2026-08-18", "T. Aman", "Tillering", 0.55),
        ("2026-09-10", "T. Aman", "Panicle initiation", 0.75),
        ("2026-10-04", "T. Aman", "Flowering", 1.0),
        ("2026-10-29", "T. Aman", "Grain filling", 0.9),
    ]
    flights, zones = [], []
    for i, (d, crop, stage, growth) in enumerate(flights_spec):
        nd, nd_date = ndvi_near(d)
        # canopy cover follows greenness, plus a per-flight error (light, wind, timing): demo realism
        base = max(min((nd - 0.18) / 0.62, 1), 0) * 100 + (rnd() - 0.5) * 9
        grid = []
        for y in range(rows):
            row = []
            for x in range(cols):
                if not mask[y][x]:
                    row.append(None)
                    continue
                v = base * (1 + 0.08 * texture(x, y)) + (rnd() - 0.5) * 6
                # wet low corner (north-east): stunted, recovers a little late season
                dx, dy = x - (cols - 3), y - 1.5
                wet = math.exp(-(dx * dx + dy * dy) / 14)
                v *= 1 - 0.45 * wet * (1.1 - 0.3 * growth)
                # weak patch (west-centre): grows worse over the season
                dx, dy = x - 6, y - 10
                weak = math.exp(-(dx * dx + dy * dy) / 9)
                v *= 1 - 0.32 * weak * growth
                # bund / foot path along column 14
                if x == 14:
                    v *= 0.55
                row.append(round(max(min(v, 98), 2), 1))
            grid.append(row)
        vals = [v for row in grid for v in row if v is not None]
        fid = f"flight-{i + 1}"
        flights.append(
            {
                "id": fid,
                "field_id": FIELD_ID,
                "flown_on": d,
                "crop": crop,
                "stage": stage,
                "camera": "RGB (demo)",
                "altitude_m": 60,
                "gsd_cm": 1.8,
                "cols": cols,
                "rows": rows,
                "cell_m": cell,
                "canopy": grid,
                "mean_canopy": r(st.fmean(vals), 1),
                "p10_canopy": r(pct(vals, 0.1), 1),
                "p90_canopy": r(pct(vals, 0.9), 1),
                "low_cover_pct": r(100 * sum(v < 0.6 * base for v in vals) / len(vals), 1),
                "modis_ndvi": nd,
                "modis_date": nd_date,
                "is_demo": True,
            }
        )
        if i >= 1:
            zones += [
                {"flight_id": fid, "label": "Wet low corner", "kind": "waterlogging", "severity": "serious" if i < 3 else "warning", "x": cols - 7, "y": 0, "w": 7, "h": 5, "note": "Water is standing after heavy rain and the rice here is short. Clear the drain to the canal."},
                {"flight_id": fid, "label": "Weak patch", "kind": "low_vigour", "severity": "warning" if i < 2 else "serious", "x": 2, "y": 7, "w": 8, "h": 6, "note": "Rice here is thinner than the rest of the field. Look for stem borer, or a lack of urea."},
            ]
    return flights, zones


# ----------------------------------------------------------------------------- static tables
CROPS = [
    # kc by month of the crop's life (FAO-56 Table 12 stage values, spread over months)
    {"id": "boro", "heat_c": 35, "name": "Boro rice", "family": "cereal", "season": "Rabi (dry)", "water": "paddy", "kc": [1.05, 1.1, 1.2, 1.2, 0.95], "sensitive": [3, 4], "sensitive_label": "Flowering, Mar–Apr", "legume": False, "net_bdt_ha": 52000, "source": "FAO-56 Table 12; BRRI Adhunik Dhaner Chash"},
    {"id": "boro_awd", "heat_c": 35, "name": "Boro rice (AWD)", "family": "cereal", "season": "Rabi (dry)", "water": "paddy_awd", "kc": [1.05, 1.1, 1.2, 1.2, 0.95], "sensitive": [3, 4], "sensitive_label": "Flowering, Mar–Apr", "legume": False, "net_bdt_ha": 58000, "source": "FAO-56; IRRI/BRRI alternate wetting and drying"},
    {"id": "late_boro", "heat_c": 35, "name": "Late Boro rice", "family": "cereal", "season": "Rabi (dry)", "water": "paddy", "kc": [1.05, 1.15, 1.2, 1.0], "sensitive": [4, 5], "sensitive_label": "Flowering, Apr–May", "legume": False, "net_bdt_ha": 46000, "source": "FAO-56 Table 12"},
    {"id": "aman", "heat_c": 35, "name": "T. Aman rice", "family": "cereal", "season": "Kharif II (monsoon)", "water": "paddy", "kc": [1.05, 1.15, 1.2, 0.95], "sensitive": [10], "sensitive_label": "Flowering, Oct", "legume": False, "net_bdt_ha": 48000, "source": "FAO-56 Table 12"},
    {"id": "mustard", "heat_c": 35, "name": "Mustard", "family": "oilseed", "season": "Rabi", "water": "upland", "kc": [0.35, 0.9, 1.05], "sensitive": [1], "sensitive_label": "Flowering, Jan", "legume": False, "net_bdt_ha": 38000, "source": "FAO-56 Table 12 (rapeseed); BARI Sarisha-14 guide"},
    {"id": "mungbean", "heat_c": 38, "name": "Mungbean", "family": "legume", "season": "Kharif I", "water": "upland", "kc": [0.4, 1.05, 0.6], "sensitive": [4, 5], "sensitive_label": "Flowering, Apr–May", "legume": True, "net_bdt_ha": 42000, "source": "FAO-56 Table 12; BARI Mung-6 guide"},
    {"id": "maize", "heat_c": 35, "name": "Maize", "family": "cereal", "season": "Rabi", "water": "upland", "kc": [0.3, 0.7, 1.2, 1.2, 0.6], "sensitive": [2, 3], "sensitive_label": "Tasselling, Feb–Mar", "legume": False, "net_bdt_ha": 70000, "source": "FAO-56 Table 12"},
    {"id": "wheat", "heat_c": 35, "name": "Wheat", "family": "cereal", "season": "Rabi", "water": "upland", "kc": [0.4, 0.8, 1.15, 0.5], "sensitive": [2], "sensitive_label": "Flowering, Feb", "legume": False, "net_bdt_ha": 40000, "source": "FAO-56 Table 12; BWMRI guide"},
    {"id": "aus", "heat_c": 35, "name": "Aus rice", "family": "cereal", "season": "Kharif I", "water": "paddy", "kc": [1.05, 1.15, 1.0], "sensitive": [6], "sensitive_label": "Flowering, Jun", "legume": False, "net_bdt_ha": 30000, "source": "FAO-56 Table 12"},
    {"id": "jute", "heat_c": 38, "name": "Jute", "family": "fibre", "season": "Kharif I", "water": "upland", "kc": [0.5, 1.0, 1.1, 0.9], "sensitive": [6], "sensitive_label": "Fast growth, Jun", "legume": False, "net_bdt_ha": 45000, "source": "FAO-56 (fibre crops); BJRI guide"},
    {"id": "veg_winter", "heat_c": 35, "name": "Winter vegetables", "family": "vegetable", "season": "Rabi", "water": "upland", "kc": [0.6, 1.0, 1.0, 0.9], "sensitive": [2], "sensitive_label": "Fruiting, Feb", "legume": False, "net_bdt_ha": 90000, "source": "FAO-56 Table 12 (vegetables, average)"},
    {"id": "veg_summer", "heat_c": 38, "name": "Summer vegetables", "family": "vegetable", "season": "Kharif I", "water": "upland", "kc": [0.6, 1.0, 0.9], "sensitive": [5], "sensitive_label": "Fruiting, May", "legume": False, "net_bdt_ha": 80000, "source": "FAO-56 Table 12 (vegetables, average)"},
    {"id": "potato", "heat_c": 35, "name": "Potato", "family": "tuber", "season": "Rabi", "water": "upland", "kc": [0.5, 1.15, 1.15, 0.75], "sensitive": [1], "sensitive_label": "Tuber bulking, Jan", "legume": False, "net_bdt_ha": 85000, "source": "FAO-56 Table 12"},
]

ROTATIONS = [
    {"id": "r-current", "name": "Boro – Fallow – T. Aman", "short": "Current", "is_current": True,
     "slots": [{"crop": "boro", "start": 1, "months": 5}, {"crop": "aman", "start": 7, "months": 4}],
     "note": "What most farmers around Ashulia grow. Boro needs a lot of pumped water, and the land sits empty in June and December."},
    {"id": "r-awd", "name": "Boro (AWD) – Fallow – T. Aman", "short": "AWD", "is_current": False,
     "slots": [{"crop": "boro_awd", "start": 1, "months": 5}, {"crop": "aman", "start": 7, "months": 4}],
     "note": "Same crops, but let the Boro field dry out for a few days between waterings (AWD). Saves about a quarter of the water."},
    {"id": "r-mustard-boro", "name": "Mustard – Late Boro – T. Aman", "short": "3-crop", "is_current": False,
     "slots": [{"crop": "mustard", "start": 11, "months": 3}, {"crop": "late_boro", "start": 2, "months": 4}, {"crop": "aman", "start": 7, "months": 4}],
     "note": "Adds a quick mustard crop before a later Boro. More income, but the Boro then flowers in hot April."},
    {"id": "r-mustard-mung", "name": "Mustard – Mungbean – T. Aman", "short": "Legume", "is_current": False,
     "slots": [{"crop": "mustard", "start": 11, "months": 3}, {"crop": "mungbean", "start": 3, "months": 3}, {"crop": "aman", "start": 7, "months": 4}],
     "note": "Grows mustard and mungbean instead of Boro. Far less pumping, and mungbean feeds the soil for the next crop."},
    {"id": "r-maize-mung", "name": "Maize – Mungbean – T. Aman", "short": "Maize", "is_current": False,
     "slots": [{"crop": "maize", "start": 11, "months": 5}, {"crop": "mungbean", "start": 4, "months": 3}, {"crop": "aman", "start": 7, "months": 4}],
     "note": "Winter maize instead of Boro: sells well and needs half the water. Mungbean after it feeds the soil."},
]

SOURCES = [
    {"id": "power", "name": "NASA POWER", "product": "Daily point API, community AG (T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN, GWETTOP, GWETROOT)", "doi": None, "url": "https://power.larc.nasa.gov", "use": "30-year weather, rainfall and soil wetness; crop water need (FAO-56 Hargreaves). Tmax bias-adjusted by month to NEX-GDDP-CMIP6 historical; the 2017 shift in rain and soil wetness is flagged and no trend is fitted across it", "kind": "nasa"},
    {"id": "modis", "name": "MODIS Terra MOD13Q1 v061", "product": "16-day 250 m vegetation indices, via ORNL DAAC Land Product Subsets API", "doi": "10.5067/MODIS/MOD13Q1.061", "url": "https://modis.ornl.gov/data/modis_webservice.html", "use": "Greenness since 2000: seasons, crop condition", "kind": "nasa"},
    {"id": "cmip6", "name": "NASA NEX-GDDP-CMIP6", "product": "Bias-adjusted daily tasmax and pr, 0.25°, SSP2-4.5 and SSP5-8.5 (sampled years), AWS Open Data", "doi": "10.7917/OFSG3345", "url": "https://registry.opendata.aws/nex-gddp-cmip6/", "use": "Climate futures for the rotation comparison", "kind": "nasa"},
    {"id": "merra2", "name": "NASA GMAO MERRA-2 / GEOS-IT", "product": "Soil wetness served through POWER (GWETTOP, GWETROOT)", "doi": None, "url": "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/", "use": "Root-zone soil wetness", "kind": "nasa"},
    {"id": "fao56", "name": "FAO Irrigation and Drainage Paper 56", "product": "Crop coefficients (Table 12), Hargreaves ET0 (eq. 52), effective rainfall", "doi": None, "url": "https://www.fao.org/4/x0490e/x0490e00.htm", "use": "Crop water need", "kind": "method"},
    {"id": "frg", "name": "Fertilizer Recommendation Guide 2018 (BARC)", "product": "Nutrient advice for Bangladesh crops", "doi": None, "url": "https://barc.gov.bd", "use": "General soil-nutrient guidance; doses depend on a soil test", "kind": "method"},
    {"id": "openmeteo", "name": "Open-Meteo forecast API (not NASA)", "product": "7-day forecast from national weather models, fetched live", "doi": None, "url": "https://open-meteo.com", "use": "Next-7-days heavy rain and heat warnings only (CC-BY 4.0, non-commercial)", "kind": "method"},
    {"id": "esri", "name": "Esri World Imagery and OpenStreetMap", "product": "Map tiles for drawing the field", "doi": None, "url": "https://www.openstreetmap.org/copyright", "use": "Background map only (© Esri, Maxar; © OpenStreetMap contributors)", "kind": "method"},
    {"id": "drone", "name": "Furrow drone flights", "product": "RGB orthomosaic → canopy cover (5 m cells)", "doi": None, "url": None, "use": "DEMO data in this build; replaced by our own flights", "kind": "demo"},
]


# ----------------------------------------------------------------------------- SQL
def sql_literal(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, rows):
    if not rows:
        return ""
    cols = list(rows[0].keys())
    values = ",\n".join("(" + ", ".join(sql_literal(row.get(c)) for c in cols) + ")" for row in rows)
    return f"insert into public.{table} ({', '.join(cols)}) values\n{values};\n\n"


# ----------------------------------------------------------------------------- main
def main():
    cmip6 = load_cmip6()
    offsets = tmax_offsets(load_power(), cmip6)
    print("Tmax offsets by month (degC):", offsets)
    days = load_power(offsets)
    annual, monthly_series, monthly, recent = climate_tables(days)
    tr = trends(annual)
    ndvi, ndvi_clim, peaks = ndvi_tables()
    futures, deltas = cmip6_futures(days)
    futures = [baseline_future(monthly)] + futures
    window = boro_transplant_window(days, futures)
    preds = predictions(annual, tr, peaks, ndvi_clim, window, futures)
    flights, zones = drone_demo(ndvi)

    field = {
        "id": FIELD_ID,
        "name": "Ashulia demo field",
        "upazila": "Savar",
        "district": "Dhaka",
        "lat": LAT,
        "lon": LON,
        "area_ha": 1.26,
        "land_type": "Medium lowland",
        "soil": {"texture": "Silty clay loam", "organic_matter_pct": 1.3, "ph": 6.1, "is_demo": True,
                 "note": "Demo values typical of the Madhupur–floodplain edge; replace with a soil test and SoilGrids."},
        "data_through": days[-1]["date"].isoformat(),
    }

    bundle = {
        "generated": date.today().isoformat(),
        "thresholds": THRESHOLDS,
        "power_notes": {"tmax_offset_by_month": offsets, "break_year": BREAK_YEAR, "trend_years": f"1996–{BREAK_YEAR - 1}"},
        "field": field,
        "climate_annual": annual,
        "climate_monthly": monthly,
        "climate_monthly_series": monthly_series,
        "climate_recent": recent,
        "trends": {k: {kk: (r(vv, 4) if isinstance(vv, float) else vv) for kk, vv in v.items()} for k, v in tr.items()},
        "ndvi": ndvi,
        "ndvi_climatology": ndvi_clim,
        "ndvi_peaks": peaks,
        "futures": futures,
        "cmip6_deltas": deltas,
        "boro_window": window,
        "predictions": preds,
        "drone_flights": flights,
        "drone_zones": zones,
        "crops": CROPS,
        "rotations": [{**rt, "field_id": FIELD_ID} for rt in ROTATIONS],
        "sources": SOURCES,
    }

    for out in (ROOT / "data" / "derived" / "ashulia.json", ROOT / "mobile" / "src" / "data" / "ashulia.json"):
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")))
        print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")

    sql = "-- Generated by analysis/build_dataset.py. Do not edit by hand.\n\n"
    sql += insert("fields", [{**{k: v for k, v in field.items()}}])
    sql += insert("climate_annual", annual)
    sql += insert("climate_monthly", monthly)
    sql += insert("climate_monthly_series", monthly_series)
    sql += insert("climate_recent", recent)
    sql += insert("ndvi", ndvi)
    sql += insert("ndvi_climatology", ndvi_clim)
    sql += insert("futures", futures)
    sql += insert("drone_flights", flights)
    sql += insert("drone_zones", zones)
    sql += insert("crops", CROPS)
    sql += insert("rotations", bundle["rotations"])
    sql += insert("predictions", preds)
    sql += insert("field_meta", [{"field_id": FIELD_ID, "generated": bundle["generated"], "thresholds": THRESHOLDS, "trends": bundle["trends"], "ndvi_peaks": peaks, "cmip6_deltas": deltas, "boro_window": window, "power_notes": {"tmax_offset_by_month": offsets, "break_year": BREAK_YEAR, "trend_years": f"1996–{BREAK_YEAR - 1}"}}])
    sql += insert("sources", SOURCES)
    sp = ROOT / "supabase" / "seed.sql"
    sp.parent.mkdir(parents=True, exist_ok=True)
    sp.write_text(sql)
    print(f"wrote {sp.relative_to(ROOT)} ({sp.stat().st_size // 1024} KB)")

    t = tr
    print(f"Trends: tmean {t['tmean']['per_decade']:+.2f} C/decade; rain {t['rain_mm']['per_decade']:+.0f} mm/decade; "
          f"Mar-Apr heat days {t['heat_days_mar_apr']['first_decade']:.1f} -> {t['heat_days_mar_apr']['last_decade']:.1f}")
    for p in preds:
        print(f"Prediction: {p['title']}: {p['value']} {p['unit']} [{p['range_low']}, {p['range_high']}] {p['detail']}")
    print(f"Futures: {len(futures)} (incl. observed); NDVI composites: {len(ndvi)}")


if __name__ == "__main__":
    main()
