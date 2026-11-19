import type { Counts, SidebarData } from "../lib/api";
import { call, perPage } from "./api";
import { commentsChanged } from "./events";

/** 記事ごとの拍手とコメントの数。一覧の記事ぶんをまとめて 1 回で読む。 */
export const counts = perPage(() => call<Counts>("/api/counts/"));
// コメントの数を出している要素より先に登録されるので、要素が読みなおすときには新しい数を取りにいく。
document.addEventListener(commentsChanged, () => counts.refresh());

let latest: SidebarData | undefined;
let loading: Promise<void> | undefined;
const listeners = new Set<(data: SidebarData) => void>();

function load() {
  return call<SidebarData>("/api/sidebar/").then(
    (data) => {
      latest = data;
      for (const listener of listeners) listener(data);
    },
    () => {
      loading = undefined;
    },
  );
}

/**
 * サイドバーの区画の中身を受け取る。届いていれば、すぐに 1 回呼ぶ。
 * サイドバーはページ遷移をまたいで残るので、読むのは最初の 1 回と書き込みのあとだけ。
 */
export function onSidebar(listener: (data: SidebarData) => void) {
  listeners.add(listener);
  if (latest) listener(latest);
  loading ??= load();
  return () => listeners.delete(listener);
}

/** コメントや掲示板に書き込んだあと、最新コメントなどを新しくする。 */
export function refreshSidebar() {
  loading = load();
}
