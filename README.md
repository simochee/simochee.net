# simochee.net

Astro 7 で生成する日本語の個人ブログです。
このリポジトリには動作確認用のダミー記事が含まれます。

## デザイン

2008 年ごろのブログテンプレートの見た目を、いまの Web の機能で組んでいます。

- 文言と外部リンクは `src/site.ts` にまとめています。
- スタイルは Tailwind CSS です。色・書体・文字サイズのデザイントークンは `src/styles/global.css` の `@theme` にあり、1 単位は 1px です（`px-14` は 14px）。
- 文字は東雲フォント（パブリックドメイン）です。由来と分割の方法は `src/assets/fonts/README.md` にあります。
- Markdown から生成される本文にはクラスを付けられないので、その装飾だけ `src/styles/prose.css` に素の CSS で書いています。
- コンポーネントの層分けと置き場所の決めかたは `src/components/README.md` にあります。
- ページ遷移は Astro の `<ClientRouter />` による view transition です。サイドバーは遷移をまたいで保持します。
- 遷移後のスクロール位置は `src/lib/landing.ts` で決めます。戻る・進むは離れたときの位置、`#` 付きの URL はその要素、それ以外は本文の先頭です。ヘッダーが見えている位置から移ったときは動かしません。
- 記事はスクリプトが動かなくても読めます。月の満ち欠け、着せかえ、共有、コードのコピー、検索、画像一覧の切り替えと、サーバーとやりとりする部品（コメント、拍手、掲示板、アンケート、カウンター、閲覧者数、人気記事）はスクリプトを使い、動かないときは表示しません。

## 開発

Node.js 24.22 以降と [Vite+](https://viteplus.dev/)（`vp`）を使用します。
`vp install` は `package.json` の `packageManager`（pnpm）を自動で使います。

```sh
vp install --frozen-lockfile
vp run dev
vp check
vp test
vp run astro:check
vp run build
pnpm exec cf deploy --dry-run
```

`vp dev` と `vp build` は通常の Vite 用です。
Astro は必ず `vp run dev` と `vp run build` で起動してください。
Astro の Vite 設定には `vite.config.ts` を読ませず、Vite+ の lint、format、test 設定とは分離しています。
インストール時の `prepare` で `astro sync` を実行し、`vp check` に必要な型を生成します。
Astro ファイルの型検査は `astro:check` タスクが担当します。
ビルドは git の外部履歴や環境変数を参照するため、Vite+ のタスクキャッシュを無効にしています。

## 記事の配置

```text
content/posts/
  example-post/
    index.md         # または index.mdx（同時には置かない）
    thumbnail.png    # 任意
    diagram.png      # 本文から ./diagram.png で参照
    material.md      # 読み込み対象外
```

ディレクトリ名を slug として `/posts/example-post/` に公開します。
slug は `^[a-z0-9]+(?:-[a-z0-9]+)*$` に一致する必要があります。
記事の入口は直下の `index.md` または `index.mdx` だけです。
`material.md` や `draft.md` などの補助ファイルは記事として読み込みません。
Markdown と MDX は、見出しアンカー、目次、GitHub 形式のアラート、Shiki の明暗テーマと diff / highlight / word-highlight 記法に対応します。
外部リンクには `target="_blank" rel="noopener"` を付けます。

記事ディレクトリは `SIMOCHEE_CONTENT_DIR` で別の場所に変更できます（後述）。

## Frontmatter

```yaml
---
title: 記事のタイトル
status: published
type: tech
tags: [Astro, TypeScript]
---
```

| キー          | 必須   | 内容                                                         |
| ------------- | ------ | ------------------------------------------------------------ |
| `title`       | はい   | 空でない文字列                                               |
| `status`      | はい   | `draft` または `published`                                   |
| `type`        | はい   | `tech` または `personal`                                     |
| `tags`        | いいえ | 重複のない文字列配列。省略時は `[]`                          |
| `description` | いいえ | meta、OG、RSS の説明。省略時は本文のプレーンテキストから抜粋 |
| `date`        | いいえ | git から得る公開日の上書き                                   |
| `updated`     | いいえ | git から得る更新日の上書き                                   |

未知のキーはエラーです。
`date` と `updated` は `YYYY-MM-DD`（JST の午前0時）またはオフセット付き ISO 8601（例: `2026-11-09T13:00:00+09:00`）を指定します。
すべての下書きも同じスキーマで検証しますが、通常は Astro の data store に保存する前に除外します。
ローカルで下書きを確認するときだけ、次を使用します。

```sh
SIMOCHEE_INCLUDE_DRAFTS=1 vp run dev
```

`SIMOCHEE_INCLUDE_DRAFTS` は本番ビルドと CI では無効です。
RSS はプレビュー中も公開記事だけを配信します。
dev と build は `.astro/` にある同じ data store を使い、本番ビルド時に下書きを除去します。

スキーマの定義は `src/content/schema.ts`、エディタ用の JSON Schema は `schema/frontmatter.schema.json` です。
raw URL（https://raw.githubusercontent.com/simochee/simochee.net/main/schema/frontmatter.schema.json）でも参照できます。
定義を変更したら `vp run schema` で再生成してください。
テストでコミット済みファイルとの一致を検査します。
タグ URL では日本語を保持し、`/` などの予約文字を `~` と文字コードでエスケープして単一のパス要素に収めます。
タグの重複や日時の暦上の妥当性は、ビルド時の Zod 検証でも確認します。

## コメント

コメントは記事ページの投稿欄から書き込み、Cloudflare D1 に保存します（後述の「サーバーで動く部品」）。
記事ページのコメント欄は古い順、サイドバーの「最新コメント」と `/comments.xml` は新しい順に並びます。
記事の下と全記事一覧の「コメント(n)」は、公開コメントの件数です。

- 公開されていない記事（下書き、または記事のない slug）のコメントは、件数にも一覧にも RSS にも出ません。
- 「非公開コメント」にチェックしたコメントは、管理画面でだけ読めます。
- 削除パスワードを入れて書いたコメントは、同じパスワードで本人が削除できます。編集はできません。
- メールアドレスは受け取りません（コメントも掲示板も）。

集計の SQL は `src/server/comments.ts` にあり、`tests/comments.test.ts` が Node の SQLite で同じ SQL を確かめます。

## 日付

公開日は first-parent の履歴で、記事の `index.md(x)` に `status: published` 行を初めて追加したコミットのコミッター日時です。
下書きへ戻して再公開しても、この日時を維持します。
更新日は同じファイルに触れた最新の first-parent コミットの日時で、公開日より後の場合だけ表示します。
ブランチの変更は `--first-parent --diff-merges=first-parent` でマージされた日時として扱います。
`date` と `updated` の指定はそれぞれ git の値に優先し、更新日は最終的な公開日より後の場合だけ表示します。
履歴はコレクション全体について一定回数の git コマンドで取得します。

浅い clone は、CI では明確なエラーになります。
ローカルでは警告し、現在日時へフォールバックします（frontmatter の日時指定があれば優先します）。
公開日を取得できない公開記事は、CI ではエラー、ローカルでは警告と現在日時へのフォールバックになります。
Workers Builds は `CI=true` と `WORKERS_CI=1` を設定します（[公式資料](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#environment-variables)）。

## 環境変数

| 環境変数                    | 既定値                                                                      | 用途                                                                                    |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `SIMOCHEE_CONTENT_DIR`      | `content/posts`                                                             | 記事ディレクトリ（絶対パス、またはサイトのルートからの相対パス）。空文字は未設定と同じ  |
| `SIMOCHEE_CONTENT_GIT_ROOT` | `SIMOCHEE_CONTENT_DIR` の git ルート、未設定ならこのサイトのルート          | 日付を読む git リポジトリのルート                                                       |
| `SIMOCHEE_CONTENT_GIT_PATH` | `SIMOCHEE_CONTENT_DIR` のリポジトリ内の相対パス、未設定なら `content/posts` | そのリポジトリ内の記事ディレクトリ                                                      |
| `SIMOCHEE_INCLUDE_DRAFTS`   | 無効                                                                        | ローカル dev で `1` のときだけ下書きを含める                                            |
| `SIMOCHEE_SITE_URL`         | `https://simochee.net`                                                      | canonical、OG、RSS、`robots.txt` に使うサイトの URL。空文字は未設定と同じ               |
| `SIMOCHEE_NOINDEX`          | `false`                                                                     | `true` のとき全ページに `noindex, nofollow` を付け、`robots.txt` からサイトマップを外す |
| `TURNSTILE_SITE_KEY`        | Cloudflare の試験用の鍵                                                     | コメントと掲示板の迷惑書き込みよけ（Turnstile）のサイトキー                             |
| `WEB_ANALYTICS_TOKEN`       | 未設定                                                                      | Cloudflare Web Analytics の計測スクリプトに入れるサイトのトークン。未設定なら計測しない |
| `CI` / `WORKERS_CI`         | 未設定                                                                      | いずれかが設定されていれば履歴検証を厳格にする                                          |

`SIMOCHEE_CONTENT_DIR` を指定すると、日時はそのディレクトリを含む git リポジトリの履歴から取得します。
サムネイル、OG 画像、本文の相対画像、MDX は `vp run dev` と `vp run build` のどちらでも指定先から読み込み、dev では編集を監視して再読み込みします。
指定したディレクトリが存在しない場合はエラーになります。
ダミー記事に戻すときは変数を空にして実行します。

```sh
SIMOCHEE_CONTENT_DIR= vp run dev
```

ディレクトリが git の外にある場合、日時は警告のうえ現在日時になります（CI ではエラー）。
`SIMOCHEE_CONTENT_GIT_ROOT` と `SIMOCHEE_CONTENT_GIT_PATH` を指定すると、導出より優先します。
`vp test` と検証用スクリプトは、`SIMOCHEE_CONTENT_DIR` が設定されていても影響を受けません。

## サムネイルと OG 画像

`thumbnail.png`、`thumbnail.jpg`、`thumbnail.jpeg`、`thumbnail.webp` のうち1枚を記事ディレクトリに置きます。
複数ある場合はビルドエラーです。
一覧では `astro:assets` がレスポンシブな WebP に最適化します。
記事の OG 画像は 1200×630 の JPEG で、サムネイルがあれば中央を cover-crop し、なければタイトルとサイト名から生成します。
本文の相対画像も Astro の画像処理を通ります。
本文の `![説明](./x.png)` とサムネイルは、ビルド時に集めて `/gallery/` の画像一覧に並べます（説明がなければ記事のタイトルが題になります）。

自動生成には同梱の M PLUS 1p Regular を使用します。
フォントは [Google Fonts](https://github.com/google/fonts/tree/main/ofl/mplus1p) 由来で、SIL Open Font License 1.1 です。
ライセンスは `fonts/OFL.txt` に含めています。
システムフォントやビルド中のフォント取得に依存しません。

## 検索

検索は `/search/` のページがブラウザで行います。
ビルド時に全記事のタイトルと本文のプレーンテキストを `/search.json` に書き出し、ページのスクリプトがそれを読んで絞り込みます。
全角と半角、大文字と小文字は区別せず、空白で区切った語がすべて含まれる記事を新しい順に出します。
サイドバーの QR コードもビルド時に生成します。

## サーバーで動かすルート

サイトは基本すべてビルド時に生成します。サーバーが要るものだけを、ルートごとに外します。

```ts
// src/pages/api/health.ts
export const prerender = false;
export const GET: APIRoute = () => Response.json({ ok: true });
```

- `export const prerender = false` を書いたルートだけが Cloudflare Workers の上で動きます。書いていないページは静的ファイルのままで、配信に Worker は使われません。
- URL の末尾スラッシュの決まりはページと同じです（`/api/health/`）。
- KV や D1 などを使うときは、`cloudflare.config.ts` の `worker.env` に binding を足し、ルートの中で `import { env } from "cloudflare:workers"` から読みます。型は `src/env.d.ts` の `Env` に足します。
- サーバー側の処理は `src/server/` に置きます。データベースを引数で受け取る形にして、`tests/` から Node の SQLite で確かめます（`tests/support/d1.ts`）。
- Worker の入口は `src/worker.ts` です。ページとルートは Astro に渡し、定期実行（`scheduled`）だけを自分で受けます。

### 手元で動かす

`vp run dev` で、サーバー側のルートも含めて動きます。Astro の dev サーバーが、サーバー側のコードを Cloudflare のランタイム（workerd）の中で動かします。

- KV や D1 などの binding は、手元ではエミュレータで動きます。Cloudflare へのサインインは要りません。
- エミュレータのデータは `.cloudflare/state/` に残り、起動し直しても消えません。消すときはこのディレクトリを削除します。
- 本番と同じ形（ビルド済みのファイルと Worker）で確かめるときは `vp run preview` を使います。
- dev ではデータベースに見本のデータ（`db/dev-seed.sql`）が入ります。本番には入りません。
- 秘密の値は `.dev.vars` に書きます。`.dev.vars.example` をコピーして使ってください。Turnstile の鍵がないときは、手元では確認を飛ばして投稿できます。
- 定期実行（1 時間おきに Web Analytics の集計を取り込む）は dev では動きません。人気記事とカウンターは見本のデータで出し、閲覧者数は出しません。

## サーバーで動く部品

| 部品                   | 保存先・仕組み                                                             |
| ---------------------- | -------------------------------------------------------------------------- |
| コメント（投稿・削除） | D1。投稿には Turnstile と送信回数の制限                                    |
| 拍手                   | D1。記事ごとの回数                                                         |
| ひとこと掲示板         | D1。`/bbs/` とサイドバー。削除キーで本人が編集・削除、管理人が返信         |
| アンケート             | D1。質問と選択肢は `src/site.ts` の `poll`。1 人 1 票（cookie で見分ける） |
| アクセスカウンター     | Web Analytics の訪問数を 1 時間ごとに D1 へ足した累計                      |
| 現在の閲覧者数         | Web Analytics の直近 10 分の訪問数。問い合わせるのは 5 分ごと              |
| 人気記事               | Web Analytics から D1 へ取り込んだ、この 30 日の記事ごとの閲覧数           |
| 最新コメントの RSS     | `/comments.xml` をリクエストのたびに作る                                   |

ページは静的なままで、これらの部品はスクリプトが `/api/` のルートを呼んで中身を入れます。

- テーブルは `db/migrations/` の SQL です。Worker が最初のリクエストで、まだ当てていないものを当てます（記録は `d1_migrations` 表で、`cf d1 migrations apply --dir db/migrations` と同じ形）。テーブルを変えるときは、番号を進めた SQL ファイルを足します。
- 送信回数の制限は Workers の Rate Limiting です。書き込み（コメント・掲示板・ログイン）は 1 分 5 回、拍手や投票などは 1 分 30 回まで（IP ごと）。
- 記事の一覧は、ビルドで書き出した `/posts.json` を Worker が読みます。記事の本文を Worker に抱えさせないためです。
- D1 の無料枠は読んだ行の数で決まるので、記事やコメントが増えても 1 ページで読む行が増えないようにしています。
  - 人気記事と閲覧者数は数えた結果を `snapshots` 表に置き、人気記事は 1 時間ごと、閲覧者数は 5 分ごとに数えなおします。
  - アンケートの票の合計（`poll_totals`）と掲示板の書き込みの数（`counters`）は、書き込みのたびに足し引きします。
  - 拍手とコメントの数は、ページに出ている記事の分だけを頼みます（`/api/counts/?slugs=...`）。

### 閲覧の数（Web Analytics）

閲覧数は自分では数えず、Cloudflare Web Analytics に任せます。計測スクリプトは cookie もブラウザへの保存も使いません。

- 1 時間おきの定期実行で、Web Analytics の GraphQL Analytics API から直前 1 時間の「ページごとの閲覧数」と「訪問数」を読み、D1 に足します（`src/server/analytics.ts`）。
  - 記事ごとの閲覧数は `page_views` 表に日本時間の日付ごとに、訪問数の累計は `counters` 表の `visitors` に足します。
  - Web Analytics は古い集計を間引いて消していくので、これらは D1 で持ちつづけ、消しません。
  - どこまで取り込んだかは `counters` 表の `analytics_until` に残します。止まっていたあとは続きから取り込みます（1 回 24 時間ぶんまで）。
  - 集計が落ち着くのを待つため、取り込むのは 15 分より前の時間だけです。
- 計測スクリプトはページ遷移も数えます。ダッシュボードの「自動で計測スクリプトを入れる」設定は使わないでください（二重に数えます）。
- API で使っている項目名（`rumPageloadEventsAdaptiveGroups` の `requestPath` や `sum.visits`）は、資料で確かめきれていません。取り込みが失敗するときは Worker のログを見てください。

### 管理画面

`/admin/` は管理人用のページです（どこからもリンクせず、検索とサイトマップから外しています）。
`ADMIN_PASSWORD` でログインすると、非公開を含むコメントと掲示板の書き込みを読み、削除し、掲示板に返信できます。
ログインは 30 日つづきます（`admin_sessions` 表）。全員をログアウトさせるときは、この表を空にします。

## デプロイ

Cloudflare Workers にデプロイします。操作には Cloudflare の CLI（`cf`）を使います。

```sh
vp install --frozen-lockfile
vp run deploy               # ビルドしてデプロイ（cf deploy）
pnpm exec cf deploy --dry-run   # アップロードせずにビルドと検証だけ
```

デプロイには `cf auth login` でのサインインか、環境変数 `CLOUDFLARE_API_TOKEN` が要ります。

### 初めてデプロイする前に

1. Turnstile のウィジェットを Cloudflare のダッシュボードで作り、サイトキーをビルドの環境変数 `TURNSTILE_SITE_KEY` に入れます。
   Web Analytics のサイトを作り、計測スクリプトのトークンをビルドの環境変数 `WEB_ANALYTICS_TOKEN` に入れます。
2. Worker の秘密の値を登録します。ダッシュボードの Worker の「設定 → 変数とシークレット」か、`pnpm exec cf workers secrets update <名前> --worker simochee-net --text <値>` で入れます。

| 秘密の値               | 用途                                                             | ないとき                                                       |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `TURNSTILE_SECRET_KEY` | Turnstile のシークレットキー                                     | コメントと掲示板の書き込みを受け付けない                       |
| `ADMIN_PASSWORD`       | 管理画面のパスワード                                             | 管理画面に入れない                                             |
| `ANALYTICS_ACCOUNT_ID` | Cloudflare のアカウント ID                                       | 閲覧数を取り込まない（人気記事・カウンター・閲覧者数が止まる） |
| `ANALYTICS_SITE_TAG`   | Web Analytics のサイトタグ（計測スクリプトのトークンとは別の値） | 同上                                                           |
| `ANALYTICS_API_TOKEN`  | 「アカウントの分析の読み取り」権限だけを付けた API トークン      | 同上                                                           |

3. D1 のデータベース（`simochee-net`）と送信回数の制限は、`cloudflare.config.ts` の binding からデプロイ時に用意されます。テーブルは Worker が最初のリクエストで作ります。

| ファイル               | 内容                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `cloudflare.config.ts` | Worker の名前、入口、互換性の日付、静的ファイルの配信の決まり、定期実行、binding |
| `astro.config.ts`      | Cloudflare アダプターの設定（事前生成は Node、画像はビルド時に最適化）           |

ビルドの出力は `.cloudflare/output/` です。静的ファイルは `.cloudflare/output/v1/workers/default/assets/` に、Worker はその隣に出ます。
404 は `404-page`、HTML の URL は `auto-trailing-slash` です。

`cf` と Cloudflare アダプター（`@astrojs/cloudflare`）は、どちらも正式版の前の版（リリース候補とベータ）を固定して使っています。正式版が出たら上げてください。

`/feed.xml`、サイトマップ、`robots.txt`、canonical と OG / Twitter の meta 情報を生成します。
CI で浅い clone を使う場合は、ビルド前に `git fetch --unshallow` で履歴を取得してください。

`vp` が入っていない CI（Cloudflare Workers Builds など）では、公式インストーラで入れてから実行します。

```sh
curl -fsSL https://vite.plus | VP_VERSION=1.7.0 VP_HOME="$HOME/.vite-plus" VP_NODE_MANAGER=no bash
. "$HOME/.vite-plus/env"
```

## ステージング

`main` に push すると、GitHub Actions（`.github/workflows/pages.yml`）がダミー記事でビルドし、GitHub Pages の https://staging.simochee.net/ に公開します。
検索エンジンに載らないよう、`SIMOCHEE_NOINDEX=true` でビルドします。
GitHub Pages では静的ファイルだけが配信され、`prerender = false` のルート（`/api/` や `/comments.xml`）は 404 になります。コメントや掲示板などサーバーで動く部品は、ステージングでは表示されません。

## 検証用スクリプト

```sh
vp run build
node scripts/verify-output.ts
node scripts/verify-deploy.ts
```

`verify-output.ts` はダミー記事の公開範囲、画像サイズ、Markdown の装飾を確認します。
`verify-deploy.ts` はシステムの一時ディレクトリに記事用の git リポジトリとサイトのコピーを作り、`SIMOCHEE_CONTENT_DIR` で指定した記事だけが公開されることと、浅い clone が CI で失敗することを確認します。

ネットワークやキャッシュの権限を個別に扱う環境では、`node scripts/verify-deploy.ts --prepare` で一時環境を作成できます。
表示されたパスの `site/` で `SIMOCHEE_CONTENT_DIR=../content/posts vp install --frozen-lockfile` を実行し、`node scripts/verify-deploy.ts --resume <表示されたパス>` で検証と後片付けを行います。
