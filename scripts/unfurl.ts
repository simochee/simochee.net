import { resolveContentSource } from "../src/lib/content-source.ts";
import { linkURLSchema } from "../src/content/links-schema.ts";
import { unfurl } from "../src/lib/unfurl.ts";

const args = process.argv.slice(2);
if (args.length && (args[0] !== "--refresh" || args.length > 2)) {
  throw new Error("使い方: vp run unfurl [--refresh [URL]]");
}
const refresh =
  args.length === 2 ? linkURLSchema.parse(args[1]) : args.length === 1 ? true : undefined;
await unfurl(resolveContentSource(process.cwd()).postsDir, { refresh });
