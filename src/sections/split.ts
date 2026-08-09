import { byId } from "../dom";

/** §3 — splitting a jointly endorsed $250k in proportion to budgets. */
export function initSplit(): void {
  const slider = byId<HTMLInputElement>("split-slider");

  function render(): void {
    const budgetA = Number(slider.value);
    const budgetB = 1000 - budgetA;
    const shareA = budgetA / 1000;
    const paysA = 250 * shareA;
    const paysB = 250 - paysA;

    byId("split-val").textContent = `$${budgetA}k`;
    const segmentA = byId("split-a");
    const segmentB = byId("split-b");
    segmentA.style.width = `${shareA * 100}%`;
    segmentB.style.width = `${(1 - shareA) * 100}%`;
    segmentA.textContent = `A pays $${Math.round(paysA)}k`;
    segmentB.textContent = `B pays $${Math.round(paysB)}k`;
    byId("split-note").textContent =
      `A: $${budgetA}k budget, B: $${budgetB}k budget — so A covers ` +
      `${Math.round(shareA * 100)}% of every dollar they both endorse.`;
  }

  slider.addEventListener("input", render);
  render();
}
