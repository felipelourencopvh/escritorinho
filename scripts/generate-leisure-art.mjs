#!/usr/bin/env node
/**
 * Draws Escritorinho's leisure furniture (TV, kitchen counter, fridge,
 * microwave) as pixel art PNGs, in the bundled furniture's palette:
 * dark outlines, grey electronics, wood cabinets. Run from the repo root:
 *
 *   node scripts/generate-leisure-art.mjs
 *
 * It (re)writes webview-ui/public/assets/furniture/{TV,KITCHEN_COUNTER,FRIDGE,MICROWAVE}/.
 */
import fs from 'node:fs';
import path from 'node:path';

import { PNG } from 'pngjs';

const OUT = path.resolve('webview-ui/public/assets/furniture');

const C = {
  outline: '#3f3740',
  outlineWood: '#532e3d',
  frame: '#2b2a30',
  bezel: '#595e60',
  grey: '#757b7c',
  greyLight: '#b5bfc7',
  white: '#e1e3e9',
  shine: '#ffffff',
  woodDark: '#885c47',
  wood: '#b38857',
  woodLight: '#cfa86d',
  sky: '#7fb6e8',
  skyLight: '#a9d3f5',
  hill: '#60c677',
  hillDark: '#4a9e5c',
  sun: '#f6d36b',
  led: '#e64566',
  glow: '#f2c94c',
  glowDeep: '#e8a33d',
};

function canvas(w, h) {
  return { w, h, px: Array.from({ length: h }, () => Array(w).fill(null)) };
}
function dot(c, x, y, color) {
  if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.px[y][x] = color;
}
function rect(c, x, y, w, h, color) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dot(c, i, j, color);
}
function box(c, x, y, w, h, line, fill) {
  rect(c, x, y, w, h, line);
  if (fill) rect(c, x + 1, y + 1, w - 2, h - 2, fill);
}
function write(c, dir, file) {
  const png = new PNG({ width: c.w, height: c.h });
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const i = (y * c.w + x) * 4;
      const color = c.px[y][x];
      if (!color) {
        png.data[i + 3] = 0;
        continue;
      }
      png.data[i] = parseInt(color.slice(1, 3), 16);
      png.data[i + 1] = parseInt(color.slice(3, 5), 16);
      png.data[i + 2] = parseInt(color.slice(5, 7), 16);
      png.data[i + 3] = 255;
    }
  }
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, dir, file), PNG.sync.write(png));
}
function manifest(dir, data) {
  fs.writeFileSync(path.join(OUT, dir, 'manifest.json'), JSON.stringify(data, null, 2) + '\n');
}

// ── TV: wall-mounted, 2×2 tiles, a little landscape on the screen ──
{
  const c = canvas(32, 32);
  box(c, 1, 11, 30, 16, C.frame, C.bezel); // outer frame + bezel
  rect(c, 2, 12, 28, 1, C.grey); // top highlight of the bezel
  box(c, 3, 13, 26, 11, C.frame, C.sky); // screen
  rect(c, 4, 14, 24, 3, C.skyLight); // brighter sky up top
  // sun
  rect(c, 22, 15, 3, 3, C.sun);
  dot(c, 21, 16, C.sun);
  dot(c, 25, 16, C.sun);
  dot(c, 23, 14, C.sun);
  // cloud
  rect(c, 7, 16, 5, 1, C.shine);
  rect(c, 8, 15, 3, 1, C.shine);
  // hills
  rect(c, 4, 21, 24, 2, C.hill);
  rect(c, 6, 20, 7, 1, C.hill);
  rect(c, 8, 19, 3, 1, C.hill);
  rect(c, 16, 20, 9, 1, C.hillDark);
  rect(c, 18, 19, 5, 1, C.hillDark);
  rect(c, 4, 22, 24, 1, C.hillDark);
  // power LED on the bottom bezel
  dot(c, 27, 25, C.led);
  rect(c, 1, 26, 30, 1, C.frame);
  write(c, 'TV', 'TV.png');
  manifest('TV', {
    id: 'TV',
    name: 'TV',
    category: 'wall',
    type: 'asset',
    canPlaceOnWalls: true,
    canPlaceOnSurfaces: false,
    backgroundTiles: 0,
    width: 32,
    height: 32,
    footprintW: 2,
    footprintH: 2,
  });
}

// ── Kitchen counter: 2×2 tiles, the top row is its worktop (walk-behind) ──
{
  const c = canvas(32, 32);
  // worktop
  box(c, 0, 12, 32, 8, C.outlineWood, C.white);
  rect(c, 1, 13, 30, 1, C.shine);
  rect(c, 1, 18, 30, 1, C.greyLight);
  // cabinets
  box(c, 0, 19, 32, 12, C.outlineWood, C.wood);
  rect(c, 1, 20, 30, 1, C.woodLight);
  for (const x of [1, 11, 21]) {
    box(c, x + 1, 21, 9, 8, C.woodDark, C.wood);
    rect(c, x + 7, 24, 1, 3, C.outline); // handle
  }
  rect(c, 0, 31, 32, 1, C.outlineWood); // toe kick
  write(c, 'KITCHEN_COUNTER', 'KITCHEN_COUNTER.png');
  manifest('KITCHEN_COUNTER', {
    id: 'KITCHEN_COUNTER',
    name: 'Kitchen Counter',
    category: 'desks',
    type: 'asset',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: false,
    backgroundTiles: 1,
    width: 32,
    height: 32,
    footprintW: 2,
    footprintH: 2,
  });
}

// ── Fridge: 1×2 tiles ──
{
  const c = canvas(16, 32);
  box(c, 1, 3, 14, 28, C.outline, C.white);
  rect(c, 2, 4, 1, 26, C.shine); // left highlight
  rect(c, 13, 4, 1, 26, C.greyLight); // right shade
  rect(c, 2, 13, 12, 1, C.outline); // freezer / fridge split
  rect(c, 11, 7, 1, 4, C.grey); // handles
  rect(c, 11, 16, 1, 7, C.grey);
  rect(c, 2, 31, 2, 1, C.outline); // feet
  rect(c, 12, 31, 2, 1, C.outline);
  write(c, 'FRIDGE', 'FRIDGE.png');
  manifest('FRIDGE', {
    id: 'FRIDGE',
    name: 'Fridge',
    category: 'storage',
    type: 'asset',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: false,
    backgroundTiles: 1,
    width: 16,
    height: 32,
    footprintW: 1,
    footprintH: 2,
  });
}

// ── Microwave: sits on a counter, popcorn glowing inside ──
{
  const c = canvas(16, 16);
  box(c, 0, 5, 16, 10, C.outline, C.grey);
  rect(c, 1, 6, 14, 1, C.greyLight);
  box(c, 2, 7, 9, 6, C.frame, C.glowDeep); // door window
  rect(c, 3, 8, 7, 2, C.glow);
  dot(c, 5, 10, C.shine);
  dot(c, 7, 11, C.shine);
  rect(c, 12, 8, 2, 1, C.white); // keypad
  rect(c, 12, 10, 2, 1, C.white);
  dot(c, 12, 12, C.led);
  rect(c, 1, 15, 14, 1, C.outline);
  write(c, 'MICROWAVE', 'MICROWAVE.png');
  manifest('MICROWAVE', {
    id: 'MICROWAVE',
    name: 'Microwave',
    category: 'electronics',
    type: 'asset',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
    backgroundTiles: 0,
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
  });
}

console.log('leisure furniture written to', OUT);
