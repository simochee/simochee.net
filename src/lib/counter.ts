const dayMs = 24 * 60 * 60 * 1000;
const tokyoOffsetMs = 9 * 60 * 60 * 1000;

export const weekLength = 7;
/**
 * Web Analytics から一度にさかのぼる日数。保存期間は 31 日より長いと書かれた資料もあるが、
 * 2026 年 10 月の Cloudflare の告知が全プランに保証しているのは 31 日だけなので、その内側に収める。
 */
export const lookbackDays = 30;

export interface DailyVisits {
  /** 日本時間の日付（YYYY-MM-DD）。 */
  day: string;
  visits: number;
}
export interface CounterStats {
  total: number;
  /** 今日で終わる 7 日間。古い順。 */
  week: DailyVisits[];
}
export interface HourlyVisits {
  /** UTC の ISO 8601 で表した 1 時間の始まり。 */
  hour: string;
  visits: number;
}

/** 日本時間で何日かを YYYY-MM-DD で返す。 */
export function tokyoDay(date: Date) {
  return new Date(date.getTime() + tokyoOffsetMs).toISOString().slice(0, 10);
}

/** 日本時間のその日の 0 時。 */
export function tokyoMidnight(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - tokyoOffsetMs);
}

export function addDays(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
}

/** その日で終わる 7 日間の日付。古い順。 */
export function weekEndingOn(day: string) {
  return Array.from({ length: weekLength }, (_, index) => addDays(day, index - weekLength + 1));
}

/**
 * Web Analytics に問い合わせる最初の日。
 * 昨日の分はまだ集計が届ききっていないことがあるので、保存は一昨日まで。昨日と今日は毎回問い合わせる。
 */
export function firstUnsettledDay(today: string, lastSettledDay: string | undefined) {
  const yesterday = addDays(today, -1);
  const oldest = addDays(today, -lookbackDays);
  if (!lastSettledDay) return oldest;
  const next = addDays(lastSettledDay, 1);
  if (next < oldest) return oldest;
  return next < yesterday ? next : yesterday;
}

/** 保存してよい日（昨日より前）かどうか。 */
export function isSettled(day: string, today: string) {
  return day < addDays(today, -1);
}

/** 1 時間ごとの訪問数を、日本時間の日ごとにまとめる。古い順。 */
export function visitsByTokyoDay(hours: HourlyVisits[]): DailyVisits[] {
  const visits = new Map<string, number>();
  for (const { hour, visits: count } of hours) {
    const day = tokyoDay(new Date(hour));
    visits.set(day, (visits.get(day) ?? 0) + count);
  }
  return [...visits]
    .map(([day, count]) => ({ day, visits: count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** 記録のない日を 0 回として、7 日間を欠けなく並べる。 */
export function fillWeek(days: string[], rows: DailyVisits[]): DailyVisits[] {
  const visits = new Map(rows.map((row) => [row.day, row.visits]));
  return days.map((day) => ({ day, visits: visits.get(day) ?? 0 }));
}
