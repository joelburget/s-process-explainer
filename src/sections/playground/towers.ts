import type { Snapshot } from "../../algorithm";
import { byId, cssVar, fmtK, svgEl, SVG_NS } from "../../dom";
import { EV_COLORS, EV_NAMES, PROP_NAMES, type PlaygroundState } from "./state";
import { buildTowerData } from "./towerData";

const W = 620;
const H = 300;
const ML = 58;
const MR = 12;
const MT = 26;
const MB = 26;

interface HoverableRect {
  rect: SVGRectElement;
  ev: number;
}

let hoverableRects: HoverableRect[] = [];

function setTowerHover(ev: number | null): void {
  for (const { rect, ev: rectEv } of hoverableRects) {
    rect.setAttribute("opacity", ev == null || ev === rectEv ? "0.85" : "0.15");
  }
  document
    .querySelectorAll<HTMLElement>("#pg-tower-legend .chip-item")
    .forEach((item, i) => {
      item.style.opacity = ev == null || ev === i ? "1" : "0.4";
    });
}

export function renderTowers(
  state: PlaygroundState,
  snap: Snapshot,
  proportions: readonly number[],
): void {
  const svg = byId<HTMLElement>("pg-towers") as unknown as SVGSVGElement;
  svg.innerHTML = "";
  hoverableRects = [];

  const propColors = [cssVar("--p"), cssVar("--q"), cssVar("--r"), cssVar("--ink")];
  const plotHeight = H - MT - MB;
  const towers = buildTowerData(snap.endorsements, proportions, state.nProps);
  const maxTotal = Math.max(1, ...towers.map((t) => t.total));
  const y = (v: number): number => MT + (1 - v / maxTotal) * plotHeight;

  // gridlines at quarter marks
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const v = maxTotal * f;
    svg.appendChild(svgEl("line", {
      x1: ML, y1: y(v), x2: W - MR, y2: y(v),
      stroke: cssVar("--grid"), "stroke-dasharray": "2 3",
    }));
    const label = svgEl("text", {
      x: ML - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 10.5, fill: cssVar("--soft"),
    });
    label.textContent = `$${fmtK(v)}k`;
    svg.appendChild(label);
  }
  svg.appendChild(svgEl("line", { x1: ML, y1: y(0), x2: W - MR, y2: y(0), stroke: cssVar("--line") }));

  const n = towers.length;
  const gap = 40;
  const towerWidth = Math.min(96, (W - ML - MR - (n - 1) * gap) / n);
  const contentWidth = n * towerWidth + (n - 1) * gap;
  const startX = ML + (W - ML - MR - contentWidth) / 2;

  towers.forEach((tower, towerIdx) => {
    const x0 = startX + towerIdx * (towerWidth + gap);
    for (const band of tower.bands) {
      const yTop = y(band.top);
      const bandHeight = y(band.bottom) - yTop;
      if (bandHeight <= 0) continue;
      let xOffset = 0;
      for (const segment of band.segments) {
        const segWidth = towerWidth * segment.frac;
        const rect = svgEl("rect", {
          x: x0 + xOffset,
          y: yTop,
          width: Math.max(segWidth, 0.5),
          height: Math.max(bandHeight, 0.5),
          fill: EV_COLORS[segment.ev]!,
          opacity: 0.85,
          stroke: "rgba(0,0,0,0.12)",
          "stroke-width": 0.5,
        });
        const title = document.createElementNS(SVG_NS, "title");
        title.textContent =
          `${EV_NAMES[segment.ev]} pays $${fmtK(segment.frac * (band.top - band.bottom))}k ` +
          `of the $${fmtK(band.bottom)}k–$${fmtK(band.top)}k band`;
        rect.appendChild(title);
        rect.addEventListener("mouseenter", () => setTowerHover(segment.ev));
        rect.addEventListener("mouseleave", () => setTowerHover(null));
        svg.appendChild(rect);
        hoverableRects.push({ rect, ev: segment.ev });
        xOffset += segWidth;
      }
    }

    const totalLabel = svgEl("text", {
      x: x0 + towerWidth / 2, y: y(tower.total) - 7,
      "text-anchor": "middle", "font-size": 10.5, fill: cssVar("--soft"),
    });
    totalLabel.textContent = `$${fmtK(tower.total)}k`;
    svg.appendChild(totalLabel);

    const nameLabel = svgEl("text", {
      x: x0 + towerWidth / 2, y: H - 8,
      "text-anchor": "middle", "font-size": 12, "font-weight": 600,
      fill: propColors[tower.prop]!,
    });
    nameLabel.textContent = PROP_NAMES[tower.prop]!;
    svg.appendChild(nameLabel);
  });

  // legend
  const legend = byId("pg-tower-legend");
  legend.innerHTML = "";
  state.evaluators.forEach((_, ei) => {
    const item = document.createElement("div");
    item.className = "chip-item";
    const swatch = document.createElement("span");
    swatch.className = "sw";
    swatch.style.backgroundColor = EV_COLORS[ei]!;
    item.append(swatch, EV_NAMES[ei]!);
    item.addEventListener("mouseenter", () => setTowerHover(ei));
    item.addEventListener("mouseleave", () => setTowerHover(null));
    legend.appendChild(item);
  });
}
