export const categories = { tech: "技術", personal: "日々" } as const;
export type Category = keyof typeof categories;
