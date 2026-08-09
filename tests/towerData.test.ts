import { describe, expect, it } from "vitest";
import { buildTowerData } from "../src/sections/playground/towerData";

describe("buildTowerData", () => {
  it("builds a single evenly split band when endorsements agree", () => {
    const towers = buildTowerData(
      [
        [250, 750],
        [250, 750],
      ],
      [0.5, 0.5],
      2,
    );
    expect(towers).toHaveLength(2);

    const towerP = towers[0]!;
    expect(towerP.total).toBe(250);
    expect(towerP.bands).toHaveLength(1);
    expect(towerP.bands[0]).toEqual({
      bottom: 0,
      top: 250,
      segments: [
        { ev: 0, frac: 0.5 },
        { ev: 1, frac: 0.5 },
      ],
    });
  });

  it("stacks a solo band above a shared band for layered endorsements", () => {
    // A endorses P to 600, B to 200.
    const towers = buildTowerData([[600], [200]], [0.5, 0.5], 1);
    const tower = towers[0]!;
    expect(tower.total).toBe(600);
    expect(tower.bands).toHaveLength(2);
    expect(tower.bands[0]).toEqual({
      bottom: 0,
      top: 200,
      segments: [
        { ev: 0, frac: 0.5 },
        { ev: 1, frac: 0.5 },
      ],
    });
    expect(tower.bands[1]).toEqual({
      bottom: 200,
      top: 600,
      segments: [{ ev: 0, frac: 1 }],
    });
  });

  it("slices shared bands proportionally to budgets", () => {
    const towers = buildTowerData([[100], [100]], [0.75, 0.25], 1);
    expect(towers[0]!.bands[0]!.segments).toEqual([
      { ev: 0, frac: 0.75 },
      { ev: 1, frac: 0.25 },
    ]);
  });

  it("produces an empty tower for an unendorsed proposal", () => {
    const towers = buildTowerData(
      [
        [0, 100],
        [0, 100],
      ],
      [0.5, 0.5],
      2,
    );
    expect(towers[0]).toEqual({ prop: 0, total: 0, bands: [] });
  });

  it("tower height equals the layer-sum (money received)", () => {
    // Bands: 0–200 (both), 200–600 (A only) — heights sum to the max endorsement.
    const towers = buildTowerData([[600], [200]], [0.5, 0.5], 1);
    const layerSum = towers[0]!.bands.reduce((s, b) => s + (b.top - b.bottom), 0);
    expect(layerSum).toBe(towers[0]!.total);
  });
});
