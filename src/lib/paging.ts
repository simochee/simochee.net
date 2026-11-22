export const pageSize = 5;
export const pageCount = (total: number, size = pageSize) => Math.max(1, Math.ceil(total / size));
export function pageOf<T>(items: T[], page: number, size = pageSize): T[] {
  return items.slice((page - 1) * size, page * size);
}
/** 一覧の 1 ページ目はその一覧の URL そのもので、2 ページ目以降だけが page/ 配下になる。 */
export const pagePath = (page: number, base = "/") => (page === 1 ? base : `${base}page/${page}/`);

/** そのページに出ている記事が、全体の何件目から何件目か。 */
export function pageRange(total: number, page: number, size = pageSize) {
  return { from: Math.min(total, (page - 1) * size + 1), to: Math.min(total, page * size) };
}

/** ページ番号の並び。先頭・末尾・いまのページの前後だけを残し、飛ばしたところは undefined にする。 */
export function pageNumbers(current: number, last: number): (number | undefined)[] {
  const kept = [1, last, current - 1, current, current + 1].filter(
    (page) => page >= 1 && page <= last,
  );
  const sorted = [...new Set(kept)].sort((a, b) => a - b);
  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1]! > 1 ? [undefined, page] : [page],
  );
}

/** 一覧のすべてのページを、Astro の rest パラメーターに渡せる形で並べる。 */
export function pageParams(total: number, size = pageSize) {
  return Array.from({ length: pageCount(total, size) }, (_, index) => ({
    page: index + 1,
    param: index === 0 ? undefined : `page/${index + 1}`,
  }));
}
