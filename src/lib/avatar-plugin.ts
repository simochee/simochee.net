import { resolve } from "node:path";
import type { Plugin } from "vite-plus";
import { findAvatar, isAvatarFile } from "./avatar";

const moduleId = "virtual:avatar";
const resolvedId = `\0${moduleId}`;

export function avatarPlugin(postsDir: string): Plugin {
  const dir = resolve(postsDir);
  return {
    name: "avatar",
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      const file = await findAvatar(dir);
      if (!file) return "export default undefined;";
      this.addWatchFile(file);
      // 再読み込みで差し替わったファイルを Astro の画像処理に拾わせるため、画像そのものを import し直す。
      return `import avatar from ${JSON.stringify(file)};\nexport default avatar;`;
    },
    configureServer(server) {
      server.watcher.add(dir);
    },
    hotUpdate({ file, server }) {
      const name = file.slice(dir.length + 1);
      if (resolve(file) !== resolve(dir, name) || !isAvatarFile(name)) return;
      const module = this.environment.moduleGraph.getModuleById(resolvedId);
      if (module) this.environment.moduleGraph.invalidateModule(module);
      server.ws.send({ type: "full-reload" });
    },
  };
}
