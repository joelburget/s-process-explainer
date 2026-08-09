/**
 * S-Process core, ported from the production `unilateralAlloc.ts` and
 * `singleLayerSProcess.ts` (plain-array version, no typed-dimension wrappers).
 *
 * Terminology note: the production algorithm code calls these matrices
 * `guarantees` and `accounts`; user-facing terminology is "endorsement
 * levels" and "contributions". This module uses the new names.
 *
 * All tranche tables here are CUMULATIVE with nondecreasing row sums.
 * `cumulate` produces such tables from nonnegative marginal inputs.
 */

/** Row-major 2-D matrix. */
export type Matrix = number[][];

export interface Snapshot {
  /** n_evaluators × n_proposals endorsement levels ($k). */
  endorsements: Matrix;
  /** n_evaluators × n_proposals contributions ($k). */
  contributions: Matrix;
  /** Per-evaluator unspent budget ($k). */
  remaining: number[];
  /** Worst-off evaluator's unspent budget ($k). */
  maxRemaining: number;
}

export interface SProcessResult {
  /** One snapshot per epoch, index 0 = the all-zero starting state. */
  snaps: Snapshot[];
  epochs: number;
  converged: boolean;
  /** Responsibility (budget) proportions used for sharing. */
  proportions: number[];
}

export interface SProcessOptions {
  /** Convergence threshold on maxRemaining, in $k. */
  tolerance?: number;
  maxEpochs?: number;
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Convert a marginal tranche table to a cumulative one (clamping negatives to 0). */
export function cumulate(marginal: Matrix): Matrix {
  const cols = marginal[0]?.length ?? 0;
  const running = new Array<number>(cols).fill(0);
  return marginal.map((row) => {
    for (let j = 0; j < cols; j++) running[j]! += Math.max(0, row[j] ?? 0);
    return running.slice();
  });
}

export function rowSumsOf(table: Matrix): number[] {
  return table.map(sum);
}

/**
 * Lower bound: first index with rowSums[i] >= budget. Relies on rowSums being
 * nondecreasing (cumulative tranche tables). Returns -1 when the whole table
 * absorbs less than the budget.
 */
export function firstRowUsingWholeBudget(
  rowSums: readonly number[],
  budget: number,
): number {
  let lo = 0;
  let hi = rowSums.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (rowSums[mid]! >= budget) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo < rowSums.length ? lo : -1;
}

/**
 * Walk a cumulative tranche table with the given budget, interpolating within
 * the partially funded tranche. Returns per-proposal endorsement levels.
 */
export function unilateralAlloc(
  cumulative: Matrix,
  cumulativeRowSums: readonly number[],
  budget: number,
): number[] {
  const rows = cumulative.length;
  const cols = cumulative[0]?.length ?? 0;
  const out = new Array<number>(cols).fill(0);
  if (rows === 0 || budget <= 0) return out;

  const i = firstRowUsingWholeBudget(cumulativeRowSums, budget);
  if (i === -1) return cumulative[rows - 1]!.slice(); // table absorbs less than the budget

  const fullyUsedBudget = i > 0 ? cumulativeRowSums[i - 1]! : 0;
  const marginalTotal = cumulativeRowSums[i]! - fullyUsedBudget;
  const scale = marginalTotal === 0 ? 0 : (budget - fullyUsedBudget) / marginalTotal;
  for (let j = 0; j < cols; j++) {
    const fullyUsed = i > 0 ? cumulative[i - 1]![j]! : 0;
    out[j] = fullyUsed + (cumulative[i]![j]! - fullyUsed) * scale;
  }
  return out;
}

/**
 * Split each proposal column's endorsement layers among contributors,
 * proportional to responsibility (budget) proportions.
 * Née `accountsOfGuarantees` in the production code.
 */
export function contributionsOfEndorsements(
  endorsements: Matrix,
  proportions: readonly number[],
): Matrix {
  const nEvaluators = endorsements.length;
  const nProposals = endorsements[0]?.length ?? 0;
  const contributions = endorsements.map((row) => row.map(() => 0));

  for (let c = 0; c < nProposals; c++) {
    const entries: [value: number, row: number][] = [];
    for (let r = 0; r < nEvaluators; r++) {
      const v = endorsements[r]![c]!;
      if (v > 0) entries.push([v, r]);
    }
    if (entries.length === 0) continue;

    const uniqueAmounts = [...new Set(entries.map((e) => e[0]))].sort((a, b) => a - b);
    let previousAmount = 0;
    for (const amount of uniqueAmounts) {
      const shared = amount - previousAmount;
      if (shared > 0) {
        let totalResponsibility = 0;
        const contributors: number[] = [];
        for (const [v, r] of entries) {
          if (v >= amount) {
            contributors.push(r);
            totalResponsibility += proportions[r]!;
          }
        }
        if (totalResponsibility > 0) {
          const scale = shared / totalResponsibility;
          for (const r of contributors) {
            contributions[r]![c]! += proportions[r]! * scale;
          }
        }
      }
      previousAmount = amount;
    }
  }
  return contributions;
}

export function responsibilityProportions(budgets: readonly number[]): number[] {
  const total = sum(budgets);
  if (total === 0) {
    const n = budgets.length;
    return budgets.map(() => (n === 0 ? 0 : 1 / n));
  }
  return budgets.map((b) => b / total);
}

/**
 * Run the S-Process: repeatedly let each simulated evaluator re-read their
 * tranche table with a virtual budget expanded by (endorsed − charged),
 * recompute charges, and stop when every budget is spent to within tolerance.
 */
export function runSProcess(
  budgets: readonly number[],
  cumulativeTables: readonly Matrix[],
  { tolerance = 0.5, maxEpochs = 120 }: SProcessOptions = {},
): SProcessResult {
  const nProposals = cumulativeTables[0]?.[0]?.length ?? 0;
  const proportions = responsibilityProportions(budgets);
  const cumulativeRowSums = cumulativeTables.map(rowSumsOf);

  let endorsements: Matrix = budgets.map(() => new Array<number>(nProposals).fill(0));
  let contributions = contributionsOfEndorsements(endorsements, proportions);

  const snapshot = (): Snapshot => {
    const contributionSums = contributions.map(sum);
    const remaining = budgets.map((b, i) => b - contributionSums[i]!);
    return {
      endorsements: endorsements.map((r) => r.slice()),
      contributions: contributions.map((r) => r.slice()),
      remaining,
      maxRemaining: remaining.length ? Math.max(...remaining) : 0,
    };
  };

  const snaps: Snapshot[] = [snapshot()];
  let epochs = 0;
  while (snaps[snaps.length - 1]!.maxRemaining > tolerance && epochs < maxEpochs) {
    epochs++;
    const endorsementSums = endorsements.map(sum);
    const contributionSums = contributions.map(sum);
    endorsements = endorsements.map((_, i) =>
      unilateralAlloc(
        cumulativeTables[i]!,
        cumulativeRowSums[i]!,
        budgets[i]! + (endorsementSums[i]! - contributionSums[i]!),
      ),
    );
    contributions = contributionsOfEndorsements(endorsements, proportions);
    snaps.push(snapshot());
  }

  return {
    snaps,
    epochs,
    converged: snaps[snaps.length - 1]!.maxRemaining <= tolerance,
    proportions,
  };
}
