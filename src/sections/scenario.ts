import { byId } from "../dom";

type ScenarioKey = "naive" | "guess" | "sprocess";

interface Scenario {
  /** [[A→P, A→Q], [B→P, B→Q]] in $k. */
  table: [[number, number], [number, number]];
  status: string;
  note: string;
}

const SCENARIOS: Record<ScenarioKey, Scenario> = {
  naive: {
    table: [
      [250, 250],
      [250, 250],
    ],
    status: "P is double-funded",
    note:
      "Each evaluator independently spends their own $500k on their priorities. " +
      "P ends up with $500k — twice what either evaluator wanted it to have.",
  },
  guess: {
    table: [
      [0, 500],
      [0, 500],
    ],
    status: "P gets nothing",
    note:
      "A anticipates that B will fully fund P, and B assumes that A will do the same. " +
      "Both put all of their money in Q, an even worse outcome.",
  },
  sprocess: {
    table: [
      [125, 375],
      [125, 375],
    ],
    status: "exactly right",
    note:
      "We want to end up here: P gets its $250k, half-funded by each evaluator, " +
      "and the rest flows to Q. The S-Process is an algorithm for finding this " +
      "allocation automatically.",
  },
};

const fmtDollars = (v: number): string => (v === 0 ? "0" : `$${v}k`);

export function initScenario(): void {
  const cells = {
    ap: byId("sc-ap"),
    aq: byId("sc-aq"),
    bp: byId("sc-bp"),
    bq: byId("sc-bq"),
  };
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    "#scenario-panel .chip",
  );

  function render(key: ScenarioKey): void {
    const scenario = SCENARIOS[key];
    const [[ap, aq], [bp, bq]] = scenario.table;
    cells.ap.textContent = fmtDollars(ap);
    cells.aq.textContent = fmtDollars(aq);
    cells.bp.textContent = fmtDollars(bp);
    cells.bq.textContent = fmtDollars(bq);

    const pTotal = ap + bp;
    const qTotal = aq + bq;
    // Scale bars against the $750k max so both fit; targets are P=$250k, Q=$750k.
    byId("sc-bar-p").style.width = `${(pTotal / 750) * 100}%`;
    byId("sc-bar-q").style.width = `${(qTotal / 750) * 100}%`;
    byId("sc-target-p").style.left = `${(250 / 750) * 100}%`;
    byId("sc-target-q").style.left = "calc(100% - 2px)";
    byId("sc-amt-p").textContent = `$${pTotal}k of $250k wanted`;
    byId("sc-amt-q").textContent = `$${qTotal}k of $750k wanted`;
    byId("scenario-note").textContent = scenario.note;
    byId("scenario-status").textContent = scenario.status;
    buttons.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset["scenario"] === key)),
    );
  }

  buttons.forEach((b) =>
    b.addEventListener("click", () =>
      render(b.dataset["scenario"] as ScenarioKey),
    ),
  );
  render("naive");
}
