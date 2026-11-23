import { expect, test } from "vitest";
import { siteURL } from "../src/lib/preview";

test("サイトの URL は指定がなければ本番、プレビューではプレビューのドメインになる", () => {
  expect(siteURL({})).toBe("https://simochee.net");
  expect(siteURL({ SIMOCHEE_PREVIEW: "true" })).toBe("https://preview.simochee.net");
  expect(siteURL({ SIMOCHEE_SITE_URL: "https://staging.simochee.net" })).toBe(
    "https://staging.simochee.net",
  );
});
test("下書きを含むプレビューは本番の URL ではビルドできない", () => {
  expect(() =>
    siteURL({ SIMOCHEE_PREVIEW: "true", SIMOCHEE_SITE_URL: "https://simochee.net/" }),
  ).toThrow();
});
