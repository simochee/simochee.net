import { database } from "./db";
import { syncSocial } from "./social/sync";
import { forgetOldStats } from "./stats";

/** 10 分おきの定期実行。 */
export async function runScheduled() {
  await forgetOldStats(await database());
  await syncSocial(import.meta.env.SITE);
}
