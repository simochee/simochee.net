import { database } from "./db";
import { syncSocial } from "./social/sync";
import { forgetOldStats } from "./stats";

/** 10 分おきの定期実行。片方が失敗しても、もう片方は進める。 */
export async function runScheduled() {
  const results = await Promise.allSettled([
    database().then((db) => forgetOldStats(db)),
    syncSocial(import.meta.env.SITE),
  ]);
  for (const result of results) if (result.status === "rejected") console.error(result.reason);
}
