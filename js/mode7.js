(function (MK) {
  'use strict';

  var U = MK.U;

  var W = 480, H = 270;          // internal render resolution, upscaled to the page
  var FOCAL = 320;
  var HORIZON = 102;
  var MAX_Z = 4200;
  var FOG_START = 1900;
  var STRIP_W = 1920;
  var STRIP_H = 132;

  var M = {
    W: W, H: H, FOCAL: FOCAL, HORIZON: HORIZON,
    canvas: null, ctx: null, img: null, buf: null,
    fx: 1, fy: 0, rx: 0, ry: 1, cam: null
  };

  M.init = function () {
    M.canvas = MK.Sprites.makeCanvas(W, H);
    M.ctx = M.canvas.getContext('2d');
    M.ctx.imageSmoothingEnabled = false;
    M.img = M.ctx.createImageData(W, H);
    M.buf = new Uint32Array(M.img.data.buffer);
  };

  // --------------------------------------------------------------- sky strip
  function buildStrip(theme) {
    var cv = MK.Sprites.makeCanvas(STRIP_W, STRIP_H);
    var g = cv.getContext('2d');
    var rnd = U.rng(0xBEEF);

    if (theme.base === 'space') {
      for (var s = 0; s < 1400; s++) {
        var a = 0.2 + rnd() * 0.8;
        g.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        var sz = rnd() < 0.1 ? 3 : 1.6;
        g.fillRect(rnd() * STRIP_W, rnd() * (STRIP_H - 24), sz, sz);
      }
      // distant nebula planets
      [[300, 50, 34, '#ff86d0'], [980, 38, 46, '#6ab8ff'], [1520, 58, 26, '#ffd36a']].forEach(function (p) {
        var rg = g.createRadialGradient(p[0], p[1], 2, p[0], p[1], p[2]);
        rg.addColorStop(0, p[3]);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(p[0], p[1], p[2], 0, U.TAU); g.fill();
      });
    } else {
      // sun
      var sunX = 520, sunY = 42;
      var sg = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, 56);
      sg.addColorStop(0, theme.sun);
      sg.addColorStop(0.35, 'rgba(255,240,170,0.55)');
      sg.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = sg;
      g.beginPath(); g.arc(sunX, sunY, 56, 0, U.TAU); g.fill();
      g.fillStyle = theme.sun;
      g.beginPath(); g.arc(sunX, sunY, 17, 0, U.TAU); g.fill();

      if (theme.base !== 'lava') {
        g.fillStyle = 'rgba(255,255,255,0.8)';
        for (var c = 0; c < 26; c++) {
          var cx = rnd() * STRIP_W, cy = 14 + rnd() * 46, cw = 26 + rnd() * 46;
          g.beginPath();
          g.ellipse(cx, cy, cw, cw * 0.35, 0, 0, U.TAU);
          g.ellipse(cx + cw * 0.5, cy + 4, cw * 0.55, cw * 0.3, 0, 0, U.TAU);
          g.fill();
        }
      }
    }

    // two mountain ranges anchored to the bottom of the strip
    function range(color, amp, base, step, seed) {
      var r = U.rng(seed);
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, STRIP_H);
      var y = STRIP_H - base;
      for (var x = 0; x <= STRIP_W + step; x += step) {
        var peak = STRIP_H - base - amp * (0.35 + r() * 0.65);
        g.lineTo(x, peak);
        g.lineTo(x + step * 0.5, y);
      }
      g.lineTo(STRIP_W, STRIP_H);
      g.closePath();
      g.fill();
    }
    range(theme.hills2, 46, 10, 150, 0x1234);
    range(theme.hills, 32, 0, 96, 0x9876);
    return cv;
  }

  M.getStrip = function (track) {
    if (!track._strip) track._strip = buildStrip(track.def.theme);
    return track._strip;
  };

  M.drawSky = function (track, cam) {
    var ctx = M.ctx;
    var th = track.def.theme;
    var grd = ctx.createLinearGradient(0, 0, 0, HORIZON + 6);
    grd.addColorStop(0, th.skyTop);
    grd.addColorStop(1, th.skyBottom);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, HORIZON + 6);

    var strip = M.getStrip(track);
    var off = -(cam.yaw / U.TAU) * STRIP_W;
    off = ((off % STRIP_W) + STRIP_W) % STRIP_W;
    var y = HORIZON + 4 - STRIP_H;
    ctx.drawImage(strip, -off, y);
    ctx.drawImage(strip, -off + STRIP_W, y);
    if (off < W) ctx.drawImage(strip, -off - STRIP_W, y);
  };

  // ------------------------------------------------------------- ground pass
  M.renderGround = function (track, cam) {
    var buf = M.buf;
    var mips = track.mips;
    var fx = Math.cos(cam.yaw), fy = Math.sin(cam.yaw);
    var rx = -fy, ry = fx;
    var fogCol = track.def.theme.fog;
    var fogN = parseInt(fogCol.slice(1), 16);
    var fr = (fogN >> 16) & 255, fg = (fogN >> 8) & 255, fb = fogN & 255;
    var voidC = track.voidColor;
    var topRow = H;

    for (var sy = H - 1; sy > HORIZON; sy--) {
      var dy = sy - HORIZON;
      var z = cam.h * FOCAL / dy;
      if (z > MAX_Z) break;
      topRow = sy;

      var unitsPerPx = z / FOCAL;
      var lvl = 0;
      while (lvl < mips.length - 1 && unitsPerPx > (1 << lvl) * 1.3) lvl++;
      var mip = mips[lvl];
      var tsize = mip.size;
      var src = mip.data;
      var tscale = tsize / track.size;

      var stepX = rx * unitsPerPx;
      var stepY = ry * unitsPerPx;
      var wx = cam.x + fx * z - stepX * (W / 2);
      var wy = cam.y + fy * z - stepY * (W / 2);

      var fog = z > FOG_START ? (z - FOG_START) / (MAX_Z - FOG_START) : 0;
      var fi = (U.clamp(fog, 0, 1) * 0.92 * 256) | 0;
      var row = sy * W;

      if (fi < 3) {
        for (var px = 0; px < W; px++) {
          var tx = (wx * tscale) | 0, ty = (wy * tscale) | 0;
          buf[row + px] = (tx >= 0 && ty >= 0 && tx < tsize && ty < tsize)
            ? src[ty * tsize + tx] : voidC;
          wx += stepX; wy += stepY;
        }
      } else {
        for (var px2 = 0; px2 < W; px2++) {
          var tx2 = (wx * tscale) | 0, ty2 = (wy * tscale) | 0;
          var c = (tx2 >= 0 && ty2 >= 0 && tx2 < tsize && ty2 < tsize)
            ? src[ty2 * tsize + tx2] : voidC;
          var r = c & 255, g2 = (c >>> 8) & 255, b = (c >>> 16) & 255;
          r += ((fr - r) * fi) >> 8;
          g2 += ((fg - g2) * fi) >> 8;
          b += ((fb - b) * fi) >> 8;
          buf[row + px2] = 0xFF000000 | (b << 16) | (g2 << 8) | r;
          wx += stepX; wy += stepY;
        }
      }
    }

    M.ctx.putImageData(M.img, 0, 0, 0, topRow, W, H - topRow);
  };

  // ------------------------------------------------------------- projection
  M.begin = function (cam) {
    M.cam = cam;
    M.fx = Math.cos(cam.yaw);
    M.fy = Math.sin(cam.yaw);
    M.rx = -M.fy;
    M.ry = M.fx;
  };

  M.project = function (x, y) {
    var dx = x - M.cam.x, dy = y - M.cam.y;
    var depth = dx * M.fx + dy * M.fy;
    if (depth < 26) return null;
    var lat = dx * M.rx + dy * M.ry;
    var scale = FOCAL / depth;
    return {
      sx: W / 2 + lat * scale,
      sy: HORIZON + M.cam.h * scale,
      scale: scale,
      depth: depth
    };
  };

  M.fogAmount = function (depth) {
    if (depth <= FOG_START) return 0;
    return U.clamp((depth - FOG_START) / (MAX_Z - FOG_START), 0, 1) * 0.92;
  };

  MK.Mode7 = M;
})(window.MK);
