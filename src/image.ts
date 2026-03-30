import type { Contour } from './config'

export function detectBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): [number, number, number] {
  const s = Math.min(6, Math.floor(Math.min(w, h) / 20))
  let r = 0,
    g = 0,
    b = 0,
    n = 0
  for (const [ox, oy] of [
    [0, 0],
    [w - s, 0],
    [0, h - s],
    [w - s, h - s],
  ]) {
    for (let y = oy; y < oy + s; y++)
      for (let x = ox; x < ox + s; x++) {
        const i = (y * w + x) * 4
        if (data[i + 3] < 20) continue
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        n++
      }
  }
  return n > 0 ? [r / n, g / n, b / n] : [255, 255, 255]
}

export function autoDetectMode(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bgColor: [number, number, number],
): 'contour' | 'fill' {
  let tr = 0,
    sa = 0
  const step = Math.max(4, Math.floor(data.length / 4 / 8000)) * 4
  for (let i = 3; i < data.length; i += step) {
    if (data[i] < 128) tr++
    sa++
  }
  if (tr / sa > 0.08) return 'contour'
  let mx = 0
  for (const [x, y] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ]) {
    const i = (y * w + x) * 4
    const d0 = data[i] - bgColor[0],
      d1 = data[i + 1] - bgColor[1],
      d2 = data[i + 2] - bgColor[2]
    mx = Math.max(mx, Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2))
  }
  return mx < 60 ? 'contour' : 'fill'
}

export function computeContours(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  numLines: number,
  bg: [number, number, number],
): (Contour | null)[] {
  const thr = 35 * 35,
    step = Math.max(1, Math.floor(imgW / 500))
  const out: (Contour | null)[] = new Array(numLines)
  for (let ln = 0; ln < numLines; ln++) {
    const iy = Math.min(imgH - 1, Math.floor(((ln + 0.5) / numLines) * imgH))
    let l = -1,
      r = -1
    for (let x = 0; x < imgW; x += step) {
      const i = (iy * imgW + x) * 4
      if (data[i + 3] < 20) continue
      const dr = data[i] - bg[0],
        dg = data[i + 1] - bg[1],
        db = data[i + 2] - bg[2]
      if (dr * dr + dg * dg + db * db > thr) {
        if (l < 0) l = x
        r = x
      }
    }
    if (l >= 0 && r - l > imgW * 0.03) {
      const pad = Math.max(step, Math.floor((r - l) * 0.01))
      out[ln] = { left: (l + pad) / imgW, right: (r - pad) / imgW }
    } else {
      out[ln] = null
    }
  }
  return out
}
