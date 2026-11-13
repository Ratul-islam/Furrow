"""Pull NASA data for the Furrow demo field (Ashulia, Savar, Dhaka, Bangladesh).

Standard library only. Re-runnable; writes raw responses to data/raw/.

Sources (cite in app and README):
- NASA POWER daily point API, community "ag" (https://power.larc.nasa.gov).
  Temperature, rainfall, humidity, sunlight and soil wetness (GWETTOP/GWETROOT,
  from NASA GMAO MERRA-2 / GEOS-IT as served by POWER).
- MODIS Terra Vegetation Indices 16-day 250 m, MOD13Q1 v061
  (DOI 10.5067/MODIS/MOD13Q1.061), read through the ORNL DAAC MODIS/VIIRS
  Land Product Subsets REST API (https://modis.ornl.gov/data/modis_webservice.html).

Location is rounded to 0.1 degrees (no exact field boundary in the repo).

Usage:  python3 pipelines/fetch_nasa.py [power] [modis]
"""

from __future__ import annotations

import json
import time
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

LAT, LON = 23.9, 90.3  # Ashulia, rounded to 0.1 degrees
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"

POWER_PARAMS = [
    "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M",
    "ALLSKY_SFC_SW_DWN", "GWETTOP", "GWETROOT", "WS2M",
]
POWER_START = "19960101"
POWER_END = "20261031"

MODIS_BASE = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
MODIS_BANDS = ["250m_16_days_NDVI", "250m_16_days_pixel_reliability"]
MODIS_FIRST_YEAR = 2000
MODIS_LAST_YEAR = 2026


def get_json(url: str, retries: int = 4) -> dict:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "furrow-pipeline"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # network hiccups: back off and retry
            if attempt == retries - 1:
                raise
            print(f"  retry {attempt + 1} after error: {e}")
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("unreachable")


def fetch_power() -> Path:
    out = RAW / "power_daily.json"
    url = (
        "https://power.larc.nasa.gov/api/temporal/daily/point?"
        f"parameters={','.join(POWER_PARAMS)}&community=ag"
        f"&latitude={LAT}&longitude={LON}&start={POWER_START}&end={POWER_END}&format=json"
    )
    print(f"POWER: {POWER_START}..{POWER_END} at {LAT},{LON}")
    data = get_json(url)
    out.write_text(json.dumps(data))
    n = len(next(iter(data["properties"]["parameter"].values())))
    print(f"  saved {n} days -> {out.relative_to(ROOT)}")
    return out


def modis_dates() -> list[str]:
    url = f"{MODIS_BASE}/dates?latitude={LAT}&longitude={LON}"
    return [d["modis_date"] for d in get_json(url)["dates"]]


def fetch_modis() -> Path:
    out = RAW / "modis_mod13q1.json"
    dates = [d for d in modis_dates() if MODIS_FIRST_YEAR <= int(d[1:5]) <= MODIS_LAST_YEAR]
    print(f"MODIS MOD13Q1: {len(dates)} composites ({dates[0]}..{dates[-1]})", flush=True)
    jobs = []
    for band in MODIS_BANDS:
        for i in range(0, len(dates), 10):  # API returns at most 10 dates per call
            chunk = dates[i : i + 10]
            jobs.append((band, (
                f"{MODIS_BASE}/subset?latitude={LAT}&longitude={LON}&band={band}"
                f"&startDate={chunk[0]}&endDate={chunk[-1]}&kmAboveBelow=0&kmLeftRight=0"
            )))
    rows: dict[str, dict] = {}
    # each call takes ~40 s server-side; run several at a time
    with ThreadPoolExecutor(max_workers=10) as pool:
        for n, (band, data) in enumerate(pool.map(lambda j: (j[0], get_json(j[1])), jobs), 1):
            for s in data["subset"]:
                rows.setdefault(s["calendar_date"], {})[band] = s["data"][0]
            if n % 10 == 0:
                print(f"  {n}/{len(jobs)} requests", flush=True)
    series = [{"date": k, **v} for k, v in sorted(rows.items())]
    out.write_text(json.dumps({"latitude": LAT, "longitude": LON, "product": "MOD13Q1.061", "series": series}))
    print(f"  saved {len(series)} composites -> {out.relative_to(ROOT)}", flush=True)
    return out


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]  # optional: "power" and/or "modis"
    if not only or "power" in only:
        fetch_power()
    if not only or "modis" in only:
        fetch_modis()
    (RAW / "PULLED.md").write_text(
        f"Pulled {date.today().isoformat()} by pipelines/fetch_nasa.py at lat {LAT}, lon {LON}.\n"
        f"POWER daily {POWER_START}-{POWER_END}: {', '.join(POWER_PARAMS)}.\n"
        f"MODIS MOD13Q1 v061 via ORNL DAAC subsets API, {MODIS_FIRST_YEAR}-{MODIS_LAST_YEAR}.\n"
    )


if __name__ == "__main__":
    main()
