import { prepareWithSegments, layoutNextLine, clearCache } from '@chenglou/pretext'

// ── Text presets ───────────────��──────────────────���───────────────────
const TEXTS = {
  jp: [
    '桜の花びらが風に舞い散る中、少女は静かに微笑んだ。',
    'その瞳には無数の星が宿り、夜空のように深く澄んでいた。',
    '夢と現実の狭間で、黒髪が風になびく。',
    '白い肌に映える桜色の唇が、言葉にならない想いを紡ぐ。',
    '遠い記憶の彼方で、二人は永遠を誓った。',
    '春の嵐が過ぎ去り、世界は静寂に包まれる。',
    '雨上がりの空に虹が架かる。花鳥風月、移ろう季節の美。',
    '夏の蛍が川面を照らし、秋の紅葉が山を彩る。',
    '冬の雪景色の中、一輪の椿が凛と咲く。',
    '少女は窓辺に佇み、遠くを見つめる。',
    '風が髪を優しく撫で、花びらが手のひらに舞い降りた。',
    '朝露のように輝く涙が、新しい朝の始まりを告げる。',
    '希望の光が東の空を染め、世界は再び目覚める。',
    '愛と勇気の物語は、終わることなく続いていく。',
    '星が流れ、願いが風に乗って空へと昇る。',
    '月が満ち、潮が引き、時は静かに流れる。',
    '彼女の歌声は風に乗り、遠い海の向こうへ届く。',
    '銀色の波が月光を映し、夜の帳が静かに降りる。',
    '一筋の流れ星が夜空を横切り、闇に光の軌跡を描いた。',
    '約束の場所で、再び出会えると信じて。',
    '咲き誇る薔薇の園で、少女は踊る。',
    '紅く燃える夕焼けの下、影が長く伸びる。',
    '明日への扉を開き、新たな冒険が始まる。',
    '千の言葉よりも美しく、万の星よりも輝いていた。',
  ].join(''),
  en: [
    'Cherry blossoms drifting on the wind, she smiled quietly in the fading light. ',
    'Her eyes held a thousand stars, deep and clear as the midnight sky. ',
    'Between dream and reality, her dark hair danced with the breeze. ',
    'Pale skin glowing under moonlight, lips the color of spring roses. ',
    'In the distant reaches of memory, two souls made an eternal vow. ',
    'The storm of spring passed, and the world was wrapped in silence. ',
    'A rainbow arched across the rain-washed sky, colors bleeding into clouds. ',
    'Summer fireflies lit the river, autumn leaves painted the mountains red. ',
    'In the white stillness of winter, a single camellia bloomed defiantly. ',
    'She stood by the window, gazing far beyond the horizon. ',
    'The wind gently brushed her hair as a petal landed softly in her palm. ',
    'Tears glistening like morning dew heralded the dawn of a new day. ',
    'Light of hope stained the eastern sky, and the world awakened once more. ',
    'A story of love and courage that would never reach its final page. ',
    'Stars fell and wishes rode the wind, spiraling upward into the heavens. ',
    'The moon waxed full, the tide retreated, and time flowed on in silence. ',
    'Her song carried on the wind, reaching across the distant sea. ',
    'Silver waves mirrored the moonlight as night drew its curtain down. ',
    'A single shooting star cut across the darkness, tracing light through shadow. ',
    'At the promised place, she believed they would meet again someday. ',
    'In a garden of blooming roses, she danced beneath the fading sun. ',
    'Under a sky burning crimson, shadows stretched long across the earth. ',
    'She opened the door to tomorrow, and a new adventure began. ',
    'More beautiful than a thousand words, brighter than ten thousand stars. ',
  ].join(''),
}

// ── Themes ���───────────────────���───────────────────────────────────────
const THEMES = {
  original: { bg: '#08080c' },
  sakura:   { bg: '#08080c', color: [255, 183, 197] },
  ocean:    { bg: '#06080e', color: [125, 211, 252] },
  ember:    { bg: '#0c0806', color: [251, 191, 146] },
  mono:     { bg: '#0a0a0a', color: [210, 210, 210] },
}

// ── State ───────────────���───────────────────────────────────────���─────
const state = {
  imageData: null, imgW: 0, imgH: 0,
  fontSize: 10, theme: 'original', contrast: 1.5,
  mode: 'contour', bgColor: [255, 255, 255],
  textPreset: 'jp', customText: '',
}

const mouse = { x: 0, y: 0, onCanvas: false }
const smooth = { x: 0, y: 0 }
const morph = { active: false, from: '', to: '', startTime: 0, duration: 900 }
const reveal = { active: false, chars: 0, speed: 20 }
const slash = { trail: [], maxAge: 600 }

// ── Caches ────────────────────────────────────────────────��───────────
let _prepared = null, _pFont = '', _pText = ''
let _contours = null, _cLines = 0

// ── DOM ────────────────────────���──────────────────────────────────────
const $ = (id) => document.getElementById(id)
const canvas = $('canvas')
const ctx = canvas.getContext('2d')

// ── Text ────────────���─────────────────────────────────────────────────
function getText() {
  if (state.textPreset === 'custom') {
    const t = state.customText.trim()
    return t ? t.repeat(Math.ceil(10000 / Math.max(1, t.length))) : TEXTS.jp.repeat(30)
  }
  return (TEXTS[state.textPreset] || TEXTS.jp).repeat(30)
}

function getPrepared() {
  const text = getText()
  const font = `${state.fontSize}px "Noto Sans JP", sans-serif`
  if (_prepared && _pFont === font && _pText === text) return _prepared
  if (_prepared) clearCache()
  _pFont = font; _pText = text
  _prepared = prepareWithSegments(text, font)
  return _prepared
}

// ── Image processing ─────────────���────────────────────────────────────
function processImage(img) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth || img.width
  c.height = img.naturalHeight || img.height
  c.getContext('2d').drawImage(img, 0, 0)
  state.imgW = c.width; state.imgH = c.height
  state.imageData = c.getContext('2d').getImageData(0, 0, c.width, c.height)
  state.bgColor = detectBackground(state.imageData.data, c.width, c.height)
  state.mode = autoDetectMode(state.imageData.data, c.width, c.height)
  $('mode').value = state.mode
  _contours = null
}

function detectBackground(data, w, h) {
  const s = Math.min(6, Math.floor(Math.min(w, h) / 20))
  let r = 0, g = 0, b = 0, n = 0
  for (const [ox, oy] of [[0, 0], [w - s, 0], [0, h - s], [w - s, h - s]]) {
    for (let y = oy; y < oy + s; y++)
      for (let x = ox; x < ox + s; x++) {
        const i = (y * w + x) * 4
        if (data[i + 3] < 20) continue
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
  }
  return n > 0 ? [r / n, g / n, b / n] : [255, 255, 255]
}

function autoDetectMode(data, w, h) {
  let tr = 0, sa = 0
  const step = Math.max(4, Math.floor(data.length / 4 / 8000)) * 4
  for (let i = 3; i < data.length; i += step) { if (data[i] < 128) tr++; sa++ }
  if (tr / sa > 0.08) return 'contour'
  const bg = state.bgColor
  let mx = 0
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const i = (y * w + x) * 4
    const d0 = data[i] - bg[0], d1 = data[i + 1] - bg[1], d2 = data[i + 2] - bg[2]
    mx = Math.max(mx, Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2))
  }
  return mx < 60 ? 'contour' : 'fill'
}

// ── Contour detection ���───────────────────────────��────────────────────
function computeContours(data, imgW, imgH, numLines, bg) {
  const thr = 35 * 35, step = Math.max(1, Math.floor(imgW / 500))
  const out = new Array(numLines)
  for (let ln = 0; ln < numLines; ln++) {
    const iy = Math.min(imgH - 1, Math.floor(((ln + 0.5) / numLines) * imgH))
    let l = -1, r = -1
    for (let x = 0; x < imgW; x += step) {
      const i = (iy * imgW + x) * 4
      if (data[i + 3] < 20) continue
      const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2]
      if (dr * dr + dg * dg + db * db > thr) { if (l < 0) l = x; r = x }
    }
    if (l >= 0 && (r - l) > imgW * 0.03) {
      const pad = Math.max(step, Math.floor((r - l) * 0.01))
      out[ln] = { left: (l + pad) / imgW, right: (r - pad) / imgW }
    } else {
      out[ln] = null
    }
  }
  return out
}

function getBaseContours(numLines) {
  if (_contours && _cLines === numLines) return _contours
  _contours = computeContours(state.imageData.data, state.imgW, state.imgH, numLines, state.bgColor)
  _cLines = numLines
  return _contours
}

// ── Effective contours (morph + breathing) ─────────────��──────────────
function lerp(a, b, t) { return a + (b - a) * t }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

function getEffectiveContours(base, numLines, time) {
  const out = new Array(numLines)
  const breath = 0.022 * Math.sin(time * 0.0015)
  let mt = 0
  if (morph.active) {
    mt = ease(Math.min(1, (performance.now() - morph.startTime) / morph.duration))
    if (mt >= 1) morph.active = false
  }

  for (let i = 0; i < numLines; i++) {
    const b = base[i]
    let left, right

    if (morph.active || mt > 0 && mt < 1) {
      const sL = morph.from === 'contour' ? (b ? b.left : -1) : 0
      const sR = morph.from === 'contour' ? (b ? b.right : -1) : 1
      const dL = morph.to === 'contour' ? (b ? b.left : -1) : 0
      const dR = morph.to === 'contour' ? (b ? b.right : -1) : 1
      if (sL < 0 && dL < 0) { out[i] = null; continue }
      left = lerp(sL < 0 ? 0.5 : sL, dL < 0 ? 0.5 : dL, mt)
      right = lerp(sR < 0 ? 0.5 : sR, dR < 0 ? 0.5 : dR, mt)
    } else if (state.mode === 'contour') {
      if (!b) { out[i] = null; continue }
      left = b.left; right = b.right
    } else {
      left = 0; right = 1
    }

    left = Math.max(0, left + breath)
    right = Math.min(1, right - breath)
    out[i] = right - left > 0.02 ? { left, right } : null
  }
  return out
}

// ── Pixel sampling ────────────────────────────────────────────────────
function samplePixel(x, y, cw, ch) {
  const { imageData: img, imgW: w, imgH: h } = state
  const ix = Math.min(w - 1, Math.max(0, (x / cw * w) | 0))
  const iy = Math.min(h - 1, Math.max(0, (y / ch * h) | 0))
  const i = (iy * w + ix) * 4
  return i
}

// ── Render one line of characters ─────────────────────────────────────
function renderLine(text, sx, y, lh, cw, ch, isOrig, tc, con, offset, limit, shX, shY, now) {
  const data = state.imageData.data
  const sw = state.fontSize * 1.8
  let x = sx, count = 0
  for (const char of text) {
    const w = ctx.measureText(char).width
    count++
    if (!char.trim()) { x += w; continue }
    if (offset + count > limit) { x += w; continue }

    const idx = samplePixel(x + w / 2, y + lh / 2, cw, ch)
    const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3]
    const bri = ((0.299 * r + 0.587 * g + 0.114 * b) / 255) * (a / 255)

    let ox = shX * bri, oy = shY * bri, fade = 1

    // Katana slash — trail segment displacement
    const ccx = x + w / 2, ccy = y + lh / 2
    const pts = slash.trail
    for (let ci = 1; ci < pts.length; ci++) {
      const p0 = pts[ci - 1], p1 = pts[ci]
      const age = (now - p1.time) / slash.maxAge
      if (age >= 1) continue
      const segDx = p1.x - p0.x, segDy = p1.y - p0.y
      const segLen2 = segDx * segDx + segDy * segDy
      if (segLen2 < 1) continue
      const t = Math.max(0, Math.min(1, ((ccx - p0.x) * segDx + (ccy - p0.y) * segDy) / segLen2))
      const px = ccx - (p0.x + t * segDx), py = ccy - (p0.y + t * segDy)
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
        fade *= dist / (sw * 0.04) * ageFade * spdF + (1 - ageFade * spdF)
      }
    }

    if (isOrig) {
      if (bri < 0.01) { x += w; continue }
      const bo = Math.min(3, Math.pow(bri, 1 / con) / bri)
      ctx.fillStyle = `rgba(${Math.min(255, r * bo + 0.5 | 0)},${Math.min(255, g * bo + 0.5 | 0)},${Math.min(255, b * bo + 0.5 | 0)},${fade.toFixed(3)})`
    } else {
      const al = Math.pow(bri, 1 / con) * fade
      if (al < 0.03) { x += w; continue }
      ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${al.toFixed(3)})`
    }

    ctx.fillText(char, x + ox, y + oy)
    x += w
  }
  return count
}

// ── Main render frame ─────────────────────────────────────────────────
function renderFrame(time) {
  if (!state.imageData) return

  const { fontSize, theme: tn, contrast } = state
  const theme = THEMES[tn]
  const font = `${fontSize}px "Noto Sans JP", sans-serif`
  const lh = Math.ceil(fontSize * 1.5)
  const dpr = devicePixelRatio || 1

  const cw = Math.min(innerWidth - 40, 900)
  const ch = Math.floor(cw * state.imgH / state.imgW)
  const tw = cw * dpr, th = ch * dpr

  if (canvas.width !== tw || canvas.height !== th) {
    canvas.width = tw; canvas.height = th
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
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
  const prepared = getPrepared()
  const base = getBaseContours(numLines)
  const contours = getEffectiveContours(base, numLines, time)

  // Smooth mouse for parallax
  const tgtX = mouse.onCanvas ? mouse.x : cw / 2
  const tgtY = mouse.onCanvas ? mouse.y : ch / 2
  smooth.x += (tgtX - smooth.x) * 0.08
  smooth.y += (tgtY - smooth.y) * 0.08
  const maxSh = fontSize * 0.25
  const shX = -((smooth.x / cw) - 0.5) * 2 * maxSh
  const shY = -((smooth.y / ch) - 0.5) * 2 * maxSh

  // Slash trail
  const now = performance.now()
  while (slash.trail.length && now - slash.trail[0].time > slash.maxAge) slash.trail.shift()
  const revealLimit = reveal.active ? reveal.chars : Infinity

  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
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
      line.text, lPx, y, lh, cw, ch,
      isOrig, tc, contrast, charOffset, revealLimit, shX, shY, now
    )
  }

  if (reveal.active) {
    reveal.chars += reveal.speed
    if (reveal.chars >= charOffset) { reveal.active = false; reveal.chars = Infinity }
  }
}

// ── Animation loop ─────────────��──────────────────────────────────────
let animId = null
function animLoop(t) { animId = requestAnimationFrame(animLoop); renderFrame(t) }
function startAnim() { if (!animId) animId = requestAnimationFrame(animLoop) }
function stopAnim() { if (animId) { cancelAnimationFrame(animId); animId = null } }

// ── Image loading ────��────────────────────────────────────────────────
function loadFile(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    URL.revokeObjectURL(url)
    processImage(img)
    $('dropzone').classList.add('hidden')

    // Start reveal
    const lh = Math.ceil(state.fontSize * 1.5)
    const cw = Math.min(innerWidth - 40, 900)
    const ch = Math.floor(cw * state.imgH / state.imgW)
    const approx = (ch / lh) * (cw / (state.fontSize * 0.8)) * 0.7
    reveal.active = true; reveal.chars = 0; reveal.speed = Math.max(10, approx / (2.5 * 60))

    smooth.x = cw / 2; smooth.y = ch / 2
    startAnim()
  }
  img.src = url
}

function saveImage() {
  const a = document.createElement('a')
  a.download = 'pretext-waifu.png'
  a.href = canvas.toDataURL('image/png')
  a.click()
}

// ── UI ────────────────��───────────────────────────────────────────────
const dropzone = $('dropzone')
const fileInput = $('fileInput')

dropzone.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = '' })

dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover') })
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'))
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); dropzone.classList.remove('dragover')
  const f = e.dataTransfer.files[0]
  if (f?.type.startsWith('image/')) loadFile(f)
})
document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => {
  e.preventDefault()
  const f = e.dataTransfer.files[0]
  if (f?.type.startsWith('image/')) loadFile(f)
})
document.addEventListener('paste', (e) => {
  if (e.target.id === 'customText') return
  const f = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'))
  if (f) loadFile(f)
})

// Mouse tracking
function handleMove(nx, ny) {
  const spd = Math.sqrt((nx - mouse.x) ** 2 + (ny - mouse.y) ** 2)
  if (spd > 5) slash.trail.push({ x: nx, y: ny, time: performance.now(), spd })
  mouse.x = nx; mouse.y = ny; mouse.onCanvas = true
}
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect()
  handleMove(e.clientX - r.left, e.clientY - r.top)
})
canvas.addEventListener('mouseleave', () => { mouse.onCanvas = false })
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault()
  const r = canvas.getBoundingClientRect(); const t = e.touches[0]
  handleMove(t.clientX - r.left, t.clientY - r.top)
}, { passive: false })
canvas.addEventListener('touchend', () => { mouse.onCanvas = false })

// Controls
$('fontSize').addEventListener('input', (e) => { state.fontSize = +e.target.value })
$('contrast').addEventListener('input', (e) => { state.contrast = +e.target.value })
$('theme').addEventListener('change', (e) => { state.theme = e.target.value })
$('mode').addEventListener('change', (e) => {
  const prev = morph.active ? morph.to : state.mode
  const next = e.target.value
  if (prev !== next && state.imageData) {
    morph.active = true; morph.from = prev; morph.to = next; morph.startTime = performance.now()
  }
  state.mode = next
})
$('changeImage').addEventListener('click', () => fileInput.click())
$('textPreset').addEventListener('change', (e) => {
  state.textPreset = e.target.value
  $('customTextWrap').classList.toggle('hidden', e.target.value !== 'custom')
})
let textTimer
$('customText').addEventListener('input', (e) => {
  state.customText = e.target.value
  clearTimeout(textTimer); textTimer = setTimeout(() => {}, 300)
})
$('save').addEventListener('click', saveImage)

document.fonts.ready.then(() => console.log('Pretext Waifu ready'))
