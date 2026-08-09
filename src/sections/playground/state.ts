export interface EvaluatorInput {
  /** Budget in $k. */
  budget: number;
  /** Marginal tranche table, nTranches × nProps, in $k. */
  tranches: number[][];
}

export interface PlaygroundState {
  nProps: number;
  nTranches: number;
  evaluators: EvaluatorInput[];
}

export const LIMITS = {
  minEvaluators: 2,
  maxEvaluators: 4,
  minProps: 2,
  maxProps: 4,
  minTranches: 1,
  maxTranches: 5,
} as const;

export const EV_NAMES = ["A", "B", "C", "D"] as const;
export const PROP_NAMES = ["P", "Q", "R", "S"] as const;
/** CSS classes coloring proposal headers; "" = default ink. */
export const PROP_CLASSES = ["col-p", "col-q", "col-r", ""] as const;
/** Evaluator colors — a separate family from the proposal colors. */
export const EV_COLORS = ["#3D6B9E", "#3E8566", "#C2912E", "#8C4A5E"] as const;

export function defaultState(): PlaygroundState {
  return {
    nProps: 2,
    nTranches: 2,
    evaluators: [
      { budget: 500, tranches: [[250, 0], [0, 750]] },
      { budget: 500, tranches: [[250, 0], [0, 750]] },
    ],
  };
}

export interface Preset {
  label: string;
  note: string;
  state: () => PlaygroundState;
}

export const PRESETS: readonly Preset[] = [
  {
    label: "§1 · perfect agreement",
    note:
      "Identical preferences — every band is shared evenly, and each reviewer's " +
      "endorsements reach twice their personal budget.",
    state: defaultState,
  },
  {
    label: "polarized favorites",
    note:
      "Complete disagreement — no dollars overlap, so nothing is shared: each reviewer " +
      "simply funds their own favorite, solo. Converges instantly.",
    state: () => ({
      nProps: 2,
      nTranches: 2,
      evaluators: [
        { budget: 500, tranches: [[500, 0], [0, 500]] },
        { budget: 500, tranches: [[0, 500], [500, 0]] },
      ],
    }),
  },
  {
    label: "asymmetric budgets",
    note:
      "Same preferences as §1, but A controls $750k to B's $250k — watch every shared " +
      "band in the towers split 3 : 1.",
    state: () => ({
      nProps: 2,
      nTranches: 2,
      evaluators: [
        { budget: 750, tranches: [[250, 0], [0, 750]] },
        { budget: 250, tranches: [[250, 0], [0, 750]] },
      ],
    }),
  },
  {
    label: "layered endorsements",
    note:
      "Both endorse P, but A goes much higher — P's tower gets a shared lower band with " +
      "an A-solo band stacked on top of it.",
    state: () => ({
      nProps: 2,
      nTranches: 2,
      evaluators: [
        { budget: 500, tranches: [[800, 0], [0, 200]] },
        { budget: 500, tranches: [[200, 0], [0, 800]] },
      ],
    }),
  },
  {
    label: "broad vs. narrow",
    note:
      "A champions P, B champions Q, and C spreads support around (like a mean " +
      "recommender) — strong narrow favorites and mild broad support both end up " +
      "funded (§5's point).",
    state: () => ({
      nProps: 3,
      nTranches: 2,
      evaluators: [
        { budget: 300, tranches: [[400, 0, 100], [0, 0, 400]] },
        { budget: 300, tranches: [[0, 400, 100], [0, 0, 400]] },
        { budget: 300, tranches: [[100, 100, 300], [200, 200, 0]] },
      ],
    }),
  },
  {
    label: "unspendable budget",
    note:
      "The tranche tables only cover $200k of a $1m pool — the simulated reviewers run " +
      "out of things to endorse, budgets can't be spent, and the run never converges.",
    state: () => ({
      nProps: 2,
      nTranches: 1,
      evaluators: [
        { budget: 500, tranches: [[100, 0]] },
        { budget: 500, tranches: [[0, 100]] },
      ],
    }),
  },
];
