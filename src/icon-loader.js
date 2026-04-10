/**
 * icon-loader.js
 * FontAwesome アイコン定義をnpmパッケージから読み込む
 */

const STYLE_PACKAGES = {
  // Free packages
  'free-solid':   { pkg: '@fortawesome/free-solid-svg-icons',   prefix: 'fas', pro: false },
  'free-regular': { pkg: '@fortawesome/free-regular-svg-icons', prefix: 'far', pro: false },
  'free-brands':  { pkg: '@fortawesome/free-brands-svg-icons',  prefix: 'fab', pro: false },
  // Pro packages
  'pro-solid':         { pkg: '@fortawesome/pro-solid-svg-icons',         prefix: 'fas',  pro: true },
  'pro-regular':       { pkg: '@fortawesome/pro-regular-svg-icons',       prefix: 'far',  pro: true },
  'pro-light':         { pkg: '@fortawesome/pro-light-svg-icons',         prefix: 'fal',  pro: true },
  'pro-thin':          { pkg: '@fortawesome/pro-thin-svg-icons',          prefix: 'fat',  pro: true },
  'pro-duotone':       { pkg: '@fortawesome/pro-duotone-svg-icons',       prefix: 'fad',  pro: true },
  'sharp-solid':       { pkg: '@fortawesome/sharp-solid-svg-icons',       prefix: 'fass', pro: true },
  'sharp-regular':     { pkg: '@fortawesome/sharp-regular-svg-icons',     prefix: 'fasr', pro: true },
  'sharp-light':       { pkg: '@fortawesome/sharp-light-svg-icons',       prefix: 'fasl', pro: true },
  'sharp-thin':        { pkg: '@fortawesome/sharp-thin-svg-icons',        prefix: 'fast', pro: true },
};

/**
 * スタイル名を正規化して対応するパッケージキーのリストを返す
 * 例: "solid" => ["free-solid"] or ["pro-solid"] (proフラグに応じて)
 */
function resolveStyleKeys(styleNames, usePro) {
  const keys = [];
  for (const style of styleNames) {
    const s = style.trim().toLowerCase();
    if (s === 'brands') {
      keys.push('free-brands');
    } else if (s.startsWith('sharp-')) {
      // sharp系は常にpro
      keys.push(s);
    } else if (usePro) {
      keys.push(`pro-${s}`);
    } else {
      keys.push(`free-${s}`);
    }
  }
  return keys;
}

/**
 * 指定パッケージからアイコン定義を全て読み込む
 * @returns {Array<{name, prefix, width, height, svgPathData, style}>}
 */
function loadIconsFromPackage(packageKey) {
  const info = STYLE_PACKAGES[packageKey];
  if (!info) {
    throw new Error(`Unknown style package: ${packageKey}`);
  }

  let mod;
  try {
    mod = require(info.pkg);
  } catch (err) {
    if (info.pro) {
      console.warn(`⚠ Pro package ${info.pkg} not found. Set up .npmrc with your FontAwesome token.`);
      console.warn(`  See .npmrc.example for details.`);
      return [];
    }
    throw new Error(`Failed to load ${info.pkg}: ${err.message}`);
  }

  const icons = [];
  const styleName = packageKey.replace(/^(free|pro)-/, '');

  for (const [exportName, def] of Object.entries(mod)) {
    // FontAwesome exports include non-icon items (prefix, fas, etc.)
    if (!def || !def.iconName || !def.icon) continue;

    const [width, height, , , svgPathData] = def.icon;
    icons.push({
      name: def.iconName,
      prefix: def.prefix,
      width,
      height,
      svgPathData,
      style: styleName,
      packageKey,
    });
  }

  return icons;
}

/**
 * 複数スタイルのアイコンを読み込む
 */
function loadIcons(styleNames, usePro) {
  const keys = resolveStyleKeys(styleNames, usePro);
  const allIcons = [];
  const loaded = new Set();

  for (const key of keys) {
    if (!STYLE_PACKAGES[key]) {
      console.warn(`⚠ Unknown style: ${key}, skipping.`);
      continue;
    }
    console.log(`📦 Loading icons from ${STYLE_PACKAGES[key].pkg}...`);
    const icons = loadIconsFromPackage(key);
    console.log(`   Found ${icons.length} icons`);

    for (const icon of icons) {
      // 同名アイコンの重複を避ける（style毎にユニーク）
      const uid = `${icon.style}/${icon.name}`;
      if (!loaded.has(uid)) {
        loaded.add(uid);
        allIcons.push(icon);
      }
    }
  }

  return allIcons;
}

module.exports = { loadIcons, loadIconsFromPackage, resolveStyleKeys, STYLE_PACKAGES };
