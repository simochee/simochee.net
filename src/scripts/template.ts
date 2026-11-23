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

/** 送ったあとのフォームを空にする。`keep` に挙げた名前の欄だけは、いまの値を残す。 */
export function clearForm(form: HTMLFormElement, keep: readonly string[]) {
  for (const field of form.querySelectorAll<HTMLInputElement>("input, textarea")) {
    if (!keep.includes(field.name)) continue;
    if (field.type === "radio" || field.type === "checkbox") field.defaultChecked = field.checked;
    else field.defaultValue = field.value;
  }
  // 欄ごとに value を空にすると、一度さわった必須の欄が :user-invalid のまま赤く残る。その印を消せるのはリセットだけ。
  form.reset();
}

/** フォームの入力を、名前ごとの文字列にまとめる。 */
export function textFields(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form))
    if (typeof value === "string") values[name] = value;
  return values;
}
