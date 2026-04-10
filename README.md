# Stream Deck FontAwesome Icon Pack Generator

FontAwesome のアイコンを Stream Deck 用のアイコンパック（`.sdIconPack`）に変換する CLI ツール。

## 特徴

- FontAwesome 6 の全アイコンに対応（Free + Pro）
- 144x144px 高解像度・透過背景
- 色・背景・パディングなど自由にカスタマイズ
- Duotone アイコンのセカンダリカラー対応
- キーワードによるフィルタリング・除外
- 高速な並列レンダリング

## セットアップ

```bash
cd streamdeck-fontawesome
npm install
```

### Pro アイコンを使う場合

1. [FontAwesome](https://fontawesome.com/account#tokens) で npm トークンを取得
2. `.npmrc` を作成:

```bash
cp .npmrc.example .npmrc
# .npmrc を編集してトークンを設定
```

3. Pro パッケージをインストール:

```bash
npm install
```

## 使い方

### 基本（Free Solid アイコン・白色・透過背景）

```bash
npm run generate:free
```

### 全 Free スタイル

```bash
npm run generate:all-free
```

### Pro アイコン

```bash
npm run generate:pro
```

### カスタマイズ例

```bash
# 緑色のアイコン
node src/cli.js --style solid --color '#00ff88'

# 青背景に白アイコン
node src/cli.js --style solid --color '#ffffff' --bg '#228BE6'

# 矢印系アイコンのみ
node src/cli.js --style solid --filter "arrow,chevron"

# 大きめのパディング
node src/cli.js --style solid --padding 0.3

# SVG 形式で出力
node src/cli.js --style solid --format svg

# Dry run（ファイル出力なしで確認）
node src/cli.js --style solid,regular,brands --dry-run
```

### CLI オプション一覧

| オプション | 説明 | デフォルト |
|---|---|---|
| `-s, --style <styles>` | スタイル（カンマ区切り） | `solid` |
| `-p, --pro` | Pro パッケージを使用 | `false` |
| `-c, --color <hex>` | アイコンの色 | `#ffffff` |
| `-b, --bg <color>` | 背景色（`transparent` 対応） | `transparent` |
| `--secondary-color <hex>` | Duotone セカンダリカラー | 自動算出 |
| `--size <px>` | サイズ (px) | `144` |
| `--padding <ratio>` | パディング比率 (0-0.5) | `0.2` |
| `-o, --output <dir>` | 出力先ディレクトリ | `./output/fontawesome-iconpack` |
| `-f, --format <type>` | 出力形式 (`png`/`svg`) | `png` |
| `--filter <keywords>` | フィルタ（カンマ区切り） | - |
| `--exclude <keywords>` | 除外（カンマ区切り） | - |
| `--concurrency <n>` | 並列数 | `20` |
| `--name <name>` | パック名 | `FA Icon Pack` |
| `--id <id>` | パック ID（reverse-DNS 形式） | - |
| `--author <author>` | 作者 | - |
| `--url <url>` | プロジェクト/プロフィール URL | - |
| `--description <desc>` | 説明 | 自動生成 |
| `--dry-run` | ドライラン | `false` |

## 利用可能なスタイル

### Free

- `solid` - Free Solid
- `regular` - Free Regular
- `brands` - Brands

### Pro（要トークン）

- `solid` + `--pro` - Pro Solid
- `regular` + `--pro` - Pro Regular
- `light` + `--pro` - Pro Light
- `thin` + `--pro` - Pro Thin
- `duotone` + `--pro` - Pro Duotone
- `sharp-solid` - Sharp Solid
- `sharp-regular` - Sharp Regular
- `sharp-light` - Sharp Light
- `sharp-thin` - Sharp Thin

## Icon Pack のインストール

CLI 実行時に `.streamDeckIconPack` ファイルが自動生成される。

```bash
node src/cli.js --style solid --name "FA Icon Pack" --id "com.yourname.fa-icon-pack"
# → ./output/fa-icon-pack.streamDeckIconPack が生成される
```

生成された `.streamDeckIconPack` ファイルをダブルクリックすれば、Stream Deck アプリが自動でインストールする。

## 出力

CLI を実行すると、以下の 2 つが生成される。

```
output/
  fontawesome-iconpack/       # 作業用ディレクトリ（.sdIconPack の中身）
    manifest.json
    icons.json
    icon.png (144x144)
    cover.png (512x512)
    license.txt
    previews/
    icons/
      arrow-right.png
      arrow-left.png
      ...
  fa-icon-pack.streamDeckIconPack   # ← インストール用パッケージファイル
```

## プログラマティック利用

```javascript
const { loadIcons, buildPack } = require('./src/index');

const icons = loadIcons(['solid'], false);
await buildPack(icons, './output/my-pack', {
  color: '#ff6600',
  backgroundColor: 'transparent',
  size: 144,
  padding: 0.2,
}, {
  name: 'FA Icon Pack',
  id: 'com.yourname.fa-icon-pack',
  author: 'Your Name',
});
```

## ライセンス

このツール自体は MIT ライセンスです。
FontAwesome のアイコンは [FontAwesome License](https://fontawesome.com/license) に従います。
