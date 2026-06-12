"use client";

import { useCallback, useRef } from "react";

// Web Audio API synthesized sounds — zero external audio files needed

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function useSound() {
  const lastPlayed = useRef(0);

  const play = useCallback((type: "gavel" | "stamp" | "rustle" | "swoosh", volume = 1) => {
    const now = Date.now();
    if (now - lastPlayed.current < 100) return; // throttle
    lastPlayed.current = now;

    try {
      const ctx = getContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.value = volume * 0.3;

      switch (type) {
        case "gavel": {
          // Wooden knock: short burst of noise with a thud
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          osc.connect(gain);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.12);

          // Second knock (harder)
          const osc2 = ctx.createOscillator();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
          osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
          const gain2 = ctx.createGain();
          gain2.gain.setValueAtTime(volume * 0.5, ctx.currentTime + 0.1);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(ctx.currentTime + 0.1);
          osc2.stop(ctx.currentTime + 0.25);

          // Noise burst for wooden texture
          const bufferSize = ctx.sampleRate * 0.08;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const gain3 = ctx.createGain();
          gain3.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
          gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          noise.connect(gain3);
          gain3.connect(ctx.destination);
          noise.start(ctx.currentTime);
          break;
        }
        case "stamp": {
          // Heavy stamp slam: low thud + impact noise
          const osc3 = ctx.createOscillator();
          osc3.type = "sine";
          osc3.frequency.setValueAtTime(100, ctx.currentTime);
          osc3.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc3.connect(gain);
          osc3.start(ctx.currentTime);
          osc3.stop(ctx.currentTime + 0.2);

          // Impact noise
          const bufSize = ctx.sampleRate * 0.05;
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) {
            ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.05));
          }
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const gn = ctx.createGain();
          gn.gain.value = volume * 0.4;
          src.connect(gn);
          gn.connect(ctx.destination);
          src.start(ctx.currentTime);
          break;
        }
        case "rustle": {
          // Paper rustle: filtered noise burst
          const rBufSize = ctx.sampleRate * 0.15;
          const rBuf = ctx.createBuffer(1, rBufSize, ctx.sampleRate);
          const rCh = rBuf.getChannelData(0);
          for (let i = 0; i < rBufSize; i++) {
            rCh[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rBufSize * 0.3));
          }
          const rSrc = ctx.createBufferSource();
          rSrc.buffer = rBuf;
          const rGain = ctx.createGain();
          rGain.gain.value = volume * 0.08;
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 2000;
          filter.Q.value = 0.5;
          rSrc.connect(filter);
          filter.connect(rGain);
          rGain.connect(ctx.destination);
          rSrc.start(ctx.currentTime);
          break;
        }
        case "swoosh": {
          // Swoosh: frequency sweep
          const sOsc = ctx.createOscillator();
          sOsc.type = "sine";
          sOsc.frequency.setValueAtTime(200, ctx.currentTime);
          sOsc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
          sOsc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.25);
          const sGain = ctx.createGain();
          sGain.gain.setValueAtTime(volume * 0.05, ctx.currentTime);
          sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          sOsc.connect(sGain);
          sGain.connect(ctx.destination);
          sOsc.start(ctx.currentTime);
          sOsc.stop(ctx.currentTime + 0.25);
          break;
        }
      }
    } catch {
      // Audio not supported — silently fail
    }
  }, []);

  const playGavel = useCallback(() => play("gavel"), [play]);
  const playStamp = useCallback(() => play("stamp"), [play]);
  const playRustle = useCallback(() => play("rustle"), [play]);
  const playSwoosh = useCallback(() => play("swoosh"), [play]);

  return { play, playGavel, playStamp, playRustle, playSwoosh };
}