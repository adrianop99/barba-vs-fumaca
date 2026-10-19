'use strict';
// Procedural pixel-art night street, drawn at 240x135 and scaled x4 (nearest).
const Stage = (() => {
  const W = 240, H = 135, S = 4;
  let base = null;
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function build() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const r = rng(1337);
    // sky bands (dithered)
    const sky = ['#0b0820', '#120c2e', '#1a1240', '#24174f', '#2f1d5c', '#3d2366'];
    for (let y = 0; y < 80; y++) {
      const t = y / 80 * (sky.length - 1), i = Math.floor(t), f = t - i;
      for (let x = 0; x < W; x++) { const dith = ((x + y) & 1) ? 0.25 : 0.75; g.fillStyle = sky[Math.min(sky.length - 1, i + (f > dith ? 1 : 0))]; g.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 60; i++) { g.fillStyle = r() > 0.8 ? '#fff' : '#9a8fd0'; g.fillRect(Math.floor(r() * W), Math.floor(r() * 55), 1, 1); }
    // moon
    g.fillStyle = '#f3ecc8'; for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) if (x * x + y * y <= 49) g.fillRect(196 + x, 18 + y, 1, 1);
    g.fillStyle = '#d9cf9f'; g.fillRect(193, 16, 2, 2); g.fillRect(198, 21, 3, 2); g.fillRect(199, 14, 2, 1);
    // far skyline
    let x = 0; while (x < W) { const w = 8 + Math.floor(r() * 14), h = 20 + Math.floor(r() * 30); g.fillStyle = '#1c1538'; g.fillRect(x, 85 - h, w, h + 10);
      for (let wy = 85 - h + 3; wy < 85; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (r() > 0.7) { g.fillStyle = r() > 0.5 ? '#6b5a2a' : '#3a3160'; g.fillRect(wx, wy, 1, 2); }
      x += w + 1; }
    // mid buildings
    const cols = ['#2a1f3d', '#33243f', '#271d36', '#3a2a40'];
    x = -4; let bi = 0;
    while (x < W) { const w = 34 + Math.floor(r() * 22), h = 52 + Math.floor(r() * 26), top = 108 - h; g.fillStyle = cols[bi++ % cols.length]; g.fillRect(x, top, w, h);
      g.fillStyle = '#1a1326'; g.fillRect(x, top, w, 2); g.fillRect(x + w - 1, top, 1, h);
      for (let wy = top + 6; wy < 92; wy += 9) for (let wx = x + 4; wx < x + w - 6; wx += 8) {
        const lit = r() > 0.45; g.fillStyle = lit ? (r() > 0.3 ? '#f2c45a' : '#ffe9a8') : '#151022'; g.fillRect(wx, wy, 4, 5);
        g.fillStyle = '#120d1c'; g.fillRect(wx, wy + 5, 4, 1); }
      x += w; }
    // bar storefront (center-left)
    g.fillStyle = '#41203a'; g.fillRect(70, 80, 64, 28); g.fillStyle = '#1b0f1c'; g.fillRect(74, 86, 18, 22); g.fillRect(98, 86, 32, 14);
    g.fillStyle = '#7a3b2a'; g.fillRect(98, 86, 32, 1); g.fillStyle = '#e9a64a'; g.fillRect(100, 90, 4, 6); g.fillRect(108, 92, 3, 4); g.fillRect(116, 89, 5, 7);
    g.fillStyle = '#5a2b46'; g.fillRect(68, 78, 68, 3);
    // awning stripes
    for (let i = 0; i < 17; i++) { g.fillStyle = i % 2 ? '#c8323a' : '#e8e0d0'; g.fillRect(68 + i * 4, 81, 4, 4); }
    // sidewalk
    g.fillStyle = '#4a4458'; g.fillRect(0, 108, W, 12); g.fillStyle = '#5a536a';
    for (let sx = 0; sx < W; sx += 16) g.fillRect(sx, 108, 1, 12);
    g.fillStyle = '#6b6480'; g.fillRect(0, 108, W, 1);
    g.fillStyle = '#2e2a3a'; g.fillRect(0, 119, W, 2); // curb
    // street
    g.fillStyle = '#25212f'; g.fillRect(0, 121, W, 14);
    for (let i = 0; i < 300; i++) { g.fillStyle = r() > 0.5 ? '#2b2736' : '#1f1b29'; g.fillRect(Math.floor(r() * W), 121 + Math.floor(r() * 14), 1, 1); }
    g.fillStyle = '#c9b25a'; for (let sx = 6; sx < W; sx += 24) g.fillRect(sx, 129, 10, 1);
    // street lamps
    for (const lx of [22, 214]) { g.fillStyle = '#17131f'; g.fillRect(lx, 48, 2, 62); g.fillRect(lx - 6, 46, 10, 2); g.fillStyle = '#ffe9a8'; g.fillRect(lx - 7, 48, 5, 2);
      g.fillStyle = 'rgba(255,233,168,0.08)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(lx - 5, 50); g.lineTo(lx - 5 - 10 - k * 3, 120); g.lineTo(lx - 5 + 10 + k * 3, 120); g.fill(); } }
    // crowd silhouettes on sidewalk
    for (const [cx, h] of [[40, 16], [47, 14], [150, 15], [158, 17], [176, 13], [190, 16]]) { g.fillStyle = '#120e1a'; g.fillRect(cx - 2, 108 - h, 5, h - 3); g.fillRect(cx - 1, 108 - h - 4, 3, 4); g.fillRect(cx - 3, 108 - h + 2, 7, 5); }
    base = document.createElement('canvas'); base.width = W * S; base.height = H * S;
    const bg = base.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, W * S, H * S);
  }
  function draw(ctx, t) {
    if (!base) build();
    ctx.drawImage(base, 0, 0);
    // neon sign flicker
    const on = !(Math.floor(t / 7) % 23 === 0 || Math.floor(t / 5) % 41 === 1);
    ctx.save(); ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a0d1a'; ctx.fillRect(296, 286, 136, 30);
    if (on) { ctx.shadowColor = '#ff3d8b'; ctx.shadowBlur = 14; ctx.fillStyle = '#ff7ab6'; } else ctx.fillStyle = '#5a2a40';
    ctx.fillText('BAR DO ZÉ', 364, 302); ctx.restore();
  }
  return { draw, FLOOR: 480 };
})();
