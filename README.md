# simochee.net

Astro 7 で生成する日本語の個人ブログです。
このリポジトリには動作確認用のダミー記事が含まれます。

## 開発

Node.js 24.22 以降と pnpm 12.14.0 を使用します。

```sh
pnpm install --frozen-lockfile
pnpm exec vp run dev
pnpm exec vp check
pnpm exec vp test
pnpm exec vp run astro:check
pnpm exec vp run build
pnpm exec wrangler deploy --dry-run
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
SIMOCHEE_INCLUDE_DRAFTS=1 pnpm exec vp run dev
```

`SIMOCHEE_INCLUDE_DRAFTS` は本番ビルドと CI では無効です。
RSS はプレビュー中も公開記事だけを配信します。
dev と build は `.astro/` にある同じ data store を使い、本番ビルド時に下書きを除去します。

スキーマの定義は `src/content/schema.ts`、エディタ用の JSON Schema は `schema/frontmatter.schema.json` です。
raw URL（https://raw.githubusercontent.com/simochee/simochee.net/main/schema/frontmatter.schema.json）でも参照できます。
定義を変更したら `pnpm run schema` で再生成してください。
テストでコミット済みファイルとの一致を検査します。
タグ URL では日本語を保持し、`/` などの予約文字を `~` と文字コードでエスケープして単一のパス要素に収めます。
タグの重複や日時の暦上の妥当性は、ビルド時の Zod 検証でも確認します。

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

| 環境変数                    | 既定値                                                                      | 用途                                                                                   |
| --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SIMOCHEE_CONTENT_DIR`      | `content/posts`                                                             | 記事ディレクトリ（絶対パス、またはサイトのルートからの相対パス）。空文字は未設定と同じ |
| `SIMOCHEE_CONTENT_GIT_ROOT` | `SIMOCHEE_CONTENT_DIR` の git ルート、未設定ならこのサイトのルート          | 日付を読む git リポジトリのルート                                                      |
| `SIMOCHEE_CONTENT_GIT_PATH` | `SIMOCHEE_CONTENT_DIR` のリポジトリ内の相対パス、未設定なら `content/posts` | そのリポジトリ内の記事ディレクトリ                                                     |
| `SIMOCHEE_INCLUDE_DRAFTS`   | 無効                                                                        | ローカル dev で `1` のときだけ下書きを含める                                           |
| `CI` / `WORKERS_CI`         | 未設定                                                                      | いずれかが設定されていれば履歴検証を厳格にする                                         |

`SIMOCHEE_CONTENT_DIR` を指定すると、日時はそのディレクトリを含む git リポジトリの履歴から取得します。
サムネイル、OG 画像、本文の相対画像、MDX は `vp run dev` と `vp run build` のどちらでも指定先から読み込み、dev では編集を監視して再読み込みします。
指定したディレクトリが存在しない場合はエラーになります。
ダミー記事に戻すときは変数を空にして実行します。

```sh
SIMOCHEE_CONTENT_DIR= pnpm exec vp run dev
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

自動生成には同梱の M PLUS 1p Regular を使用します。
フォントは [Google Fonts](https://github.com/google/fonts/tree/main/ofl/mplus1p) 由来で、SIL Open Font License 1.1 です。
ライセンスは `fonts/OFL.txt` に含めています。
システムフォントやビルド中のフォント取得に依存しません。

## デプロイ

静的な `dist/` を Cloudflare Workers の assets として配信します。
SSR アダプターは使用しません。

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm exec wrangler deploy
```

Wrangler の `assets.directory` は `./dist`、404 は `404-page`、HTML の URL は `auto-trailing-slash` です。
`/feed.xml`、サイトマップ、`robots.txt`、canonical と OG / Twitter の meta 情報を生成します。
CI で浅い clone を使う場合は、ビルド前に `git fetch --unshallow` で履歴を取得してください。

## 検証用スクリプト

```sh
pnpm exec vp run build
node scripts/verify-output.ts
node scripts/verify-deploy.ts
```

`verify-output.ts` はダミー記事の公開範囲、画像サイズ、Markdown の装飾を確認します。
`verify-deploy.ts` はシステムの一時ディレクトリに記事用の git リポジトリとサイトのコピーを作り、`SIMOCHEE_CONTENT_DIR` で指定した記事だけが公開されることと、浅い clone が CI で失敗することを確認します。

ネットワークやキャッシュの権限を個別に扱う環境では、`node scripts/verify-deploy.ts --prepare` で一時環境を作成できます。
表示されたパスの `site/` で `SIMOCHEE_CONTENT_DIR=../content/posts pnpm install --frozen-lockfile` を実行し、`node scripts/verify-deploy.ts --resume <表示されたパス>` で検証と後片付けを行います。
