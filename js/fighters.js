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
      lk: mv({ anim: 'stance', fx: 'kick', frames: [{ f: 0, d: 4, pose: 'kickPrep' }, { f: 0, d: 5, a: 1, pose: 'kick' }, { f: 0, d: 10, pose: 'kickPrep' }], hit: { x0: 40, x1: 138, y0: -125, y1: -70, dmg: 65, stun: 16, bstun: 11, push: 7 }, sfx: 'whoosh' }),
      cp: mv({ anim: 'stance', crouch: 1, frames: [{ f: 0, d: 3, pose: 'crouch' }, { f: 0, d: 4, a: 1, pose: 'crouchRing' }, { f: 0, d: 7, pose: 'crouch' }], hit: { x0: 25, x1: 85, y0: -128, y1: -92, dmg: 40, stun: 13, bstun: 9, push: 5 }, sfx: 'whoosh' }),
      ck: mv({ anim: 'stance', crouch: 1, fx: 'sweep', frames: [{ f: 0, d: 5, pose: 'crouch' }, { f: 0, d: 5, a: 1, pose: 'crouchKick' }, { f: 0, d: 12, pose: 'crouch' }], hit: { x0: 35, x1: 140, y0: -36, y1: 0, dmg: 50, stun: 15, bstun: 11, push: 6, lvl: 'low' }, sfx: 'whoosh' }),
      jp: mv({ anim: 'stance', air: 1, frames: [{ f: 0, d: 3, pose: 'jump' }, { f: 0, d: 30, a: 1, pose: 'jumpRing' }], hit: { x0: 20, x1: 85, y0: -175, y1: -115, dmg: 55, stun: 16, bstun: 10, push: 4, lvl: 'high' }, sfx: 'whoosh' }),
      jk: mv({ anim: 'stance', air: 1, fx: 'kick', frames: [{ f: 0, d: 4, pose: 'jump' }, { f: 0, d: 30, a: 1, pose: 'jumpKick' }], hit: { x0: 35, x1: 135, y0: -120, y1: -50, dmg: 65, stun: 17, bstun: 11, push: 5, lvl: 'high' }, sfx: 'whoosh' }),
      ring: mv({ anim: 'stance', special: 1, frames: [{ f: 0, d: 9, pose: 'windup' }, { f: 0, d: 18, pose: 'ring', spawn: 1 }, { f: 0, d: 10 }], hit: null }),
    },
    proj: { speed: 6.5, dmg: 80, stun: 22, bstun: 14, push: 9, chip: 10, cooldown: 110 },
  },
};

// ---------- sprite assets ----------
const Sprites = { ready: false };
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src)); i.src = src; }); }
async function loadSprites() {
  for (const id of ['mukira', 'jogador']) {
    const [img, meta] = await Promise.all([loadImage(`assets/${id}/atlas.png`), fetch(`assets/${id}/atlas.json`).then(r => r.json())]);
    Sprites[id] = { img, meta: meta.anims, tint: makeVariant(img, id, 'tint'), white: makeVariant(img, id, 'white') };
  }
  Sprites.ready = true;
}
function makeVariant(img, id, kind) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
  g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue; const r = p[i], gg = p[i + 1], b = p[i + 2];
    if (kind === 'white') { p[i] = p[i + 1] = p[i + 2] = 255; continue; }
    if (id === 'mukira') { if (b > r + 25 && b > gg) { p[i] = b; p[i + 2] = Math.round(r * 0.6); p[i + 1] = Math.round(gg * 0.75); } }
    else { if (r > 90 && r > gg * 2.2 && r > b * 2.2) { p[i] = Math.round(gg * 0.5); p[i + 1] = r; p[i + 2] = Math.round(b * 0.8 + 20); }
      else if (b > 35 && b > r + 10 && b > gg) { p[i] = Math.min(255, r + 30); p[i + 1] = Math.round(gg * 0.8); p[i + 2] = Math.round(b * 0.6); } }
  }
  g.putImageData(d, 0, 0); return c;
}

// ---------- Fighter ----------
class Fighter {
  constructor(charId, side, tinted) {
    this.c = CHARS[charId]; this.id = charId; this.side = side; this.tinted = tinted;
    this.reset(side);
  }
  reset(side) {
    this.x = side === 0 ? 300 : 660; this.y = FLOOR; this.vx = 0; this.vy = 0; this.facing = side === 0 ? 1 : -1;
    this.hp = this.c.hp; this.state = 'idle'; this.t = 0; this.move = null; this.mt = 0; this.hitDone = false; this.stun = 0;
    this.crouching = false; this.cool = 0; this.flash = 0; this.dirHist = []; this.prev = {}; this.inv = 0; this.pushV = 0; this.combo = 0; this.animT = 0;
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
    const press = {}; for (const k of ['punch', 'kick', 'special', 'up']) press[k] = inp[k] && !this.prev[k]; this.prev = { ...inp };
    const d = this.dirNum(inp); this.dirHist.push(d); if (this.dirHist.length > 20) this.dirHist.shift();
    this.t++; this.animT++; if (this.cool > 0) this.cool--; if (this.flash > 0) this.flash--; if (this.inv > 0) this.inv--;
    const st = this.state;
    if (st === 'ko' || st === 'win' || st === 'timeup') { this.physics(G); return; }
    if (G.frozenInput) { // intro / round end: just idle and face
      if (st === 'idle' || st === 'walk' || st === 'crouch') { if (st !== 'idle') this.setState('idle'); this.vx = 0; this.crouching = false; if (!this.air) this.facing = opp.x >= this.x ? 1 : -1; }
      else if (st === 'attack') this.tickMove(opp, G);
      else if (st === 'hit' || st === 'block') { this.stun--; if (this.stun <= 0) this.setState('idle'); }
      else if (st === 'down') { if (this.t > 38) this.setState('getup'); }
      else if (st === 'getup') { if (this.t > 16) this.setState('idle'); }
      else if (st === 'land' || st === 'jumpsq') { if (this.t > 4) this.setState(st === 'jumpsq' ? 'idle' : 'idle'); }
      this.physics(G); return;
    }
    // turn to face opponent when grounded and free
    if (this.canAct()) this.facing = opp.x >= this.x ? 1 : -1;
    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': {
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
      case 'attack': this.tickMove(opp, G); break;
      case 'hit': case 'block': this.stun--; if (this.stun <= 0) this.setState(this.crouching && d <= 3 ? 'crouch' : 'idle'); break;
      case 'down': if (this.t > 38) { this.setState('getup'); } break;
      case 'getup': if (this.t > 16) { this.inv = 8; this.setState('idle'); } break;
      case 'land': if (this.t > 4) this.setState('idle'); break;
    }
    this.physics(G);
  }
  recentMotion() { const h = this.dirHist.slice(-14); const i2 = h.lastIndexOf(2); return i2 >= 0 && h.slice(i2).some(v => v === 3) && (h[h.length - 1] === 6 || h[h.length - 1] === 3); }
  trySpecial(G) {
    if (this.c.special === 'ring') { if (this.cool > 0 || G.projectiles.some(p => p.owner === this)) return false; this.startMove('ring', G); return true; }
    this.startMove('whip', G); return true;
  }
  tickMove(opp, G) {
    const fr = this.curFrame(), m = this.move;
    const startOf = this.frameStart(fr);
    if (this.mt === startOf) { if (fr.sfx) SFX.play(fr.sfx); if (fr.spawn) this.spawnRing(G); }
    if (fr.a && !this.hitDone) G.checkHit(this, opp, fr.hb ? { ...m.hit, ...fr.hb } : m.hit);
    this.mt++;
    if (m.air) { if (!this.air) { this.move = null; this.setState('land'); } return; }
    if (this.mt >= m.total) { this.move = null; this.setState(m.crouch ? 'crouch' : 'idle'); }
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
  kickPrep: () => ({ anim: 'stance', idx: 0, rot: -0.08, ox: -4 }),
  kick: () => ({ anim: 'stance', idx: 0, rot: -0.16, ox: 6, sx: 1.04 }),
  crouch: () => ({ anim: 'stance', idx: 0, sy: 0.74, sx: 1.08 }),
  crouchRing: () => ({ anim: 'ring', idx: 0, sy: 0.74, sx: 1.06, ox: 6 }),
  crouchKick: () => ({ anim: 'stance', idx: 0, sy: 0.72, sx: 1.12, rot: -0.1, ox: 6 }),
  jump: () => ({ anim: 'stance', idx: 0, sy: 0.88, rot: 0.12, oy: -10 }),
  jumpRing: () => ({ anim: 'ring', idx: 0, sy: 0.92, rot: 0.08, oy: -10 }),
  jumpKick: () => ({ anim: 'stance', idx: 0, sy: 0.86, rot: -0.3, oy: -16, ox: 6 }),
};
function jogadorVisual(f) {
  const s = f.state, t = f.animT;
  if (s === 'attack' && f.move) { const fr = f.curFrame(); return JPOSE[fr.pose || (f.move.crouch ? 'crouch' : f.move.air ? 'jump' : 'stance')](); }
  switch (s) {
    case 'walk': { const ph = t / 9; return { anim: 'stance', idx: 0, oy: -Math.abs(Math.sin(ph * Math.PI / 2)) * 5, rot: 0.035 * Math.sign(f.vx * f.facing), sx: 1 + 0.02 * Math.sin(ph * Math.PI), sy: 1 - 0.015 * Math.sin(ph * Math.PI) }; }
    case 'crouch': return JPOSE.crouch();
    case 'jumpsq': case 'land': return { anim: 'stance', idx: 0, sy: 0.88, sx: 1.05 };
    case 'air': return { anim: 'stance', idx: 0, sy: f.vy < 0 ? 0.9 : 0.94, rot: f.vy < 0 ? 0.1 : 0.04, oy: -8 };
    case 'hit': return { anim: 'stance', idx: 0, rot: -0.2 * Math.max(0, 1 - f.t / 18), ox: -8 };
    case 'block': return f.crouching ? { anim: 'stance', idx: 0, sy: 0.74, sx: 1.04, rot: -0.04 } : { anim: 'stance', idx: 0, rot: -0.07, sx: 0.96, ox: -4 };
    case 'fall': return { anim: 'stance', idx: 0, rot: -Math.min(1.45, 0.3 + f.t * 0.08), oy: 0, lie: 1 };
    case 'down': case 'ko': return { anim: 'stance', idx: 0, rot: -1.5, lie: 1 };
    case 'getup': return { anim: 'stance', idx: 0, sy: 0.75, sx: 1.06 };
    case 'win': return { anim: 'front', idx: 0 };
    default: { const b = Math.sin(t / 22); return { anim: 'stance', idx: 0, sy: 1 + 0.012 * b, oy: 0 }; }
  }
}
function drawFighter(ctx, f, G) {
  if (!Sprites.ready) return;
  const v = f.id === 'mukira' ? mukiraVisual(f) : jogadorVisual(f);
  if (v.lie) { const m = Sprites[f.id].meta[v.anim][0]; const k = Math.min(1, Math.abs(v.rot) / 1.5); v.oy = (v.oy || 0) - k * m.ax * 0.62; v.ox = (v.ox || 0) + k * m.h * 0.5; }
  // shadow
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; const sw = 54 * (1 - (FLOOR - f.y) / 400);
  ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 2, Math.max(16, sw), 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (f.inv > 0 && (G.frame & 2)) return;
  drawFrame(ctx, f, v.anim, v.idx, v);
  if (f.flash > 0) drawFrame(ctx, f, v.anim, v.idx, { ...v, white: true, alpha: Math.min(0.5, f.flash / 8) });
  // move effects (honest approximations for frames the art does not have)
  if (f.state === 'attack' && f.move && f.move.fx) { const fr = f.curFrame(); if (fr.a) drawSwoosh(ctx, f, f.move.fx, f.move.hit); }
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
    return { up: !!o.up, down: !!o.down, left: !!o.left, right: !!o.right, punch: !!o.punch, kick: !!o.kick, special: !!o.special };
  }
}
