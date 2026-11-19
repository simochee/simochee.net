export const services = { bsky: "Bluesky", mastodon: "Mastodon" } as const;
export type Service = keyof typeof services;

export const commentAnchor = (number: number) => `comment-${number}`;
