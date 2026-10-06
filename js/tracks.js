(function (MK) {
  'use strict';

  // World space is a 2048x2048 map. Tracks are closed Catmull-Rom loops.
  MK.TRACKS = [
    {
      id: 'mushroom',
      name: 'MUSHROOM CIRCUIT',
      cup: 'Opening lap through the meadows',
      laps: 3,
      roadWidth: 185,
      seed: 1337,
      props: ['tree', 'pipe', 'arrow_sign'],
      propEvery: 26,
      itemFracs: [0.16, 0.44, 0.72],
      boostFracs: [0.33, 0.87],
      theme: {
        base: 'grass',
        apron: true,
        apronWidth: 1.55,
        outer: '#4e9c3c',
        outer2: '#3f8632',
        apronColor: '#b98a4e',
        road: '#59595f',
        road2: '#4c4c52',
        rumbleA: '#e8463c',
        rumbleB: '#f4f1ea',
        edge: '#f2efe4',
        skyTop: '#2f6fd0',
        skyBottom: '#9fd8ff',
        sun: '#fff3b0',
        hills: '#3f7d46',
        hills2: '#2e6236',
        fog: '#b6dcf2',
        offroad: 'grass'
      },
      points: [
        [380, 1500], [300, 1030], [500, 610], [900, 410], [1320, 470],
        [1520, 760], [1360, 1010], [1530, 1260], [1710, 1470], [1540, 1720],
        [1090, 1780], [690, 1710]
      ]
    },
    {
      id: 'beach',
      name: 'BEACH BOWL',
      cup: 'Sandy hairpins by the sea',
      laps: 3,
      roadWidth: 170,
      seed: 24601,
      props: ['palm', 'parasol'],
      propEvery: 24,
      itemFracs: [0.1, 0.38, 0.66, 0.9],
      boostFracs: [0.22, 0.58],
      theme: {
        base: 'water',
        apron: true,
        apronWidth: 1.9,
        outer: '#2a7fc4',
        outer2: '#1f6aa8',
        apronColor: '#e8cf92',
        road: '#6b6a70',
        road2: '#5d5c62',
        rumbleA: '#ff9f43',
        rumbleB: '#fff4dd',
        edge: '#fff8e8',
        skyTop: '#1f7fd4',
        skyBottom: '#ffe0a8',
        sun: '#fff0c0',
        hills: '#2f6f8f',
        hills2: '#23566f',
        fog: '#ffdda6',
        offroad: 'sand'
      },
      points: [
        [1024, 300], [1500, 420], [1760, 800], [1600, 1150], [1250, 1240],
        [1010, 1440], [900, 1700], [600, 1760], [350, 1450], [380, 1040],
        [600, 740], [800, 470]
      ]
    },
    {
      id: 'castle',
      name: 'BOWSER FACTORY',
      cup: 'Lava, iron and tight turns',
      laps: 3,
      roadWidth: 165,
      seed: 90210,
      props: ['pipe', 'arrow_sign'],
      propEvery: 22,
      itemFracs: [0.2, 0.52, 0.84],
      boostFracs: [0.07, 0.45, 0.72],
      theme: {
        base: 'lava',
        apron: true,
        apronWidth: 1.5,
        outer: '#d94a18',
        outer2: '#8f2208',
        apronColor: '#4a4551',
        road: '#3b3a44',
        road2: '#32313a',
        rumbleA: '#ffb03a',
        rumbleB: '#2a2932',
        edge: '#d8d2c0',
        skyTop: '#2a0d1c',
        skyBottom: '#9a3317',
        sun: '#ffb46b',
        hills: '#43303a',
        hills2: '#2c2029',
        fog: '#8a3a22',
        offroad: 'void'
      },
      points: [
        [1024, 280], [1500, 330], [1760, 650], [1600, 1000], [1750, 1350],
        [1500, 1700], [1050, 1760], [900, 1400], [600, 1700], [300, 1400],
        [420, 1000], [300, 650], [650, 350]
      ]
    },
    {
      id: 'rainbow',
      name: 'RAINBOW RUSH',
      cup: 'No walls. No mercy.',
      laps: 3,
      roadWidth: 150,
      seed: 777,
      props: ['crystal'],
      propEvery: 34,
      itemFracs: [0.14, 0.46, 0.78],
      boostFracs: [0.3, 0.6, 0.9],
      theme: {
        base: 'space',
        apron: false,
        apronWidth: 1,
        outer: '#0a0620',
        outer2: '#140a2e',
        apronColor: '#2a1a4a',
        road: 'rainbow',
        road2: 'rainbow',
        rumbleA: '#ffffff',
        rumbleB: '#6f4fd8',
        edge: '#ffffff',
        skyTop: '#06021a',
        skyBottom: '#2b1159',
        sun: '#ffd4ff',
        hills: '#1d0f3d',
        hills2: '#120826',
        fog: '#2a1250',
        offroad: 'void'
      },
      points: [
        [1024, 260], [1560, 360], [1800, 700], [1520, 900], [1720, 1260],
        [1540, 1660], [1120, 1720], [1060, 1320], [780, 1260], [700, 1660],
        [340, 1500], [300, 1000], [560, 700], [800, 440]
      ]
    }
  ];

  MK.PROP_SIZES = {
    tree: { w: 96, h: 140 },
    pipe: { w: 84, h: 118 },
    palm: { w: 118, h: 168 },
    parasol: { w: 96, h: 122 },
    crystal: { w: 86, h: 150 },
    arrow_sign: { w: 84, h: 92 }
  };
})(window.MK);
