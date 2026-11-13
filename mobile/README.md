# Furrow mobile app

Expo app (iOS, Android, web) for one field: what has shifted, what shifts next, which crop rotation is the lowest-regret choice, and the plan for the coming season.

## Run

```bash
npm install
npx expo start     # w = web, or scan the QR code with Expo Go
```

The app works offline from `src/data/ashulia.json`, a bundle built from real NASA data by `../analysis/build_dataset.py`. With `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set (see `.env.example`), it loads the same tables from Supabase on start and shows "Supabase" in the header pill; if that fails it stays on the bundled data.

## How it works

1. **Onboarding** (first launch): welcome → mark the field on a satellite map by tapping its corners (area in decimal and bigha) → 18 simple questions (crops, land, flooding, water, soil, fertiliser, straw, problems, priorities) → an animated "checking your field" step. Saved on the phone (AsyncStorage) and, if Supabase is set up, in `farm_profiles`.
2. **Home**: field status and crop health from satellite, top warnings, jobs to do now, next year's crop advice, drone check, recent rain and soil moisture.
3. **Alerts**: warnings for flood, heavy rain, heat, drought, cold, dry spells, waterlogging and pests, each with what to do. Built from 30 years of NASA data, the farmer's answers, and a live 7-day forecast (Open-Meteo, labelled as not NASA). Includes a 12-month risk calendar.
4. **Advice**: the rotation chosen for the farmer's answers and priorities (rotations they cannot grow are flagged), a soil-nutrient plan (rules from BARC's Fertilizer Recommendation Guide 2018), all options compared, and the season to-do.
5. **History**: big events in the area (wettest monsoons, driest winters, hottest springs, heaviest rain days, coldest Januaries), plus heat, rain, soil moisture, crop health and future climate.
6. **Drone**: request a drone check (what to check, day, phone), follow its status, call the team, and read the survey report (demo data until real flights).

Data and methods (tap the header pill) lists every source and has "Start over with a new field".

## Code layout

```
src/app/            routes only: (tabs), onboarding/, plan, drone-request, sources
src/screens/        one file per screen
src/components/     ui/ (text, card, badge, segmented, stat, screen), charts/ (react-native-svg + d3-scale)
src/lib/engine.ts   rotation scoring: FAO-56 water, stress days, soil rules, minimax regret, season plan
src/lib/advisor.ts  answers → current rotation, priorities, constraints; soil-nutrient tips
src/lib/alerts.ts   warnings from NASA data + answers + 7-day forecast; risk calendar
src/lib/profile.tsx farm profile and drone request (AsyncStorage + Supabase)
src/components/field-map-picker.tsx  Leaflet map (Expo DOM component) for drawing the field
src/lib/repository.ts   Supabase reads → bundle; falls back to bundled JSON
src/data/ashulia.json   generated; do not edit by hand
```

Checks: `npx tsc --noEmit` and `npx expo lint`.
