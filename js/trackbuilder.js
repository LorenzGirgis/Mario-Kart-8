(function (MK) {
  'use strict';

  var U = MK.U;
  var SURF = MK.SURF;

  var SIZE = 2048;        // world units, also the base texture resolution
  var SURF_SIZE = 512;    // surface lookup resolution
  var SAMPLES = 1200;     // centreline samples
  var MIPS = 4;

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function buildSamples(points) {
    var n = points.length;
    var S = new Array(SAMPLES);
    for (var i = 0; i < SAMPLES; i++) {
      var t = i / SAMPLES * n;
      var seg = Math.floor(t);
      var f = t - seg;
      var p0 = points[(seg - 1 + n) % n];
      var p1 = points[seg % n];
      var p2 = points[(seg + 1) % n];
      var p3 = points[(seg + 2) % n];
      S[i] = {
        x: U.catmull(p0[0], p1[0], p2[0], p3[0], f),
        y: U.catmull(p0[1], p1[1], p2[1], p3[1], f)
      };
    }
    // tangents, normals, cumulative length
    var total = 0;
    for (var j = 0; j < SAMPLES; j++) {
      var a = S[(j - 1 + SAMPLES) % SAMPLES];
      var b = S[(j + 1) % SAMPLES];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.hypot(dx, dy) || 1;
      S[j].tx = dx / len;
      S[j].ty = dy / len;
      S[j].nx = -S[j].ty;
      S[j].ny = S[j].tx;
      S[j].angle = Math.atan2(S[j].ty, S[j].tx);
    }
    for (var k = 0; k < SAMPLES; k++) {
      S[k].d = total;
      var nx = S[(k + 1) % SAMPLES];
      total += Math.hypot(nx.x - S[k].x, nx.y - S[k].y);
    }
    // curvature: heading change across a short window, per world unit
    for (var m = 0; m < SAMPLES; m++) {
      var back = S[(m - 7 + SAMPLES) % SAMPLES];
      var fwd = S[(m + 7) % SAMPLES];
      var da = Math.abs(U.angleDiff(fwd.angle, back.angle));
      var dd = Math.hypot(fwd.x - back.x, fwd.y - back.y) || 1;
      S[m].curv = da / dd;
    }
    return { list: S, length: total };
  }

  function offsetPath(S, w) {
    var out = new Array(S.length);
    for (var i = 0; i < S.length; i++) {
      out[i] = [S[i].x + S[i].nx * w, S[i].y + S[i].ny * w];
    }
    return out;
  }

  function fillRibbon(ctx, outer, inner, style) {
    ctx.beginPath();
    ctx.moveTo(outer[0][0], outer[0][1]);
    for (var i = 1; i < outer.length; i++) ctx.lineTo(outer[i][0], outer[i][1]);
    for (var j = inner.length - 1; j >= 0; j--) ctx.lineTo(inner[j][0], inner[j][1]);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  function quad(ctx, S, i0, i1, w0, w1, style) {
    var a = S[i0 % S.length], b = S[i1 % S.length];
    ctx.beginPath();
    ctx.moveTo(a.x + a.nx * w0, a.y + a.ny * w0);
    ctx.lineTo(b.x + b.nx * w0, b.y + b.ny * w0);
    ctx.lineTo(b.x + b.nx * w1, b.y + b.ny * w1);
    ctx.lineTo(a.x + a.nx * w1, a.y + a.ny * w1);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  function speckle(ctx, rnd, count, size, colors, w, h) {
    for (var i = 0; i < count; i++) {
      ctx.fillStyle = colors[(rnd() * colors.length) | 0];
      var r = size * (0.4 + rnd() * 1.2);
      ctx.beginPath();
      ctx.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd() * 0.8), rnd() * Math.PI, 0, U.TAU);
      ctx.fill();
    }
  }

  // ----------------------------------------------------------- base painting
  function paintBase(ctx, def, rnd) {
    var th = def.theme;
    ctx.fillStyle = th.outer;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (th.base === 'grass') {
      // mown stripes plus random tufts
      ctx.fillStyle = th.outer2;
      for (var s = 0; s < SIZE; s += 128) ctx.fillRect(s, 0, 64, SIZE);
      speckle(ctx, rnd, 2600, 9, [U.shade(th.outer, 0.12), U.shade(th.outer2, -0.14), '#6cb84a'], SIZE, SIZE);
    } else if (th.base === 'water') {
      var g = ctx.createLinearGradient(0, 0, 0, SIZE);
      g.addColorStop(0, th.outer);
      g.addColorStop(1, th.outer2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#bfe8ff';
      ctx.lineWidth = 5;
      for (var w = 0; w < 900; w++) {
        var x = rnd() * SIZE, y = rnd() * SIZE, len = 20 + rnd() * 50;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.5, y - 8, x + len, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (th.base === 'lava') {
      var lg = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 100, SIZE / 2, SIZE / 2, SIZE * 0.8);
      lg.addColorStop(0, '#ffc44d');
      lg.addColorStop(0.35, th.outer);
      lg.addColorStop(1, th.outer2);
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, rnd, 1600, 12, ['#ffdf7a', '#ff7a2a', '#6d1a06'], SIZE, SIZE);
    } else if (th.base === 'space') {
      var sg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      sg.addColorStop(0, th.outer);
      sg.addColorStop(0.5, th.outer2);
      sg.addColorStop(1, '#07031c');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      for (var st = 0; st < 2400; st++) {
        var a = 0.25 + rnd() * 0.75;
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        var r2 = rnd() < 0.12 ? 3 : 1.5;
        ctx.fillRect(rnd() * SIZE, rnd() * SIZE, r2, r2);
      }
    }
  }

  function paintRoad(ctx, def, S, rnd) {
    var th = def.theme;
    var hw = def.roadWidth / 2;

    if (th.apron) {
      var aw = hw * th.apronWidth + 40;
      fillRibbon(ctx, offsetPath(S, aw), offsetPath(S, -aw), th.apronColor);
      ctx.save();
      ctx.beginPath();
      var o = offsetPath(S, aw), ii = offsetPath(S, -aw);
      ctx.moveTo(o[0][0], o[0][1]);
      for (var q = 1; q < o.length; q++) ctx.lineTo(o[q][0], o[q][1]);
      for (var q2 = ii.length - 1; q2 >= 0; q2--) ctx.lineTo(ii[q2][0], ii[q2][1]);
      ctx.closePath();
      ctx.clip();
      speckle(ctx, rnd, 2200, 8, [U.shade(th.apronColor, 0.14), U.shade(th.apronColor, -0.18)], SIZE, SIZE);
      ctx.restore();
    }

    // rumble strip just outside the asphalt
    var step = 12;
    for (var i = 0; i < S.length; i += step) {
      var col = ((i / step) | 0) % 2 === 0 ? th.rumbleA : th.rumbleB;
      quad(ctx, S, i, i + step, hw, hw + 18, col);
      quad(ctx, S, i, i + step, -hw, -hw - 18, col);
    }

    if (th.road === 'rainbow') {
      for (var r = 0; r < S.length; r += 8) {
        var hue = (r / S.length) * 720 % 360;
        quad(ctx, S, r, r + 8, -hw, hw, 'hsl(' + hue.toFixed(0) + ',85%,58%)');
        quad(ctx, S, r, r + 8, -hw * 0.34, hw * 0.34, 'hsl(' + ((hue + 40) % 360).toFixed(0) + ',90%,70%)');
      }
    } else {
      fillRibbon(ctx, offsetPath(S, hw), offsetPath(S, -hw), th.road);
      ctx.save();
      ctx.beginPath();
      var ro = offsetPath(S, hw), ri = offsetPath(S, -hw);
      ctx.moveTo(ro[0][0], ro[0][1]);
      for (var p = 1; p < ro.length; p++) ctx.lineTo(ro[p][0], ro[p][1]);
      for (var p2 = ri.length - 1; p2 >= 0; p2--) ctx.lineTo(ri[p2][0], ri[p2][1]);
      ctx.closePath();
      ctx.clip();
      speckle(ctx, rnd, 3000, 7, [th.road2, U.shade(th.road, 0.08), U.shade(th.road, -0.1)], SIZE, SIZE);
      // dashed centre line
      ctx.restore();
      for (var c = 0; c < S.length; c += 24) {
        quad(ctx, S, c, c + 12, -3, 3, 'rgba(255,255,255,0.35)');
      }
    }

    // white edge lines
    for (var e = 0; e < S.length; e += 40) {
      quad(ctx, S, e, e + 41, hw - 10, hw - 3, th.edge);
      quad(ctx, S, e, e + 41, -hw + 3, -hw + 10, th.edge);
    }
  }

  function paintBoostPads(ctx, def, S) {
    var hw = def.roadWidth / 2;
    def.boostFracs.forEach(function (f) {
      var i0 = Math.floor(f * S.length);
      for (var k = 0; k < 3; k++) {
        var i = i0 + k * 14;
        quad(ctx, S, i, i + 12, -hw * 0.72, hw * 0.72, '#ff9b1f');
        quad(ctx, S, i + 2, i + 8, -hw * 0.6, hw * 0.6, '#ffe066');
        quad(ctx, S, i + 8, i + 12, -hw * 0.3, hw * 0.3, '#fff6c2');
      }
    });
  }

  function paintStartLine(ctx, def, S) {
    var hw = def.roadWidth / 2;
    var i0 = 4;
    var cells = 10;
    for (var row = 0; row < 2; row++) {
      for (var c = 0; c < cells; c++) {
        var w0 = -hw + (c / cells) * hw * 2;
        var w1 = -hw + ((c + 1) / cells) * hw * 2;
        var dark = (c + row) % 2 === 0;
        quad(ctx, S, i0 + row * 7, i0 + row * 7 + 7, w0, w1, dark ? '#1d1a24' : '#f6f3ea');
      }
    }
    // start banner shadow on the road
    quad(ctx, S, i0 + 14, i0 + 16, -hw, hw, 'rgba(0,0,0,0.18)');
  }

  // --------------------------------------------------------- surface mapping
  function buildSurface(def, S) {
    var scale = SURF_SIZE / SIZE;
    var cv = makeCanvas(SURF_SIZE, SURF_SIZE);
    var ctx = cv.getContext('2d');
    var th = def.theme;
    var baseVal = (th.base === 'grass') ? 70 : 10;
    ctx.fillStyle = 'rgb(' + baseVal + ',' + baseVal + ',' + baseVal + ')';
    ctx.fillRect(0, 0, SURF_SIZE, SURF_SIZE);
    ctx.save();
    ctx.scale(scale, scale);

    var hw = def.roadWidth / 2;
    if (th.apron) {
      var aw = hw * th.apronWidth + 40;
      fillRibbon(ctx, offsetPath(S, aw), offsetPath(S, -aw), 'rgb(130,130,130)');
    }
    fillRibbon(ctx, offsetPath(S, hw + 16), offsetPath(S, -hw - 16), 'rgb(190,190,190)');
    def.boostFracs.forEach(function (f) {
      var i0 = Math.floor(f * S.length);
      for (var k = 0; k < 3; k++) {
        quad(ctx, S, i0 + k * 14, i0 + k * 14 + 12, -hw * 0.72, hw * 0.72, 'rgb(250,250,250)');
      }
    });
    ctx.restore();

    var data = ctx.getImageData(0, 0, SURF_SIZE, SURF_SIZE).data;
    var map = new Uint8Array(SURF_SIZE * SURF_SIZE);
    for (var i = 0, p = 0; i < map.length; i++, p += 4) {
      var v = data[p];
      map[i] = v < 40 ? SURF.VOID : (v < 100 ? SURF.GRASS : (v < 160 ? SURF.DIRT : (v < 220 ? SURF.ROAD : SURF.BOOST)));
    }
    return map;
  }

  // --------------------------------------------------------------- mip chain
  function buildMips(baseCanvas) {
    var mips = [];
    var cur = baseCanvas;
    for (var l = 0; l < MIPS; l++) {
      var size = SIZE >> l;
      if (l > 0) {
        var next = makeCanvas(size, size);
        var c = next.getContext('2d');
        c.imageSmoothingEnabled = true;
        c.drawImage(cur, 0, 0, size, size);
        cur = next;
      }
      var img = cur.getContext('2d').getImageData(0, 0, size, size);
      mips.push({ size: size, data: new Uint32Array(img.data.buffer) });
    }
    return mips;
  }

  // -------------------------------------------------------------- the builder
  MK.buildTrack = function (def) {
    var rnd = U.rng(def.seed);
    var sp = buildSamples(def.points);
    var S = sp.list;

    var canvas = makeCanvas(SIZE, SIZE);
    var ctx = canvas.getContext('2d');
    paintBase(ctx, def, rnd);
    paintRoad(ctx, def, S, rnd);
    paintBoostPads(ctx, def, S);
    paintStartLine(ctx, def, S);

    var mips = buildMips(canvas);
    var surface = buildSurface(def, S);

    // props scattered along both verges
    var props = [];
    for (var i = 0; i < S.length; i += def.propEvery) {
      for (var side = -1; side <= 1; side += 2) {
        if (rnd() < 0.18) continue;
        var type = def.props[(rnd() * def.props.length) | 0];
        var size = MK.PROP_SIZES[type];
        var off = side * (def.roadWidth / 2 * (def.theme.apron ? def.theme.apronWidth : 1) + 70 + rnd() * 90);
        props.push({
          x: S[i].x + S[i].nx * off,
          y: S[i].y + S[i].ny * off,
          type: type,
          w: size.w * (0.85 + rnd() * 0.4),
          h: size.h * (0.85 + rnd() * 0.4)
        });
      }
    }

    // item boxes
    var boxes = [];
    var lat = [-0.68, -0.34, 0, 0.34, 0.68];
    def.itemFracs.forEach(function (f) {
      var idx = Math.floor(f * S.length);
      var s = S[idx];
      lat.forEach(function (l) {
        var o = l * (def.roadWidth / 2 - 22);
        boxes.push({
          x: s.x + s.nx * o, y: s.y + s.ny * o,
          active: true, timer: 0, spin: Math.random() * U.TAU
        });
      });
    });

    // starting grid: two columns behind the line
    var grid = [];
    for (var g = 0; g < 8; g++) {
      var row = Math.floor(g / 2);
      var idx2 = (S.length - 26 - row * 20 + S.length) % S.length;
      var s2 = S[idx2];
      var side2 = (g % 2 === 0) ? -1 : 1;
      var o2 = side2 * def.roadWidth * 0.22;
      grid.push({
        x: s2.x + s2.nx * o2,
        y: s2.y + s2.ny * o2,
        angle: s2.angle,
        index: idx2
      });
    }

    var track = {
      def: def,
      size: SIZE,
      samples: S,
      count: S.length,
      length: sp.length,
      mips: mips,
      surface: surface,
      surfScale: SURF_SIZE / SIZE,
      surfSize: SURF_SIZE,
      props: props,
      boxes: boxes,
      grid: grid,
      voidColor: (function () {
        var c = def.theme.base === 'space' ? '#07031c' : def.theme.outer2;
        var n = parseInt(U.shade(c, 0).slice(1), 16);
        // ABGR for the Uint32 framebuffer
        return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
      })(),

      surfaceAt: function (x, y) {
        var sx = (x * this.surfScale) | 0;
        var sy = (y * this.surfScale) | 0;
        if (sx < 0 || sy < 0 || sx >= SURF_SIZE || sy >= SURF_SIZE) return SURF.VOID;
        return this.surface[sy * SURF_SIZE + sx];
      },

      // Closest centreline sample. `hint` keeps the search local & cheap.
      nearest: function (x, y, hint) {
        var best = -1, bd = Infinity, i, dx, dy, d;
        if (hint != null && hint >= 0) {
          for (var k = -70; k <= 70; k++) {
            i = (hint + k + this.count) % this.count;
            dx = S[i].x - x; dy = S[i].y - y;
            d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = i; }
          }
          if (bd < 420 * 420) return best;
        }
        bd = Infinity;
        for (i = 0; i < this.count; i += 3) {
          dx = S[i].x - x; dy = S[i].y - y;
          d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = i; }
        }
        for (var j = -3; j <= 3; j++) {
          i = (best + j + this.count) % this.count;
          dx = S[i].x - x; dy = S[i].y - y;
          d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = i; }
        }
        return best;
      },

      lateralOf: function (x, y, idx) {
        var s = S[idx];
        return (x - s.x) * s.nx + (y - s.y) * s.ny;
      },

      ahead: function (idx, worldDist) {
        var spacing = this.length / this.count;
        return (idx + Math.round(worldDist / spacing)) % this.count;
      },

      sample: function (idx) { return S[((idx % this.count) + this.count) % this.count]; }
    };

    return track;
  };

  MK.TRACK_SIZE = SIZE;
})(window.MK);
