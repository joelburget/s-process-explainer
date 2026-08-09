# What is the S-Process?

An interactive explainer for the S-Process — the Survival and Flourishing
Fund's deterministic funding-allocation algorithm. Covers the coordination
problem, tranche tables and MVF sweeps, endorsement levels vs. contributions,
and a live playground running a faithful TypeScript port of the production
algorithm, with the endorsement-towers visualization.

## Development

```sh
npm install
npm run dev        # dev server with HMR
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm test           # vitest suite for the algorithm + tower construction
```

## Layout

- `index.html` — all page markup (the sections are static; scripts hydrate them)
- `src/style.css` — design tokens and all styling
- `src/algorithm.ts` — the S-Process core: `cumulate`, `unilateralAlloc`,
  `contributionsOfEndorsements` (née `accountsOfGuarantees`), `runSProcess`.
  Ported from the production `singleLayerSProcess.ts` / `unilateralAlloc.ts`,
  operating on plain `number[][]` and returning per-epoch snapshots so the UI
  can scrub through convergence.
- `src/sections/` — one module per interactive section:
  - `scenario.ts` (§1 outcome explorer)
  - `sweep.ts` (§2 MVF sweep)
  - `split.ts` (§3 proportional-contribution slider)
  - `playground/` (§4): `state.ts` (state shape + presets),
    `towerData.ts` (pure band construction, mirrors the production
    `towerData.ts`), `towers.ts` (SVG rendering), `index.ts` (orchestration)
- `tests/` — algorithm correctness (worked example from the doc, asymmetric
  budgets, non-convergence, zero budgets) and tower band construction.

## Notes

- Tranche inputs in the playground are **marginal** $k amounts; `cumulate`
  produces the cumulative tables with nondecreasing row sums that
  `unilateralAlloc`'s binary search relies on.
- Convergence tolerance is $0.5k over a max of 120 epochs; the "unspendable
  budget" preset intentionally never converges to demonstrate the warning.
