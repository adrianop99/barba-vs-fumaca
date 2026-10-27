'use strict';
const GAME_TITLE = 'Barba vs Fumaça';
const VERSION = 'v0.3';
const VW = 960, VH = 540;
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const qs = new URLSearchParams(location.search);

const G = {
  scene: 'loading', frame: 0, speed: 1, showBoxes: qs.has('debug'), paused: false,
  mode: 'cpu', diff: localStorage.getItem('bvf_diff') || 'normal', pick: ['mukira', 'jogador'], selStep: 0, selCur: [0, 1],
  fighters: [], projectiles: [], particles: [], sparks: [], smog: [], cpu: null,
  round: 1, wins: [0, 0], timer: 99, tick: 0, rstate: 'intro', rt: 0, hitstop: 0, shake: 0, banner: null, winner: -1,
  menuSel: 0, buttons: [], forced: [null, null], errors: [], comboText: [null, null], lastResult: null,
};
window.__game = G;

// ---------- canvas sizing ----------
function resize() {
  const W = window.innerWidth, H = window.innerHeight;
  const sc = Math.min(W / VW, H / VH);
  const cw = Math.floor(VW * sc), ch = Math.floor(VH * sc);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  ctx.setTransform(canvas.width / VW, 0, 0, canvas.height / VH, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

// ---------- UI helpers ----------
function txt(s, x, y, size, color = '#fff', align = 'center', weight = '800', stroke = 4) {
  ctx.save(); ctx.font = `${weight} ${size}px "Trebuchet MS", "Arial Black", system-ui, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
function bigText(s, y, size = 84, c1 = '#ffe14d', c2 = '#ff4b1f') {
  ctx.save(); ctx.font = `italic 900 ${size}px "Arial Black", Impact, "Trebuchet MS", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gr = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, VW / 2, y);
  ctx.fillStyle = gr; ctx.fillText(s, VW / 2, y); ctx.restore();
}
function button(id, label, x, y, w, h, sel, sub) {
  G.buttons.push({ id, x, y, w, h });
  ctx.save(); ctx.fillStyle = sel ? 'rgba(255,200,40,0.95)' : 'rgba(20,14,40,0.85)'; ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 12) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
  txt(label, x + w / 2, y + h / 2 - (sub ? 9 : 0), 26, sel ? '#1a0f00' : '#fff', 'center', '800', sel ? 0 : 3);
  if (sub) txt(sub, x + w / 2, y + h / 2 + 16, 14, sel ? '#3a2400' : '#cbbfff', 'center', '600', 0);
}
function menu(list, x0, y0, w = 320, h = 62, gap = 14) {
  G.menuSel = Math.max(0, Math.min(list.length - 1, G.menuSel));
  list.forEach((b, i) => button(b.id, b.label, x0, y0 + i * (h + gap), w, h, i === G.menuSel, b.sub));
  G.menuList = list;
}
function dimBg() { Stage.draw(ctx, G.frame); ctx.fillStyle = 'rgba(8,4,20,0.62)'; ctx.fillRect(0, 0, VW, VH); }

// ---------- pointer on canvas ----------
canvas.addEventListener('pointerdown', e => {
  SFX.init(); maybeFullscreen();
  const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
  if (e.pointerType === 'touch') Input.touchUsed = true;
  for (const b of G.buttons) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { activate(b.id); return; }
  if (G.scene === 'title') activate('start');
});
let fsTried = false;
function maybeFullscreen() {
  if (fsTried || !Input.isTouchDevice()) return; fsTried = true;
  const el = document.documentElement; const rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq) { try { const p = rq.call(el); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {} }
}
window.addEventListener('keydown', () => SFX.init(), { once: true });

// ---------- scenes ----------
function go(scene) { G.scene = scene; G.menuSel = 0; G.buttons = []; Input.clearMenu(); updateOverlay(); }
function activate(id) {
  SFX.play('select');
  switch (id) {
    case 'start': go('mode'); break;
    case 'cpu': G.mode = 'cpu'; go('diff'); G.menuSel = ['facil', 'normal', 'dificil'].indexOf(G.diff); break;
    case 'pvp': G.mode = 'pvp'; startSelect(); break;
    case 'facil': case 'normal': case 'dificil': G.diff = id; localStorage.setItem('bvf_diff', id); startSelect(); break;
    case 'card0': case 'card1': case 'card2': selectCard(+id.slice(4)); break;
    case 'back': back(); break;
    case 'resume': G.paused = false; updateOverlay(); break;
    case 'restart': G.paused = false; startMatch(); break;
    case 'home': G.paused = false; go('title'); break;
    case 'rematch': startMatch(); break;
    case 'chars': startSelect(); break;
  }
}
function back() {
  if (G.scene === 'mode') go('title'); else if (G.scene === 'diff') go('mode');
  else if (G.scene === 'select') { if (G.selStep === 1) { G.selStep = 0; } else go(G.mode === 'cpu' ? 'diff' : 'mode'); }
}
function startSelect() { go('select'); G.selStep = 0; G.selCur = [CHAR_IDS.indexOf(G.pick[0]), CHAR_IDS.indexOf(G.pick[1])]; }
const CHAR_IDS = ['mukira', 'jogador', 'lobo'];
function selectCard(i) {
  if (G.selStep === 0) { G.pick[0] = CHAR_IDS[i]; G.selCur[0] = i; G.selStep = 1; }
  else { G.pick[1] = CHAR_IDS[i]; G.selCur[1] = i; startMatch(); }
}

// ---------- match / rounds ----------
function startMatch() {
  G.wins = [0, 0]; G.round = 1; G.winner = -1;
  const mirror = G.pick[0] === G.pick[1];
  G.fighters = [new Fighter(G.pick[0], 0, false), new Fighter(G.pick[1], 1, mirror)];
  G.cpu = G.mode === 'cpu' ? new CPU(G.fighters[1], G.diff) : null;
  go('fight'); startRound();
}
function startRound() {
  G.fighters.forEach((f, i) => f.reset(i)); G.projectiles = []; G.smog = []; G.sparks = []; G.particles = [];
  G.timer = 99; G.tick = 0; G.rstate = 'intro'; G.rt = 0; G.hitstop = 0; G.koSlow = 0;
  G.banner = { text: G.round >= 3 && G.wins[0] === 1 && G.wins[1] === 1 ? 'ROUND FINAL' : 'ROUND ' + G.round, t: 0 };
  SFX.play('bell');
}
function endRound(winner, reason) {
  if (G.rstate !== 'fight') return;
  G.rstate = 'ko'; G.rt = 0; G.roundWinner = winner; G.roundReason = reason;
  if (reason === 'ko') { G.banner = { text: 'K.O.', t: 0, big: 1 }; SFX.play('ko'); G.koSlow = 50; }
  else G.banner = { text: 'TEMPO!', t: 0 };
}
function updateFight() {
  const [a, b] = G.fighters; G.rt++;
  G.frozenInput = G.rstate !== 'fight';
  if (G.rstate === 'intro') {
    if (G.rt === 70) { G.banner = { text: 'LUTE!', t: 0, big: 1 }; SFX.play('bell'); }
    if (G.rt >= 110) { G.rstate = 'fight'; G.banner = null; }
  }
  if (G.hitstop > 0) { G.hitstop--; updateEffects(); return; }
  if (G.koSlow > 0) { G.koSlow--; if (G.koSlow % 2) { updateEffects(); return; } }
  // inputs
  const i0 = readInput(0, a, b), i1 = readInput(1, b, a);
  a.update(i0, b, G); b.update(i1, a, G);
  pushApart(a, b);
  updateProjectiles();
  updateEffects();
  // jogador cigarette smoke
  for (const f of G.fighters) if (f.id === 'jogador' && G.frame % 7 === 0 && !['fall', 'down', 'ko'].includes(f.state)) emitCigSmoke(f);
  if (G.rstate === 'fight') {
    if (++G.tick % 60 === 0 && G.timer > 0) { G.timer--; if (G.timer === 0) { const w = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1; endRound(w, 'time'); } }
    if (a.hp <= 0 || b.hp <= 0) endRound(a.hp <= 0 && b.hp <= 0 ? -1 : a.hp <= 0 ? 1 : 0, 'ko');
  } else if (G.rstate === 'ko') {
    const w = G.roundWinner;
    const settled = G.fighters.every(f => !f.air && !['hit', 'block', 'attack', 'fall'].includes(f.state));
    if ((G.rt > 90 && settled) || G.rt > 240) {
      if (w >= 0) { G.wins[w]++; G.fighters[w].setState('win'); G.fighters[w].winPose = G.round - 1; }
      else { G.wins[0]++; G.wins[1]++; }
      if (G.roundReason === 'time') G.fighters.forEach((f, i) => { if (i !== w) f.setState('timeup'); });
      G.rstate = 'end'; G.rt = 0;
      const champ = G.wins[0] >= 2 && G.wins[1] >= 2 ? -2 : G.wins[0] >= 2 ? 0 : G.wins[1] >= 2 ? 1 : -1;
      G.matchOver = champ !== -1; G.winner = champ;
      G.banner = w >= 0 ? { text: 'VITÓRIA', t: 0, sub: G.fighters[w].c.name + (G.matchOver ? ' VENCE A LUTA!' : ' VENCE O ROUND') } : { text: 'EMPATE', t: 0 };
    }
  } else if (G.rstate === 'end') {
    if (G.rt > 150) {
      if (G.matchOver) { G.lastResult = { winner: G.winner, wins: [...G.wins] }; go('result'); }
      else { G.round++; startRound(); }
    }
  }
}
function readInput(i, me, opp) {
  let inp;
  if (i === 1 && G.cpu) inp = G.cpu.read(opp, G);
  else inp = Input.read(i === 0 ? 'p1' : 'p2', i === 0 && G.mode === 'cpu');
  const f = G.forced[i]; if (f) inp = { ...inp, ...f };
  return inp;
}
function pushApart(a, b) {
  const dead = s => s === 'down' || s === 'ko';
  if (!dead(a.state) && !dead(b.state)) {
    const top = f => f.y - (f.crouching ? f.c.crouchH : f.c.standH) + 50;
    const vert = !(a.y < top(b) || b.y < top(a));
    const dx = b.x - a.x, minD = 64;
    if (vert && Math.abs(dx) < minD) {
      const ov = (minD - Math.abs(dx)) / 2, s = dx === 0 ? (a.facing > 0 ? 1 : -1) : Math.sign(dx);
      a.x -= ov * s; b.x += ov * s;
    }
  }
  for (const f of [a, b]) f.x = Math.max(WALL_L, Math.min(WALL_R, f.x));
  // if one pinned at wall and overlapping, move the other
  const dx = b.x - a.x;
  if (Math.abs(dx) < 64 && !a.air && !b.air && !dead(a.state) && !dead(b.state)) {
    if (a.x <= WALL_L + 0.1) b.x = a.x + 64; else if (a.x >= WALL_R - 0.1) b.x = a.x - 64;
    else if (b.x <= WALL_L + 0.1) a.x = b.x + 64; else if (b.x >= WALL_R - 0.1) a.x = b.x - 64;
  }
}
function overlap(p, q) { return p && q && p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0; }
G.checkHit = function (att, def, hit) {
  if (!hit || def.inv > 0 || ['fall', 'down', 'ko', 'getup'].includes(def.state)) return;
  const hb = att.worldBox(hit), hu = def.hurtbox(), lb = def.limbBox();
  if (!(overlap(hb, hu) || overlap(hb, lb))) return;
  att.hitDone = true;
  const cx = (Math.max(hb.x0, hu ? hu.x0 : hb.x0) + Math.min(hb.x1, hu ? hu.x1 : hb.x1)) / 2, cy = (hb.y0 + hb.y1) / 2;
  applyHit(att, def, hit, cx, cy, Math.sign(def.x - att.x) || att.facing);
};
function applyHit(att, def, hit, cx, cy, dir, isProj) {
  const lvl = hit.lvl || 'mid';
  if (!hit.nomtr) { const blk = def.isBlocking(att, lvl); att.meter = Math.min(200, att.meter + hit.dmg * (blk ? 0.05 : 0.14)); def.meter = Math.min(200, def.meter + hit.dmg * 0.07); }
  if (def.isBlocking(att, lvl)) {
    def.setState('block'); def.stun = hit.bstun; def.crouching = !!def.prev.down; def.pushV = dir * hit.push * 1.1; def.vx = 0;
    if (hit.chip) def.hp = Math.max(0, def.hp - Math.round(hit.dmg * hit.chip / 100));
    if (isWall(def)) att.pushV = -dir * hit.push * 0.9;
    G.sparks.push({ x: cx, y: cy, t: 0, kind: 'block' }); SFX.play('block'); G.hitstop = 4; def.combo = 0;
    if (def.hp <= 0) { def.setState('fall'); def.vy = -8; def.vx = dir * 3.5; }
    return 'block';
  }
  const counter = def.state === 'attack';
  const comboing = def.state === 'hit' || def.state === 'fall';
  def.combo = comboing ? def.combo + 1 : 1;
  const scale = Math.max(0.5, 1 - 0.1 * (def.combo - 1));
  const dmg = Math.round(hit.dmg * scale);
  def.hp = Math.max(0, def.hp - dmg); def.flash = 6; def.move = null;
  if (def.combo >= 2) G.comboText[att.side] = { n: def.combo, t: 0 };
  if (def.hp <= 0 || def.air || hit.knock || (hit.heavy && (counter || def.state === 'hit'))) { def.setState('fall'); def.vy = def.hp <= 0 ? -10 : -7; def.vx = dir * (def.hp <= 0 ? 5 : 4); def.y = Math.min(def.y, FLOOR - 1); }
  else { def.setState('hit'); def.heavyHit = !!hit.heavy; def.stun = hit.stun; def.pushV = dir * hit.push; def.vx = 0; def.crouching = !!def.prev.down && !def.air; }
  if (isWall(def) && !isProj) att.pushV = -dir * hit.push * 0.8;
  G.sparks.push({ x: cx, y: cy, t: 0, kind: hit.heavy ? 'heavy' : 'hit' });
  SFX.play('hit', !!hit.heavy); G.hitstop = hit.heavy ? 9 : 6; G.shake = hit.heavy ? 8 : 4;
  return 'hit';
}
function isWall(f) { return f.x <= WALL_L + 4 || f.x >= WALL_R - 4; }
function updateProjectiles() {
  for (const p of G.projectiles) {
    const def = G.fighters.find(f => f !== p.owner);
    if (p.kind) { updateLoboProj(p, def); continue; }
    p.x += p.vx; p.t++;
    if (G.frame % 2 === 0) G.particles.push({ x: p.x - Math.sign(p.vx) * 14, y: p.y + (Math.random() - 0.5) * 30, vx: -p.vx * 0.1, vy: -0.3, r: 6 + Math.random() * 6, life: 40, t: 0, a: 0.5 });
    const box = { x0: p.x - 14, x1: p.x + 14, y0: p.y - 34, y1: p.y + 34 };
    if (!p.dead && def.inv <= 0 && !['fall', 'down', 'ko', 'getup'].includes(def.state) && overlap(box, def.hurtbox())) {
      p.dead = true; const P = p.P;
      const res = applyHit(p.owner, def, { dmg: P.dmg, stun: P.stun, bstun: P.bstun, push: P.push, chip: P.chip }, p.x, p.y, Math.sign(p.vx), true);
      for (let i = 0; i < 14; i++) G.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.7) * 4, r: 10 + Math.random() * 14, life: 50, t: 0, a: 0.8 });
      if (res === 'hit') { G.smog.push({ victim: def, x: def.x, y: FLOOR - 140, t: 0 }); SFX.play('smoke'); }
    }
    if (p.x < -60 || p.x > VW + 60) p.dead = true;
  }
  G.projectiles = G.projectiles.filter(p => !p.dead);
}
// Lobo projectiles: wave (Alpha Claw Slash), dog (Dog Throw -> Yorkshire Attack, latches and bites up to 3x), pack (Alpha Pack super)
function updateLoboProj(p, def) {
  const P = p.P; p.t++; if (p.hcd > 0) p.hcd--;
  if (p.stick) { p.x = def.x - p.dir * 30; if (['fall', 'down', 'ko', 'getup'].includes(def.state) || p.t - p.stickT > 40) p.dead = true; }
  else p.x += p.vx;
  if (p.kind === 'wave' && G.frame % 3 === 0) G.particles.push({ x: p.x - p.dir * 30, y: p.y + (Math.random() - 0.5) * 80, vx: -p.vx * 0.15, vy: -0.4, r: 3, life: 18, t: 0, a: 0.7, blue: 1 });
  const box = { x0: p.x - P.bw, x1: p.x + P.bw, y0: p.y - P.bh, y1: p.y + P.bh };
  if (!p.dead && p.hcd <= 0 && def.inv <= 0 && !['fall', 'down', 'ko', 'getup'].includes(def.state) && overlap(box, def.hurtbox())) {
    p.hits++; const last = p.hits >= (P.maxHits || 1);
    const res = applyHit(p.owner, def, { dmg: P.dmg, stun: P.stun, bstun: P.bstun, push: last ? P.push * 2 : P.push, chip: P.chip, heavy: P.heavy || (last && P.knockLast), knock: last && P.knockLast ? 1 : 0, nomtr: P.nomtr }, p.x, p.y, p.dir, true);
    if (p.kind === 'dog') { if (res === 'hit' && !last) { p.stick = true; p.stickT = p.t; p.vx = 0; p.hcd = P.gap; SFX.play('bark'); } else p.dead = true; }
    else if (last || (res === 'block' && !P.pierce)) p.dead = true; else p.hcd = P.gap;
  }
  if (P.life && p.t > P.life) p.dead = true;
  if (p.x < -200 || p.x > VW + 200) p.dead = true;
  if (p.dead && p.kind === 'dog') p.owner.lastDogX = Math.max(20, Math.min(VW - 20, p.x));
}
function drawLoboProj(p) {
  const S = Sprites.lobo;
  if (p.kind === 'pack') { // Alpha Pack: spectral wolves as additive light (no panel box) + the real Yorkshires on top
    const m = S.meta.super2a[0], o = { id: 'lobo', x: p.x, y: p.y + m.h / 2, facing: p.dir, tinted: false };
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(1, p.t / 8) * (0.85 + 0.15 * Math.sin(p.t / 2)); drawFrame(ctx, o, 'super2a', 0, {}); ctx.restore();
    drawFrame(ctx, o, 'super2n', 0, { oy: Math.sin(p.t / 3) * 3 }); return;
  }
  const anim = p.kind === 'wave' ? 'wave' : p.stick ? 'dogatk' : 'dogfly';
  const m = S.meta[anim][0]; const shake = p.stick ? Math.sin(p.t * 1.3) * 3 : 0;
  ctx.save(); if (p.kind === 'wave') ctx.globalCompositeOperation = 'lighter';
  drawFrame(ctx, { id: 'lobo', x: p.x + shake, y: p.y + m.h / 2, facing: p.dir, tinted: false }, anim, 0, {});
  ctx.restore();
}
G.smogOn = me => G.smog.some(s => s.victim === me && s.t < 75);
G.dust = x => { for (let i = 0; i < 6; i++) G.particles.push({ x: x + (Math.random() - 0.5) * 50, y: FLOOR - 4, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.2, r: 5 + Math.random() * 5, life: 26, t: 0, a: 0.45, dust: 1 }); };
function emitCigSmoke(f) {
  const lying = ['fall', 'down', 'ko'].includes(f.state);
  if (lying) return;
  let dx = 22, dy = -184;
  if (f.state === 'win') { dx = -16; dy = -205; }
  else if (f.crouching || (f.move && f.move.crouch)) dy = -140;
  else if (f.air) dy = -170;
  if (f.state === 'attack' && f.move && f.curFrame().pose && f.curFrame().pose.startsWith('ring')) { dx = 34; dy = -180; }
  G.particles.push({ x: f.x + dx * f.facing, y: f.y + dy, vx: (Math.random() - 0.3) * 0.4 * f.facing, vy: -0.7 - Math.random() * 0.4, r: 2.5, grow: 0.09, life: 70, t: 0, a: 0.45, cig: 1 });
}
function updateEffects() {
  for (const p of G.particles) { p.t++; p.x += p.vx; p.y += p.vy; p.vx *= 0.97; if (p.grow) p.r += p.grow; else p.r += 0.15; if (p.cig) p.vx += Math.sin((p.t + p.x) / 9) * 0.03; }
  G.particles = G.particles.filter(p => p.t < p.life).slice(-260);
  for (const s of G.sparks) s.t++; G.sparks = G.sparks.filter(s => s.t < 16);
  for (const s of G.smog) { s.t++; s.x += (s.victim.x - s.x) * 0.05; } G.smog = G.smog.filter(s => s.t < 100);
  for (let i = 0; i < 2; i++) if (G.comboText[i] && ++G.comboText[i].t > 70) G.comboText[i] = null;
  if (G.shake > 0) G.shake--;
}

// ---------- drawing ----------
function drawFight() {
  ctx.save();
  if (G.shake) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake * 0.6);
  Stage.draw(ctx, G.frame);
  const fs = [...G.fighters].sort((p, q) => (p.state === 'attack') - (q.state === 'attack'));
  for (const f of fs) drawFighter(ctx, f, G);
  for (const p of G.particles) drawPuff(p);
  for (const p of G.projectiles) p.kind ? drawLoboProj(p) : drawRing(p);
  for (const s of G.sparks) drawSpark(s);
  for (const s of G.smog) drawSmog(s);
  if (G.showBoxes) drawBoxes();
  ctx.restore();
  if (G.superFlash) { const sf = G.superFlash; sf.t++; if (sf.t > 46) G.superFlash = null; else {
    ctx.save(); ctx.globalAlpha = sf.t < 26 ? 0.5 : 0.5 * (1 - (sf.t - 26) / 20); ctx.fillStyle = '#04102a'; ctx.fillRect(0, 0, VW, VH); ctx.restore();
    if (sf.t < 26) { drawFighter(ctx, sf.f, G); ctx.save(); ctx.globalAlpha = Math.min(1, sf.t / 6); bigText(sf.name, 200, 58, '#bfe8ff', '#2a7bff'); ctx.restore(); } } }
  drawHUD();
  if (G.banner) { G.banner.t++; const b = G.banner, k = Math.min(1, b.t / 8);
    ctx.save(); ctx.globalAlpha = k; bigText(b.text, 230, b.big ? 120 : 84, b.text === 'K.O.' ? '#ffffff' : '#ffe14d', b.text === 'K.O.' ? '#ff2a2a' : '#ff4b1f');
    if (b.sub) txt(b.sub, VW / 2, 300, 30, '#fff'); ctx.restore(); }
}
function drawPuff(p) {
  const k = 1 - p.t / p.life; ctx.save(); ctx.globalAlpha = p.a * k; ctx.fillStyle = p.blue ? '#8fd0ff' : p.dust ? '#8c8296' : '#d8d4dc';
  const r = Math.round(p.r); ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2 * 0.8); ctx.globalAlpha *= 0.6; ctx.fillRect(Math.round(p.x - r * 0.7), Math.round(p.y - r * 1.2), r * 1.4, r * 2.4); ctx.restore();
}
function drawRing(p) {
  ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y));
  const wob = Math.sin(p.t / 3) * 2;
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + p.t * 0.12; const x = Math.cos(a) * (11 + wob * 0.3), y = Math.sin(a) * (34 + wob);
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#d9d4de' : '#aaa3b3'; ctx.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8); }
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(-16, -38, 32, 76); ctx.restore();
}
function drawSpark(s) {
  const k = s.t / 16; ctx.save(); ctx.translate(s.x, s.y); ctx.globalAlpha = 1 - k;
  const col = s.kind === 'block' ? '#7fd8ff' : s.kind === 'heavy' ? '#ffdd33' : '#fff3a0';
  ctx.strokeStyle = col; ctx.lineWidth = s.kind === 'heavy' ? 6 : 4; const R = (s.kind === 'heavy' ? 46 : 32) * (0.5 + k);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
}
function drawSmog(s) {
  const fade = s.t < 70 ? Math.min(1, s.t / 6) : Math.max(0, 1 - (s.t - 70) / 30);
  ctx.save(); ctx.globalAlpha = 0.82 * fade;
  const pts = [[0, 0, 70], [-60, -30, 55], [55, -40, 60], [-30, 50, 55], [45, 45, 50], [0, -85, 50], [-90, 30, 40], [95, 10, 42]];
  pts.forEach(([dx, dy, r], i) => { const w = Math.sin((s.t + i * 13) / 10) * 6; ctx.fillStyle = i % 2 ? '#cfc9d6' : '#e8e4ec';
    const R = r + w; ctx.fillRect(Math.round(s.x + dx - R), Math.round(s.y + dy - R * 0.8), Math.round(R * 2), Math.round(R * 1.6)); ctx.fillRect(Math.round(s.x + dx - R * 0.7), Math.round(s.y + dy - R), Math.round(R * 1.4), Math.round(R * 2)); });
  ctx.restore();
}
function drawBoxes() {
  ctx.save(); ctx.lineWidth = 2;
  for (const f of G.fighters) {
    const hu = f.hurtbox(); if (hu) { ctx.strokeStyle = '#3f6'; ctx.strokeRect(hu.x0, hu.y0, hu.x1 - hu.x0, hu.y1 - hu.y0); }
    const lb = f.limbBox(); if (lb) { ctx.strokeStyle = '#3cf'; ctx.strokeRect(lb.x0, lb.y0, lb.x1 - lb.x0, lb.y1 - lb.y0); }
    if (f.move && f.move.hit) { const fr = f.curFrame(); if (fr.a) { const b = f.worldBox(fr.hb ? { ...f.move.hit, ...fr.hb } : f.move.hit); ctx.strokeStyle = '#f33'; ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); } }
    ctx.strokeStyle = '#ff0'; ctx.strokeRect(f.x - 32, f.y - 6, 64, 6);
  }
  ctx.restore();
}
function portrait(f, x, y, flip) {
  const S = Sprites[f.id]; if (!S) return; const m = S.meta[f.id === 'jogador' ? 'stance' : 'idle'][0];
  ctx.save(); ctx.fillStyle = '#120c24'; ctx.fillRect(x, y, 60, 60); ctx.beginPath(); ctx.rect(x, y, 60, 60); ctx.clip();
  const sx = m.x + m.ax - 26 + (f.id === 'jogador' ? 2 : 0);
  ctx.translate(x + 30, y); ctx.scale(flip ? -1 : 1, 1); ctx.drawImage(f.tinted ? S.tint : S.img, sx, m.y, 52, 52, -30, 2, 60, 60); ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 60, 60);
}
function drawHUD() {
  const [a, b] = G.fighters;
  const bar = (f, x, flip) => {
    const W = 340, H = 22, y = 22, frac = Math.max(0, f.hp / f.c.hp);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, W + 6, H + 6); ctx.fillStyle = '#5a0d10'; ctx.fillRect(x, y, W, H);
    if (f.dispHp == null) f.dispHp = f.hp; f.dispHp += (f.hp - f.dispHp) * 0.06; const df = Math.max(0, f.dispHp / f.c.hp);
    ctx.fillStyle = '#ff5a3a'; flip ? ctx.fillRect(x, y, W * df, H) : ctx.fillRect(x + W * (1 - df), y, W * df, H);
    const gr = ctx.createLinearGradient(0, y, 0, y + H); gr.addColorStop(0, '#fff27a'); gr.addColorStop(1, '#f0a400'); ctx.fillStyle = gr;
    flip ? ctx.fillRect(x, y, W * frac, H) : ctx.fillRect(x + W * (1 - frac), y, W * frac, H);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, W, H);
    txt(f.c.hud || f.c.name, flip ? x + W : x, y + H + 16, 20, '#fff', flip ? 'right' : 'left', '900', 4);
    for (let i = 0; i < 2; i++) { const cx = flip ? x + W - 130 - i * 22 : x + 130 + i * 22; ctx.fillStyle = G.wins[f.side] > i ? '#ffd23a' : '#2a2140'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y + H + 16, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (f.id === 'jogador') { const k = 1 - f.cool / f.c.proj.cooldown; const bx = flip ? x + W - 110 : x + 230; ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, y + H + 30, 112, 9); ctx.fillStyle = k >= 1 ? '#e8e4ec' : '#6c6478'; ctx.fillRect(bx, y + H + 31, 110 * k, 7); txt('FUMAÇA', bx + 55, y + H + 47, 11, k >= 1 ? '#fff' : '#9a90a8', 'center', '800', 3); }
  };
  for (const f of G.fighters) if (f.id === 'lobo') { const flip = f.side === 1, x = flip ? VW - 76 - 340 : 76, y = 22, bx = flip ? x + 340 - 150 : x + 190;
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, y + 51, 154, 11);
    for (let i = 0; i < 2; i++) { const k = Math.max(0, Math.min(1, (f.meter - i * 100) / 100)); ctx.fillStyle = '#123'; ctx.fillRect(bx + i * 76, y + 52, 74, 9); ctx.fillStyle = k >= 1 ? (G.frame & 8 ? '#7fe0ff' : '#2a8bff') : '#2a5a8a'; ctx.fillRect(bx + i * 76, y + 52, 74 * k, 9); }
    txt('ALPHA ' + Math.floor(f.meter / 100), bx + 76, y + 72, 11, f.meter >= 100 ? '#bfe8ff' : '#7a8aa8', 'center', '800', 3); }
  portrait(a, 8, 8, false); portrait(b, VW - 68, 8, true);
  bar(a, 76, false); bar(b, VW - 76 - 340, true);
  ctx.fillStyle = '#000'; ctx.fillRect(VW / 2 - 34, 12, 68, 52); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3; ctx.strokeRect(VW / 2 - 34, 12, 68, 52);
  txt(String(G.timer).padStart(2, '0'), VW / 2, 39, 38, G.timer <= 10 ? '#ff5a3a' : '#fff', 'center', '900', 0);
  for (let i = 0; i < 2; i++) { const c = G.comboText[i]; if (c) txt(`${c.n} GOLPES!`, i === 0 ? 120 : VW - 120, 150, 30, '#ffd23a', 'center', '900', 5); }
  if (G.mode === 'cpu') txt('CPU · ' + DIFF[G.diff].label, VW / 2, 76, 12, '#cbbfff', 'center', '700', 3);
}

function drawTitle() {
  Stage.draw(ctx, G.frame); ctx.fillStyle = 'rgba(8,4,20,0.45)'; ctx.fillRect(0, 0, VW, VH);
  if (Sprites.ready) {
    drawFrame(ctx, { id: 'mukira', x: 250, y: 500, facing: 1 }, 'whip', 2, {});
    drawFrame(ctx, { id: 'jogador', x: 760, y: 500, facing: -1 }, 'ring', 0, {});
    drawFrame(ctx, { id: 'lobo', x: 500, y: 520, facing: 1 }, 'win1', 0, {});
  }
  bigText(GAME_TITLE.toUpperCase(), 110, 76);
  txt('MUKIRA  ×  JOGADOR  ×  LOBO SOLITÁRIO', VW / 2, 172, 26, '#fff', 'center', '900', 5);
  if (Math.floor(G.frame / 30) % 2 === 0) txt(Input.isTouchDevice() ? 'TOQUE PARA COMEÇAR' : 'APERTE ENTER OU CLIQUE', VW / 2, 232, 30, '#ffd23a', 'center', '900', 5);
  txt('PC: P1 WASD + F G H  ·  P2 Setas + J K L  ·  Esc pausa', VW / 2, 474, 14, '#cbbfff', 'center', '600', 3);
  txt('by @aiforge.team', VW - 12, 18, 13, '#cbbfff', 'right', '600', 3);
  txt(VERSION, 12, 18, 13, '#cbbfff', 'left', '600', 3);
}
function drawMode() {
  dimBg(); bigText('MODO DE JOGO', 80, 56);
  const touch = Input.isTouchDevice();
  menu([{ id: 'cpu', label: 'Contra CPU', sub: 'Você contra o computador' }, { id: 'pvp', label: '2 Jogadores', sub: touch ? 'Precisa de teclado (no PC)' : 'Mesmo teclado' }], VW / 2 - 180, 160, 360, 76);
  if (touch) txt('No celular, o modo 2 Jogadores precisa de um teclado conectado.', VW / 2, 360, 16, '#cbbfff', 'center', '600', 3);
  button('back', '‹ Voltar', 20, VH - 70, 140, 50, false);
}
function drawDiff() {
  dimBg(); bigText('DIFICULDADE', 80, 56);
  menu([{ id: 'facil', label: 'Fácil' }, { id: 'normal', label: 'Normal' }, { id: 'dificil', label: 'Difícil' }], VW / 2 - 160, 150, 320, 64);
  button('back', '‹ Voltar', 20, VH - 70, 140, 50, false);
}
function drawSelect() {
  dimBg();
  const who = G.selStep === 0 ? (G.mode === 'cpu' ? 'ESCOLHA SEU LUTADOR' : 'JOGADOR 1: ESCOLHA') : (G.mode === 'cpu' ? 'ESCOLHA O ADVERSÁRIO (CPU)' : 'JOGADOR 2: ESCOLHA');
  bigText(who, 62, 40);
  CHAR_IDS.forEach((id, i) => {
    const x = 45 + i * 300, y = 100, w = 270, h = 340, sel = G.selCur[G.selStep] === i;
    G.buttons.push({ id: 'card' + i, x, y, w, h });
    ctx.save(); ctx.fillStyle = sel ? 'rgba(255,200,40,0.25)' : 'rgba(20,14,40,0.8)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = sel ? '#ffd23a' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = sel ? 5 : 2; ctx.strokeRect(x, y, w, h); ctx.restore();
    const tinted = G.selStep === 1 && G.pick[0] === id;
    if (Sprites.ready) drawFrame(ctx, { id, x: x + w / 2, y: y + h - 70, facing: i === 1 ? -1 : 1, tinted }, id === 'jogador' ? 'stance' : 'idle', id === 'mukira' ? cyc(G.frame, 4, 12) : 0, {});
    txt(CHARS[id].name, x + w / 2, y + h - 46, id === 'lobo' ? 24 : 28, '#fff', 'center', '900', 5);
    txt(CHARS[id].title, x + w / 2, y + h - 18, 15, '#cbbfff', 'center', '700', 3);
    if (G.selStep === 1 && G.pick[0] === id) txt('P1', x + 22, y + 20, 18, '#3cf', 'center', '900', 4);
    if (sel) txt(G.selStep === 0 ? 'P1' : (G.mode === 'cpu' ? 'CPU' : 'P2'), x + w - 28, y + 20, 18, '#ffd23a', 'center', '900', 4);
  });
  if (G.selStep === 1 && CHAR_IDS[G.selCur[1]] === G.pick[0]) txt('Espelho: o adversário usa outras cores', VW / 2, 474, 15, '#cbbfff', 'center', '600', 3);
  const info = ['Especial: chicote de barba de longo alcance (Especial ou ↘ + Soco)', 'Especial: anel de fumaça que atravessa a tela e cega (Especial ou ↘ + Soco)',
    'Especial: garra azul · Esp+← cachorro · Esp+→ investida · Esp+↓ rasteira'][G.selCur[G.selStep]];
  txt(info, VW / 2, 494, 15, '#fff', 'center', '600', 3);
  if (CHAR_IDS[G.selCur[G.selStep]] === 'lobo') txt('Soco+Chute: ataque duplo · Supers (barra ALPHA): Especial+Soco · Especial+Chute · botão SUPER', VW / 2, 516, 14, '#bfe8ff', 'center', '600', 3);
  button('back', '‹', 20, VH - 64, 50, 48, false);
}
function drawResult() {
  dimBg(); const r = G.lastResult;
  if (r && r.winner >= 0) { const f = G.fighters[r.winner]; bigText('VITÓRIA!', 90, 80); txt(f.c.name + ' VENCE A LUTA', VW / 2, 160, 32, '#fff', 'center', '900', 5);
    if (Sprites.ready) drawFrame(ctx, { ...f, x: 190, y: 470, facing: 1, tinted: f.tinted }, f.id === 'mukira' ? 'whip' : f.id === 'lobo' ? 'win1' : 'front', f.id === 'mukira' ? 3 : 0, {});
    if (G.mode === 'cpu') txt(r.winner === 0 ? 'Você venceu a CPU!' : 'A CPU venceu. Tenta de novo!', VW / 2, 200, 20, '#ffd23a', 'center', '800', 4); }
  else { bigText('EMPATE', 100, 80); }
  menu([{ id: 'rematch', label: 'Revanche' }, { id: 'chars', label: 'Trocar lutadores' }, { id: 'home', label: 'Menu inicial' }], VW / 2 + 40, 250, 300, 58, 12);
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH); bigText('PAUSA', 110, 70);
  menu([{ id: 'resume', label: 'Continuar' }, { id: 'restart', label: 'Reiniciar luta' }, { id: 'home', label: 'Menu inicial' }], VW / 2 - 160, 190, 320, 60, 14);
  txt('Controles: ← → andar · ↑ pular · ↓ agachar · segurar para trás = defender', VW / 2, 440, 15, '#fff', 'center', '600', 3);
  txt('Soco · Chute · Especial  (↘ + Soco também solta o especial)  ·  → + Soco = soco forte', VW / 2, 466, 15, '#fff', 'center', '600', 3);
  if (G.fighters.some(f => f.id === 'lobo')) txt('Lobo: Especial (+← cachorro, +→ investida, +↓ rasteira) · Soco+Chute duplo · Especial+Soco super 1 · Especial+Chute super 2', VW / 2, 492, 13, '#bfe8ff', 'center', '600', 3);
}

// ---------- menu keyboard ----------
function handleMenuKeys() {
  let k; while ((k = Input.popMenu())) {
    if (k === 'mute') { toggleMute(); continue; }
    if (G.scene === 'fight') {
      if ((k === 'pause' || k === 'back') && !G.paused) { G.paused = true; G.menuSel = 0; updateOverlay(); continue; }
      if (!G.paused) continue;
      if (k === 'pause' || k === 'back') { G.paused = false; updateOverlay(); continue; }
    }
    if (G.scene === 'title') { if (k === 'ok') activate('start'); continue; }
    if (G.scene === 'select') {
      if (k === 'left' || k === 'right') { const n = CHAR_IDS.length; G.selCur[G.selStep] = (G.selCur[G.selStep] + (k === 'left' ? n - 1 : 1)) % n; SFX.play('move'); }
      else if (k === 'ok') selectCard(G.selCur[G.selStep]); else if (k === 'back') back();
      continue;
    }
    const L = G.menuList || [];
    if (k === 'up') { G.menuSel = (G.menuSel + L.length - 1) % L.length; SFX.play('move'); }
    else if (k === 'down') { G.menuSel = (G.menuSel + 1) % L.length; SFX.play('move'); }
    else if (k === 'ok' && L[G.menuSel]) activate(L[G.menuSel].id);
    else if (k === 'back') back();
  }
}
// ---------- overlay (touch controls, pause, mute) ----------
const touchEl = document.getElementById('touch'), pauseBtn = document.getElementById('bPause'), muteBtn = document.getElementById('bMute');
function updateOverlay() {
  const fighting = G.scene === 'fight' && !G.paused;
  touchEl.classList.toggle('hidden', !(fighting && Input.isTouchDevice()));
  pauseBtn.classList.toggle('hidden', !fighting);
  document.getElementById('topbar').classList.toggle('corner', G.scene !== 'fight');
  muteBtn.textContent = SFX.muted ? '🔇' : '🔊';
}
function toggleMute() { SFX.init(); SFX.toggle(); updateOverlay(); }
muteBtn.addEventListener('click', e => { e.stopPropagation(); toggleMute(); });
pauseBtn.addEventListener('click', e => { e.stopPropagation(); if (G.scene === 'fight') { G.paused = true; G.menuSel = 0; updateOverlay(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.scene === 'fight' && !G.paused) { G.paused = true; updateOverlay(); } });
matchMedia('(orientation: portrait)').addEventListener && matchMedia('(orientation: portrait)').addEventListener('change', e => { if (e.matches && Input.isTouchDevice() && G.scene === 'fight' && !G.paused) { G.paused = true; updateOverlay(); } });
Input.setupTouch();

// ---------- main loop ----------
let last = performance.now(), acc = 0;
function step() {
  G.frame++;
  { const f0 = G.fighters && G.fighters[0], on = G.scene === 'fight' && f0 && f0.id === 'lobo' && f0.meter >= 100; if (on !== G._superBtn) { G._superBtn = on; document.getElementById('bSuper').classList.toggle('hidden', !on); } }
  handleMenuKeys();
  if (G.scene === 'fight' && !G.paused) updateFight();
}
function render() {
  G.buttons = [];
  ctx.setTransform(canvas.width / VW, 0, 0, canvas.height / VH, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0d0a1a'; ctx.fillRect(0, 0, VW, VH);
  switch (G.scene) {
    case 'loading': txt('Carregando…', VW / 2, VH / 2, 30); break;
    case 'title': drawTitle(); break;
    case 'mode': drawMode(); break;
    case 'diff': drawDiff(); break;
    case 'select': drawSelect(); break;
    case 'fight': drawFight(); if (G.paused) drawPause(); break;
    case 'result': drawResult(); break;
  }
}
function loop(now) {
  acc += Math.min(100, now - last) * G.speed; last = now;
  if (G.freeze) acc = 0;
  let n = 0; while (acc >= 1000 / 60 && n < 8 * G.speed) { step(); acc -= 1000 / 60; n++; }
  if (n >= 8 * G.speed) acc = 0;
  try { render(); } catch (e) { G.errors.push(String(e)); throw e; }
  requestAnimationFrame(loop);
}
G.debug = {
  startFight(p1 = 'mukira', p2 = 'jogador', mode = 'cpu', diff = 'normal') { G.pick = [p1, p2]; G.mode = mode; G.diff = diff; startMatch(); },
  skipIntro() { G.rt = 110; G.rstate = 'fight'; G.banner = null; },
  step(n = 1) { for (let i = 0; i < n; i++) step(); render(); },
  activate,
  info() { return { scene: G.scene, rstate: G.rstate, round: G.round, wins: [...G.wins], timer: G.timer, paused: G.paused,
    f: G.fighters.map(f => ({ id: f.id, x: Math.round(f.x), y: Math.round(f.y), hp: f.hp, state: f.state, move: f.moveName && f.move ? f.moveName : null, facing: f.facing, cool: f.cool, meter: Math.round(f.meter) })),
    proj: G.projectiles.length, projKinds: G.projectiles.map(p => p.kind || 'ring'), superFlash: !!G.superFlash, smog: G.smog.length, result: G.lastResult }; },
};
loadSprites().then(() => { go('title'); }).catch(e => { G.errors.push(String(e)); G.scene = 'loading'; console.error(e); });
requestAnimationFrame(loop);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !qs.has('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
