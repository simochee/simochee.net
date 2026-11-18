import { json, type Handler } from "../api";

/** Worker が動いていて、/api/ がファイルではなく Worker に届いていることを確かめるための口。 */
export const health: Handler = () => json({ ok: true });
