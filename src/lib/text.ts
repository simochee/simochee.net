const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

/** 見た目の 1 文字（絵文字や濁点の合成も 1 文字）で数えて、長ければ切り詰めて「…」を付ける。 */
export function truncate(text: string, length: number) {
  const characters = [...segmenter.segment(text)].map(({ segment }) => segment);
  return characters.length > length ? `${characters.slice(0, length - 1).join("")}…` : text;
}
