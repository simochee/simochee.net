import { writeFileSync } from "node:fs";
import { frontmatterJSONSchema } from "../src/content/schema.ts";
writeFileSync(
  new URL("../schema/frontmatter.schema.json", import.meta.url),
  `${JSON.stringify(frontmatterJSONSchema(), null, 2)}\n`,
);
