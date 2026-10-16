'use strict';
/* ============ APP: navigation, events, boot ============ */
const TABS = [['home', 'home'], ['spaces', 'spaces'], ['board', 'board'], ['plan', 'plan']];
function buildNav() {
  $('#nav .bar').innerHTML = TABS.map(([k, i]) => '<button class="tab' + (V.tab === k ? ' on' : '') + '" role="tab" aria-selected="' + (V.tab === k) + '" data-a="tab" data-k="' + k + '">' + ico(i, 22, 1.9) + '<span>' + esc(t(k)) + '</span></button>').join('');
  $('#plusBtn').innerHTML = ico('plus', 26, 2.4); $('#plusBtn').setAttribute('aria-label', t('addIt'));
}
const RENDER = { home: renderHome, spaces: renderSpaces, board: renderBoard, plan: renderPlan };
function render() {
  if (!S) return;
  const el = $('#s-' + V.tab); const y = el.scrollTop; RENDER[V.tab](); el.scrollTop = y;
  if (V.card) { const c = $('#s-card'); const y2 = c.scrollTop; renderCard(); c.scrollTop = y2; }
  if (V.settingsOpen) renderSettings();
}
function go(tab) {
  if (V.card) closeCard(true);
  if (V.settingsOpen) closeSettings(true);
  const same = V.tab === tab;
  V.tab = tab;
  $$('.scr:not(.push)').forEach(s => s.classList.toggle('on', s.id === 's-' + tab));
  $$('#nav .tab').forEach(b => { const on = b.dataset.k === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  RENDER[tab]();
  if (same) $('#s-' + tab).scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
}
ACT.tab = el => go(el.dataset.k);
function openCard(id) {
  if (!cardById(id)) return;
  if (V.settingsOpen) closeSettings(true);
  V.card = id; const el = $('#s-card'); el.classList.remove('out'); renderCard(); el.scrollTop = 0; el.classList.add('on');
  $('#nav').classList.add('away'); document.body.classList.add('navless');
}
function closeCard(instant) {
  const el = $('#s-card'); if (!V.card) return; V.card = null;
  $('#nav').classList.remove('away'); document.body.classList.remove('navless');
  if (instant || RM) { el.classList.remove('on', 'out'); el.innerHTML = ''; }
  else { el.classList.add('out'); setTimeout(() => { if (!V.card) { el.classList.remove('on', 'out'); el.innerHTML = ''; } }, 330); }
  RENDER[V.tab]();
}
ACT.openCard = el => { if (el._suppress && Date.now() - el._suppress < 500) return; openCard(el.dataset.id); };
ACT.closeCard = () => closeCard();
function openSettings() { V.settingsOpen = true; V.settingsPage = 'main'; const el = $('#s-settings'); el.classList.remove('out'); renderSettings(); el.scrollTop = 0; el.classList.add('on'); $('#nav').classList.add('away'); document.body.classList.add('navless'); refreshOldFlag(); }
function closeSettings(instant) {
  const el = $('#s-settings'); if (!V.settingsOpen) return; V.settingsOpen = false;
  if (!V.card) { $('#nav').classList.remove('away'); document.body.classList.remove('navless'); }
  if (instant || RM) { el.classList.remove('on', 'out'); el.innerHTML = ''; }
  else { el.classList.add('out'); setTimeout(() => { if (!V.settingsOpen) { el.classList.remove('on', 'out'); el.innerHTML = ''; } }, 330); }
  RENDER[V.tab]();
}
ACT.openSettings = openSettings; ACT.closeSettings = () => closeSettings();

/* toggle done anywhere */
ACT.toggle = el => {
  const i = itemById(el.dataset.id); if (!i) return; const d = el.dataset.d || T();
  const v = !isDone(i, d); setDone(i, d, v); haptic();
  el.classList.toggle('on', v); const row = el.closest('.irow,.trow,.mini'); if (row) row.classList.toggle('done', v);
  if (!RM) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  toast(esc(v ? t('completed', i.t) : t('reopened')), { label: t('undo'), fn: () => { setDone(i, d, !v); render(); } });
  setTimeout(render, 420);
};

/* settings data actions */
ACT.exportData = async () => { try { const ok = await exportBackup(); if (ok) toast(esc(t('exported'))); } catch (e) { toast('Export failed'); } };
ACT.restoreData = () => $('#restoreIn').click();
ACT.sampleData = () => confirmSheet(t('sureSample'), t('yes'), async () => { await DB.clear('media'); MEDIA_URL.clear(); const keep = { name: S.name, lang: S.lang, wall: S.wall === 'photo' ? 'aurora' : S.wall, surface: S.surface, aura: S.aura, dim: S.dim, nudges: S.nudges, weekly: S.weekly }; S = await sampleState(keep); save(); applyLook(); closeSettings(true); go('home'); toast(esc(t('saved'))); }, false);
ACT.deleteAll = () => confirmSheet(t('sureDel'), t('deleteAll'), async () => { try { await DB.clear('media'); await DB.del('kv', 'state'); } catch (e) {} try { localStorage.removeItem('aurora-glass-state'); } catch (e) {} MEDIA_URL.clear(); const l = S.lang; S = blankState(); S.lang = l; applyLook(); closeSettings(true); V.tab = 'home'; showWelcome(); playIntro(); });
ACT.importOld = () => confirmSheet(t('replaceQ'), t('importOld'), async () => {
  try {
    const r = await importOld(); if (!r || !(r.cards.length + r.items.length + r.moments.length)) { toast(esc(t('nothingImport'))); return; }
    S.cards = r.cards; S.items = r.items; S.moments = r.moments; if (r.name && !S.name) S.name = r.name; S.onboarded = true; save();
    closeSettings(true); hideWelcome(); go('home'); toast(esc(t('imported', r.cards.length, r.items.length, r.moments.length)));
  } catch (e) { toast(esc(t('nothingImport'))); }
}, false);
async function refreshOldFlag() { const had = V.oldExists; V.oldExists = await oldAuroraExists(); if (had !== V.oldExists && V.settingsOpen) renderSettings(); }

$('#restoreIn').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { await restoreBackup(f); applyLook(); buildNav(); closeSettings(true); hideWelcome(); go('home'); toast(esc(t('restored'))); } catch (err) { toast(esc(t('badFile'))); } });
$('#wallIn').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const b = await compressImage(f, 2200); if (S.wallKey) delMedia(S.wallKey); S.wallKey = await putMedia(b); S.wall = 'photo'; save(); applyLook(); renderSettings(); });

/* ---------- welcome ---------- */
function showWelcome() {
  const w = $('#welcome');
  const draw = async () => {
    const old = await oldAuroraExists(); const cs = lang() === 'cs';
    const nm = 17 * 60 + 20;
    const arcs = [{ s: 14 * 60, e: 15 * 60, c: '#f0a44b', st: 'done' }, { s: 18 * 60, e: 18 * 60 + 45, c: '#3fbf7f', st: 'next' }, { s: 19 * 60, e: 20 * 60, c: '#6f8cff', st: 'later' }, { s: 20 * 60 + 30, e: 21 * 60, c: '#9fb3c4', st: 'later' }];
    w.innerHTML = '<div class="wtop"><button class="chip frost press" data-a="wLang" data-k="' + (cs ? 'en' : 'cs') + '">' + (cs ? 'EN' : 'CZ') + '</button><button class="chip frost press" data-a="tutorial">' + ico('play', 14, 2) + 'Video 20 s' + '</button></div>'
      + '<div class="wsl" id="wsl">'
      + '<section class="ws"><img class="wlogo" src="logo.svg" alt="aurora"><h1>' + (cs ? 'Tvůj den.<br>Jeden kruh.' : 'Your day.<br>One circle.') + '</h1><p>' + esc(cs ? 'Karty, plán a momenty. Všechno zůstává v telefonu.' : 'Cards, plan and moments. Everything stays on your phone.') + '</p></section>'
      + '<section class="ws"><div class="dialw wdemo">' + dialSVG(arcs, nm) + '<span class="orb" style="pointer-events:none"><span class="n">0:40</span><span class="s">' + esc(cs ? 'do Lekce 4' : 'to Lesson 4') + '</span></span></div><h2>' + esc(cs ? 'Den 06–24 v jednom ciferníku' : 'Your day 06–24 on one dial') + '</h2><p>' + esc(cs ? 'Oblouky jsou tvoje věci v barvě karty. Svítí jen to, co je teď a co je další.' : 'Arcs are your things in their card colour. Only now and next glow.') + '</p></section>'
      + '<section class="ws"><h2>' + esc(cs ? 'Jak ti mám říkat?' : 'What should I call you?') + '</h2><div class="fld frost namef"><input id="wName" placeholder="' + esc(cs ? 'Tvoje jméno' : 'Your name') + '" autocomplete="given-name" value="' + esc(S.name || '') + '" enterkeyhint="done"></div>'
      + '<p class="wsub">' + esc(cs ? 'Začneš první kartou: návyk nebo projekt. Zbytek přidáš přes +.' : 'You start with your first card: a habit or a project. Add the rest with +.') + '</p>'
      + (old ? '<button class="chip frost press wold" data-a="wImport">' + ico('import', 15, 2) + esc(cs ? 'Načíst moje data ze staré Aurory' : 'Load my data from old Aurora') + '</button>' : '') + '</section>'
      + '</div><div class="wfoot"><div class="wdots" id="wdots"><i class="on"></i><i></i><i></i></div><button class="pbtn cr press" id="wNext" data-a="wNext">' + esc(cs ? 'Dál' : 'Next') + '</button></div>';
    const n = $('#wName'); n.addEventListener('input', () => { S.name = n.value; }); n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } });
    const sl = $('#wsl'); sl.addEventListener('scroll', () => { const k = Math.round(sl.scrollLeft / sl.clientWidth); if (k === w._k) return; w._k = k; $$('#wdots i').forEach((d, j) => d.classList.toggle('on', j === k)); $('#wNext').textContent = k === 2 ? (lang() === 'cs' ? 'Začít' : 'Start') : (lang() === 'cs' ? 'Dál' : 'Next'); }, { passive: true });
    w._k = 0; w._mode = 'empty';
  };
  draw(); w.classList.add('on'); $('#nav').classList.add('away'); document.body.classList.add('navless');
  w._draw = draw;
}
ACT.wMode = el => { const w = $('#welcome'); w._mode = el.dataset.k; $$('.wmode button').forEach(b => b.classList.toggle('on', b === el)); const cs = lang() === 'cs';
  $('#wModeTx').textContent = el.dataset.k === 'sample' ? (cs ? 'Pár karet a dní, ať vidíš, jak to žije. Smažeš jedním klepnutím.' : 'A few cards and days so you see it live. Remove with one tap.') : el.dataset.k === 'empty' ? (cs ? 'Začneš první kartou. Zbytek přidáš přes +.' : 'You start with your first card. Add the rest with +.') : (cs ? 'Načte karty, plán a momenty ze staré Aurory. Stará zůstane, jak je.' : 'Loads cards, plan and moments from old Aurora. The old app stays as it is.'); };
ACT.wNext = () => { const w = $('#welcome'), sl = $('#wsl'); const k = Math.round(sl.scrollLeft / sl.clientWidth);
  if (k < 2) { sl.scrollTo({ left: (k + 1) * sl.clientWidth, behavior: RM ? 'auto' : 'smooth' }); return; }
  ACT.wEmpty(); };
function hideWelcome() { const w = $('#welcome'); if (!w.classList.contains('on')) return; w.classList.remove('on'); w.innerHTML = ''; if (!V.card && !V.settingsOpen) { $('#nav').classList.remove('away'); document.body.classList.remove('navless'); } }
ACT.wLang = el => { S.lang = el.dataset.k; applyLook(); buildNav(); $('#welcome')._draw(); };
ACT.wSample = async () => { const keep = { name: (S.name || '').trim(), lang: S.lang }; S = await sampleState(keep); save(); hideWelcome(); go('home'); };
ACT.wEmpty = () => { S.name = (S.name || '').trim(); S.onboarded = true; save(); hideWelcome(); go('home'); setTimeout(() => openCardSheet(null), 350); };
ACT.wImport = async () => {
  try { const r = await importOld(); if (!r || !(r.cards.length + r.items.length)) { toast(esc(t('nothingImport'))); return; }
    S.cards = r.cards; S.items = r.items; S.moments = r.moments; if (!S.name && r.name) S.name = r.name; S.onboarded = true; save(); hideWelcome(); go('home'); toast(esc(t('imported', r.cards.length, r.items.length, r.moments.length)));
  } catch (e) { toast(esc(t('nothingImport'))); }
};

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;
  const fn = ACT[el.dataset.a]; if (!fn) return;
  e.preventDefault(); fn(el, e);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-a]')) { e.preventDefault(); const fn = ACT[e.target.dataset.a]; fn && fn(e.target, e); }
  if (e.key === 'Escape') { if ($('#vlayer').classList.contains('on')) ACT.closeVideo(); else if (SH.open) closeSheet(); else if ($('#viewer').classList.contains('on')) closeViewer(); else if (V.card) closeCard(); else if (V.settingsOpen) closeSettings(); }
});
$('#plusBtn').addEventListener('click', () => { const ctx = {}; if (V.tab === 'board') ctx.mode = 'photo'; if (V.tab === 'plan' && V.planMode === 'list') ctx.date = V.planDay; if (V.tab === 'spaces' && V.spacesMode === 'deck') { const c = filteredCards()[V.deckIdx]; if (c) ctx.card = c.id; } openAdd(ctx); });
// edge swipe back for pushed screens
(function edgeBack() {
  let s = null;
  document.addEventListener('touchstart', e => { const x = e.touches[0].clientX; if (x > 24 || SH.open || $('#viewer').classList.contains('on')) { s = null; return; } if (!V.card && !V.settingsOpen) { s = null; return; } s = { x, y: e.touches[0].clientY }; }, { passive: true });
  document.addEventListener('touchend', e => { if (!s) return; const dx = e.changedTouches[0].clientX - s.x, dy = Math.abs(e.changedTouches[0].clientY - s.y); s = null; if (dx > 80 && dy < 60) { if (V.settingsOpen && V.settingsPage === 'look') ACT.settingsBack(); else if (V.settingsOpen) closeSettings(); else if (V.card) closeCard(); } }, { passive: true });
})();
// keep time fresh
let lastDay = T();
function tick() {
  if (!S || document.hidden) return;
  if (T() !== lastDay) { lastDay = T(); V.planDay = T(); V.planWeek = weekStart(T()); render(); return; }
  if (V.tab === 'home' && !V.card && !V.settingsOpen && !SH.open && !$('#viewer').classList.contains('on')) { const el = $('#s-home'); const y = el.scrollTop; renderHome(); el.scrollTop = y; }
}
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

/* ---------- boot ---------- */
async function boot() {
  let st = null;
  try { st = await loadState(); } catch (e) {}
  S = migrate(st || blankState());
  V.planDay = T(); V.planWeek = weekStart(T());
  try { await warmMedia(); } catch (e) {}
  applyLook(); buildNav();
  $('#s-home').classList.add('on'); renderHome();
  const q = new URLSearchParams(location.search);
  if (q.has('sample') && !S.onboarded) { S = await sampleState({ lang: q.get('lang') || S.lang }); save(); renderHome(); }
  if (S.wall === 'ember' || S.wall === 'night') { S.wall = 'aurora'; save(); applyLook(); }
  if (!S.onboarded) { showWelcome(); playIntro(); }
  if (q.get('tab') && RENDER[q.get('tab')]) go(q.get('tab'));
  refreshOldFlag();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast(esc(t('updateReady')), { label: t('reload'), fn: () => location.reload() }); }); });
    }).catch(() => {});
  }
  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
}
boot();

/* app feel: fixed header scroll edge, no page zoom */
document.addEventListener('scroll', e => { const s = e.target; if (s && s.classList && s.classList.contains('scr')) s.classList.toggle('sc', s.scrollTop > 4); }, true);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => { if (!e.target.closest('#viewer')) e.preventDefault(); }, { passive: false });
