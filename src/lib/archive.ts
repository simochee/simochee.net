import { dayKey, formatDay } from "./dates";

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

export interface CalendarPost {
  id: string;
  title: string;
  publishedAt: string;
}

export interface Day<T> {
  date: string;
  day: number;
  weekday: number;
  posts: T[];
}
export type YearMonth = Pick<Month<unknown>, "year" | "month">;
export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1 + delta, 1));
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
  };
}

export function calendarWeeks<T extends Dated>(
  month: YearMonth & Pick<Month<T>, "posts">,
): (Day<T> | undefined)[][] {
  const year = Number(month.year);
  const index = Number(month.month) - 1;
  const first = new Date(Date.UTC(year, index, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const cells: (Day<T> | undefined)[] = Array.from({ length: first }, () => undefined);
  for (let day = 1; day <= length; day++) {
    const date = `${month.year}/${month.month}/${String(day).padStart(2, "0")}`;
    cells.push({
      date,
      day,
      weekday: (first + day - 1) % 7,
      posts: month.posts.filter((post) => dayKey(post.data.publishedAt) === date),
    });
  }
  while (cells.length % 7) cells.push(undefined);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
