/**
 * The field bundle: everything the app shows for one field.
 * Built by analysis/build_dataset.py; served from Supabase (same column names)
 * or from the bundled JSON when offline.
 */

export type Field = {
  id: string;
  name: string;
  upazila: string;
  district: string;
  lat: number;
  lon: number;
  area_ha: number;
  land_type: string;
  soil: { texture: string; organic_matter_pct: number; ph: number; is_demo: boolean; note: string };
  data_through: string;
};

export type ClimateAnnual = {
  year: number;
  tmean: number;
  tmax: number;
  rain_mm: number;
  heat_days: number;
  heat_days_mar_apr: number;
  aman_rain_mm: number;
  aman_dry_spell: number;
  heavy_rain_days: number;
  max_day_rain: number;
  rain_jul_sep: number;
  rain_nov_apr: number;
  gwet_root: number;
  gwet_root_dry: number;
};

export type ClimateMonthly = {
  month: number;
  tmax: number;
  tmin: number;
  rain_mm: number;
  rain_p20: number;
  rain_p80: number;
  et0_mm: number;
  heat_days: number;
  hot38_days: number;
  cold_days: number;
  heavy_days: number;
  gwet_root: number;
  rain_current: number | null;
  tmax_current: number | null;
  gwet_root_current: number | null;
};

export type ClimateMonthlySeries = {
  year: number;
  month: number;
  days: number;
  tmax: number;
  tmin: number;
  rain_mm: number;
  et0_mm: number;
  heat_days: number;
  hot38_days: number;
  cold_days: number;
  gwet_root: number;
};

export type ClimateRecent = {
  date: string;
  tmax: number;
  tmin: number;
  rain_mm: number;
  gwet_root: number;
  gwet_top: number;
  rh: number;
};

export type Trend = {
  per_decade: number;
  first_decade: number;
  last_decade: number;
  first_label: string;
  last_label: string;
  fit_a: number;
  fit_b: number;
  resid_sd: number;
};

export type TrendKey =
  | 'tmean'
  | 'tmax'
  | 'rain_mm'
  | 'heat_days'
  | 'heat_days_mar_apr'
  | 'aman_rain_mm'
  | 'aman_dry_spell'
  | 'gwet_root'
  | 'gwet_root_dry';

export type NdviPoint = { date: string; ndvi: number; reliability: number };
export type NdviClim = {
  doy: number;
  mean: number;
  p10: number;
  p90: number;
  current: number | null;
  current_reliability: number | null;
};
export type NdviPeak = { year: number; boro_peak: number | null; aman_peak: number | null };

export type FutureMonth = {
  month: number;
  rain_mm: number;
  et0_mm: number;
  heat_days: number;
  hot38_days: number;
  cold_days: number;
  tmax: number;
};

export type Future = {
  id: string;
  model: string;
  scenario: 'observed' | 'ssp245' | 'ssp585';
  horizon: 'now' | '2030s' | '2050s';
  has_rain_change?: boolean;
  monthly: FutureMonth[];
};

export type DroneFlight = {
  id: string;
  flown_on: string;
  crop: string;
  stage: string;
  camera: string;
  altitude_m: number;
  gsd_cm: number;
  cols: number;
  rows: number;
  cell_m: number;
  canopy: (number | null)[][];
  mean_canopy: number;
  p10_canopy: number;
  p90_canopy: number;
  low_cover_pct: number;
  modis_ndvi: number;
  modis_date: string;
  is_demo: boolean;
};

export type Severity = 'good' | 'warning' | 'serious' | 'critical';

export type DroneZone = {
  flight_id: string;
  label: string;
  kind: string;
  severity: Severity;
  x: number;
  y: number;
  w: number;
  h: number;
  note: string;
};

export type CropFamily = 'cereal' | 'legume' | 'oilseed' | 'tuber' | 'fibre' | 'vegetable';

export type Crop = {
  id: string;
  heat_c: number;
  name: string;
  family: CropFamily;
  season: string;
  water: 'paddy' | 'paddy_awd' | 'upland';
  kc: number[];
  sensitive: number[];
  sensitive_label: string;
  legume: boolean;
  net_bdt_ha: number;
  source: string;
};

export type RotationSlot = { crop: string; start: number; months: number };

export type Rotation = {
  id: string;
  name: string;
  short: string;
  is_current: boolean;
  slots: RotationSlot[];
  note: string;
};

export type Prediction = {
  id: string;
  title: string;
  value: number | null;
  unit: string;
  range_low: number | null;
  range_high: number | null;
  method: string;
  detail: Record<string, unknown>;
};

export type Source = {
  id: string;
  name: string;
  product: string;
  doi: string | null;
  url: string | null;
  use: string;
  kind: 'nasa' | 'method' | 'demo';
};

export type BoroWindow = {
  rows: { transplant: string; heat_days: number; cold_days: number }[];
  best: string;
  window: [string, string];
};

export type Bundle = {
  generated: string;
  thresholds: { heat_c: number; cold_c: number; dry_mm: number };
  power_notes: { tmax_offset_by_month: number[]; break_year: number; trend_years: string };
  field: Field;
  climate_annual: ClimateAnnual[];
  climate_monthly: ClimateMonthly[];
  climate_monthly_series: ClimateMonthlySeries[];
  climate_recent: ClimateRecent[];
  trends: Record<TrendKey, Trend>;
  ndvi: NdviPoint[];
  ndvi_climatology: NdviClim[];
  ndvi_peaks: NdviPeak[];
  futures: Future[];
  boro_window: BoroWindow;
  predictions: Prediction[];
  drone_flights: DroneFlight[];
  drone_zones: DroneZone[];
  crops: Crop[];
  rotations: Rotation[];
  sources: Source[];
};
