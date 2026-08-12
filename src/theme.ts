import { byId } from "./dom";

const STORAGE_KEY = "theme";

/**
 * The <head> bootstrap script sets data-theme before first paint; this
 * module owns the toggle button and subsequent changes. `onChange` must
 * re-draw the SVG charts, which bake in resolved colors when drawn.
 */
export function initTheme(onChange: () => void): void {
  const root = document.documentElement;
  const button = byId<HTMLButtonElement>("theme-toggle");
  const media = matchMedia("(prefers-color-scheme: dark)");
  const isDark = (): boolean => root.dataset["theme"] === "dark";

  const setButton = (): void => {
    button.textContent = isDark() ? "☀" : "☾";
    button.setAttribute(
      "aria-label",
      isDark() ? "Switch to light mode" : "Switch to dark mode",
    );
  };

  const apply = (dark: boolean): void => {
    root.dataset["theme"] = dark ? "dark" : "light";
    setButton();
    onChange();
  };

  setButton();
  button.addEventListener("click", () => {
    apply(!isDark());
    localStorage.setItem(STORAGE_KEY, isDark() ? "dark" : "light");
  });
  // Track system changes unless the user has made an explicit choice.
  media.addEventListener("change", (event) => {
    if (localStorage.getItem(STORAGE_KEY) == null) apply(event.matches);
  });
}
