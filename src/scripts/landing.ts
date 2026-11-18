import { landingTop, type Landing } from "../lib/landing";

let departure: Pick<Landing, "navigationType" | "hash" | "scrolledFrom"> | undefined;
let persistedFocus: HTMLElement | undefined;

document.addEventListener("astro:before-preparation", (event) => {
  departure = { navigationType: event.navigationType, hash: event.to.hash, scrolledFrom: scrollY };
});

document.addEventListener("astro:before-swap", () => {
  // ルーターは保持した要素（サイドバー）のフォーカスを差し替え後に focus() で戻す。
  // そのままだと押したリンクが画面に入るまでスクロールされ、着地位置が上書きされる。
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest("[data-astro-transition-persist]")) {
    persistedFocus = active;
    active.blur();
  }
});

document.addEventListener("astro:after-swap", () => {
  const main = document.getElementById("main");
  if (departure && main) {
    const contentTop =
      main.getBoundingClientRect().top +
      scrollY -
      parseFloat(getComputedStyle(main).scrollMarginTop);
    const top = landingTop({ ...departure, contentTop });
    if (top !== undefined) scrollTo({ left: 0, top, behavior: "instant" });
  }
  departure = undefined;
  persistedFocus?.focus({ preventScroll: true });
  persistedFocus = undefined;
});
