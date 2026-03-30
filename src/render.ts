import { prepareWithSegments, layoutNextLine, clearCache } from '@chenglou/pretext'
import type { PreparedText, LayoutCursor } from '@chenglou/pretext'
import { THEMES, TEXTS } from './config'
import type { AppState, AnimState, Contour } from './config'
import { computeContours } from './image'

// ── Caches ────────────────────────────────────────────────────────────
let _prepared: PreparedText | null = null,
  _pFont = '',
  _pText = ''
let _contours: (Contour | null)[] | null = null,
  _cLines = 0

function getPrepared(text: string, font: string): PreparedText {
  if (_prepared && _pFont === font && _pText === text) return _prepared
  if (_prepared) clearCache()
  _pFont = font
  _pText = text
  _prepared = prepareWithSegments(text, font)
  return _prepared
}

function getBaseContours(state: AppState, numLines: number): (Contour | null)[] {
  if (_contours && _cLines === numLines) return _contours
  _contours = computeContours(state.imageData!.data, state.imgW, state.imgH, numLines, state.bgColor)
  _cLines = numLines
  return _contours
}

export function invalidateContours(): void {
  _contours = null
}

// ── Helpers ───────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ── Effective contours (morph + breathing) ────────────────────────────
function getEffectiveContours(
  base: (Contour | null)[],
  numLines: number,
  state: AppState,
  anim: AnimState,
  time: number,
): (Contour | null)[] {
  const out: (Contour | null)[] = new Array(numLines)
  const breath = 0.022 * Math.sin(time * 0.0015)
  let mt = 0
  if (anim.morph.active) {
    mt = ease(Math.min(1, (performance.now() - anim.morph.startTime) / anim.morph.duration))
    if (mt >= 1) anim.morph.active = false
  }

  for (let i = 0; i < numLines; i++) {
    const b = base[i]
    let left: number, right: number

    if (anim.morph.active || (mt > 0 && mt < 1)) {
      const sL = anim.morph.from === 'contour' ? (b ? b.left : -1) : 0
      const sR = anim.morph.from === 'contour' ? (b ? b.right : -1) : 1
      const dL = anim.morph.to === 'contour' ? (b ? b.left : -1) : 0
      const dR = anim.morph.to === 'contour' ? (b ? b.right : -1) : 1
      if (sL < 0 && dL < 0) {
        out[i] = null
        continue
      }
      left = lerp(sL < 0 ? 0.5 : sL, dL < 0 ? 0.5 : dL, mt)
      right = lerp(sR < 0 ? 0.5 : sR, dR < 0 ? 0.5 : dR, mt)
    } else if (state.mode === 'contour') {
      if (!b) {
        out[i] = null
        continue
      }
      left = b.left
      right = b.right
    } else {
      left = 0
      right = 1
    }

    left = Math.max(0, left + breath)
    right = Math.min(1, right - breath)
    out[i] = right - left > 0.02 ? { left, right } : null
  }
  return out
}

// ── Pixel sampling ────────────────────────────────────────────────────
function samplePixel(state: AppState, x: number, y: number, cw: number, ch: number): number {
  const { imgW: w, imgH: h } = state
  const ix = Math.min(w - 1, Math.max(0, ((x / cw) * w) | 0))
  const iy = Math.min(h - 1, Math.max(0, ((y / ch) * h) | 0))
  return (iy * w + ix) * 4
}

// ── Render one line ───────────────────────────────────────────────────
function renderLine(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  anim: AnimState,
  text: string,
  sx: number,
  y: number,
  lh: number,
  cw: number,
  ch: number,
  isOrig: boolean,
  tc: [number, number, number] | undefined,
  con: number,
  offset: number,
  limit: number,
  shX: number,
  shY: number,
  now: number,
): number {
  const data = state.imageData!.data
  const sw = state.fontSize * 1.8
  let x = sx,
    count = 0

  for (const char of text) {
    const w = ctx.measureText(char).width
    count++
    if (!char.trim()) {
      x += w
      continue
    }
    if (offset + count > limit) {
      x += w
      continue
    }

    const idx = samplePixel(state, x + w / 2, y + lh / 2, cw, ch)
    const r = data[idx],
      g = data[idx + 1],
      b = data[idx + 2],
      a = data[idx + 3]
    const bri = ((0.299 * r + 0.587 * g + 0.114 * b) / 255) * (a / 255)

    let ox = shX * bri,
      oy = shY * bri,
      fade = 1

    // Katana slash — trail segment displacement
    const ccx = x + w / 2,
      ccy = y + lh / 2
    const pts = anim.slash.trail
    for (let ci = 1; ci < pts.length; ci++) {
      const p0 = pts[ci - 1],
        p1 = pts[ci]
      const age = (now - p1.time) / anim.slash.maxAge
      if (age >= 1) continue
      const segDx = p1.x - p0.x,
        segDy = p1.y - p0.y
      const segLen2 = segDx * segDx + segDy * segDy
      if (segLen2 < 1) continue
      const t = Math.max(0, Math.min(1, ((ccx - p0.x) * segDx + (ccy - p0.y) * segDy) / segLen2))
      const px = ccx - (p0.x + t * segDx),
        py = ccy - (p0.y + t * segDy)
      const dist = Math.sqrt(px * px + py * py)
      if (dist >= sw) continue
      const ageFade = 1 - age
      const spdF = Math.min(1, (p1.spd || 0) / 12)
      const dt = 1 - dist / sw
      const str = dt * dt * ageFade * spdF
      if (dist > 0.5) {
        const n = str / dist
        ox += px * n * sw * 0.9
        oy += py * n * sw * 0.9
      }
      if (dist < sw * 0.04) {
        fade *= (dist / (sw * 0.04)) * ageFade * spdF + (1 - ageFade * spdF)
      }
    }

    if (isOrig) {
      if (bri < 0.01) {
        x += w
        continue
      }
      const bo = Math.min(3, Math.pow(bri, 1 / con) / bri)
      ctx.fillStyle = `rgba(${Math.min(255, (r * bo + 0.5) | 0)},${Math.min(255, (g * bo + 0.5) | 0)},${Math.min(255, (b * bo + 0.5) | 0)},${fade.toFixed(3)})`
    } else {
      const al = Math.pow(bri, 1 / con) * fade
      if (al < 0.03) {
        x += w
        continue
      }
      ctx.fillStyle = `rgba(${tc![0]},${tc![1]},${tc![2]},${al.toFixed(3)})`
    }

    ctx.fillText(char, x + ox, y + oy)
    x += w
  }
  return count
}

// ── Main render frame ─────────────────────────────────────────────────
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: AppState,
  anim: AnimState,
  text: string,
  time: number,
): void {
  if (!state.imageData) return

  const { fontSize, theme: tn, contrast } = state
  const theme = THEMES[tn]
  const font = `${fontSize}px "Noto Sans JP", sans-serif`
  const lh = Math.ceil(fontSize * 1.5)
  const dpr = devicePixelRatio || 1

  const cw = Math.min(innerWidth - 40, 900)
  const ch = Math.floor((cw * state.imgH) / state.imgW)
  const tw = cw * dpr,
    th = ch * dpr

  if (canvas.width !== tw || canvas.height !== th) {
    canvas.width = tw
    canvas.height = th
    canvas.style.width = cw + 'px'
    canvas.style.height = ch + 'px'
    _contours = null
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, cw, ch)
  ctx.font = font
  ctx.textBaseline = 'top'

  const numLines = Math.ceil(ch / lh)
  const isOrig = tn === 'original'
  const tc = theme.color
  const prepared = getPrepared(text, font)
  const base = getBaseContours(state, numLines)
  const contours = getEffectiveContours(base, numLines, state, anim, time)

  // Smooth mouse for parallax
  const tgtX = anim.mouse.onCanvas ? anim.mouse.x : cw / 2
  const tgtY = anim.mouse.onCanvas ? anim.mouse.y : ch / 2
  anim.smooth.x += (tgtX - anim.smooth.x) * 0.08
  anim.smooth.y += (tgtY - anim.smooth.y) * 0.08
  const maxSh = fontSize * 0.25
  const shX = -(anim.smooth.x / cw - 0.5) * 2 * maxSh
  const shY = -(anim.smooth.y / ch - 0.5) * 2 * maxSh

  // Slash trail pruning
  const now = performance.now()
  while (anim.slash.trail.length && now - anim.slash.trail[0].time > anim.slash.maxAge)
    anim.slash.trail.shift()

  const revealLimit = anim.reveal.active ? anim.reveal.chars : Infinity

  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let charOffset = 0

  for (let i = 0; i < numLines; i++) {
    const contour = contours[i]
    if (!contour) continue

    const y = i * lh
    const lPx = contour.left * cw
    const mw = (contour.right - contour.left) * cw
    if (mw < fontSize * 1.5) continue

    let line = layoutNextLine(prepared, cursor, mw)
    if (!line || !line.text) {
      cursor = { segmentIndex: 0, graphemeIndex: 0 }
      line = layoutNextLine(prepared, cursor, mw)
      if (!line || !line.text) continue
    }
    cursor = line.end

    charOffset += renderLine(
      ctx,
      state,
      anim,
      line.text,
      lPx,
      y,
      lh,
      cw,
      ch,
      isOrig,
      tc,
      contrast,
      charOffset,
      revealLimit,
      shX,
      shY,
      now,
    )
  }

  if (anim.reveal.active) {
    anim.reveal.chars += anim.reveal.speed
    if (anim.reveal.chars >= charOffset) {
      anim.reveal.active = false
      anim.reveal.chars = Infinity
    }
  }
}
