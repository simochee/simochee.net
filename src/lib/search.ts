import { pageCount, pageOf, pageRange } from "./paging";

export interface SearchEntry {
  id: string;
  title: string;
  type: string;
  publishedAt: string;
  text: string;
}

export const normalize = (text: string) => text.normalize("NFKC").toLowerCase();

export function terms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** 全角と半角、大文字と小文字をそろえたうえで、すべての語がタイトルか本文のどちらかにある記事を、新しい順に返す。 */
export function search(entries: SearchEntry[], query: string): SearchEntry[] {
  const wanted = terms(query);
  if (!wanted.length) return [];
  return entries
    .filter((entry) => {
      const haystack = normalize(`${entry.title}\n${entry.text}`);
      return wanted.every((term) => haystack.includes(term));
    })
    .sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id),
    );
}

export interface Snippet {
  before: string;
  hit: string;
  after: string;
}

/**
 * 本文の最初のヒット箇所とその前後。
 * 正規化で文字数が変わることがあるので、1 文字ずつ正規化して元の位置を引き当てる。
 */
export function snippet(text: string, wanted: string[], before = 24, after = 72): Snippet {
  const starts: number[] = [];
  let folded = "";
  let offset = 0;
  for (const char of text) {
    const piece = normalize(char);
    for (let index = 0; index < piece.length; index++) starts.push(offset);
    folded += piece;
    offset += char.length;
  }
  starts.push(offset);
  const found = wanted
    .map((term) => ({ term, at: folded.indexOf(term) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)[0];
  if (!found) return { before: "", hit: "", after: text.slice(0, before + after) };
  const from = starts[found.at]!;
  const to = starts[found.at + found.term.length]!;
  const head = Math.max(0, from - before);
  return {
    before: (head > 0 ? "…" : "") + text.slice(head, from),
    hit: text.slice(from, to),
    after: text.slice(to, to + after) + (to + after < text.length ? "…" : ""),
  };
}

/** 結果を 1 ページ分に区切る。URL の page が範囲外や不正でも、存在するページに寄せる。 */
export function resultPage(results: SearchEntry[], rawPage: string | null) {
  const last = pageCount(results.length);
  const requested = Number.parseInt(rawPage ?? "", 10);
  const page = Number.isNaN(requested) ? 1 : Math.min(Math.max(requested, 1), last);
  return { page, last, items: pageOf(results, page), ...pageRange(results.length, page) };
}
