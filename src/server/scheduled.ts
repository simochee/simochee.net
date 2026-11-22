import { importAnalytics } from "./analytics";
import { analyticsSource } from "./analytics-source";
import { database } from "./db";

/** 1 時間おきの定期実行。Web Analytics の集計が間引かれる前に、記事ごとの閲覧数と訪問数を D1 へ取り込む。 */
export async function runScheduled() {
  const source = analyticsSource();
  if (source) await importAnalytics(await database(), source);
}
