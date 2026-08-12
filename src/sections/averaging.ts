import { byId, cssVar, svgEl } from "../dom";

/**
 * §5 — static MVF charts for the averaging example.
 *   A: P declines 0.7→0.5 across the full $1m; R 0.6→0.5, stopping at $500k.
 *   B: mirror image, with Q in place of P.
 *   Average (normalized so the top value is 1): R runs 1→⅚ over its $500k,
 *   entirely above P and Q, which coincide at 7/12→5/12 across the $1m.
 */

const W = 360;
const H = 260;
const ML = 46;
const MR = 12;
const MT = 14;
const MB = 42;
const X_MAX = 1000; // $k

interface Curve {
  colorVar: string;
  label: string;
  /** [funding $k, utility] vertices; the curve drops vertically after the last. */
  points: [number, number][];
  /** Where to place the letter label, as [funding $k, utility]. */
  labelAt: [number, number];
  dashed?: boolean;
  /** Skip the area fill (for a curve coinciding with an already-filled one). */
  noFill?: boolean;
}

interface Chart {
  svgId: string;
  yMax: number;
  yTicks: number[];
  yAxisLabel: string;
  curves: Curve[];
}

const FAVORITE: [number, number][] = [
  [0, 0.7],
  [1000, 0.5],
];
const SHARED_R: [number, number][] = [
  [0, 0.6],
  [500, 0.5],
];

const CHARTS: Chart[] = [
  {
    svgId: "avg-mvf-a",
    yMax: 0.78,
    yTicks: [0.2, 0.4, 0.6],
    yAxisLabel: "utils/$",
    curves: [
      { colorVar: "--p", label: "P", points: FAVORITE, labelAt: [660, 0.63] },
      { colorVar: "--r", label: "R", points: SHARED_R, labelAt: [220, 0.5] },
    ],
  },
  {
    svgId: "avg-mvf-b",
    yMax: 0.78,
    yTicks: [0.2, 0.4, 0.6],
    yAxisLabel: "utils/$",
    curves: [
      { colorVar: "--q", label: "Q", points: FAVORITE, labelAt: [660, 0.63] },
      { colorVar: "--r", label: "R", points: SHARED_R, labelAt: [220, 0.5] },
    ],
  },
];

/**
 * The averaged chart in both scales. "actual" keeps the same axis as A's
 * and B's charts, so the favorites visibly average down to half height;
 * "normalized" rescales so the top value is 1, as the app displays it.
 */
const AVG_VARIANTS: Record<"actual" | "normalized", Chart> = {
  actual: {
    svgId: "avg-mvf-avg",
    yMax: 0.78,
    yTicks: [0.2, 0.4, 0.6],
    yAxisLabel: "utils/$",
    curves: [
      { colorVar: "--r", label: "R", points: SHARED_R, labelAt: [220, 0.5] },
      {
        colorVar: "--q",
        label: "Q",
        points: [
          [0, 0.35],
          [1000, 0.25],
        ],
        labelAt: [610, 0.33],
      },
      {
        colorVar: "--p",
        label: "P",
        points: [
          [0, 0.35],
          [1000, 0.25],
        ],
        labelAt: [790, 0.2],
        dashed: true,
        noFill: true,
      },
    ],
  },
  normalized: {
    svgId: "avg-mvf-avg",
    yMax: 1.08,
    yTicks: [0.5, 1],
    yAxisLabel: "normalized",
    curves: [
      {
        colorVar: "--r",
        label: "R",
        points: [
          [0, 1],
          [500, 5 / 6],
        ],
        labelAt: [220, 0.96],
      },
      {
        colorVar: "--q",
        label: "Q",
        points: [
          [0, 7 / 12],
          [1000, 5 / 12],
        ],
        labelAt: [610, 0.56],
      },
      {
        colorVar: "--p",
        label: "P",
        points: [
          [0, 7 / 12],
          [1000, 5 / 12],
        ],
        labelAt: [790, 0.34],
        dashed: true,
        noFill: true,
      },
    ],
  },
};

function drawChart(chart: Chart): void {
  const svg = byId<HTMLElement>(chart.svgId) as unknown as SVGSVGElement;
  svg.innerHTML = "";
  const x = (k: number): number => ML + (k / X_MAX) * (W - ML - MR);
  const y = (u: number): number =>
    MT + (1 - u / chart.yMax) * (H - MT - MB);

  // axes
  svg.appendChild(
    svgEl("line", { x1: ML, y1: y(0), x2: W - MR, y2: y(0), stroke: cssVar("--line"), "stroke-width": 1 }),
  );
  svg.appendChild(
    svgEl("line", { x1: ML, y1: MT, x2: ML, y2: y(0), stroke: cssVar("--line"), "stroke-width": 1 }),
  );
  for (const k of [0, 500, 1000]) {
    const tick = svgEl("text", {
      x: x(k), y: y(0) + 16, "text-anchor": "middle", "font-size": 10.5, fill: cssVar("--soft"),
    });
    tick.textContent = k === 0 ? "$0" : k === 1000 ? "$1m" : `$${k}k`;
    svg.appendChild(tick);
    svg.appendChild(svgEl("line", { x1: x(k), y1: y(0), x2: x(k), y2: y(0) + 4, stroke: cssVar("--line") }));
  }
  for (const u of chart.yTicks) {
    const tick = svgEl("text", {
      x: ML - 6, y: y(u) + 3.5, "text-anchor": "end", "font-size": 10.5, fill: cssVar("--soft"),
    });
    tick.textContent = String(u);
    svg.appendChild(tick);
    svg.appendChild(svgEl("line", { x1: ML, y1: y(u), x2: W - MR, y2: y(u), stroke: cssVar("--grid"), "stroke-width": 1 }));
  }
  const yLabel = svgEl("text", { x: 2, y: MT - 2, "text-anchor": "start", "font-size": 10.5, fill: cssVar("--soft") });
  yLabel.textContent = chart.yAxisLabel;
  svg.appendChild(yLabel);
  const xLabel = svgEl("text", { x: W - MR, y: y(0) + 30, "text-anchor": "end", "font-size": 10.5, fill: cssVar("--soft") });
  xLabel.textContent = "funding amount";
  svg.appendChild(xLabel);

  // area fills first, so every curve draws on top of them
  for (const curve of chart.curves) {
    if (curve.noFill) continue;
    const [first, ...rest] = curve.points;
    const last = curve.points[curve.points.length - 1]!;
    const d =
      `M ${x(first![0])} ${y(0)} L ${x(first![0])} ${y(first![1])} ` +
      rest.map(([k, u]) => `L ${x(k)} ${y(u)}`).join(" ") +
      ` L ${x(last[0])} ${y(0)} Z`;
    svg.appendChild(svgEl("path", { d, fill: cssVar(curve.colorVar), opacity: 0.16 }));
  }

  // curves, drawn down to the floor to show the vertical stop
  for (const curve of chart.curves) {
    const [first, ...rest] = curve.points;
    const last = curve.points[curve.points.length - 1]!;
    const d =
      `M ${x(first![0])} ${y(first![1])} ` +
      rest.map(([k, u]) => `L ${x(k)} ${y(u)}`).join(" ") +
      ` L ${x(last[0])} ${y(0)}`;
    const attrs: Record<string, string | number> = {
      d, fill: "none", stroke: cssVar(curve.colorVar), "stroke-width": 2.5,
    };
    if (curve.dashed) attrs["stroke-dasharray"] = "6 5";
    svg.appendChild(svgEl("path", attrs));

    const label = svgEl("text", {
      x: x(curve.labelAt[0]), y: y(curve.labelAt[1]),
      "font-size": 12, "font-weight": 600, fill: cssVar(curve.colorVar),
    });
    label.textContent = curve.label;
    svg.appendChild(label);
  }
}

export function initAveraging(): void {
  CHARTS.forEach(drawChart);
  drawChart(AVG_VARIANTS.actual);

  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-avg-scale]");
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      const scale = button.dataset["avgScale"] as keyof typeof AVG_VARIANTS;
      drawChart(AVG_VARIANTS[scale]);
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button)),
      );
    }),
  );
}
