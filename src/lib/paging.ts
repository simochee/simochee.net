export const pageSize = 5;
export const pageCount = (total: number) => Math.max(1, Math.ceil(total / pageSize));
export function pageOf<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
export const pagePath = (page: number) => (page === 1 ? "/" : `/page/${page}/`);
