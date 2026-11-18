import { expect, test } from "vitest";
import type { Env } from "../worker/src/api";
import worker from "../worker/src/index";

const env: Env = { ASSETS: { fetch: async () => new Response("静的なページ", { status: 404 }) } };
const call = (path: string, method = "GET") =>
  worker.fetch(new Request(`https://simochee.net${path}`, { method }), env);

test("/api/ のリクエストは Worker が JSON で答える", async () => {
  const response = await call("/api/health");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
test("API の答えはキャッシュさせない", async () => {
  expect((await call("/api/health")).headers.get("Cache-Control")).toBe("no-store");
});
test("知らない API は、静的な 404 ページではなく JSON の 404 になる", async () => {
  const response = await call("/api/no-such-thing");
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});
test("対応していないメソッドには、使えるメソッドを添えて 405 を返す", async () => {
  const response = await call("/api/health", "POST");
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("GET");
});
test("/api/ 以外でファイルに一致しなかったリクエストは、静的配信へ戻す", async () => {
  const response = await call("/no-such-page/");
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("静的なページ");
});
