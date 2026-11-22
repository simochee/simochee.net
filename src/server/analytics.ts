import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { dayKey } from "../lib/dates";

export interface PathViews {
  path: string;
  /** その期間にそのページが開かれた回数。 */
  views: number;
  /** そのうち、ほかのサイトから来て最初に開いたページだった回数。 */
  visits: number;
}

/** 期間 [start, end) のページごとの閲覧数を読む口。本番は Web Analytics、テストでは差し替える。 */
export type PageviewSource = (start: Date, end: Date) => Promise<PathViews[]>;

export interface AnalyticsCredentials {
  accountId: string;
  siteTag: string;
  apiToken: string;
  host: string;
}

// ゾーンで計測スクリプトを自動で入れているサイトタグは、同じドメインのサブドメイン（ステージングなど）もまとめて数える。
// サイトタグだけで絞ると、ほかのホストの /posts/ の閲覧が人気記事とカウンターに混ざるので、ホスト名でも絞る。
const query = `query ($account: string!, $site: string!, $host: string!, $start: Time!, $end: Time!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      rumPageloadEventsAdaptiveGroups(
        limit: 1000
        filter: { siteTag: $site, requestHost: $host, datetime_geq: $start, datetime_lt: $end }
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
    }
  }
}`;

interface Response {
  data?: {
    viewer: {
      accounts: {
        rumPageloadEventsAdaptiveGroups: {
          count: number;
          sum: { visits: number };
          dimensions: { requestPath: string };
        }[];
      }[];
    };
  } | null;
  errors?: { message: string }[] | null;
}

/** Cloudflare Web Analytics の集計を GraphQL Analytics API から読む。 */
export function webAnalytics({
  accountId,
  siteTag,
  apiToken,
  host,
}: AnalyticsCredentials): PageviewSource {
  return async (start, end) => {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          account: accountId,
          site: siteTag,
          host,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }),
    });
    const body = (await response.json()) as Response;
    if (!response.ok || body.errors?.length)
      throw new Error(
        `Web Analytics: ${response.status} ${body.errors?.map((error) => error.message).join(" / ") ?? ""}`,
      );
    return (body.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? []).map((group) => ({
      path: group.dimensions.requestPath,
      views: group.count,
      visits: group.sum.visits,
    }));
  };
}

/** 記事のページの URL なら、その記事の slug。 */
export function slugOfPath(path: string) {
  return /^\/posts\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(path)?.[1];
}

const hour = 60 * 60 * 1000;
/** Web Analytics に届いた閲覧が集計に入りきるまで待つ時間。 */
export const settleMilliseconds = 15 * 60 * 1000;
/** 1 回の取り込みで進める時間数の上限。止まっていたあとでも、1 回の実行が長くならないようにする。 */
export const maxHoursPerRun = 24;

/**
 * 取り込む 1 時間ごとの区切り。前回取り込んだところ（until）から、集計が落ち着いた時刻までを並べる。
 * 初めて動かすときは、直前の 1 時間だけを取り込む。
 */
export function windowsToImport(until: number | null, now: number) {
  const settled = Math.floor((now - settleMilliseconds) / hour) * hour;
  const windows: { start: number; end: number }[] = [];
  for (
    let start = until ?? settled - hour;
    start + hour <= settled && windows.length < maxHoursPerRun;
    start += hour
  )
    windows.push({ start, end: start + hour });
  return windows;
}

/**
 * Web Analytics の集計を D1 へ取り込んで残す。Web Analytics は古い集計を間引いて消していくので、
 * 人気記事に使う記事ごとの閲覧数と、アクセスカウンターの訪問数の累計は、こちらで持ちつづける。
 * 1 時間ぶんの足し込みと「どこまで取り込んだか」を同じ batch で書くので、途中で失敗しても二重には数えない。
 */
export async function importAnalytics(db: D1Database, source: PageviewSource, now = Date.now()) {
  const until = await db
    .prepare("SELECT value FROM counters WHERE name = 'analytics_until'")
    .first<number>("value");
  for (const { start, end } of windowsToImport(until, now)) {
    const rows = await source(new Date(start), new Date(end));
    const views = new Map<string, number>();
    let visits = 0;
    for (const row of rows) {
      visits += row.visits;
      const slug = slugOfPath(row.path);
      if (slug) views.set(slug, (views.get(slug) ?? 0) + row.views);
    }
    const day = dayKey(new Date(start));
    await db.batch([
      ...[...views].map(([slug, count]) =>
        db
          .prepare(
            `INSERT INTO page_views (slug, day, count) VALUES (?, ?, ?)
             ON CONFLICT (slug, day) DO UPDATE SET count = count + excluded.count`,
          )
          .bind(slug, day, count),
      ),
      db
        .prepare(
          `INSERT INTO counters (name, value) VALUES ('visitors', ?)
           ON CONFLICT (name) DO UPDATE SET value = value + excluded.value`,
        )
        .bind(visits),
      db
        .prepare(
          `INSERT INTO counters (name, value) VALUES ('analytics_until', ?)
           ON CONFLICT (name) DO UPDATE SET value = excluded.value`,
        )
        .bind(end),
    ]);
  }
}

/** いま見ている人のおおよその数。訪問者ごとの記録は持たないので、直近の訪問数で代える。 */
export const viewersWindowMilliseconds = 10 * 60 * 1000;
export async function recentVisits(source: PageviewSource, now = Date.now()) {
  const rows = await source(new Date(now - viewersWindowMilliseconds), new Date(now));
  return rows.reduce((sum, row) => sum + row.visits, 0);
}
