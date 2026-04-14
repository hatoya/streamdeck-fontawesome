#!/usr/bin/env node

/**
 * cli.js
 * Stream Deck FontAwesome Icon Pack Generator CLI
 *
 * Usage:
 *   node src/cli.js [options]
 *
 * Examples:
 *   node src/cli.js --style solid --color '#ffffff'
 *   node src/cli.js --style solid,regular,brands --size 144
 *   node src/cli.js --style solid,light,duotone --pro --color '#00ff88'
 *   node src/cli.js --style solid --filter "arrow,chevron,check"
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { loadIcons } = require('./icon-loader');
const { buildPack, createPackageFile } = require('./pack-builder');

const program = new Command();

program
  .name('sd-fa-icons')
  .description('Generate Stream Deck icon packs from FontAwesome icons')
  .version('1.0.0')
  .option('-s, --style <styles>', 'Icon styles (comma-separated): solid,regular,light,thin,duotone,brands,sharp-solid,sharp-regular,sharp-light,sharp-thin', 'solid,brands')
  .option('-p, --pro', 'Use Pro icon packages (requires .npmrc token)', false)
  .option('-c, --color <hex>', 'Icon foreground color (hex)', '#ffffff')
  .option('-b, --bg <color>', 'Background color (hex or "transparent")', 'transparent')
  .option('--secondary-color <hex>', 'Secondary color for duotone icons')
  .option('--colors <list>', 'Multiple named colors (e.g. "white:#ffffff,blue:#228BE6"). Overrides --color')
  .option('--size <px>', 'Icon size in pixels', '144')
  .option('--padding <ratio>', 'Padding ratio (0-0.5)', '0.2')
  .option('-o, --output <dir>', 'Output directory', './output/fa-icon-pack')
  .option('-f, --format <type>', 'Output format: png or svg', 'png')
  .option('--filter <keywords>', 'Filter icons by name (comma-separated keywords)')
  .option('--exclude <keywords>', 'Exclude icons by name (comma-separated keywords)')
  .option('--concurrency <n>', 'Parallel rendering concurrency', '20')
  .option('--name <name>', 'Icon pack name (default: FA Icons Pack — do not change for store consistency)', 'FA Icons Pack')
  .option('--id <id>', 'Icon pack ID (reverse-DNS format)', 'jp.co.argon.fa-icons-pack')
  .option('--author <author>', 'Icon pack author', 'hatoya')
  .option('--url <url>', 'Icon pack URL (use your repository URL for releases)', 'https://github.com/hatoya/streamdeck-fontawesome')
  .option('--description <desc>', 'Icon pack description')
  .option('--dry-run', 'Show what would be generated without writing files', false);

program.parse();

const opts = program.opts();

async function main() {
  console.log('🔧 Stream Deck FontAwesome Icon Pack Generator\n');

  // hex カラーバリデーション
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  if (opts.color && !hexRegex.test(opts.color)) {
    console.error(`❌ Invalid --color value: "${opts.color}". Use hex format (e.g. #ffffff, #fff).`);
    process.exit(1);
  }
  if (opts.bg && opts.bg !== 'transparent' && !hexRegex.test(opts.bg)) {
    console.error(`❌ Invalid --bg value: "${opts.bg}". Use hex format or "transparent".`);
    process.exit(1);
  }
  if (opts.secondaryColor && !hexRegex.test(opts.secondaryColor)) {
    console.error(`❌ Invalid --secondary-color value: "${opts.secondaryColor}". Use hex format.`);
    process.exit(1);
  }

  // Pro アイコン使用時の警告（再配布禁止のため）
  if (opts.pro) {
    console.log('⚠️  Pro mode enabled — Pro icons are for personal/local use only.');
    console.log('   Do NOT submit Pro icon packs to the Elgato Marketplace (redistribution prohibited).\n');
  }

  // スタイルをパース
  const styles = opts.style.split(',').map((s) => s.trim());

  // カラーバリアントをパース
  let colorVariants = null;
  if (opts.colors) {
    colorVariants = {};
    for (const entry of opts.colors.split(',')) {
      const [name, hex] = entry.trim().split(':');
      if (!name || !hex) {
        console.error(`❌ Invalid --colors format: "${entry}". Use "name:#hex" pairs.`);
        process.exit(1);
      }
      colorVariants[name.trim()] = hex.trim();
    }
  }

  console.log(`Configuration:`);
  console.log(`  Styles:     ${styles.join(', ')}`);
  console.log(`  Pro:        ${opts.pro ? 'Yes' : 'No'}`);
  if (colorVariants) {
    console.log(`  Colors:     ${Object.entries(colorVariants).map(([n, h]) => `${n}(${h})`).join(', ')}`);
  } else {
    console.log(`  Color:      ${opts.color}`);
  }
  console.log(`  Background: ${opts.bg}`);
  console.log(`  Size:       ${opts.size}px`);
  console.log(`  Padding:    ${opts.padding}`);
  console.log(`  Format:     ${opts.format}`);
  console.log(`  Output:     ${opts.output}`);
  if (opts.filter) console.log(`  Filter:     ${opts.filter}`);
  if (opts.exclude) console.log(`  Exclude:    ${opts.exclude}`);
  console.log('');

  // アイコン読み込み
  let icons = loadIcons(styles, opts.pro);

  if (icons.length === 0) {
    console.error('❌ No icons found. Check your style names and Pro configuration.');
    process.exit(1);
  }

  // フィルタリング
  if (opts.filter) {
    const keywords = opts.filter.split(',').map((k) => k.trim().toLowerCase());
    icons = icons.filter((icon) =>
      keywords.some((kw) => icon.name.includes(kw))
    );
    console.log(`🔍 Filtered to ${icons.length} icons matching: ${keywords.join(', ')}`);
  }

  if (opts.exclude) {
    const excludeKw = opts.exclude.split(',').map((k) => k.trim().toLowerCase());
    icons = icons.filter((icon) =>
      !excludeKw.some((kw) => icon.name.includes(kw))
    );
    console.log(`🚫 Excluded to ${icons.length} icons after removing: ${excludeKw.join(', ')}`);
  }

  console.log(`\n📊 Total icons to render: ${icons.length}`);

  if (opts.dryRun) {
    console.log('\n🏃 Dry run - no files written');
    const byStyle = {};
    for (const icon of icons) {
      byStyle[icon.style] = (byStyle[icon.style] || 0) + 1;
    }
    for (const [style, count] of Object.entries(byStyle)) {
      console.log(`   ${style}: ${count} icons`);
    }
    return;
  }

  // レンダリングオプション
  const renderOptions = {
    color: opts.color,
    backgroundColor: opts.bg,
    size: parseInt(opts.size, 10),
    padding: parseFloat(opts.padding),
    format: opts.format,
    concurrency: parseInt(opts.concurrency, 10),
    ...(opts.secondaryColor ? { secondaryColor: opts.secondaryColor } : {}),
    ...(colorVariants ? { colorVariants } : {}),
  };

  // パック設定
  const packConfig = {
    name: opts.name,
    id: opts.id,
    author: opts.author,
    url: opts.url,
    description: opts.description || `Icons based on Font Awesome Free (${styles.join(', ')}) for Stream Deck. Licensed under CC BY 4.0.`,
    version: '1.0.0',
  };

  const outputDir = path.resolve(opts.output);

  // ビルド実行
  const result = await buildPack(icons, outputDir, renderOptions, packConfig);

  // .streamDeckIconPack ファイル（zip）を生成
  // ファイル名は出力ディレクトリ名から決定（--name ではなく --output に連動）
  const dirBaseName = path.basename(outputDir);
  const sdIconPackName = `${dirBaseName}.sdIconPack`;
  const packageFileName = `${dirBaseName}.streamDeckIconPack`;
  const packageFilePath = path.join(path.dirname(outputDir), packageFileName);

  // 既存のパッケージファイルを削除
  if (fs.existsSync(packageFilePath)) {
    try { fs.unlinkSync(packageFilePath); } catch {}
  }

  console.log(`\n📦 Packaging ${packageFileName}...`);
  await createPackageFile(result.outputDir, packageFilePath, sdIconPackName);
  const stats = fs.statSync(packageFilePath);
  const sizeKB = (stats.size / 1024).toFixed(0);
  console.log(`✅ ${packageFilePath} (${sizeKB} KB)`);

  console.log(`\n📋 インストール方法:`);
  console.log(`   .streamDeckIconPack ファイルをダブルクリック`);
  console.log(`   → Stream Deck アプリが自動でインストール`);
}

main().catch((err) => {
  console.error(`\n❌ Error: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
