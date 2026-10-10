# Furrow

**Which crop rotation should this farm follow for the next few years, given how its climate has already changed and how it is likely to change next?**

Furrow is a decision-support tool for one farmer in one region. It combines NASA Earth observations with the farm's soil, the characteristics of each crop and the farmer's own priorities. It compares crop rotations on climate stress, water use and soil health, and recommends the rotation that stays close to the best choice in every climate future we test, not the one that wins in a single future.

NASA Space Apps Challenge 2026 · Challenge: **Field Shift: Adapting Farms with NASA Data** · Licence: Apache 2.0

> All output is decision support, not a forecast. Every projection is shown as a range, with the scenario named.

## Status

**Preparation, as of October 10, 2026.** The repository holds the design on this page and a prototype dashboard in [`app/`](app/).

The prototype runs on **sample data**. Every number it shows comes from a seeded generator and is labelled as a sample on screen; none of it is a result. The ranking logic behind it is real: priority weights, a combined score, regret in each climate future, and the lowest worst-case regret. Real NASA data replaces the sample data section by section before and during the event window, November 14–15, 2026. The [Results](#results) section is filled in during the event.

To run the prototype:

```bash
cd app
npm install
npm run dev
```

Then open http://localhost:3000.

## The problem

A rotation is a commitment of several years. Farmers usually choose it from experience and from recent seasons. That works while the climate stays close to what experience has taught. It works less well when temperatures, rainfall and water supply are moving, and when the soil is already under pressure.

Climate projections exist, but they come as global grids from dozens of models that disagree with each other. A farmer cannot turn that into a choice between rice–mustard–mung bean and rice–fallow–rice. Furrow does that step.

## What the farmer sees

1. **What has shifted.** Twenty-five years of temperature, rainfall, growing-season length, soil moisture and vegetation greenness for the farm's location, with the trend and the unusual years marked.
2. **What shifts next.** Projected conditions for the 2030s and 2050s under two emissions scenarios, shown as the spread across climate models.
3. **Which rotation to choose.** Several candidate rotations side by side, each scored on climate stress, water demand and soil health. The farmer sets what matters most to them, and the ranking updates. The tool marks the lowest-regret rotation and the runner-up, and says why.
4. **An Adaptation Card.** One phone-sized page with the rotation plan for the next two to three years and the reason for it, in English and a local language, to share as an image or PDF.

## How it answers the challenge

| The challenge asks for | Furrow |
|---|---|
| A decision-support tool | One decision for one farm: which rotation to follow |
| NASA Earth observations | Five NASA products for history and projections, listed under [NASA data](#nasa-data) |
| Local soil information | Soil texture, organic carbon and pH from an open soil map, a soil test the farmer types in, and optional readings from a low-cost soil-moisture sensor in the field |
| Crop characteristics | One table per region: season length, water need, rooting depth, heat and drought limits, whether the crop is a legume, residue left on the field. Every value has a source |
| Farmer priorities | The farmer weights water saving, soil health, climate risk and income. The weights change the ranking |
| Explore rotation strategies | Rotations are compared side by side, including the farmer's current one as the baseline |
| Strengthen soil health | A soil-health indicator for each rotation: share of legumes, months with soil cover, crop diversity, residue returned |
| Adapt to changing conditions | Rotations are tested against projected climate, not only past climate |

## How the recommendation is made

1. **History.** Daily weather, rainfall, soil moisture and vegetation records give the 25-year baseline and trend for the location.
2. **Projections.** NASA's downscaled CMIP6 projections give daily temperature and rainfall to 2100 from more than 30 climate models. We use two scenarios, SSP2-4.5 (middle emissions) and SSP5-8.5 (very high emissions), and correct each model against local history with quantile mapping.
3. **Scores.** Each rotation gets three scores in each climate future:
   - *Climate stress*: days of heat above the crop's limit during its sensitive stage, length of dry spells, and soil-moisture shortfall, added over the crops in the rotation.
   - *Water demand*: crop water requirement minus effective rainfall, in millimetres of irrigation, following the FAO-56 method.
   - *Soil health*: the rule-based indicator described above.
4. **Priorities.** The farmer's weights combine the scores into one number per rotation per future.
5. **Regret.** In each future, a rotation's regret is how far it falls short of the best rotation in that future. We pick the rotation whose worst regret is smallest.

An example with made-up numbers (higher score is better; these are not results):

| Rotation | Score, SSP2-4.5 | Score, SSP5-8.5 | Regret, SSP2-4.5 | Regret, SSP5-8.5 | Worst regret |
|---|---|---|---|---|---|
| A | 80 | 50 | 0 | 15 | 15 |
| **B** | 70 | 65 | 10 | 0 | **10** |
| C | 60 | 62 | 20 | 3 | 20 |

Rotation A is the best in one future and poor in the other. Rotation B is never far behind the best, so it is the lowest-regret choice. The real calculation does this across every model and scenario, not two columns.

## How we check it

- **Backtest, 2000–2025.** We compare the climate stress score with satellite vegetation anomalies and, where open data exist, local yields, year by year. Then we replay each rotation on the weather that really happened. We publish the misses along with the hits.
- **Spread, not a single model.** Every projection is shown as a range across models.
- **A person who farms.** A local farmer or extension officer reviews the advice, and their comment is quoted as given.
- **Field sensor.** Where a sensor is installed, we report how its soil-moisture readings compare with the satellite estimate.
- **Baselines for machine learning.** Any learned model ships only if it beats a simple rule on the same backtest. If it loses, we report that.

## What we do not claim

- Twenty-five years of satellite data can test the climate side of a rotation. It cannot test the soil-health side. That part rests on published agronomy, which we cite, and is shown as an indicator, not a measurement.
- A point sensor compared with a 9 km satellite cell shows agreement or bias. It is not validation.
- The tool does not predict yields or prices.

## NASA data

| Used for | Product | Reference |
|---|---|---|
| Future climate | NEX-GDDP-CMIP6, 0.25°, daily, 1950–2100 | DOI [10.7917/OFSG3345](https://doi.org/10.7917/OFSG3345); Thrasher et al. 2022, DOI [10.1038/s41597-022-01393-4](https://doi.org/10.1038/s41597-022-01393-4) |
| Daily weather history | POWER, daily, from 1981 | NASA Langley Research Center, [power.larc.nasa.gov](https://power.larc.nasa.gov) |
| Soil moisture | SMAP L4 `SPL4SMGP` v8, 9 km, from 2015 | DOI [10.5067/T5RUATAQREF8](https://doi.org/10.5067/T5RUATAQREF8) |
| Rainfall | GPM IMERG Final Run daily `GPM_3IMERGDF` v07 | DOI [10.5067/GPM/IMERGDF/DAY/07](https://doi.org/10.5067/GPM/IMERGDF/DAY/07) |
| Vegetation | MODIS `MOD13Q1` v061, 250 m, 16-day, from 2000 | DOI [10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061) |

**Other sources.** Crop water requirements follow Allen et al. 1998, *Crop evapotranspiration*, FAO Irrigation and Drainage Paper 56. The soil map and the crop table for the pilot region are being selected; only openly licensed sources will be used. The full list, with versions, licences and access dates, will be in `docs/SOURCES.md`.

## Results

Added during the event window, November 14–15, 2026:

- pilot region, crops and the rotations compared
- backtest table, hits and misses
- sensor agreement with satellite soil moisture
- the farmer's or extension officer's comment
- demo link and instructions to run the tool

## Use of AI

AI assistants are used for planning, code and documentation. All data, scores and results come from the sources and scripts in this repository. Any machine-learning model inside the tool is described, with its baseline comparison, in the results.

## Licence

Apache License 2.0. See [LICENSE](LICENSE).
