import { counterDigits } from "../lib/counter";
import { onVisit } from "./visit";

/** 文中に置くアクセスカウンターの値。これまでの人数を中の `[data-slot=value]` に出し、値が届くまでは隠しておく。 */
customElements.define(
  "visit-stat",
  class extends HTMLElement {
    #stop: (() => void) | undefined;
    connectedCallback() {
      this.#stop = onVisit(({ total }) => {
        this.querySelector("[data-slot=value]")!.textContent = counterDigits(total);
        this.hidden = false;
      });
    }
    disconnectedCallback() {
      this.#stop?.();
    }
  },
);
