export const galleryPageSize = 12;

interface GalleryPost<Src> {
  id: string;
  data: { title: string; publishedAt: Date; images: { src: Src; alt: string }[] };
}

export interface Photo<Src> {
  src: Src;
  caption: string;
  postId: string;
  postTitle: string;
  publishedAt: Date;
}

/** 記事の新しい順に、記事ごとの画像を本文に出てくる順で並べる。説明のない画像は記事のタイトルを題にする。 */
export function photos<Src>(posts: GalleryPost<Src>[]): Photo<Src>[] {
  return posts
    .toSorted(
      (a, b) =>
        b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id),
    )
    .flatMap((post) =>
      post.data.images.map((image) => ({
        src: image.src,
        caption: image.alt.trim() || post.data.title,
        postId: post.id,
        postTitle: post.data.title,
        publishedAt: post.data.publishedAt,
      })),
    );
}
