/**
 * pack-builder.js
 * Stream Deck Icon Pack (.sdIconPack) のディレクトリ構造を生成する
 *
 * 出力フォーマット:
 *   {outputDir}/
 *     manifest.json   — パックメタデータ
 *     icons.json      — アイコン一覧（path はファイル名のみ）
 *     icon.png        — パックサムネイル (144x144)
 *     cover.png       — カバー画像 (512x512)
 *     license.txt     — ライセンス情報
 *     previews/       — プレビュー画像（空でも可）
 *     icons/          — アイコン PNG（フラット配置、サブディレクトリなし）
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const archiver = require('archiver');
const { renderIconToPng, renderIconToSvg } = require('./icon-renderer');

/**
 * manifest.json を生成
 */
function buildManifest(config, styles = []) {
  return {
    Name: config.name || 'FA Icon Pack',
    Version: config.version || '1.0.0',
    Description: config.description || 'Icons based on Font Awesome Free for Stream Deck with transparent backgrounds',
    Author: config.author || '',
    URL: config.url || '',
    Icon: 'icon.png',
    License: 'license.txt',
    Tags: config.tags || styles.join(', '),
    ...(config.id ? { StreamDeckID: config.id } : {}),
  };
}

/**
 * icons.json を生成
 * 各アイコンの name, path, tags を定義
 * path はファイル名のみ（Stream Deck の仕様に準拠）
 */
function buildIconsJson(icons) {
  return icons.map((icon) => {
    const tags = [
      icon.style,
      icon.prefix,
      ...icon.name.split('-'),
    ].filter(Boolean);

    return {
      path: `${icon.name}.png`,
      name: icon.name.replace(/-/g, ' '),
      tags,
    };
  });
}

/**
 * pack 用のアイコン SVG を生成（icon.png / cover.png のソース）
 */
function buildPackIconSvg(color = '#ffffff') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#228BE6"/>
  <text x="256" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="280" fill="${color}">FA</text>
</svg>`;
}

/**
 * アイコンパックのディレクトリ構造を生成
 */
async function buildPack(icons, outputDir, renderOptions = {}, packConfig = {}) {
  const {
    format = 'png',  // 'png' or 'svg'
    concurrency = 20,
  } = renderOptions;

  // ディレクトリ作成（icons/ はフラット、サブディレクトリなし）
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'previews'), { recursive: true });

  const styles = [...new Set(icons.map((i) => i.style))];

  // manifest.json
  const manifest = buildManifest(packConfig, styles);
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // icon.png (144x144) + cover.png (512x512) — sharp で SVG→PNG 変換
  const packIconSvg = Buffer.from(buildPackIconSvg(renderOptions.color));
  await sharp(packIconSvg).resize(144, 144).png().toFile(path.join(outputDir, 'icon.png'));
  await sharp(packIconSvg).resize(512, 512).png().toFile(path.join(outputDir, 'cover.png'));

  // license.txt — CC BY 4.0 帰属要件に準拠
  const licenseText = `This icon pack contains icons derived from Font Awesome Free.

Original Work: Font Awesome Free
Copyright: (c) Fonticons, Inc. (https://fontawesome.com)
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
         https://creativecommons.org/licenses/by/4.0/

Modifications: Original SVG icons have been rendered as ${format === 'svg' ? 'standalone SVG files' : 'PNG images (144x144px)'} with custom styling
(color, padding, background) for use as Stream Deck icon packs.

Font Awesome Free Fonts are licensed under SIL OFL 1.1:
https://scripts.sil.org/OFL

Font Awesome Free Code is licensed under MIT License:
https://opensource.org/licenses/MIT

For full license details, visit: https://fontawesome.com/license/free
`;
  fs.writeFileSync(path.join(outputDir, 'license.txt'), licenseText);

  // アイコンを並列でレンダリング
  console.log(`\n🎨 Rendering ${icons.length} icons (concurrency: ${concurrency})...`);

  const iconsJsonEntries = [];
  let completed = 0;
  const total = icons.length;
  const startTime = Date.now();

  // バッチ処理
  for (let i = 0; i < icons.length; i += concurrency) {
    const batch = icons.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (icon) => {
        const ext = format === 'svg' ? 'svg' : 'png';
        // フラット配置: icons/{name}.{ext}
        const fileName = `${icon.name}.${ext}`;
        const absPath = path.join(outputDir, 'icons', fileName);

        try {
          if (format === 'svg') {
            const svg = renderIconToSvg(icon, renderOptions);
            fs.writeFileSync(absPath, svg);
          } else {
            const pngBuffer = await renderIconToPng(icon, renderOptions);
            fs.writeFileSync(absPath, pngBuffer);
          }

          // タグ生成
          const tags = [
            icon.style,
            icon.prefix,
            ...icon.name.split('-'),
          ].filter(Boolean);

          iconsJsonEntries.push({
            path: fileName,
            name: icon.name.replace(/-/g, ' '),
            tags,
          });

          completed++;
          if (completed % 100 === 0 || completed === total) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const pct = ((completed / total) * 100).toFixed(0);
            process.stdout.write(`\r   ${completed}/${total} (${pct}%) - ${elapsed}s`);
          }
        } catch (err) {
          console.error(`\n   ❌ Failed to render ${icon.name} (${icon.style}): ${err.message}`);
        }
      })
    );
  }

  console.log(''); // 改行

  // icons.json（名前順ソート）
  iconsJsonEntries.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(
    path.join(outputDir, 'icons.json'),
    JSON.stringify(iconsJsonEntries, null, 2)
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Icon pack generated: ${outputDir}`);
  console.log(`   ${iconsJsonEntries.length} icons in ${elapsed}s`);
  console.log(`   Styles: ${styles.join(', ')}`);

  return {
    outputDir,
    iconCount: iconsJsonEntries.length,
    styles,
  };
}

/**
 * .streamDeckIconPack ファイル（zip）を生成
 * 内部に {packName}.sdIconPack/ ディレクトリとして格納
 *
 * @param {string} sourceDir - buildPack で生成されたディレクトリ
 * @param {string} outputPath - 出力先 .streamDeckIconPack ファイルパス
 * @param {string} sdIconPackName - zip 内のフォルダ名（例: fa-icon-pack.sdIconPack）
 * @returns {Promise<string>} 生成されたファイルパス
 */
async function createPackageFile(sourceDir, outputPath, sdIconPackName) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(outputPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    // sourceDir の中身を {sdIconPackName}/ 配下に格納
    archive.directory(sourceDir, sdIconPackName);
    archive.finalize();
  });
}

module.exports = { buildPack, buildManifest, buildIconsJson, buildPackIconSvg, createPackageFile };
