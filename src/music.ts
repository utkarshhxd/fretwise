export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const freqToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440)
export const midiToFreq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
export const pitchClass = (midi: number) => ((Math.round(midi) % 12) + 12) % 12
export const noteName = (midi: number) => NOTE_NAMES[pitchClass(midi)] + (Math.floor(Math.round(midi) / 12) - 1)

// Standard tuning as MIDI notes, low E (string 6) first.
export const TUNING = [40, 45, 50, 55, 59, 64]
export const stringLabel = (s: number) => `string ${6 - s} (${noteName(TUNING[s])})`

const QUALITIES: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10] }

export type Chord = {
  name: string
  level: number
  frets: number[] // per string, low E first; -1 = muted
  fingers: number[] // 0 = open or muted
  tones: number[] // pitch classes in the chord
}

// [level, name, frets, fingers] in tab order, low E first, x = muted.
const SHAPES: [number, string, string, string][] = [
  [1, 'E', '022100', '023100'],
  [1, 'Em', '022000', '023000'],
  [1, 'A', 'x02220', 'x01230'],
  [1, 'Am', 'x02210', 'x02310'],
  [1, 'D', 'xx0232', 'xx0132'],
  [1, 'Dm', 'xx0231', 'xx0231'],
  [1, 'G', '320003', '210003'],
  [1, 'C', 'x32010', 'x32010'],
  [2, 'E7', '020100', '020100'],
  [2, 'A7', 'x02020', 'x02030'],
  [2, 'D7', 'xx0212', 'xx0213'],
  [2, 'G7', '320001', '320001'],
  [2, 'C7', 'x32310', 'x32410'],
  [2, 'B7', 'x21202', 'x21304'],
  [2, 'F', '133211', '134211'],
  [2, 'Bm', 'x24432', 'x13421'],
]

export const CHORDS: Chord[] = SHAPES.map(([level, name, frets, fingers]) => {
  const [, root, quality] = name.match(/^([A-G]#?)(.*)$/)!
  const r = NOTE_NAMES.indexOf(root)
  return {
    name,
    level,
    frets: [...frets].map((c) => (c === 'x' ? -1 : +c)),
    fingers: [...fingers].map((c) => (c === 'x' ? 0 : +c)),
    tones: QUALITIES[quality].map((i) => (r + i) % 12),
  }
})

// Every sounding string of a shape.
export const shapeNotes = (c: Chord) =>
  c.frets.flatMap((fret, s) => (fret < 0 ? [] : [{ s, fret, pc: (TUNING[s] + fret) % 12 }]))

// 12-bin pitch-class profile from AnalyserNode dB bins, scaled so the loudest class is 1.
// Only spectral peaks count, so the noise floor and window leakage don't smear across notes.
// Peaks are weighted by dB above a floor 40 dB under the loudest, so quiet strings still count.
// Constants were picked by sweeping synthetic strums (see music.test.ts).
export function chroma(db: Float32Array, sampleRate: number): number[] {
  const out = new Array(12).fill(0)
  const binHz = sampleRate / 2 / db.length
  const lo = Math.ceil(75 / binHz)
  const hi = Math.min(db.length - 1, Math.floor(800 / binHz))
  let top = -Infinity
  for (let i = lo; i < hi; i++) top = Math.max(top, db[i])
  for (let i = lo; i < hi; i++) {
    const [a, b, c] = [db[i - 1], db[i], db[i + 1]]
    if (b < a || b <= c || b < top - 40) continue
    const offset = (a - c) / (2 * (a - 2 * b + c)) // parabolic peak interpolation
    out[pitchClass(freqToMidi((i + (Number.isFinite(offset) ? offset : 0)) * binHz))] += b - (top - 40)
  }
  const max = Math.max(...out)
  return max > 0 ? out.map((v) => v / max) : out
}

// Expected profile of a strummed shape, including the overtones each string adds.
// The 7th overtone matters: it lands near the flat 7th, which is what tells G from G7.
function profile(c: Chord) {
  const p = new Array(12).fill(0)
  for (const { s, fret } of shapeNotes(c)) {
    for (let h = 1; h <= 7; h++) p[pitchClass(TUNING[s] + fret + 12 * Math.log2(h))] += 0.8 ** (h - 1)
  }
  return p
}

function cosine(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < 12; i++) {
    dot += a[i] * b[i]
    na += a[i] ** 2
    nb += b[i] ** 2
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export type Check = { ok: boolean; heard: string; score: number; missing: ReturnType<typeof shapeNotes> }

// "heard" is the closest chord in the library.
// shortcut: thresholds are tuned on synthetic plucks only, retune them on a real guitar.
export function checkChord(c: number[], chord: Chord): Check {
  const scores = CHORDS.map((k) => cosine(c, profile(k)))
  const best = scores.indexOf(Math.max(...scores))
  const score = cosine(c, profile(chord))
  const missing = shapeNotes(chord).filter((n) => c[n.pc] < 0.15)
  return { ok: !missing.length && score >= scores[best] - 0.01 && score > 0.8, heard: CHORDS[best].name, score, missing }
}
