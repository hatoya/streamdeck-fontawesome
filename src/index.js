/**
 * index.js
 * モジュールとしてのエクスポート（プログラマティックに使用する場合）
 */

const { loadIcons, loadIconsFromPackage, STYLE_PACKAGES } = require('./icon-loader');
const { renderIconToPng, renderIconToSvg, buildSvg } = require('./icon-renderer');
const { buildPack, buildManifest, buildIconsJson, buildPackIconSvg, createPackageFile } = require('./pack-builder');

module.exports = {
  // Icon loading
  loadIcons,
  loadIconsFromPackage,
  STYLE_PACKAGES,

  // Rendering
  renderIconToPng,
  renderIconToSvg,
  buildSvg,

  // Pack building
  buildPack,
  buildManifest,
  buildIconsJson,
  buildPackIconSvg,
  createPackageFile,
};
