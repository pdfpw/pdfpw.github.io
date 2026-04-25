/**
 * Generates all brand assets (favicon, PWA icons, OGP image) from the icon design.
 * Run: node scripts/generate-icons.mjs
 *
 * Requires @napi-rs/canvas (transitive dep via jsdom).
 */

import { createCanvas, GlobalFonts } from '../node_modules/.pnpm/@napi-rs+canvas@0.1.84/node_modules/@napi-rs/canvas/index.js'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '../public')

// Register Geist font for OGP text
const GEIST_DIR = join(
  __dirname,
  '../node_modules/.pnpm/@fontsource+geist-sans@5.2.5/node_modules/@fontsource/geist-sans/files',
)
try {
  GlobalFonts.registerFromPath(join(GEIST_DIR, 'geist-sans-latin-400-normal.woff2'), 'Geist')
  GlobalFonts.registerFromPath(join(GEIST_DIR, 'geist-sans-latin-500-normal.woff2'), 'Geist')
  GlobalFonts.registerFromPath(join(GEIST_DIR, 'geist-sans-latin-700-normal.woff2'), 'Geist')
  console.log('✓ Geist font registered')
} catch {
  console.warn('Could not register Geist font, using system font fallback')
}

// Brand colors (dark mode)
const C = {
  bg: '#070709',
  surface: '#0B0B0F',
  raised: '#1C1C24',
  accent: '#06B6D4',
  accentFg: '#052B33',
  fg: '#F5F5F7',
  muted: '#A8A8B2',
}

// ----- Drawing helpers -----

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function fillRR(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

/**
 * Draw the icon design.
 * @param {boolean} background - whether to draw the dark background square
 * @param {boolean} maskable   - use solid (non-rounded) background for maskable icons
 */
function drawIcon(ctx, x0, y0, size, { background = true, maskable = false } = {}) {
  const s = size / 512
  const r = (v) => v * s
  const ri = (v) => Math.max(1, Math.round(v * s))

  if (background) {
    if (maskable) {
      ctx.fillStyle = C.surface
      ctx.fillRect(x0, y0, size, size)
    } else {
      fillRR(ctx, x0, y0, size, size, ri(80), C.surface)
    }
  }

  // Back slide (upper right): represents next/queued slide
  const bx = x0 + r(170)
  const by = y0 + r(90)
  const sw = r(284)
  const sh = r(178)
  const sr = ri(14)

  fillRR(ctx, bx, by, sw, sh, sr, C.raised)
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = Math.max(0.5, r(1.5))
  roundRect(ctx, bx, by, sw, sh, sr)
  ctx.stroke()

  if (size >= 32) {
    const blx = x0 + r(200)
    fillRR(ctx, blx, y0 + r(132), r(144), ri(10), ri(5), 'rgba(255,255,255,0.15)')
    fillRR(ctx, blx, y0 + r(152), r(104), ri(9), ri(4), 'rgba(255,255,255,0.09)')
    fillRR(ctx, blx, y0 + r(170), r(124), ri(9), ri(4), 'rgba(255,255,255,0.09)')
  }

  // Front slide (lower left): represents current/active slide
  const fx = x0 + r(58)
  const fy = y0 + r(244)

  fillRR(ctx, fx, fy, sw, sh, sr, C.accent)

  if (size >= 32) {
    const flx = x0 + r(88)
    fillRR(ctx, flx, y0 + r(286), r(160), ri(12), ri(6), 'rgba(5,43,51,0.55)')
    fillRR(ctx, flx, y0 + r(310), r(118), ri(10), ri(5), 'rgba(5,43,51,0.38)')
    fillRR(ctx, flx, y0 + r(328), r(138), ri(10), ri(5), 'rgba(5,43,51,0.38)')
  }
}

// ----- ICO encoder -----

function buildIco(images) {
  const count = images.length
  const dataOffset = 6 + 16 * count
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  let offset = dataOffset
  const entries = images.map(({ w, h, png }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(w >= 256 ? 0 : w, 0)
    e.writeUInt8(h >= 256 ? 0 : h, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

// ----- Render helpers -----

function renderIcon(size, opts) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  drawIcon(ctx, 0, 0, size, opts)
  return canvas.toBuffer('image/png')
}

function save(filename, buffer) {
  writeFileSync(join(PUBLIC, filename), buffer)
  console.log(`✓ ${filename}`)
}

// ----- Generate icon PNGs -----

console.log('\nGenerating icons...')

const png16 = renderIcon(16)
const png32 = renderIcon(32)
const png192 = renderIcon(192)
const png512 = renderIcon(512)
const pngMaskable = renderIcon(512, { maskable: true })
const pngApple = renderIcon(180)

save('favicon.ico', buildIco([
  { w: 16, h: 16, png: png16 },
  { w: 32, h: 32, png: png32 },
]))
save('logo192.png', png192)
save('logo512.png', png512)
save('icon-maskable.png', pngMaskable)
save('apple-touch-icon.png', pngApple)

// ----- Generate OGP image (1200×630) -----

console.log('\nGenerating OGP image...')

const OG_W = 1200
const OG_H = 630
const og = createCanvas(OG_W, OG_H)
const ctx = og.getContext('2d')

// Background
ctx.fillStyle = C.bg
ctx.fillRect(0, 0, OG_W, OG_H)

// Subtle grid
ctx.strokeStyle = 'rgba(255,255,255,0.025)'
ctx.lineWidth = 1
for (let x = 60; x < OG_W; x += 60) {
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, OG_H); ctx.stroke()
}
for (let y = 60; y < OG_H; y += 60) {
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(OG_W, y); ctx.stroke()
}

// Icon with glow (left side: 0–560, centered)
const ICON_SIZE = 380
const iconX = Math.round((560 - ICON_SIZE) / 2)  // = 90
const iconY = Math.round((OG_H - ICON_SIZE) / 2)  // = 125

// Cyan glow behind icon
ctx.shadowColor = 'rgba(6,182,212,0.15)'
ctx.shadowBlur = 60
ctx.shadowOffsetX = 0
ctx.shadowOffsetY = 8
ctx.fillStyle = C.surface
roundRect(ctx, iconX, iconY, ICON_SIZE, ICON_SIZE, Math.round(80 * ICON_SIZE / 512))
ctx.fill()
ctx.shadowColor = 'transparent'
ctx.shadowBlur = 0
ctx.shadowOffsetX = 0
ctx.shadowOffsetY = 0

// Icon slides (no background, already drawn above)
drawIcon(ctx, iconX, iconY, ICON_SIZE, { background: false })

// Vertical separator
ctx.strokeStyle = C.accent
ctx.lineWidth = 2
ctx.globalAlpha = 0.5
ctx.beginPath()
ctx.moveTo(590, 72)
ctx.lineTo(590, 558)
ctx.stroke()
ctx.globalAlpha = 1

// Text (right side: 630–1160)
const TX = 638
const font = (w, px) => `${w} ${px}px Geist, "Ubuntu Sans", "DejaVu Sans", sans-serif`

// "pdfpw" wordmark
ctx.fillStyle = C.fg
ctx.font = font(700, 92)
ctx.fillText('pdfpw', TX, 280)

// Subtitle
ctx.fillStyle = C.muted
ctx.font = font(400, 28)
ctx.fillText('PDF Presenter Web', TX, 328)

// Tagline
ctx.font = font(400, 22)
ctx.fillText('Browser-based PDF presenter console', TX, 376)
ctx.fillText('(pdfpc-compatible)', TX, 406)

// URL
ctx.fillStyle = C.accent
ctx.font = font(500, 22)
ctx.fillText('pdfpw.github.io', TX, 468)

save('og-image.png', og.toBuffer('image/png'))

console.log('\nDone.')
