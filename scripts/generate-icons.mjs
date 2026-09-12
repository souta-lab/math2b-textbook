#!/usr/bin/env node
/**
 * Generates the PWA icon set using Node built-ins only.
 *
 * This repository has no image tooling (no sharp, no ImageMagick, no librsvg),
 * so this script contains:
 *   1. a tiny software rasterizer — per-pixel analytic signed-distance
 *      coverage (the same idea as a shader), and
 *   2. a minimal PNG encoder — IHDR/IDAT/IEND chunks with CRC-32,
 *      compressed with node:zlib deflate.
 *
 * Artwork follows src/styles/tokens.css: a white sine curve with a vermillion
 * point at the crest, over the faint 方眼 (graph-paper) grid, on the ink-blue
 * brand plate (--accent #1f4e79).
 *
 * Run: node scripts/generate-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT_DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));

/** Brand palette (mirrors src/styles/tokens.css). */
const INK = [31, 78, 121]; // --accent  #1f4e79
const SHU = [179, 64, 47]; // --shu     #b3402f
const WHITE = [255, 255, 255];
const GRID_ALPHA = 0.1;

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const mod = (value, m) => ((value % m) + m) % m;

/** Signed distance to a rounded rectangle centred on the origin. */
function roundedRectDistance(x, y, halfW, halfH, radius) {
  const qx = Math.abs(x) - (halfW - radius);
  const qy = Math.abs(y) - (halfH - radius);
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    radius
  );
}

/** Distance from (px, py) to segment AB. */
function segmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0 ? 0 : clamp01(((px - ax) * abx + (py - ay) * aby) / lengthSq);
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

/** Distance to a polyline; clamped endpoints give the round caps. */
function polylineDistance(px, py, points) {
  let min = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    const d = segmentDistance(
      px,
      py,
      points[i - 1][0],
      points[i - 1][1],
      points[i][0],
      points[i][1],
    );
    if (d < min) min = d;
  }
  return min;
}

/** Source-over compositing of straight-alpha colors (channels 0..255, alpha 0..1). */
function composite(target, sr, sg, sb, sourceAlpha) {
  if (sourceAlpha <= 0) return;
  const a = target[3];
  const outAlpha = sourceAlpha + a * (1 - sourceAlpha);
  const keep = a * (1 - sourceAlpha);
  target[0] = (sr * sourceAlpha + target[0] * keep) / outAlpha;
  target[1] = (sg * sourceAlpha + target[1] * keep) / outAlpha;
  target[2] = (sb * sourceAlpha + target[2] * keep) / outAlpha;
  target[3] = outAlpha;
}

/** Artwork geometry, scaled to the requested icon size. */
function geometry(size) {
  const curve = [];
  const samples = 72;
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    curve.push([
      size * (0.24 + 0.52 * t),
      size * (0.5 - 0.17 * Math.sin(2 * Math.PI * t)),
    ]);
  }
  return {
    curve,
    curveHalfWidth: size * 0.037,
    dotCenter: [size * 0.37, size * 0.33],
    dotRadius: size * 0.04,
    gridStep: size / 8,
    gridOffset: size / 16,
    gridHalfWidth: size * 0.005,
    cornerRadius: size * 0.225,
  };
}

/**
 * Renders straight-alpha RGBA bytes with analytic anti-aliasing.
 * `rounded` gives rounded transparent corners (browser "any" icons); otherwise
 * the plate is flush to the edges (maskable / iOS, which apply their own mask).
 */
function renderRgba(size, rounded) {
  const g = geometry(size);
  const half = size / 2;
  const rgba = Buffer.alloc(size * size * 4);
  const pixel = [0, 0, 0, 0];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      pixel[0] = 0;
      pixel[1] = 0;
      pixel[2] = 0;
      pixel[3] = 0;

      const plateCoverage = rounded
        ? clamp01(
            0.5 -
              roundedRectDistance(px - half, py - half, half, half, g.cornerRadius),
          )
        : 1;
      composite(pixel, INK[0], INK[1], INK[2], plateCoverage);

      // Faint 方眼 (graph-paper) grid, clipped to the plate.
      const gridDistance = Math.min(
        Math.min(
          mod(px - g.gridOffset, g.gridStep),
          g.gridStep - mod(px - g.gridOffset, g.gridStep),
        ),
        Math.min(
          mod(py - g.gridOffset, g.gridStep),
          g.gridStep - mod(py - g.gridOffset, g.gridStep),
        ),
      );
      composite(
        pixel,
        WHITE[0],
        WHITE[1],
        WHITE[2],
        clamp01(0.5 - (gridDistance - g.gridHalfWidth)) * GRID_ALPHA * plateCoverage,
      );

      // White sine curve.
      const curveDistance = polylineDistance(px, py, g.curve) - g.curveHalfWidth;
      composite(pixel, WHITE[0], WHITE[1], WHITE[2], clamp01(0.5 - curveDistance));

      // Vermillion point on the crest.
      const dotDistance =
        Math.hypot(px - g.dotCenter[0], py - g.dotCenter[1]) - g.dotRadius;
      composite(pixel, SHU[0], SHU[1], SHU[2], clamp01(0.5 - dotDistance));

      const offset = (y * size + x) * 4;
      rgba[offset] = Math.round(pixel[0]);
      rgba[offset + 1] = Math.round(pixel[1]);
      rgba[offset + 2] = Math.round(pixel[2]);
      rgba[offset + 3] = Math.round(pixel[3] * 255);
    }
  }
  return rgba;
}

/* ------------------------------------------------------------ PNG encoder --- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([header.subarray(4), data])), 0);
  return Buffer.concat([header, data, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour + alpha
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method: adaptive
  ihdr[12] = 0; // interlace: none

  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------------------------------------------- SVG logo --- */

function renderSvg() {
  const size = 512;
  const g = geometry(size);
  const n = (value) => Number(value.toFixed(1));

  const curvePath = g.curve
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`)
    .join(' ');

  const gridPath = [];
  for (let i = 0; i < 8; i += 1) {
    const p = n(g.gridOffset + i * g.gridStep);
    gridPath.push(`M${p} 0V${size}`, `M0 ${p}H${size}`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="高校数学 読解教材">
  <title>高校数学 読解教材</title>
  <defs>
    <clipPath id="plate">
      <rect width="512" height="512" rx="${n(g.cornerRadius)}"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="${n(g.cornerRadius)}" fill="#1f4e79"/>
  <g clip-path="url(#plate)" stroke="#ffffff" stroke-opacity="${GRID_ALPHA}" stroke-width="${n(g.gridHalfWidth * 2)}">
    <path d="${gridPath.join(' ')}"/>
  </g>
  <path d="${curvePath}" fill="none" stroke="#ffffff" stroke-width="${n(g.curveHalfWidth * 2)}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${n(g.dotCenter[0])}" cy="${n(g.dotCenter[1])}" r="${n(g.dotRadius)}" fill="#b3402f"/>
</svg>`;
}

/* --------------------------------------------------------------------- main --- */

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true },
  { file: 'icon-512.png', size: 512, rounded: true },
  { file: 'icon-maskable-512.png', size: 512, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, rounded: false },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { file, size, rounded } of targets) {
  const png = encodePng(size, renderRgba(size, rounded));
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`public/icons/${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KiB`);
}

writeFileSync(join(OUT_DIR, 'icon.svg'), `${renderSvg()}\n`);
console.log('public/icons/icon.svg  vector');
