import { resolve } from "node:path";
import type { Plugin } from "vite-plus";
import { readSiteContent } from "./site-content";

const moduleId = "virtual:site-content";
const resolvedId = `\0${moduleId}`;

export function siteContentPlugin(postsDir: string): Plugin {
  const file = resolve(postsDir, "_site.yaml");
  return {
    name: "site-content",
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      this.addWatchFile(file);
      return `export default ${JSON.stringify(await readSiteContent(file))};`;
    },
    configureServer(server) {
      server.watcher.add(file);
    },
    hotUpdate({ file: changed, server }) {
      if (resolve(changed) !== file) return;
      const module = this.environment.moduleGraph.getModuleById(resolvedId);
      if (module) this.environment.moduleGraph.invalidateModule(module);
      server.ws.send({ type: "full-reload" });
    },
  };
}
