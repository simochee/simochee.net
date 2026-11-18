const tokyo = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", ...options });
const dayParts = tokyo({ year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });

function parts(date: Date) {
  const found = Object.fromEntries(
    dayParts.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return { year: found.year!, month: found.month!, day: found.day!, weekday: found.weekday! };
}
export function formatDay(date: Date) {
  const { year, month, day, weekday } = parts(date);
  return `${year}/${month}/${day} (${weekday})`;
}
export function formatMonthDay(date: Date) {
  const { month, day } = parts(date);
  return `${month}/${day}`;
}
