let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

/** Procedural wooden double-clunk — original synthesis, not a sampled sting. */
export function playGavelClunk(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 2.4;
    master.connect(ctx.destination);

    const playThud = (
      start: number,
      gainLevel: number,
      cutoff: number,
      toneStart: number,
      toneEnd: number,
    ) => {
      const duration = 0.16;
      const sampleCount = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const samples = buffer.getChannelData(0);

      for (let i = 0; i < sampleCount; i++) {
        const t = i / ctx.sampleRate;
        const decay = Math.exp(-t * 32);
        samples[i] = (Math.random() * 2 - 1) * decay;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, start);
      filter.Q.value = 0.9;

      const tone = ctx.createOscillator();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(toneStart, start);
      tone.frequency.exponentialRampToValueAtTime(toneEnd, start + duration);

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.35 * gainLevel, start);
      toneGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.95 * gainLevel, start);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      const mix = ctx.createGain();
      mix.gain.value = 1;

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(mix);

      tone.connect(toneGain);
      toneGain.connect(mix);
      mix.connect(master);

      noise.start(start);
      noise.stop(start + duration);
      tone.start(start);
      tone.stop(start + duration);
    };

    const now = ctx.currentTime;
    const gap = 0.3;
    playThud(now, 1, 120, 62, 32);
    playThud(now + gap, 0.92, 120, 62, 32);
  } catch {
    // Fail silently if audio is unavailable.
  }
}
