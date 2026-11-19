import { site } from "../site";

const small = "ぁぃぅぇぉっゃゅょゎ";
const large = "あいうえおつやゆよわ";

/**
 * 見た目が同じか、ほとんど同じに読める名前を同じ文字列にそろえる。
 * 全角と半角、大文字と小文字、カタカナとひらがな、小さい仮名、空白や見えない文字の違いをなくす。
 */
export function nameKey(name: string) {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{Cf}]/gu, "")
    .replace(/./gsu, (character) => {
      const code = character.codePointAt(0)!;
      const hiragana =
        code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : character;
      const index = small.indexOf(hiragana);
      return index < 0 ? hiragana : large[index]!;
    });
}

/** 管理人だけが名乗れる名前。 */
const authorNames = [site.author.name, "simochee"].map(nameKey);
export const isAuthorName = (name: string) => authorNames.includes(nameKey(name));
