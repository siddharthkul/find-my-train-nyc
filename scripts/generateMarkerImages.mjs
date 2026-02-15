#!/usr/bin/env node
/**
 * Generates pre-rendered PNG badge images for each subway route.
 * Outputs a TypeScript file mapping routeId → base64 data URI.
 *
 * These are used as the `image` prop on react-native-maps Marker,
 * which maps directly to MKAnnotationView.image on iOS — the most
 * reliable annotation rendering path.
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'src', 'data', 'mta', 'markerImages.ts');

const SIZE = 64; // px (renders at 2x for Retina)
const ROUTES = {
  '1': { color: '#EE352E', text: '1' },
  '2': { color: '#EE352E', text: '2' },
  '3': { color: '#EE352E', text: '3' },
  '4': { color: '#00933C', text: '4' },
  '5': { color: '#00933C', text: '5' },
  '6': { color: '#00933C', text: '6' },
  '7': { color: '#B933AD', text: '7' },
  A: { color: '#2850AD', text: 'A' },
  C: { color: '#2850AD', text: 'C' },
  E: { color: '#2850AD', text: 'E' },
  B: { color: '#FF6319', text: 'B' },
  D: { color: '#FF6319', text: 'D' },
  F: { color: '#FF6319', text: 'F' },
  M: { color: '#FF6319', text: 'M' },
  G: { color: '#6CBE45', text: 'G' },
  J: { color: '#996633', text: 'J' },
  Z: { color: '#996633', text: 'Z' },
  L: { color: '#A7A9AC', text: 'L' },
  N: { color: '#FCCC0A', text: 'N' },
  Q: { color: '#FCCC0A', text: 'Q' },
  R: { color: '#FCCC0A', text: 'R' },
  W: { color: '#FCCC0A', text: 'W' },
  S: { color: '#808183', text: 'S' },
  SI: { color: '#0039A6', text: 'SI' },
};

function badgeSvg(color, text) {
  const fontSize = text.length > 1 ? 28 : 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 1}" fill="${color}" stroke="white" stroke-width="2"/>
  <text x="${SIZE / 2}" y="${SIZE / 2}" text-anchor="middle" dominant-baseline="central"
        font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="${fontSize}" font-weight="700" fill="white">${text}</text>
</svg>`;
}

async function main() {
  const entries = [];

  for (const [routeId, { color, text }] of Object.entries(ROUTES)) {
    const svg = Buffer.from(badgeSvg(color, text));
    const png = await sharp(svg).resize(SIZE, SIZE).png().toBuffer();
    const b64 = png.toString('base64');
    entries.push(`  '${routeId}': { uri: 'data:image/png;base64,${b64}' }`);
  }

  // Also generate a fallback badge (dark gray)
  const fallbackSvg = Buffer.from(badgeSvg('#2C2C2E', '?'));
  const fallbackPng = await sharp(fallbackSvg).resize(SIZE, SIZE).png().toBuffer();
  const fallbackB64 = fallbackPng.toString('base64');

  const src = `// Auto-generated – do not edit manually.
// Pre-rendered PNG badge images for each subway route.
// Used as Marker \`image\` prop → MKAnnotationView.image (native, reliable).

import { ImageURISource } from 'react-native';

const BADGES: Record<string, ImageURISource> = {
${entries.join(',\n')}
};

const FALLBACK: ImageURISource = { uri: 'data:image/png;base64,${fallbackB64}' };

export function getRouteBadgeImage(routeId: string): ImageURISource {
  return BADGES[routeId?.toUpperCase()] ?? FALLBACK;
}
`;

  writeFileSync(OUT, src, 'utf-8');
  console.log(`✅ Wrote ${OUT} (${(src.length / 1024).toFixed(0)} KB, ${entries.length} badges)`);
}

main();
