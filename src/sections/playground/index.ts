import {
  cumulate,
  runSProcess,
  sum,
  type Matrix,
  type SProcessResult,
} from "../../algorithm";
import { byId, cssVar, fmtK, svgEl } from "../../dom";
import {
  defaultState,
  EV_NAMES,
  LIMITS,
  PRESETS,
  PROP_CLASSES,
  PROP_NAMES,
  type PlaygroundState,
} from "./state";
import { renderTowers } from "./towers";

export function initPlayground(): void {
  let state: PlaygroundState = defaultState();
  let result: SProcessResult = recomputeResult();

  const inputsEl = byId("pg-inputs");
  const epochSlider = byId<HTMLInputElement>("pg-epoch");
  const presetsEl = byId("pg-presets");
  const presetNote = byId("pg-preset-note");

  // -- inputs ---------------------------------------------------------------

  function buildInputs(): void {
    inputsEl.innerHTML = "";
    state.evaluators.forEach((evaluator, ei) => {
      const card = document.createElement("div");
      card.className = "ev-card";

      const head = document.createElement("div");
      head.className = "ev-head";
      const name = document.createElement("div");
      name.className = "ev-name";
      name.textContent = `Evaluator ${EV_NAMES[ei]}`;
      const budgetWrap = document.createElement("label");
      budgetWrap.className = "ev-budget";
      budgetWrap.append("budget $k ");
      const budgetInput = document.createElement("input");
      budgetInput.type = "number";
      budgetInput.min = "0";
      budgetInput.step = "25";
      budgetInput.value = String(evaluator.budget);
      budgetInput.setAttribute(
        "aria-label",
        `Budget for evaluator ${EV_NAMES[ei]} in thousands`,
      );
      budgetInput.addEventListener("input", () => {
        evaluator.budget = Math.max(0, Number(budgetInput.value) || 0);
        onManualChange();
      });
      budgetWrap.appendChild(budgetInput);
      head.append(name, budgetWrap);
      card.appendChild(head);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headerRow.appendChild(document.createElement("th")); // corner
      for (let p = 0; p < state.nProps; p++) {
        const th = document.createElement("th");
        th.textContent = PROP_NAMES[p]!;
        const cls = PROP_CLASSES[p];
        if (cls) th.className = cls;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      for (let t = 0; t < state.nTranches; t++) {
        const tr = document.createElement("tr");
        const rowHead = document.createElement("td");
        rowHead.className = "rowhead";
        rowHead.textContent = `t${t + 1}`;
        tr.appendChild(rowHead);
        for (let p = 0; p < state.nProps; p++) {
          const td = document.createElement("td");
          const input = document.createElement("input");
          input.type = "number";
          input.min = "0";
          input.step = "25";
          input.value = String(evaluator.tranches[t]![p]);
          input.setAttribute(
            "aria-label",
            `${EV_NAMES[ei]} tranche ${t + 1} for proposal ${PROP_NAMES[p]} in thousands`,
          );
          input.addEventListener("input", () => {
            evaluator.tranches[t]![p] = Math.max(0, Number(input.value) || 0);
            onManualChange();
          });
          td.appendChild(input);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      card.appendChild(table);
      inputsEl.appendChild(card);
    });
  }

  // -- outputs --------------------------------------------------------------

  function renderMatrixTable(
    tableEl: HTMLTableElement,
    matrix: Matrix,
    withColumnTotals: boolean,
  ): void {
    tableEl.innerHTML = "";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th"));
    for (let p = 0; p < state.nProps; p++) {
      const th = document.createElement("th");
      th.textContent = PROP_NAMES[p]!;
      const cls = PROP_CLASSES[p];
      if (cls) th.className = cls;
      headerRow.appendChild(th);
    }
    const thSum = document.createElement("th");
    thSum.textContent = "Σ row";
    headerRow.appendChild(thSum);
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);

    const tbody = document.createElement("tbody");
    matrix.forEach((row, ei) => {
      const tr = document.createElement("tr");
      const rowHead = document.createElement("td");
      rowHead.className = "rowhead";
      rowHead.textContent = EV_NAMES[ei]!;
      tr.appendChild(rowHead);
      for (const value of row) {
        const td = document.createElement("td");
        td.textContent = fmtK(value);
        tr.appendChild(td);
      }
      const rowSum = document.createElement("td");
      rowSum.textContent = fmtK(sum(row));
      tr.appendChild(rowSum);
      tbody.appendChild(tr);
    });
    if (withColumnTotals) {
      const tr = document.createElement("tr");
      tr.className = "totals-row";
      const rowHead = document.createElement("td");
      rowHead.className = "rowhead";
      rowHead.textContent = "Σ col";
      tr.appendChild(rowHead);
      for (let p = 0; p < state.nProps; p++) {
        const td = document.createElement("td");
        td.textContent = fmtK(sum(matrix.map((r) => r[p]!)));
        tr.appendChild(td);
      }
      const grand = document.createElement("td");
      grand.textContent = fmtK(sum(matrix.map(sum)));
      tr.appendChild(grand);
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);
  }

  function renderSpark(): void {
    const svg = byId<HTMLElement>("pg-spark") as unknown as SVGSVGElement;
    svg.innerHTML = "";
    const W = 620;
    const H = 90;
    const ML = 8;
    const MR = 8;
    const MT = 10;
    const MB = 18;
    const snaps = result.snaps;
    const n = snaps.length;
    const maxVal = Math.max(1e-9, ...snaps.map((s) => s.maxRemaining));
    const x = (i: number): number => ML + (n === 1 ? 0 : i / (n - 1)) * (W - ML - MR);
    const y = (v: number): number => MT + (1 - v / maxVal) * (H - MT - MB);

    svg.appendChild(svgEl("line", { x1: ML, y1: y(0), x2: W - MR, y2: y(0), stroke: cssVar("--line") }));
    const points = snaps.map((s, i) => `${x(i)},${y(s.maxRemaining)}`).join(" ");
    svg.appendChild(svgEl("polyline", {
      points, fill: "none", stroke: cssVar("--ink"), "stroke-width": 1.75,
    }));
    if (n <= 40) {
      snaps.forEach((s, i) => {
        svg.appendChild(svgEl("circle", { cx: x(i), cy: y(s.maxRemaining), r: 2.5, fill: cssVar("--ink") }));
      });
    }
    const currentEpoch = Number(epochSlider.value);
    svg.appendChild(svgEl("line", {
      x1: x(currentEpoch), y1: MT - 4, x2: x(currentEpoch), y2: H - MB + 4,
      stroke: cssVar("--good"), "stroke-width": 2,
    }));
    const label = svgEl("text", { x: ML, y: H - 4, "font-size": 10.5, fill: cssVar("--soft") });
    label.textContent = "max remaining budget per epoch (worst-off evaluator's unspent $k)";
    svg.appendChild(label);
  }

  function renderOutputs(): void {
    const currentEpoch = Number(epochSlider.value);
    const snap = result.snaps[currentEpoch]!;
    renderMatrixTable(byId<HTMLTableElement>("pg-guarantees"), snap.endorsements, false);
    renderMatrixTable(byId<HTMLTableElement>("pg-accounts"), snap.contributions, true);
    renderTowers(state, snap, result.proportions);
    byId("pg-epoch-count").textContent =
      `${currentEpoch} / ${result.epochs} · rem $${fmtK(snap.maxRemaining)}k`;
    renderSpark();

    const status = byId("pg-status");
    status.innerHTML = "";
    const span = document.createElement("span");
    if (result.converged) {
      span.className = "converged";
      span.textContent = `converged in ${result.epochs} epoch${result.epochs === 1 ? "" : "s"}`;
    } else {
      span.textContent = `stopped at ${result.epochs} epochs without converging`;
    }
    status.appendChild(span);

    const warn = byId("pg-warn");
    warn.innerHTML = "";
    const totalBudget = sum(state.evaluators.map((e) => e.budget));
    const capacities = state.evaluators.map((e) => sum(e.tranches.map(sum)));
    if (!result.converged && capacities.some((c) => c < totalBudget - 0.001)) {
      const div = document.createElement("div");
      div.className = "warn";
      div.textContent =
        `Note: at least one tranche table adds up to less than the shared budget ` +
        `($${fmtK(totalBudget)}k), so that evaluator runs out of things to endorse ` +
        `and their budget can't be fully spent.`;
      warn.appendChild(div);
    }
  }

  // -- recompute & wiring ---------------------------------------------------

  function recomputeResult(): SProcessResult {
    const budgets = state.evaluators.map((e) => e.budget);
    const cumulativeTables = state.evaluators.map((e) => cumulate(e.tranches));
    return runSProcess(budgets, cumulativeTables, { tolerance: 0.5, maxEpochs: 120 });
  }

  function recompute(): void {
    result = recomputeResult();
    epochSlider.max = String(result.snaps.length - 1);
    epochSlider.value = String(result.snaps.length - 1);
    renderOutputs();
  }

  function clearPresetHighlight(): void {
    presetsEl
      .querySelectorAll(".chip")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
    presetNote.textContent = "";
  }

  /** A hand edit leaves whatever preset was active. */
  function onManualChange(): void {
    clearPresetHighlight();
    recompute();
  }

  function rebuild(): void {
    buildInputs();
    recompute();
  }

  function applyPreset(index: number): void {
    state = PRESETS[index]!.state();
    clearPresetHighlight();
    rebuild();
    presetsEl
      .querySelectorAll(".chip")
      .forEach((b, j) => b.setAttribute("aria-pressed", String(j === index)));
    presetNote.textContent = PRESETS[index]!.note;
  }

  PRESETS.forEach((preset, i) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.textContent = preset.label;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => applyPreset(i));
    presetsEl.appendChild(button);
  });

  epochSlider.addEventListener("input", renderOutputs);

  // structural controls
  const structural = (id: string, apply: () => boolean): void => {
    byId(id).addEventListener("click", () => {
      if (!apply()) return;
      clearPresetHighlight();
      rebuild();
    });
  };
  structural("pg-add-ev", () => {
    if (state.evaluators.length >= LIMITS.maxEvaluators) return false;
    state.evaluators.push({
      budget: 500,
      tranches: Array.from({ length: state.nTranches }, () =>
        new Array<number>(state.nProps).fill(0),
      ),
    });
    return true;
  });
  structural("pg-rm-ev", () => {
    if (state.evaluators.length <= LIMITS.minEvaluators) return false;
    state.evaluators.pop();
    return true;
  });
  structural("pg-add-prop", () => {
    if (state.nProps >= LIMITS.maxProps) return false;
    state.nProps++;
    state.evaluators.forEach((e) => e.tranches.forEach((row) => row.push(0)));
    return true;
  });
  structural("pg-rm-prop", () => {
    if (state.nProps <= LIMITS.minProps) return false;
    state.nProps--;
    state.evaluators.forEach((e) => e.tranches.forEach((row) => row.pop()));
    return true;
  });
  structural("pg-add-tr", () => {
    if (state.nTranches >= LIMITS.maxTranches) return false;
    state.nTranches++;
    state.evaluators.forEach((e) =>
      e.tranches.push(new Array<number>(state.nProps).fill(0)),
    );
    return true;
  });
  structural("pg-rm-tr", () => {
    if (state.nTranches <= LIMITS.minTranches) return false;
    state.nTranches--;
    state.evaluators.forEach((e) => e.tranches.pop());
    return true;
  });

  applyPreset(0);
}
