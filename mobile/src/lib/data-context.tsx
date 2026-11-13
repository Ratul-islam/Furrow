import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { evaluateFor, personalize } from './advisor';
import { buildAlerts, fetchForecast, type FieldAlert, type Forecast } from './alerts';
import type { Evaluation, Weights } from './engine';
import { useProfile } from './profile';
import { bundled, fetchBundle, type DataSource } from './repository';
import { supabase } from './supabase';
import type { Bundle } from './types';

type DataState = {
  bundle: Bundle;
  source: DataSource;
  syncing: boolean;
  error: string | null;
  weights: Weights;
  setWeights: (w: Weights) => void;
  evaluation: Evaluation & { blocked: Record<string, string> };
  alerts: FieldAlert[];
  forecast: Forecast | null;
  forecastLoading: boolean;
};

const DataContext = createContext<DataState | null>(null);

/** Remounts when the farm profile changes (see root layout), so weights start from the answers. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const answers = profile?.answers ?? null;
  const [bundle, setBundle] = useState<Bundle>(bundled);
  const [source, setSource] = useState<DataSource>('bundled');
  const [syncing, setSyncing] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const personal = useMemo(() => personalize(bundle, answers), [bundle, answers]);
  const [weights, setWeights] = useState<Weights>(personal.weights);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    fetchBundle()
      .then((b) => {
        if (!alive) return;
        setBundle(b);
        setSource('supabase');
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setSyncing(false));
    return () => {
      alive = false;
    };
  }, []);

  const center = profile?.field.center ?? [bundle.field.lat, bundle.field.lon];
  const [lat, lon] = center;
  useEffect(() => {
    const ctrl = new AbortController();
    fetchForecast(lat, lon, ctrl.signal)
      .then((f) => setForecast(f))
      .finally(() => setForecastLoading(false));
    return () => ctrl.abort();
  }, [lat, lon]);

  const evaluation = useMemo(() => evaluateFor(personal, weights, answers), [personal, weights, answers]);
  const alerts = useMemo(() => buildAlerts(personal.bundle, answers, forecast), [personal.bundle, answers, forecast]);

  return (
    <DataContext
      value={{ bundle: personal.bundle, source, syncing, error, weights, setWeights, evaluation, alerts, forecast, forecastLoading }}>
      {children}
    </DataContext>
  );
}

export function useData() {
  const ctx = use(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
