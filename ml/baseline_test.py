"""Can a model trained on NASA data predict this field's season better than a normal year?

Leave-one-year-out test of small ridge-regression models against two baselines:
  normal year  = mean of the other years
  trend        = straight-line trend fitted to the other years

Inputs come from the app bundle built by analysis/build_dataset.py:
  NASA POWER daily point data, aggregated by month (climate_monthly_series)
  MODIS MOD13Q1 v061 NDVI, DOI 10.5067/MODIS/MOD13Q1.061 (ndvi, ndvi_peaks)

Standard library only. Run from the repository root:
    python3 ml/baseline_test.py
"""
import json
import statistics as st
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent.parent / "mobile" / "src" / "data" / "ashulia.json"
LAMBDA = 3.0  # ridge penalty on standardised features
YEARS = range(2001, 2026)

d = json.loads(BUNDLE.read_text())
MONTHLY = {(r["year"], r["month"]): r for r in d["climate_monthly_series"]}
PEAKS = {r["year"]: r for r in d["ndvi_peaks"]}
NDVI = [r for r in d["ndvi"] if r.get("ndvi") is not None and r.get("reliability") in (0, 1)]


def agg(year, months, key, f=sum):
    """Aggregate a monthly POWER variable; month 0 = December of the previous year."""
    vals = []
    for m in months:
        r = MONTHLY.get((year - 1, 12) if m == 0 else (year, m))
        if r is None or r.get(key) is None:
            return None
        vals.append(r[key])
    return f(vals)


def greenness(year, m1, m2):
    """Highest good-quality MODIS NDVI between two months of the same year."""
    v = [r["ndvi"] for r in NDVI if int(r["date"][:4]) == year and m1 <= int(r["date"][5:7]) <= m2]
    return max(v) if v else None


def solve(a, b):
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(n):
            if r != c:
                f = m[r][c] / m[c][c]
                m[r] = [x - f * y for x, y in zip(m[r], m[c])]
    return [m[i][n] / m[i][i] for i in range(n)]


def ridge_predict(X, y, xq):
    mu = [st.mean(c) for c in zip(*X)]
    sd = [st.pstdev(c) or 1.0 for c in zip(*X)]
    Z = [[(v - m) / s for v, m, s in zip(r, mu, sd)] for r in X]
    ym = st.mean(y)
    k = len(mu)
    xtx = [[sum(z[i] * z[j] for z in Z) + (LAMBDA if i == j else 0) for j in range(k)] for i in range(k)]
    xty = [sum(z[i] * (t - ym) for z, t in zip(Z, y)) for i in range(k)]
    w = solve(xtx, xty)
    return ym + sum(wi * (v - m) / s for wi, v, m, s in zip(w, xq, mu, sd))


def loyo(rows):
    years, X, y = zip(*rows)
    err_model, err_normal, err_trend = [], [], []
    for i in range(len(y)):
        yrs, Xt, yt = years[:i] + years[i + 1:], X[:i] + X[i + 1:], y[:i] + y[i + 1:]
        err_normal.append(abs(st.mean(yt) - y[i]))
        mx, my = st.mean(yrs), st.mean(yt)
        slope = sum((a - mx) * (b - my) for a, b in zip(yrs, yt)) / sum((a - mx) ** 2 for a in yrs)
        err_trend.append(abs(my + slope * (years[i] - mx) - y[i]))
        err_model.append(abs(ridge_predict(list(Xt), list(yt), X[i]) - y[i]))
    return len(y), st.mean(err_model), st.mean(err_normal), st.mean(err_trend)


TESTS = [
    ("Aman peak NDVI", "Jul–Sep Tmax, heat days, rain, root-zone soil wetness",
     lambda y: [agg(y, [7, 8, 9], "tmax", st.mean), agg(y, [7, 8, 9], "heat_days"),
                agg(y, [7, 8, 9], "rain_mm"), agg(y, [7, 8, 9], "gwet_root", st.mean)],
     lambda y: PEAKS.get(y, {}).get("aman_peak"), YEARS),
    ("Boro peak NDVI", "Dec–Jan cold days, Feb–Mar heat days, Jan–Mar Tmax, Dec–Mar rain",
     lambda y: [agg(y, [0, 1], "cold_days"), agg(y, [2, 3], "heat_days"),
                agg(y, [1, 2, 3], "tmax", st.mean), agg(y, [0, 1, 2, 3], "rain_mm")],
     lambda y: PEAKS.get(y, {}).get("boro_peak"), YEARS),
    ("Boro peak NDVI", "January greenness (MODIS)",
     lambda y: [greenness(y, 1, 1)],
     lambda y: PEAKS.get(y, {}).get("boro_peak"), YEARS),
    ("Aman peak NDVI", "Jul–Aug greenness (MODIS)",
     lambda y: [greenness(y, 7, 8)],
     lambda y: PEAKS.get(y, {}).get("aman_peak"), YEARS),
    ("Hot days (≥35 °C) in Mar–Apr", "Jan–Feb Tmax and rain, February heat days",
     lambda y: [agg(y, [1, 2], "tmax", st.mean), agg(y, [1, 2], "rain_mm"), agg(y, [2], "heat_days")],
     lambda y: agg(y, [3, 4], "heat_days"), range(1997, 2026)),
]

print(f"Bundle: {BUNDLE.relative_to(BUNDLE.parents[3])}")
print("| Target | Predictors | Years | Model error | Normal-year error | Trend error | Skill vs normal year |")
print("|---|---|---|---|---|---|---|")
for target, label, feats, truth, years in TESTS:
    rows = [(y, feats(y), truth(y)) for y in years if truth(y) is not None and None not in feats(y)]
    n, em, en, et = loyo(rows)
    fmt = "{:.1f}" if "days" in target else "{:.3f}"
    print(f"| {target} | {label} | {n} | {fmt.format(em)} | {fmt.format(en)} | {fmt.format(et)} | {100 * (1 - em / en):+.0f}% |")
