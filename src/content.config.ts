import { defineCollection } from "astro:content";
import { z } from "zod";
import { frontmatterSchema } from "./content/schema";
import { postsLoader } from "./lib/posts-loader";
export const collections = {
  posts: defineCollection({
    loader: postsLoader(),
    schema: frontmatterSchema.extend({
      publishedAt: z.date(),
      updatedAt: z.date().optional(),
      thumbnail: z.string().optional(),
    }),
  }),
};
