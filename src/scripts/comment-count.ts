import { commentsChanged } from "./events";
import { countsOf } from "./shared-data";

/** `data-slug` の記事に付いた公開コメントの数を、自分の文字として出す。コメントが変わったら出しなおす。 */
customElements.define(
  "comment-count",
  class extends HTMLElement {
    connectedCallback() {
      document.addEventListener(commentsChanged, this);
      this.handleEvent();
    }
    disconnectedCallback() {
      document.removeEventListener(commentsChanged, this);
    }
    handleEvent() {
      countsOf(this.dataset.slug ?? "").then(
        ({ comments }) => (this.textContent = String(comments)),
        () => {},
      );
    }
  },
);
