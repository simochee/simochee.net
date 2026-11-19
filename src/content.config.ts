import { defineCollection } from "astro:content";
import { z } from "zod";
import { frontmatterSchema } from "./content/schema";
import { glob } from "astro/loaders";
import { threadSchema } from "./content/comment-schema";
import { postsLoader } from "./lib/posts-loader";
export const collections = {
  comments: defineCollection({
    loader: glob({ pattern: "*.yaml", base: "./content/comments" }),
    schema: threadSchema,
  }),
  posts: defineCollection({
    loader: postsLoader(),
    schema: ({ image }) =>
      frontmatterSchema.extend({
        publishedAt: z.date(),
        updatedAt: z.date().optional(),
        thumbnail: image().optional(),
        images: z.array(z.object({ src: image(), alt: z.string() })).default([]),
        thumbnailPath: z.string().optional(),
      }),
  }),
};
