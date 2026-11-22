import { TURNSTILE_SITE_KEY } from "astro:env/client";

interface Turnstile {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widget: string): void;
  remove(widget: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let script: Promise<Turnstile> | undefined;
// 読み込んだときに自動で描く方式は、ページ遷移で差し替わったフォームを見つけられない。要素ごとに明示して描く。
function load() {
  script ??= new Promise<Turnstile>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    element.async = true;
    element.addEventListener("load", () => resolve(window.turnstile!));
    element.addEventListener("error", () => {
      script = undefined;
      reject(new Error("Turnstile を読み込めませんでした"));
    });
    document.head.append(element);
  });
  return script;
}

/** フォームの中に置くと、送信時に `turnstile` という名前で確認の結果が入る。 */
export class TurnstileField extends HTMLElement {
  #widget: string | undefined;

  connectedCallback() {
    load()
      .then((turnstile) => {
        if (!this.isConnected || this.#widget) return;
        this.#widget = turnstile.render(this, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "ja",
          "response-field-name": "turnstile",
        });
      })
      .catch(() => {
        // 読み込めなくても送信はできる。通すかどうかはサーバーが決める。
      });
  }
  disconnectedCallback() {
    if (this.#widget) window.turnstile?.remove(this.#widget);
    this.#widget = undefined;
  }
  /** 確認の結果は 1 回しか使えないので、送信のたびに取りなおす。 */
  reset() {
    if (this.#widget) window.turnstile?.reset(this.#widget);
  }
}

if (!customElements.get("turnstile-field"))
  customElements.define("turnstile-field", TurnstileField);
