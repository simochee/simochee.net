const feedbackFor = 2000;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 押した結果をボタンの文字で伝え、しばらくして元へ戻す。読み上げには status 領域を使う。 */
abstract class FeedbackButton extends HTMLElement {
  #timer: number | undefined;
  #label = "";
  #status = document.createElement("span");

  protected get button() {
    return this.querySelector("button")!;
  }
  protected abstract act(): Promise<string | undefined>;

  connectedCallback() {
    this.#status.role = "status";
    this.#status.className = "sr-only";
    this.append(this.#status);
    this.#label = this.button.textContent ?? "";
    this.button.addEventListener("click", this);
    this.hidden = false;
  }
  disconnectedCallback() {
    this.button.removeEventListener("click", this);
    window.clearTimeout(this.#timer);
    this.#status.remove();
  }
  async handleEvent() {
    const message = await this.act();
    if (!message) return;
    this.button.textContent = message;
    this.#status.textContent = message;
    window.clearTimeout(this.#timer);
    this.#timer = window.setTimeout(() => {
      this.button.textContent = this.#label;
      this.#status.textContent = "";
    }, feedbackFor);
  }
}

customElements.define(
  "copy-code",
  class extends FeedbackButton {
    protected async act() {
      const code = this.closest(".code-block")?.querySelector("pre")?.textContent ?? "";
      return (await copy(code)) ? "コピーしました" : "コピーできませんでした";
    }
  },
);

customElements.define(
  "share-button",
  class extends FeedbackButton {
    protected async act() {
      const url = new URL(this.dataset.url ?? "", location.href).href;
      if (navigator.share) {
        try {
          await navigator.share({ title: this.dataset.title, url });
          return undefined;
        } catch (error) {
          // 共有シートを閉じただけなら、何も起きなかったことにする。
          if (error instanceof DOMException && error.name === "AbortError") return undefined;
        }
      }
      return (await copy(url)) ? "URLをコピーしました" : "コピーできませんでした";
    }
  },
);
