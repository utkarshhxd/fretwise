import { useEffect, useRef, useState } from 'react'

export function Metronome() {
  const [bpm, setBpm] = useState(80)
  const [beats, setBeats] = useState(4)
  const [beat, setBeat] = useState(-1)
  const [running, setRunning] = useState(false)
  const live = useRef({ bpm, beats })
  useEffect(() => {
    live.current = { bpm, beats }
  }, [bpm, beats])

  useEffect(() => {
    if (!running) return
    const ctx = new AudioContext()
    let next = ctx.currentTime + 0.05
    let n = 0
    let alive = true
    // Schedule clicks 100 ms ahead on the audio clock; timers alone drift.
    const id = setInterval(() => {
      while (next < ctx.currentTime + 0.1) {
        const b = n++ % live.current.beats
        // Clicks sit above the chord detector's 1400 Hz range.
        const osc = new OscillatorNode(ctx, { frequency: b ? 1800 : 2400 })
        const gain = new GainNode(ctx)
        gain.gain.setValueAtTime(0.5, next)
        gain.gain.exponentialRampToValueAtTime(0.001, next + 0.05)
        osc.connect(gain).connect(ctx.destination)
        osc.start(next)
        osc.stop(next + 0.05)
        setTimeout(() => alive && setBeat(b), (next - ctx.currentTime) * 1000)
        next += 60 / live.current.bpm
      }
    }, 25)
    return () => {
      alive = false
      clearInterval(id)
      ctx.close()
      setBeat(-1)
    }
  }, [running])

  return (
    <section className="metronome">
      <div className="beats" aria-hidden>
        {Array.from({ length: beats }, (_, i) => (
          <span key={i} className={(i === beat ? 'on' : '') + (i === 0 ? ' accent' : '')} />
        ))}
      </div>
      <div className="bpm">
        {bpm}
        <small> BPM</small>
      </div>
      <div className="row">
        <button aria-label="Slower" onClick={() => setBpm((b) => Math.max(40, b - 5))}>
          −5
        </button>
        <input type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(+e.target.value)} aria-label="Tempo" />
        <button aria-label="Faster" onClick={() => setBpm((b) => Math.min(220, b + 5))}>
          +5
        </button>
      </div>
      <label>
        Beats per bar{' '}
        <select value={beats} onChange={(e) => setBeats(+e.target.value)}>
          {[2, 3, 4, 6].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <button className="primary" onClick={() => setRunning((r) => !r)}>
        {running ? 'Stop' : 'Start'}
      </button>
    </section>
  )
}
