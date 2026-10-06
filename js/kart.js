(function (MK) {
  'use strict';

  var U = MK.U;
  var SURF = MK.SURF;

  var DRIFT_LEVELS = [
    { charge: 0.55, boost: 0.55, color: '#8fdcff' },
    { charge: 1.15, boost: 0.85, color: '#ffb84d' },
    { charge: 1.95, boost: 1.2, color: '#ff6ad5' }
  ];

  function Kart(race, charIndex, slot, isPlayer) {
    var g = race.track.grid[slot];
    this.race = race;
    this.charIndex = charIndex;
    this.char = MK.Sprites.CHARACTERS[charIndex];
    this.sprites = MK.Sprites.getKart(charIndex);
    this.isPlayer = !!isPlayer;
    this.slot = slot;

    this.x = g.x;
    this.y = g.y;
    this.heading = g.angle;
    this.moveAngle = g.angle;
    this.speed = 0;

    this.idxHint = g.index;
    this.idx = g.index;
    this.prevS = g.index / race.track.count;
    this.lapRaw = 0;
    this.progress = 0;
    this.place = slot + 1;
    this.wrongWay = false;

    this.boostTime = 0;
    this.boostKind = null;
    this.starTime = 0;
    this.shrinkTime = 0;
    this.spinTimer = 0;
    this.spinDir = 1;
    this.respawnTimer = 0;
    this.coins = 0;

    this.hopTime = 0;
    this.hopHeight = 0;
    this.drifting = false;
    this.driftDir = 0;
    this.driftCharge = 0;
    this.driftLevel = -1;

    this.item = null;
    this.itemCount = 0;
    this.pendingItem = null;
    this.rouletteTime = 0;
    this.itemCooldown = 0;

    this.lapTimes = [];
    this.lapStart = 0;
    this.bestLap = null;
    this.finished = false;
    this.finishTime = null;
    this.totalTime = 0;

    this.lastSafe = { x: g.x, y: g.y, angle: g.angle, idx: g.index };
    this.smokeTimer = 0;
    this.visualYaw = 0;

    this.controls = { throttle: 0, brake: 0, steer: 0, drift: false, item: false };
    this.ai = null;
  }

  Kart.prototype.statMax = function () {
    return (352 + this.char.speed * 20) * this.race.ccScale;
  };

  Kart.prototype.statAccel = function () {
    return 150 + this.char.accel * 20;
  };

  Kart.prototype.statTurn = function () {
    return 1.18 + this.char.handling * 0.1;
  };

  Kart.prototype.addBoost = function (dur, kind) {
    this.boostTime = Math.max(this.boostTime, dur);
    this.boostKind = kind || 'mushroom';
    this.speed = Math.max(this.speed, this.statMax() * 1.12);
  };

  Kart.prototype.spinOut = function (dur) {
    if (this.starTime > 0) return;
    this.spinTimer = Math.max(this.spinTimer, dur);
    this.spinDir = Math.random() < 0.5 ? -1 : 1;
    this.speed *= 0.18;
    this.drifting = false;
    this.driftCharge = 0;
    this.boostTime = 0;
  };

  Kart.prototype.surface = function () {
    return this.race.track.surfaceAt(this.x, this.y);
  };

  Kart.prototype.update = function (dt) {
    var race = this.race;
    var track = race.track;
    var c = this.controls;

    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      this.speed = 0;
      this.hopHeight = Math.max(0, Math.sin(U.clamp(this.respawnTimer / 1.4, 0, 1) * Math.PI) * 120);
      if (this.respawnTimer <= 0) {
        // walk back along the centreline until we find solid ground
        var idx = this.lastSafe.idx;
        var spot = track.sample(idx);
        for (var tries = 0; tries < 50 && track.surfaceAt(spot.x, spot.y) === SURF.VOID; tries++) {
          idx -= 6;
          spot = track.sample(idx);
        }
        this.x = spot.x;
        this.y = spot.y;
        this.heading = spot.angle;
        this.moveAngle = spot.angle;
        this.idxHint = ((idx % track.count) + track.count) % track.count;
        this.hopHeight = 0;
      }
      this.updateTimers(dt);
      return;
    }

    var surf = this.surface();
    if (surf === SURF.VOID) {
      this.respawnTimer = 1.4;
      MK.Audio.sfx('fall');
      race.burst(this.x, this.y, 14, '#ffffff');
      this.updateTimers(dt);
      return;
    }

    // ---- spin out ------------------------------------------------------
    if (this.spinTimer > 0) {
      this.spinTimer -= dt;
      this.heading += this.spinDir * 11 * dt;
      this.moveAngle = U.lerpAngle(this.moveAngle, this.heading, 1 - Math.exp(-4 * dt));
      this.speed = Math.max(0, this.speed - 160 * dt);
      this.drifting = false;
      this.integrate(dt);
      this.updateProgress(dt);
      this.updateTimers(dt);
      return;
    }

    var surfSpeed = MK.SURF_SPEED[surf];
    var boosting = this.boostTime > 0;
    var maxSpeed = this.statMax();
    if (surf === SURF.BOOST) {
      this.addBoost(0.75, 'pad');
      boosting = true;
    }
    if (this.shrinkTime > 0) maxSpeed *= 0.68;
    maxSpeed *= boosting ? 1.42 : surfSpeed;
    maxSpeed *= 1 + this.coins * 0.006;
    if (this.starTime > 0) maxSpeed *= 1.16;

    // ---- throttle ------------------------------------------------------
    var accel = this.statAccel() * (boosting ? 2.6 : 1);
    if (race.state === 'countdown') {
      c = { throttle: 0, brake: 0, steer: 0, drift: false, item: false };
    }
    if (this.finished) c.item = false;

    if (c.throttle) {
      var t = U.clamp(1 - this.speed / Math.max(60, maxSpeed), 0, 1);
      this.speed += accel * (0.25 + 0.75 * t) * dt;
    } else if (c.brake) {
      // brake to a stop, then creep backwards
      this.speed = this.speed > 0 ? Math.max(0, this.speed - 420 * dt)
        : Math.max(-120, this.speed - 180 * dt);
    } else {
      // engine braking never drags the kart into reverse
      this.speed = this.speed > 0 ? Math.max(0, this.speed - 110 * dt)
        : Math.min(0, this.speed + 110 * dt);
    }
    if (this.speed > maxSpeed) this.speed = Math.max(maxSpeed, this.speed - 420 * dt);
    this.speed = U.clamp(this.speed, -120, 900);

    // ---- hop & drift ---------------------------------------------------
    var speedRatio = U.clamp(this.speed / this.statMax(), 0, 1.6);

    if (c.drift && !this.wasDrift && this.hopTime <= 0 && !this.drifting && this.speed > 110) {
      this.hopTime = 0.24;
      if (this.isPlayer) MK.Audio.sfx('hop');
    }
    this.wasDrift = c.drift;

    if (this.hopTime > 0) {
      this.hopTime -= dt;
      this.hopHeight = Math.sin(U.clamp(1 - this.hopTime / 0.24, 0, 1) * Math.PI) * 16;
      if (this.hopTime <= 0) {
        this.hopHeight = 0;
        if (c.drift && Math.abs(c.steer) > 0.25) {
          this.drifting = true;
          this.driftDir = c.steer > 0 ? 1 : -1;
          this.driftCharge = 0;
          this.driftLevel = -1;
        }
      }
    }

    if (this.drifting) {
      if (!c.drift || this.speed < 90) {
        this.releaseDrift();
      } else {
        this.driftCharge += dt * (0.8 + speedRatio * 0.5);
        var lvl = -1;
        for (var i = 0; i < DRIFT_LEVELS.length; i++) {
          if (this.driftCharge >= DRIFT_LEVELS[i].charge) lvl = i;
        }
        if (lvl !== this.driftLevel) {
          this.driftLevel = lvl;
          if (this.isPlayer && lvl >= 0) MK.Audio.sfx('drift');
        }
      }
    }

    // ---- steering ------------------------------------------------------
    var turn = this.statTurn() * (surf === SURF.GRASS ? 0.78 : 1);
    var steerAmount;
    if (this.drifting) {
      var inward = c.steer * this.driftDir;
      steerAmount = this.driftDir * (1.05 + U.clamp(inward, -1, 1) * 0.5);
      turn *= 1.42;
    } else {
      steerAmount = c.steer;
      if (this.hopTime > 0) steerAmount *= 0.45;
    }
    var grab = U.clamp(this.speed / 150, 0, 1);
    this.heading += steerAmount * turn * grab * dt * (this.speed < 0 ? -1 : 1);

    // slide: the direction of travel lags the body direction
    var gripRate = this.drifting ? 4.2 : (12 * MK.SURF_GRIP[surf]);
    this.moveAngle = U.lerpAngle(this.moveAngle, this.heading, 1 - Math.exp(-gripRate * dt));

    this.integrate(dt);
    this.updateProgress(dt);
    this.updateTimers(dt);
    this.emitParticles(dt, surf);

    // items
    if (c.item && this.itemCooldown <= 0) MK.Items.use(race, this);
  };

  Kart.prototype.releaseDrift = function () {
    if (!this.drifting) return;
    this.drifting = false;
    if (this.driftLevel >= 0) {
      this.addBoost(DRIFT_LEVELS[this.driftLevel].boost, 'drift');
      if (this.isPlayer) MK.Audio.sfx('boost');
      this.race.burst(this.x, this.y, 8, DRIFT_LEVELS[this.driftLevel].color);
    }
    this.driftCharge = 0;
    this.driftLevel = -1;
  };

  Kart.prototype.integrate = function (dt) {
    this.x += Math.cos(this.moveAngle) * this.speed * dt;
    this.y += Math.sin(this.moveAngle) * this.speed * dt;
    var lim = this.race.track.size;
    this.x = U.clamp(this.x, -200, lim + 200);
    this.y = U.clamp(this.y, -200, lim + 200);
  };

  Kart.prototype.updateTimers = function (dt) {
    if (this.boostTime > 0) this.boostTime -= dt;
    if (this.starTime > 0) this.starTime -= dt;
    if (this.shrinkTime > 0) this.shrinkTime -= dt;
    if (this.itemCooldown > 0) this.itemCooldown -= dt;
    if (this.rouletteTime > 0) {
      this.rouletteTime -= dt;
      if (this.isPlayer && Math.random() < 0.35) MK.Audio.sfx('roulette');
      if (this.rouletteTime <= 0) {
        this.item = this.pendingItem;
        this.itemCount = MK.Items.countFor(this.item);
        this.pendingItem = null;
      }
    }
    var targetYaw = this.drifting ? this.driftDir * 0.42 : 0;
    this.visualYaw = U.lerp(this.visualYaw, targetYaw, 1 - Math.exp(-8 * dt));
  };

  Kart.prototype.updateProgress = function (dt) {
    var track = this.race.track;
    var idx = track.nearest(this.x, this.y, this.idxHint);
    this.idxHint = idx;
    this.idx = idx;
    var s = idx / track.count;

    if (this.prevS > 0.72 && s < 0.28) {
      this.lapRaw++;
      this.onLapCrossed();
    } else if (this.prevS < 0.28 && s > 0.72) {
      this.lapRaw--;
    }
    this.prevS = s;
    this.progress = this.lapRaw * track.count + idx;

    var samp = track.sample(idx);
    this.wrongWay = (Math.cos(this.moveAngle) * samp.tx + Math.sin(this.moveAngle) * samp.ty) < -0.25 && this.speed > 60;

    // Lakitu drops you back on the centre of the road, never on the lip.
    var surf = this.surface();
    if (surf === SURF.ROAD || surf === SURF.BOOST) {
      this.lastSafe.x = samp.x;
      this.lastSafe.y = samp.y;
      this.lastSafe.angle = samp.angle;
      this.lastSafe.idx = idx;
    }
  };

  Kart.prototype.onLapCrossed = function () {
    var race = this.race;
    if (race.state === 'countdown' || this.finished) return;
    if (this.lapRaw > 1) {
      var t = race.time - this.lapStart;
      this.lapTimes.push(t);
      if (this.bestLap == null || t < this.bestLap) this.bestLap = t;
    }
    this.lapStart = race.time;

    if (this.lapRaw > race.laps) {
      this.finished = true;
      this.finishTime = race.time;
      if (this.isPlayer) {
        MK.Audio.sfx('finish');
        race.onPlayerFinish();
      }
    } else if (this.isPlayer) {
      MK.Audio.sfx('lap');
      race.banner(this.lapRaw === race.laps ? 'FINAL LAP!' : 'LAP ' + this.lapRaw, 1.6);
    }
  };

  Kart.prototype.emitParticles = function (dt, surf) {
    var race = this.race;
    this.smokeTimer -= dt;
    if (this.smokeTimer > 0) return;
    this.smokeTimer = 0.03;

    var back = {
      x: this.x - Math.cos(this.heading) * 22,
      y: this.y - Math.sin(this.heading) * 22
    };

    if (this.drifting && this.speed > 120) {
      var col = this.driftLevel >= 0 ? DRIFT_LEVELS[this.driftLevel].color : '#dfe6ef';
      race.particles.push({
        x: back.x + (Math.random() - 0.5) * 26,
        y: back.y + (Math.random() - 0.5) * 26,
        z: 6, vz: 24 + Math.random() * 30,
        life: 0.45, max: 0.45, size: 16, color: col
      });
    } else if ((surf === SURF.GRASS || surf === SURF.DIRT) && this.speed > 80) {
      race.particles.push({
        x: back.x + (Math.random() - 0.5) * 24,
        y: back.y + (Math.random() - 0.5) * 24,
        z: 4, vz: 30 + Math.random() * 30,
        life: 0.5, max: 0.5, size: 14,
        color: surf === SURF.GRASS ? '#7ac24a' : '#d8b878'
      });
    }

    if (this.boostTime > 0) {
      race.particles.push({
        x: back.x, y: back.y, z: 8, vz: 10,
        life: 0.28, max: 0.28, size: 20,
        color: this.boostKind === 'drift' ? '#9fe6ff' : '#ffc04d'
      });
    }
    if (this.starTime > 0) {
      race.particles.push({
        x: this.x + (Math.random() - 0.5) * 50,
        y: this.y + (Math.random() - 0.5) * 50,
        z: 10 + Math.random() * 30, vz: 20,
        life: 0.4, max: 0.4, size: 12,
        color: 'hsl(' + ((race.time * 600) % 360).toFixed(0) + ',95%,65%)'
      });
    }
  };

  Kart.prototype.scale = function () {
    return this.shrinkTime > 0 ? 0.62 : 1;
  };

  MK.Kart = Kart;
  MK.DRIFT_LEVELS = DRIFT_LEVELS;
})(window.MK);
