import { PitchDetector } from 'pitchy'
import { useEffect, useState } from 'react'
import { MIN_RMS, type Mic } from './audio.ts'
import { freqToMidi, midiToFreq, noteName, stringLabel, TUNING } from './music.ts'

const nearestString = (midi: number) =>
  TUNING.reduce((best, m, i) => (Math.abs(midi - m) < Math.abs(midi - TUNING[best]) ? i : best), 0)

export function Tuner({ mic }: { mic: Mic }) {
  const [hz, setHz] = useState<number | null>(null)
  const [pick, setPick] = useState<number | null>(null) // null = auto-detect string

  useEffect(() => {
    const buf = new Float32Array(mic.time.fftSize)
    const detector = PitchDetector.forFloat32Array(buf.length)
    detector.minVolumeAbsolute = MIN_RMS
    let smooth = 0
    let heardAt = 0
    let id = 0
    const tick = (now: number) => {
      mic.time.getFloatTimeDomainData(buf)
      const [f, clarity] = detector.findPitch(buf, mic.ctx.sampleRate)
      if (clarity > 0.9 && f > 60 && f < 1100) {
        // Smooth jitter, but jump straight to a new note.
        smooth = Math.abs(1200 * Math.log2(f / smooth)) > 50 ? f : smooth * 0.8 + f * 0.2
        heardAt = now
        setHz(smooth)
      } else if (now - heardAt > 1500) setHz(null)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [mic])

  const midi = hz && freqToMidi(hz)
  const s = pick ?? (midi ? nearestString(midi) : null)
  const cents = hz && s !== null ? 1200 * Math.log2(hz / midiToFreq(TUNING[s])) : 0
  const inTune = Math.abs(cents) < 5

  return (
    <section className="tuner">
      <div className="row" role="group" aria-label="String to tune">
        <button aria-pressed={pick === null} onClick={() => setPick(null)}>
          Auto
        </button>
        {TUNING.map((m, i) => (
          <button key={i} aria-pressed={pick === i} onClick={() => setPick(i)}>
            {noteName(m)}
          </button>
        ))}
      </div>
      <div className={'note' + (hz && inTune ? ' good' : '')}>{midi ? noteName(midi) : '–'}</div>
      <div className="meter" aria-hidden>
        {hz && <div className="needle" style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }} />}
      </div>
      <p className="hint">
        {!hz || s === null
          ? 'Pluck one string'
          : inTune
            ? `${stringLabel(s)} in tune ✓`
            : `${cents < 0 ? 'Tighten ↑' : 'Loosen ↓'} ${stringLabel(s)}`}
      </p>
      <p className="sub">{hz ? `${hz.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${Math.round(cents)} cents` : ' '}</p>
    </section>
  )
}
