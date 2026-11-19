import { counts } from "./shared-data";

/** `data-slug` の記事に付いた公開コメントの数を、自分の文字として出す。 */
customElements.define(
  "comment-count",
  class extends HTMLElement {
    connectedCallback() {
      counts.get().then(
        (loaded) => (this.textContent = String(loaded.comments[this.dataset.slug ?? ""] ?? 0)),
        () => {},
      );
    }
  },
);
