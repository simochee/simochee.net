import { expect, test } from "vitest";
import { tagPath, tagSlug } from "../src/lib/tags";
test("日本語タグを保持し URL の区切り文字を単一セグメントに収める", () => {
  expect(tagSlug("日本語")).toBe("日本語");
  expect(tagPath("CI/CD")).toBe("/tags/CI~2fCD/");
  expect(tagSlug("CI~2fCD")).not.toBe(tagSlug("CI/CD"));
  expect(tagSlug("..")).toBe("~2e~2e");
  expect(tagSlug("a?b#c%d\\e")).toBe("a~3fb~23c~25d~5ce");
});
