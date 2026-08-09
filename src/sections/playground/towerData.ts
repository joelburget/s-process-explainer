import type { Matrix } from "../../algorithm";

/**
 * Tower construction for the endorsement-towers view, mirroring the
 * production `towerData.ts` in miniature.
 *
 * For each proposal column: the unique positive endorsement levels define
 * horizontal bands; a band's contributors are the evaluators endorsing at
 * least its top, sliced in proportion to budget (responsibility) shares.
 * This is the same layer decomposition `contributionsOfEndorsements`
 * performs, so a tower's total height — the highest endorsement — equals
 * the money the proposal receives.
 */

export interface TowerSegment {
  /** Evaluator index. */
  ev: number;
  /** Horizontal fraction of the band this evaluator pays for. */
  frac: number;
}

export interface TowerBand {
  bottom: number;
  top: number;
  segments: TowerSegment[];
}

export interface ProposalTower {
  /** Proposal (column) index. */
  prop: number;
  /** Highest endorsement level = total funding received. */
  total: number;
  bands: TowerBand[];
}

export function buildTowerData(
  endorsements: Matrix,
  proportions: readonly number[],
  nProps: number,
): ProposalTower[] {
  const towers: ProposalTower[] = [];
  for (let c = 0; c < nProps; c++) {
    const entries: [value: number, row: number][] = [];
    for (let r = 0; r < endorsements.length; r++) {
      const v = endorsements[r]![c]!;
      if (v > 0) entries.push([v, r]);
    }
    const uniqueAmounts = [...new Set(entries.map((e) => e[0]))].sort((a, b) => a - b);
    const bands: TowerBand[] = [];
    let previous = 0;
    for (const amount of uniqueAmounts) {
      const contributors = entries.filter(([v]) => v >= amount).map(([, r]) => r);
      const totalResponsibility = contributors.reduce(
        (s, r) => s + proportions[r]!,
        0,
      );
      bands.push({
        bottom: previous,
        top: amount,
        segments: contributors.map((r) => ({
          ev: r,
          frac:
            totalResponsibility > 0
              ? proportions[r]! / totalResponsibility
              : 1 / contributors.length,
        })),
      });
      previous = amount;
    }
    towers.push({ prop: c, total: previous, bands });
  }
  return towers;
}
