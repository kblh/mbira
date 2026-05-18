'use strict';

// === Audio Engine ===

let audioCtx = null;

function ensureAudioContext() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AC();
  return audioCtx;
}

function playNote(frequency) {
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const attack = 0.005;
  const decay = 2.2;
  const peakGain = 0.35;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(peakGain, now + attack);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
  masterGain.connect(ctx.destination);

  // Fundamental + harmonics — simulate metallic mbira tone
  const partials = [
    { ratio: 1.0,  gain: 1.0,  detune: 0   },
    { ratio: 2.0,  gain: 0.5,  detune: 3   },
    { ratio: 3.01, gain: 0.25, detune: -2  },
    { ratio: 5.02, gain: 0.12, detune: 4   },
  ];

  const oscillators = partials.map(p => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * p.ratio, now);
    osc.detune.setValueAtTime(p.detune, now);

    const partialGain = ctx.createGain();
    partialGain.gain.setValueAtTime(p.gain, now);

    osc.connect(partialGain);
    partialGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + attack + decay + 0.1);
    return osc;
  });

  // Cleanup on the last oscillator's ended event
  oscillators[oscillators.length - 1].onended = () => {
    masterGain.disconnect();
  };
}

// === Bootstrap (temporary test) ===

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('test-btn');
  if (btn) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      playNote(440);
    });
  }
});
