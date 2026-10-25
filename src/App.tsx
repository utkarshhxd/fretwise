import { useState } from 'react'
import { openMic, type Mic } from './audio.ts'
import { Chords } from './Chords.tsx'
import { Metronome } from './Metronome.tsx'
import { Tuner } from './Tuner.tsx'

const TABS = ['Tuner', 'Chords', 'Metronome'] as const

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tuner')
  const [mic, setMic] = useState<Mic | null>(null)
  const [error, setError] = useState('')

  const enableMic = () =>
    openMic().then(
      (m) => {
        setMic(m)
        setError('')
      },
      (e: Error) => setError(e.name === 'NotAllowedError' ? 'Mic blocked. Allow it in the address bar, then try again.' : e.message),
    )

  return (
    <>
      <header>
        <h1>Fretwise</h1>
        <nav>
          {TABS.map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        {mic ? (
          <span className="good">● Mic on</span>
        ) : (
          <button className="primary" onClick={enableMic}>
            Enable mic
          </button>
        )}
      </header>
      {error && (
        <p className="bad" role="alert">
          {error}
        </p>
      )}
      <main>
        {tab === 'Tuner' && (mic ? <Tuner mic={mic} /> : <p className="sub">Turn on the mic to use the tuner.</p>)}
        {tab === 'Chords' && <Chords mic={mic} />}
        {/* Stays mounted so it keeps ticking while you practise on other tabs. */}
        <div hidden={tab !== 'Metronome'}>
          <Metronome />
        </div>
      </main>
    </>
  )
}
