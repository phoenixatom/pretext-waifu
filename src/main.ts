import { TEXTS } from './config'
import type { AppState, AnimState } from './config'
import { detectBackground, autoDetectMode } from './image'
import { renderFrame, invalidateContours } from './render'

// ── State ─────────────────────────────────────────────────────────────
const state: AppState = {
  imageData: null,
  imgW: 0,
  imgH: 0,
  fontSize: 10,
  theme: 'original',
  contrast: 1.5,
  mode: 'contour',
  bgColor: [255, 255, 255],
  textPreset: 'jp',
  customText: '',
}

const anim: AnimState = {
  enabled: true,
  mouse: { x: 0, y: 0, onCanvas: false },
  smooth: { x: 0, y: 0 },
  morph: { active: false, from: '', to: '', startTime: 0, duration: 900 },
  reveal: { active: false, chars: 0, speed: 20 },
  slash: { trail: [], maxAge: 600 },
}

// ── DOM ───────────────────────────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!
const canvas = $('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

// ── Text ──────────────────────────────────────────────────────────────
let _text = '',
  _textKey = ''

function getText(): string {
  const key = state.textPreset + '|' + state.customText
  if (_textKey === key) return _text
  _textKey = key
  if (state.textPreset === 'custom') {
    const t = state.customText.trim()
    _text = t ? t.repeat(Math.ceil(10000 / Math.max(1, t.length))) : TEXTS.jp.repeat(30)
  } else {
    _text = (TEXTS[state.textPreset] || TEXTS.jp).repeat(30)
  }
  return _text
}

// ── Image processing ──────────────────────────────────────────────────
function processImage(img: HTMLImageElement): void {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth || img.width
  c.height = img.naturalHeight || img.height
  c.getContext('2d')!.drawImage(img, 0, 0)
  state.imgW = c.width
  state.imgH = c.height
  state.imageData = c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
  state.bgColor = detectBackground(state.imageData.data, c.width, c.height)
  state.mode = autoDetectMode(state.imageData.data, c.width, c.height, state.bgColor)
  ;($('mode') as HTMLSelectElement).value = state.mode
  invalidateContours()
}

// ── Animation loop ────────────────────────────────────────────────────
let animId: number | null = null

function loop(t: number): void {
  renderFrame(ctx, canvas, state, anim, getText(), t)
  if (anim.enabled) {
    animId = requestAnimationFrame(loop)
  } else {
    animId = null
  }
}

function startAnim(): void {
  if (!animId) animId = requestAnimationFrame(loop)
}

function renderOnce(): void {
  renderFrame(ctx, canvas, state, anim, getText(), performance.now())
}

// ── Image loading ─────────────────────────────────────────────────────
function loadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    URL.revokeObjectURL(url)
    processImage(img)
    $('dropzone').classList.add('hidden')

    const lh = Math.ceil(state.fontSize * 1.5)
    const cw = Math.min(innerWidth - 40, 900)
    const ch = Math.floor((cw * state.imgH) / state.imgW)
    const approx = (ch / lh) * (cw / (state.fontSize * 0.8)) * 0.7
    anim.reveal.active = true
    anim.reveal.chars = 0
    anim.reveal.speed = Math.max(10, approx / (2.5 * 60))

    anim.smooth.x = cw / 2
    anim.smooth.y = ch / 2
    startAnim()
  }
  img.src = url
}

function saveImage(): void {
  const a = document.createElement('a')
  a.download = 'pretext-waifu.png'
  a.href = canvas.toDataURL('image/png')
  a.click()
}

// ── UI events ─────────────────────────────────────────────────────────
const dropzone = $('dropzone')
const fileInput = $('fileInput') as HTMLInputElement

dropzone.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) loadFile(f)
  fileInput.value = ''
})

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropzone.classList.add('dragover')
})
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'))
dropzone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropzone.classList.remove('dragover')
  const f = e.dataTransfer?.files[0]
  if (f?.type.startsWith('image/')) loadFile(f)
})
document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => {
  e.preventDefault()
  const f = e.dataTransfer?.files[0]
  if (f?.type.startsWith('image/')) loadFile(f)
})
document.addEventListener('paste', (e) => {
  if ((e.target as HTMLElement).id === 'customText') return
  const f = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'))
  if (f) loadFile(f)
})

// Mouse tracking
function handleMove(nx: number, ny: number): void {
  const spd = Math.sqrt((nx - anim.mouse.x) ** 2 + (ny - anim.mouse.y) ** 2)
  if (spd > 5) anim.slash.trail.push({ x: nx, y: ny, time: performance.now(), spd })
  anim.mouse.x = nx
  anim.mouse.y = ny
  anim.mouse.onCanvas = true
}

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect()
  handleMove(e.clientX - r.left, e.clientY - r.top)
})
canvas.addEventListener('mouseleave', () => {
  anim.mouse.onCanvas = false
})
canvas.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault()
    const r = canvas.getBoundingClientRect()
    const t = e.touches[0]
    handleMove(t.clientX - r.left, t.clientY - r.top)
  },
  { passive: false },
)
canvas.addEventListener('touchend', () => {
  anim.mouse.onCanvas = false
})

// Controls
$('animate').addEventListener('change', (e) => {
  anim.enabled = (e.target as HTMLInputElement).checked
  if (anim.enabled && state.imageData) startAnim()
  else if (!anim.enabled && state.imageData) renderOnce()
})
$('fontSize').addEventListener('input', (e) => {
  state.fontSize = +(e.target as HTMLInputElement).value
  if (!anim.enabled) renderOnce()
})
$('contrast').addEventListener('input', (e) => {
  state.contrast = +(e.target as HTMLInputElement).value
  if (!anim.enabled) renderOnce()
})
$('theme').addEventListener('change', (e) => {
  state.theme = (e.target as HTMLSelectElement).value
  if (!anim.enabled) renderOnce()
})
$('mode').addEventListener('change', (e) => {
  const prev = anim.morph.active ? anim.morph.to : state.mode
  const next = (e.target as HTMLSelectElement).value as 'contour' | 'fill'
  if (prev !== next && state.imageData) {
    anim.morph.active = true
    anim.morph.from = prev
    anim.morph.to = next
    anim.morph.startTime = performance.now()
  }
  state.mode = next
  if (!anim.enabled) renderOnce()
})
$('changeImage').addEventListener('click', () => fileInput.click())
$('textPreset').addEventListener('change', (e) => {
  state.textPreset = (e.target as HTMLSelectElement).value
  $('customTextWrap').classList.toggle('hidden', state.textPreset !== 'custom')
  if (!anim.enabled) renderOnce()
})
let textTimer: ReturnType<typeof setTimeout>
$('customText').addEventListener('input', (e) => {
  state.customText = (e.target as HTMLTextAreaElement).value
  clearTimeout(textTimer)
  textTimer = setTimeout(() => {}, 300)
})
$('save').addEventListener('click', saveImage)

document.fonts.ready.then(() => console.log('Pretext Waifu ready'))
