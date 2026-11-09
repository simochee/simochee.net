import { getCollection, type CollectionEntry } from "astro:content";
export type Post = CollectionEntry<"posts">;
export async function posts() {
  return (await getCollection("posts")).sort(
    (a, b) =>
      b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id),
  );
}
export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium" }).format(date);
export const year = (date: Date) =>
  new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric" }).format(date);
