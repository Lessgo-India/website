/**
 * Branded banners and wallpaper using the website's typography and icon texture.
 * Uses the website's self-hosted Outfit 800 face (or OUTFIT_FONT), not a fallback.
 * Run from the website with Node; requires its existing playwright and sharp.
 * Optional first argument: youtube or dark (4096 x 2304, JPEG under 1 MB).
 * Use wallpaper for the full-screen 3840 x 2160 dark desktop PNG.
 * Use mobile-wallpaper for the 1440 x 3200 portrait phone PNG.
 * Append -light to either wallpaper preset for its light-theme version.
 * Default: google-play (original dimensions).
 */
import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Clapperboard,
  Compass,
  Disc3,
  Dumbbell,
  Gift,
  Luggage,
  MapPin,
  Martini,
  Music,
  PartyPopper,
  Plane,
  Tent,
  Volleyball,
} from 'lucide-react';
import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const presets = {
  'google-play': {
    width: 1024,
    height: 500,
    fontSize: 112,
    safeWidth: 824,
    safeHeight: 350,
    maxBytes: 15 * 1024 * 1024,
    label: 'Google Play feature graphic',
  },
  youtube: {
    width: 2560,
    height: 1440,
    fontSize: 180,
    // Keep the full headline inside YouTube's central all-device safe area.
    safeWidth: 1546,
    safeHeight: 423,
    maxBytes: 6_000_000,
    label: 'YouTube channel banner',
  },
  dark: {
    width: 4096,
    height: 2304,
    fontSize: 288,
    safeWidth: 2472,
    safeHeight: 676,
    maxBytes: 1_000_000,
    label: 'Dark-mode banner',
    theme: 'dark',
    format: 'jpeg',
  },
  wallpaper: {
    width: 3840,
    height: 2160,
    fontSize: 296,
    safeWidth: 2760,
    safeHeight: 1520,
    maxBytes: 15 * 1024 * 1024,
    label: 'Lessgo desktop wallpaper',
    theme: 'dark',
    filename: 'lessgo-desktop-wallpaper-dark-3840x2160.png',
  },
  'mobile-wallpaper': {
    width: 1440,
    height: 3200,
    fontSize: 240,
    safeWidth: 1160,
    safeHeight: 1280,
    maxBytes: 15 * 1024 * 1024,
    label: 'Lessgo mobile wallpaper',
    theme: 'dark',
    filename: 'lessgo-mobile-wallpaper-dark-1440x3200.png',
  },
};
presets['wallpaper-light'] = {
  ...presets.wallpaper,
  theme: 'light',
  filename: 'lessgo-desktop-wallpaper-light-3840x2160.png',
};
presets['mobile-wallpaper-light'] = {
  ...presets['mobile-wallpaper'],
  theme: 'light',
  filename: 'lessgo-mobile-wallpaper-light-1440x3200.png',
};
const preset = process.argv[2] ?? 'google-play';
assert.ok(Object.hasOwn(presets, preset), `Choose one of: ${Object.keys(presets).join(', ')}.`);
const { width, height, fontSize, safeWidth, safeHeight, maxBytes, label,
  theme = 'light', format = 'png', filename } = presets[preset];
const extension = format === 'jpeg' ? 'jpg' : 'png';
const output = resolve(directory, filename ?? `lessgo-${preset}-banner-${width}x${height}.${extension}`);
const isMobileWallpaper = preset === 'mobile-wallpaper' || preset === 'mobile-wallpaper-light';
const isWallpaper = preset === 'wallpaper' || preset === 'wallpaper-light' || isMobileWallpaper;
const foregroundScale = fontSize / 112;
const backgroundScaleX = width / 1024;
const backgroundScaleY = height / 500;
const isDark = theme === 'dark';
const backgroundColor = isDark ? '#000000' : '#ffffff';
const inkColor = isDark ? '#f4f4f6' : '#0c0c0f';
const brandGradient = isDark
  ? 'linear-gradient(110deg, #22d3c5 0%, #4776e6 30%, #8e54e9 62%, #ec008c 100%)'
  : 'linear-gradient(110deg, #0d9e94 0%, #3a63cc 30%, #7b3fd4 62%, #c60077 100%)';
const violetGlow = isDark ? '201, 167, 255' : '124, 72, 224';
const tealGlow = isDark ? '34, 211, 197' : '13, 158, 148';
const pinkGlow = isDark ? '236, 0, 140' : '198, 0, 119';

/** Same icon family and seeded scatter as components/GlowIcons.tsx. */
function buildIconTexture() {
  const iconColors = isDark
    ? ['#22d3c5', '#4776e6', '#8e54e9', '#ec008c',
      '#c7f04a', '#ff9f45', '#4ade80', '#ff7a7a', '#c9a7ff']
    : ['#0d9e94', '#3a63cc', '#7b3fd4', '#c60077',
      '#7fa80a', '#d96f00', '#16a34a', '#e0393b', '#7c48e0'];
  const glyphs = [Plane, Martini, Tent, Gift, Luggage, Music, MapPin, Compass,
    Clapperboard, PartyPopper, Dumbbell, Volleyball, Disc3].map((icon) =>
    renderToStaticMarkup(createElement(icon, {
      size: 24,
      strokeWidth: 1.8,
      color: isWallpaper ? 'currentColor' : '#000',
    })),
  );
  let seed = 20260823;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const columns = Math.round(24 * backgroundScaleX / foregroundScale);
  const rows = Math.round(11 * backgroundScaleY / foregroundScale);
  const margin = 16 * foregroundScale;
  let body = '';
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const glyphIndex = Math.floor(random() * glyphs.length);
      const glyph = glyphs[glyphIndex];
      const x = margin + (column + 0.5) * (width - margin * 2) / columns + (random() - 0.5) * 18 * foregroundScale;
      const y = margin + (row + 0.5) * (height - margin * 2) / rows + (random() - 0.5) * 18 * foregroundScale;
      const rotation = Math.round((random() - 0.5) * 52);
      const scale = ((0.56 + random() * 0.3) * foregroundScale).toFixed(3);
      const color = isWallpaper
        ? ` color="${iconColors[(row * 7 + column * 11 + glyphIndex) % iconColors.length]}"`
        : '';
      body += `<g${color} transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation}) scale(${scale}) translate(-12 -12)">${glyph}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

async function readOutfit(weight = 800) {
  if (weight === 800 && process.env.OUTFIT_FONT) return readFile(process.env.OUTFIT_FONT);

  for (const build of ['.next/static', '.next/dev/static']) {
    const base = resolve(root, build);
    let entries;
    try {
      entries = await readdir(base, { recursive: true });
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    for (const entry of entries.filter((name) => name.endsWith('.css')).sort()) {
      const cssPath = resolve(base, entry);
      const css = await readFile(cssPath, 'utf8');
      for (const face of css.match(/@font-face\s*\{[^}]+\}/g) ?? []) {
        if (!/font-family:\s*["']?Outfit["']?\s*;/i.test(face)) continue;
        if (!new RegExp(`font-weight:\\s*${weight}\\s*;`, 'i').test(face)) continue;
        // Next's CSS minifier may shorten the Latin U+0000-00FF range to U+??.
        if (!/unicode-range:\s*u\+(?:0{1,4}-0{0,2}ff|\?\?)(?=\s*[,;}])/i.test(face)) continue;
        const source = face.match(/url\(\s*["']?([^\s"')]+\.woff2)["']?\s*\)/i)?.[1];
        if (!source) continue;
        const path = source.startsWith('/_next/')
          ? resolve(root, '.next', source.slice('/_next/'.length))
          : resolve(dirname(cssPath), source);
        return readFile(path);
      }
    }
  }

  throw new Error('Build the website first, or set OUTFIT_FONT to its Outfit Latin WOFF2 face.');
}

const font = (await readOutfit()).toString('base64');
const taglineFont = isWallpaper ? (await readOutfit(500)).toString('base64') : '';
const logoSource = isWallpaper
  ? `data:image/png;base64,${(await readFile(resolve(directory, 'lessgo-logo.png'))).toString('base64')}`
  : '';
const visibleText = isWallpaper ? 'Lessgo Hangouts made easy. lessgo.in' : 'Hangouts made easy!';
const textureSource = `data:image/svg+xml;base64,${Buffer.from(buildIconTexture()).toString('base64')}`;
const html = `<!doctype html>
<html lang="en" data-theme="${theme}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${visibleText}</title>
    <style>
      @font-face {
        font-family: 'Outfit';
        font-style: normal;
        font-weight: 800;
        font-display: block;
        src: url(data:font/woff2;base64,${font}) format('woff2');
      }

      * { box-sizing: border-box; }
      html, body { width: ${width}px; height: ${height}px; margin: 0; }

      body {
        background: ${backgroundColor};
        color: ${inkColor};
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      #artboard {
        position: relative;
        isolation: isolate;
        display: grid;
        place-items: center;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: ${backgroundColor};
      }

      /* The site's ambient glow, kept at the edges to preserve negative space. */
      .atmosphere {
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          radial-gradient(ellipse ${430 * backgroundScaleX}px ${310 * backgroundScaleY}px at 80% 8%, rgba(${violetGlow}, 0.065), transparent 74%),
          radial-gradient(ellipse ${410 * backgroundScaleX}px ${285 * backgroundScaleY}px at 14% 92%, rgba(${tealGlow}, 0.055), transparent 74%),
          radial-gradient(ellipse ${360 * backgroundScaleX}px ${265 * backgroundScaleY}px at 100% 100%, rgba(${pinkGlow}, 0.035), transparent 74%);
      }

      /* Nested masks: gradient outlines, feathered away behind the headline. */
      .icon-texture {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        opacity: 0.12;
        -webkit-mask-image: radial-gradient(ellipse ${360 * foregroundScale}px ${176 * foregroundScale}px at 50% 49%, transparent 62%, rgba(0, 0, 0, 0.18) 90%, #000 136%);
        mask-image: radial-gradient(ellipse ${360 * foregroundScale}px ${176 * foregroundScale}px at 50% 49%, transparent 62%, rgba(0, 0, 0, 0.18) 90%, #000 136%);
      }

      .icon-pattern {
        position: absolute;
        inset: 0;
        background-image: ${brandGradient};
        -webkit-mask-image: url("${textureSource}");
        mask-image: url("${textureSource}");
        -webkit-mask-size: 100% 100%;
        mask-size: 100% 100%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      }

      h1 {
        margin: 0;
        transform: translateY(${-4 * foregroundScale}px);
        font-family: 'Outfit', sans-serif;
        font-size: ${fontSize}px;
        font-weight: 800;
        font-synthesis: none;
        letter-spacing: -0.025em;
        line-height: 1.02;
        text-align: center;
      }

      .lead { display: block; }

      .accent {
        display: inline-block;
        white-space: nowrap;
        padding-bottom: 0.08em;
        margin-bottom: -0.08em;
        background-image: ${brandGradient};
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      ${isWallpaper ? `
      @font-face {
        font-family: 'Outfit';
        font-style: normal;
        font-weight: 500;
        font-display: block;
        src: url(data:font/woff2;base64,${taglineFont}) format('woff2');
      }

      .atmosphere {
        background-image: ${brandGradient};
        opacity: 0.055;
        -webkit-mask-image: radial-gradient(ellipse 68% 65% at 50% 48%, #000 10%, transparent 90%);
        mask-image: radial-gradient(ellipse 68% 65% at 50% 48%, #000 10%, transparent 90%);
      }

      .icon-texture {
        opacity: ${isDark ? 0.46 : 0.34};
        -webkit-mask-image: radial-gradient(ellipse 1000px 600px at 50% 48%, transparent 72%, #000 132%);
        mask-image: radial-gradient(ellipse 1000px 600px at 50% 48%, transparent 72%, #000 132%);
      }

      .icon-pattern {
        background-image: url("${textureSource}");
        background-size: 100% 100%;
        background-repeat: no-repeat;
        -webkit-mask-image:
          linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent),
          linear-gradient(0deg, transparent, #000 14%, #000 86%, transparent);
        mask-image:
          linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent),
          linear-gradient(0deg, transparent, #000 14%, #000 86%, transparent);
        -webkit-mask-composite: source-in;
        mask-composite: intersect;
      }

      .wallpaper-lockup {
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translateY(-50px);
      }

      .wallpaper-logo {
        display: block;
        width: 204px;
        height: 186px;
        object-fit: contain;
        margin-bottom: 42px;
      }

      .wallpaper-lockup h1 {
        transform: none;
        letter-spacing: 0;
        line-height: 1.08;
        white-space: nowrap;
      }

      .wallpaper-tagline {
        margin: 38px 0 0;
        font-family: 'Outfit', sans-serif;
        font-size: 64px;
        font-weight: 500;
        font-synthesis: none;
        line-height: 1.3;
        letter-spacing: 0;
        color: ${isDark ? '#a7a7b3' : '#55555f'};
        text-align: center;
      }

      .wallpaper-domain {
        position: absolute;
        left: 50%;
        bottom: 120px;
        transform: translateX(-50%);
        margin: 0;
        font: 500 32px/1.3 'Outfit', sans-serif;
        font-synthesis: none;
        letter-spacing: 0;
        color: ${isDark ? '#74747f' : '#8c8c96'};
        white-space: nowrap;
      }
      ` : ''}

      ${isMobileWallpaper ? `
      .icon-texture {
        -webkit-mask-image: radial-gradient(ellipse 660px 560px at 50% 49%, transparent 72%, #000 132%);
        mask-image: radial-gradient(ellipse 660px 560px at 50% 49%, transparent 72%, #000 132%);
      }

      .icon-pattern {
        -webkit-mask-image:
          linear-gradient(90deg, transparent, #000 16%, #000 84%, transparent),
          linear-gradient(0deg, transparent, #000 14%, #000 70%, transparent 92%),
          radial-gradient(ellipse 180px 90px at 50% calc(100% - 280px), transparent 60%, #000 100%);
        mask-image:
          linear-gradient(90deg, transparent, #000 16%, #000 84%, transparent),
          linear-gradient(0deg, transparent, #000 14%, #000 70%, transparent 92%),
          radial-gradient(ellipse 180px 90px at 50% calc(100% - 280px), transparent 60%, #000 100%);
      }

      .wallpaper-lockup {
        transform: translateY(-32px);
      }

      .wallpaper-logo {
        width: 216px;
        height: 197px;
        margin-bottom: 40px;
      }

      .wallpaper-tagline {
        margin-top: 30px;
        font-size: 48px;
      }

      .wallpaper-domain {
        bottom: 256px;
        font-size: 36px;
      }
      ` : ''}
    </style>
  </head>
  <body>
    <main id="artboard" aria-label="${label}">
      <div class="atmosphere" aria-hidden="true"></div>
      <div class="icon-texture" aria-hidden="true"><div class="icon-pattern"></div></div>
      ${isWallpaper ? `
      <section class="wallpaper-lockup" aria-label="Lessgo">
        <img class="wallpaper-logo" src="${logoSource}" alt="" width="204" height="186">
        <h1>Less<span class="accent">go</span></h1>
        <p class="wallpaper-tagline">Hangouts made easy.</p>
      </section>
      <p class="wallpaper-domain">lessgo.in</p>
      ` : '<h1><span class="lead">Hangouts</span> <span class="accent">made easy!</span></h1>'}
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: 'reduce',
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
  }, textureSource);
  const loadedFaces = await page.evaluate(async (size) => {
    const faces = await document.fonts.load(`800 ${size}px Outfit`, 'Hangouts made easy!');
    await document.fonts.ready;
    return faces.filter((face) => face.status === 'loaded').length;
  }, fontSize);
  assert.equal(loadedFaces, 1, 'The real Outfit face must load before export.');
  assert.equal((await page.locator('body').innerText()).replace(/\s+/g, ' ').trim(), visibleText);
  if (isWallpaper) {
    const artworkLoaded = await page.evaluate(async () => {
      const faces = await document.fonts.load('500 64px Outfit', 'Hangouts made easy.');
      await Promise.all([...document.images].map((image) => image.decode()));
      return faces.length === 1 && faces[0].status === 'loaded'
        && [...document.images].every((image) => image.naturalWidth > 0);
    });
    assert.ok(artworkLoaded, 'The website logo and tagline font must load.');
    const domainBounds = await page.locator('.wallpaper-domain').boundingBox();
    assert.ok(domainBounds && Math.abs(domainBounds.x + domainBounds.width / 2 - width / 2) < 1,
      'The domain footer must be horizontally centered.');
    assert.ok(domainBounds.y > height * 0.85 && domainBounds.y + domainBounds.height <= height - 64,
      'The domain footer must sit near the bottom with a safe inset.');
  }

  const safeLeft = (width - safeWidth) / 2;
  const safeTop = (height - safeHeight) / 2;
  const selectors = isWallpaper
    ? ['.wallpaper-lockup', '.wallpaper-logo', 'h1', '.accent', '.wallpaper-tagline']
    : ['h1', '.lead', '.accent'];
  for (const selector of selectors) {
    const bounds = await page.locator(selector).boundingBox();
    assert.ok(bounds && bounds.x >= safeLeft && bounds.y >= safeTop, `${selector} starts inside the safe area.`);
    assert.ok(bounds.x + bounds.width <= width - safeLeft && bounds.y + bounds.height <= height - safeTop,
      `${selector} ends inside the safe area.`);
  }

  // Supersample the type; keep full-resolution, opaque RGB in either format.
  const screenshot = await page.screenshot({ type: 'png', animations: 'disabled' });
  const image = sharp(screenshot)
    .resize(width, height, { kernel: 'lanczos3' })
    .flatten({ background: backgroundColor })
    .removeAlpha()
    .toColourspace('srgb');
  let encoded;
  if (format === 'jpeg') {
    // Preserve gradient edges with 4:4:4 chroma; lower quality only if necessary.
    for (const quality of [98, 96, 94, 92, 90, 88, 86, 84, 82, 80]) {
      const candidate = await image.clone()
        .jpeg({ quality, chromaSubsampling: '4:4:4', mozjpeg: true })
        .toBuffer();
      if (candidate.length < maxBytes) {
        encoded = candidate;
        break;
      }
    }
    assert.ok(encoded, 'Could not meet the file size limit without excessive compression.');
  } else {
    encoded = await image.png({ compressionLevel: 9, palette: false }).toBuffer();
  }
  assert.ok(encoded.length < maxBytes, 'The banner must fit the platform upload limit.');
  await writeFile(output, encoded);

  const metadata = await sharp(output).metadata();
  const { size } = await stat(output);
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
  assert.equal(metadata.format, format);
  assert.equal(metadata.channels, 3);
  assert.equal(metadata.hasAlpha, false);
  assert.equal(metadata.depth, 'uchar');
  assert.equal(metadata.space, 'srgb');
  assert.ok(size < maxBytes, 'The banner must fit the platform upload limit.');
  process.stdout.write(`${output}\n${width} x ${height} | RGB ${format.toUpperCase()} | ${size} bytes | Outfit 800 | ${theme}\n`);
  process.stdout.write(`Headline safe area verified: ${safeWidth} x ${safeHeight}, centered.\n`);
} finally {
  await browser.close();
}