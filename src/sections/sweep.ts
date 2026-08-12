import { byId, cssVar, svgEl } from "../dom";

/**
 * §2 — the MVF sweep for one evaluator of the §1 example:
 *   P: 0.7 utils/$ at $0 declining to 0.6 at $250k, then stops.
 *   Q: 0.6 at $0 declining to 0.5 at $750k, then stops.
 * A horizontal utility line sweeps down; a proposal's funding at level u is
 * the amount at which its MVF crosses u.
 */

const W = 620;
const H = 340;
const ML = 56;
const MR = 16;
const MT = 16;
const MB = 44;
const X_MAX = 1000; // $k
const Y_MIN = 0.4;
const Y_MAX = 0.78;

const x = (dollars: number): number => ML + (dollars / X_MAX) * (W - ML - MR);
const y = (utils: number): number =>
  MT + ((Y_MAX - utils) / (Y_MAX - Y_MIN)) * (H - MT - MB);

const fundedP = (u: number): number =>
  u >= 0.7 ? 0 : u >= 0.6 ? (250 * (0.7 - u)) / 0.1 : 250;
const fundedQ = (u: number): number =>
  u >= 0.6 ? 0 : u >= 0.5 ? (750 * (0.6 - u)) / 0.1 : 750;

type TrancheState = "idle" | "active" | "done";

export function initSweep(): void {
  const svg = byId<HTMLElement>("sweep-svg") as unknown as SVGSVGElement;

  // -- static chart ---------------------------------------------------------
  svg.appendChild(
    svgEl("line", { x1: ML, y1: y(Y_MIN), x2: W - MR, y2: y(Y_MIN), stroke: cssVar("--line"), "stroke-width": 1 }),
  );
  svg.appendChild(
    svgEl("line", { x1: ML, y1: MT, x2: ML, y2: y(Y_MIN), stroke: cssVar("--line"), "stroke-width": 1 }),
  );
  for (const d of [0, 250, 500, 750, 1000]) {
    const tick = svgEl("text", {
      x: x(d), y: y(Y_MIN) + 18, "text-anchor": "middle", "font-size": 11, fill: cssVar("--soft"),
    });
    tick.textContent = d === 0 ? "$0" : `$${d}k`;
    svg.appendChild(tick);
    svg.appendChild(svgEl("line", { x1: x(d), y1: y(Y_MIN), x2: x(d), y2: y(Y_MIN) + 4, stroke: cssVar("--line") }));
  }
  for (const u of [0.4, 0.5, 0.6, 0.7]) {
    const tick = svgEl("text", {
      x: ML - 8, y: y(u) + 4, "text-anchor": "end", "font-size": 11, fill: cssVar("--soft"),
    });
    tick.textContent = u.toFixed(1);
    svg.appendChild(tick);
    svg.appendChild(svgEl("line", { x1: ML, y1: y(u), x2: W - MR, y2: y(u), stroke: cssVar("--grid"), "stroke-width": 1 }));
  }
  const yLabel = svgEl("text", { x: ML - 8, y: MT - 2, "text-anchor": "end", "font-size": 11, fill: cssVar("--soft") });
  yLabel.textContent = "utils/$";
  svg.appendChild(yLabel);
  const xLabel = svgEl("text", { x: W - MR, y: y(Y_MIN) + 34, "text-anchor": "end", "font-size": 11, fill: cssVar("--soft") });
  xLabel.textContent = "funding received by the proposal";
  svg.appendChild(xLabel);

  // funded-area fills, drawn under the curves and updated per frame
  const fillP = svgEl("path", { fill: cssVar("--p"), opacity: 0.16 });
  const fillQ = svgEl("path", { fill: cssVar("--q"), opacity: 0.16 });
  svg.appendChild(fillP);
  svg.appendChild(fillQ);

  // curves, drawn down to the y-floor to show the vertical stop
  svg.appendChild(svgEl("path", {
    d: `M ${x(0)} ${y(0.7)} L ${x(250)} ${y(0.6)} L ${x(250)} ${y(Y_MIN)}`,
    fill: "none", stroke: cssVar("--p"), "stroke-width": 2.5,
  }));
  svg.appendChild(svgEl("path", {
    d: `M ${x(0)} ${y(0.6)} L ${x(750)} ${y(0.5)} L ${x(750)} ${y(Y_MIN)}`,
    fill: "none", stroke: cssVar("--q"), "stroke-width": 2.5,
  }));
  const labelP = svgEl("text", { x: x(120), y: y(0.66) - 8, "font-size": 12, fill: cssVar("--p"), "font-weight": 600 });
  labelP.textContent = "P";
  svg.appendChild(labelP);
  const labelQ = svgEl("text", { x: x(420), y: y(0.545) - 8, "font-size": 12, fill: cssVar("--q"), "font-weight": 600 });
  labelQ.textContent = "Q";
  svg.appendChild(labelQ);

  // sweep line + intersection dots
  const sweepLine = svgEl("line", {
    x1: ML, x2: W - MR, stroke: cssVar("--ink"), "stroke-width": 1.5, "stroke-dasharray": "5 4",
  });
  svg.appendChild(sweepLine);
  const dotP = svgEl("circle", { r: 4.5, fill: cssVar("--p"), stroke: cssVar("--panel"), "stroke-width": 1.5 });
  const dotQ = svgEl("circle", { r: 4.5, fill: cssVar("--q"), stroke: cssVar("--panel"), "stroke-width": 1.5 });
  svg.appendChild(dotP);
  svg.appendChild(dotQ);

  // -- dynamic rendering ----------------------------------------------------
  const slider = byId<HTMLInputElement>("sweep-slider");
  const trancheRow1 = byId("sw-t1");
  const trancheRow2 = byId("sw-t2");

  const setTrancheState = (row: HTMLElement, state: TrancheState): void => {
    row.className = `tranche-${state}`;
  };

  function render(): void {
    // Slider runs left→right as the sweep runs top→bottom, so invert:
    // value 450 → u 0.750 (top, nothing funded), value 750 → u 0.450 (bottom).
    const u = (1200 - Number(slider.value)) / 1000;
    const p = fundedP(u);
    const q = fundedQ(u);
    const total = p + q;
    byId("sweep-val").textContent = `${u.toFixed(3)}\u00A0utils/$`;

    sweepLine.setAttribute("y1", String(y(u)));
    sweepLine.setAttribute("y2", String(y(u)));
    dotP.setAttribute("cx", String(x(p)));
    dotP.setAttribute("cy", String(y(Math.min(Math.max(u, 0.6), 0.7))));
    dotQ.setAttribute("cx", String(x(q)));
    dotQ.setAttribute("cy", String(y(Math.min(Math.max(u, 0.5), 0.6))));
    dotP.style.opacity = u < 0.7 ? "1" : "0";
    dotQ.style.opacity = u < 0.6 ? "1" : "0";

    // Funded areas: under the curve from 0 to the funded amount, above the sweep level.
    fillP.setAttribute(
      "d",
      p > 0
        ? `M ${x(0)} ${y(0.7)} L ${x(p)} ${y(0.7 - (0.1 * p) / 250)} L ${x(p)} ${y(Math.max(u, Y_MIN))} L ${x(0)} ${y(Math.max(u, Y_MIN))} Z`
        : "M 0 0",
    );
    fillQ.setAttribute(
      "d",
      q > 0
        ? `M ${x(0)} ${y(0.6)} L ${x(q)} ${y(0.6 - (0.1 * q) / 750)} L ${x(q)} ${y(Math.max(u, Y_MIN))} L ${x(0)} ${y(Math.max(u, Y_MIN))} Z`
        : "M 0 0",
    );

    byId("sw-bar-p").style.width = `${(p / 250) * 100}%`;
    byId("sw-bar-q").style.width = `${(q / 750) * 100}%`;
    byId("sw-bar-t").style.width = `${(total / 1000) * 100}%`;
    byId("sw-amt-p").textContent = `$${Math.round(p)}k / $250k`;
    byId("sw-amt-q").textContent = `$${Math.round(q)}k / $750k`;
    byId("sw-amt-t").textContent = `$${Math.round(total)}k / $1m`;

    setTrancheState(trancheRow1, u >= 0.7 ? "idle" : u > 0.6 ? "active" : "done");
    setTrancheState(trancheRow2, u >= 0.6 ? "idle" : u > 0.5 ? "active" : "done");

    const status = byId("sweep-status");
    if (u >= 0.7) status.textContent = "nothing funded yet — sweep down";
    else if (total >= 1000) status.textContent = "shared $1m fully allocated";
    else status.textContent = `$${Math.round(total)}k committed`;
  }

  slider.addEventListener("input", render);
  render();
}
