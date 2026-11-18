import { formatDay } from "./dates";

export interface Dated {
  data: { publishedAt: Date };
}
export interface Month<T> {
  year: string;
  month: string;
  label: string;
  path: string;
  posts: T[];
}
const yearMonth = (date: Date) => formatDay(date).slice(0, 7).split("/") as [string, string];

export function groupByMonth<T extends Dated>(posts: T[]): Month<T>[] {
  const months = new Map<string, Month<T>>();
  for (const post of posts) {
    const [year, month] = yearMonth(post.data.publishedAt);
    const key = `${year}/${month}`;
    if (!months.has(key))
      months.set(key, {
        year,
        month,
        label: `${year}年${month}月`,
        path: `/archive/${year}/${month}/`,
        posts: [],
      });
    months.get(key)!.posts.push(post);
  }
  return [...months.values()].sort((a, b) => b.path.localeCompare(a.path));
}

export interface Day<T> {
  day: number;
  weekday: number;
  posts: T[];
}
export function calendarWeeks<T extends Dated>(month: Month<T>): (Day<T> | undefined)[][] {
  const year = Number(month.year);
  const index = Number(month.month) - 1;
  const first = new Date(Date.UTC(year, index, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const cells: (Day<T> | undefined)[] = Array.from({ length: first }, () => undefined);
  for (let day = 1; day <= length; day++)
    cells.push({
      day,
      weekday: (first + day - 1) % 7,
      posts: month.posts.filter(
        (post) => Number(formatDay(post.data.publishedAt).slice(8, 10)) === day,
      ),
    });
  while (cells.length % 7) cells.push(undefined);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
