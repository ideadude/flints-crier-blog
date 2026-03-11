/**
 * mrfd.js — Magic Rainbow Fairy Dust Playback Library
 *
 * Plays sounds defined by MRFD URL params or config objects.
 * Reimplements the MRFD synthesis engine: sine oscillators with
 * per-note delay chains, convolution reverb, 3-band EQ, and limiter.
 *
 * Usage:
 *   const mrfd = new MRFD();
 *   mrfd.play('https://magicrainbowfairydust.com/?s=...');
 *   mrfd.play({ scale: 'pentatonic', ... });
 *   mrfd.playFromBase64('eyJzY2FsZSI6...');
 */

const MRFD_SCALES = {
  pentatonic:    [0, 2, 4, 7, 9],
  pent_minor:    [0, 3, 5, 7, 10],
  major:         [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  dorian:        [0, 2, 3, 5, 7, 9, 10],
  lydian:        [0, 2, 4, 6, 7, 9, 11],
  mixolydian:    [0, 2, 4, 5, 7, 9, 10],
  whole_tone:    [0, 2, 4, 6, 8, 10],
  phrygian:      [0, 1, 3, 5, 7, 8, 10],
  augmented:     [0, 3, 4, 7, 8, 11],
};

class MRFD {
  constructor() {
    this._ctx = null;
    this._reverbBuf = null;
    this._gen = 0;
  }

  _ensureCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  _buildReverb(ctx, duration, decay, reversed) {
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = reversed ? (i / len) : (1 - i / len);
        d[i] = (Math.random() * 2 - 1) * Math.pow(env, decay);
      }
    }
    return buf;
  }

  _midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  _getAllScaleNotes(P) {
    const intervals = MRFD_SCALES[P.scale] || MRFD_SCALES.pentatonic;
    const root = (P.octave + 1) * 12 + P.rootNoteIdx;
    const notes = [];
    const range = P.octaveRange || 1;

    for (let oct = 0; oct <= range; oct++) {
      for (const iv of intervals) {
        const midi = root + oct * 12 + iv;
        if (midi >= 36 && midi <= 96 && midi <= root + range * 12) {
          notes.push(midi);
        }
      }
    }
    return [...new Set(notes)].sort((a, b) => a - b);
  }

  _getActiveNotes(P) {
    const all = this._getAllScaleNotes(P);
    if (!all.length) return [];

    const rotation = Math.random();
    const rotIdx = Math.floor(rotation * all.length) % all.length;
    const count = Math.min(P.numNotes || 4, all.length);
    const step = Math.max(1, Math.floor(all.length / count));
    const notes = [];

    for (let i = 0; i < count; i++) {
      notes.push(all[(rotIdx + i * step) % all.length]);
    }
    return notes;
  }

  _sortNotes(notes, direction) {
    const sorted = [...notes];
    if (direction === 'asc') {
      sorted.sort((a, b) => a - b);
    } else if (direction === 'desc') {
      sorted.sort((a, b) => b - a);
    } else {
      // random shuffle
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
    }
    return sorted;
  }

  /**
   * Parse a MRFD URL or base64 string into a config object.
   */
  static parseURL(urlOrB64) {
    let b64;
    if (urlOrB64.includes('?s=')) {
      b64 = urlOrB64.split('?s=')[1];
    } else {
      b64 = urlOrB64;
    }
    return JSON.parse(atob(b64));
  }

  /**
   * Play a sound from a MRFD URL string, base64 string, or config object.
   * Returns a Promise that resolves when the sound finishes.
   */
  play(input) {
    let P;
    if (typeof input === 'string') {
      P = MRFD.parseURL(input);
    } else {
      P = { ...input };
    }
    return this._playConfig(P);
  }

  playFromBase64(b64) {
    return this._playConfig(JSON.parse(atob(b64)));
  }

  _playConfig(P) {
    const ctx = this._ensureCtx();
    const gen = ++this._gen;

    // Defaults
    P.volume = P.volume ?? 0.65;
    P.reverbAmount = P.reverbAmount ?? 0.3;
    P.delayTime = P.delayTime ?? 200;
    P.delayFeedback = P.delayFeedback ?? 0.3;
    P.delayVol = P.delayVol ?? 0.5;
    P.delayTone = P.delayTone ?? 50;
    P.noteDuration = P.noteDuration ?? 300;
    P.bpm = P.bpm ?? 120;
    P.noteDiv = P.noteDiv ?? 0.25;
    P.direction = P.direction ?? 'asc';
    P.numNotes = P.numNotes ?? 4;
    P.eqLow = P.eqLow ?? 0;
    P.eqMid = P.eqMid ?? 0;
    P.eqHigh = P.eqHigh ?? 0;
    P.delayEqLow = P.delayEqLow ?? 0;
    P.delayEqMid = P.delayEqMid ?? 0;
    P.delayEqHigh = P.delayEqHigh ?? 0;
    P.reverseEcho = P.reverseEcho ?? false;

    // Build audio graph
    const masterGain = ctx.createGain();
    masterGain.gain.value = P.volume;
    masterGain.connect(ctx.destination);

    // Limiter
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    limiter.connect(masterGain);

    // 3-band EQ
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    eqLow.gain.value = P.eqLow;

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1200;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = P.eqMid;

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;
    eqHigh.gain.value = P.eqHigh;

    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(limiter);

    // Reverb
    const reverbConv = ctx.createConvolver();
    reverbConv.buffer = this._buildReverb(ctx, 2.8, 2.5, P.reverseEcho);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = P.reverbAmount;
    eqHigh.connect(reverbConv);
    reverbConv.connect(reverbGain);
    reverbGain.connect(masterGain);

    // Delay output convergence
    const delayOutGain = ctx.createGain();
    delayOutGain.gain.value = P.delayVol;
    delayOutGain.connect(eqLow);

    // Get notes
    const notes = this._getActiveNotes(P);
    const sorted = this._sortNotes(notes, P.direction);

    // Schedule
    const now = ctx.currentTime + 0.02;
    const spacingMs = (60 / P.bpm) * P.noteDiv * 1000;
    const durSec = P.noteDuration / 1000;
    const delayTimeSec = Math.max(0.01, P.delayTime / 1000);
    const fb = Math.min(P.delayFeedback, 0.76);
    const toneLPF = 180 + (P.delayTone / 100) * 7500;
    const peakAmp = Math.min(1, 1.2 / Math.sqrt(sorted.length));

    let totalDuration = 0;

    for (let i = 0; i < sorted.length; i++) {
      const midi = sorted[i];
      const freq = this._midiToFreq(midi);
      const startSec = now + (i * spacingMs) / 1000;

      // Oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 7;

      // VCA envelope
      const vca = ctx.createGain();
      const attack = durSec * 0.06;
      vca.gain.setValueAtTime(0, startSec);
      vca.gain.linearRampToValueAtTime(peakAmp, startSec + attack);
      vca.gain.setValueAtTime(peakAmp, startSec + durSec * 0.5);
      vca.gain.exponentialRampToValueAtTime(0.001, startSec + durSec);

      osc.connect(vca);
      vca.connect(eqLow); // dry path

      // Per-note delay chain
      const delay = ctx.createDelay(6);
      delay.delayTime.value = delayTimeSec;

      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = toneLPF;

      // Delay EQ
      const dEqLow = ctx.createBiquadFilter();
      dEqLow.type = 'lowshelf';
      dEqLow.frequency.value = 250;
      dEqLow.gain.value = P.delayEqLow;

      const dEqMid = ctx.createBiquadFilter();
      dEqMid.type = 'peaking';
      dEqMid.frequency.value = 1200;
      dEqMid.Q.value = 1.0;
      dEqMid.gain.value = P.delayEqMid;

      const dEqHigh = ctx.createBiquadFilter();
      dEqHigh.type = 'highshelf';
      dEqHigh.frequency.value = 4000;
      dEqHigh.gain.value = P.delayEqHigh;

      const fbGain = ctx.createGain();
      fbGain.gain.setValueAtTime(fb, startSec);

      // Calculate echo decay time
      const logFb = Math.log(fb || 0.001);
      const echoDecay = Math.min(8, Math.abs(Math.log(0.001) / logFb) * delayTimeSec);
      fbGain.gain.exponentialRampToValueAtTime(0.001, startSec + durSec + echoDecay);

      vca.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(dEqLow);
      dEqLow.connect(dEqMid);
      dEqMid.connect(dEqHigh);
      dEqHigh.connect(fbGain);
      fbGain.connect(delay); // feedback loop
      dEqHigh.connect(delayOutGain); // to master

      osc.start(startSec);
      osc.stop(startSec + durSec + echoDecay + 0.1);

      totalDuration = Math.max(totalDuration, (i * spacingMs) / 1000 + durSec + echoDecay + 0.5);
    }

    return new Promise(resolve => {
      setTimeout(resolve, totalDuration * 1000);
    });
  }

  /**
   * Quick play a simple synth sound without full MRFD config.
   * Useful for short SFX.
   * @param {Object} opts - { freq, duration, type, volume, detune, attack, decay }
   */
  playSFX(opts = {}) {
    const ctx = this._ensureCtx();
    const now = ctx.currentTime + 0.01;
    const freq = opts.freq || 440;
    const dur = (opts.duration || 100) / 1000;
    const vol = opts.volume || 0.3;
    const type = opts.type || 'sawtooth';
    const attack = opts.attack || 0.005;
    const decay = opts.decay || dur;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (opts.detune) osc.detune.value = opts.detune;

    // Optional frequency sweep
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, now + dur);
    }

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0, now);
    vca.gain.linearRampToValueAtTime(vol, now + attack);
    vca.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Optional filter
    if (opts.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType || 'lowpass';
      filter.frequency.value = opts.filterFreq;
      if (opts.filterEnd) {
        filter.frequency.exponentialRampToValueAtTime(opts.filterEnd, now + dur);
      }
      osc.connect(filter);
      filter.connect(vca);
    } else {
      osc.connect(vca);
    }

    vca.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }

  /**
   * Ensure audio context is ready (call on first user interaction).
   */
  unlock() {
    this._ensureCtx();
  }

  get context() {
    return this._ctx;
  }
}

// Export for both module and global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MRFD;
}
