/**
 * Google Play / YouTube banners: bold type over the website's faint icon texture.
 * Uses the website's self-hosted Outfit 800 face (or OUTFIT_FONT), not a fallback.
 * Run from the website with Node; requires its existing playwright and sharp.
 * Optional first argument: youtube. Default: google-play (original dimensions).
 */
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
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
};
const preset = process.argv[2] ?? 'google-play';
assert.ok(Object.hasOwn(presets, preset), 'Choose a google-play or youtube banner.');
const { width, height, fontSize, safeWidth, safeHeight, maxBytes, label } = presets[preset];
const output = resolve(directory, `lessgo-${preset}-banner-${width}x${height}.png`);
const foregroundScale = fontSize / 112;
const backgroundScaleX = width / 1024;
const backgroundScaleY = height / 500;
const brandGradient = 'linear-gradient(110deg, #0d9e94 0%, #3a63cc 30%, #7b3fd4 62%, #c60077 100%)';

/** Same icon family and seeded scatter as components/GlowIcons.tsx. */
function buildIconTexture() {
  const glyphs = [Plane, Martini, Tent, Gift, Luggage, Music, MapPin, Compass,
    Clapperboard, PartyPopper, Dumbbell, Volleyball, Disc3].map((icon) =>
    renderToStaticMarkup(createElement(icon, { size: 24, strokeWidth: 1.8, color: '#000' })),
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
      const glyph = glyphs[Math.floor(random() * glyphs.length)];
      const x = margin + (column + 0.5) * (width - margin * 2) / columns + (random() - 0.5) * 18 * foregroundScale;
      const y = margin + (row + 0.5) * (height - margin * 2) / rows + (random() - 0.5) * 18 * foregroundScale;
      const rotation = Math.round((random() - 0.5) * 52);
      const scale = ((0.56 + random() * 0.3) * foregroundScale).toFixed(3);
      body += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation}) scale(${scale}) translate(-12 -12)">${glyph}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

async function readOutfit() {
  if (process.env.OUTFIT_FONT) return readFile(process.env.OUTFIT_FONT);

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
        if (!/font-weight:\s*800\s*;/i.test(face)) continue;
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
const textureSource = `data:image/svg+xml;base64,${Buffer.from(buildIconTexture()).toString('base64')}`;
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hangouts made easy!</title>
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
        background: #ffffff;
        color: #0c0c0f;
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
        background: #ffffff;
      }

      /* The site's ambient glow, kept at the edges to preserve negative space. */
      .atmosphere {
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          radial-gradient(ellipse ${430 * backgroundScaleX}px ${310 * backgroundScaleY}px at 80% 8%, rgba(124, 72, 224, 0.065), transparent 74%),
          radial-gradient(ellipse ${410 * backgroundScaleX}px ${285 * backgroundScaleY}px at 14% 92%, rgba(13, 158, 148, 0.055), transparent 74%),
          radial-gradient(ellipse ${360 * backgroundScaleX}px ${265 * backgroundScaleY}px at 100% 100%, rgba(198, 0, 119, 0.035), transparent 74%);
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
    </style>
  </head>
  <body>
    <main id="artboard" aria-label="${label}">
      <div class="atmosphere" aria-hidden="true"></div>
      <div class="icon-texture" aria-hidden="true"><div class="icon-pattern"></div></div>
      <h1><span class="lead">Hangouts</span> <span class="accent">made easy!</span></h1>
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: 'light',
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
  assert.equal((await page.locator('body').innerText()).replace(/\s+/g, ' ').trim(), 'Hangouts made easy!');

  const safeLeft = (width - safeWidth) / 2;
  const safeTop = (height - safeHeight) / 2;
  for (const selector of ['h1', '.lead', '.accent']) {
    const bounds = await page.locator(selector).boundingBox();
    assert.ok(bounds && bounds.x >= safeLeft && bounds.y >= safeTop, `${selector} starts inside the safe area.`);
    assert.ok(bounds.x + bounds.width <= width - safeLeft && bounds.y + bounds.height <= height - safeTop,
      `${selector} ends inside the safe area.`);
  }

  // Supersample the type, then export opaque 24-bit RGB PNG (no alpha channel).
  const screenshot = await page.screenshot({ type: 'png', animations: 'disabled' });
  await sharp(screenshot)
    .resize(width, height, { kernel: 'lanczos3' })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .toColourspace('srgb')
    .png({ compressionLevel: 9, palette: false })
    .toFile(output);

  const metadata = await sharp(output).metadata();
  const { size } = await stat(output);
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.channels, 3);
  assert.equal(metadata.hasAlpha, false);
  assert.ok(size < maxBytes, 'The banner must fit the platform upload limit.');
  process.stdout.write(`${output}\n${width} x ${height} | RGB PNG | ${(size / 1024).toFixed(1)} KB | Outfit 800\n`);
  process.stdout.write(`Headline safe area verified: ${safeWidth} x ${safeHeight}, centered.\n`);
} finally {
  await browser.close();
}