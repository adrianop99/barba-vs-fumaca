'use strict';
// Character data, Fighter state machine, rendering, projectiles, CPU AI.
const FLOOR = 480, WALL_L = 36, WALL_R = 924, GRAV = 0.78;

// ---------- move definitions ----------
// frame: {f: anim frame index, d: duration, a: active?, hb: hitbox override, pose: visual override (Jogador)}
// hit: {x0,x1,y0,y1} relative to feet anchor (x forward), damage, stun (hitstun), bstun, push, lvl: mid|low|high
function mv(o) { o.total = o.frames.reduce((s, f) => s + f.d, 0); return o; }

const CHARS = {
  mukira: {
    id: 'mukira', name: 'MUKIRA', title: 'O Chicote Barbudo', hp: 1000, walkF: 3.2, walkB: 2.6, jumpVX: 4.0, jumpVY: -15.5,
    standH: 210, crouchH: 150, special: 'whip',
    moves: {
      lp: mv({ anim: 'lp', frames: [{ f: 0, d: 3 }, { f: 1, d: 4, a: 1 }, { f: 2, d: 7 }], hit: { x0: 30, x1: 95, y0: -178, y1: -138, dmg: 50, stun: 15, bstun: 10, push: 5 }, sfx: 'whoosh' }),
      hp: mv({ anim: 'whip', frames: [{ f: 0, d: 6 }, { f: 1, d: 5, a: 1 }, { f: 0, d: 12 }], hit: { x0: 40, x1: 110, y0: -175, y1: -132, dmg: 80, stun: 19, bstun: 12, push: 8, heavy: 1 }, sfx: 'whoosh' }),
      lk: mv({ anim: 'lk', frames: [{ f: 0, d: 4 }, { f: 1, d: 5, a: 1 }, { f: 2, d: 10 }], hit: { x0: 50, x1: 150, y0: -155, y1: -100, dmg: 65, stun: 16, bstun: 11, push: 7 }, sfx: 'whoosh' }),
      cp: mv({ anim: 'crouch', crouch: 1, fx: 'jab', frames: [{ f: 0, d: 3 }, { f: 1, d: 4, a: 1 }, { f: 0, d: 7 }], hit: { x0: 30, x1: 105, y0: -125, y1: -85, dmg: 40, stun: 13, bstun: 9, push: 5 }, sfx: 'whoosh' }),
      ck: mv({ anim: 'crouch', crouch: 1, fx: 'sweep', frames: [{ f: 1, d: 5 }, { f: 1, d: 5, a: 1 }, { f: 0, d: 12 }], hit: { x0: 35, x1: 140, y0: -36, y1: 0, dmg: 50, stun: 15, bstun: 11, push: 6, lvl: 'low' }, sfx: 'whoosh' }),
      jp: mv({ anim: 'lp', air: 1, frames: [{ f: 0, d: 3 }, { f: 1, d: 30, a: 1 }], hit: { x0: 20, x1: 92, y0: -170, y1: -110, dmg: 55, stun: 16, bstun: 10, push: 4, lvl: 'high' }, sfx: 'whoosh' }),
      jk: mv({ anim: 'lk', air: 1, frames: [{ f: 0, d: 4 }, { f: 1, d: 30, a: 1 }], hit: { x0: 40, x1: 145, y0: -150, y1: -80, dmg: 65, stun: 17, bstun: 11, push: 5, lvl: 'high' }, sfx: 'whoosh' }),
      whip: mv({ anim: 'whip', special: 1, frames: [{ f: 0, d: 6 }, { f: 1, d: 6 }, { f: 2, d: 6, a: 1, sfx: 'whip' }, { f: 3, d: 7, a: 1, hb: { x0: 50, x1: 150, y0: -235, y1: -140 } }, { f: 0, d: 14 }],
        hit: { x0: 35, x1: 190, y0: -178, y1: -128, dmg: 110, stun: 24, bstun: 16, push: 12, heavy: 1, chip: 12, knock: 1 } }),
    },
  },
  jogador: {
    id: 'jogador', name: 'JOGADOR', title: 'O Malandro da Fumaça', hp: 1000, walkF: 3.5, walkB: 3.0, jumpVX: 4.2, jumpVY: -15.5,
    standH: 212, crouchH: 150, special: 'ring',
    moves: {
      lp: mv({ anim: 'stance', frames: [{ f: 0, d: 3, pose: 'windup' }, { f: 0, d: 4, a: 1, pose: 'ring' }, { f: 0, d: 7 }], hit: { x0: 25, x1: 80, y0: -190, y1: -145, dmg: 50, stun: 15, bstun: 10, push: 5 }, sfx: 'whoosh' }),
      hp: mv({ anim: 'stance', frames: [{ f: 0, d: 6, pose: 'windup' }, { f: 0, d: 5, a: 1, pose: 'ringLunge' }, { f: 0, d: 13, pose: 'ring' }], hit: { x0: 40, x1: 100, y0: -190, y1: -140, dmg: 75, stun: 19, bstun: 12, push: 8, heavy: 1 }, sfx: 'whoosh' }),
      lk: mv({ anim: 'stance', fx: 'kick', frames: [{ f: 0, d: 4, pose: 'kickPrep' }, { f: 0, d: 5, a: 1, pose: 'kick' }, { f: 0, d: 10, pose: 'kickRec' }], hit: { x0: 40, x1: 138, y0: -125, y1: -70, dmg: 65, stun: 16, bstun: 11, push: 7 }, sfx: 'whoosh' }),
      cp: mv({ anim: 'stance', crouch: 1, frames: [{ f: 0, d: 3, pose: 'crouch' }, { f: 0, d: 4, a: 1, pose: 'crouchRing' }, { f: 0, d: 7, pose: 'crouch' }], hit: { x0: 25, x1: 85, y0: -128, y1: -92, dmg: 40, stun: 13, bstun: 9, push: 5 }, sfx: 'whoosh' }),
      ck: mv({ anim: 'stance', crouch: 1, fx: 'sweep', frames: [{ f: 0, d: 5, pose: 'crouch' }, { f: 0, d: 5, a: 1, pose: 'crouchKick' }, { f: 0, d: 12, pose: 'crouch' }], hit: { x0: 35, x1: 140, y0: -36, y1: 0, dmg: 50, stun: 15, bstun: 11, push: 6, lvl: 'low' }, sfx: 'whoosh' }),
      jp: mv({ anim: 'stance', air: 1, frames: [{ f: 0, d: 3, pose: 'jump' }, { f: 0, d: 30, a: 1, pose: 'jumpRing' }], hit: { x0: 20, x1: 85, y0: -175, y1: -115, dmg: 55, stun: 16, bstun: 10, push: 4, lvl: 'high' }, sfx: 'whoosh' }),
      jk: mv({ anim: 'stance', air: 1, fx: 'kick', frames: [{ f: 0, d: 4, pose: 'jump' }, { f: 0, d: 30, a: 1, pose: 'jumpKick' }], hit: { x0: 35, x1: 135, y0: -120, y1: -50, dmg: 65, stun: 17, bstun: 11, push: 5, lvl: 'high' }, sfx: 'whoosh' }),
      ring: mv({ anim: 'stance', special: 1, frames: [{ f: 0, d: 9, pose: 'windup' }, { f: 0, d: 18, pose: 'ring', spawn: 1 }, { f: 0, d: 10 }], hit: null }),
    },
    proj: { speed: 6.5, dmg: 80, stun: 22, bstun: 14, push: 9, chip: 10, cooldown: 110 },
  },
  lobo: {
    id: 'lobo', name: 'LOBO SOLITÁRIO', hud: 'LOBO', title: 'The Lone Alpha + Yorkshire', hp: 1000, walkF: 3.3, walkB: 2.8, jumpVX: 4.0, jumpVY: -15.2,
    standH: 200, crouchH: 140, special: 'lobo', lobo: 1, rich: 1, meterName: 'ALPHA', supers: ['ALPHA PACK', 'ALPHA PACK MÁXIMO'], superSfx: 'howl',
    moves: {
      lp: mv({ anim: 'jab', frames: [{ f: 0, d: 3, anim: 'guard' }, { f: 0, d: 4, a: 1 }, { f: 0, d: 7 }], hit: { x0: 25, x1: 95, y0: -175, y1: -135, dmg: 45, stun: 15, bstun: 10, push: 5 }, sfx: 'whoosh' }),
      hp: mv({ anim: 'fierce', frames: [{ f: 0, d: 6, anim: 'strong' }, { f: 0, d: 6, a: 1 }, { f: 0, d: 12, anim: 'strong' }], hit: { x0: 30, x1: 115, y0: -172, y1: -120, dmg: 80, stun: 19, bstun: 12, push: 8, heavy: 1 }, sfx: 'whoosh' }),
      lk: mv({ anim: 'hk', frames: [{ f: 0, d: 5, anim: 'lowk' }, { f: 0, d: 6, a: 1 }, { f: 0, d: 11, anim: 'guard' }], hit: { x0: 35, x1: 140, y0: -170, y1: -100, dmg: 70, stun: 17, bstun: 11, push: 7 }, sfx: 'whip' }),
      cp: mv({ anim: 'crouch', crouch: 1, fx: 'jab', frames: [{ f: 0, d: 3, anim: 'cblock' }, { f: 0, d: 4, a: 1 }, { f: 0, d: 7, anim: 'cblock' }], hit: { x0: 25, x1: 100, y0: -118, y1: -80, dmg: 40, stun: 13, bstun: 9, push: 5 }, sfx: 'whoosh' }),
      ck: mv({ anim: 'sweep', crouch: 1, frames: [{ f: 0, d: 5, anim: 'crouch' }, { f: 0, d: 5, a: 1 }, { f: 0, d: 12, anim: 'crouch' }], hit: { x0: 35, x1: 150, y0: -40, y1: 0, dmg: 50, stun: 15, bstun: 11, push: 6, lvl: 'low' }, sfx: 'whoosh' }),
      jp: mv({ anim: 'jpa', air: 1, frames: [{ f: 0, d: 3, anim: 'jump' }, { f: 0, d: 30, a: 1, v: { oy: -14 } }], hit: { x0: 20, x1: 90, y0: -170, y1: -110, dmg: 55, stun: 16, bstun: 10, push: 4, lvl: 'high' }, sfx: 'whoosh' }),
      jk: mv({ anim: 'jka', air: 1, frames: [{ f: 0, d: 4, anim: 'jump' }, { f: 0, d: 30, a: 1, v: { oy: -30 } }], hit: { x0: 35, x1: 140, y0: -150, y1: -60, dmg: 65, stun: 17, bstun: 11, push: 5, lvl: 'high' }, sfx: 'whoosh' }),
      slash: mv({ anim: 'slash', special: 1, frames: [{ f: 0, d: 9, anim: 'guard' }, { f: 0, d: 14, spawn: 'wave', sfx: 'whip' }, { f: 0, d: 10 }], hit: null }),
      throw: mv({ anim: 'throw', special: 1, frames: [{ f: 0, d: 8, anim: 'crouch' }, { f: 0, d: 18, spawn: 'dog', sfx: 'bark' }, { f: 0, d: 6 }], hit: null }),
      spin: mv({ anim: 'spin', special: 1, fx2: 'spinfx', frames: [{ f: 0, d: 6, anim: 'cblock' }, { f: 0, d: 8, a: 1, vx: 3, sfx: 'whip' }, { f: 0, d: 8, a: 1, rh: 1, vx: 3 }, { f: 0, d: 8, a: 1, rh: 1, vx: 2, hb: { knock: 1, dmg: 45, push: 10 } }, { f: 0, d: 14, anim: 'guard', vx: 0 }],
        hit: { x0: -40, x1: 150, y0: -170, y1: -10, dmg: 35, stun: 18, bstun: 10, push: 3, chip: 6 } }),
      rush: mv({ anim: 'rush', special: 1, fx2: 'rushhead', frames: [{ f: 0, d: 8, anim: 'crouch' }, { f: 0, d: 16, a: 1, vx: 9, sfx: 'howl' }, { f: 0, d: 14, anim: 'guard', vx: 0 }],
        hit: { x0: 10, x1: 190, y0: -170, y1: -30, dmg: 90, stun: 22, bstun: 14, push: 10, heavy: 1, chip: 10, knock: 1 } }),
      sweep: mv({ anim: 'sweep', special: 1, crouch: 1, fx2: 'sweepfx', frames: [{ f: 0, d: 9, anim: 'crouch' }, { f: 0, d: 12, a: 1, sfx: 'bark' }, { f: 0, d: 16, anim: 'crouch' }],
        hit: { x0: 50, x1: 250, y0: -70, y1: 0, dmg: 70, stun: 20, bstun: 12, push: 8, lvl: 'low', chip: 8, knock: 1 } }),
      roar: mv({ anim: 'roar', special: 1, frames: [{ f: 0, d: 10, anim: 'guard' }, { f: 0, d: 20, spawn: 'roar', sfx: 'howl' }, { f: 0, d: 12 }], hit: null }),
      super1: mv({ anim: 'rush', special: 1, frames: [{ f: 0, d: 12, anim: 'superpose' }, { f: 0, d: 22, spawn: 'pack', vx: 5 }, { f: 0, d: 14, anim: 'guard', vx: 0 }], hit: null }),
      super2: mv({ anim: 'rush', special: 1, frames: [{ f: 0, d: 12, anim: 'superpose' }, { f: 0, d: 26, spawn: 'pack2', vx: 6 }, { f: 0, d: 14, anim: 'taunt', vx: 0 }], hit: null }),
    },
    projs: {
      wave: { speed: 7.5, dmg: 75, stun: 22, bstun: 14, push: 9, chip: 10, cooldown: 100, ox: 95, oy: 95, bw: 30, bh: 60 },
      dog: { speed: 9, dmg: 30, stun: 24, bstun: 14, push: 3, chip: 6, cooldown: 140, ox: 110, oy: 70, bw: 40, bh: 40, maxHits: 3, gap: 12, knockLast: 1, life: 80 },
      roar: { speed: 6, dmg: 55, stun: 24, bstun: 14, push: 6, chip: 10, cooldown: 130, ox: 120, oy: 110, bw: 60, bh: 75, maxHits: 2, gap: 10, knockLast: 1 },
      pack: { speed: 8, dmg: 85, stun: 30, bstun: 16, push: 4, chip: 15, ox: 120, oy: 100, bw: 150, bh: 100, maxHits: 3, gap: 9, knockLast: 1, pierce: 1, nomtr: 1 },
      pack2: { speed: 9, dmg: 80, stun: 30, bstun: 16, push: 4, chip: 18, ox: 120, oy: 110, bw: 170, bh: 115, maxHits: 5, gap: 7, knockLast: 1, pierce: 1, nomtr: 1, big: 1 },
    },
  },
  go: {
    id: 'go', name: 'G.O.', title: 'Hacker dos Dados', hp: 980, walkF: 3.4, walkB: 2.9, jumpVX: 4.1, jumpVY: -15.4,
    standH: 205, crouchH: 140, special: 'go', rich: 1, meterName: 'DATA', supers: ['GAME OVER', 'SYSTEM CRASH'], superSfx: 'data',
    moves: {
      lp: mv({ anim: 'jab', frames: [{ f: 0, d: 3, anim: 'guard' }, { f: 0, d: 4, a: 1 }, { f: 0, d: 7, anim: 'guard' }], hit: { x0: 25, x1: 95, y0: -172, y1: -132, dmg: 45, stun: 15, bstun: 10, push: 5 }, sfx: 'whoosh' }),
      hp: mv({ anim: 'fierce', frames: [{ f: 0, d: 6, anim: 'strong' }, { f: 0, d: 6, a: 1 }, { f: 0, d: 12, anim: 'strong2' }], hit: { x0: 30, x1: 125, y0: -172, y1: -128, dmg: 80, stun: 19, bstun: 12, push: 8, heavy: 1 }, sfx: 'whoosh' }),
      lk: mv({ anim: 'hk', frames: [{ f: 0, d: 5, anim: 'lowk' }, { f: 0, d: 6, a: 1 }, { f: 0, d: 11, anim: 'guard' }], hit: { x0: 35, x1: 140, y0: -175, y1: -105, dmg: 70, stun: 17, bstun: 11, push: 7 }, sfx: 'whip' }),
      cp: mv({ anim: 'jstart', crouch: 1, fx: 'jab', frames: [{ f: 0, d: 3, anim: 'crouch' }, { f: 0, d: 4, a: 1 }, { f: 0, d: 7, anim: 'crouch' }], hit: { x0: 25, x1: 100, y0: -118, y1: -80, dmg: 40, stun: 13, bstun: 9, push: 5 }, sfx: 'whoosh' }),
      ck: mv({ anim: 'lowk', crouch: 1, frames: [{ f: 0, d: 5, anim: 'crouch' }, { f: 0, d: 5, a: 1, v: { sy: 0.8 } }, { f: 0, d: 12, anim: 'crouch' }], hit: { x0: 30, x1: 135, y0: -40, y1: 0, dmg: 50, stun: 15, bstun: 11, push: 6, lvl: 'low' }, sfx: 'whoosh' }),
      jp: mv({ anim: 'jab', air: 1, frames: [{ f: 0, d: 3, anim: 'jump' }, { f: 0, d: 30, a: 1, v: { oy: -14 } }], hit: { x0: 20, x1: 92, y0: -170, y1: -110, dmg: 55, stun: 16, bstun: 10, push: 4, lvl: 'high' }, sfx: 'whoosh' }),
      jk: mv({ anim: 'hk', air: 1, frames: [{ f: 0, d: 4, anim: 'jump' }, { f: 0, d: 30, a: 1, v: { oy: -30 } }], hit: { x0: 35, x1: 140, y0: -130, y1: -55, dmg: 65, stun: 17, bstun: 11, push: 5, lvl: 'high' }, sfx: 'whoosh' }),
      blast: mv({ anim: 'blast', special: 1, frames: [{ f: 0, d: 9, anim: 'blastwind' }, { f: 0, d: 14, spawn: 'die', sfx: 'data' }, { f: 0, d: 10, anim: 'guard' }], hit: null }),
      dice: mv({ anim: 'dicethrow', special: 1, frames: [{ f: 0, d: 8, anim: 'dicethrow2' }, { f: 0, d: 16, spawn: 'dice', sfx: 'data' }, { f: 0, d: 10, anim: 'guard' }], hit: null }),
      dash: mv({ anim: 'dash', special: 1, frames: [{ f: 0, d: 8, anim: 'dashstart' }, { f: 0, d: 14, a: 1, vx: 10, sfx: 'whoosh' }, { f: 0, d: 16, anim: 'guard', vx: 0 }],
        hit: { x0: 10, x1: 150, y0: -165, y1: -40, dmg: 85, stun: 22, bstun: 14, push: 10, heavy: 1, chip: 10, knock: 1 } }),
      grab: mv({ anim: 'grab', special: 1, frames: [{ f: 0, d: 6, anim: 'grabwind', vx: 3 }, { f: 0, d: 7, a: 1, vx: 0, sfx: 'data' }, { f: 0, d: 22, anim: 'grabwind' }],
        hit: { x0: 10, x1: 118, y0: -170, y1: -40, dmg: 115, stun: 30, bstun: 0, push: 6, heavy: 1, knock: 1, unblock: 1 } }),
      trap: mv({ anim: 'trapcast', special: 1, frames: [{ f: 0, d: 10, anim: 'guard' }, { f: 0, d: 18, spawn: 'cage', sfx: 'data' }, { f: 0, d: 10, anim: 'guard' }], hit: null }),
      rand: mv({ anim: 'rand', special: 1, frames: [{ f: 0, d: 8, anim: 'randwind' }, { f: 0, d: 20, spawn: 'rand', sfx: 'data' }, { f: 0, d: 8, anim: 'guard' }], hit: null }),
      super1: mv({ anim: 'super1n', special: 1, frames: [{ f: 0, d: 6, anim: 'blastwind' }, { f: 0, d: 36, spawn: 'rain' }, { f: 0, d: 14, anim: 'guard' }], hit: null }),
      super2: mv({ anim: 'super2n', special: 1, frames: [{ f: 0, d: 12, anim: 'taunt' }, { f: 0, d: 40, spawn: 'crash' }, { f: 0, d: 16, anim: 'guard' }], hit: null }),
    },
    projs: {
      die: { speed: 7.5, dmg: 75, stun: 22, bstun: 14, push: 9, chip: 10, cooldown: 95, ox: 105, oy: 100, bw: 34, bh: 44 },
      dice: { speed: 6, dmg: 30, stun: 16, bstun: 10, push: 4, chip: 5, cooldown: 120, ox: 80, oy: 120, bw: 18, bh: 18, grav: 0.16, life: 110 },
      cage: { speed: 0, dmg: 60, stun: 58, bstun: 16, push: 0, chip: 8, cooldown: 160, at: 'opp', oy: 0, bw: 55, bh: 200, delay: 16, life: 34, follow: 1 },
      drop: { speed: 0, dmg: 105, stun: 26, bstun: 14, push: 6, chip: 15, at: 'opp', oy: 0, bw: 50, bh: 200, delay: 22, life: 34, heavy: 1, knockLast: 1, nomtr: 1 },
      rain: { speed: 0, dmg: 52, stun: 22, bstun: 10, push: 2, chip: 15, at: 'opp', oy: 0, bw: 85, bh: 210, delay: 10, maxHits: 5, gap: 8, knockLast: 1, pierce: 1, life: 70, nomtr: 1, follow: 1 },
      crash: { speed: 0, dmg: 70, stun: 28, bstun: 14, push: 3, chip: 18, at: 'self', ox: 190, oy: 0, bw: 230, bh: 230, delay: 12, maxHits: 5, gap: 9, knockLast: 1, pierce: 1, life: 80, nomtr: 1 },
    },
  },
};

// ---------- sprite assets ----------
const Sprites = { ready: false };
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src)); i.src = src; }); }
async function loadSprites() {
  for (const id of ['mukira', 'jogador', 'lobo', 'go']) {
    const [img, meta] = await Promise.all([loadImage(`assets/${id}/atlas.png`), fetch(`assets/${id}/atlas.json`).then(r => r.json())]);
    const tint = id === 'lobo' ? await loadImage('assets/lobo/atlas_p2.png') : makeVariant(img, id, 'tint');
    Sprites[id] = { img, meta: meta.anims, tint, white: makeVariant(img, id, 'white') };
  }
  Sprites.ready = true;
}
function makeVariant(img, id, kind) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
  g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue; const r = p[i], gg = p[i + 1], b = p[i + 2];
    if (kind === 'white') { p[i] = p[i + 1] = p[i + 2] = 255; continue; }
    if (id === 'go') { if (b > 70 && b > r + 20 && b > gg) { p[i] = Math.min(255, Math.round(b * 0.95 + 20)); p[i + 1] = Math.round(gg * 0.3); p[i + 2] = Math.round(b * 0.5 + r * 0.3); } continue; }
    if (id === 'lobo') { if (b > r + 25 && b > gg) { p[i] = Math.min(255, b + 10); p[i + 1] = Math.round(gg * 0.45); p[i + 2] = Math.round(r * 0.7); } continue; }
    if (id === 'mukira') { if (b > r + 25 && b > gg) { p[i] = b; p[i + 2] = Math.round(r * 0.6); p[i + 1] = Math.round(gg * 0.75); } }
    else { if (r > 90 && r > gg * 2.2 && r > b * 2.2) { p[i] = Math.round(gg * 0.5); p[i + 1] = r; p[i + 2] = Math.round(b * 0.8 + 20); }
      else if (b > 35 && b > r + 10 && b > gg) { p[i] = Math.min(255, r + 30); p[i + 1] = Math.round(gg * 0.8); p[i + 2] = Math.round(b * 0.6); } }
  }
  g.putImageData(d, 0, 0); return c;
}

// ---------- Fighter ----------
class Fighter {
  constructor(charId, side, tinted) {
    this.c = CHARS[charId]; this.id = charId; this.side = side; this.tinted = tinted; this.meter = 0;
    this.reset(side);
  }
  reset(side) {
    this.x = side === 0 ? 300 : 660; this.y = FLOOR; this.vx = 0; this.vy = 0; this.facing = side === 0 ? 1 : -1;
    this.hp = this.c.hp; this.state = 'idle'; this.t = 0; this.move = null; this.mt = 0; this.hitDone = false; this.stun = 0;
    this.crouching = false; this.cool = 0; this.flash = 0; this.dirHist = []; this.prev = {}; this.inv = 0; this.pushV = 0; this.combo = 0; this.animT = 0; this.pt = {};
    this.pup = this.c.lobo ? { x: this.x + this.facing * 55, face: this.facing, t: 0, away: false, ret: false, moving: false, hide: true } : null; this.trail = []; this.lastV = null; this.trans = null;
  }
  get air() { return this.y < FLOOR - 0.01 || this.state === 'air' || this.state === 'fall'; }
  dirNum(inp) { // numpad notation relative to facing
    const f = this.facing > 0 ? inp.right : inp.left, b = this.facing > 0 ? inp.left : inp.right;
    const h = f && !b ? 1 : b && !f ? -1 : 0, v = inp.up ? 1 : inp.down ? -1 : 0;
    return 5 + h + v * 3;
  }
  canAct() { return ['idle', 'walk', 'crouch'].includes(this.state); }
  startMove(name, G) {
    const m = this.c.moves[name]; if (!m) return;
    this.move = m; this.moveName = name; this.mt = 0; this.hitDone = false; this.state = 'attack';
    if (!m.air) { this.vx = 0; }
    if (m.sfx) SFX.play(m.sfx);
    if (m.special && this.c.special === 'whip') SFX.play('whoosh');
  }
  curFrame() { if (!this.move) return null; let t = this.mt; for (const fr of this.move.frames) { if (t < fr.d) return fr; t -= fr.d; } return this.move.frames[this.move.frames.length - 1]; }
  update(inp, opp, G) {
    const press = {}; for (const k of ['punch', 'kick', 'special', 'up', 'super']) press[k] = inp[k] && !this.prev[k]; this.prev = { ...inp };
    this.tick = (this.tick || 0) + 1; for (const k of ['punch', 'kick', 'special']) if (press[k]) this.pt[k] = this.tick;
    if (this.c.lobo) this.updPup(G);
    const d = this.dirNum(inp); this.dirHist.push(d); if (this.dirHist.length > 20) this.dirHist.shift();
    this.t++; this.animT++; if (this.cool > 0) this.cool--; if (this.randCool > 0) this.randCool--; if (this.flash > 0) this.flash--; if (this.inv > 0) this.inv--;
    const st = this.state;
    if (st === 'ko' || st === 'win' || st === 'timeup') { this.physics(G); return; }
    if (G.frozenInput) { // intro / round end: just idle and face
      if (st === 'idle' || st === 'walk' || st === 'crouch') { if (st !== 'idle') this.setState('idle'); this.vx = 0; this.crouching = false; if (!this.air) this.facing = opp.x >= this.x ? 1 : -1; }
      else if (st === 'attack') this.tickMove(opp, G);
      else if (st === 'hit' || st === 'block') { this.stun--; if (this.stun <= 0) this.setState('idle'); }
      else if (st === 'down') { if (this.t > 38) this.setState('getup'); }
      else if (st === 'getup') { if (this.t > 28) this.setState('idle'); }
      else if (st === 'land' || st === 'jumpsq') { if (this.t > 4) this.setState(st === 'jumpsq' ? 'idle' : 'idle'); }
      this.physics(G); return;
    }
    // turn to face opponent when grounded and free
    if (this.canAct()) this.facing = opp.x >= this.x ? 1 : -1;
    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': {
        if (this.c.rich && this.cmdInput(press, d, G)) break;
        const specialMotion = press.punch && (d === 3 || this.recentMotion());
        if (press.special || specialMotion) { if (this.trySpecial(G)) break; }
        if (d <= 3) { // crouch
          this.state = 'crouch'; this.crouching = true; this.vx = 0;
          if (press.punch) this.startMove('cp', G); else if (press.kick) this.startMove('ck', G);
          break;
        }
        this.crouching = false;
        if (d >= 7) { this.state = 'jumpsq'; this.t = 0; this.jumpDir = d === 9 ? 1 : d === 7 ? -1 : 0; break; }
        if (press.punch) { this.startMove(d === 6 ? 'hp' : 'lp', G); break; }
        if (press.kick) { this.startMove('lk', G); break; }
        if (d === 6) { this.state = 'walk'; this.vx = this.c.walkF * this.facing; }
        else if (d === 4) { this.state = 'walk'; this.vx = -this.c.walkB * this.facing; }
        else { this.state = 'idle'; this.vx = 0; }
        break;
      }
      case 'jumpsq': this.vx = 0; if (this.t >= 3) { this.state = 'air'; this.vy = this.c.jumpVY; this.vx = this.jumpDir * this.c.jumpVX * this.facing; this.t = 0; this.airAtk = false; } break;
      case 'air':
        if (!this.airAtk && (press.punch || press.kick)) { this.airAtk = true; const keepVx = this.vx; this.startMove(press.punch ? 'jp' : 'jk', G); this.vx = keepVx; }
        break;
      case 'attack': if (this.c.rich && this.mt < 6 && !this.move.air && !/^super/.test(this.moveName) && (press.punch || press.kick || press.special || press.super) && this.cmdInput(press, d, G, true)) break; this.tickMove(opp, G); break;
      case 'hit': case 'block': this.stun--; if (this.stun <= 0) this.setState(this.crouching && d <= 3 ? 'crouch' : 'idle'); break;
      case 'down': if (this.t > 38) { this.setState('getup'); } break;
      case 'getup': if (this.t > 28) { this.inv = 18; this.setState('idle'); } break;
      case 'land': if (this.t > 4) this.setState('idle'); break;
    }
    this.physics(G);
  }
  recentMotion() { const h = this.dirHist.slice(-14); const i2 = h.lastIndexOf(2); return i2 >= 0 && h.slice(i2).some(v => v === 3) && (h[h.length - 1] === 6 || h[h.length - 1] === 3); }
  motion(seq, n = 16) { const h = this.dirHist.slice(-n); let k = 0; for (const v of h) if (v === seq[k]) { k++; if (k === seq.length) return true; } return false; }
  dashF() { const h = this.dirHist.slice(-16); let i = h.length - 1; if (h[i] !== 6) return false; while (i >= 0 && h[i] === 6) i--; let j = i; while (j >= 0 && h[j] !== 6 && h[j] === 5) j--; return j >= 0 && j < i && h[j] === 6 && i - j <= 10; }
  // Lobo Solitário command list (keyboard + touch friendly). cancel=true: only P+K combos/supers in the first frames of a normal.
  // Touch: Especial (=Claw Slash), +← Dog Throw, +→ Alpha Rush, +↓ Tail Sweep, +↘ Alpha Roar, Soco+Chute Wolf Spin,
  // Especial+Soco / Especial+Chute / SUPER = super (Lv2 with 2 bars). Keyboard motions follow the sheet:
  // ↓↘→P claw, ↓↙←K dog, →→P rush, ↓↘→K sweep, ↓↙←P roar, ↓↘→↓↘→ P+K super.
  loboInput(press, d, G, cancel) {
    const P = press.punch, K = press.kick, S = press.special;
    const rec = k => press[k] || this.tick - (this.pt[k] || -99) <= 5;
    const chord = (a, b) => (press[a] || press[b]) && rec(a) && rec(b);
    const used = (...ks) => { for (const k of ks) this.pt[k] = -99; };
    const q = this.motion([2, 3, 6]), qb = this.motion([2, 1, 4]), qq = this.motion([2, 3, 6, 2, 3, 6], 24);
    const lv = () => this.meter >= 200 ? 2 : 1;
    if (press.super && this.meter >= 100) return this.doSuper(lv(), G);
    if (this.meter >= 100 && (chord('special', 'punch') || chord('special', 'kick') || (qq && chord('punch', 'kick')))) { used('special', 'punch', 'kick'); return this.doSuper(lv(), G); }
    if (chord('punch', 'kick')) { used('punch', 'kick'); if (this.moveName === 'spin' && this.state === 'attack') return true; this.startMove('spin', G); return true; }
    if (cancel) return false;
    const busy = k => G.projectiles.some(p => p.owner === this && p.kind === k);
    let mvn = null;
    if (S) mvn = d === 4 || d === 1 ? 'throw' : d === 6 ? 'rush' : d === 2 ? 'sweep' : d === 3 ? 'roar' : 'slash';
    else if (K && qb) mvn = 'throw';
    else if (K && q) mvn = 'sweep';
    else if (P && qb) mvn = 'roar';
    else if (P && (q || d === 3)) mvn = 'slash';
    else if (P && this.dashF()) mvn = 'rush';
    if (!mvn) return false;
    if ((mvn === 'slash' || mvn === 'roar' || mvn === 'throw') && (this.cool > 0 || busy('wave') || busy('roar') || busy('dog') || (this.pup && this.pup.ret))) return S;
    this.startMove(mvn, G); this.meter = Math.min(200, this.meter + 4); return true;
  }
  // The Yorkshire is its own sprite: follows the wolf, leaves during Dog Throw and runs back afterwards.
  // The Yorkshire is baked into most of the user's poses (it stands next to the wolf). It becomes its own sprite only
  // when the wolf leaves the floor (jumps / falls: the dog waits on the ground) and during Dog Throw (flies, bites, runs back).
  updPup(G) {
    const p = this.pup; p.t++;
    if (G.projectiles.some(q => q.owner === this && q.kind === 'dog')) { p.away = true; p.hide = true; return; }
    if (p.away) { p.away = false; p.ret = true; p.x = this.lastDogX != null ? this.lastDogX : p.x; }
    const tx = this.x + this.facing * 55, dx = tx - p.x, ad = Math.abs(dx);
    if (p.ret) { p.hide = false; p.moving = true; p.face = Math.sign(dx) || p.face; p.x += Math.sign(dx) * Math.min(ad, 10); if (ad < 12) { p.ret = false; p.moving = false; } return; }
    p.moving = false; p.face = this.facing;
    const off = this.air || ['fall'].includes(this.state);
    if (off) { p.hide = false; return; } // stays where it was
    p.hide = true; p.x = tx;
  }
  dogOut() { return this.pup && (this.pup.away || this.pup.ret); }
  doSuper(lvl, G) { this.meter -= lvl * 100; this.startMove(lvl === 1 ? 'super1' : 'super2', G); G.superFlash = { t: 0, f: this, name: this.c.supers[lvl - 1] }; G.hitstop = 26; SFX.play(this.c.superSfx); return true; }
  cmdInput(press, d, G, cancel) { return this.id === 'go' ? this.goInput(press, d, G, cancel) : this.loboInput(press, d, G, cancel); }
  // G.O. command list. Touch: Especial (+← +→ +↓ +↘), Soco+Chute, Especial+Soco / Especial+Chute (supers), SUPER button.
  // Keyboard motions follow the sheet's combo row: ↓↘→P, ↓↙←P, →→P, →↓↘P, →↓↘K, →↓↘P+K.
  goInput(press, d, G, cancel) {
    const P = press.punch, K = press.kick, S = press.special;
    const rec = k => press[k] || this.tick - (this.pt[k] || -99) <= 5;
    const chord = (a, b) => (press[a] || press[b]) && rec(a) && rec(b);
    const used = (...ks) => { for (const k of ks) this.pt[k] = -99; };
    const dp = this.motion([6, 2, 3]) && (d === 3 || d === 2), q = !dp && this.motion([2, 3, 6]), qb = this.motion([2, 1, 4]);
    if (press.super && this.meter >= 100) return this.doSuper(this.meter >= 200 ? 2 : 1, G);
    if (this.meter >= 200 && (chord('special', 'kick') || (qb && chord('punch', 'kick')))) { used('special', 'kick', 'punch'); return this.doSuper(2, G); }
    if (this.meter >= 100 && (chord('special', 'punch') || (q && chord('punch', 'kick')))) { used('special', 'punch', 'kick'); return this.doSuper(1, G); }
    if (chord('punch', 'kick')) { used('punch', 'kick'); if (this.moveName === 'rand' && this.state === 'attack') return true; if (this.randCool > 0) return true; this.startMove('rand', G); this.randCool = 150; return true; }
    if (cancel) return false;
    let mvn = null;
    if (S) mvn = d === 4 || d === 1 ? 'dice' : d === 6 ? 'dash' : d === 2 ? 'trap' : d === 3 ? 'grab' : 'blast';
    else if (P && dp) mvn = 'grab';
    else if (K && dp) mvn = 'trap';
    else if (P && this.dashF()) mvn = 'dash';
    else if (P && qb) mvn = 'dice';
    else if (P && q) mvn = 'blast';
    if (!mvn) return false;
    const busy = k => G.projectiles.some(p => p.owner === this && p.kind === k);
    if ((mvn === 'blast' || mvn === 'dice' || mvn === 'trap') && (this.cool > 0 || busy('die') || busy('dice') || busy('cage'))) return S;
    this.startMove(mvn, G); this.meter = Math.min(200, this.meter + 4); return true;
  }
  spawnProj(kind, G) {
    const opp = G.fighters.find(f => f !== this);
    if (kind === 'rand') return G.randomize(this, opp);
    const P = this.c.projs[kind]; if (P.cooldown) this.cool = P.cooldown;
    if (kind === 'dice') { [-4.2, -2.6, -1.0].forEach((vy, i) => G.projectiles.push({ owner: this, kind, x: this.x + this.facing * P.ox, y: FLOOR - P.oy, vx: (P.speed + i * 0.8) * this.facing, vy, dir: this.facing, t: 0, P, hits: 0, hcd: 0, spin: i })); return; }
    const x = P.at === 'opp' ? opp.x : this.x + this.facing * (P.ox || 0);
    G.projectiles.push({ owner: this, kind, x, y: FLOOR - P.oy, vx: P.speed * this.facing, vy: 0, dir: this.facing, t: 0, P, hits: 0, hcd: 0 });
  }
  trySpecial(G) {
    if (this.c.rich) return false;
    if (this.c.special === 'ring') { if (this.cool > 0 || G.projectiles.some(p => p.owner === this)) return false; this.startMove('ring', G); return true; }
    this.startMove('whip', G); return true;
  }
  tickMove(opp, G) {
    const fr = this.curFrame(), m = this.move;
    const startOf = this.frameStart(fr);
    if (this.mt === startOf) { if (fr.sfx) SFX.play(fr.sfx); if (fr.spawn) { if (fr.spawn === 1) this.spawnRing(G); else this.spawnProj(fr.spawn, G); } if (fr.rh) this.hitDone = false; }
    if (fr.vx != null && !m.air) this.vx = fr.vx * this.facing;
    if (fr.a && !this.hitDone) G.checkHit(this, opp, fr.hb ? { ...m.hit, ...fr.hb } : m.hit);
    this.mt++;
    if (m.air) { if (!this.air) { this.move = null; this.setState('land'); } return; }
    if (this.mt >= m.total) { if (this.c.rich) this.vx = 0; this.move = null; this.setState(m.crouch ? 'crouch' : 'idle'); }
  }
  frameStart(fr) { let t = 0; for (const f of this.move.frames) { if (f === fr) return t; t += f.d; } return 0; }
  spawnRing(G) {
    const P = this.c.proj; this.cool = P.cooldown;
    G.projectiles.push({ owner: this, x: this.x + this.facing * 95, y: FLOOR - 168, vx: P.speed * this.facing, t: 0, P });
    SFX.play('smoke');
  }
  setState(s) { this.state = s; this.t = 0; if (s !== 'attack') this.move = null; if (s === 'idle' || s === 'walk') this.crouching = false; }
  physics(G) {
    if (this.state === 'air' || this.state === 'fall' || (this.state === 'attack' && this.move && this.move.air) || this.y < FLOOR) {
      this.vy += GRAV; this.y += this.vy; this.x += this.vx;
      if (this.y >= FLOOR) {
        this.y = FLOOR; this.vy = 0; this.vx = 0;
        if (this.state === 'fall') { this.setState(this.hp <= 0 ? 'ko' : 'down'); SFX.play('land'); G.dust(this.x); if (this.hp <= 0) this.state = 'ko'; }
        else if (this.state === 'ko') { G.dust(this.x); }
        else if (this.state === 'air' || this.state === 'attack') { this.move = null; this.setState('land'); G.dust(this.x); }
      }
    } else {
      this.x += this.vx;
    }
    if (this.pushV) { this.x += this.pushV; this.pushV *= 0.82; if (Math.abs(this.pushV) < 0.2) this.pushV = 0; }
    if (this.state === 'hit' || this.state === 'block' || this.state === 'down' || this.state === 'getup' || this.state === 'land') { if (!this.air) this.vx = 0; }
  }
  // boxes in world coords
  hurtbox() {
    const c = this.c; let top;
    if (this.state === 'down' || this.state === 'ko') return null;
    if (this.crouching || (this.move && this.move.crouch)) top = -c.crouchH; else if (this.air) top = -c.standH + 25; else top = -c.standH;
    const b = { x0: this.x - 36, x1: this.x + 36, y0: this.y + top, y1: this.y + (this.air ? -30 : 0) };
    return b;
  }
  limbBox() { // attacking limb is also hurtable
    if (!this.move || !this.move.hit) return null; const fr = this.curFrame(); if (!fr || !(fr.a || this.mt > this.frameStart(fr))) return null;
    const h = this.move.hit; if (this.mt < this.move.frames[0].d) return null;
    return this.worldBox({ x0: h.x0, x1: h.x1 - 10, y0: h.y0 + 6, y1: h.y1 - 6 });
  }
  worldBox(h) { const a = this.x + h.x0 * this.facing, b = this.x + h.x1 * this.facing; return { x0: Math.min(a, b), x1: Math.max(a, b), y0: this.y + h.y0, y1: this.y + h.y1 }; }
  isBlocking(opp, lvl) {
    if (!['idle', 'walk', 'crouch', 'block'].includes(this.state) || this.air) return false;
    const inp = this.prev; const back = this.facing > 0 ? inp.left : inp.right; if (!back || inp.up) return false;
    const low = !!inp.down;
    if (lvl === 'low' && !low) return false;
    if (lvl === 'high' && low) return false;
    return true;
  }
}

// ---------- drawing ----------
function drawFrame(ctx, f, anim, idx, opt) {
  const S = Sprites[f.id], m = S.meta[anim][idx]; if (!m) return;
  const img = opt.white ? S.white : (f.tinted ? S.tint : S.img);
  ctx.save();
  ctx.translate(Math.round(f.x + (opt.ox || 0) * f.facing), Math.round(f.y + (opt.oy || 0)));
  if (opt.rot) ctx.rotate(opt.rot * f.facing);
  ctx.scale(f.facing * (opt.sx || 1), opt.sy || 1);
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  ctx.drawImage(img, m.x, m.y, m.w, m.h, -Math.round(m.ax), -m.h, m.w, m.h);
  ctx.restore();
}
function cyc(t, n, spd) { return Math.floor(t / spd) % n; }

function mukiraVisual(f) {
  const s = f.state, t = f.animT;
  if (s === 'attack' && f.move) { const fr = f.curFrame(); return { anim: f.move.anim, idx: fr.f }; }
  switch (s) {
    case 'walk': return { anim: 'walk', idx: cyc(t, 4, 9) };
    case 'crouch': return { anim: 'crouch', idx: 0 };
    case 'jumpsq': case 'land': return { anim: 'crouch', idx: 0, sy: 1.08 };
    case 'air': return { anim: 'jump', idx: f.vy < -6 ? 0 : f.vy < 5 ? 1 : 2 };
    case 'hit': return { anim: 'hit', idx: f.t < 8 ? 0 : 1 };
    case 'block': return f.crouching ? { anim: 'crouch', idx: 1, ox: -4 } : { anim: 'hit', idx: 1, ox: -6 };
    case 'fall': return { anim: 'ko', idx: 0, oy: 10 };
    case 'down': case 'ko': return { anim: 'ko', idx: f.t < 10 && s === 'down' ? 0 : 1 };
    case 'getup': return { anim: 'crouch', idx: 1 };
    case 'win': return { anim: 'whip', idx: f.t % 120 < 60 ? 3 : 0 };
    default: return { anim: 'idle', idx: cyc(t, 4, 12) };
  }
}
const JPOSE = {
  stance: () => ({ anim: 'stance', idx: 0 }),
  windup: () => ({ anim: 'stance', idx: 0, ox: -4, rot: -0.04, sx: 0.98 }),
  ring: () => ({ anim: 'ring', idx: 0, ox: 6 }),
  ringLunge: () => ({ anim: 'ring', idx: 0, ox: 20, rot: 0.05 }),
  kickPrep: () => ({ anim: 'kick', idx: 0 }),
  kick: () => ({ anim: 'kick', idx: 1 }),
  kickRec: () => ({ anim: 'kick', idx: 2 }),
  crouch: () => ({ anim: 'crouch', idx: 0 }),
  crouchRing: () => ({ anim: 'ring', idx: 0, sy: 0.74, sx: 1.06, ox: 6 }),
  crouchKick: () => ({ anim: 'ckick', idx: 0, ox: 4 }),
  jump: () => ({ anim: 'jump', idx: 0, oy: -6 }),
  jumpRing: () => ({ anim: 'ring', idx: 0, sy: 0.92, rot: 0.08, oy: -10 }),
  jumpKick: () => ({ anim: 'kick', idx: 1, oy: -16, rot: -0.1 }),
};
// Rig frames (tools/rig_jogador.py) cut from the user's own art.
function jogadorVisual(f) {
  const s = f.state, t = f.animT;
  if (s === 'attack' && f.move) { const fr = f.curFrame(); return JPOSE[fr.pose || (f.move.crouch ? 'crouch' : f.move.air ? 'jump' : 'stance')](); }
  switch (s) {
    case 'walk': { const dir = Math.sign(f.vx * f.facing) || 1; const n = cyc(t, 4, 8); return { anim: 'walk', idx: dir > 0 ? n : 3 - n }; }
    case 'crouch': return JPOSE.crouch();
    case 'jumpsq': case 'land': return { anim: 'getup', idx: 3 };
    case 'air': return { anim: 'jump', idx: f.vy < -5 ? 0 : f.vy < 4 ? 1 : 2, oy: -6 };
    case 'hit': return f.heavyHit ? { anim: 'hitH', idx: f.t < 7 ? 0 : 1 } : { anim: 'hitL', idx: f.t < 6 ? 0 : 1 };
    case 'block': return f.crouching ? { anim: 'cblock', idx: 0 } : { anim: 'block', idx: 0 };
    case 'fall': return { anim: 'fall', idx: Math.min(3, Math.floor(f.t / 5)) };
    case 'down': return { anim: 'down', idx: f.t < 8 ? 0 : 1 };
    case 'ko': return { anim: 'ko', idx: 0 };
    case 'getup': return { anim: 'getup', idx: Math.min(3, Math.floor(f.t / 7)) };
    case 'win': return { anim: 'win', idx: cyc(t, 2, 30) };
    default: { const b = Math.sin(t / 22); return { anim: 'stance', idx: 0, sy: 1 + 0.012 * b, oy: 0 }; }
  }
}
// Lobo Solitário: every key pose is a crop of the user's character sheet (tools/build_lobo.py). In-between motion is
// tweened here (ease in/out offsets, squash & stretch, rotation arcs, cross-fade ghosts, afterimages) - no new art.
const easeO = x => 1 - (1 - x) * (1 - x), clamp01 = x => Math.max(0, Math.min(1, x));
function baseVisual(f) {
  const s = f.state, t = f.animT, st = f.t;
  if (s === 'attack' && f.move) {
    const m = f.move, fr = f.curFrame(), i = m.frames.indexOf(fr), p = clamp01((f.mt - f.frameStart(fr)) / fr.d);
    const ai = m.frames.findIndex(x => x.a || x.spawn), v = { anim: fr.anim || m.anim, idx: 0, ...(fr.v || {}) };
    if (m.air) return v;
    if (ai < 0 || i < ai) { v.ox = (v.ox || 0) - 7 * easeO(p); v.rot = -0.035 * p; v.sy = 1 - 0.03 * p; v.sx = 1 + 0.02 * p; }       // wind-up: pull back, coil
    else if (i === ai || fr.a) { const k = clamp01(p * 4); v.ox = (v.ox || 0) - 7 + 13 * easeO(k); v.sx = 1 + 0.05 * (1 - k); v.sy = 1 - 0.03 * (1 - k); } // snap forward
    else { v.ox = (v.ox || 0) + 6 * (1 - easeO(p)); v.sy = 1 - 0.015 * Math.sin(p * Math.PI); }                                  // recovery settles
    return v;
  }
  switch (s) {
    case 'walk': { const ph = t / 9; const n = Math.floor(ph) % 2; const dir = Math.sign(f.vx * f.facing) || 1;
      return { anim: 'walk', idx: n, oy: -Math.abs(Math.sin(ph * Math.PI)) * 4, rot: 0.03 * dir, sy: 1 + 0.015 * Math.cos(ph * Math.PI * 2) }; }
    case 'crouch': return { anim: 'crouch', idx: 0, sy: 1 + 0.012 * Math.sin(t / 16) };
    case 'jumpsq': return { anim: 'crouch', idx: 0, sy: 0.9, sx: 1.06 };
    case 'land': { const k = clamp01(st / 6); return { anim: 'crouch', idx: 0, sy: 0.86 + 0.14 * easeO(k), sx: 1.08 - 0.08 * k }; }
    case 'air': { const up = f.vy < 0, k = clamp01(Math.abs(f.vy) / 14);
      return { anim: 'jump', idx: 0, oy: -6, rot: Math.max(-0.14, Math.min(0.14, f.vy * 0.012)), sy: up ? 1 + 0.07 * k : 1 - 0.03 * (1 - k), sx: up ? 1 - 0.05 * k : 1 }; }
    case 'hit': { const k = easeO(clamp01(st / 9)); return { anim: 'hit', idx: 0, ox: -12 * (1 - k) - 2, rot: (f.heavyHit ? -0.14 : -0.06) * (1 - k), sx: 1 - 0.04 * (1 - k) }; }
    case 'block': return f.crouching ? { anim: 'cblock', idx: 0, ox: st < 6 ? -4 : -1 } : { anim: 'guard', idx: 0, ox: st < 6 ? -6 : -3, sx: st < 4 ? 0.97 : 1 };
    case 'fall': { if (st < 16) { const r = -0.12 - easeO(st / 16) * 1.25; return { anim: 'hit', idx: 0, rot: r, lie: true }; }
      return { anim: 'ko', idx: 0, oy: -8, rot: -0.12 }; }
    case 'down': { const b = st < 14 ? Math.abs(Math.sin(st / 14 * Math.PI)) * 10 * (1 - st / 14) : 0; return { anim: 'ko', idx: 0, oy: -b, sy: st < 4 ? 0.9 : 1, sx: st < 4 ? 1.06 : 1 }; }
    case 'ko': return { anim: 'ko', idx: 0, sy: 1 + 0.01 * Math.sin(t / 30) };
    case 'getup': { if (st < 10) { const k = st / 10; return { anim: 'crouch', idx: 0, sy: 0.55 + 0.4 * easeO(k), sx: 1.1 - 0.08 * k, rot: -0.25 * (1 - k), ox: -6 }; }
      if (st < 20) return { anim: 'crouch', idx: 0, sy: 0.95 + 0.05 * ((st - 10) / 10), ox: -3 };
      const k = clamp01((st - 20) / 8); return { anim: 'guard', idx: 0, sy: 0.94 + 0.06 * easeO(k), ox: -3 * (1 - k) }; }
    case 'win': return { anim: ['win1', 'win2', 'taunt'][(f.winPose || 0) % 3], idx: 0, sy: 1 + 0.012 * Math.sin(t / 20) };
    default: { const b = Math.sin(t / 18); return { anim: 'idle', idx: 0, sy: 1 + 0.016 * b, sx: 1 - 0.006 * b, oy: 0 }; }
  }
}
// Lobo v3: same tween rig, with the new sheet's own keys (2 idles, 2 walks, jump start / back / jump / land) and
// dog-less variants while the Yorkshire is away (Dog Throw) or the wolf is airborne.
const LOBO_NODOG = { idle: 'idleN', walk: 'walkN', guard: 'guardN', crouch: 'crouchN', cblock: 'crouchN', jumpsq: 'crouchN', land: 'crouchN', hit: 'hitw',
  jab: 'jpa', strong: 'jpa', fierce: 'jpa', hk: 'jka', lowk: 'jka', spin: 'throw', sweep: 'throw' };
function loboVisual(f) {
  const v = baseVisual(f), s = f.state, st = f.t, t = f.animT;
  if (s === 'idle' || (s !== 'attack' && v.anim === 'idle')) { v.idx = Math.floor(t / 34) % 2; }
  else if (s === 'walk') { const ph = t / 10; v.idx = Math.floor(ph) % 2; }
  else if (s === 'jumpsq') { v.anim = 'jumpsq'; v.sy = 0.96; v.sx = 1.03; }
  else if (s === 'land') { const k = clamp01(st / 6); v.anim = 'land'; v.sy = 0.94 + 0.06 * easeO(k); v.sx = 1.04 - 0.04 * k; }
  else if (s === 'air') v.anim = f.vx * f.facing < -0.5 ? 'jumpb' : 'jump';
  else if (s === 'fall' && v.anim === 'hit') v.anim = 'hitw';
  if (f.dogOut() && LOBO_NODOG[v.anim]) v.anim = LOBO_NODOG[v.anim];
  return v;
}
// G.O.: same tween rig as Lobo, plus the sheet's 3 idle and 3 walk frames and its own jump/land/guard keys.
function goVisual(f) {
  const s = f.state, t = f.animT, st = f.t;
  if (s === 'attack' && f.move) {
    const v = baseVisual(f), mvn = f.moveName;
    if (mvn === 'super1' || mvn === 'super2') { const fr = f.curFrame(); if (fr.spawn) { v.ox = 0; v.rot = 0; v.sx = 1; v.sy = 1 + 0.01 * Math.sin(t / 3); } }
    return v;
  }
  switch (s) {
    case 'idle': { const n = [0, 1, 2, 1][Math.floor(t / 14) % 4]; const b = Math.sin(t / 18); return { anim: 'idle', idx: n, sy: 1 + 0.01 * b }; }
    case 'walk': { const ph = t / 8, dir = Math.sign(f.vx * f.facing) || 1, n = Math.floor(ph) % 3; return { anim: 'walk', idx: dir > 0 ? n : 2 - n, oy: -Math.abs(Math.sin(ph * Math.PI)) * 3, rot: 0.02 * dir }; }
    case 'jumpsq': return { anim: 'jstart', idx: 0, sy: 0.96 };
    case 'land': { const k = clamp01(st / 6); return { anim: 'jstart', idx: 0, sy: 0.9 + 0.1 * easeO(k) }; }
    case 'air': { const up = f.vy < 0, k = clamp01(Math.abs(f.vy) / 14); return { anim: up ? 'jump' : 'jland', idx: 0, oy: -6, rot: Math.max(-0.1, Math.min(0.1, f.vy * 0.008)), sy: up ? 1 + 0.05 * k : 1 }; }
    case 'hit': { const k = easeO(clamp01(st / 9)); return { anim: 'hit', idx: f.heavyHit ? 1 : 0, ox: -12 * (1 - k) - 2, rot: (f.heavyHit ? -0.1 : -0.04) * (1 - k) }; }
    case 'block': return f.crouching ? { anim: 'cguard', idx: 0, ox: st < 6 ? -4 : -1 } : { anim: 'guard', idx: 0, ox: st < 6 ? -6 : -3, sx: st < 4 ? 0.97 : 1 };
    case 'fall': { if (st < 16) { const r = -0.12 - easeO(st / 16) * 1.25; return { anim: 'hit', idx: 1, rot: r, lie: true }; } return { anim: 'ko', idx: 0, oy: -8, rot: -0.12 }; }
    case 'getup': { if (st < 12) { const k = st / 12; return { anim: 'crouch', idx: 0, sy: 0.6 + 0.4 * easeO(k), rot: -0.2 * (1 - k), ox: -6 }; }
      if (st < 20) return { anim: 'hunch', idx: 0, ox: -3 }; const k = clamp01((st - 20) / 8); return { anim: 'guard', idx: 0, sy: 0.95 + 0.05 * easeO(k) }; }
    case 'crouch': return { anim: 'crouch', idx: 0, sy: 1 + 0.01 * Math.sin(t / 16) };
    default: return baseVisual(f);
  }
}
function drawPup(ctx, f, G) {
  const p = f.pup; if (!p || p.hide) return;
  const idx = p.moving ? [0, 2][cyc(p.t, 2, 5)] : 2, oy = p.moving ? -Math.abs(Math.sin(p.t / 5 * Math.PI)) * 6 : 0;
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, FLOOR + 2, 26, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  drawFrame(ctx, { id: 'lobo', x: p.x, y: FLOOR, facing: p.face, tinted: false }, 'pupIdle', idx, { oy, sy: p.moving ? 1 : 1 + 0.02 * Math.sin(p.t / 14) });
}
function drawFighter(ctx, f, G) {
  if (!Sprites.ready) return;
  const v = f.id === 'mukira' ? mukiraVisual(f) : f.id === 'lobo' ? loboVisual(f) : f.id === 'go' ? goVisual(f) : jogadorVisual(f);
  if (v.lie) { const m = Sprites[f.id].meta[v.anim][0]; const k = Math.min(1, Math.abs(v.rot) / 1.5); v.oy = (v.oy || 0) - k * m.ax * 0.62; v.ox = (v.ox || 0) + k * m.h * 0.5; }
  // shadow
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; const sw = 54 * (1 - (FLOOR - f.y) / 400);
  ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 2, Math.max(16, sw), 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (f.c.rich) {
    // cross-fade ghost of the previous key pose for a few frames = cheap in-between
    if (f.lastV && (f.lastV.anim !== v.anim || ((f.id === 'go' || f.id === 'lobo') && f.lastV.idx !== v.idx))) f.trans = { v: f.lastV, t: 0 };
    f.lastV = v;
    const mvn = f.state === 'attack' ? f.moveName : '';
    const fast = (mvn === 'rush' || mvn === 'dash' || (/^super/.test(mvn) && f.id === 'lobo')) && f.curFrame() && f.curFrame().a;
    if (fast || (f.state === 'fall')) { if (G.frame % 2 === 0) f.trail.push({ x: f.x, y: f.y, v }); if (f.trail.length > 5) f.trail.shift(); } else if (f.trail.length) f.trail.shift();
    if (f.id === 'lobo') drawLoboAura(ctx, f, G, v, mvn);
    if (f.id === 'go') drawGoAura(ctx, f, G, v, mvn);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    f.trail.forEach((tr, i) => drawFrame(ctx, { ...f, x: tr.x, y: tr.y }, tr.v.anim, tr.v.idx, { ...tr.v, alpha: 0.10 + i * 0.05 }));
    ctx.restore();
    if (f.trans && f.trans.t < 4 && !(f.inv > 0 && (G.frame & 2))) { drawFrame(ctx, f, f.trans.v.anim, f.trans.v.idx, { ...f.trans.v, alpha: 0.42 * (1 - f.trans.t / 4) }); f.trans.t++; }
  }
  if (f.inv > 0 && (G.frame & 2)) { if (f.id === 'lobo') drawPup(ctx, f, G); return; }
  drawFrame(ctx, f, v.anim, v.idx, v);
  if (f.id === 'lobo') drawPup(ctx, f, G);
  if (f.flash > 0) drawFrame(ctx, f, v.anim, v.idx, { ...v, white: true, alpha: Math.min(0.5, f.flash / 8) });
  // move effects (honest approximations for frames the art does not have)
  if (f.state === 'attack' && f.move && f.move.fx) { const fr = f.curFrame(); if (fr.a) drawSwoosh(ctx, f, f.move.fx, f.move.hit); }
}
// Lobo light layers: the sheet's own blue effects (cut as glow-only sprites), drawn additive behind the body
function drawLoboAura(ctx, f, G, v, mvn) {
  const m = f.move, fr = f.curFrame && f.curFrame(); if (!m || !m.fx2 || !fr || !fr.a) return;
  const k = clamp01((f.mt - f.frameStart(fr)) / 4);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const o = { id: 'lobo', x: f.x, y: f.y, facing: f.facing, tinted: false };
  if (m.fx2 === 'rushhead') drawFrame(ctx, o, 'rushhead', 0, { ox: 60, oy: -6, alpha: 0.9 * k, sx: 0.9 + 0.1 * k, sy: 0.9 + 0.1 * k });
  else if (m.fx2 === 'sweepfx') drawFrame(ctx, o, 'sweepfx', 0, { ox: 120, oy: 0, alpha: 0.9 * k });
  else drawFrame(ctx, o, m.fx2, 0, { ...v, alpha: 0.85 * k, rot: (v.rot || 0) + Math.sin(G.frame / 3) * 0.03 });
  ctx.restore();
}
// G.O. light layers (additive, cut from the sheet's own effect art)
function drawGoAura(ctx, f, G, v, mvn) {
  const fx = (anim, o) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawFrame(ctx, { id: 'go', x: f.x, y: f.y, facing: f.facing, tinted: f.tinted }, anim, 0, o); ctx.restore(); };
  if (v.anim === 'super1n' || v.anim === 'super2n')
    fx(v.anim.replace('n', 'a'), { ...v, alpha: Math.min(1, (f.t + f.mt) / 8) * (0.85 + 0.15 * Math.sin(G.frame / 2)) });
  if (mvn === 'dash' && f.curFrame() && f.curFrame().a) fx('streak', { ox: -150, oy: -40, alpha: 0.9 });
}
function drawSwoosh(ctx, f, kind, h) {
  const b = f.worldBox(h); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, w = (b.x1 - b.x0) / 2;
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.8 - i * 0.25; ctx.beginPath();
    if (kind === 'sweep') ctx.ellipse(cx, cy + 6, w, 10 + i * 3, 0, f.facing > 0 ? -0.3 : Math.PI - 2.6, f.facing > 0 ? 2.6 : Math.PI + 0.3);
    else if (kind === 'jab') { ctx.moveTo(cx - w * f.facing, cy - 6 + i * 6); ctx.lineTo(cx + w * f.facing, cy - 6 + i * 6); }
    else ctx.arc(cx - 30 * f.facing, cy + 10, w + 10 - i * 8, f.facing > 0 ? -1.2 : Math.PI - 0.4, f.facing > 0 ? 0.4 : Math.PI + 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- CPU AI ----------
const DIFF = {
  facil: { react: 26, block: 0.15, aggro: 0.25, special: 0.2, anti: 0.1, label: 'Fácil' },
  normal: { react: 14, block: 0.5, aggro: 0.45, special: 0.45, anti: 0.4, label: 'Normal' },
  dificil: { react: 6, block: 0.85, aggro: 0.65, special: 0.7, anti: 0.8, label: 'Difícil' },
};
class CPU {
  constructor(me, level) { this.me = me; this.L = DIFF[level] || DIFF.normal; this.plan = null; this.hold = 0; this.wait = 0; this.out = {}; this.blockT = 0; }
  think(opp, G) {
    const me = this.me, L = this.L, o = {};
    const fwd = me.facing > 0 ? 'right' : 'left', back = me.facing > 0 ? 'left' : 'right';
    const dist = Math.abs(opp.x - me.x);
    const smog = G.smogOn(me) ? 18 : 0;
    // defend: opponent attacking or projectile incoming
    const threat = (opp.state === 'attack' && dist < 230) || G.projectiles.some(p => p.owner !== me && Math.abs(p.x - me.x) < 260 && Math.sign(me.x - p.x) === Math.sign(p.vx));
    if (threat && this.blockT <= 0 && Math.random() < L.block * (smog ? 0.5 : 1) / 6) { this.blockT = 14 + Math.floor(Math.random() * 10); this.blockLow = opp.state === 'attack' && opp.move && opp.move.hit && opp.move.hit.lvl === 'low'; }
    if (this.blockT > 0 && (me.canAct() || me.state === 'block')) { this.blockT--; o[back] = true; if (this.blockLow) o.down = true; this.out = o; return o; }
    if (this.wait > 0) { this.wait--; this.out = this.keep || {}; if (this.hold-- <= 0) this.keep = {}; return this.out; }
    if (!me.canAct()) { this.out = {}; return {}; }
    const L2 = L, r = Math.random();
    this.wait = L2.react + smog + Math.floor(Math.random() * L2.react);
    this.hold = 0;
    // anti-air
    if (opp.air && dist < 170 && r < L.anti) { this.press(o, 'punch'); return this.fin(o); }
    const reach = me.id === 'mukira' ? 175 : 100;
    if (me.id === 'lobo') {
      const own = G.projectiles.some(p => p.owner === me);
      if (me.meter >= 200 && dist < 330 && Math.random() < L.special * 0.6) { o.special = true; o.kick = true; return this.fin(o); }
      if (me.meter >= 100 && dist < 200 && Math.random() < L.special * 0.5) { o.special = true; o.punch = true; return this.fin(o); }
      if (dist > 260 && me.cool === 0 && !own && Math.random() < L.special) { o.special = true; if (Math.random() < 0.4) o[back] = true; return this.fin(o); }
      if (dist > 150 && dist < 300 && Math.random() < L.special * 0.35) { o.special = true; o[fwd] = true; return this.fin(o); }
      if (dist < 200 && dist > 90 && Math.random() < L.special * 0.3) { o.special = true; o.down = true; return this.fin(o); }
      if (dist < 140 && Math.random() < L.aggro * 0.2) { o.punch = true; o.kick = true; return this.fin(o); }
    }
    if (me.id === 'go') {
      const own = G.projectiles.some(p => p.owner === me && p.P && p.P.cooldown);
      if (me.meter >= 200 && dist < 420 && Math.random() < L.special * 0.6) { o.special = true; o.kick = true; return this.fin(o); }
      if (me.meter >= 100 && Math.random() < L.special * 0.5) { o.special = true; o.punch = true; return this.fin(o); }
      if (dist < 105 && Math.random() < L.special * 0.35) { o.special = true; o.down = true; o[fwd] = true; return this.fin(o); }
      if (dist > 240 && me.cool === 0 && !own && Math.random() < L.special) { o.special = true; const r2 = Math.random(); if (r2 < 0.3) o[back] = true; else if (r2 < 0.55) o.down = true; return this.fin(o); }
      if (dist > 150 && dist < 320 && Math.random() < L.special * 0.3) { o.special = true; o[fwd] = true; return this.fin(o); }
      if (dist < 200 && !me.randCool && Math.random() < L.special * 0.12) { o.punch = true; o.kick = true; return this.fin(o); }
    }
    if (dist > 250 && me.id === 'jogador' && me.cool === 0 && !G.projectiles.length && Math.random() < L.special) { this.press(o, 'special'); return this.fin(o); }
    if (dist < reach + 10 && dist > 120 && me.id === 'mukira' && Math.random() < L.special) { this.press(o, 'special'); return this.fin(o); }
    if (dist < 125) {
      const a = Math.random();
      if (a < L.aggro) { const pick = Math.random(); if (pick < 0.35) this.press(o, 'punch'); else if (pick < 0.65) this.press(o, 'kick'); else if (pick < 0.85) { o.down = true; this.press(o, Math.random() < 0.5 ? 'kick' : 'punch'); } else { o[fwd] = true; this.press(o, 'punch'); } return this.fin(o); }
      if (a < L.aggro + 0.2) { o[back] = true; this.keep = { [back]: true }; this.hold = 10; return this.fin(o); }
      if (a < L.aggro + 0.28) { o.up = true; o[fwd] = true; this.keep = {}; return this.fin(o); }
      return this.fin(o);
    }
    // approach (sometimes jump in)
    if (Math.random() < 0.08 * (1 + L.aggro)) { o.up = true; o[fwd] = true; this.keep = { kick: false }; this.jumpKick = true; return this.fin(o); }
    o[fwd] = true; this.keep = { [fwd]: true }; this.hold = 20; this.wait = Math.min(this.wait, 12); return this.fin(o);
  }
  press(o, k) { o[k] = true; }
  fin(o) { this.out = o; return o; }
  read(opp, G) {
    const me = this.me; let o = this.think(opp, G);
    // jump-in attack
    if (me.state === 'air' && !me.airAtk && this.jumpKick && Math.abs(opp.x - me.x) < 150 && me.vy > -4) { o = { kick: true }; this.jumpKick = false; }
    // edge-trigger safety: buttons pressed only for one frame from think()
    return { up: !!o.up, down: !!o.down, left: !!o.left, right: !!o.right, punch: !!o.punch, kick: !!o.kick, special: !!o.special, super: false };
  }
}
