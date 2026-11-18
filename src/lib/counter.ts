const dayMs = 24 * 60 * 60 * 1000;
const tokyoOffsetMs = 9 * 60 * 60 * 1000;

export const weekLength = 7;

export interface DailyVisitors {
  /** 日本時間の日付（YYYY-MM-DD）。 */
  day: string;
  visitors: number;
}
export interface CounterStats {
  total: number;
  /** 今日で終わる 7 日間。古い順。 */
  week: DailyVisitors[];
}

/** 日本時間で何日かを YYYY-MM-DD で返す。 */
export function tokyoDay(date: Date) {
  return new Date(date.getTime() + tokyoOffsetMs).toISOString().slice(0, 10);
}

/** その日で終わる 7 日間の日付。古い順。 */
export function weekEndingOn(day: string) {
  const last = Date.parse(`${day}T00:00:00Z`);
  return Array.from({ length: weekLength }, (_, index) =>
    new Date(last - (weekLength - 1 - index) * dayMs).toISOString().slice(0, 10),
  );
}

/** 記録のない日を 0 人として、7 日間を欠けなく並べる。 */
export function fillWeek(days: string[], rows: DailyVisitors[]): DailyVisitors[] {
  const visitors = new Map(rows.map((row) => [row.day, row.visitors]));
  return days.map((day) => ({ day, visitors: visitors.get(day) ?? 0 }));
}
