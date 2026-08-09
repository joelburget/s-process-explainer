import { describe, expect, it } from "vitest";
import {
  cumulate,
  firstRowUsingWholeBudget,
  runSProcess,
  sum,
  unilateralAlloc,
  rowSumsOf,
} from "../src/algorithm";

const last = <T>(arr: T[]): T => {
  const value = arr[arr.length - 1];
  if (value === undefined) throw new Error("empty array");
  return value;
};

describe("cumulate", () => {
  it("accumulates marginal rows into nondecreasing cumulative rows", () => {
    expect(cumulate([[250, 0], [0, 750]])).toEqual([
      [250, 0],
      [250, 750],
    ]);
  });

  it("clamps negative marginal entries to zero", () => {
    expect(cumulate([[100, -50]])).toEqual([[100, 0]]);
  });
});

describe("unilateralAlloc", () => {
  const table = cumulate([[250, 0], [0, 750]]);
  const rowSums = rowSumsOf(table);

  it("interpolates within the partially funded tranche", () => {
    // $500k budget: tranche 1 fully funded ($250k to P), a third of tranche 2.
    expect(unilateralAlloc(table, rowSums, 500)).toEqual([250, 250]);
  });

  it("returns zeros for a zero budget", () => {
    expect(unilateralAlloc(table, rowSums, 0)).toEqual([0, 0]);
  });

  it("caps at the last row when the table absorbs less than the budget", () => {
    expect(unilateralAlloc(table, rowSums, 5000)).toEqual([250, 750]);
  });
});

describe("firstRowUsingWholeBudget", () => {
  it("finds the lower bound", () => {
    expect(firstRowUsingWholeBudget([250, 1000], 250)).toBe(0);
    expect(firstRowUsingWholeBudget([250, 1000], 251)).toBe(1);
    expect(firstRowUsingWholeBudget([250, 1000], 1001)).toBe(-1);
  });
});

describe("runSProcess", () => {
  it("reproduces the worked example from the explainer doc", () => {
    // Two $500k reviewers with identical tables: P first $250k, then Q $750k.
    const table = cumulate([[250, 0], [0, 750]]);
    const result = runSProcess([500, 500], [table, table], { tolerance: 0.5 });

    expect(result.converged).toBe(true);
    const final = last(result.snaps);
    // Endorsement levels converge to [250, 750] and contributions to
    // [125, 375], to within the $0.5k stopping tolerance (precision -1 = ±5).
    expect(final.endorsements[0]![0]).toBeCloseTo(250, -1);
    expect(final.endorsements[0]![1]).toBeCloseTo(750, -1);
    expect(final.contributions[0]![0]).toBeCloseTo(125, -1);
    expect(final.contributions[0]![1]).toBeCloseTo(375, -1);
    // Symmetric reviewers get symmetric results.
    expect(final.contributions[0]).toEqual(final.contributions[1]);
  });

  it("halves the remaining budget each epoch in the worked example", () => {
    const table = cumulate([[250, 0], [0, 750]]);
    const result = runSProcess([500, 500], [table, table], { tolerance: 0.5 });
    for (let i = 1; i < result.snaps.length; i++) {
      expect(result.snaps[i]!.maxRemaining).toBeCloseTo(
        result.snaps[i - 1]!.maxRemaining / 2,
        6,
      );
    }
  });

  it("spends the whole pool with asymmetric budgets and opposed preferences", () => {
    const result = runSProcess(
      [600, 300],
      [cumulate([[300, 0], [0, 600]]), cumulate([[0, 300], [600, 0]])],
      { tolerance: 0.1 },
    );
    expect(result.converged).toBe(true);
    const final = last(result.snaps);
    const totalPaid = sum(final.contributions.map(sum));
    expect(totalPaid).toBeCloseTo(900, 0);
  });

  it("splits jointly endorsed dollars in proportion to budgets", () => {
    // 3:1 budgets, identical preferences: every contribution splits 3:1.
    const table = cumulate([[250, 0], [0, 750]]);
    const result = runSProcess([750, 250], [table, table], { tolerance: 0.1 });
    const final = last(result.snaps);
    expect(final.contributions[0]![0]! / final.contributions[1]![0]!).toBeCloseTo(3, 3);
    expect(result.proportions).toEqual([0.75, 0.25]);
  });

  it("does not converge when tranche tables cannot absorb the budget", () => {
    const result = runSProcess(
      [500, 500],
      [cumulate([[100, 0]]), cumulate([[0, 100]])],
      { tolerance: 0.5, maxEpochs: 50 },
    );
    expect(result.converged).toBe(false);
    expect(result.epochs).toBe(50);
    // Endorsements cap at the table's last row.
    expect(last(result.snaps).endorsements[0]).toEqual([100, 0]);
  });

  it("handles all-zero budgets without NaN", () => {
    const result = runSProcess(
      [0, 0],
      [cumulate([[100, 0]]), cumulate([[0, 100]])],
      { tolerance: 0.5 },
    );
    expect(result.converged).toBe(true);
    expect(result.proportions).toEqual([0.5, 0.5]);
    for (const snap of result.snaps) {
      expect(snap.endorsements.flat().some(Number.isNaN)).toBe(false);
    }
  });

  it("proposal receives exactly the highest endorsement level", () => {
    // Overlapping-but-unequal endorsements on P.
    const result = runSProcess(
      [500, 500],
      [cumulate([[800, 0], [0, 200]]), cumulate([[200, 0], [0, 800]])],
      { tolerance: 0.5 },
    );
    const final = last(result.snaps);
    const maxEndorsementP = Math.max(
      final.endorsements[0]![0]!,
      final.endorsements[1]![0]!,
    );
    const receivedP = final.contributions[0]![0]! + final.contributions[1]![0]!;
    expect(receivedP).toBeCloseTo(maxEndorsementP, 6);
  });
});
