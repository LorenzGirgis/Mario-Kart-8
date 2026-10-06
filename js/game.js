(function (MK) {
  'use strict';

  var U = MK.U;
  var W = 960, H = 540;
  var POINTS = [15, 12, 10, 9, 8, 7, 6, 5];
  var CC_LABELS = ['50cc', '100cc', '150cc'];
  var CC_SCALE = [0.84, 1.0, 1.14];

  var G = {
    state: 'title',
    time: 0,
    canvas: null,
    ctx: null,
    menuIndex: 0,
    cc: 1,
    mode: 0,            // 0 = single race, 1 = grand prix
    charIndex: 0,
    trackIndex: 0,
    race: null,
    track: null,
    gp: null,
    pauseIndex: 0,
    loadFrames: 0,
    transition: 0
  };

  // ------------------------------------------------------------ decorations
  function menuBackdrop(ctx, t) {
    var grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#1b0f3a');
    grd.addColorStop(0.5, '#3a1550');
    grd.addColorStop(1, '#0e0a26');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#ffffff';
    var off = (t * 90) % 180;
    for (var i = -2; i < 14; i++) {
      ctx.save();
      ctx.translate(i * 180 - off, 0);
      ctx.rotate(0.32);
      ctx.fillRect(0, -300, 54, 1200);
      ctx.restore();
    }
    ctx.restore();

    var icons = ['mushroom', 'banana', 'green_shell', 'star', 'coin', 'red_shell', 'lightning'];
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (var k = 0; k < icons.length; k++) {
      var img = MK.Sprites.getIcon(icons[k], 64);
      var x = ((t * (26 + k * 9) + k * 190) % (W + 160)) - 80;
      var y = 60 + Math.sin(t * 0.8 + k) * 40 + (k % 3) * 150;
      var s = 34 + (k % 3) * 8;
      ctx.drawImage(img, x, y, s, s);
    }
    ctx.restore();
  }

  function statBar(ctx, label, value, x, y, w) {
    U.text(ctx, label, x, y, 15, '#cbc3ef', '#1a1230');
    for (var i = 0; i < 5; i++) {
      var on = i < value;
      U.roundRect(ctx, x + 86 + i * (w / 5), y - 11, w / 5 - 5, 11, 3);
      ctx.fillStyle = on ? '#ffd93d' : 'rgba(255,255,255,0.16)';
      ctx.fill();
    }
  }

  function previewTrack(ctx, def, x, y, size) {
    var pts = def.points, n = pts.length;
    var samples = [];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < 300; i++) {
      var t = i / 300 * n;
      var seg = Math.floor(t), f = t - seg;
      var p0 = pts[(seg - 1 + n) % n], p1 = pts[seg % n],
        p2 = pts[(seg + 1) % n], p3 = pts[(seg + 2) % n];
      var px = U.catmull(p0[0], p1[0], p2[0], p3[0], f);
      var py = U.catmull(p0[1], p1[1], p2[1], p3[1], f);
      samples.push([px, py]);
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    var span = Math.max(maxX - minX, maxY - minY) || 1;
    var sc = (size - 24) / span;
    var ox = x + 12 + ((span - (maxX - minX)) * sc) / 2 - minX * sc;
    var oy = y + 12 + ((span - (maxY - minY)) * sc) / 2 - minY * sc;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var j = 0; j < samples.length; j++) {
      var sx = samples[j][0] * sc + ox, sy = samples[j][1] * sc + oy;
      if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = def.theme.base === 'space' ? '#b58bff' : def.theme.apronColor;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#efeaff';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 10]);
    ctx.stroke();
    ctx.restore();
  }

  // ----------------------------------------------------------------- screens
  function drawTitle(ctx) {
    menuBackdrop(ctx, G.time);
    var bob = Math.sin(G.time * 2) * 6;

    U.text(ctx, 'MARIO KART', 420, 140 + bob, 86, '#ffd93d', '#8a1f14', 'center');
    U.text(ctx, '8', 730, 152 + bob, 112, '#54a7ff', '#10306b', 'center');
    U.text(ctx, 'MODE 7 EDITION', W / 2, 196 + bob, 26, '#ffffff', '#3a1d52', 'center');

    // parade of karts across the bottom
    for (var i = 0; i < 8; i++) {
      var set = MK.Sprites.getKart(i);
      var x = ((G.time * 120 + i * 150) % (W + 200)) - 100;
      var y = 430 + Math.sin(G.time * 3 + i) * 5;
      var img = set.side;
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.drawImage(img, x, y, 96, 72);
      ctx.restore();
    }

    if (Math.floor(G.time * 2) % 2 === 0) {
      U.text(ctx, 'PRESS ENTER TO START', W / 2, 330, 34, '#ffffff', '#3a1d52', 'center');
    }
    U.text(ctx, 'A pseudo-3D kart racer built with pure canvas', W / 2, 520, 16, '#a79ed6', '#1a1230', 'center');
  }

  function drawModeSelect(ctx) {
    menuBackdrop(ctx, G.time);
    U.text(ctx, 'CHOOSE YOUR RACE', W / 2, 90, 40, '#ffd93d', '#3a1d52', 'center');

    var opts = [
      { title: 'SINGLE RACE', desc: 'One track, three laps, eight racers' },
      { title: 'GRAND PRIX', desc: 'All four tracks, points decide the champion' }
    ];
    for (var i = 0; i < opts.length; i++) {
      var y = 150 + i * 110;
      var sel = G.menuIndex === i;
      U.roundRect(ctx, 180, y, 600, 88, 16);
      ctx.fillStyle = sel ? 'rgba(255,217,61,0.22)' : 'rgba(16,10,34,0.6)';
      ctx.fill();
      ctx.lineWidth = sel ? 4 : 2;
      ctx.strokeStyle = sel ? '#ffd93d' : 'rgba(255,255,255,0.2)';
      ctx.stroke();
      U.text(ctx, opts[i].title, 210, y + 42, 32, sel ? '#ffd93d' : '#fff', '#3a1d52');
      U.text(ctx, opts[i].desc, 210, y + 70, 16, '#b9b1e4', '#1a1230');
      if (sel) U.text(ctx, '>', 160, y + 54, 40, '#ffd93d', '#3a1d52');
    }

    var sel2 = G.menuIndex === 2;
    U.roundRect(ctx, 180, 380, 600, 76, 16);
    ctx.fillStyle = sel2 ? 'rgba(84,167,255,0.22)' : 'rgba(16,10,34,0.6)';
    ctx.fill();
    ctx.lineWidth = sel2 ? 4 : 2;
    ctx.strokeStyle = sel2 ? '#54a7ff' : 'rgba(255,255,255,0.2)';
    ctx.stroke();
    U.text(ctx, 'ENGINE CLASS', 210, 424, 26, sel2 ? '#54a7ff' : '#fff', '#3a1d52');
    for (var c = 0; c < 3; c++) {
      var on = G.cc === c;
      U.roundRect(ctx, 470 + c * 100, 398, 90, 40, 10);
      ctx.fillStyle = on ? '#54a7ff' : 'rgba(255,255,255,0.12)';
      ctx.fill();
      U.text(ctx, CC_LABELS[c], 515 + c * 100, 426, 22, on ? '#0b1f3f' : '#cbc3ef', 'rgba(0,0,0,0)', 'center');
    }
    if (sel2) U.text(ctx, '< >', 160, 430, 24, '#54a7ff', '#3a1d52');

    U.text(ctx, 'ENTER confirm    BACKSPACE back', W / 2, 510, 16, '#a79ed6', '#1a1230', 'center');
  }

  function drawCharSelect(ctx) {
    menuBackdrop(ctx, G.time);
    U.text(ctx, 'SELECT YOUR DRIVER', W / 2, 70, 38, '#ffd93d', '#3a1d52', 'center');

    var chars = MK.Sprites.CHARACTERS;
    for (var i = 0; i < chars.length; i++) {
      var col = i % 4, row = Math.floor(i / 4);
      var cw = 170, ch = 130;
      var x = 110 + col * (cw + 18), y = 98 + row * (ch + 14);
      var sel = i === G.charIndex;
      ctx.save();
      if (sel) {
        ctx.translate(x + cw / 2, y + ch / 2);
        var pop = 1.06 + Math.sin(G.time * 6) * 0.02;
        ctx.scale(pop, pop);
        ctx.translate(-(x + cw / 2), -(y + ch / 2));
      }
      U.roundRect(ctx, x, y, cw, ch, 14);
      ctx.fillStyle = sel ? U.mixHex('#201440', chars[i].body.replace('#', '#'), 0.4) : 'rgba(16,10,34,0.6)';
      ctx.fill();
      ctx.lineWidth = sel ? 4 : 2;
      ctx.strokeStyle = sel ? '#ffd93d' : 'rgba(255,255,255,0.18)';
      ctx.stroke();

      var set = MK.Sprites.getKart(i);
      ctx.imageSmoothingEnabled = false;
      var img = sel ? set.front : set.front34;
      ctx.drawImage(img, x + cw / 2 - 48, y + 12, 96, 72);
      U.text(ctx, chars[i].name, x + cw / 2, y + ch - 14, 22, sel ? '#ffd93d' : '#e6e1fb', '#1a1230', 'center');
      ctx.restore();
    }

    var ch2 = chars[G.charIndex];
    MK.Hud.panel(ctx, 230, 400, 500, 112, 14);
    U.text(ctx, ch2.name, 254, 436, 30, ch2.body, '#1a1230');
    U.text(ctx, ch2.blurb, 254, 460, 16, '#b9b1e4', '#1a1230');
    statBar(ctx, 'SPEED', ch2.speed, 254, 486, 150);
    statBar(ctx, 'ACCEL', ch2.accel, 254, 506, 150);
    statBar(ctx, 'HANDLING', ch2.handling, 500, 486, 150);
    statBar(ctx, 'WEIGHT', ch2.weight, 500, 506, 150);

    U.text(ctx, 'ARROWS move    ENTER confirm    BACKSPACE back', W / 2, 388, 15, '#a79ed6', '#1a1230', 'center');
  }

  function drawTrackSelect(ctx) {
    menuBackdrop(ctx, G.time);
    U.text(ctx, 'SELECT A TRACK', W / 2, 70, 38, '#ffd93d', '#3a1d52', 'center');

    for (var i = 0; i < MK.TRACKS.length; i++) {
      var def = MK.TRACKS[i];
      var cw = 200, chh = 250;
      var x = 40 + i * (cw + 24), y = 120;
      var sel = i === G.trackIndex;
      ctx.save();
      if (sel) {
        ctx.translate(x + cw / 2, y + chh / 2);
        ctx.scale(1.05, 1.05);
        ctx.translate(-(x + cw / 2), -(y + chh / 2));
      }
      U.roundRect(ctx, x, y, cw, chh, 16);
      var grd = ctx.createLinearGradient(x, y, x, y + chh);
      grd.addColorStop(0, def.theme.skyTop);
      grd.addColorStop(1, def.theme.skyBottom);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.lineWidth = sel ? 5 : 2;
      ctx.strokeStyle = sel ? '#ffd93d' : 'rgba(255,255,255,0.25)';
      ctx.stroke();

      previewTrack(ctx, def, x + 14, y + 36, cw - 28);
      U.text(ctx, def.name, x + cw / 2, y + 28, 17, '#fff', '#1a1230', 'center');
      U.text(ctx, def.laps + ' LAPS', x + cw / 2, y + chh - 16, 18, '#ffd93d', '#1a1230', 'center');
      ctx.restore();
    }

    MK.Hud.panel(ctx, 160, 400, 640, 70, 14);
    U.text(ctx, MK.TRACKS[G.trackIndex].name, 184, 436, 26, '#ffd93d', '#1a1230');
    U.text(ctx, MK.TRACKS[G.trackIndex].cup, 184, 460, 16, '#b9b1e4', '#1a1230');
    U.text(ctx, 'LEFT/RIGHT choose    ENTER race    BACKSPACE back', W / 2, 510, 16, '#a79ed6', '#1a1230', 'center');
  }

  function drawLoading(ctx) {
    var def = MK.TRACKS[G.trackIndex];
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, def.theme.skyTop);
    grd.addColorStop(1, def.theme.skyBottom);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,6,22,0.55)';
    ctx.fillRect(0, 0, W, H);
    U.text(ctx, def.name, W / 2, 230, 48, '#ffd93d', '#3a1d52', 'center');
    U.text(ctx, def.cup, W / 2, 268, 20, '#fff', '#1a1230', 'center');
    U.text(ctx, 'BUILDING TRACK' + '.'.repeat(1 + Math.floor(G.time * 4) % 3), W / 2, 330, 22, '#cbc3ef', '#1a1230', 'center');

    var set = MK.Sprites.getKart(G.charIndex);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(set.side, W / 2 - 60 + Math.sin(G.time * 3) * 24, 360, 120, 90);
  }

  function drawPause(ctx) {
    ctx.fillStyle = 'rgba(8,4,20,0.72)';
    ctx.fillRect(0, 0, W, H);
    U.text(ctx, 'PAUSED', W / 2, 170, 56, '#ffd93d', '#3a1d52', 'center');
    var opts = ['RESUME', 'RESTART RACE', 'QUIT TO TITLE'];
    for (var i = 0; i < opts.length; i++) {
      var sel = i === G.pauseIndex;
      var y = 230 + i * 70;
      U.roundRect(ctx, 320, y, 320, 54, 12);
      ctx.fillStyle = sel ? 'rgba(255,217,61,0.25)' : 'rgba(16,10,34,0.7)';
      ctx.fill();
      ctx.lineWidth = sel ? 4 : 2;
      ctx.strokeStyle = sel ? '#ffd93d' : 'rgba(255,255,255,0.2)';
      ctx.stroke();
      U.text(ctx, opts[i], W / 2, y + 36, 26, sel ? '#ffd93d' : '#fff', '#3a1d52', 'center');
    }
  }

  function drawResults(ctx) {
    menuBackdrop(ctx, G.time);
    var rows = G.race.results;
    var mine = rows.find(function (r) { return r.isPlayer; });
    U.text(ctx, G.race.def.name, W / 2, 62, 30, '#fff', '#3a1d52', 'center');
    U.text(ctx, 'YOU FINISHED ' + U.ordinal(mine.place).toUpperCase(), W / 2, 104, 40,
      mine.place === 1 ? '#ffd93d' : '#fff', '#3a1d52', 'center');

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var y = 140 + i * 44;
      U.roundRect(ctx, 200, y, 560, 38, 10);
      ctx.fillStyle = r.isPlayer ? 'rgba(255,217,61,0.2)' : 'rgba(16,10,34,0.6)';
      ctx.fill();
      ctx.strokeStyle = r.isPlayer ? '#ffd93d' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = r.isPlayer ? 3 : 1.5;
      ctx.stroke();
      U.text(ctx, U.ordinal(r.place), 216, y + 27, 20, '#cbc3ef', '#1a1230');
      ctx.fillStyle = r.char.body;
      U.roundRect(ctx, 286, y + 10, 18, 18, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      U.text(ctx, r.char.name, 316, y + 27, 20, r.isPlayer ? '#ffd93d' : '#e6e1fb', '#1a1230');
      U.text(ctx, U.fmtTime(r.time), 600, y + 27, 20, '#fff', '#1a1230', 'right');
      U.text(ctx, 'BEST ' + U.fmtTime(r.best), 744, y + 27, 14, '#9f98c9', '#1a1230', 'right');
      if (G.mode === 1) U.text(ctx, '+' + POINTS[i], 756, y + 27, 18, '#54e08a', '#1a1230', 'right');
    }
    U.text(ctx, 'ENTER continue', W / 2, 520, 18, '#a79ed6', '#1a1230', 'center');
  }

  function drawStandings(ctx) {
    menuBackdrop(ctx, G.time);
    var gp = G.gp;
    var done = gp.index >= MK.TRACKS.length;
    U.text(ctx, done ? 'GRAND PRIX RESULTS' : 'GRAND PRIX STANDINGS', W / 2, 70, 36, '#ffd93d', '#3a1d52', 'center');
    U.text(ctx, 'RACE ' + Math.min(gp.index, MK.TRACKS.length) + ' OF ' + MK.TRACKS.length, W / 2, 102, 18, '#b9b1e4', '#1a1230', 'center');

    var rows = gp.points.slice().sort(function (a, b) { return b.points - a.points; });
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var y = 126 + i * 44;
      U.roundRect(ctx, 230, y, 500, 38, 10);
      ctx.fillStyle = r.isPlayer ? 'rgba(255,217,61,0.2)' : 'rgba(16,10,34,0.6)';
      ctx.fill();
      ctx.strokeStyle = r.isPlayer ? '#ffd93d' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = r.isPlayer ? 3 : 1.5;
      ctx.stroke();
      U.text(ctx, String(i + 1), 250, y + 27, 20, '#cbc3ef', '#1a1230');
      ctx.fillStyle = r.char.body;
      U.roundRect(ctx, 286, y + 10, 18, 18, 4);
      ctx.fill();
      U.text(ctx, r.char.name, 316, y + 27, 20, r.isPlayer ? '#ffd93d' : '#e6e1fb', '#1a1230');
      U.text(ctx, r.points + ' PTS', 700, y + 27, 20, i === 0 ? '#ffd93d' : '#fff', '#1a1230', 'right');
    }

    if (done) {
      var champ = rows[0];
      U.text(ctx, champ.char.name + ' WINS THE CUP!', W / 2, 500, 26,
        champ.isPlayer ? '#ffd93d' : '#fff', '#3a1d52', 'center');
      U.text(ctx, 'ENTER to return to the title', W / 2, 526, 15, '#a79ed6', '#1a1230', 'center');
    } else {
      U.text(ctx, 'ENTER for the next race: ' + MK.TRACKS[gp.index].name, W / 2, 510, 20, '#fff', '#3a1d52', 'center');
    }
  }

  // ------------------------------------------------------------------- flow
  function startLoading() {
    G.state = 'loading';
    G.loadFrames = 0;
  }

  function beginRace() {
    var def = MK.TRACKS[G.trackIndex];
    G.track = null;
    G.track = MK.buildTrack(def);
    G.race = new MK.Race({
      def: def,
      track: G.track,
      ccScale: CC_SCALE[G.cc],
      difficulty: G.cc,
      charIndex: G.charIndex,
      trackIndex: G.trackIndex,
      playerSlot: G.gp ? U.clamp(G.gp.playerSlot, 0, 7) : 4
    });
    G.state = 'race';
  }

  function startGrandPrix() {
    G.gp = {
      index: 0,
      playerSlot: 4,
      points: MK.Sprites.CHARACTERS.map(function (c, i) {
        return { char: c, charIndex: i, points: 0, isPlayer: i === G.charIndex };
      })
    };
    G.trackIndex = 0;
    startLoading();
  }

  function applyGpPoints() {
    var rows = G.race.results;
    for (var i = 0; i < rows.length; i++) {
      var entry = G.gp.points.filter(function (p) { return p.charIndex === rows[i].charIndex; })[0];
      if (entry) entry.points += POINTS[i];
    }
    G.gp.index++;
    // next race: the player starts from their championship position
    var sorted = G.gp.points.slice().sort(function (a, b) { return b.points - a.points; });
    for (var j = 0; j < sorted.length; j++) {
      if (sorted[j].isPlayer) G.gp.playerSlot = j;
    }
  }

  function quitToTitle() {
    MK.Audio.stopMusic();
    MK.Audio.stopEngine();
    G.race = null;
    G.track = null;
    G.gp = null;
    G.state = 'title';
    G.menuIndex = 0;
  }

  // ----------------------------------------------------------------- updates
  function updateMenus(dt) {
    var I = MK.Input;

    if (I.pressed('KeyM')) {
      var muted = MK.Audio.toggleMute();
      G.mutedNote = muted ? 1.5 : 1.5;
    }

    switch (G.state) {
      case 'title':
        if (I.pressed('Enter', 'Space')) {
          MK.Audio.resume();
          MK.Audio.sfx('confirm');
          G.state = 'mode';
          G.menuIndex = 0;
        }
        break;

      case 'mode':
        if (I.pressed('ArrowDown', 'KeyS')) { G.menuIndex = (G.menuIndex + 1) % 3; MK.Audio.sfx('menu'); }
        if (I.pressed('ArrowUp', 'KeyW')) { G.menuIndex = (G.menuIndex + 2) % 3; MK.Audio.sfx('menu'); }
        if (G.menuIndex === 2) {
          if (I.pressed('ArrowRight', 'KeyD')) { G.cc = (G.cc + 1) % 3; MK.Audio.sfx('menu'); }
          if (I.pressed('ArrowLeft', 'KeyA')) { G.cc = (G.cc + 2) % 3; MK.Audio.sfx('menu'); }
        }
        if (I.pressed('Enter', 'Space')) {
          if (G.menuIndex === 2) { G.cc = (G.cc + 1) % 3; MK.Audio.sfx('menu'); }
          else {
            G.mode = G.menuIndex;
            G.state = 'char';
            MK.Audio.sfx('confirm');
          }
        }
        if (I.pressed('Backspace', 'Escape')) { G.state = 'title'; MK.Audio.sfx('back'); }
        break;

      case 'char': {
        var ci = G.charIndex;
        if (I.pressed('ArrowRight', 'KeyD')) { ci = (ci + 1) % 8; MK.Audio.sfx('menu'); }
        if (I.pressed('ArrowLeft', 'KeyA')) { ci = (ci + 7) % 8; MK.Audio.sfx('menu'); }
        if (I.pressed('ArrowDown', 'KeyS')) { ci = (ci + 4) % 8; MK.Audio.sfx('menu'); }
        if (I.pressed('ArrowUp', 'KeyW')) { ci = (ci + 4) % 8; MK.Audio.sfx('menu'); }
        G.charIndex = ci;
        if (I.pressed('Enter', 'Space')) {
          MK.Audio.sfx('confirm');
          if (G.mode === 1) startGrandPrix();
          else { G.state = 'track'; }
        }
        if (I.pressed('Backspace', 'Escape')) { G.state = 'mode'; MK.Audio.sfx('back'); }
        break;
      }

      case 'track':
        if (I.pressed('ArrowRight', 'KeyD')) { G.trackIndex = (G.trackIndex + 1) % MK.TRACKS.length; MK.Audio.sfx('menu'); }
        if (I.pressed('ArrowLeft', 'KeyA')) { G.trackIndex = (G.trackIndex + MK.TRACKS.length - 1) % MK.TRACKS.length; MK.Audio.sfx('menu'); }
        if (I.pressed('Enter', 'Space')) { MK.Audio.sfx('confirm'); startLoading(); }
        if (I.pressed('Backspace', 'Escape')) { G.state = 'char'; MK.Audio.sfx('back'); }
        break;

      case 'loading':
        G.loadFrames++;
        if (G.loadFrames === 3) beginRace();
        break;

      case 'race':
        if (I.pressed('KeyP', 'Escape')) {
          G.state = 'pause';
          G.pauseIndex = 0;
          MK.Audio.stopEngine();
          MK.Audio.stopMusic();
          MK.Audio.sfx('back');
          break;
        }
        G.race.update(dt);
        if (G.race.state === 'done') {
          G.state = 'results';
          MK.Audio.stopEngine();
        }
        break;

      case 'pause':
        if (I.pressed('ArrowDown', 'KeyS')) { G.pauseIndex = (G.pauseIndex + 1) % 3; MK.Audio.sfx('menu'); }
        if (I.pressed('ArrowUp', 'KeyW')) { G.pauseIndex = (G.pauseIndex + 2) % 3; MK.Audio.sfx('menu'); }
        if (I.pressed('KeyP')) { G.state = 'race'; MK.Audio.startEngine(); MK.Audio.playMusic(G.trackIndex); }
        if (I.pressed('Enter', 'Space')) {
          MK.Audio.sfx('confirm');
          if (G.pauseIndex === 0) {
            G.state = 'race';
            MK.Audio.startEngine();
            if (G.race.state === 'racing') MK.Audio.playMusic(G.trackIndex);
          } else if (G.pauseIndex === 1) {
            beginRace();
          } else {
            quitToTitle();
          }
        }
        break;

      case 'results':
        if (I.pressed('Enter', 'Space')) {
          MK.Audio.sfx('confirm');
          if (G.mode === 1) {
            applyGpPoints();
            G.state = 'standings';
          } else {
            quitToTitle();
          }
        }
        break;

      case 'standings':
        if (I.pressed('Enter', 'Space')) {
          MK.Audio.sfx('confirm');
          if (G.gp.index >= MK.TRACKS.length) quitToTitle();
          else { G.trackIndex = G.gp.index; startLoading(); }
        }
        break;
    }
  }

  function render() {
    var ctx = G.ctx;
    switch (G.state) {
      case 'title': drawTitle(ctx); break;
      case 'mode': drawModeSelect(ctx); break;
      case 'char': drawCharSelect(ctx); break;
      case 'track': drawTrackSelect(ctx); break;
      case 'loading': drawLoading(ctx); break;
      case 'race': G.race.render(ctx); break;
      case 'pause': G.race.render(ctx); drawPause(ctx); break;
      case 'results': drawResults(ctx); break;
      case 'standings': drawStandings(ctx); break;
    }
    if (MK.Audio.muted) {
      U.text(ctx, 'MUTED', W - 20, 24, 16, '#ff9f9f', '#1a1230', 'right');
    }
  }

  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    G.time += dt;
    updateMenus(dt);
    render();
    MK.Input.endFrame();
    requestAnimationFrame(frame);
  }

  function boot() {
    G.canvas = document.getElementById('game');
    G.ctx = G.canvas.getContext('2d');
    G.ctx.textBaseline = 'alphabetic';
    MK.Input.init();
    MK.Mode7.init();
    var bootEl = document.getElementById('boot');
    if (bootEl) bootEl.classList.add('hidden');
    requestAnimationFrame(frame);
  }

  MK.Game = G;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.MK);
