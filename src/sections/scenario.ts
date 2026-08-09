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
      "Each reviewer independently spends their own $500k down their priority list. " +
      "P ends up with $500k — twice what either reviewer wanted it to have.",
  },
  guess: {
    table: [
      [0, 500],
      [0, 500],
    ],
    status: "P gets nothing",
    note:
      "A assumes B will cover P, and B assumes the same about A. Both dump everything " +
      "into Q. Strategic second-guessing produces the worst outcome of all.",
  },
  sprocess: {
    table: [
      [125, 375],
      [125, 375],
    ],
    status: "exactly right",
    note:
      "P gets its $250k, funded half by each reviewer; the rest flows to Q. This is the " +
      "allocation the S-Process finds automatically — no coordination or guessing required.",
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
  const buttons = document.querySelectorAll<HTMLButtonElement>("#scenario-panel .chip");

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
    b.addEventListener("click", () => render(b.dataset["scenario"] as ScenarioKey)),
  );
  render("naive");
}
