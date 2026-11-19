/**
 * 票数を、合計がちょうど 100 になる整数の百分率にする（最大剰余方式）。
 * 単純に四捨五入すると 33% が 3 つ並んで 99% になるように、合計がずれる。
 */
export function shares(votes: number[]): number[] {
  const total = votes.reduce((sum, count) => sum + count, 0);
  if (total === 0) return votes.map(() => 0);
  const exact = votes.map((count) => (count * 100) / total);
  const result = exact.map(Math.floor);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let left = 100 - result.reduce((sum, value) => sum + value, 0), i = 0; left > 0; left--, i++)
    result[order[i]!.index]! += 1;
  return result;
}
