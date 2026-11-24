import { postPath } from "../lib/archive";
import { formatDay } from "../lib/dates";
import { pageNumbers } from "../lib/paging";
import { resultPage, search, snippet, terms, type SearchEntry } from "../lib/search";
import { categories, type Category } from "../categories";

let entries: Promise<SearchEntry[]> | undefined;
function load() {
  entries ??= fetch("/search.json").then((response) => {
    if (!response.ok) throw new Error(String(response.status));
    return response.json() as Promise<SearchEntry[]>;
  });
  entries.catch(() => (entries = undefined));
  return entries;
}

function href(query: string, page: number) {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set("page", String(page));
  return `/search/?${params}`;
}

function pageLink(query: string, page: number, text: string, rel?: string) {
  const link = document.createElement("a");
  link.href = href(query, page);
  link.textContent = text;
  if (rel) link.rel = rel;
  return link;
}

function pager(query: string, page: number, last: number) {
  const nav = document.createElement("nav");
  nav.className = "border-y border-dotted border-frame p-4 text-center";
  nav.ariaLabel = "ページ番号";
  const label = (text: string) =>
    Object.assign(document.createElement("span"), { textContent: text });
  nav.append(
    page > 1 ? pageLink(query, page - 1, "« 前のページ", "prev") : label("« 前のページ"),
    " | ",
  );
  for (const number of pageNumbers(page, last)) {
    if (number === undefined) nav.append(label("… "));
    else if (number === page)
      nav.append(Object.assign(document.createElement("b"), { textContent: String(number) }), " ");
    else {
      const link = pageLink(query, number, String(number));
      link.ariaLabel = `${number}ページ目`;
      nav.append(link, " ");
    }
  }
  nav.append(
    "| ",
    page < last ? pageLink(query, page + 1, "次のページ »", "next") : label("次のページ »"),
  );
  return nav;
}

customElements.define(
  "search-results",
  class extends HTMLElement {
    #rendered: string | undefined;

    connectedCallback() {
      document.addEventListener("astro:after-swap", this);
      this.#part("results").hidden = false;
      void this.#render();
    }
    disconnectedCallback() {
      document.removeEventListener("astro:after-swap", this);
    }
    // ClientRouter は要素を差し替えたあとで location を更新するので、そのあとにもう一度読む。
    handleEvent() {
      void this.#render();
    }

    #part(name: string) {
      return this.querySelector<HTMLElement>(`[data-${name}]`)!;
    }
    #show(heading: string, summary: string) {
      this.#part("heading").textContent = heading;
      this.#part("summary").textContent = summary;
      this.#part("results").replaceChildren();
    }

    async #render() {
      if (this.#rendered === location.search) return;
      this.#rendered = location.search;
      const params = new URLSearchParams(location.search);
      const query = (params.get("q") ?? "").trim();
      this.querySelector<HTMLInputElement>("input[name=q]")!.value = query;
      if (!terms(query).length) {
        this.#show("検索", "キーワードを入力してください。");
        return;
      }
      const heading = `「${query}」の検索結果`;
      let found: SearchEntry[];
      try {
        found = search(await load(), query);
      } catch {
        this.#show(
          heading,
          "検索データを読み込めませんでした。時間をおいてもう一度お試しください。",
        );
        return;
      }
      if (this.#rendered !== location.search) return;
      if (!found.length) {
        this.#show(heading, "一致する記事は見つかりませんでした。");
        return;
      }
      const { page, last, items, from, to } = resultPage(found, params.get("page"));
      this.#show(heading, `${found.length} 件見つかりました（${from}〜${to} 件目を表示）`);
      const template = this.querySelector<HTMLTemplateElement>("template[data-result]")!;
      const wanted = terms(query);
      const articles = items.map((entry) => {
        const article = template.content.cloneNode(true) as DocumentFragment;
        const text = (name: string) => article.querySelector<HTMLElement>(`[data-${name}]`)!;
        const post = postPath(entry.id);
        const date = new Date(entry.publishedAt);
        text("date").textContent = formatDay(date);
        text("date").setAttribute("datetime", entry.publishedAt);
        text("title").textContent = entry.title;
        text("title").setAttribute("href", post);
        const excerpt = snippet(entry.text, wanted);
        text("before").textContent = excerpt.before;
        text("after").textContent = excerpt.after;
        if (excerpt.hit) text("hit").textContent = excerpt.hit;
        else text("hit").remove();
        text("more").setAttribute("href", post);
        text("more").ariaLabel = `「${entry.title}」の続きを読む`;
        text("category").textContent = categories[entry.type as Category] ?? entry.type;
        text("category").setAttribute("href", `/${entry.type}/`);
        text("comments").setAttribute("href", `${post}#comments`);
        text("slug").dataset.slug = entry.id;
        return article;
      });
      this.#part("results").append(...articles);
      if (last > 1) this.#part("results").append(pager(query, page, last));
    }
  },
);
