export const TEXTS: Record<string, string> = {
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

export interface Theme {
  bg: string
  color?: [number, number, number]
}

export const THEMES: Record<string, Theme> = {
  original: { bg: '#08080c' },
  sakura: { bg: '#08080c', color: [255, 183, 197] },
  ocean: { bg: '#06080e', color: [125, 211, 252] },
  ember: { bg: '#0c0806', color: [251, 191, 146] },
  mono: { bg: '#0a0a0a', color: [210, 210, 210] },
}

export interface Contour {
  left: number
  right: number
}

export interface TrailPoint {
  x: number
  y: number
  time: number
  spd: number
}

export interface AppState {
  imageData: ImageData | null
  imgW: number
  imgH: number
  fontSize: number
  theme: string
  contrast: number
  mode: 'contour' | 'fill'
  bgColor: [number, number, number]
  textPreset: string
  customText: string
}

export interface AnimState {
  enabled: boolean
  mouse: { x: number; y: number; onCanvas: boolean }
  smooth: { x: number; y: number }
  morph: { active: boolean; from: string; to: string; startTime: number; duration: number }
  reveal: { active: boolean; chars: number; speed: number }
  slash: { trail: TrailPoint[]; maxAge: number }
}
