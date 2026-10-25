// Run with `npm test` (Node strips the types).
import { CHORDS, checkChord, chroma, midiToFreq, noteName, shapeNotes, TUNING } from './music.ts'
import type { Chord } from './music.ts'

function check(ok: boolean, msg: string) {
  if (!ok) throw new Error(msg)
}

check(noteName(40) === 'E2' && noteName(69) === 'A4', 'note names')

for (const c of CHORDS) {
  const played = new Set(shapeNotes(c).map((n) => n.pc))
  check([...played].every((pc) => c.tones.includes(pc)), `${c.name} shape plays a note outside the chord`)
  check(played.size >= 3, `${c.name} shape plays fewer than 3 chord tones`)
}

// Mimics the app's AnalyserNode (48 kHz, fftSize 16384, Blackman window) listening to a
// Karplus-Strong strum, 15 ms between strings, window starting 0.1 s in. Seeded so runs repeat.
// "noise" plucks give random overtone strengths; "pluck" is a pick-shaped string through a
// laptop mic that cuts bass below 150 Hz.
const RATE = 48000
const N = 16384
const COS = Float64Array.from({ length: N }, (_, i) => Math.cos((2 * Math.PI * i) / N))
const WINDOW = Float64Array.from({ length: N }, (_, i) => 0.42 - 0.5 * COS[i] + 0.08 * COS[(2 * i) % N])
function strum(c: Chord, kind: 'noise' | 'pluck') {
  let seed = 7
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const start = RATE / 10
  const out = new Float64Array(start + N)
  for (const { s, fret } of shapeNotes(c)) {
    const period = Math.round(RATE / midiToFreq(TUNING[s] + fret) + 0.5)
    const at = 0.15 + random() * 0.1 // pick position along the string
    const buf = Array.from({ length: period }, (_, k) => {
      const x = k / period
      const shape = (x < at ? x / at : (1 - x) / (1 - at)) - 0.5
      return kind === 'noise' ? random() * 2 - 1 : shape + 0.3 * (random() * 2 - 1)
    })
    for (let i = s * 720, k = 0; i < out.length; i++, k = (k + 1) % period) {
      out[i] += buf[k]
      buf[k] = 0.498 * (buf[k] + buf[(k + 1) % period])
    }
  }
  if (kind === 'pluck') {
    const a = 1 / (1 + (2 * Math.PI * 150) / RATE)
    let prev = 0
    let y = 0
    for (let i = 0; i < out.length; i++) {
      const x = out[i]
      out[i] = y = a * (y + x - prev)
      prev = x
    }
  }
  const db = new Float32Array(N / 2).fill(-200)
  for (let bin = 20; bin < 500; bin++) {
    let re = 0
    let im = 0
    for (let n = 0; n < N; n++) {
      const v = out[start + n] * WINDOW[n]
      re += v * COS[(bin * n) % N]
      im += v * COS[(bin * n + N / 4 * 3) % N] // sin via shifted cosine
    }
    db[bin] = 20 * Math.log10(Math.hypot(re, im) / N)
  }
  return chroma(db, RATE)
}
const mixups = [['G', 'C'], ['G', 'Em'], ['G', 'G7'], ['A', 'Am'], ['E', 'E7'], ['Em', 'E'], ['C', 'Am'], ['D', 'Dm'], ['C', 'C7']]
for (const kind of ['noise', 'pluck'] as const) {
  const heard = new Map(CHORDS.map((c) => [c.name, strum(c, kind)]))
  for (const c of CHORDS) {
    const r = checkChord(heard.get(c.name)!, c)
    check(r.ok && r.heard === c.name, `${kind} ${c.name}: heard ${r.heard}, score ${r.score.toFixed(2)}, missing ${r.missing.length}`)
  }
  for (const [played, target] of mixups) {
    check(!checkChord(heard.get(played)!, CHORDS.find((c) => c.name === target)!).ok, `${kind} ${played} accepted as ${target}`)
  }
}

console.log('music tests passed')
