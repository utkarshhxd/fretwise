# Fretwise

A browser app for learning acoustic guitar on a laptop. It listens through the mic.

## Run

```sh
npm install
npm run dev     # open the printed URL in Chrome, click "Enable mic"
npm test        # chord-detection self-check (Node 23.6+)
```

The mic only works on `localhost` or HTTPS. Plug in headphones if you use the metronome while the chord checker is listening.

## How it hears

- **Tuner** (`Tuner.tsx`): `pitchy` (McLeod pitch method) on a 4096-sample window. It snaps to the nearest string, or the string you pick.
- **Chord checker** (`music.ts`): 16384-point spectrum, then spectral peaks folded into 12 note classes. These are compared against each chord shape's expected profile, overtones included. A chord passes when it is the closest shape in the library and every string's note is audible.
- The detector constants were picked by sweeping synthetic Karplus-Strong strums. They still need checking against a real guitar.

## Roadmap: beginner to advanced

Each level adds app features that use the mic.

1. **Beginner.** Tuning, the 8 open chords, downstrums with the metronome. *Done:* tuner, chord library and checker, metronome. *Next:* one-minute chord changes (counts clean changes in 60 s), practice log and streak.
2. **Early intermediate.** 7th chords, first barres (F, Bm), strumming patterns, 3–4 chord songs. *App:* progression player (chords scroll on the beat, each change scored), strum-timing coach (early/late per strum), record-and-compare.
3. **Intermediate.** Movable barre chords, power chords, minor pentatonic box 1, fingerpicking patterns, fretboard notes. *App:* scale trainer (play each note in order, checked by pitch), fretboard quiz ("play C on string 5"), speed trainer (BPM ramps up as you stay clean).
4. **Advanced.** All 5 pentatonic boxes, major scale/CAGED, intervals, ear training, improvising. *App:* ear trainer (app plays, you find it), improvisation over backing loops with note-in-key feedback.

Single-note features (tuner, scales, fretboard, ear training) are very reliable from a mic. Chord features are reliable for known shapes, which is why the app always says which chord it expects.
