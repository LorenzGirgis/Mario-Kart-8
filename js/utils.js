window.MK = window.MK || {};

(function (MK) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function norm(a) {
    a = a % TAU;
    if (a > Math.PI) a -= TAU;
    else if (a < -Math.PI) a += TAU;
    return a;
  }
  function angleDiff(a, b) { return norm(a - b); }
  function lerpAngle(a, b, t) { return a + norm(b - a) * t; }
  function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  // Deterministic xorshift PRNG.
  function rng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function fmtTime(sec) {
    if (sec == null || !isFinite(sec)) return "--'--\"---";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var ms = Math.floor((sec * 1000) % 1000);
    return m + "'" + (s < 10 ? '0' : '') + s + '"' + (ms < 100 ? (ms < 10 ? '00' : '0') : '') + ms;
  }

  function ordinal(n) {
    var suffix = 'th';
    if (n % 10 === 1 && n % 100 !== 11) suffix = 'st';
    else if (n % 10 === 2 && n % 100 !== 12) suffix = 'nd';
    else if (n % 10 === 3 && n % 100 !== 13) suffix = 'rd';
    return n + suffix;
  }

  function mixHex(a, b, t) {
    var ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
    var r = Math.round(lerp((ca >> 16) & 255, (cb >> 16) & 255, t));
    var g = Math.round(lerp((ca >> 8) & 255, (cb >> 8) & 255, t));
    var bl = Math.round(lerp(ca & 255, cb & 255, t));
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  function shade(hex, amount) {
    var c = parseInt(hex.slice(1), 16);
    var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    if (amount >= 0) {
      r = Math.round(r + (255 - r) * amount);
      g = Math.round(g + (255 - g) * amount);
      b = Math.round(b + (255 - b) * amount);
    } else {
      r = Math.round(r * (1 + amount));
      g = Math.round(g * (1 + amount));
      b = Math.round(b * (1 + amount));
    }
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function outlinedText(ctx, text, x, y, size, fill, outline, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = outline || '#17102a';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  MK.U = {
    TAU: TAU,
    clamp: clamp,
    lerp: lerp,
    norm: norm,
    angleDiff: angleDiff,
    lerpAngle: lerpAngle,
    dist: dist,
    catmull: catmull,
    rng: rng,
    fmtTime: fmtTime,
    ordinal: ordinal,
    mixHex: mixHex,
    shade: shade,
    roundRect: roundRect,
    text: outlinedText
  };

  MK.SURF = { VOID: 0, GRASS: 1, DIRT: 2, ROAD: 3, BOOST: 4 };

  MK.SURF_SPEED = [0.0, 0.56, 0.78, 1.0, 1.0];
  MK.SURF_GRIP = [1.0, 0.72, 0.85, 1.0, 1.0];
})(window.MK);
