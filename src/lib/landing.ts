export interface Landing {
  navigationType: "push" | "replace" | "traverse";
  hash: string;
  /** 遷移を始めたときのスクロール位置 */
  scrolledFrom: number;
  /** 新しいページで本文が始まる位置 */
  contentTop: number;
}

/**
 * ページを移ったあとのスクロール位置。`undefined` はルーターとブラウザに任せる。
 *
 * - 戻る・進むは、そのページを離れたときの位置へ戻す（ルーターが覚えている）。
 * - `#` 付きの URL は、その要素へ移る（ブラウザが動かす）。
 * - それ以外は本文の先頭を見せる。ただし本文より上を見ていたなら動かさない。
 */
export function landingTop({
  navigationType,
  hash,
  scrolledFrom,
  contentTop,
}: Landing): number | undefined {
  if (navigationType === "traverse" || hash) return undefined;
  return Math.min(scrolledFrom, contentTop);
}
