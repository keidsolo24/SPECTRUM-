'use strict';
/* ============ UI primitives ============ */
const ACT = {}; // action registry: data-a="name"
const IC = {
  pause: '<rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
  spaces: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  board: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  pin: '<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 3-5 3.6-8.4C12 9 13 11 13 12.5c.9-.6 1.6-1.8 1.8-3.2C17 11 18 13.2 18 15.4 18 18.6 15.6 21 12 21z"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  card: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 10h8M8 14h5"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor" stroke="none"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
  film: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  import: '<path d="M4 12h11M11 8l4 4-4 4"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>',
};
function ico(n, s = 20, w = 2) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };

/* ---------- geometry ---------- */
function polar(C, r, a) { const t = a * Math.PI / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)]; }
function arcD(C, r, a0, a1) { const [x0, y0] = polar(C, r, a0), [x1, y1] = polar(C, r, a1); return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2); }
const DIAL_START = 6 * 60, DIAL_SPAN = 18 * 60;
const dAng = m => clamp((m - DIAL_START) / DIAL_SPAN, 0, 1) * 360;

function dialSVG(arcs, now) {
  const C = 106, R = 82; let h = '';
  for (let k = 0; k < 72; k++) { if (k % 24 === 0) continue; const [x, y] = polar(C, R + 16, k / 72 * 360); h += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (k % 4 === 0 ? 1.4 : .9) + '" fill="rgba(243,234,216,' + (k % 4 === 0 ? .55 : .28) + ')"/>'; }
  h += '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="rgba(243,234,216,.13)" stroke-width="1.5"/>';
  const A = dAng(now), N = 56;
  if (A > 1) { h += '<g class="elapsed">'; for (let k = 0; k < N; k++) { const a0 = A * k / N, a1 = A * (k + 1) / N + .4, o = .04 + .9 * Math.pow((k + 1) / N, 1.6); h += '<path d="' + arcD(C, R, a0, Math.min(a1, A)) + '" fill="none" stroke="rgba(255,250,240,' + o.toFixed(3) + ')" stroke-width="3"/>'; } h += '</g>'; }
  arcs.forEach((a, k) => {
    let a0 = dAng(a.s) + 1.6, a1 = dAng(a.e) - 1.6; if (a1 - a0 < 3) { const m = (a0 + a1) / 2; a0 = m - 1.5; a1 = m + 1.5; }
    const d = arcD(C, R, a0, a1);
    h += '<path class="arcI ' + a.st + '" style="--c:' + a.c + '" d="' + d + '" fill="none" stroke="' + a.c + '" stroke-width="6" stroke-linecap="round"/>';
    h += '<path class="hit" data-a="peek" data-k="' + k + '" d="' + d + '" fill="none" stroke="transparent" stroke-width="28"/>';
  });
  const [x, y] = polar(C, R, A);
  h += '<g class="hand"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="13" fill="rgba(255,226,170,.18)"/><circle class="knob" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6.5" fill="#fffaf0"/></g>';
  return '<svg width="212" height="212" viewBox="0 0 212 212" aria-hidden="true">' + h + '</svg>';
}
function ringSVG(size, frac, color, stroke = 4) {
  const C = size / 2, R = C - stroke - 3; frac = clamp(frac, 0, 1); let h = '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="rgba(243,234,216,.16)" stroke-width="' + stroke + '"/>';
  if (frac > 0.001) {
    const a1 = Math.min(frac * 360, 359.9);
    h += '<path class="rarc" d="' + arcD(C, R, 0.01, a1) + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round"/>';
    const [x, y] = polar(C, R, a1); h += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (stroke * .9).toFixed(1) + '" fill="#fff" style="filter:drop-shadow(0 0 5px ' + color + ') drop-shadow(0 0 10px ' + color + ')"/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true" style="overflow:visible">' + h + '</svg>';
}
function segRing(size, n, on, color, stroke = 5, todayIdx = -1) {
  const C = size / 2, R = C - stroke - 3; let h = '';
  for (let k = 0; k < n; k++) {
    const a0 = k / n * 360 + 6, a1 = (k + 1) / n * 360 - 6;
    const st = on[k] ? 'stroke="' + color + '" style="filter:drop-shadow(0 0 5px ' + color + ')"' : 'stroke="rgba(243,234,216,' + (k > todayIdx && todayIdx >= 0 ? .1 : .2) + ')"';
    h += '<path d="' + arcD(C, R, a0, a1) + '" fill="none" ' + st + ' stroke-width="' + stroke + '" stroke-linecap="round"/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true" style="overflow:visible">' + h + '</svg>';
}
function spark(vals, color, w = 62, h = 26) {
  const mx = Math.max(1, ...vals); const n = vals.length; if (n < 2) return '';
  const pts = vals.map((v, k) => [1 + k * (w - 6) / (n - 1), h - 3 - v / mx * (h - 8)]);
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let k = 1; k < n; k++) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; const cx = (x0 + x1) / 2; d += ' C' + cx.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1); }
  const [lx, ly] = pts[n - 1];
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" style="overflow:visible;margin-bottom:2px"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round"/><circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3" fill="#fff" style="filter:drop-shadow(0 0 5px ' + color + ')"/></svg>';
}
function cardIcon(c) { return c.type === 'habit' ? (/health|zdrav|pohyb|run|sport|tren/i.test(c.name) ? 'heart' : /uč|uc|learn|study|škol|skol|read|čt/i.test(c.name) ? 'book' : 'flame') : 'spark'; }

/* ---------- aura ---------- */
function setAura(cols) { const r = document.documentElement.style; const c = [...cols, '#3fbf7f', '#f0a44b', '#6f8cff']; r.setProperty('--a1', c[0]); r.setProperty('--a2', c[1]); r.setProperty('--a3', c[2]); }
function auraFromCards(first) { const cs = S.cards.map(c => c.color); setAura(first ? [first, ...cs.filter(x => x !== first)] : cs); }

/* ---------- toast ---------- */
let toastT = null;
function toast(msg, action) {
  const el = $('#toast'); clearTimeout(toastT);
  el.innerHTML = '<div class="in2 frost"><span>' + msg + '</span>' + (action ? '<button class="cr press" id="toastBtn">' + esc(action.label) + '</button>' : '') + '</div>';
  if (action) $('#toastBtn').onclick = () => { el.classList.remove('on'); action.fn(); };
  requestAnimationFrame(() => el.classList.add('on'));
  toastT = setTimeout(() => el.classList.remove('on'), action ? 5000 : 2400);
}

/* ---------- sheet ---------- */
const SH = { open: false, onClose: null, dirty: null };
function openSheet(o) {
  const el = $('#sheet');
  el.innerHTML = '<div class="grab"><i></i></div><div class="sh"><div class="l">' + (o.left !== false ? '<button class="lnk" data-a="sheetCancel">' + esc(o.leftLabel || t('cancel')) + '</button>' : '') + '</div><div class="tl">' + esc(o.title || '') + '</div><div class="rt">' + (o.right ? '<button class="save cr press" id="sheetSave"' + (o.rightDisabled ? ' disabled' : '') + '>' + esc(o.right) + '</button>' : '') + '</div></div><div class="sb">' + o.body + '</div>';
  SH.onClose = o.onClose || null; SH.onSave = o.onSave || null; SH.dirty = o.dirty || null; SH.open = true;
  if (o.right) $('#sheetSave').onclick = () => { if (SH.onSave) SH.onSave(); };
  $('#scrim').classList.add('on'); el.classList.remove('drag');
  el.style.transform = '';
  requestAnimationFrame(() => el.classList.add('on'));
  o.mount && o.mount(el);
  document.body.classList.add('sheeting');
}
function closeSheet(force) {
  if (!SH.open) return;
  if (!force && SH.dirty && SH.dirty()) { confirmInline(); return; }
  const el = $('#sheet'); el.classList.remove('on'); el.style.transform = ''; $('#scrim').classList.remove('on'); SH.open = false;
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  const cb = SH.onClose; SH.onClose = null; cb && cb();
  document.body.classList.remove('sheeting');
  setTimeout(() => { if (!SH.open) el.innerHTML = ''; }, 450);
}
function confirmInline() {
  const sb = $('#sheet .sb'); if (!sb || $('#discardBar')) return;
  const d = document.createElement('div'); d.id = 'discardBar'; d.className = 'btnrow'; d.style.margin = '0 0 14px';
  d.innerHTML = '<button class="pbtn ghost press" data-a="discardNo">' + esc(t('cancel')) + '</button><button class="pbtn danger press" data-a="discardYes">' + (lang() === 'cs' ? 'Zahodit' : 'Discard') + '</button>';
  sb.prepend(d); sb.scrollTop = 0;
}
ACT.discardNo = () => { const d = $('#discardBar'); d && d.remove(); };
ACT.discardYes = () => closeSheet(true);
ACT.sheetCancel = () => closeSheet();
function confirmSheet(text, okLabel, fn, danger = true) {
  openSheet({
    title: '', body: '<div style="padding:8px 4px 4px;font:500 17px/1.45 Inter;text-align:center">' + esc(text) + '</div><div class="btnrow"><button class="pbtn ghost press" data-a="sheetCancel">' + esc(t('cancel')) + '</button><button class="pbtn ' + (danger ? 'danger' : 'cr') + ' press" id="cfOk">' + esc(okLabel) + '</button></div>',
    mount: () => { $('#cfOk').onclick = () => { closeSheet(true); fn(); }; }
  });
}
(function sheetDrag() {
  let y0 = null, dy = 0, t0 = 0;
  const el = () => $('#sheet');
  document.addEventListener('pointerdown', e => {
    if (!SH.open) return; const g = e.target.closest('#sheet .grab, #sheet .sh'); if (!g || e.target.closest('button')) return;
    y0 = e.clientY; dy = 0; t0 = Date.now(); el().classList.add('drag');
  });
  document.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); el().style.transform = 'translateY(' + dy + 'px)'; });
  const end = () => { if (y0 == null) return; const v = dy / Math.max(1, Date.now() - t0); el().classList.remove('drag'); if (dy > 110 || v > .6) closeSheet(); else el().style.transform = ''; y0 = null; };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();
$('#scrim').addEventListener('click', () => closeSheet());

/* ---------- keyboard / visual viewport ---------- */
(function vv() {
  const v = window.visualViewport; if (!v) return;
  const up = () => {
    const kb = Math.max(0, window.innerHeight - v.height - v.offsetTop);
    document.documentElement.style.setProperty('--kb', kb + 'px');
    document.documentElement.style.setProperty('--vvh', v.height + 'px');
  };
  v.addEventListener('resize', up); v.addEventListener('scroll', up); up();
})();

/* ---------- video manual ---------- */
function playTutorial() {
  const L2 = $('#vlayer');
  L2.innerHTML = '<button class="cb frost x press" data-a="closeVideo" aria-label="' + esc(t('close')) + '">' + ico('x', 20, 2.2) + '</button><video src="tutorial.mp4" poster="tutorial-poster.jpg" controls playsinline autoplay preload="auto"></video>';
  L2.classList.add('on');
  const v = $('video', L2); v.play && v.play().catch(() => {});
  v.onended = () => setTimeout(() => ACT.closeVideo(), 600);
}
ACT.closeVideo = () => { const L2 = $('#vlayer'); const v = $('video', L2); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } L2.classList.remove('on'); L2.innerHTML = ''; };
ACT.tutorial = () => playTutorial();

/* ---------- number swap animation ---------- */
function swapText(el, txt) { if (!el || el.textContent === txt) return; if (RM) { el.textContent = txt; return; } el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 140, fill: 'forwards' }).onfinish = () => { el.textContent = txt; el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); }; }
function pulse(el, glow) { if (!el || RM) return; el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.4,.5,1)' }); if (glow) el.animate([{ boxShadow: '0 0 0 0 ' + glow }, { boxShadow: '0 0 0 3px ' + glow + ', 0 0 26px ' + glow }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1000 }); }
