(function (MK) {
  'use strict';

  var down = Object.create(null);
  var fresh = Object.create(null);

  var HANDLED = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
    Space: 1, Enter: 1, ShiftLeft: 1, ShiftRight: 1, KeyZ: 1, KeyX: 1,
    KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyP: 1, KeyM: 1, Escape: 1, Backspace: 1
  };

  var Input = {
    init: function () {
      window.addEventListener('keydown', function (e) {
        // let browser/OS shortcuts (Cmd+M, Ctrl+R, ...) pass through untouched
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (HANDLED[e.code]) e.preventDefault();
        if (!down[e.code]) fresh[e.code] = true;
        down[e.code] = true;
      });
      window.addEventListener('keyup', function (e) {
        down[e.code] = false;
      });
      window.addEventListener('blur', function () {
        down = Object.create(null);
      });
    },

    isDown: function () {
      for (var i = 0; i < arguments.length; i++) if (down[arguments[i]]) return true;
      return false;
    },

    pressed: function () {
      for (var i = 0; i < arguments.length; i++) {
        if (fresh[arguments[i]]) { fresh[arguments[i]] = false; return true; }
      }
      return false;
    },

    endFrame: function () { fresh = Object.create(null); },

    pad: function () {
      if (!navigator.getGamepads) return null;
      var pads = navigator.getGamepads();
      for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) return pads[i];
      return null;
    },

    // Returns the per-frame driving controls.
    driving: function () {
      var c = {
        throttle: this.isDown('ArrowUp', 'KeyW') ? 1 : 0,
        brake: this.isDown('ArrowDown', 'KeyS') ? 1 : 0,
        steer: 0,
        drift: this.isDown('KeyZ', 'ShiftLeft', 'ShiftRight'),
        item: this.pressed('Space')
      };
      if (this.isDown('ArrowLeft', 'KeyA')) c.steer -= 1;
      if (this.isDown('ArrowRight', 'KeyD')) c.steer += 1;

      var p = this.pad();
      if (p) {
        var ax = p.axes[0] || 0;
        if (Math.abs(ax) > 0.18) c.steer = MK.U.clamp(c.steer + ax, -1, 1);
        if (p.buttons[0] && p.buttons[0].pressed) c.throttle = 1;
        if (p.buttons[1] && p.buttons[1].pressed) c.brake = 1;
        if ((p.buttons[5] && p.buttons[5].pressed) || (p.buttons[7] && p.buttons[7].pressed)) c.drift = true;
        if (p.buttons[2] && p.buttons[2].pressed) {
          if (!this._padItem) { c.item = true; this._padItem = true; }
        } else this._padItem = false;
      }
      return c;
    }
  };

  MK.Input = Input;
})(window.MK);
