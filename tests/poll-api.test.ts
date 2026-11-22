import type { APIContext } from "astro";
import { expect, test, vi } from "vitest";
import { site } from "../src/site";
import { parseSiteContent } from "../src/lib/site-content";
import { readFileSync } from "node:fs";
import { migratedD1 } from "./support/d1";

vi.mock("cloudflare:workers", () => ({
  env: { ACTION_LIMIT: { limit: async () => ({ success: true }) } },
}));
vi.mock("../src/server/db", () => ({ database: vi.fn() }));

import { database } from "../src/server/db";
import { GET, POST } from "../src/pages/api/poll";

function context(body?: unknown) {
  return {
    request: new Request("https://example.test/api/poll/", {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "127.0.0.1" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    cookies: { get: () => ({ value: "12345678-1234-1234-1234-123456789abc" }) },
  } as unknown as APIContext;
}

test("GET と POST は YAML の質問と選択肢から生成した id で投票を読み書きする", async () => {
  vi.mocked(database).mockResolvedValue(await migratedD1());
  const { poll } = parseSiteContent(
    readFileSync(new URL("../content/posts/_site.yaml", import.meta.url), "utf8"),
    "content/posts/_site.yaml",
  );
  expect(site.poll.id).toBe(poll.id);
  const before = await GET(context());
  expect(await before.json()).toMatchObject({ poll: poll.id, total: 0 });
  const voted = await POST(context({ poll: poll.id, choice: 1 }));
  expect(voted.status).toBe(200);
  expect(await voted.json()).toMatchObject({ poll: poll.id, total: 1, choice: 1 });
  const after = await GET(context());
  expect(await after.json()).toMatchObject({ poll: poll.id, total: 1, choice: 1 });
});

test("古い id への投票は 409 で拒否され票は増えない", async () => {
  vi.mocked(database).mockResolvedValue(await migratedD1());
  const rejected = await POST(context({ poll: "old-poll", choice: 0 }));
  expect(rejected.status).toBe(409);
  expect(await (await GET(context())).json()).toMatchObject({ poll: site.poll.id, total: 0 });
});
