---
title: Markdown の表示サンプル（ダミー）
status: published
type: tech
tags: [sample, tech]
description: Markdown の装飾がどう表示されるかを確認するためのダミー記事です。
---

## コードの表示

```ts
// [!code word:current]
const previous = 1; // [!code --]
const current = 2; // [!code ++]
console.log(current); // [!code highlight]
```

```sh
vp run build
```

## 文字の飾り

**太字**、_斜体_、~~取り消し線~~、`コード`、[リンク](#文字の飾り) が使えます。
キーボードの操作は <kbd>Ctrl</kbd> + <kbd>C</kbd> のように書けます[^1]。

## リスト

- 架空の項目
  - 入れ子の項目
- もうひとつの項目

1. 最初の手順
2. 次の手順

- [x] 済んだこと
- [ ] これからのこと

## 引用と表

> これは引用のダミーです。

| 左寄せ | 中央 | 右寄せ |
| :----- | :--: | -----: |
| りんご | 3個  |  1番目 |
| みかん | 12個 |  2番目 |
| ぶどう | 5個  |  3番目 |

## 注意書き

> [!NOTE]
> これは装飾を確認するダミーのメモです。

> [!TIP]
> これはダミーのヒントです。

> [!IMPORTANT]
> これはダミーの重要事項です。

> [!WARNING]
> これはダミーの注意です。

> [!CAUTION]
> これはダミーの警告です。

## 画像と折りたたみ

### 相対画像

![緑と白のサンプル画像](./sample.png)

<details>
<summary>折りたたみの見出し（クリックで開く）</summary>

折りたたまれていたダミーの本文です。

</details>

---

## 参考リンク

[Astro](https://astro.build/) の外部リンク例です。

### リンクカード

URL だけの段落は、保存済みの情報からカードになります。

https://simochee.net/

<https://astro.build/>

取得できなかったリンクは、パスとドメインのカードになります。

https://example.com/not-found-link-card

[^1]: これは脚注のダミーです。
