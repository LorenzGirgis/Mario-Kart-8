(function (MK) {
  'use strict';

  var U = MK.U;

  var NAMES = {
    banana: 'BANANA',
    green_shell: 'GREEN SHELL',
    red_shell: 'RED SHELL',
    mushroom: 'MUSHROOM',
    triple_mushroom: 'TRIPLE MUSHROOM',
    star: 'STAR',
    lightning: 'LIGHTNING'
  };

  // Classic rubber-band distribution: leaders get defensive items, the back
  // of the field gets the fun stuff.
  var TABLE = [
    [['banana', 40], ['green_shell', 35], ['mushroom', 20], ['triple_mushroom', 5]],
    [['banana', 30], ['green_shell', 30], ['mushroom', 25], ['triple_mushroom', 10], ['red_shell', 5]],
    [['banana', 20], ['green_shell', 20], ['mushroom', 25], ['triple_mushroom', 15], ['red_shell', 15], ['star', 5]],
    [['banana', 12], ['green_shell', 15], ['mushroom', 25], ['triple_mushroom', 18], ['red_shell', 20], ['star', 8], ['lightning', 2]],
    [['banana', 6], ['green_shell', 8], ['mushroom', 22], ['triple_mushroom', 22], ['red_shell', 22], ['star', 14], ['lightning', 6]],
    [['green_shell', 6], ['mushroom', 15], ['triple_mushroom', 25], ['red_shell', 22], ['star', 20], ['lightning', 12]],
    [['mushroom', 12], ['triple_mushroom', 24], ['red_shell', 20], ['star', 26], ['lightning', 18]],
    [['triple_mushroom', 26], ['red_shell', 20], ['star', 30], ['lightning', 24]]
  ];

  var ROULETTE = ['banana', 'green_shell', 'mushroom', 'red_shell', 'triple_mushroom', 'star', 'lightning'];

  function roll(place) {
    var row = TABLE[U.clamp(place - 1, 0, TABLE.length - 1) | 0];
    var total = 0, i;
    for (i = 0; i < row.length; i++) total += row[i][1];
    var pick = Math.random() * total;
    for (i = 0; i < row.length; i++) {
      pick -= row[i][1];
      if (pick <= 0) return row[i][0];
    }
    return row[0][0];
  }

  function countFor(type) { return type === 'triple_mushroom' ? 3 : 1; }

  function use(race, kart) {
    if (!kart.item || kart.rouletteTime > 0) return;
    var type = kart.item;

    switch (type) {
      case 'mushroom':
      case 'triple_mushroom':
        kart.addBoost(0.95, 'mushroom');
        if (kart.isPlayer) MK.Audio.sfx('boost');
        break;

      case 'banana':
        race.hazards.push({
          type: 'banana',
          x: kart.x - Math.cos(kart.heading) * 78,
          y: kart.y - Math.sin(kart.heading) * 78,
          life: 22,
          owner: kart,
          arm: 0.35
        });
        if (kart.isPlayer) MK.Audio.sfx('throw');
        break;

      case 'green_shell':
        race.projectiles.push({
          type: 'green_shell',
          x: kart.x + Math.cos(kart.heading) * 56,
          y: kart.y + Math.sin(kart.heading) * 56,
          angle: kart.heading,
          speed: 900,
          life: 5,
          owner: kart,
          arm: 0.3,
          spin: 0
        });
        if (kart.isPlayer) MK.Audio.sfx('throw');
        break;

      case 'red_shell': {
        var target = null, bestPlace = 99;
        for (var i = 0; i < race.karts.length; i++) {
          var k = race.karts[i];
          if (k === kart || k.place >= kart.place) continue;
          if (k.place < bestPlace) { bestPlace = k.place; target = k; }
        }
        // chase whoever is directly ahead
        for (var j = 0; j < race.karts.length; j++) {
          if (race.karts[j].place === kart.place - 1) target = race.karts[j];
        }
        race.projectiles.push({
          type: 'red_shell',
          x: kart.x + Math.cos(kart.heading) * 56,
          y: kart.y + Math.sin(kart.heading) * 56,
          angle: kart.heading,
          speed: 820,
          life: 8,
          owner: kart,
          target: target,
          arm: 0.3,
          spin: 0
        });
        if (kart.isPlayer) MK.Audio.sfx('throw');
        break;
      }

      case 'star':
        kart.starTime = 7.0;
        kart.addBoost(0.4, 'star');
        if (kart.isPlayer) MK.Audio.sfx('star');
        break;

      case 'lightning':
        for (var m = 0; m < race.karts.length; m++) {
          var o = race.karts[m];
          if (o === kart || o.finished) continue;
          if (o.starTime > 0) continue;
          o.shrinkTime = 6.0;
          o.spinOut(0.9);
          if (o.item && Math.random() < 0.6) { o.item = null; o.itemCount = 0; }
        }
        race.flash = 0.6;
        MK.Audio.sfx('lightning');
        break;
    }

    kart.itemCount--;
    if (kart.itemCount <= 0) { kart.item = null; kart.itemCount = 0; }
    kart.itemCooldown = 0.25;
  }

  function hitKart(race, kart, strength, source) {
    if (kart.starTime > 0 || kart.respawnTimer > 0 || kart.finished) return false;
    kart.spinOut(strength);
    race.burst(kart.x, kart.y, 10, '#fff3b0');
    if (kart.isPlayer || (source && source.isPlayer)) MK.Audio.sfx('hit');
    return true;
  }

  function update(race, dt) {
    var i, j, p, k, d;

    // projectiles
    for (i = race.projectiles.length - 1; i >= 0; i--) {
      p = race.projectiles[i];
      p.life -= dt;
      p.arm -= dt;
      p.spin += dt * 14;

      if (p.type === 'red_shell' && p.target && !p.target.finished) {
        var want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        p.angle = U.lerpAngle(p.angle, want, Math.min(1, dt * 5.5));
      }
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;

      if (p.life <= 0 || race.track.surfaceAt(p.x, p.y) === MK.SURF.VOID) {
        race.burst(p.x, p.y, 7, '#cfe9ff');
        race.projectiles.splice(i, 1);
        continue;
      }

      for (j = 0; j < race.karts.length; j++) {
        k = race.karts[j];
        if (k === p.owner && p.arm > 0) continue;
        d = U.dist(p.x, p.y, k.x, k.y);
        if (d < 52) {
          if (k.starTime > 0) {
            race.burst(p.x, p.y, 10, '#ffd93d');
            race.projectiles.splice(i, 1);
            break;
          }
          if (hitKart(race, k, p.type === 'red_shell' ? 1.6 : 1.35, p.owner)) {
            race.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // bananas and other ground hazards
    for (i = race.hazards.length - 1; i >= 0; i--) {
      var h = race.hazards[i];
      h.life -= dt;
      h.arm -= dt;
      if (h.life <= 0) { race.hazards.splice(i, 1); continue; }
      for (j = 0; j < race.karts.length; j++) {
        k = race.karts[j];
        if (k === h.owner && h.arm > 0) continue;
        if (U.dist(h.x, h.y, k.x, k.y) < 44) {
          if (k.starTime > 0) {
            race.burst(h.x, h.y, 8, '#ffd93d');
            race.hazards.splice(i, 1);
            break;
          }
          if (hitKart(race, k, 1.15, h.owner)) {
            race.hazards.splice(i, 1);
            break;
          }
        }
      }
    }

    // item boxes
    var boxes = race.track.boxes;
    for (i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      b.spin += dt * 2.4;
      if (!b.active) {
        b.timer -= dt;
        if (b.timer <= 0) b.active = true;
        continue;
      }
      for (j = 0; j < race.karts.length; j++) {
        k = race.karts[j];
        if (k.item || k.rouletteTime > 0 || k.finished) continue;
        if (U.dist(b.x, b.y, k.x, k.y) < 46) {
          b.active = false;
          b.timer = 3.2;
          k.rouletteTime = k.isPlayer ? 0.95 : 0.5;
          k.pendingItem = roll(k.place);
          k.coins = Math.min(10, k.coins + 1);
          if (k.isPlayer) MK.Audio.sfx('itembox');
          race.burst(b.x, b.y, 12, '#bfe8ff');
          break;
        }
      }
    }
  }

  MK.Items = {
    NAMES: NAMES,
    ROULETTE: ROULETTE,
    roll: roll,
    countFor: countFor,
    use: use,
    update: update,
    hitKart: hitKart
  };
})(window.MK);
