import type { VisitResult } from "../lib/api";
import { call } from "./api";

let latest: VisitResult | undefined;
const listeners = new Set<(visit: VisitResult) => void>();

/** アクセスカウンターと閲覧者数の値を受け取る。すでに届いていれば、すぐに 1 回呼ぶ。 */
export function onVisit(listener: (visit: VisitResult) => void) {
  listeners.add(listener);
  if (latest) listener(latest);
  return () => listeners.delete(listener);
}

/** このタブで割り当てられた訪問者番号。セッションのあいだはページを開きなおしても同じ番号を見せる。 */
const numberKey = "visitor-number";
const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(numberKey);
    } catch {
      return null;
    }
  },
  set: (value: string) => {
    try {
      sessionStorage.setItem(numberKey, value);
    } catch {
      // 覚えておけない環境では、ページを開くたびに新しい訪問者として数える。
    }
  },
};

async function send(body: { slug?: string; first?: boolean }) {
  try {
    const visit = await call<VisitResult>("/api/visit/", { body });
    if (visit.number !== null) storage.set(String(visit.number));
    latest = { ...visit, number: visit.number ?? (Number(storage.get()) || null) };
    for (const listener of listeners) listener(latest);
  } catch {
    // 数えられなかったときは、カウンターを出さないままにする。
  }
}

document.addEventListener("astro:page-load", () => {
  const first = storage.get() === null;
  // 返事を待つあいだに次のページへ移っても、二重に数えないよう先に印を付ける。
  if (first) storage.set("");
  void send({ slug: /^\/posts\/([^/]+)\/$/.exec(location.pathname)?.[1], first });
});

const heartbeat = 60 * 1000;
setInterval(() => {
  if (document.visibilityState === "visible") void send({});
}, heartbeat);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void send({});
});
