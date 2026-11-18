import { getCollection, type CollectionEntry } from "astro:content";
export type Post = CollectionEntry<"posts">;
export async function posts() {
  return (await getCollection("posts")).sort(
    (a, b) =>
      b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id),
  );
}
