'use strict';
// Synthesized SFX with WebAudio (no audio files).
const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let muted = localStorage.getItem('bvf_mute') === '1';
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function noise(dur, f0, f1, q, peak, type = 'bandpass') {
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  function tone(dur, f0, f1, type, peak, delay = 0) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const play = {
    hit(heavy) { tone(heavy ? 0.22 : 0.14, heavy ? 160 : 220, 50, 'square', heavy ? 0.5 : 0.35); noise(heavy ? 0.18 : 0.1, 2500, 400, 0.8, heavy ? 0.7 : 0.5); },
    block() { tone(0.06, 1400, 900, 'square', 0.18); noise(0.06, 5000, 3000, 3, 0.3); },
    whoosh() { noise(0.2, 600, 2600, 1.2, 0.25); },
    whip() { noise(0.12, 900, 5000, 1.5, 0.35); tone(0.05, 2400, 1200, 'triangle', 0.15, 0.1); },
    smoke() { noise(0.45, 300, 1200, 0.7, 0.3, 'lowpass'); },
    ko() { tone(0.9, 300, 40, 'sawtooth', 0.35); noise(0.7, 1200, 100, 0.6, 0.6, 'lowpass'); },
    bell() { tone(0.6, 880, 870, 'sine', 0.3); tone(0.6, 1320, 1310, 'sine', 0.15); },
    select() { tone(0.08, 660, 990, 'square', 0.15); },
    move() { tone(0.04, 440, 440, 'square', 0.08); },
    land() { noise(0.08, 300, 100, 1, 0.2, 'lowpass'); },
  };
  return {
    init, get muted() { return muted; },
    toggle() { muted = !muted; localStorage.setItem('bvf_mute', muted ? '1' : '0'); if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    play(name, ...a) { if (!ctx || muted || !play[name]) return; try { play[name](...a); } catch (e) {} },
  };
})();
