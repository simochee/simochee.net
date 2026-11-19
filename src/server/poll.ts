import type { D1Database } from "@cloudflare/workers-types/index.ts";

export interface PollResult {
  /** 選択肢ごとの票数。並びは選択肢と同じ。 */
  votes: number[];
  total: number;
  /** この訪問者が選んだ選択肢。まだ投票していなければ null。 */
  choice: number | null;
}

export async function pollResult(
  db: D1Database,
  poll: string,
  options: number,
  visitor: string,
): Promise<PollResult> {
  const [counts, mine] = await db.batch([
    db
      .prepare("SELECT choice, COUNT(*) AS votes FROM poll_votes WHERE poll = ? GROUP BY choice")
      .bind(poll),
    db.prepare("SELECT choice FROM poll_votes WHERE poll = ? AND visitor = ?").bind(poll, visitor),
  ]);
  const votes = Array.from({ length: options }, () => 0);
  for (const row of counts!.results as { choice: number; votes: number }[])
    if (row.choice < options) votes[row.choice] = row.votes;
  return {
    votes,
    total: votes.reduce((sum, count) => sum + count, 0),
    choice: (mine!.results[0] as { choice: number } | undefined)?.choice ?? null,
  };
}

/** 1 人 1 票。投票しなおしても最初の票のまま。 */
export async function vote(
  db: D1Database,
  poll: string,
  visitor: string,
  choice: number,
  now = new Date(),
) {
  await db
    .prepare(
      "INSERT INTO poll_votes (poll, visitor, choice, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
    )
    .bind(poll, visitor, choice, now.toISOString())
    .run();
}
