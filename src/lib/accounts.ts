import { SIMOCHEE_BLUESKY_HANDLE, SIMOCHEE_MASTODON_ACCOUNT } from "astro:env/server";
import { blueskyProfile, parseMastodonAccount } from "./social";

/** このブログを知らせている SNS のアカウント。Mastodon はサーバーを決めて登録するまで出さない。 */
export const accounts = {
  bluesky: { handle: SIMOCHEE_BLUESKY_HANDLE, profile: blueskyProfile(SIMOCHEE_BLUESKY_HANDLE) },
  mastodon: parseMastodonAccount(SIMOCHEE_MASTODON_ACCOUNT ?? ""),
};
