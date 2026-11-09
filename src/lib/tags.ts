export function tagSlug(tag: string) {
  const escaped = tag.replace(
    /[~/%?#\\]/g,
    (character) => `~${character.codePointAt(0)!.toString(16)}`,
  );
  return /^\.{1,2}$/.test(escaped) ? escaped.replaceAll(".", "~2e") : escaped;
}
export const tagPath = (tag: string) => `/tags/${encodeURIComponent(tagSlug(tag))}/`;
