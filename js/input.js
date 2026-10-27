'use strict';
// Keyboard + touch input. Produces per-player held states; game computes edges.
const Input = (() => {
  const KEYMAP = {
    p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], punch: ['KeyF'], kick: ['KeyG'], special: ['KeyH'], super: ['KeyR'] },
    p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], punch: ['KeyJ'], kick: ['KeyK'], special: ['KeyL'], super: ['KeyI'] },
  };
  const held = new Set();
  const menuQ = [];
  const MENU = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'ok', Space: 'ok', KeyF: 'ok', KeyJ: 'ok', Escape: 'back', Backspace: 'back', KeyP: 'pause' };
  const touch = { up: false, down: false, left: false, right: false, punch: false, kick: false, special: false, super: false };
  const refs = {}; // key -> set of pointerIds holding it (multi-touch safe)
  let touchUsed = false;
  window.addEventListener('keydown', e => {
    if (e.code === 'F5' || e.code === 'F12' || e.metaKey || e.ctrlKey) return;
    if (!e.repeat && MENU[e.code]) menuQ.push(MENU[e.code]);
    if (!e.repeat && e.code === 'KeyM') menuQ.push('mute');
    held.add(e.code); e.preventDefault();
  });
  window.addEventListener('keyup', e => { held.delete(e.code); });
  window.addEventListener('blur', () => { held.clear(); for (const k in touch) touch[k] = false; for (const k in refs) refs[k].clear(); });

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
    // Buttons: every finger is tracked on its own (pointerId), so Especial+Soco / Soco+Chute pressed with two thumbs
    // both register. A finger landing in the gap between two buttons presses both (one-thumb chord).
    const btns = [...document.querySelectorAll('.tb')];
    const set = (k, id, on) => { const s = refs[k] || (refs[k] = new Set()); on ? s.add(id) : s.delete(id); touch[k] = s.size > 0;
      const el = btns.find(b => b.dataset.k === k); if (el) el.classList.toggle('on', touch[k]); };
    const owned = {}; // pointerId -> keys
    const down = e => {
      touchUsed = true; const keys = new Set();
      for (const b of btns) { if (b.classList.contains('hidden')) continue; const r = b.getBoundingClientRect(), pad = 8;
        if (e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) keys.add(b.dataset.k); }
      keys.add(e.currentTarget.dataset.k); owned[e.pointerId] = keys; for (const k of keys) set(k, e.pointerId, true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
    };
    const up = e => { const keys = owned[e.pointerId]; if (!keys) return; for (const k of keys) set(k, e.pointerId, false); delete owned[e.pointerId]; };
    for (const b of btns) {
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    }
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
