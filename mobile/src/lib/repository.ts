import localBundle from '@/data/ashulia.json';

import { supabase } from './supabase';
import type { Bundle } from './types';

export const FIELD_ID = 'ashulia-demo';

export type DataSource = 'supabase' | 'bundled';

export const bundled = localBundle as unknown as Bundle;

/** Reads every table for one field from Supabase and assembles the bundle. */
export async function fetchBundle(fieldId = FIELD_ID): Promise<Bundle> {
  if (!supabase) throw new Error('Supabase is not configured');
  const db = supabase;

  const byField = (table: string, order?: string) => {
    let q = db.from(table).select('*').eq('field_id', fieldId);
    if (order) q = q.order(order);
    return q;
  };
  const strip = <T extends Record<string, unknown>>(rows: T[] | null) =>
    (rows ?? []).map(({ field_id: _f, ...rest }) => rest);

  const [field, meta, annual, monthly, series, recent, ndvi, ndviClim, futures, flights, crops, rotations, predictions, sources] =
    await Promise.all([
      db.from('fields').select('*').eq('id', fieldId).single(),
      db.from('field_meta').select('*').eq('field_id', fieldId).single(),
      byField('climate_annual', 'year'),
      byField('climate_monthly', 'month'),
      byField('climate_monthly_series', 'year').order('month'),
      byField('climate_recent', 'date'),
      byField('ndvi', 'date'),
      byField('ndvi_climatology', 'doy'),
      byField('futures'),
      byField('drone_flights', 'flown_on'),
      db.from('crops').select('*'),
      byField('rotations'),
      byField('predictions'),
      db.from('sources').select('*'),
    ]);

  const failed = [field, meta, annual, monthly, series, recent, ndvi, ndviClim, futures, flights, crops, rotations, predictions, sources].find(
    (r) => r.error,
  );
  if (failed?.error) throw failed.error;

  const flightIds = (flights.data ?? []).map((f) => f.id as string);
  const zones = flightIds.length
    ? await db.from('drone_zones').select('*').in('flight_id', flightIds).order('id')
    : { data: [], error: null };
  if (zones.error) throw zones.error;

  const m = meta.data!;
  return {
    generated: m.generated,
    thresholds: m.thresholds,
    power_notes: m.power_notes,
    field: field.data,
    climate_annual: strip(annual.data),
    climate_monthly: strip(monthly.data),
    climate_monthly_series: strip(series.data),
    climate_recent: strip(recent.data),
    trends: m.trends,
    ndvi: strip(ndvi.data),
    ndvi_climatology: strip(ndviClim.data),
    ndvi_peaks: m.ndvi_peaks,
    futures: strip(futures.data),
    boro_window: m.boro_window,
    predictions: strip(predictions.data),
    drone_flights: strip(flights.data),
    drone_zones: (zones.data ?? []).map(({ id: _id, ...z }) => z),
    crops: crops.data ?? [],
    rotations: strip(rotations.data),
    sources: sources.data ?? [],
  } as unknown as Bundle;
}
