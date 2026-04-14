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
    Name: config.name || 'FA Icons Pack',
    Version: config.version || '1.0.0',
    Description: config.description || 'Icons based on Font Awesome Free for Stream Deck with transparent backgrounds',
    Author: config.author || 'hatoya',
    URL: config.url || 'https://github.com/hatoya/streamdeck-fontawesome',
    Icon: 'icon.png',
    License: 'license.txt',
    Tags: config.tags || styles.join(', '),
    StreamDeckID: config.id || 'jp.co.argon.fa-icons-pack',
  };
}

/**
 * icons.json を生成
 * 各アイコンの name, path, tags を定義
 * path はファイル名のみ（Stream Deck の仕様に準拠）
 * 複数スタイルの場合はスタイルプレフィックスを付与して衝突を回避
 */
function buildIconsJson(icons, useStylePrefix = false) {
  return icons.map((icon) => {
    const fileName = useStylePrefix
      ? `${icon.style}-${icon.name}.png`
      : `${icon.name}.png`;
    const displayName = useStylePrefix
      ? `${icon.name.replace(/-/g, ' ')} (${icon.style})`
      : icon.name.replace(/-/g, ' ');
    return {
      path: fileName,
      name: displayName,
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
 * プレビュー画像を生成（代表アイコンをグリッド配置した PNG）
 * @param {Array} icons - プレビューに含めるアイコン
 * @param {string} outputPath - 出力先パス
 * @param {Object} renderOptions - レンダリングオプション
 */
async function generatePreviewImage(icons, outputPath, renderOptions = {}) {
  const cellSize = 96;
  const gap = 8;
  const padding = 16;
  const cols = Math.min(5, icons.length);
  const rows = Math.ceil(Math.min(25, icons.length) / cols);
  const width = padding * 2 + cols * cellSize + (cols - 1) * gap;
  const height = padding * 2 + rows * cellSize + (rows - 1) * gap;

  // 各アイコンを小さく描画
  const composites = [];
  for (let i = 0; i < Math.min(25, icons.length); i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = padding + col * (cellSize + gap);
    const y = padding + row * (cellSize + gap);

    try {
      const pngBuffer = await renderIconToPng(icons[i], {
        ...renderOptions,
        size: cellSize,
        padding: 0.15,
      });
      composites.push({ input: pngBuffer, left: x, top: y });
    } catch {
      // skip failed icons
    }
  }

  // 暗い背景にアイコンを配置
  const bgSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" rx="12" fill="#1a1a2e"/>
  </svg>`);

  await sharp(bgSvg)
    .resize(width, height)
    .composite(composites)
    .png()
    .toFile(outputPath);
}

/**
 * アイコンパックのディレクトリ構造を生成
 */
async function buildPack(icons, outputDir, renderOptions = {}, packConfig = {}) {
  const {
    format = 'png',  // 'png' or 'svg'
    concurrency = 20,
  } = renderOptions;

  // 既存の出力ディレクトリをクリアしてから再作成
  if (fs.existsSync(outputDir)) {
    console.log(`🗑  Cleaning output directory: ${outputDir}`);
    try {
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch {
      // rmSync が失敗した場合、icons/ 内の個別ファイルを削除してフォールバック
      const iconsDir = path.join(outputDir, 'icons');
      if (fs.existsSync(iconsDir)) {
        for (const file of fs.readdirSync(iconsDir)) {
          try { fs.unlinkSync(path.join(iconsDir, file)); } catch {}
        }
      }
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'previews'), { recursive: true });

  const styles = [...new Set(icons.map((i) => i.style))];
  const useStylePrefix = styles.length > 1;

  // カラーバリアント対応
  const { colorVariants } = renderOptions;
  const hasMultipleColors = colorVariants && Object.keys(colorVariants).length > 1;
  const colorEntries = colorVariants
    ? Object.entries(colorVariants) // [[name, hex], ...]
    : [[null, renderOptions.color]]; // 単色の場合

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

  // license.txt — CC BY 4.0 / SIL OFL / MIT 帰属要件に準拠
  const licenseText = `FA Icons Pack for Stream Deck
==============================

This icon pack contains icons derived from Font Awesome Free.

Attribution (CC BY 4.0)
-----------------------
Icons: Font Awesome Free ${styles.join(', ')}
Copyright (c) Fonticons, Inc. (https://fontawesome.com)
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/

Font Awesome Free Fonts License (SIL OFL 1.1)
----------------------------------------------
Font Awesome Free Fonts are licensed under the SIL Open Font License 1.1.
https://scripts.sil.org/OFL

Font Awesome Free Code License (MIT)
-------------------------------------
Font Awesome Free Code is licensed under the MIT License.
https://opensource.org/licenses/MIT

Modifications
-------------
Original SVG icon definitions from Font Awesome Free npm packages have been
rendered as ${format === 'svg' ? 'standalone SVG files' : 'PNG images (144x144px, transparent background)'} with custom styling
(foreground color, padding) for use as a Stream Deck icon pack.

Icon Pack Author: ${packConfig.author || 'hatoya'}
Icon Pack URL: ${packConfig.url || 'https://github.com/hatoya/streamdeck-fontawesome'}

For full Font Awesome license details, visit:
https://fontawesome.com/license/free
`;
  fs.writeFileSync(path.join(outputDir, 'license.txt'), licenseText);

  // プレビュー画像を生成（代表アイコンをグリッド配置）
  const previewIcons = icons.slice(0, Math.min(25, icons.length)); // 最大5x5グリッド
  if (previewIcons.length > 0) {
    console.log(`🖼  Generating preview image (${previewIcons.length} sample icons)...`);
    const previewPath = path.join(outputDir, 'previews', 'preview.png');
    await generatePreviewImage(previewIcons, previewPath, renderOptions);
  }

  // レンダリング総数を計算
  const totalRenders = icons.length * colorEntries.length;
  console.log(`\n🎨 Rendering ${icons.length} icons × ${colorEntries.length} color(s) = ${totalRenders} files (concurrency: ${concurrency})...`);
  if (hasMultipleColors) {
    console.log(`   Colors: ${colorEntries.map(([n, h]) => `${n}(${h})`).join(', ')}`);
  }

  const iconsJsonEntries = [];
  let completed = 0;
  const startTime = Date.now();

  // カラーバリアントごとにアイコンをレンダリング
  for (const [colorName, colorHex] of colorEntries) {
    const colorRenderOptions = { ...renderOptions, color: colorHex };

    // バッチ処理
    for (let i = 0; i < icons.length; i += concurrency) {
      const batch = icons.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (icon) => {
          const ext = format === 'svg' ? 'svg' : 'png';

          // ファイル名生成: {color}-{style}-{name}.{ext}
          let fileName;
          if (hasMultipleColors && useStylePrefix) {
            fileName = `${colorName}-${icon.style}-${icon.name}.${ext}`;
          } else if (hasMultipleColors) {
            fileName = `${colorName}-${icon.name}.${ext}`;
          } else if (useStylePrefix) {
            fileName = `${icon.style}-${icon.name}.${ext}`;
          } else {
            fileName = `${icon.name}.${ext}`;
          }

          const absPath = path.join(outputDir, 'icons', fileName);

          try {
            if (format === 'svg') {
              const svg = renderIconToSvg(icon, colorRenderOptions);
              fs.writeFileSync(absPath, svg);
            } else {
              const pngBuffer = await renderIconToPng(icon, colorRenderOptions);
              fs.writeFileSync(absPath, pngBuffer);
            }

            // 表示名生成
            const baseName = icon.name.replace(/-/g, ' ');
            let displayName;
            if (hasMultipleColors && useStylePrefix) {
              displayName = `${baseName} (${icon.style}, ${colorName})`;
            } else if (hasMultipleColors) {
              displayName = `${baseName} (${colorName})`;
            } else if (useStylePrefix) {
              displayName = `${baseName} (${icon.style})`;
            } else {
              displayName = baseName;
            }

            iconsJsonEntries.push({
              path: fileName,
              name: displayName,
            });

            completed++;
            if (completed % 200 === 0 || completed === totalRenders) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              const pct = ((completed / totalRenders) * 100).toFixed(0);
              process.stdout.write(`\r   ${completed}/${totalRenders} (${pct}%) - ${elapsed}s`);
            }
          } catch (err) {
            console.error(`\n   ❌ Failed to render ${icon.name} (${icon.style}${colorName ? ', ' + colorName : ''}): ${err.message}`);
          }
        })
      );
    }
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
  if (hasMultipleColors) {
    console.log(`   Colors: ${colorEntries.map(([n]) => n).join(', ')}`);
  }

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
