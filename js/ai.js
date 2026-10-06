(function (MK) {
  'use strict';

  var U = MK.U;

  function attach(kart, difficulty) {
    kart.ai = {
      offset: (Math.random() - 0.5) * kart.race.track.def.roadWidth * 0.5,
      offsetTimer: 1 + Math.random() * 2,
      skill: 0.92 + Math.random() * 0.08 + difficulty * 0.05,
      nerve: 0.4 + Math.random() * 0.6,
      itemTimer: 1 + Math.random() * 3,
      driftHold: 0,
      panic: 0
    };
  }

  function curvatureAhead(track, idx, samples) {
    var worst = 0;
    for (var i = 6; i < samples; i += 6) {
      var c = track.sample(idx + i).curv;
      if (c > worst) worst = c;
    }
    return worst;
  }

  function update(kart, race, dt) {
    var ai = kart.ai;
    var track = race.track;
    var c = kart.controls;
    var hw = track.def.roadWidth / 2;

    c.item = false;
    c.brake = 0;
    c.throttle = 1;

    // --- pick a line ----------------------------------------------------
    ai.offsetTimer -= dt;
    if (ai.offsetTimer <= 0) {
      ai.offsetTimer = 1.6 + Math.random() * 2.4;
      ai.offset = (Math.random() - 0.5) * hw * 1.1;
    }

    // hunt for item boxes when empty handed
    if (!kart.item && kart.rouletteTime <= 0) {
      var boxes = track.boxes;
      for (var b = 0; b < boxes.length; b++) {
        var box = boxes[b];
        if (!box.active) continue;
        var dx = box.x - kart.x, dy = box.y - kart.y;
        var fwd = dx * Math.cos(kart.heading) + dy * Math.sin(kart.heading);
        if (fwd > 60 && fwd < 460) {
          var bi = track.nearest(box.x, box.y, kart.idxHint);
          ai.offset = U.lerp(ai.offset, track.lateralOf(box.x, box.y, bi), 0.35);
          break;
        }
      }
    }

    // dodge hazards sitting on our line
    for (var h = 0; h < race.hazards.length; h++) {
      var hz = race.hazards[h];
      var hdx = hz.x - kart.x, hdy = hz.y - kart.y;
      var ahead = hdx * Math.cos(kart.heading) + hdy * Math.sin(kart.heading);
      var side = hdx * -Math.sin(kart.heading) + hdy * Math.cos(kart.heading);
      if (ahead > 0 && ahead < 300 && Math.abs(side) < 60) {
        ai.offset += (side > 0 ? -1 : 1) * 70 * dt * 6;
        ai.offset = U.clamp(ai.offset, -hw * 0.9, hw * 0.9);
      }
    }

    // --- steering -------------------------------------------------------
    var look = 170 + kart.speed * 0.52;
    var target = track.sample(track.ahead(kart.idx, look));
    var tx = target.x + target.nx * ai.offset;
    var ty = target.y + target.ny * ai.offset;
    var want = Math.atan2(ty - kart.y, tx - kart.x);
    var diff = U.angleDiff(want, kart.heading);
    c.steer = U.clamp(diff * 2.4, -1, 1);

    // --- speed management ----------------------------------------------
    var curv = curvatureAhead(track, kart.idx, 70);
    var limit = kart.statMax() * ai.skill * (1 - U.clamp(curv * 46, 0, 0.42));
    limit *= race.rubberBand(kart);
    if (kart.speed > limit) {
      c.throttle = 0;
      if (kart.speed > limit * 1.22) c.brake = 1;
    }

    // --- drifting -------------------------------------------------------
    if (ai.driftHold > 0) {
      ai.driftHold -= dt;
      c.drift = true;
      if (Math.abs(diff) < 0.12) ai.driftHold = 0;
    } else {
      c.drift = false;
      var sharp = Math.abs(diff) > 0.3 && curv > 0.0045;
      if (sharp && kart.speed > kart.statMax() * 0.55 && Math.random() < ai.nerve * dt * 9) {
        ai.driftHold = 0.5 + Math.random() * 0.9;
        c.drift = true;
      }
    }

    // --- items ----------------------------------------------------------
    ai.itemTimer -= dt;
    if (kart.item && ai.itemTimer <= 0) {
      var t = kart.item;
      var fire = false;
      if (t === 'mushroom' || t === 'triple_mushroom') {
        fire = Math.abs(diff) < 0.22 && curv < 0.006;
      } else if (t === 'banana') {
        fire = Math.random() < 0.5;
      } else if (t === 'star' || t === 'lightning') {
        fire = true;
      } else {
        // shells: only if someone is reasonably close ahead
        for (var k = 0; k < race.karts.length; k++) {
          var o = race.karts[k];
          if (o === kart) continue;
          var d = U.dist(o.x, o.y, kart.x, kart.y);
          var fo = (o.x - kart.x) * Math.cos(kart.heading) + (o.y - kart.y) * Math.sin(kart.heading);
          if (d < 900 && fo > 0) { fire = true; break; }
        }
      }
      if (fire) {
        c.item = true;
        ai.itemTimer = 0.8 + Math.random() * 2.2;
      } else {
        ai.itemTimer = 0.4;
      }
    }

    // nudge back toward the road if the AI wanders off
    if (kart.surface() === MK.SURF.GRASS || kart.surface() === MK.SURF.DIRT) {
      var lat = track.lateralOf(kart.x, kart.y, kart.idx);
      if (Math.abs(lat) > hw) ai.offset = U.lerp(ai.offset, 0, 0.5);
    }
  }

  MK.AI = { attach: attach, update: update };
})(window.MK);
