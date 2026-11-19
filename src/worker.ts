import { handle } from "@astrojs/cloudflare/handler";
import type { ExecutionContext, ScheduledController } from "@cloudflare/workers-types/index.ts";
import { runScheduled } from "./server/scheduled";

export default {
  fetch: handle,
  scheduled(_controller: ScheduledController, _env: Env, context: ExecutionContext) {
    context.waitUntil(runScheduled());
  },
};
