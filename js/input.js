'use strict';
// Keyboard + touch input. Produces per-player held states; game computes edges.
const Input = (() => {
  const KEYMAP = {
    p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], punch: ['KeyF'], kick: ['KeyG'], special: ['KeyH'] },
    p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], punch: ['KeyJ'], kick: ['KeyK'], special: ['KeyL'] },
  };
  const held = new Set();
  const menuQ = [];
  const MENU = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'ok', Space: 'ok', KeyF: 'ok', KeyJ: 'ok', Escape: 'back', Backspace: 'back', KeyP: 'pause' };
  const touch = { up: false, down: false, left: false, right: false, punch: false, kick: false, special: false };
  let touchUsed = false;
  window.addEventListener('keydown', e => {
    if (e.code === 'F5' || e.code === 'F12' || e.metaKey || e.ctrlKey) return;
    if (!e.repeat && MENU[e.code]) menuQ.push(MENU[e.code]);
    if (!e.repeat && e.code === 'KeyM') menuQ.push('mute');
    held.add(e.code); e.preventDefault();
  });
  window.addEventListener('keyup', e => { held.delete(e.code); });
  window.addEventListener('blur', () => { held.clear(); for (const k in touch) touch[k] = false; });

  function setupTouch() {
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let sid = null;
    const upd = (e) => {
      const r = stick.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy; const R = r.width / 2, d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx * 0.6}px,${dy * 0.6}px)`;
      const dead = R * 0.28;
      touch.left = dx < -dead; touch.right = dx > dead; touch.up = dy < -dead * 1.25; touch.down = dy > dead * 1.1;
    };
    const end = () => { sid = null; knob.style.transform = ''; touch.left = touch.right = touch.up = touch.down = false; };
    stick.addEventListener('pointerdown', e => { touchUsed = true; sid = e.pointerId; stick.setPointerCapture(sid); upd(e); e.preventDefault(); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === sid) upd(e); });
    stick.addEventListener('pointerup', e => { if (e.pointerId === sid) end(); });
    stick.addEventListener('pointercancel', end);
    document.querySelectorAll('.tb').forEach(b => {
      const k = b.dataset.k;
      const on = e => { touchUsed = true; touch[k] = true; b.classList.add('on'); b.setPointerCapture(e.pointerId); e.preventDefault(); };
      const off = () => { touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  function readKeys(map) { const s = {}; for (const k in map) s[k] = map[k].some(c => held.has(c)); return s; }
  return {
    setupTouch,
    get touchUsed() { return touchUsed; }, set touchUsed(v) { touchUsed = v; },
    isTouchDevice: () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches,
    // which: 'p1' | 'p2'; merged: in CPU mode P1 may use both keyboard sets
    read(which, merged) {
      const a = readKeys(KEYMAP[which]);
      if (merged) { const b = readKeys(KEYMAP.p2); for (const k in a) a[k] = a[k] || b[k]; }
      if (which === 'p1') for (const k in a) a[k] = a[k] || touch[k];
      return a;
    },
    popMenu() { return menuQ.shift(); },
    clearMenu() { menuQ.length = 0; },
    _held: held, _touch: touch,
  };
})();
