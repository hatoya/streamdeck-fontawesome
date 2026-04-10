/**
 * icon-renderer.js
 * FontAwesome SVG パスデータを高品質な PNG に変換する
 */

const sharp = require('sharp');

/**
 * SVG パスデータから SVG 文字列を生成
 * @param {Object} icon - アイコン定義
 * @param {Object} options - レンダリングオプション
 */
function buildSvg(icon, options = {}) {
  const {
    color = '#ffffff',
    backgroundColor = 'transparent',
    size = 144,
    padding = 0.2, // アイコン領域に対するパディング比率 (0-0.5)
  } = options;

  const { width, height, svgPathData } = icon;

  // パディングを計算
  const paddingPx = Math.round(size * padding);
  const iconArea = size - paddingPx * 2;

  // アスペクト比を維持してスケーリング
  const scale = Math.min(iconArea / width, iconArea / height);
  const scaledW = width * scale;
  const scaledH = height * scale;

  // 中央配置のためのオフセット
  const offsetX = (size - scaledW) / 2;
  const offsetY = (size - scaledH) / 2;

  // duotone アイコンはパスデータが配列
  let pathElements;
  if (Array.isArray(svgPathData)) {
    // duotone: [primaryPath, secondaryPath]
    const secondaryColor = options.secondaryColor || adjustOpacity(color, 0.4);
    pathElements = `
      <path d="${svgPathData[0]}" fill="${secondaryColor}" transform="translate(${offsetX},${offsetY}) scale(${scale})"/>
      <path d="${svgPathData[1]}" fill="${color}" transform="translate(${offsetX},${offsetY}) scale(${scale})"/>
    `;
  } else {
    pathElements = `
      <path d="${svgPathData}" fill="${color}" transform="translate(${offsetX},${offsetY}) scale(${scale})"/>
    `;
  }

  // 背景の処理
  const bgRect = backgroundColor === 'transparent'
    ? ''
    : `<rect width="${size}" height="${size}" fill="${backgroundColor}" rx="0" ry="0"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${bgRect}
  ${pathElements}
</svg>`;
}

/**
 * 色の透明度を調整（duotone用）
 */
function adjustOpacity(hexColor, opacity) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * アイコンを PNG バッファに変換
 * @param {Object} icon - アイコン定義
 * @param {Object} options - レンダリングオプション
 * @returns {Promise<Buffer>} PNG バッファ
 */
async function renderIconToPng(icon, options = {}) {
  const { size = 144 } = options;
  const svg = buildSvg(icon, options);
  const svgBuffer = Buffer.from(svg);

  return sharp(svgBuffer, { density: 300 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({
      compressionLevel: 9,
      quality: 100,
    })
    .toBuffer();
}

/**
 * アイコンを SVG 文字列として返す（Stream Deck は SVG もサポート）
 */
function renderIconToSvg(icon, options = {}) {
  return buildSvg(icon, options);
}

module.exports = { renderIconToPng, renderIconToSvg, buildSvg };
