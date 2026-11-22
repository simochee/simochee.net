import { env } from "cloudflare:workers";
import { webAnalytics, type PageviewSource } from "./analytics";

/** Web Analytics を読む口。アカウント・サイト・トークンが登録されるまでは使わない。 */
export function analyticsSource(): PageviewSource | undefined {
  const {
    ANALYTICS_ACCOUNT_ID: accountId,
    ANALYTICS_SITE_TAG: siteTag,
    ANALYTICS_API_TOKEN: apiToken,
  } = env;
  return accountId && siteTag && apiToken
    ? webAnalytics({ accountId, siteTag, apiToken, host: new URL(import.meta.env.SITE).host })
    : undefined;
}
