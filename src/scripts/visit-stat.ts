import { counterDigits, nextKiriban } from "../lib/kiriban";
import { onVisit } from "./visit";

/**
 * 文中に置くアクセスカウンターの値。`data-show` が total ならこれまでの人数、next なら次のキリ番を
 * 中の `[data-slot=value]` に出す。値が届くまでは隠しておく。
 */
customElements.define(
  "visit-stat",
  class extends HTMLElement {
    #stop: (() => void) | undefined;
    connectedCallback() {
      this.#stop = onVisit(({ total }) => {
        this.querySelector("[data-slot=value]")!.textContent = counterDigits(
          this.dataset.show === "next" ? nextKiriban(total) : total,
        );
        this.hidden = false;
      });
    }
    disconnectedCallback() {
      this.#stop?.();
    }
  },
);
