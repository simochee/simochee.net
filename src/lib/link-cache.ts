import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { linksSchema, type Links } from "../content/links-schema.ts";

export async function readLinks(directory: string): Promise<Links> {
  try {
    return linksSchema.parse(JSON.parse(await readFile(resolve(directory, "links.json"), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, entries: {} };
    throw new Error(`links.json を読めません: ${directory}`, { cause: error });
  }
}
