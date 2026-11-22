/** `<template>` を複製し、`data-slot` の名前で中の要素を取り出せるようにする。 */
export function stamp(template: HTMLTemplateElement) {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const slot = <T extends HTMLElement = HTMLElement>(name: string) =>
    fragment.querySelector<T>(`[data-slot="${name}"]`)!;
  return { fragment, slot };
}

/** 失敗や完了を、読み上げにも伝わる形でフォームのそばに出す。 */
export function report(target: HTMLElement, message: string, tone: "ok" | "error" = "ok") {
  target.textContent = message;
  target.hidden = !message;
  target.classList.toggle("text-danger", tone === "error");
  target.classList.toggle("text-ok", tone === "ok");
}

/** フォームの入力を、名前ごとの文字列にまとめる。 */
export function textFields(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form))
    if (typeof value === "string") values[name] = value;
  return values;
}
