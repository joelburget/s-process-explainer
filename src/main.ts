import "./style.css";
import { initScenario } from "./sections/scenario";
import { initSweep } from "./sections/sweep";
import { initSplit } from "./sections/split";
import { initPlayground } from "./sections/playground";
import { initAveraging } from "./sections/averaging";
import { initTheme } from "./theme";

initScenario();
const redrawSweep = initSweep();
initSplit();
const redrawPlayground = initPlayground();
const redrawAveraging = initAveraging();

// The SVG charts resolve their colors at draw time, so a theme change
// re-draws them; everything else follows the CSS custom properties.
initTheme(() => {
  redrawSweep();
  redrawPlayground();
  redrawAveraging();
});
