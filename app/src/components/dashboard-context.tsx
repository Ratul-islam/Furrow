"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { farm, horizons, type Horizon } from "@/lib/sample-data";
import { DEFAULT_WEIGHTS, rank, type RankRow, type Ranking, type Weights } from "@/lib/engine";

interface DashboardState {
  horizon: Horizon;
  setHorizon: (id: string) => void;
  weights: Weights;
  setWeights: (w: Weights) => void;
  ranking: Ranking;
  pick: RankRow;
  runner: RankRow;
  current: RankRow;
}

const DashboardContext = createContext<DashboardState | null>(null);

/* Holds the two things the farmer can change — planning horizon and priorities — and the ranking they produce. */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [horizonId, setHorizon] = useState(horizons[0].id);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  const horizon = horizons.find((h) => h.id === horizonId) ?? horizons[0];
  const ranking = rank(horizon.id, weights);
  const [pick, runner] = ranking.rows;
  const current = ranking.rows.find((r) => r.rotation.id === farm.currentRotation) ?? pick;

  return (
    <DashboardContext.Provider value={{ horizon, setHorizon, weights, setWeights, ranking, pick, runner, current }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
