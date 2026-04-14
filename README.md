# Stream Deck FontAwesome Icon Pack Generator

A CLI tool that converts FontAwesome icons into Stream Deck icon packs (`.sdIconPack`).

## Features

- Supports all FontAwesome 6 icons (Free + Pro)
- 144x144px high-resolution with transparent backgrounds
- Fully customizable colors, backgrounds, and padding
- Duotone secondary color support
- Keyword-based filtering and exclusion
- Fast parallel rendering

## Setup

```bash
cd streamdeck-fontawesome
npm install
```

### Using Pro Icons

1. Get an npm token from [FontAwesome](https://fontawesome.com/account#tokens)
2. Create `.npmrc`:

```bash
cp .npmrc.example .npmrc
# Edit .npmrc and set your token
```

3. Install Pro packages:

```bash
npm install
```

## Usage

### Basic (Free Solid icons, white, transparent background)

```bash
npm run generate:free
```

### All Free Styles

```bash
npm run generate:all-free
```

### Pro Icons

```bash
npm run generate:pro
```

### Customization Examples

```bash
# Green icons
node src/cli.js --style solid --color '#00ff88'

# White icons on blue background
node src/cli.js --style solid --color '#ffffff' --bg '#228BE6'

# Arrow-related icons only
node src/cli.js --style solid --filter "arrow,chevron"

# Larger padding
node src/cli.js --style solid --padding 0.3

# SVG output
node src/cli.js --style solid --format svg

# Dry run (preview without writing files)
node src/cli.js --style solid,regular,brands --dry-run
```

### CLI Options

| Option | Description | Default |
|---|---|---|
| `-s, --style <styles>` | Styles (comma-separated) | `solid` |
| `-p, --pro` | Use Pro packages | `false` |
| `-c, --color <hex>` | Icon foreground color | `#ffffff` |
| `-b, --bg <color>` | Background color (`transparent` supported) | `transparent` |
| `--secondary-color <hex>` | Duotone secondary color | Auto-calculated |
| `--size <px>` | Size in pixels | `144` |
| `--padding <ratio>` | Padding ratio (0-0.5) | `0.2` |
| `-o, --output <dir>` | Output directory | `./output/fontawesome-iconpack` |
| `-f, --format <type>` | Output format (`png`/`svg`) | `png` |
| `--filter <keywords>` | Filter by keywords (comma-separated) | - |
| `--exclude <keywords>` | Exclude by keywords (comma-separated) | - |
| `--concurrency <n>` | Parallel rendering concurrency | `20` |
| `--name <name>` | Pack name | `FA Icons Pack` |
| `--id <id>` | Pack ID (reverse-DNS format) | - |
| `--author <author>` | Author | - |
| `--url <url>` | Project/repository URL | Repository URL |
| `--description <desc>` | Description | Auto-generated |
| `--dry-run` | Dry run | `false` |

## Available Styles

### Free

- `solid` — Free Solid
- `regular` — Free Regular
- `brands` — Brands

### Pro (requires token)

- `solid` + `--pro` — Pro Solid
- `regular` + `--pro` — Pro Regular
- `light` + `--pro` — Pro Light
- `thin` + `--pro` — Pro Thin
- `duotone` + `--pro` — Pro Duotone
- `sharp-solid` — Sharp Solid
- `sharp-regular` — Sharp Regular
- `sharp-light` — Sharp Light
- `sharp-thin` — Sharp Thin

## Installing the Icon Pack

A `.streamDeckIconPack` file is automatically generated when you run the CLI.

```bash
node src/cli.js --style solid --name "FA Icons Pack" --id "com.yourname.fa-icon-pack"
# → ./output/fa-icon-pack.streamDeckIconPack is generated
```

Double-click the generated `.streamDeckIconPack` file to install it in the Stream Deck app.

## Output

Running the CLI generates the following:

```
output/
  fontawesome-iconpack/       # Working directory (.sdIconPack contents)
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
  fa-icon-pack.streamDeckIconPack   # ← Installable package file
```

## Programmatic Usage

```javascript
const { loadIcons, buildPack } = require('./src/index');

const icons = loadIcons(['solid'], false);
await buildPack(icons, './output/my-pack', {
  color: '#ff6600',
  backgroundColor: 'transparent',
  size: 144,
  padding: 0.2,
}, {
  name: 'FA Icons Pack',
  id: 'com.yourname.fa-icon-pack',
  author: 'Your Name',
});
```

## Releasing as an Extension

When submitting to the Elgato Marketplace, set the `--url` option to your GitHub repository URL:

```bash
node src/cli.js --style solid,regular,brands \
  --url "https://github.com/yourname/streamdeck-fontawesome" \
  --name "FA Icons Pack" \
  --id "jp.co.argon.fa-icons-pack"
```

The URL in `manifest.json` should point to the repository so users can find documentation, report issues, and access the source code.

## License

This tool is licensed under the MIT License.
FontAwesome icons are subject to the [FontAwesome License](https://fontawesome.com/license).
