import { database } from "./db";
import { forgetOldStats } from "./stats";

/** 1 時間おきの定期実行。 */
export async function runScheduled() {
  await forgetOldStats(await database());
}
