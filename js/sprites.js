(function (MK) {
  'use strict';

  var U = MK.U;

  // ---------------------------------------------------------------- pixel art
  // 20x15 kart frames. One frame per view direction, mirrored at draw time.
  var FRAMES = {
    back: [
      '.......kkkkkk.......',
      '......khhhhhhk......',
      '......khhhhhhk......',
      '......kmmmmmmk......',
      '......kmssssmk......',
      '.......kkkkkk.......',
      '....kkkbbbbbbkkk....',
      '...kbbbbbbbbbbbbk...',
      '..kbddbbbbbbbbddbk..',
      '.kttkdbbbbbbbbdkttk.',
      'kttttkdbbbbbbdkttttk',
      'kttttkkddddddkkttttk',
      'kttttk.kkkkkk.kttttk',
      '.kttk..........kttk.',
      '..kk............kk..'
    ],
    back34: [
      '........kkkkk.......',
      '.......khhhhhhk.....',
      '.......khhhhhhk.....',
      '.......kmmmmmk......',
      '.......kmsssmk......',
      '........kkkkk.......',
      '.....kkkbbbbbkkk....',
      '....kbbbbbbbbbbbk...',
      '...kbddbbbbbbbddbk..',
      '..kttkdbbbbbbbdkttk.',
      '.kttttkdbbbbbdkttttk',
      '.kttttkkdddddkkttttk',
      '.kttttk.kkkkk.kttttk',
      '..kttk.........kttk.',
      '...kk...........kk..'
    ],
    side: [
      '.........kkkk.......',
      '........khhhhhk.....',
      '........khhhhhk.....',
      '........kmsssek.....',
      '........kmsssk......',
      '.........kkkk.......',
      '......kkkbbbbkk.....',
      '....kkbbbbbbbbbkk...',
      '..kkbbbbbbbbbbbbbkk.',
      '.kbbbbbbbbbbbbbbbbbk',
      '.kddddddddddddddddk.',
      '..kkttkkddddkktttkk.',
      '.kttttk.kk..kttttk..',
      '.kttttk.....kttttk..',
      '..kkkk.......kkkk...'
    ],
    front34: [
      '........kkkkk.......',
      '.......khhhhhhk.....',
      '.......khhwwhhk.....',
      '.......ksssssssk....',
      '.......ksepesk......',
      '.......ksmmmsk......',
      '........kkkkk.......',
      '.....kkkbbbbbkkk....',
      '....kbwwbbbwwbbk....',
      '...kbllbbbbbbllbk...',
      '..kttkbbbbbbbbkttk..',
      '.kttttkbggggbkttttk.',
      '.kttttk.kkkkk.kttttk',
      '..kttk.........kttk.',
      '...kk...........kk..'
    ],
    front: [
      '.......kkkkkk.......',
      '......khhhhhhk......',
      '......khhwwhhk......',
      '......ksssssssk.....',
      '......kseppesk......',
      '......ksmmmmsk......',
      '.......kkkkkk.......',
      '....kkkbbbbbbkkk....',
      '...kbwwbbbbwwbbk....',
      '..kbllbbbbbbbbllbk..',
      '.kttkbbbbbbbbbbkttk.',
      'kttttkbggggggbkttttk',
      'kttttk.kkkkkk.kttttk',
      '.kttk..........kttk.',
      '..kk............kk..'
    ]
  };

  var ORDER = ['back', 'back34', 'side', 'front34', 'front'];

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function drawPixels(rows, palette, scale) {
    var w = rows[0].length, h = rows.length;
    var cv = makeCanvas(w * scale, h * scale);
    var ctx = cv.getContext('2d');
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = rows[y][x];
        if (ch === '.') continue;
        var col = palette[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return cv;
  }

  // ------------------------------------------------------------- characters
  var CHARACTERS = [
    { name: 'MARIO', body: '#e3342c', cap: '#e3342c', hair: '#4a2b16', speed: 3, accel: 3, handling: 3, weight: 3, blurb: 'All-round hero' },
    { name: 'LUIGI', body: '#2fa84f', cap: '#2fa84f', hair: '#3a2410', speed: 3, accel: 3, handling: 4, weight: 3, blurb: 'Smooth cornering' },
    { name: 'PEACH', body: '#f491c0', cap: '#ffd94f', hair: '#f6d173', speed: 3, accel: 4, handling: 4, weight: 2, blurb: 'Nimble and quick' },
    { name: 'TOAD', body: '#f4f1ea', cap: '#e8463c', hair: '#dcd2c0', speed: 2, accel: 5, handling: 5, weight: 1, blurb: 'Fastest off the line' },
    { name: 'YOSHI', body: '#79cf3c', cap: '#ffffff', hair: '#2f7c1f', speed: 3, accel: 4, handling: 5, weight: 2, blurb: 'Grippy tyres' },
    { name: 'DK', body: '#8a5a2b', cap: '#c8372d', hair: '#4a2c15', speed: 4, accel: 2, handling: 2, weight: 4, blurb: 'Heavy hitter' },
    { name: 'WARIO', body: '#f2d02c', cap: '#7b3fa0', hair: '#3c2a12', speed: 5, accel: 2, handling: 2, weight: 5, blurb: 'Top speed monster' },
    { name: 'BOWSER', body: '#f08a1e', cap: '#2f8f3a', hair: '#1f4d22', speed: 5, accel: 1, handling: 1, weight: 5, blurb: 'Unstoppable mass' }
  ];

  function paletteFor(ch) {
    return {
      k: '#140d18',
      b: ch.body,
      d: U.shade(ch.body, -0.35),
      l: U.shade(ch.body, 0.4),
      t: '#2a242c',
      r: '#9aa0b0',
      s: '#f6c89a',
      h: ch.cap,
      w: '#e8f4ff',
      m: ch.hair,
      e: '#ffffff',
      p: '#1d1726',
      g: '#f7d978'
    };
  }

  function buildKart(ch) {
    var pal = paletteFor(ch);
    var set = {};
    for (var i = 0; i < ORDER.length; i++) {
      set[ORDER[i]] = drawPixels(FRAMES[ORDER[i]], pal, 3);
    }
    return set;
  }

  // Picks the frame (and mirroring) for a kart seen from the camera.
  function frameFor(relAngle) {
    var a = Math.abs(relAngle);
    var name;
    if (a < 0.45) name = 'back';
    else if (a < 1.15) name = 'back34';
    else if (a < 2.0) name = 'side';
    else if (a < 2.72) name = 'front34';
    else name = 'front';
    return { name: name, flip: relAngle < 0 };
  }

  // ------------------------------------------------------------------ items
  function itemIcon(type, size) {
    size = size || 32;
    var cv = makeCanvas(size, size);
    var g = cv.getContext('2d');
    var s = size / 32;
    g.save();
    g.scale(s, s);
    g.lineWidth = 2.4;
    g.strokeStyle = '#1a1220';
    g.lineJoin = 'round';

    switch (type) {
      case 'mushroom':
      case 'triple_mushroom':
        g.beginPath();
        g.moveTo(7, 19); g.quadraticCurveTo(7, 6, 16, 6); g.quadraticCurveTo(25, 6, 25, 19);
        g.closePath();
        g.fillStyle = '#e8463c'; g.fill(); g.stroke();
        g.fillStyle = '#fff7e0';
        [[12, 12, 3], [20, 11, 2.6], [16, 16, 2.2]].forEach(function (d) {
          g.beginPath(); g.arc(d[0], d[1], d[2], 0, U.TAU); g.fill();
        });
        g.beginPath();
        g.moveTo(11, 19); g.lineTo(21, 19); g.lineTo(20, 27); g.quadraticCurveTo(16, 29, 12, 27);
        g.closePath();
        g.fillStyle = '#f7e8c8'; g.fill(); g.stroke();
        break;

      case 'banana':
        g.beginPath();
        g.moveTo(6, 9);
        g.quadraticCurveTo(7, 25, 25, 25);
        g.quadraticCurveTo(14, 21, 11, 8);
        g.closePath();
        g.fillStyle = '#f5d33c'; g.fill(); g.stroke();
        g.beginPath(); g.moveTo(8, 9); g.lineTo(7, 5);
        g.strokeStyle = '#4f7a24'; g.lineWidth = 3; g.stroke();
        break;

      case 'green_shell':
      case 'red_shell': {
        var top = type === 'green_shell' ? '#3fc24a' : '#e8403c';
        g.beginPath(); g.arc(16, 17, 11, Math.PI, 0); g.closePath();
        g.fillStyle = top; g.fill(); g.stroke();
        g.beginPath(); g.moveTo(5, 17); g.lineTo(27, 17);
        g.lineTo(27, 20); g.quadraticCurveTo(16, 26, 5, 20); g.closePath();
        g.fillStyle = '#f6efd8'; g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.beginPath(); g.arc(13, 12, 2.4, 0, U.TAU); g.fill();
        g.beginPath(); g.arc(20, 14, 1.8, 0, U.TAU); g.fill();
        break;
      }

      case 'star': {
        g.beginPath();
        for (var i = 0; i < 10; i++) {
          var r = i % 2 === 0 ? 13 : 5.6;
          var a = -Math.PI / 2 + i * Math.PI / 5;
          var x = 16 + Math.cos(a) * r, y = 16 + Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath();
        g.fillStyle = '#ffd93d'; g.fill(); g.stroke();
        g.fillStyle = '#1a1220';
        g.beginPath(); g.ellipse(13, 15, 1.5, 2.4, 0, 0, U.TAU); g.fill();
        g.beginPath(); g.ellipse(19, 15, 1.5, 2.4, 0, 0, U.TAU); g.fill();
        break;
      }

      case 'lightning':
        g.beginPath();
        g.moveTo(19, 3); g.lineTo(9, 17); g.lineTo(15, 17);
        g.lineTo(12, 29); g.lineTo(24, 13); g.lineTo(17, 13);
        g.closePath();
        g.fillStyle = '#ffe14d'; g.fill(); g.stroke();
        break;

      case 'coin':
        g.beginPath(); g.ellipse(16, 16, 9, 12, 0, 0, U.TAU);
        g.fillStyle = '#f3c224'; g.fill(); g.stroke();
        g.beginPath(); g.ellipse(16, 16, 5, 8, 0, 0, U.TAU);
        g.strokeStyle = '#a8761a'; g.lineWidth = 2; g.stroke();
        break;

      case 'box': {
        var grd = g.createLinearGradient(0, 2, 0, 30);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.5, 'rgba(160,230,255,0.75)');
        grd.addColorStop(1, 'rgba(90,160,255,0.85)');
        U.roundRect(g, 3, 3, 26, 26, 6);
        g.fillStyle = grd; g.fill(); g.stroke();
        g.fillStyle = '#e8463c';
        g.font = 'bold 20px "Trebuchet MS", sans-serif';
        g.textAlign = 'center';
        g.strokeStyle = '#fff';
        g.lineWidth = 3;
        g.strokeText('?', 16, 24);
        g.fillText('?', 16, 24);
        break;
      }

      default:
        U.roundRect(g, 6, 6, 20, 20, 4);
        g.fillStyle = '#888'; g.fill(); g.stroke();
    }
    g.restore();
    return cv;
  }

  // ------------------------------------------------------------- decorations
  function prop(type) {
    var cv, g;
    switch (type) {
      case 'tree':
        cv = makeCanvas(44, 64); g = cv.getContext('2d');
        g.fillStyle = '#6b4423';
        g.fillRect(18, 36, 8, 28);
        g.strokeStyle = '#2d1a0d'; g.lineWidth = 2; g.strokeRect(18, 36, 8, 28);
        [[22, 20, 16, '#2f7d33'], [13, 30, 11, '#3b9440'], [31, 30, 11, '#276a2c'], [22, 30, 13, '#368a3a']]
          .forEach(function (c) {
            g.beginPath(); g.arc(c[0], c[1], c[2], 0, U.TAU);
            g.fillStyle = c[3]; g.fill();
          });
        g.strokeStyle = '#19381b'; g.lineWidth = 2;
        g.beginPath(); g.arc(22, 24, 17, 0, U.TAU); g.stroke();
        break;

      case 'pipe':
        cv = makeCanvas(40, 56); g = cv.getContext('2d');
        g.fillStyle = '#2fa84f'; g.fillRect(8, 14, 24, 42);
        g.fillStyle = '#1e7a38'; g.fillRect(24, 14, 8, 42);
        g.fillStyle = '#58d474'; g.fillRect(11, 14, 5, 42);
        g.fillStyle = '#2fa84f'; g.fillRect(2, 2, 36, 14);
        g.fillStyle = '#58d474'; g.fillRect(5, 4, 6, 10);
        g.strokeStyle = '#123f1d'; g.lineWidth = 2;
        g.strokeRect(2, 2, 36, 14); g.strokeRect(8, 14, 24, 42);
        break;

      case 'palm':
        cv = makeCanvas(52, 74); g = cv.getContext('2d');
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(26, 74); g.quadraticCurveTo(20, 46, 26, 24); g.stroke();
        g.strokeStyle = '#3f8f3c'; g.lineWidth = 6;
        for (var i = 0; i < 6; i++) {
          var a = -Math.PI + i * (Math.PI / 5);
          g.beginPath(); g.moveTo(26, 24);
          g.quadraticCurveTo(26 + Math.cos(a) * 16, 24 + Math.sin(a) * 10 - 6,
            26 + Math.cos(a) * 24, 26 + Math.sin(a) * 14 + 6);
          g.stroke();
        }
        g.fillStyle = '#7b4a1e';
        g.beginPath(); g.arc(23, 27, 3.5, 0, U.TAU); g.fill();
        g.beginPath(); g.arc(30, 29, 3.5, 0, U.TAU); g.fill();
        break;

      case 'parasol':
        cv = makeCanvas(44, 56); g = cv.getContext('2d');
        g.strokeStyle = '#c8b38a'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(22, 56); g.lineTo(22, 22); g.stroke();
        for (var k = 0; k < 4; k++) {
          g.beginPath();
          g.moveTo(22, 20);
          g.arc(22, 20, 19, Math.PI + k * (Math.PI / 4), Math.PI + (k + 1) * (Math.PI / 4));
          g.closePath();
          g.fillStyle = k % 2 ? '#f4f1ea' : '#e8463c';
          g.fill();
          g.strokeStyle = '#2a2030'; g.lineWidth = 1.6; g.stroke();
        }
        break;

      case 'crystal':
        cv = makeCanvas(40, 70); g = cv.getContext('2d');
        var grad = g.createLinearGradient(0, 0, 40, 70);
        grad.addColorStop(0, '#9ff2ff');
        grad.addColorStop(0.5, '#6a7dff');
        grad.addColorStop(1, '#d36aff');
        g.beginPath();
        g.moveTo(20, 0); g.lineTo(36, 26); g.lineTo(27, 70); g.lineTo(13, 70); g.lineTo(4, 26);
        g.closePath();
        g.fillStyle = grad; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.stroke();
        break;

      case 'arrow_sign':
        cv = makeCanvas(40, 44); g = cv.getContext('2d');
        g.fillStyle = '#7a5a33'; g.fillRect(17, 20, 6, 24);
        g.beginPath();
        g.moveTo(2, 4); g.lineTo(28, 4); g.lineTo(38, 13); g.lineTo(28, 22); g.lineTo(2, 22);
        g.closePath();
        g.fillStyle = '#ffd93d'; g.fill();
        g.strokeStyle = '#2a2030'; g.lineWidth = 2; g.stroke();
        break;

      default:
        cv = makeCanvas(8, 8); g = cv.getContext('2d');
        g.fillStyle = '#f0f'; g.fillRect(0, 0, 8, 8);
    }
    return cv;
  }

  var propCache = {};
  function getProp(type) {
    if (!propCache[type]) propCache[type] = prop(type);
    return propCache[type];
  }

  var iconCache = {};
  function getIcon(type, size) {
    var key = type + '@' + (size || 32);
    if (!iconCache[key]) iconCache[key] = itemIcon(type, size);
    return iconCache[key];
  }

  var kartCache = [];
  function getKart(charIndex) {
    if (!kartCache[charIndex]) kartCache[charIndex] = buildKart(CHARACTERS[charIndex]);
    return kartCache[charIndex];
  }

  MK.Sprites = {
    CHARACTERS: CHARACTERS,
    getKart: getKart,
    frameFor: frameFor,
    getIcon: getIcon,
    getProp: getProp,
    makeCanvas: makeCanvas
  };
})(window.MK);
