/** キリ番（ゾロ目・連番・きりのいい数）か。決まりは記事「このブログで使える書き方まとめ」の例と同じ。 */
export function isKiriban(n: number) {
  const digits = String(n);
  if (/^(\d)\1+$/.test(digits)) return true;
  if ("0123456789".includes(digits)) return true;
  return n % 10000 === 0;
}

export function nextKiriban(after: number) {
  let n = after + 1;
  while (!isKiriban(n)) n++;
  return n;
}

/** カウンターの表示桁。昔のカウンターにならって 7 桁に 0 を詰める。 */
export const counterDigits = (n: number) => String(n).padStart(7, "0");
