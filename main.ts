// THE WORLD TODAY — front page for Tuesday 24 November 2026.
// Drawn entirely in code: a 1024x1024 newspaper page, no photos, no
// network, no fonts on disk. A tiny 5x7 bitmap alphabet, a software
// canvas, and a hand-rolled PNG writer (zlib from the Node standard
// library). Output is deterministic: same bytes on every run.

import * as fs from "node:fs";
import * as path from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [247, 241, 222];
const INK: RGB = [20, 20, 20];
const RED: RGB = [176, 30, 36];
const BLUE: RGB = [29, 78, 137];
const NAVY: RGB = [16, 32, 64];
const GREEN: RGB = [30, 122, 52];
const GOLD: RGB = [200, 144, 26];
const TEAL: RGB = [14, 110, 120];
const GREY: RGB = [120, 118, 108];
const LIGHT: RGB = [255, 252, 240];
const ORANGE: RGB = [214, 96, 20];
const SKY: RGB = [178, 214, 235];
const SEA: RGB = [24, 68, 110];

type RGB = [number, number, number];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}
function dot(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) dot(xx, yy, c);
}
function frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  rect(x, y, w, t, c); rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c); rect(x + w - t, y, t, h, c);
}
function hline(x0: number, x1: number, y: number, c: RGB, t: number): void {
  for (let t2 = 0; t2 < t; t2++) for (let x = x0; x <= x1; x++) dot(x, y + t2, c);
}
function vline(x: number, y0: number, y1: number, c: RGB, t: number): void {
  for (let t2 = 0; t2 < t; t2++) for (let y = y0; y <= y1; y++) dot(x + t2, y, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t: number): void {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    for (let a = -t; a <= t; a++) for (let b = -t; b <= t; b++) dot(x + a, y + b, c);
  }
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) dot(cx + x, cy + y, c);
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
    const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
    const g = 1 - a - b;
    if (a >= 0 && b >= 0 && g >= 0) dot(x, y, c);
  }
}

// ------------------------------------------------------- 5x7 bitmap font
// Each glyph: 7 rows of 5 bits, written as strings. Uppercase only;
// text() folds input to upper case, unknown chars become a blank.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  ":": ["00000", "01100", "00000", "00000", "01100", "00000", "00000"],
  ";": ["00000", "01100", "00000", "01100", "00100", "01000", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "<": ["00001", "00010", "00100", "01000", "00100", "00010", "00001"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
};
const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function textWidth(s: string, scale: number): number {
  return s.length * (5 * scale + scale) - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = GLYPHS[ch] ?? BLANK;
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1") rect(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 6 * scale;
  }
}
function drawTextC(x: number, y: number, w: number, s: string, scale: number, c: RGB): void {
  drawText(x + Math.max(0, Math.floor((w - textWidth(s, scale)) / 2)), y, s, scale, c);
}
// Greedy word wrap; returns lines that fit maxWidth at the given scale.
function wrap(s: string, scale: number, maxWidth: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxWidth) cur = trial;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function para(x: number, y: number, s: string, scale: number, maxWidth: number, c: RGB, gap: number): number {
  const lines = wrap(s, scale, maxWidth);
  let yy = y;
  for (const ln of lines) {
    drawText(x, yy, ln, scale, c);
    yy += 7 * scale + gap;
  }
  return yy;
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function writePng(file: string): void {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

// ============================================================== the page
fill(PAPER);
const MX = 28; // page margin
const RX = W - MX; // right edge

// ---- masthead
drawTextC(MX, 30, RX - MX, "THE WORLD TODAY", 8, INK);
hline(MX, RX, 108, INK, 4);
drawTextC(MX, 120, RX - MX, "TUESDAY 24 NOVEMBER 2026  *  ONE DAY, ONE PAGE, THE WHOLE WORLD", 2, INK);
hline(MX, RX, 146, RED, 3);
// market ticker
rect(MX, 154, RX - MX, 30, NAVY);
drawText(MX + 12, 162, "NVDA +31%   NASDAQ +6.5%   S&P 500 +4.7%   DOW +3.0%   SK HYNIX +21%", 2, [255, 220, 90]);

// ---- lead story: Nvidia
const LX = MX, LW = 636;
drawText(LX, 200, "LEAD STORY  -  TECHNOLOGY", 2, RED);
para(LX, 224, "HUANG IS BACK:", 4, LW, INK, 2);
para(LX, 262, "NVIDIA REINSTATES", 4, LW, INK, 2);
para(LX, 300, "ITS CEO", 4, LW, INK, 2);
// lead scene: chip + soaring chart
const SY = 348, SH = 132;
rect(LX, SY, LW, SH, NAVY);
for (let i = 0; i < 5; i++) { // chip pins
  rect(LX + 26 + i * 26, SY + 8, 8, 10, GOLD);
  rect(LX + 26 + i * 26, SY + SH - 18, 8, 10, GOLD);
}
rect(LX + 22, SY + 28, 132, 76, GREEN);
frame(LX + 22, SY + 28, 132, 76, LIGHT, 2);
drawText(LX + 44, SY + 52, "NVDA", 3, LIGHT);
drawText(LX + 52, SY + 80, "+31%", 2, [255, 220, 90]);
// rising chart
const pts: [number, number][] = [[180, 118], [250, 104], [300, 112], [380, 84], [450, 92], [540, 40], [610, 18]];
for (let i = 0; i < pts.length - 1; i++)
  line(LX + pts[i][0], SY + pts[i][1], LX + pts[i + 1][0], SY + pts[i + 1][1], [255, 220, 90], 2);
tri(LX + 596, SY + 4, LX + 624, SY + 12, LX + 600, SY + 30, [255, 220, 90]);
drawText(LX + 190, SY + 8, "ONE DAY: +$950BN", 1, LIGHT);
para(LX, 492, "Eleven days after Jensen Huang resigned over affair and espionage revelations, Nvidia's board voted unanimously to bring him back - after direct intervention by President Trump. Wall Street cheered: Nvidia jumped 31%, its best day since 2003.", 1, LW, INK, 3);

// ---- right rail: markets box
const CX = LX + LW + 16, CW = RX - CX;
rect(CX, 200, CW, 318, LIGHT);
frame(CX, 200, CW, 318, INK, 2);
drawText(CX + 12, 212, "MARKETS ROAR", 2, RED);
drawText(CX + 12, 232, "BACK", 2, RED);
hline(CX + 12, CX + CW - 12, 258, INK, 2);
const mrows: [string, string][] = [
  ["NASDAQ", "+6.5%"],
  ["S&P 500", "+4.7%"],
  ["DOW", "+3.0%"],
  ["NVDA", "+31.5%"],
  ["SK HYNIX", "+21%"],
  ["MICRON", "+19%"],
  ["TESLA", "+11%"],
];
let my = 272;
for (const [k, v] of mrows) {
  drawText(CX + 12, my, k, 2, INK);
  drawText(CX + CW - 12 - textWidth(v, 2), my, v, 2, GREEN);
  my += 26;
}
para(CX + 12, my + 2, "Biggest Wall Street rally since April 2025. Asia followed: Seoul's KOSPI +5.9% on Tuesday.", 1, CW - 24, INK, 2);

// ---- story panels, 2 x 2
function panel(x: number, y: number, w: number, h: number, tag: string, accent: RGB): number {
  rect(x, y, w, h, LIGHT);
  frame(x, y, w, h, INK, 2);
  rect(x + 2, y + 2, w - 4, 26, accent);
  drawText(x + 12, y + 9, tag, 2, LIGHT);
  return y + 34;
}
function panelHead(x: number, y: number, w: number, s: string): number {
  return para(x + 12, y, s, 2, w - 24, INK, 2);
}
const PY = 536, PH = 208, PW = 476, PG = 16;
const P2X = MX + PW + PG;

// Panel 1 — Iran
let py = panel(MX, PY, PW, PH, "MIDDLE EAST  -  IRAN", TEAL);
rect(MX + 12, py, PW - 24, 62, SEA);
rect(MX + 12, py + 40, PW - 24, 22, [10, 48, 80]); // sea band
rect(MX + 40, py + 18, 150, 16, [40, 40, 40]); // tanker hull
rect(MX + 150, py + 4, 34, 14, [40, 40, 40]);
rect(MX + 60, py + 26, 110, 6, ORANGE);
drawText(MX + 240, py + 12, "$290BN", 3, [255, 220, 90]);
drawText(MX + 240, py + 40, "DEMAND", 2, LIGHT);
py = panelHead(MX, py + 70, PW, "TEHRAN DEMANDS $290BN FROM US");
para(MX + 12, py, "Iranian courts order the US to pay $290bn in damages and sue Gulf states for hosting US strikes. Tehran vows to break the US naval blockade by all means.", 1, PW - 24, INK, 2);

// Panel 2 — Korea
py = panel(P2X, PY, PW, PH, "EAST ASIA  -  KOREA", BLUE);
rect(P2X + 12, py, PW - 24, 62, SKY);
disc(P2X + 90, py + 42, 22, GREEN); // Ulleung island
disc(P2X + 126, py + 48, 13, GREEN);
tri(P2X + 260, py + 18, P2X + 300, py + 30, P2X + 260, py + 42, [90, 90, 90]); // jet
tri(P2X + 330, py + 8, P2X + 370, py + 20, P2X + 330, py + 32, [90, 90, 90]);
drawText(P2X + 400, py + 12, "!", 3, RED);
py = panelHead(P2X, py + 70, PW, "RUSSIAN JETS BUZZ KOREA");
para(P2X + 12, py, "Seoul scrambles fighters as several Russian planes enter its air defence zone near Ulleung Island. A shelter alert sounds, then lifts in five minutes. No airspace violated.", 1, PW - 24, INK, 2);

// Panel 3 — Merkury
py = panel(MX, PY + PH + PG, PW, PH, "MEDITERRANEAN  -  LIBYA", NAVY);
rect(MX + 12, py, PW - 24, 62, SEA);
rect(MX + 30, py + 34, 170, 14, [120, 120, 120]); // capsized corvette
tri(MX + 30, py + 34, MX + 60, py + 12, MX + 90, py + 34, [120, 120, 120]);
disc(MX + 260, py + 20, 14, ORANGE); // blast
disc(MX + 260, py + 20, 7, [255, 220, 90]);
rect(MX + 330, py + 40, 70, 10, [60, 60, 60]); // sea drone
drawText(MX + 330, py + 12, "7 DRONES", 1, LIGHT);
py = panelHead(MX, py + 70, PW, "UKRAINE SINKS WARSHIP OFF LIBYA");
para(MX + 12, py, "Seven sea drones sink the corvette Merkury, one of Russia's newest ships, at Benghazi naval base, and hit the cargo ship Angara. Moscow vows a response.", 1, PW - 24, INK, 2);

// Panel 4 — Dymer
py = panel(P2X, PY + PH + PG, PW, PH, "UKRAINE  -  KYIV REGION", RED);
rect(P2X + 12, py, PW - 24, 62, [210, 205, 190]);
rect(P2X + 40, py + 10, 90, 52, [90, 88, 84]); // flats
rect(P2X + 140, py + 26, 60, 36, [60, 58, 54]); // collapsed wing
for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++)
  rect(P2X + 50 + c2 * 26, py + 16 + r * 14, 12, 8, [255, 220, 90]);
disc(P2X + 330, py + 30, 18, ORANGE);
drawText(P2X + 380, py + 12, "11 DEAD", 2, RED);
py = panelHead(P2X, py + 70, PW, "DRONE FLATTENS FLATS NEAR KYIV");
para(P2X + 12, py, "A Russian drone strike collapses a five-storey block in Dymer, killing 11. Rescuers pull a boy alive from the rubble as the regional toll climbs to 14.", 1, PW - 24, INK, 2);

// ---- footer
const FY = PY + PH * 2 + PG + 12;
hline(MX, RX, FY, INK, 3);
para(MX, FY + 10, "SOURCES: REUTERS, AP, BLOOMBERG, NPR, YONHAP, AFP, AJU PRESS - ALL STORIES FIRST REPORTED 23-24 NOV 2026.", 1, RX - MX, GREY, 2);
para(MX, FY + 26, "DRAWN ENTIRELY IN CODE - NO PHOTOS, NO FONTS, NO NETWORK. A NEWSPAPER THAT FITS IN ONE IMAGE.", 1, RX - MX, GREY, 2);

// ---- write it
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
fs.mkdirSync(outDir, { recursive: true });
writePng(path.join(outDir, "entry.png"));
