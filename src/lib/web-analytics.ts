import type { HourlyVisits } from "./counter";

const endpoint = "https://api.cloudflare.com/client/v4/graphql";

// 日ごとの dimension（date）は UTC で区切られる。日本時間の日付で数えるため、1 時間ごとに受け取ってまとめ直す。
const query = `
query Visits($accountTag: string!, $siteTag: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      rumPageloadEventsAdaptiveGroups(
        limit: 5000
        filter: { siteTag: $siteTag, datetime_geq: $since, datetime_lt: $until }
        orderBy: [datetimeHour_ASC]
      ) {
        sum { visits }
        dimensions { datetimeHour }
      }
    }
  }
}`;

export interface WebAnalyticsSite {
  accountId: string;
  siteTag: string;
  apiToken: string;
}

interface VisitsResponse {
  data?: {
    viewer?: {
      accounts?: {
        rumPageloadEventsAdaptiveGroups?: {
          sum: { visits: number };
          dimensions: { datetimeHour: string };
        }[];
      }[];
    };
  } | null;
  errors?: { message: string }[] | null;
}

/** Web Analytics の訪問数（外から来てページを開いた回数）を 1 時間ごとに読む。 */
export async function fetchHourlyVisits(
  site: WebAnalyticsSite,
  since: Date,
  until: Date,
): Promise<HourlyVisits[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${site.apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: site.accountId,
        siteTag: site.siteTag,
        since: since.toISOString(),
        until: until.toISOString(),
      },
    }),
  });
  if (!response.ok)
    throw new Error(`Web Analytics の問い合わせに失敗しました（HTTP ${response.status}）`);
  const body = (await response.json()) as VisitsResponse;
  if (body.errors?.length) {
    throw new Error(
      `Web Analytics の問い合わせに失敗しました：${body.errors.map((error) => error.message).join(" / ")}`,
    );
  }
  const groups = body.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
  if (!groups) throw new Error("Web Analytics の応答にアカウントの集計がありません");
  return groups.map((group) => ({ hour: group.dimensions.datetimeHour, visits: group.sum.visits }));
}
