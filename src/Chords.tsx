import { useEffect, useState } from 'react'
import { MIN_RMS, rms, type Mic } from './audio.ts'
import { CHORDS, checkChord, chroma, NOTE_NAMES, stringLabel, type Check, type Chord } from './music.ts'

const LEVELS: Record<number, string> = { 1: 'Open chords', 2: '7ths & first barres' }

export function Chords({ mic }: { mic: Mic | null }) {
  const [chord, setChord] = useState(CHORDS[0])

  return (
    <section className="chords">
      <div className="chord-picker">
        {Object.entries(LEVELS).map(([level, label]) => (
          <div key={level}>
            <h2>
              Level {level} · {label}
            </h2>
            <div className="row">
              {CHORDS.filter((c) => c.level === +level).map((c) => (
                <button key={c.name} aria-pressed={c === chord} onClick={() => setChord(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="chord-detail">
        <div>
          <h3>{chord.name}</h3>
          <ChordDiagram chord={chord} />
          <p className="sub">Strum from string {6 - chord.frets.findIndex((f) => f >= 0)}</p>
        </div>
        {mic ? <Checker key={chord.name} mic={mic} chord={chord} /> : <p className="sub">Turn on the mic to check your chord.</p>}
      </div>
    </section>
  )
}

function ChordDiagram({ chord }: { chord: Chord }) {
  const x = (s: number) => 20 + s * 24
  const y = (fret: number) => 34 + fret * 30
  const barre = chord.fingers.flatMap((f, s) => (f === 1 ? [s] : []))
  const lines = [0, 1, 2, 3, 4, 5]

  return (
    <svg className="diagram" viewBox="0 0 160 196" role="img" aria-label={`${chord.name}: ${chord.frets.map((f) => (f < 0 ? 'x' : f)).join(' ')}`}>
      {lines.map((f) => (
        <line key={'f' + f} x1={x(0)} x2={x(5)} y1={y(f)} y2={y(f)} strokeWidth={f ? 1.5 : 5} />
      ))}
      {lines.map((s) => (
        <line key={'s' + s} x1={x(s)} x2={x(s)} y1={y(0)} y2={y(5)} strokeWidth={1.5} />
      ))}
      {barre.length > 1 && (
        <rect className="dot" x={x(barre[0]) - 9} y={y(chord.frets[barre[0]] - 0.5) - 9} width={x(barre.at(-1)!) - x(barre[0]) + 18} height={18} rx={9} />
      )}
      {chord.frets.map((f, s) =>
        f < 0 ? (
          <text key={s} className="mark" x={x(s)} y={22}>
            ×
          </text>
        ) : f === 0 ? (
          <circle key={s} className="open" cx={x(s)} cy={17} r={5} />
        ) : (
          <g key={s}>
            <circle className="dot" cx={x(s)} cy={y(f - 0.5)} r={9} />
            <text className="finger" x={x(s)} y={y(f - 0.5) + 4.5}>
              {chord.fingers[s]}
            </text>
          </g>
        ),
      )}
    </svg>
  )
}

function Checker({ mic, chord }: { mic: Mic; chord: Chord }) {
  const [level, setLevel] = useState(0)
  const [notes, setNotes] = useState<number[]>(() => new Array(12).fill(0))
  const [result, setResult] = useState<Check | null>(null)

  useEffect(() => {
    const time = new Float32Array(mic.time.fftSize)
    const freq = new Float32Array(mic.freq.frequencyBinCount)
    let avg: number[] | null = null
    let id = 0
    const tick = () => {
      mic.time.getFloatTimeDomainData(time)
      const r = rms(time)
      setLevel(r)
      if (r > MIN_RMS) {
        mic.freq.getFloatFrequencyData(freq)
        const c = chroma(freq, mic.ctx.sampleRate)
        avg = avg ? avg.map((v, i) => v * 0.8 + c[i] * 0.2) : c
        setNotes(avg)
        setResult(checkChord(avg, chord))
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [mic, chord])

  return (
    <div>
      <div className={'level' + (level > MIN_RMS ? ' on' : '')} aria-hidden>
        <div style={{ width: `${Math.min(100, level * 400)}%` }} />
      </div>
      {!result ? (
        <p className="verdict">Strum {chord.name}…</p>
      ) : result.ok ? (
        <p className="verdict good">✓ Clean {chord.name}!</p>
      ) : (
        <>
          <p className="verdict bad">Not quite</p>
          <p className="sub">Sounds like {result.heard}</p>
          {/* String tips only help on a near miss, not a different chord. */}
          {result.missing.length > 0 && result.missing.length < 3 && (
            <ul className="tips">
              {result.missing.map((n) => (
                <li key={n.s}>
                  Can't hear {NOTE_NAMES[n.pc]}: check {stringLabel(n.s)}
                  {n.fret ? `, fret ${n.fret}` : ', open'}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="chroma" aria-hidden>
        {notes.map((v, pc) => (
          <div key={pc} className={chord.tones.includes(pc) ? 'tone' : ''}>
            <span style={{ height: `${v * 110}px` }} />
            <small>{NOTE_NAMES[pc]}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
