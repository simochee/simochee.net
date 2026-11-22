import type { Counts, SidebarData } from "../lib/api";
import { call } from "./api";
import { commentsChanged } from "./events";

export interface PostCounts {
  claps: number;
  comments: number;
}

let known = new Map<string, Promise<PostCounts>>();
let waiting: {
  slug: string;
  resolve: (counts: PostCounts) => void;
  reject: (error: unknown) => void;
}[] = [];

function flush() {
  const batch = waiting;
  waiting = [];
  const slugs = [...new Set(batch.map((item) => item.slug))].join(",");
  call<Counts>(`/api/counts/?slugs=${encodeURIComponent(slugs)}`).then(
    (counts) => {
      for (const { slug, resolve } of batch)
        resolve({ claps: counts.claps[slug] ?? 0, comments: counts.comments[slug] ?? 0 });
    },
    (error: unknown) => {
      for (const { slug, reject } of batch) {
        known.delete(slug);
        reject(error);
      }
    },
  );
}

/**
 * 記事の拍手とコメントの数。同じページで続けて頼まれた記事は、まとめて 1 回で読む。
 * ページを移るか、コメントが変わるまでは読んだ数を使い回す。
 */
export function countsOf(slug: string): Promise<PostCounts> {
  let found = known.get(slug);
  if (!found) {
    found = new Promise<PostCounts>((resolve, reject) => {
      // 一覧の拍手ボタンやコメント数は、同じ描画の中で次々につながる。出そろってから 1 回だけ頼む。
      if (waiting.length === 0) setTimeout(flush);
      waiting.push({ slug, resolve, reject });
    });
    known.set(slug, found);
  }
  return found;
}
const forget = () => (known = new Map());
document.addEventListener("astro:before-swap", forget);
// コメントの数を出している要素より先に登録されるので、要素が読みなおすときには新しい数を取りにいく。
document.addEventListener(commentsChanged, forget);

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
