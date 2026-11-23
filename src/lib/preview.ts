const productionURL = "https://simochee.net";
const previewURL = "https://preview.simochee.net";

export const isPreview = (env: NodeJS.ProcessEnv = process.env) => env.SIMOCHEE_PREVIEW === "true";

export function siteURL(env: NodeJS.ProcessEnv = process.env) {
  if (!isPreview(env)) return env.SIMOCHEE_SITE_URL || productionURL;
  const url = env.SIMOCHEE_SITE_URL || previewURL;
  if (new URL(url).origin === productionURL)
    throw new Error("下書きを含むプレビューは本番の URL ではビルドできません。");
  return url;
}
