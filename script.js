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
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => scheduleTone(ctx, frequency));
  } else {
    scheduleTone(ctx, frequency);
  }
}

function scheduleTone(ctx, frequency) {
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

// === Tine Data ===
// Left-to-right order as seen in mbira-a-tuning.jpg.
// Frequencies use 12-TET with A4 = 440 Hz.
// `row: 'long'` = longer tine (extends below the bridge in the photo)
// `row: 'short'` = shorter tine (sits above the bridge)

const NOTE_FREQ = {
  // octave 3
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
  'E3': 164.81, 'F3': 174.61, 'F#3': 185.00,
  'G3': 196.00, 'G#3': 207.65,
  'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  // octave 4
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
  'G4': 392.00, 'G#4': 415.30,
  'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  // octave 5
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99,
  'G5': 783.99, 'G#5': 830.61,
  'A5': 880.00, 'B5': 987.77,
};

const TINES = [
  // Left manual — alternating long/short, descending toward center then ascending
  { id: 0,  note: 'B3',  freq: NOTE_FREQ['B3'],  row: 'long',  side: 'left'   },
  { id: 1,  note: 'A4',  freq: NOTE_FREQ['A4'],  row: 'short', side: 'left'   },
  { id: 2,  note: 'G#3', freq: NOTE_FREQ['G#3'], row: 'long',  side: 'left'   },
  { id: 3,  note: 'G#4', freq: NOTE_FREQ['G#4'], row: 'short', side: 'left'   },
  { id: 4,  note: 'F#3', freq: NOTE_FREQ['F#3'], row: 'long',  side: 'left'   },
  { id: 5,  note: 'F#4', freq: NOTE_FREQ['F#4'], row: 'short', side: 'left'   },
  { id: 6,  note: 'E3',  freq: NOTE_FREQ['E3'],  row: 'long',  side: 'left'   },
  { id: 7,  note: 'D4',  freq: NOTE_FREQ['D4'],  row: 'short', side: 'left'   },
  { id: 8,  note: 'D3',  freq: NOTE_FREQ['D3'],  row: 'long',  side: 'left'   },
  { id: 9,  note: 'E4',  freq: NOTE_FREQ['E4'],  row: 'short', side: 'left'   },
  { id: 10, note: 'C#3', freq: NOTE_FREQ['C#3'], row: 'long',  side: 'left'   },
  { id: 11, note: 'A4b', freq: NOTE_FREQ['A4'],  row: 'short', side: 'left'   },

  // Center
  { id: 12, note: 'A3c', freq: NOTE_FREQ['A3'],  row: 'long',  side: 'center' },
  { id: 13, note: 'A4c', freq: NOTE_FREQ['A4'],  row: 'short', side: 'center' },

  // Right manual — ascending toward the right edge
  { id: 14, note: 'C#5', freq: NOTE_FREQ['C#5'], row: 'short', side: 'right'  },
  { id: 15, note: 'A4r', freq: NOTE_FREQ['A4'],  row: 'short', side: 'right'  },
  { id: 16, note: 'B4',  freq: NOTE_FREQ['B4'],  row: 'short', side: 'right'  },
  { id: 17, note: 'C#5r',freq: NOTE_FREQ['C#5'], row: 'short', side: 'right'  },
  { id: 18, note: 'D5',  freq: NOTE_FREQ['D5'],  row: 'short', side: 'right'  },
  { id: 19, note: 'E5',  freq: NOTE_FREQ['E5'],  row: 'short', side: 'right'  },
  { id: 20, note: 'F#5', freq: NOTE_FREQ['F#5'], row: 'short', side: 'right'  },
  { id: 21, note: 'A5',  freq: NOTE_FREQ['A5'],  row: 'short', side: 'right'  },
];

// === Rendering ===

function displayLabel(note) {
  // Strip internal suffix (e.g., 'A4c' -> 'A', 'C#5r' -> 'C#')
  return note.replace(/[0-9].*$/, '');
}

function renderMbira(root, tines) {
  // Three column groups: left, center, right.
  const groups = { left: [], center: [], right: [] };
  for (const tine of tines) groups[tine.side].push(tine);

  const fragment = document.createDocumentFragment();

  for (const side of ['left', 'center', 'right']) {
    const group = document.createElement('div');
    group.className = `tine-group tine-group--${side}`;

    for (const tine of groups[side]) {
      const el = document.createElement('button');
      el.className = `tine tine--${tine.row}`;
      el.dataset.id = String(tine.id);
      el.dataset.freq = String(tine.freq);
      el.setAttribute('aria-label', `${displayLabel(tine.note)}, ${tine.freq.toFixed(2)} Hz, ${tine.side}, tine ${tine.id + 1} of ${tines.length}`);

      const label = document.createElement('span');
      label.className = 'tine__label';
      label.textContent = displayLabel(tine.note);
      el.appendChild(label);

      group.appendChild(el);
    }

    fragment.appendChild(group);
  }

  root.replaceChildren(fragment);
}

// === Input Handling ===

function attachInput(root) {
  // Use pointer events on the root and delegate based on target.
  // pointerdown fires for touch, mouse, and pen — supports multi-touch.
  const pressed = new Map(); // pointerId -> tine element

  root.addEventListener('pointerdown', (e) => {
    const tineEl = e.target.closest('.tine');
    if (!tineEl) return;
    e.preventDefault();
    const freq = parseFloat(tineEl.dataset.freq);
    if (!Number.isFinite(freq)) return;

    tineEl.classList.add('is-pressed');
    pressed.set(e.pointerId, tineEl);
    try { tineEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    playNote(freq);
  }, { passive: false });

  const release = (e) => {
    const tineEl = pressed.get(e.pointerId);
    if (tineEl) {
      tineEl.classList.remove('is-pressed');
      pressed.delete(e.pointerId);
    }
  };

  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('pointerleave', release);
}

// === Bootstrap ===

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('mbira');
  renderMbira(root, TINES);
  attachInput(root);
});
