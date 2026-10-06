(function (MK) {
  'use strict';

  var U = MK.U;
  var M = MK.Mode7;

  var KART_W = 46;
  var KART_H = 34;

  function Race(opts) {
    this.def = opts.def;
    this.track = opts.track;
    this.laps = opts.def.laps;
    this.ccScale = opts.ccScale;
    this.difficulty = opts.difficulty;
    this.trackIndex = opts.trackIndex;

    this.time = 0;
    this.countdown = 3.6;
    this.state = 'countdown';
    this.lastBeep = 99;
    this.flash = 0;
    this.shake = 0;
    this.endTimer = -1;
    this.banners = [];
    this.results = null;

    this.karts = [];
    this.particles = [];
    this.projectiles = [];
    this.hazards = [];

    var all = [0, 1, 2, 3, 4, 5, 6, 7];
    var others = all.filter(function (i) { return i !== opts.charIndex; });
    for (var s = others.length - 1; s > 0; s--) {
      var r = (Math.random() * (s + 1)) | 0;
      var tmp = others[s]; others[s] = others[r]; others[r] = tmp;
    }

    var playerSlot = opts.playerSlot != null ? opts.playerSlot : 4;
    var o = 0;
    for (var slot = 0; slot < 8; slot++) {
      var isPlayer = slot === playerSlot;
      var ci = isPlayer ? opts.charIndex : others[o++];
      var k = new MK.Kart(this, ci, slot, isPlayer);
      if (!isPlayer) MK.AI.attach(k, this.difficulty);
      this.karts.push(k);
      if (isPlayer) this.player = k;
    }

    var g = this.track.grid[playerSlot];
    this.cam = {
      x: g.x - Math.cos(g.angle) * 200,
      y: g.y - Math.sin(g.angle) * 200,
      yaw: g.angle,
      h: 60
    };
    this.camDist = 200;
    this.updatePlaces();
  }

  Race.prototype.banner = function (text, dur) {
    this.banners.push({ text: text, life: dur, max: dur });
  };

  Race.prototype.burst = function (x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * U.TAU;
      var sp = 40 + Math.random() * 120;
      this.particles.push({
        x: x, y: y, z: 10 + Math.random() * 20,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 40 + Math.random() * 60,
        life: 0.5, max: 0.5, size: 14, color: color
      });
    }
  };

  Race.prototype.rubberBand = function (kart) {
    var base = [0.9, 0.97, 1.035][this.difficulty] || 1;
    var diff = kart.progress - this.player.progress;
    var f = 1;
    if (diff < -80) f += Math.min(0.11, (-diff - 80) * 0.00045);
    else if (diff > 80) f -= Math.min(0.09, (diff - 80) * 0.00035);
    return base * f;
  };

  Race.prototype.updatePlaces = function () {
    var sorted = this.karts.slice().sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    for (var i = 0; i < sorted.length; i++) sorted[i].place = i + 1;
    this.order = sorted;
  };

  Race.prototype.onPlayerFinish = function () {
    this.endTimer = 2.6;
    this.banner('FINISH!', 2.4);
  };

  Race.prototype.finalize = function () {
    this.updatePlaces();
    var rows = this.order.map(function (k, i) {
      return {
        char: k.char,
        charIndex: k.charIndex,
        isPlayer: k.isPlayer,
        place: i + 1,
        time: k.finishTime,
        best: k.bestLap
      };
    });
    this.results = rows;
    this.state = 'done';
    MK.Audio.stopMusic();
  };

  Race.prototype.update = function (dt) {
    var i, j;

    if (this.state === 'countdown') {
      this.countdown -= dt;
      var whole = Math.ceil(this.countdown);
      if (whole < this.lastBeep && whole >= 1 && whole <= 3) {
        this.lastBeep = whole;
        MK.Audio.sfx('count');
      }
      if (this.countdown <= 0) {
        this.state = 'racing';
        this.banner('GO!', 1.1);
        MK.Audio.sfx('go');
        MK.Audio.startEngine();
        MK.Audio.playMusic(this.trackIndex);
        for (i = 0; i < this.karts.length; i++) this.karts[i].lapStart = 0;
      }
    } else if (this.state === 'racing') {
      this.time += dt;
    }

    // controls
    for (i = 0; i < this.karts.length; i++) {
      var k = this.karts[i];
      if (k.isPlayer) {
        if (k.finished || this.state === 'done') {
          // victory lap on autopilot
          if (!k.ai) MK.AI.attach(k, this.difficulty);
          MK.AI.update(k, this, dt);
        } else {
          k.controls = MK.Input.driving();
        }
      } else {
        MK.AI.update(k, this, dt);
      }
      k.update(dt);
    }

    this.collide();
    MK.Items.update(this, dt);
    this.updateParticles(dt);
    this.updatePlaces();
    this.updateCamera(dt);

    for (i = this.banners.length - 1; i >= 0; i--) {
      this.banners[i].life -= dt;
      if (this.banners[i].life <= 0) this.banners.splice(i, 1);
    }
    if (this.flash > 0) this.flash -= dt * 1.6;
    if (this.shake > 0) this.shake -= dt * 2;

    // engine audio tracks the player
    var p = this.player;
    MK.Audio.setEngine(U.clamp(p.speed / p.statMax(), 0, 1.4), p.boostTime > 0);
    MK.Audio.update();

    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        for (j = 0; j < this.karts.length; j++) {
          var kk = this.karts[j];
          if (!kk.finished) {
            kk.finished = true;
            kk.finishTime = this.time + (this.player.progress - kk.progress) * 0.01 + 0.4 * (j + 1);
          }
        }
        this.finalize();
      }
    }
  };

  Race.prototype.collide = function () {
    for (var i = 0; i < this.karts.length; i++) {
      for (var j = i + 1; j < this.karts.length; j++) {
        var a = this.karts[i], b = this.karts[j];
        if (a.respawnTimer > 0 || b.respawnTimer > 0) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.hypot(dx, dy);
        if (d > 50 || d === 0) continue;
        var nx = dx / d, ny = dy / d;
        var push = (50 - d) * 0.55;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;

        if (a.starTime > 0 && b.starTime <= 0) { MK.Items.hitKart(this, b, 1.3, a); continue; }
        if (b.starTime > 0 && a.starTime <= 0) { MK.Items.hitKart(this, a, 1.3, b); continue; }

        var heavy = a.char.weight - b.char.weight;
        a.speed *= 0.985 - U.clamp(-heavy, 0, 4) * 0.004;
        b.speed *= 0.985 - U.clamp(heavy, 0, 4) * 0.004;
        if ((a.isPlayer || b.isPlayer) && Math.random() < 0.25) MK.Audio.sfx('drift');
      }
    }
  };

  Race.prototype.updateParticles = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.z += (p.vz || 0) * dt;
      if (p.vx) { p.vx *= 0.92; p.vy *= 0.92; }
      p.vz = (p.vz || 0) * 0.94;
    }
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
  };

  Race.prototype.updateCamera = function (dt) {
    var p = this.player;
    var ratio = U.clamp(p.speed / p.statMax(), 0, 1.4);
    var wantDist = 196 + ratio * 26;
    this.camDist = U.lerp(this.camDist, wantDist, 1 - Math.exp(-4 * dt));

    var yawTarget = p.respawnTimer > 0 ? p.lastSafe.angle : p.moveAngle;
    this.cam.yaw = U.lerpAngle(this.cam.yaw, yawTarget, 1 - Math.exp(-6.5 * dt));

    var wantX = p.x - Math.cos(this.cam.yaw) * this.camDist;
    var wantY = p.y - Math.sin(this.cam.yaw) * this.camDist;
    var t = 1 - Math.exp(-14 * dt);
    this.cam.x = U.lerp(this.cam.x, wantX, t);
    this.cam.y = U.lerp(this.cam.y, wantY, t);
    this.cam.h = U.lerp(this.cam.h, 60 + (p.boostTime > 0 ? -4 : 0), 1 - Math.exp(-5 * dt));
  };

  // ---------------------------------------------------------------- drawing
  function pushSprite(list, img, pr, w, h, elev, opts) {
    if (!pr) return;
    var sw = w * pr.scale;
    var sh = h * pr.scale;
    if (pr.sx + sw / 2 < -40 || pr.sx - sw / 2 > M.W + 40) return;
    list.push({
      img: img, x: pr.sx, y: pr.sy - (elev || 0) * pr.scale,
      w: sw, h: sh, depth: pr.depth, scale: pr.scale,
      flip: opts && opts.flip,
      shadow: !opts || opts.shadow !== false,
      ground: pr.sy,
      halo: opts && opts.halo,
      alpha: opts && opts.alpha != null ? opts.alpha : 1
    });
  }

  Race.prototype.render = function (ctx) {
    var track = this.track;
    var cam = this.cam;
    var g = M.ctx;

    M.drawSky(track, cam);
    M.renderGround(track, cam);
    M.begin(cam);

    var list = [];
    var i, pr;

    for (i = 0; i < track.props.length; i++) {
      var pp = track.props[i];
      pr = M.project(pp.x, pp.y);
      if (!pr || pr.depth > 3400) continue;
      pushSprite(list, MK.Sprites.getProp(pp.type), pr, pp.w, pp.h, 0,
        { alpha: 1 - M.fogAmount(pr.depth) });
    }

    for (i = 0; i < track.boxes.length; i++) {
      var b = track.boxes[i];
      if (!b.active) continue;
      pr = M.project(b.x, b.y);
      if (!pr || pr.depth > 2600) continue;
      var spin = Math.abs(Math.cos(b.spin)) * 0.85 + 0.15;
      var bob = 20 + Math.sin(b.spin * 1.4) * 6;
      pushSprite(list, MK.Sprites.getIcon('box', 64), pr, 44 * spin, 44, bob,
        { alpha: 1 - M.fogAmount(pr.depth) });
    }

    for (i = 0; i < this.hazards.length; i++) {
      var hz = this.hazards[i];
      pr = M.project(hz.x, hz.y);
      if (!pr) continue;
      pushSprite(list, MK.Sprites.getIcon('banana', 48), pr, 40, 40, 8, {});
    }

    for (i = 0; i < this.projectiles.length; i++) {
      var pj = this.projectiles[i];
      pr = M.project(pj.x, pj.y);
      if (!pr) continue;
      var sq = Math.abs(Math.cos(pj.spin)) * 0.8 + 0.2;
      pushSprite(list, MK.Sprites.getIcon(pj.type, 48), pr, 42 * sq, 42, 14, {});
    }

    for (i = 0; i < this.karts.length; i++) {
      var k = this.karts[i];
      pr = M.project(k.x, k.y);
      if (!pr || pr.depth > 3200) continue;
      var toCam = Math.atan2(k.y - cam.y, k.x - cam.x);
      var rel = U.norm(k.heading + k.visualYaw * 0.55 - toCam);
      var f = MK.Sprites.frameFor(rel);
      var sc = k.scale();
      pushSprite(list, k.sprites[f.name], pr, KART_W * sc, KART_H * sc, k.hopHeight, {
        flip: f.flip,
        halo: k.starTime > 0 ? 'hsl(' + ((this.time * 700) % 360).toFixed(0) + ',95%,62%)' : null,
        alpha: (1 - M.fogAmount(pr.depth)) * (k.respawnTimer > 0 ? 0.65 : 1)
      });
    }

    list.sort(function (a, b) { return b.depth - a.depth; });

    g.imageSmoothingEnabled = false;
    for (i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.shadow) {
        g.globalAlpha = 0.28 * s.alpha;
        g.fillStyle = '#000';
        g.beginPath();
        g.ellipse(s.x, s.ground, s.w * 0.44, Math.max(1.2, s.w * 0.16), 0, 0, U.TAU);
        g.fill();
      }
      g.globalAlpha = s.alpha;
      if (s.halo) {
        g.fillStyle = s.halo;
        g.globalAlpha = 0.45 * s.alpha;
        g.beginPath();
        g.ellipse(s.x, s.y - s.h * 0.5, s.w * 0.78, s.h * 0.72, 0, 0, U.TAU);
        g.fill();
        g.globalAlpha = s.alpha;
      }
      if (s.flip) {
        g.save();
        g.translate(s.x, 0);
        g.scale(-1, 1);
        g.drawImage(s.img, -s.w / 2, s.y - s.h, s.w, s.h);
        g.restore();
      } else {
        g.drawImage(s.img, s.x - s.w / 2, s.y - s.h, s.w, s.h);
      }
    }
    g.globalAlpha = 1;

    // particles above the world, behind the HUD
    for (i = 0; i < this.particles.length; i++) {
      var pt = this.particles[i];
      pr = M.project(pt.x, pt.y);
      if (!pr) continue;
      var a = U.clamp(pt.life / pt.max, 0, 1);
      var r = pt.size * pr.scale * (1.4 - a * 0.6);
      if (r < 0.4) continue;
      g.globalAlpha = a * 0.75;
      g.fillStyle = pt.color;
      g.beginPath();
      g.arc(pr.sx, pr.sy - pt.z * pr.scale, r, 0, U.TAU);
      g.fill();
    }
    g.globalAlpha = 1;

    // boost streaks
    var p = this.player;
    if (p.boostTime > 0 || p.starTime > 0) {
      g.strokeStyle = p.starTime > 0 ? 'rgba(255,230,120,0.5)' : 'rgba(255,255,255,0.4)';
      g.lineWidth = 2;
      for (i = 0; i < 16; i++) {
        var ang = (i / 16) * U.TAU + this.time * 2;
        var rad = 60 + ((this.time * 900 + i * 57) % 190);
        var cx = M.W / 2, cy = M.H * 0.56;
        g.beginPath();
        g.moveTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.6);
        g.lineTo(cx + Math.cos(ang) * (rad + 26), cy + Math.sin(ang) * (rad + 26) * 0.6);
        g.stroke();
      }
    }

    if (this.flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + (this.flash * 0.7).toFixed(2) + ')';
      g.fillRect(0, 0, M.W, M.H);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(M.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);

    MK.Hud.draw(ctx, this);
  };

  MK.Race = Race;
})(window.MK);
