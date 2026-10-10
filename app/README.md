# Furrow dashboard

The front end of Furrow: a dashboard that shows what has shifted on a farm, what shifts next, and the lowest-regret crop rotation.

**It runs on sample data.** Every number comes from a seeded generator in `src/lib/sample-data.ts`. None of it is a result.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run lint
npm run build
```

## Pages

| Route | What it shows |
|---|---|
| `/` | Overview: recommended rotation, priorities, key numbers, summary charts |
| `/rotations` | Ranked table of rotations, regret in each climate future, crop table |
| `/card` | Adaptation Card for the farmer's phone, with print to PDF |
| `/history` | What has shifted: 25-year trends |
| `/projections` | What shifts next: model spread for the 2030s and 2050s |
| `/backtest` | Backtest 2000–2025, hits and misses |
| `/sensor` | Field sensor against the satellite, soil profile |
| `/sources` | Data sources with DOIs |

The planning decade and the farmer's priorities are shared across pages.

## Where things are

| Path | What it holds |
|---|---|
| `src/lib/sample-data.ts` | The data the pages read. Real pipelines will produce the same shape |
| `src/lib/engine.ts` | Priority-weighted scores and minimax regret; trend and backtest helpers |
| `src/lib/derived.ts` | Values computed once from the data: trends, backtest counts, sensor agreement |
| `src/components/dashboard-context.tsx` | Shared state: planning decade, priorities, ranking |
| `src/components/charts/` | Charts, built on Recharts |
| `src/components/ui/` | shadcn/ui components |
| `src/app/globals.css` | Theme tokens for light and dark, chart and crop-family colours |

Built with Next.js 16, React 19, Tailwind CSS 4, shadcn/ui and Recharts. Licence: Apache 2.0.
