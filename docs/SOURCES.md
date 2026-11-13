# Data sources and APIs

Every API and dataset Furrow uses: what we request, where it shows in the app, how it is accessed, and how to cite it. Updated 13 November 2026.

**At a glance:** three NASA datasets are the core (POWER, MODIS, NEX-GDDP-CMIP6). They are pulled ahead of time by scripts in [`pipelines/`](../pipelines/) and bundled into the app, so the app needs no NASA login and no live NASA call. Only three things are fetched live by the phone: a 7-day forecast, place search, and map tiles. None of them is NASA data, and each is labelled in the app.

| # | Source | Provider | Type | Key needed | When it is fetched | Used for |
|---|---|---|---|---|---|---|
| 1 | POWER daily point API | NASA Langley | NASA data | No | Build time (script) | Weather, rain, soil water history; crop water need; predictions |
| 2 | MOD13Q1 v061 NDVI via MODIS/VIIRS subsets API | NASA LP DAAC / ORNL DAAC | NASA data | No | Build time (script) | Crop greenness since 2000; crop condition; patterns |
| 3 | NEX-GDDP-CMIP6 | NASA NEX / NCCS, on AWS Open Data | NASA data | No | Build time (script) | Climate futures 2030s and 2050s |
| 4 | Open-Meteo forecast API | Open-Meteo | Not NASA | No | Live, in the app | 7-day heavy-rain and heat warnings only |
| 5 | Nominatim search | OpenStreetMap | Not NASA | No | Live, in the app | Finding a village when drawing the field |
| 6 | Map tiles | Esri, OpenStreetMap | Not NASA | No | Live, in the app | Satellite photo and street map behind the field |
| 7 | Supabase (our own backend) | Furrow | Our database | Project anon key | Live, optional | Serving the bundle; saving profiles and drone requests |
| 8 | Device location | Phone GPS (expo-location) | On device | Permission | Live, on tap | "My location" on the field map |

---

## 1. NASA POWER (Prediction Of Worldwide Energy Resources)

- **Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point`
- **Request:** `community=ag`, `latitude=23.9`, `longitude=90.3` (Ashulia, rounded to 0.1°), `start=19960101`, `end=20261031`, `format=json`
- **Parameters:**

  | Parameter | Meaning | Unit |
  |---|---|---|
  | `T2M`, `T2M_MAX`, `T2M_MIN` | Air temperature at 2 m: mean, daily max, daily min | °C |
  | `PRECTOTCORR` | Precipitation, bias-corrected | mm/day |
  | `RH2M` | Relative humidity at 2 m | % |
  | `ALLSKY_SFC_SW_DWN` | Solar radiation at the surface | MJ/m²/day |
  | `GWETTOP`, `GWETROOT` | Soil wetness, surface and root zone | 0–1 |
  | `WS2M` | Wind speed at 2 m | m/s |

- **Underlying data:** POWER serves NASA GMAO reanalysis (MERRA-2, then GEOS-IT for recent days) and CERES/FLASHFlux for solar radiation.
- **Script:** [`pipelines/fetch_nasa.py`](../pipelines/fetch_nasa.py) (`power`), raw output in `data/raw/power_daily.json` (not committed).
- **In the app:** History (Events, Patterns, Heat, Rain, Soil); Home (last 90 days of rain and soil moisture); Alerts (drought now, heat, flood, heavy rain, cold, dry spells, risk calendar); Advice (crop water need, which drives the rotation scores); the Boro planting window; the hot-days prediction.
- **Processing** ([`analysis/build_dataset.py`](../analysis/build_dataset.py)):
  - Crop water need: FAO-56 Hargreaves reference evapotranspiration (eq. 52) from `T2M_MAX`, `T2M_MIN` and extraterrestrial radiation.
  - Counts per year and month: days ≥ 35 °C (and ≥ 38 °C), nights < 15 °C, days with ≥ 50 mm rain, longest dry spell.
- **Data-quality notes (shown in the app):**
  - At this location POWER's daily maximum runs 2–4 °C warmer than NEX-GDDP-CMIP6 historical in March–May. We adjust `T2M_MAX` month by month to the CMIP6 historical level. The offsets are in the bundle (`power_notes`).
  - Rain and soil wetness jump from 2017 (annual rain about 1,670 → 2,670 mm). The cause is not confirmed. We fit trends to 1996–2016 only and mark the break on every long-record chart.
- **Terms:** free, no key. Requested acknowledgement: *"These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program."*

## 2. MODIS vegetation index (MOD13Q1 v061)

- **Endpoint:** `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset` (ORNL DAAC MODIS/VIIRS Land Product Subsets REST API), and `/MOD13Q1/dates` for the list of composites.
- **Request:** `latitude=23.9`, `longitude=90.3`, `kmAboveBelow=0`, `kmLeftRight=0` (the single 250 m pixel); bands `250m_16_days_NDVI` and `250m_16_days_pixel_reliability`; 2000-02-18 to 2026-10-16 (614 composites). The API returns at most 10 dates per call, so we run calls in parallel.
- **Script:** [`pipelines/fetch_nasa.py`](../pipelines/fetch_nasa.py) (`modis`), output `data/raw/modis_mod13q1.json`.
- **In the app:** Home (crop health from satellite, Poor / Normal / Good); History (greenness through the year, season peaks, the 16-day greenness calendar, weather-versus-crop scatter plots); the Aman crop-condition prediction; demo drone flights (scaled to this curve).
- **Processing:**
  - NDVI = value × 0.0001.
  - Normals and peaks use only pixels with reliability 0 (good) or 1 (marginal).
  - Boro peak = maximum from February to April; Aman peak = maximum from September to November.
- **Citation:** Didan, K. (2021). *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061.* NASA EOSDIS LP DAAC. DOI [10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061). Accessed through the ORNL DAAC MODIS and VIIRS Land Products Global Subsetting and Visualization Tool (doi:10.3334/ORNLDAAC/1379; verify).

## 3. NEX-GDDP-CMIP6 (NASA Earth Exchange Global Daily Downscaled Projections)

- **Access:** AWS Open Data bucket `s3://nex-gddp-cmip6` (us-west-2), over HTTPS: `https://nex-gddp-cmip6.s3.us-west-2.amazonaws.com/NEX-GDDP-CMIP6/{model}/{scenario}/r1i1p1f1/{var}/{var}_day_{model}_{scenario}_r1i1p1f1_gn_{year}[_v2.0].nc`. We first tried the NCCS THREDDS point service, but it was unreachable from our network.
- **What we read:** daily `tasmax` (K → °C) and `pr` (kg m⁻² s⁻¹ → mm/day) at the 0.25° grid cell nearest the field (23.875° N, 90.375° E).

  | Model | Historical | SSP2-4.5 | SSP5-8.5 |
  |---|---|---|---|
  | ACCESS-CM2 | 2005, 2012 | 2035, 2040, 2055, 2060 (pr: 2035, 2040, 2060) | 2040, 2060 |
  | MIROC6 | 2005, 2012 | 2040, 2060 | 2040, 2060 |
  | MRI-ESM2-0 | 2005, 2012 | 2040, 2060 | 2040, 2060 |

  These are sampled years, not full 30-year periods. Files are chunked by whole global days, so each point read downloads a ~250 MB file. The script keeps only the point series and deletes the file.
- **Script:** [`pipelines/fetch_cmip6.py`](../pipelines/fetch_cmip6.py) (needs `h5py`), output `data/raw/cmip6_point*.json`.
- **Processing (delta method):** for each model, scenario and horizon, we take the seasonal change in `tasmax` (°C) and in rain (ratio, capped at 0.5–2) against the model's own historical years. We then apply that change to the observed 2001–2025 POWER days. This gives 12 futures plus today's climate (13 in total), which the rotation engine scores. Bias-adjusted POWER `T2M_MAX` is levelled to these historical years.
- **In the app:** History → Future (hot days in March–April, Boro-season water demand, monsoon rain; model ranges); Advice (each rotation is tested in all 13 futures, and the lowest worst-case regret is chosen); the hot-days 2027 prediction (median 2030s SSP2-4.5 shift).
- **Licence:** CC0, applied to all NEX-GDDP-CMIP6 outputs since 2022; earlier releases were CC-BY-SA 4.0 ([AWS Registry](https://registry.opendata.aws/nex-gddp-cmip6)).
- **Citation:** Thrasher, B., et al. (2022). NASA Global Daily Downscaled Projections, CMIP6. *Scientific Data* 9, 262. DOI [10.1038/s41597-022-01393-4](https://doi.org/10.1038/s41597-022-01393-4). Dataset DOI [10.7917/OFSG3345](https://doi.org/10.7917/OFSG3345).

## 4. Open-Meteo forecast API (not NASA)

- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Request:** the field's centre (2 decimals), `daily=temperature_2m_max,precipitation_sum,precipitation_probability_max`, `timezone=Asia/Dhaka`, `forecast_days=7`
- **Where:** [`mobile/src/lib/alerts.ts`](../mobile/src/lib/alerts.ts) (`fetchForecast`), called once when the app opens.
- **In the app:** Alerts → "Next 7 days" strip; "Heavy rain coming" (a day ≥ 50 mm) and "Very hot days this week" (≥ 35 °C) warnings. If it fails (offline), the section says so and every other warning still works.
- **Terms:** free for non-commercial use, no key; data under CC BY 4.0. Attribution: *Weather data by Open-Meteo.com*.

## 5. OpenStreetMap Nominatim (place search)

- **Endpoint:** `https://nominatim.openstreetmap.org/search?format=json&countrycodes=bd&limit=6&q=…`
- **Where:** [`mobile/src/lib/geocode.ts`](../mobile/src/lib/geocode.ts). The search runs only when the farmer presses the search button, never while typing.
- **Terms:** [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/): at most 1 request per second, no autocomplete, the app must identify itself (we send a `User-Agent` on iOS and Android). Data © OpenStreetMap contributors, ODbL.

## 6. Map tiles

- **Esri World Imagery** (satellite photo): `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **Esri World Boundaries and Places** (village names over the photo): `…/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`
- **OpenStreetMap** (street map): `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Where:** [`mobile/src/components/field-map-picker.tsx`](../mobile/src/components/field-map-picker.tsx) (Leaflet 1.9, BSD-2-Clause, in an Expo DOM component).
- **Terms:** attribution is shown on the map (*Imagery © Esri, Maxar, Earthstar Geographics* / *© OpenStreetMap contributors*). Fine for a demo; check Esri's terms and the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) before a public launch.

## 7. Supabase (our backend, optional)

- **Tables:** defined in [`supabase/migrations/`](../supabase/migrations/), filled by the generated [`supabase/seed.sql`](../supabase/seed.sql).
  - **Read-only for the app (anon):** `fields`, `field_meta`, `climate_annual`, `climate_monthly`, `climate_monthly_series`, `climate_recent`, `ndvi`, `ndvi_climatology`, `futures`, `drone_flights`, `drone_zones`, `crops`, `rotations`, `predictions`, `sources`.
  - **Insert-only for the app:** `farm_profiles` (field outline and answers) and `drone_requests` (checks, day, phone). The app cannot read these back; the drone team reads them with the service role.
- **Config:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `mobile/.env`. Without them the app uses the bundled copy (`mobile/src/data/ashulia.json`) and shows "Offline data".
- **Personal data:** phone numbers and field outlines go only to `drone_requests` and `farm_profiles`. They are never in the repo.

## 8. Device location

- `expo-location`, foreground permission, used only when the farmer taps "My location" on the field map. Not stored except as the field they draw.

---

## Methods and reference values (not APIs)

| What | Source | Used for |
|---|---|---|
| Reference evapotranspiration (Hargreaves, eq. 52), crop coefficients (Table 12), effective rainfall | Allen et al. 1998, *FAO Irrigation and Drainage Paper 56* | Irrigation need per rotation |
| Heat sterility at rice flowering above ~35 °C | Jagadish et al. 2008 (confirm with agronomy lead) | Heat stress days, Boro window |
| Cold injury below ~15 °C at booting and flowering | Literature default (confirm) | Cold stress days, Boro window |
| Paddy percolation 90 mm/month; puddling 150 mm; alternate wetting and drying saves ~25% | FAO-56 ch. 8; IRRI/BRRI (confirm locally) | Rice water need |
| Fertiliser and soil advice | BARC, *Fertilizer Recommendation Guide 2018* | Advice → Feed your soil |
| Flood-tolerant Aman varieties (BRRI dhan51, dhan52) | BRRI | Flood warning action |
| Rotation choice: minimax regret across climate futures | Standard decision rule | Advice → Our advice |

## Demo data (labelled "Demo" in the app)

- **Drone flights:** four simulated canopy maps (5 m cells) whose field average follows the real MODIS greenness for each date. Replaced by our own drone surveys.
- **Soil profile:** typical values; replaced by a soil test and SoilGrids.
- **Crop prices:** illustrative net income per hectare; replaced by local market data.

## How to rebuild the data

```bash
python3 pipelines/fetch_nasa.py                    # POWER + MODIS → data/raw/
pip install h5py numpy && python pipelines/fetch_cmip6.py   # CMIP6 point series
python3 analysis/build_dataset.py                  # → data/derived/ashulia.json, mobile/src/data/ashulia.json, supabase/seed.sql
```

## Attribution text (for the app, README and video)

> NASA POWER (NASA Langley Research Center); MODIS MOD13Q1 v061 (NASA LP DAAC, via ORNL DAAC); NEX-GDDP-CMIP6 (NASA Earth Exchange, CC0). Forecast: Open-Meteo.com (CC BY 4.0). Place search and street map: © OpenStreetMap contributors. Satellite imagery: Esri, Maxar, Earthstar Geographics.
