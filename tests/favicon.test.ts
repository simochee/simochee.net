import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { faviconPixels, faviconSvg } from "../src/lib/favicon";
import { defaultTheme, themes } from "../src/lib/themes";

const css = readFileSync("src/styles/global.css", "utf8");

function token(selector: string, name: string) {
  const block = css.slice(css.indexOf(selector));
  return new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`).exec(block)?.[1];
}

const colorsOf = (svg: string) =>
  new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((match) => match[1]));

test.each(themes)("$id のファビコンはそのテーマの縁・帯・文字の行の色を使う", (theme) => {
  const colors = colorsOf(faviconSvg(theme));
  expect(colors).toContain(theme.inkStrong);
  expect(colors).toContain(theme.accent);
  expect(colors).toContain(theme.control);
});

test("ページの白としおりの黄はどのテーマでも同じ", () => {
  for (const theme of themes) {
    const colors = colorsOf(faviconSvg(theme));
    expect(colors).toContain("#ffffff");
    expect(colors).toContain("#fff0a8");
  }
});

test("テーマを指定しないファビコンは既定の赤", () => {
  expect(defaultTheme.id).toBe("aka");
  expect(faviconSvg()).toBe(faviconSvg(defaultTheme));
  expect(colorsOf(faviconSvg())).toEqual(
    new Set(["#6a1f1f", "#b33a3a", "#a57d79", "#ffffff", "#fff0a8"]),
  );
});

test("ドットは 16×16 の範囲に収まり、同じ座標に重ならない", () => {
  const pixels = faviconPixels();
  expect(pixels.every(({ x, y }) => x >= 0 && x < 16 && y >= 0 && y < 16)).toBe(true);
  expect(new Set(pixels.map(({ x, y }) => `${x},${y}`)).size).toBe(pixels.length);
});

test.each(themes)("$id のファビコンの色は global.css のトークンと一致する", (theme) => {
  const selector = theme.id === defaultTheme.id ? "@theme {" : `:root[data-theme="${theme.id}"]`;
  expect({
    accent: token(selector, "accent"),
    control: token(selector, "control"),
    inkStrong: token(selector, "ink-strong"),
  }).toEqual({ accent: theme.accent, control: theme.control, inkStrong: theme.inkStrong });
});
