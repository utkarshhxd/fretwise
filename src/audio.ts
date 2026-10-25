export type Mic = { ctx: AudioContext; time: AnalyserNode; freq: AnalyserNode }

// Below this RMS the input counts as silence (fan, room noise).
export const MIN_RMS = 0.01

export async function openMic(): Promise<Mic> {
  const ctx = new AudioContext() // created before the await so it starts inside the click gesture
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      // Voice processing mangles instrument sound.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    const src = ctx.createMediaStreamSource(stream)
    // Short window for pitch, long window for chord spectra (2.9 Hz bins at 48 kHz).
    const time = new AnalyserNode(ctx, { fftSize: 4096 })
    const freq = new AnalyserNode(ctx, { fftSize: 16384, smoothingTimeConstant: 0 })
    src.connect(time)
    src.connect(freq)
    return { ctx, time, freq }
  } catch (e) {
    ctx.close()
    throw e
  }
}

export const rms = (buf: Float32Array) => Math.sqrt(buf.reduce((sum, v) => sum + v * v, 0) / buf.length)
