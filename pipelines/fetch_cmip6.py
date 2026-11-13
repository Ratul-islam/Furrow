"""Extract NEX-GDDP-CMIP6 daily point series for the Furrow demo field.

Source: NASA NEX-GDDP-CMIP6 (CC0), AWS Open Data bucket s3://nex-gddp-cmip6
(https://registry.opendata.aws/nex-gddp-cmip6/). 0.25 degree, daily, bias-adjusted.
The NCCS THREDDS point service would be lighter but was unreachable when this ran.

Files are chunked one whole global day per chunk, so a point read needs the whole
yearly file (~250 MB). We download one file at a time, read the grid cell nearest
the field, keep only that series, and delete the file. Nothing large is kept.

To stay within two days we SAMPLE years rather than read whole 30-year periods:
  historical: 2005, 2012     ssp245 / ssp585: 2040 ("2030s" horizon), 2060 ("2050s" horizon)
Report results as model ranges for sampled years, not as climatologies.

Needs: pip install h5py numpy (curl on PATH).
Usage:  python pipelines/fetch_cmip6.py [MODEL]   (one model per process; run models in parallel)
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import h5py
import numpy as np

LAT, LON = 23.9, 90.3
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "raw" / "cmip6_point.json"
BUCKET = "https://nex-gddp-cmip6.s3.us-west-2.amazonaws.com"

MODELS = ["ACCESS-CM2", "MIROC6", "MRI-ESM2-0"]
VARIABLES = ["tasmax", "pr"]
YEARS = {
    "historical": [2005, 2012],
    "ssp245": [2040, 2060],
    "ssp585": [2040, 2060],
}
MEMBER = "r1i1p1f1"


def list_keys(prefix: str) -> list[str]:
    url = f"{BUCKET}/?list-type=2&prefix={prefix}"
    with urllib.request.urlopen(url, timeout=60) as r:
        xml = r.read().decode()
    return [part.split("</Key>")[0] for part in xml.split("<Key>")[1:]]


def pick_key(model: str, scenario: str, var: str, year: int) -> str | None:
    prefix = f"NEX-GDDP-CMIP6/{model}/{scenario}/{MEMBER}/{var}/{var}_day_{model}_{scenario}_{MEMBER}_"
    keys = [k for k in list_keys(prefix) if f"_{year}" in k and k.endswith(".nc")]
    v2 = [k for k in keys if "_v2.0" in k or "_v1.1" in k]
    return (v2 or keys or [None])[-1]


def main() -> None:
    models = sys.argv[1:] or MODELS
    out = OUT if not sys.argv[1:] else OUT.with_name(f"cmip6_point_{models[0]}.json")
    results = json.loads(OUT.read_text()) if OUT.exists() else {}
    results = {k: v for k, v in results.items() if k.split("|")[0] in models}
    if out.exists():
        results.update(json.loads(out.read_text()))
    for model in models:
        for scenario, years in YEARS.items():
            for var in VARIABLES:
                for year in years:
                    tag = f"{model}|{scenario}|{var}|{year}"
                    if tag in results:
                        continue
                    key = pick_key(model, scenario, var, year)
                    if key is None:
                        print(f"missing {tag}")
                        continue
                    with tempfile.NamedTemporaryFile(suffix=".nc") as tmp:
                        subprocess.run(["curl", "-s", "-f", "-o", tmp.name, f"{BUCKET}/{key}"], check=True)
                        with h5py.File(tmp.name, "r") as h:
                            lat, lon = h["lat"][:], h["lon"][:]
                            i = int(np.argmin(np.abs(lat - LAT)))
                            j = int(np.argmin(np.abs(lon - LON)))
                            x = h[var][:, i, j].astype(float)
                    if var == "tasmax":
                        x = x - 273.15  # K -> degC
                    else:
                        x = x * 86400.0  # kg m-2 s-1 -> mm/day
                    results[tag] = {"key": key, "cell": [float(lat[i]), float(lon[j])], "values": [round(v, 2) for v in x]}
                    out.write_text(json.dumps(results))
                    print(f"ok {tag} ({len(x)} days)", flush=True)
    print(f"saved {len(results)} series -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
