import { handleApi, type Env } from "./api";

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApi(request, env);
    // ここへ来るのはファイルに一致しなかったリクエストだけ。静的配信へ戻すと 404 ページが返る。
    return env.ASSETS.fetch(request);
  },
};
