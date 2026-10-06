(function (MK) {
  'use strict';

  // Everything is synthesised with the WebAudio API so the game stays
  // dependency free and works straight from the filesystem.

  var A = {
    ctx: null,
    master: null,
    musicBus: null,
    sfxBus: null,
    muted: false,
    engine: null,
    noiseBuf: null,
    song: null,
    step: 0,
    nextStepTime: 0,
    stepDur: 0.125
  };

  var SONGS = [
    { // Mushroom Circuit - bouncy major
      bpm: 168,
      lead: [0, 4, 7, 12, 11, 7, 4, 7, 5, 9, 12, 9, 7, 4, 2, 4],
      bass: [-12, null, -5, null, -12, null, -7, null, -10, null, -3, null, -8, null, -8, -7],
      root: 60
    },
    { // Beach Bowl - laid back
      bpm: 150,
      lead: [0, 2, 5, 7, 9, 7, 5, 2, 0, 4, 7, 11, 9, 7, 4, 0],
      bass: [-12, null, -12, -7, -10, null, -10, -5, -8, null, -8, -3, -7, null, -5, null],
      root: 62
    },
    { // Rainbow Rush - dreamy minor
      bpm: 180,
      lead: [0, 3, 7, 10, 12, 10, 7, 3, -2, 2, 5, 9, 12, 9, 5, 2],
      bass: [-12, -12, -5, -5, -10, -10, -3, -3, -14, -14, -7, -7, -12, -12, -5, -7],
      root: 57
    }
  ];

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  A.init = function () {
    if (A.ctx) return;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    A.ctx = new Ctor();
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.85;
    A.master.connect(A.ctx.destination);

    A.musicBus = A.ctx.createGain();
    A.musicBus.gain.value = 0.3;
    A.musicBus.connect(A.master);

    A.sfxBus = A.ctx.createGain();
    A.sfxBus.gain.value = 0.55;
    A.sfxBus.connect(A.master);

    var len = Math.floor(A.ctx.sampleRate * 1.2);
    A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    var d = A.noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  };

  A.resume = function () {
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };

  A.toggleMute = function () {
    A.init();
    A.muted = !A.muted;
    if (A.master) A.master.gain.value = A.muted ? 0 : 0.85;
    return A.muted;
  };

  function tone(opts) {
    if (!A.ctx || A.muted) return;
    var t0 = opts.at || A.ctx.currentTime;
    var osc = A.ctx.createOscillator();
    var gain = A.ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.f0, t0);
    if (opts.f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t0 + opts.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(opts.gain || 0.2, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain);
    gain.connect(opts.bus || A.sfxBus);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  function noise(opts) {
    if (!A.ctx || A.muted || !A.noiseBuf) return;
    var t0 = opts.at || A.ctx.currentTime;
    var src = A.ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    var filt = A.ctx.createBiquadFilter();
    filt.type = opts.filter || 'bandpass';
    filt.frequency.setValueAtTime(opts.f0, t0);
    if (opts.f1 != null) filt.frequency.exponentialRampToValueAtTime(Math.max(60, opts.f1), t0 + opts.dur);
    filt.Q.value = opts.q || 1.2;
    var gain = A.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(opts.gain || 0.2, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filt); filt.connect(gain); gain.connect(A.sfxBus);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  A.sfx = function (name) {
    if (!A.ctx) return;
    var now = A.ctx.currentTime;
    switch (name) {
      case 'menu':
        tone({ f0: 660, f1: 880, dur: 0.09, gain: 0.16, type: 'square' });
        break;
      case 'confirm':
        tone({ f0: 660, dur: 0.08, gain: 0.18, type: 'square' });
        tone({ f0: 990, dur: 0.14, gain: 0.18, type: 'square', at: now + 0.08 });
        break;
      case 'back':
        tone({ f0: 440, f1: 220, dur: 0.14, gain: 0.16, type: 'square' });
        break;
      case 'count':
        tone({ f0: 520, dur: 0.16, gain: 0.22, type: 'square' });
        break;
      case 'go':
        tone({ f0: 780, dur: 0.1, gain: 0.26, type: 'square' });
        tone({ f0: 1170, dur: 0.3, gain: 0.24, type: 'square', at: now + 0.1 });
        break;
      case 'boost':
        noise({ f0: 420, f1: 2600, dur: 0.42, gain: 0.3, filter: 'bandpass', q: 0.8 });
        tone({ f0: 300, f1: 1200, dur: 0.35, gain: 0.12, type: 'sawtooth' });
        break;
      case 'drift':
        noise({ f0: 2400, f1: 1600, dur: 0.22, gain: 0.1, filter: 'highpass' });
        break;
      case 'hop':
        tone({ f0: 300, f1: 620, dur: 0.1, gain: 0.14, type: 'triangle' });
        break;
      case 'coin':
        tone({ f0: 1046, dur: 0.06, gain: 0.18, type: 'square' });
        tone({ f0: 1568, dur: 0.14, gain: 0.16, type: 'square', at: now + 0.06 });
        break;
      case 'itembox':
        tone({ f0: 523, dur: 0.06, gain: 0.16, type: 'square' });
        tone({ f0: 659, dur: 0.06, gain: 0.16, type: 'square', at: now + 0.06 });
        tone({ f0: 784, dur: 0.12, gain: 0.16, type: 'square', at: now + 0.12 });
        break;
      case 'roulette':
        tone({ f0: 880, dur: 0.03, gain: 0.07, type: 'square' });
        break;
      case 'throw':
        noise({ f0: 900, f1: 2800, dur: 0.2, gain: 0.18 });
        break;
      case 'hit':
        tone({ f0: 180, f1: 60, dur: 0.3, gain: 0.3, type: 'sawtooth' });
        noise({ f0: 700, f1: 160, dur: 0.3, gain: 0.26, filter: 'lowpass' });
        break;
      case 'fall':
        tone({ f0: 700, f1: 90, dur: 0.75, gain: 0.22, type: 'triangle' });
        break;
      case 'lightning':
        noise({ f0: 3000, f1: 200, dur: 0.6, gain: 0.3, filter: 'lowpass' });
        break;
      case 'star':
        for (var i = 0; i < 6; i++) {
          tone({ f0: 660 * Math.pow(2, i / 12), dur: 0.08, gain: 0.14, type: 'square', at: now + i * 0.05 });
        }
        break;
      case 'lap':
        tone({ f0: 784, dur: 0.1, gain: 0.2, type: 'square' });
        tone({ f0: 1046, dur: 0.18, gain: 0.2, type: 'square', at: now + 0.1 });
        break;
      case 'finish':
        var notes = [0, 4, 7, 12, 7, 12, 16];
        for (var j = 0; j < notes.length; j++) {
          tone({ f0: freq(60 + notes[j]), dur: 0.2, gain: 0.2, type: 'square', at: now + j * 0.13 });
          tone({ f0: freq(48 + notes[j]), dur: 0.2, gain: 0.12, type: 'triangle', at: now + j * 0.13 });
        }
        break;
    }
  };

  // ---- engine loop -------------------------------------------------------
  A.startEngine = function () {
    A.init();
    if (!A.ctx || A.engine) return;
    var osc = A.ctx.createOscillator();
    var sub = A.ctx.createOscillator();
    var filt = A.ctx.createBiquadFilter();
    var gain = A.ctx.createGain();
    osc.type = 'sawtooth';
    sub.type = 'square';
    osc.frequency.value = 70;
    sub.frequency.value = 35;
    filt.type = 'lowpass';
    filt.frequency.value = 700;
    filt.Q.value = 3;
    gain.gain.value = 0.0;
    osc.connect(filt); sub.connect(filt);
    filt.connect(gain); gain.connect(A.master);
    osc.start(); sub.start();
    A.engine = { osc: osc, sub: sub, gain: gain, filt: filt };
  };

  A.stopEngine = function () {
    if (!A.engine) return;
    try { A.engine.osc.stop(); A.engine.sub.stop(); } catch (e) { /* already stopped */ }
    A.engine = null;
  };

  A.setEngine = function (ratio, boosting) {
    if (!A.engine || !A.ctx) return;
    var t = A.ctx.currentTime;
    var base = 58 + ratio * 150 + (boosting ? 40 : 0);
    A.engine.osc.frequency.setTargetAtTime(base, t, 0.06);
    A.engine.sub.frequency.setTargetAtTime(base * 0.5, t, 0.06);
    A.engine.filt.frequency.setTargetAtTime(500 + ratio * 1400, t, 0.08);
    A.engine.gain.gain.setTargetAtTime(0.055 + ratio * 0.06, t, 0.1);
  };

  // ---- music -------------------------------------------------------------
  A.playMusic = function (index) {
    A.init();
    if (!A.ctx) return;
    A.song = SONGS[index % SONGS.length];
    A.stepDur = 60 / A.song.bpm / 2;
    A.step = 0;
    A.nextStepTime = A.ctx.currentTime + 0.1;
  };

  A.stopMusic = function () { A.song = null; };

  A.update = function () {
    if (!A.ctx || !A.song || A.muted) return;
    var horizon = A.ctx.currentTime + 0.3;
    var guard = 0;
    while (A.nextStepTime < horizon && guard++ < 32) {
      var s = A.step % A.song.lead.length;
      var lead = A.song.lead[s];
      var bass = A.song.bass[s % A.song.bass.length];
      if (lead != null) {
        tone({
          f0: freq(A.song.root + lead), dur: A.stepDur * 0.85, gain: 0.1,
          type: 'square', at: A.nextStepTime, bus: A.musicBus
        });
        tone({
          f0: freq(A.song.root + lead + 7), dur: A.stepDur * 0.5, gain: 0.03,
          type: 'triangle', at: A.nextStepTime, bus: A.musicBus
        });
      }
      if (bass != null) {
        tone({
          f0: freq(A.song.root + bass), dur: A.stepDur * 0.9, gain: 0.12,
          type: 'triangle', at: A.nextStepTime, bus: A.musicBus
        });
      }
      if (s % 4 === 0) {
        noise({ f0: 180, f1: 90, dur: 0.1, gain: 0.07, filter: 'lowpass', at: A.nextStepTime });
      } else if (s % 2 === 1) {
        noise({ f0: 6000, dur: 0.04, gain: 0.025, filter: 'highpass', at: A.nextStepTime });
      }
      A.nextStepTime += A.stepDur;
      A.step++;
    }
  };

  MK.Audio = A;
})(window.MK);
