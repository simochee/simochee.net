import { dayKey } from "./dates";

/** カウンターの表示桁。昔のカウンターにならって 7 桁に 0 を詰める。 */
export const counterDigits = (n: number) => String(n).padStart(7, "0");

export interface DailyVisits {
  day: string;
  count: number;
}

/** 日本時間の今日を含む 7 日。記録のない日も、古い順に並べる。 */
export function visitWeek(rows: readonly DailyVisits[], now = new Date()): DailyVisits[] {
  const counts = new Map(rows.map(({ day, count }) => [day, count]));
  return Array.from({ length: 7 }, (_, index) => {
    const day = dayKey(new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000));
    return { day, count: counts.get(day) ?? 0 };
  });
}

/** 期間内の最大を 1 にした棒の高さ。訪問がない期間は、すべて高さ 0。 */
export function visitBarRatios(days: readonly DailyVisits[]): number[] {
  const max = Math.max(0, ...days.map(({ count }) => count));
  return days.map(({ count }) => (max === 0 ? 0 : count / max));
}

export function visitDayLabel(day: string) {
  const [, month, date] = day.split("/");
  return `${Number(month)}月${Number(date)}日`;
}
