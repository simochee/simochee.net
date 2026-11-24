# 東雲フォント（Shinonome）

パブリックドメインのビットマップフォント「東雲フォント」をアウトライン化した WOFF2 です。
14px 用（本文）と 12px 用（小さい文字）を、それぞれ標準と太字で持っています。

漢字は 1 ファイルあたり 240〜280KB あるため、かな・英数字・記号（`-kana`）と漢字（`-kanji`）に分けています。
`src/styles/fonts.css` の `unicode-range` と対応しており、かな側だけを preload します。

```sh
pyftsubset in.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+0000-33FF,U+A000-F8FF,U+FB00-FFFF" --output-file=out-kana.woff2
pyftsubset in.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+3400-9FFF,U+F900-FAFF" --output-file=out-kanji.woff2
```

OG 画像を描く satori は WOFF2 を読めないので、14px 用の標準と太字はかなと漢字を 1 つの TTF に戻して `fonts/` にも置いています。

```py
from fontTools.ttLib import TTFont
from fontTools.merge import Merger

for part in ["kana", "kanji"]:
    font = TTFont(f"shinonome14-bold-{part}.woff2")
    font.flavor = None
    font.save(f"shinonome14-bold-{part}.ttf")
Merger().merge(["shinonome14-bold-kana.ttf", "shinonome14-bold-kanji.ttf"]).save("shinonome14-bold.ttf")
```
