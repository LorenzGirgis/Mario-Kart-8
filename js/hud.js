(function (MK) {
  'use strict';

  var U = MK.U;

  function minimapCanvas(track) {
    if (track._minimap) return track._minimap;
    var SZ = 180, pad = 14;
    var cv = MK.Sprites.makeCanvas(SZ, SZ);
    var g = cv.getContext('2d');
    var S = track.samples;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < S.length; i++) {
      if (S[i].x < minX) minX = S[i].x;
      if (S[i].x > maxX) maxX = S[i].x;
      if (S[i].y < minY) minY = S[i].y;
      if (S[i].y > maxY) maxY = S[i].y;
    }
    var span = Math.max(maxX - minX, maxY - minY) || 1;
    var scale = (SZ - pad * 2) / span;
    var ox = pad - minX * scale + ((span - (maxX - minX)) * scale) / 2;
    var oy = pad - minY * scale + ((span - (maxY - minY)) * scale) / 2;

    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    for (var j = 0; j < S.length; j++) {
      var x = S[j].x * scale + ox, y = S[j].y * scale + oy;
      if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 11;
    g.stroke();
    g.strokeStyle = '#e7e2f5';
    g.lineWidth = 7;
    g.stroke();

    // start line marker
    var s0 = S[4];
    g.strokeStyle = '#ff4d4d';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo((s0.x + s0.nx * 90) * scale + ox, (s0.y + s0.ny * 90) * scale + oy);
    g.lineTo((s0.x - s0.nx * 90) * scale + ox, (s0.y - s0.ny * 90) * scale + oy);
    g.stroke();

    track._minimap = cv;
    track._mmProj = { scale: scale, ox: ox, oy: oy, size: SZ };
    return cv;
  }

  function drawMinimap(ctx, race, x, y, size) {
    var track = race.track;
    var cv = minimapCanvas(track);
    var pj = track._mmProj;
    ctx.save();
    U.roundRect(ctx, x, y, size, size, 12);
    ctx.fillStyle = 'rgba(14,9,30,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();
    var k = size / pj.size;
    ctx.drawImage(cv, x, y, size, size);
    for (var i = 0; i < race.karts.length; i++) {
      var kt = race.karts[i];
      var px = x + (kt.x * pj.scale + pj.ox) * k;
      var py = y + (kt.y * pj.scale + pj.oy) * k;
      ctx.beginPath();
      ctx.arc(px, py, kt.isPlayer ? 6 : 4.5, 0, U.TAU);
      ctx.fillStyle = kt.isPlayer ? '#ffffff' : kt.char.body;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = kt.isPlayer ? '#ff3b3b' : 'rgba(0,0,0,0.6)';
      ctx.stroke();
    }
    ctx.restore();
  }

  function panel(ctx, x, y, w, h, r) {
    U.roundRect(ctx, x, y, w, h, r || 12);
    ctx.fillStyle = 'rgba(16,10,34,0.62)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawItemSlot(ctx, race) {
    var p = race.player;
    var w = 92, x = 480 - w / 2, y = 16;
    ctx.save();
    U.roundRect(ctx, x, y, w, w, 16);
    var grd = ctx.createLinearGradient(x, y, x, y + w);
    grd.addColorStop(0, 'rgba(255,255,255,0.3)');
    grd.addColorStop(1, 'rgba(90,140,255,0.28)');
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();

    var icon = null;
    if (p.rouletteTime > 0) {
      var list = MK.Items.ROULETTE;
      icon = MK.Sprites.getIcon(list[Math.floor(race.time * 18) % list.length], 64);
    } else if (p.item) {
      icon = MK.Sprites.getIcon(p.item, 64);
    }
    if (icon) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(icon, x + 12, y + 12, w - 24, w - 24);
      if (p.itemCount > 1) {
        U.text(ctx, 'x' + p.itemCount, x + w - 10, y + w - 8, 20, '#fff', '#1a1230', 'right');
      }
    }
    ctx.restore();
  }

  function drawSpeedo(ctx, race) {
    var p = race.player;
    var ratio = U.clamp(p.speed / (p.statMax() * 1.42), 0, 1);
    var x = 686, y = 470, w = 190, h = 16;
    panel(ctx, x - 12, y - 42, w + 24, 74, 14);
    ctx.save();
    U.roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    var grd = ctx.createLinearGradient(x, y, x + w, y);
    grd.addColorStop(0, '#54e08a');
    grd.addColorStop(0.6, '#ffd93d');
    grd.addColorStop(1, '#ff5f4d');
    U.roundRect(ctx, x, y, Math.max(6, w * ratio), h, 8);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();
    var kmh = Math.round(p.speed * 0.42);
    U.text(ctx, kmh + ' km/h', x + w, y - 10, 24, p.boostTime > 0 ? '#ffd93d' : '#fff', '#1a1230', 'right');
    U.text(ctx, p.char.name, x, y - 10, 18, '#cbc3ef', '#1a1230', 'left');
  }

  function drawPlace(ctx, race) {
    var p = race.player;
    var txt = String(p.place);
    var sfx = U.ordinal(p.place).replace(/^\d+/, '');
    var x = 252, y = 508;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    var col = p.place === 1 ? '#ffd93d' : (p.place <= 3 ? '#fff' : '#ffb0b0');
    U.text(ctx, txt, x, y, 84, col, '#241537', 'center');
    ctx.restore();
    U.text(ctx, sfx, x + 32, y - 44, 28, col, '#241537', 'left');
  }

  function drawLapBox(ctx, race) {
    var p = race.player;
    panel(ctx, 16, 16, 230, 104, 14);
    var lap = U.clamp(p.lapRaw < 1 ? 1 : p.lapRaw, 1, race.laps);
    U.text(ctx, 'LAP', 32, 48, 22, '#cbc3ef', '#1a1230');
    U.text(ctx, lap + '/' + race.laps, 100, 52, 34, p.lapRaw >= race.laps ? '#ffd93d' : '#fff', '#1a1230');
    U.text(ctx, U.fmtTime(race.time), 32, 80, 24, '#fff', '#1a1230');
    U.text(ctx, 'BEST ' + U.fmtTime(p.bestLap), 32, 102, 15, '#9f98c9', '#1a1230');

    var coin = MK.Sprites.getIcon('coin', 32);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(coin, 186, 64, 26, 26);
    U.text(ctx, 'x' + p.coins, 214, 86, 20, '#ffd93d', '#1a1230');
  }

  function drawStandings(ctx, race) {
    var x = 796, y = 86;
    panel(ctx, x - 16, y - 24, 152, 8 * 26 + 18, 12);
    for (var i = 0; i < race.order.length; i++) {
      var k = race.order[i];
      var yy = y + i * 26;
      U.text(ctx, (i + 1) + '.', x - 4, yy, 16, '#9f98c9', '#1a1230');
      ctx.fillStyle = k.char.body;
      U.roundRect(ctx, x + 18, yy - 12, 14, 14, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      U.text(ctx, k.char.name, x + 40, yy, 15, k.isPlayer ? '#ffd93d' : '#e6e1fb', '#1a1230');
    }
  }

  function drawBanners(ctx, race) {
    for (var i = 0; i < race.banners.length; i++) {
      var b = race.banners[i];
      var t = 1 - b.life / b.max;
      var pop = t < 0.2 ? U.lerp(0.4, 1.1, t / 0.2) : (t < 0.3 ? U.lerp(1.1, 1, (t - 0.2) / 0.1) : 1);
      var alpha = b.life < 0.4 ? b.life / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(480, 190 - i * 56);
      ctx.scale(pop, pop);
      U.text(ctx, b.text, 0, 0, 56, '#ffd93d', '#3a1d52', 'center');
      ctx.restore();
    }
  }

  function drawCountdown(ctx, race) {
    if (race.state !== 'countdown') return;
    var n = Math.ceil(race.countdown);
    if (n > 3) return;
    var frac = race.countdown - Math.floor(race.countdown);
    var scale = 1 + (1 - frac) * 0.5;
    ctx.save();
    ctx.translate(480, 230);
    ctx.scale(scale, scale);
    ctx.globalAlpha = U.clamp(frac * 2, 0, 1);
    U.text(ctx, String(n), 0, 0, 140, n === 1 ? '#54e08a' : '#ffd93d', '#3a1d52', 'center');
    ctx.restore();

    // traffic lights
    for (var i = 0; i < 3; i++) {
      var on = (3 - i) >= n;
      ctx.beginPath();
      ctx.arc(420 + i * 60, 110, 18, 0, U.TAU);
      ctx.fillStyle = on ? (i === 2 ? '#54e08a' : '#ff4d4d') : 'rgba(40,30,60,0.7)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }
  }

  function drawWrongWay(ctx, race) {
    if (!race.player.wrongWay || race.state !== 'racing') return;
    if (Math.floor(race.time * 4) % 2 === 0) return;
    U.text(ctx, 'WRONG WAY!', 480, 300, 44, '#ff4d4d', '#2a0f1f', 'center');
  }

  function drawRespawn(ctx, race) {
    if (race.player.respawnTimer <= 0) return;
    U.text(ctx, 'RESCUED', 480, 330, 34, '#bfe8ff', '#1a1230', 'center');
  }

  MK.Hud = {
    draw: function (ctx, race) {
      drawLapBox(ctx, race);
      drawItemSlot(ctx, race);
      drawPlace(ctx, race);
      drawSpeedo(ctx, race);
      drawStandings(ctx, race);
      drawMinimap(ctx, race, 24, 310, 164);
      drawBanners(ctx, race);
      drawCountdown(ctx, race);
      drawWrongWay(ctx, race);
      drawRespawn(ctx, race);
    },
    drawMinimap: drawMinimap,
    panel: panel
  };
})(window.MK);
