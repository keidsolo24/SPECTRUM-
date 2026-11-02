'use strict';
/* ============ DESKTOP (window ≥ 1100 px) ============
   Same data and actions as the phone, laid out on a 12-column grid. The phone screens are not
   touched: on a wide window #app is hidden and #desk is drawn instead. */
const DESK = { mq: matchMedia('(min-width: 900px)'), wide: matchMedia('(min-width: 1100px)'), fine: matchMedia('(pointer: fine)'), on: false, mode: 'week', drag: null };
V.boardType = V.boardType || 'all';
/* computer layout: wide window (≥1100 px), or ≥900 px with a mouse; Settings → Layout can force it */
function deskWant() {
  if (!S) return false;
  if (S.layout === 'desk') return window.innerWidth >= 700;
  if (S.layout === 'mobile') return false;
  return DESK.wide.matches || (DESK.mq.matches && DESK.fine.matches);
}
function layoutLabel() { const cs = lang() === 'cs'; return S.layout === 'desk' ? (cs ? 'Vždy počítač' : 'Always computer') : S.layout === 'mobile' ? (cs ? 'Vždy telefon' : 'Always phone') : (cs ? 'Automaticky' : 'Automatic'); }
ACT.layoutSheet = () => {
  const cs = lang() === 'cs'; const cur = S.layout || 'auto';
  openSheet({ title: cs ? 'Rozložení' : 'Layout', leftLabel: t('close'), body: '<div class="muted" style="font:400 14px/1.45 Inter;margin:0 2px 14px">' + esc(cs ? 'Automaticky: na počítači a v širokém okně se Aurora rozloží na celou plochu, na telefonu zůstane jako teď.' : 'Automatic: on a computer or a wide window Aurora uses the full screen; on a phone it stays as it is.') + '</div><section class="grp frost solid">'
    + [['auto', cs ? 'Automaticky' : 'Automatic'], ['desk', cs ? 'Vždy počítač' : 'Always computer'], ['mobile', cs ? 'Vždy telefon' : 'Always phone']].map(([k, l]) => '<button class="srow" data-a="setLayout" data-k="' + k + '">' + esc(l) + '<span class="r">' + (cur === k ? ico('check', 16, 2.6) : '') + '</span></button>').join('') + '</section>' });
};
ACT.setLayout = el => { S.layout = el.dataset.k === 'auto' ? undefined : el.dataset.k; save(); closeSheet(true); if (V.settingsOpen) closeSettings(true); setTimeout(deskCheck, 50); };

function deskCheck() {
  const on = deskWant();
  if (on === DESK.on) return;
  DESK.on = on; document.body.classList.toggle('desk', on); applyLook();
  if (on) { if (V.settingsOpen) _closeSettings(true); document.body.classList.remove('dset'); if (SH.open) closeSheet(true); deskRender(); }
  else { cmdkClose(); if (V.settingsOpen) _closeSettings(true); document.body.classList.remove('dset'); const d = $('#desk'); if (d) d.innerHTML = ''; const card = V.card; V.card = null; go(V.tab); if (card) openCard(card); }
}
DESK.mq.addEventListener('change', deskCheck); DESK.wide.addEventListener('change', deskCheck); DESK.fine.addEventListener('change', deskCheck); window.addEventListener('resize', () => { clearTimeout(DESK.rt); DESK.rt = setTimeout(deskCheck, 150); });

/* route the app's own render / navigation to the desktop when it is on */
const _render = render, _go = go, _openCard = openCard, _closeCard = closeCard, _renderCard = renderCard, _openSettings = openSettings, _closeSettings = closeSettings;
render = function () { if (DESK.on) { deskRender(); if (V.settingsOpen) renderSettings(); return; } _render(); };
go = function (tab) { if (!DESK.on) return _go(tab); if (V.settingsOpen) closeSettings(true); V.card = null; V.tab = tab; deskRender(true); };
renderCard = function () { if (DESK.on && !DESK.mounting) { deskRender(); return; } _renderCard(); };
openSettings = function () { _openSettings(); document.body.classList.toggle('dset', DESK.on); };
closeSettings = function (instant) { _closeSettings(DESK.on ? true : instant); document.body.classList.remove('dset'); if (DESK.on) deskRender(); };
ACT.openSettings = openSettings; ACT.closeSettings = () => closeSettings();
openCard = function (id) { if (!DESK.on) return _openCard(id); if (!cardById(id)) return; V.card = id; deskRender(true); };
closeCard = function (instant) { if (!DESK.on) return _closeCard(instant); V.card = null; deskRender(true); };

const greet = () => { const h = new Date().getHours(); const cs = lang() === 'cs'; return (h < 11 ? (cs ? 'Dobré ráno' : 'Good morning') : h < 18 ? (cs ? 'Dobrý den' : 'Good afternoon') : (cs ? 'Dobrý večer' : 'Good evening')) + (S.name ? ', ' + S.name : ''); };
const dLong = d => { const x = dOf(d); return lang() === 'cs' ? ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'][dow(d)] + ' ' + x.getDate() + '. ' + ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'][x.getMonth()] : x.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); };
const kbd = k => '<span class="kbd">' + k + '</span>';
const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl ';

function deskTop() {
  const tabs = [['home', 'home'], ['spaces', 'spaces'], ['board', 'board'], ['plan', 'plan']];
  const cur = V.card ? 'spaces' : V.tab;
  return '<header class="dtop g12"><button class="dlogo" data-a="tab" data-k="home" aria-label="Aurora"><img src="logo.svg" alt="aurora"></button>'
    + '<nav class="dnav frost" aria-label="' + esc(lang() === 'cs' ? 'Sekce' : 'Sections') + '">' + tabs.map(([k, i], n) => '<button class="' + (cur === k ? 'on' : '') + '" data-a="tab" data-k="' + k + '" title="' + (n + 1) + '">' + ico(i, 18, 1.9) + esc(t(k)) + '</button>').join('') + '</nav>'
    + '<div class="drt"><button class="cb frost press" data-a="syncPageD" aria-label="Sync"><span id="syncDot" class="sdot"></span>' + ico('sync', 18, 1.9) + '</button>'
    + '<button class="cb frost press" data-a="notifPageD" aria-label="' + esc(t('notif')) + '">' + ico(S.push && S.push.on ? 'bell' : 'bellOff', 19, 1.9) + '</button>'
    + '<button class="cb frost press" data-a="openSettings" aria-label="' + esc(t('settings')) + '">' + ico('gear', 20, 1.8) + '</button>'
    + '<button class="dadd cr press" data-a="add">' + ico('plus', 18, 2.4) + '<span class="dlbl">' + esc(t('addIt')) + '</span>' + kbd('N') + '</button></div></header>';
}
function deskRender(scrollTop) {
  if (!DESK.on || !S) return;
  if (DESK.drag) return; // a drop always renders afterwards
  const el = $('#desk');
  // keep whatever is being typed when data arrives from the other device
  const a = document.activeElement; const keepF = a && a.id && el.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName) ? { id: a.id, v: a.value, s: a.selectionStart, e: a.selectionEnd } : null; const keep = !scrollTop && el.querySelector('.dmain') ? el.querySelector('.dmain').scrollTop : 0;
  let main;
  if (V.card && cardById(V.card)) main = deskCard();
  else if (V.tab === 'plan') main = deskPlan();
  else if (V.tab === 'board') main = deskBoard();
  else if (V.tab === 'spaces') main = deskSpaces();
  else main = deskHome();
  el.innerHTML = deskTop() + main;
  if (scrollTop === true) { const dm = el.querySelector('.dmain'); if (dm) dm.classList.add('enter'); }
  const m = el.querySelector('.dmain'); if (m && keep) m.scrollTop = keep;
  if (V.card) deskCardMount();
  if (V.tab === 'board' && !V.card) deskBoardMount();
  const wb = $('#wBody'); if (wb) { if (DESK.wscroll == null) { const c = wb.firstChild.offsetHeight; DESK.wscroll = Math.max(0, (clamp(nowMin(), 480, 1260) - 360 - 120) / 1080 * c); } wb.scrollTop = DESK.wscroll; wb.addEventListener('scroll', () => { DESK.wscroll = wb.scrollTop; }, { passive: true }); }
  syncBadge();
  if (!V.card) auraFromCards(null);
  if (keepF) { const f = document.getElementById(keepF.id); if (f && f !== document.activeElement) { f.value = keepF.v; try { f.focus(); f.setSelectionRange(keepF.s, keepF.e); } catch (e) {} f.dispatchEvent(new Event('input')); } }
}
ACT.syncPageD = () => { openSettings(); ACT.syncPage(); };
ACT.notifPageD = () => { openSettings(); ACT.notifPage(); };

/* ---------------- DOMŮ ---------------- */
V.deskDay = null;
function deskHome() {
  const M = homeModel(); const [n, s] = orbText(M); const nx = M.nextAny; const cs = lang() === 'cs';
  const day = V.deskDay || T();
  const rest = M.list.filter(i => !isDone(i, M.d) && i !== nx);
  const now = '<div class="nowl"><b>' + mtime(M.nm) + '</b><i></i></div>';
  // left: now
  const pill = nx ? '<button class="fp frost grow press" data-a="openItem" data-id="' + nx.id + '"><span class="ic"><span class="led" style="--c:' + cardColor(nx.card) + '"></span></span><span class="pt"><span>' + esc(nx.t) + '</span><small>' + esc([nx.time || t('anyTime'), nx.card && cardById(nx.card) ? cardById(nx.card).name : ''].filter(Boolean).join(' · ')) + '</small></span></button><button class="fp frost press" style="padding-right:18px" data-a="homeDone" data-id="' + nx.id + '"><span class="ic">' + ico('check', 18, 2.4) + '</span>' + esc(t('done')) + '</button>'
    : '<button class="fp frost grow press" data-a="add" data-ctx="today"><span class="ic">' + ico('plus', 18, 2.4) + '</span><span class="pt"><span>' + esc(t('addForToday')) + '</span><small>' + esc(dayShort(M.d)) + '</small></span></button>';
  const left = '<section class="pn frost phnow" style="grid-column:1/5"><div class="ph2"><span class="cap">' + esc(cs ? 'Teď' : 'Now') + '</span><span class="muted">' + (M.list.length ? t('ofDone', M.doneN, M.list.length) : esc(t('nothingToday'))) + '</span></div>'
    + '<div class="ddial" id="dialw">' + dialSVG(M.arcs, M.nm) + '<button class="orb press" data-a="orbTap"><span class="n">' + esc(n) + '</span><span class="s">' + esc(s) + '</span></button></div>'
    + '<div class="prow">' + pill + '</div>'
    + '<div class="pfoot"><span class="cap">' + esc(t('then')) + '</span>' + (rest.slice(0, 3).map(i => trow(i, i.date && i.date < M.d && !i.repeat ? i.date : M.d, null)).join('') || '<div class="muted dempty">' + esc(t('nothingElse')) + '</div>') + '</div></section>';
  // middle: the day
  const its = itemsOn(day); const od = day === T() ? overdueItems() : [];
  let rows = '', placed = day !== T();
  its.forEach(i => { if (!placed && (!i.time || tmin(i.time) > M.nm)) { rows += now; placed = true; } rows += trow(i, day, M.nextT && M.nextT.id); });
  if (!placed && its.length) rows += now;
  const strip = weekDays(day).map(d => '<button class="dsd' + (d === day ? ' on' : '') + (d === T() ? ' tdy' : '') + '" data-a="dHomeDay" data-d="' + d + '"><span>' + WD[lang()][dow(d)] + '</span><b>' + dOf(d).getDate() + '</b><i>' + dayDots(d) + '</i></button>').join('');
  const mid = '<section class="pn frost solid phday" style="grid-column:5/10"><div class="ph2"><b class="pt">' + esc(dayFull(day)) + '</b><span class="muted">' + (its.length + od.length ? esc(t('leftN', its.filter(i => !isDone(i, day)).length + od.length)) : '') + '</span></div>'
    + '<div class="dstrip">' + strip + '</div><div class="pscroll">'
    + (od.length ? '<div class="cap" style="color:#ffb3a9;margin:8px 0 2px">' + esc(t('overdue')) + '</div>' + od.map(i => trow(i, i.date, null)).join('') + '<div class="sep"></div>' : '')
    + (its.length ? rows : '<div class="muted dempty">' + esc(t('emptyDay')) + '</div>') + '</div>'
    + '<button class="addday in press" data-a="add" data-date="' + day + '">' + ico('plus', 16, 2.2) + esc(t('addTo', cs && Math.abs(daysBetween(T(), day)) <= 1 ? dayName(day).toLowerCase() : dayName(day))) + '</button></section>';
  // right: cards, no-day, ideas
  const cards = S.cards.slice(0, 4).map(c => { const hb = c.type === 'habit'; const g = hb ? goalOf(c) : 0; const k = hb ? habitWeek(c.id).filter(Boolean).length : projectStats(c.id).done; const tot = hb ? g : Math.max(1, projectStats(c.id).total);
    return '<button class="krow press" data-a="openCard" data-id="' + c.id + '"><span class="kr">' + ringSVG(40, k / tot, c.color, 3.5) + '</span><span class="kt"><span>' + esc(c.name) + '</span><small>' + esc(hb ? (k >= g ? (cs ? 'cíl splněn ✓' : 'goal met ✓') : goalText(g)) : (c.deadline ? t('deadline') + ' ' + deadlineText(c.deadline) : projectStats(c.id).open + ' ' + t('open'))) + '</small></span><span class="num" style="font-size:22px">' + k + '<small>/' + tot + '</small></span></button>'; }).join('')
    || '<button class="krow press" data-a="newCard"><span class="kr">' + ico('plus', 20, 1.9) + '</span><span class="kt"><span>' + esc(t('newCard')) + '</span><small>' + esc(t('newCardSub')) + '</small></span></button>';
  const nd = undatedItems();
  const ideas = S.moments.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 2);
  const right = '<div class="dstk" style="grid-column:10/13">'
    + '<section class="pn frost"><div class="ph2"><span class="cap">' + esc(cs ? 'Karty · tento týden' : 'Cards · this week') + '</span><button class="muted lnk" data-a="tab" data-k="spaces">Spaces ›</button></div>' + cards + '</section>'
    + '<section class="pn frost"><div class="ph2"><span class="cap">' + esc(t('noDayYet')) + ' · ' + nd.length + '</span><button class="muted lnk" data-a="tab" data-k="plan">' + esc(cs ? 'naplánovat ›' : 'plan ›') + '</button></div>' + (nd.length ? '<div class="chips wrap">' + nd.slice(0, 6).map(i => '<button class="chip in press" data-a="when" data-id="' + i.id + '"><span class="dot" style="--c:' + cardColor(i.card) + '"></span>' + esc(i.t) + '</button>').join('') + '</div>' : '<div class="muted dempty">' + esc(cs ? 'Všechno má svůj den.' : 'Everything has a day.') + '</div>') + '</section>'
    + '<section class="pn frost grow"><div class="ph2"><span class="cap">' + esc(cs ? 'Nové nápady' : 'New ideas') + '</span><button class="muted lnk" data-a="tab" data-k="board">Board ›</button></div>' + (ideas.length ? '<div class="dideas">' + ideas.map(tileMoment).join('') + '</div>' : '<button class="addday in press" data-a="add" data-mode="note">' + ico('plus', 16, 2.2) + esc(cs ? 'Hodit nápad' : 'Add an idea') + '</button>') + '</section></div>';
  const hdr = '<div class="dph"><div><h1>' + esc(greet()) + '</h1><span class="sub">' + esc(dLong(T())) + (M.list.length ? ' · ' + t('ofDone', M.doneN, M.list.length) : '') + '</span></div>'
    + '<button class="dqb frost press" data-a="cmdk"><span>' + esc(cs ? 'Napiš cokoliv… „trénink po st pá v 18“' : 'Type anything… “gym mon wed fri at 6pm”') + '</span>' + kbd(MOD + 'K') + '</button></div>';
  return '<main class="dmain g12 rows dhome">' + hdr + left + mid + right + '</main>';
}
ACT.dHomeDay = el => { V.deskDay = el.dataset.d === T() ? null : el.dataset.d; deskRender(); };

/* ---------------- ⌘K ---------------- */
const CK = { q: '', sel: 0, list: [] };
function cmdkOpen(q = '') {
  let o = $('#cmdk'); if (!o) { o = document.createElement('div'); o.id = 'cmdk'; document.body.appendChild(o); }
  CK.q = q; CK.sel = 0;
  o.innerHTML = '<div class="ckscrim" data-a="cmdkClose"></div><div class="ckp" role="dialog" aria-modal="true" aria-label="' + esc(lang() === 'cs' ? 'Napiš cokoliv' : 'Type anything') + '"><div class="ckin"><span class="muted">' + ico('search', 20, 2) + '</span><div class="ckf"><div class="mirror" id="ckMirror"></div><input id="ckIn" autocomplete="off" spellcheck="false" placeholder="' + esc(lang() === 'cs' ? 'Napiš plán, nápad, odkaz nebo hledej…' : 'Type a plan, an idea, a link or search…') + '"></div>' + kbd('esc') + '</div><div id="ckBody"></div></div>';
  o.classList.add('on');
  const i = $('#ckIn'); i.value = q; i.focus();
  i.addEventListener('input', () => { CK.q = i.value; CK.sel = 0; cmdkPaint(); });
  i.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); CK.sel = Math.min(CK.list.length - 1, CK.sel + 1); cmdkPaint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); CK.sel = Math.max(0, CK.sel - 1); cmdkPaint(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = CK.list[CK.sel]; it && cmdkRun(it); }
    else if (e.key === 'Tab') { e.preventDefault(); const it = CK.list.find(x => x.kind === 'idea'); it && cmdkRun(it); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cmdkClose(); }
  });
  cmdkPaint();
}
function cmdkClose() { const o = $('#cmdk'); if (o) { o.classList.remove('on'); o.innerHTML = ''; } }
ACT.cmdk = () => cmdkOpen();
ACT.cmdkClose = cmdkClose;
function cmdkPaint() {
  const q = CK.q.trim(); const cs = lang() === 'cs'; const out = [];
  const p = NL(q); const title = stripSpans(q, p.spans) || q;
  const mir = $('#ckMirror');
  if (mir) { let h = '', last = 0; p.spans.forEach(([a, b]) => { h += esc(q.slice(last, a)) + '<mark>' + esc(q.slice(a, b)) + '</mark>'; last = b; }); mir.innerHTML = h + esc(q.slice(last)); }
  const hits = [];
  if (q) {
    if (isURL(q)) out.push({ kind: 'idea', icon: 'link', t: cs ? 'Přidat odkaz na Board' : 'Add link to Board', sub: q, key: '↵', run: () => { addLink(q, '', null); toast(esc(cs ? 'Odkaz přidán' : 'Link added')); } });
    else {
      const when = p.repeat ? (p.repeat === 'days' ? daysText(p.days) : repText({ repeat: p.repeat })) + (p.time ? ' · ' + p.time : '') : (p.date ? dayShort(p.date) : t('today')) + (p.time ? ' · ' + p.time : '');
      const c = p.card ? cardById(p.card) : null;
      out.push({ kind: 'plan', icon: 'plan', t: (cs ? 'Naplánovat · ' : 'Plan · ') + title, sub: when + (c ? ' · ' + c.name : '') + (p.time && S.push.on ? (cs ? ' · připomene' : ' · reminder') : ''), key: '↵', run: () => {
        const it = { id: uid(), t: title, card: p.card || null, created: T(), date: p.date || T() };
        if (p.time) { it.time = p.time; it.dur = 45; it.remind = S.push.def != null ? S.push.def : 10; }
        if (p.repeat) { it.repeat = p.repeat; if (p.repeat === 'days') it.days = p.days; it.doneDates = []; }
        S.items.push(it); save(); render(); toast(esc(t('planned', it.repeat ? repText(it) : dayName(it.date) + (it.time ? ' ' + it.time : ''))), { label: t('undo'), fn: () => { S.items = S.items.filter(x => x !== it); save(); render(); } }); } });
      out.push({ kind: 'idea', icon: 'spark', t: cs ? 'Hodit jako nápad na Board' : 'Add as idea to Board', sub: cs ? 'bez dne · Tab' : 'no day · Tab', key: '⇥', run: () => { const m = { id: uid(), kind: 'note', card: p.card || null, note: q, d: T(), ts: Date.now() }; S.moments.push(m); save(); render(); toast(esc(t('ideaAdded'))); } });
      out.push({ kind: 'more', icon: 'edit', t: cs ? 'Upravit podrobně…' : 'Edit in detail…', sub: cs ? 'otevře přidávání s dlaždicemi' : 'opens the full add sheet', key: '', run: () => openAdd({ text: q }) });
    }
    const lq = deacc(q);
    S.cards.filter(c => deacc(c.name).includes(lq)).slice(0, 3).forEach(c => hits.push({ icon: 'card', t: (cs ? 'Karta ' : 'Card ') + c.name, sub: c.type === 'habit' ? goalText(goalOf(c)) : t('project'), key: '', run: () => openCard(c.id) }));
    S.items.filter(i => deacc(i.t).includes(lq)).slice(0, 4).forEach(i => hits.push({ icon: 'check', t: i.t, sub: whenLabel(i) || (cs ? 'bez dne' : 'no day'), key: '', run: () => openItem(i.id) }));
    S.moments.filter(m => deacc(m.note || m.title || '').includes(lq)).slice(0, 3).forEach(m => hits.push({ icon: m.kind === 'link' ? 'link' : m.kind === 'note' ? 'note' : 'photo', t: (m.title || m.note || '').slice(0, 70), sub: 'Board', key: '', run: () => openViewer(m.id) }));
  }
  if (hits.length && !(p.date || p.time || p.repeat)) out.unshift(...hits); else out.push(...hits);
  const nav = [['home', t('home'), '1'], ['spaces', 'Spaces', '2'], ['board', 'Board', '3'], ['plan', t('plan'), '4']];
  nav.filter(([k, l]) => !q || deacc(l).includes(deacc(q))).forEach(([k, l, n]) => out.push({ icon: k, t: (cs ? 'Přejít · ' : 'Go to · ') + l, sub: '', key: n, run: () => go(k) }));
  [[cs ? 'Nedělní plánování' : 'Plan next week', 'sun', () => { DESK.mode = 'review'; go('plan'); }], [cs ? 'Nová karta' : 'New card', 'plus', () => openCardSheet(null)], [t('settings'), 'gear', () => openSettings()], [cs ? 'Synchronizace' : 'Sync', 'sync', () => ACT.syncPageD()]]
    .filter(([l]) => !q || deacc(l).includes(deacc(q))).forEach(([l, i, f]) => out.push({ icon: i, t: l, sub: '', key: '', run: f }));
  CK.list = out.slice(0, 11); CK.sel = Math.min(CK.sel, Math.max(0, CK.list.length - 1));
  const b = $('#ckBody'); if (!b) return;
  b.innerHTML = (q && !isURL(q) && (p.date || p.time || p.repeat || p.card) ? '<div class="ckchips">' + [p.repeat ? ico('repeat', 14, 2.2) + esc(p.repeat === 'days' ? daysText(p.days) : repText({ repeat: p.repeat })) : p.date ? ico('cal', 14, 2.2) + esc(dayShort(p.date)) : '', p.time ? ico('clock', 14, 2.2) + p.time : '', p.card && cardById(p.card) ? '<span class="dot" style="--c:' + cardById(p.card).color + '"></span>' + esc(cardById(p.card).name) : ''].filter(Boolean).map(x => '<span class="chip in">' + x + '</span>').join('') + '</div>' : '')
    + '<div class="cklist">' + CK.list.map((it, k) => '<button class="ckr' + (k === CK.sel ? ' on' : '') + '" data-a="cmdkPick" data-k="' + k + '"><span class="cki">' + ico(it.icon in IC ? it.icon : 'spark', 16, 2) + '</span><span class="ckt"><span>' + esc(it.t) + '</span>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</span>' + (it.key ? kbd(it.key) : '') + '</button>').join('') + '</div>'
    + '<div class="ckfoot">' + [['↑↓', cs ? 'vybrat' : 'select'], ['↵', cs ? 'potvrdit' : 'confirm'], ['⇥', cs ? 'nápad' : 'idea'], ['1–4', cs ? 'sekce' : 'sections'], ['N', cs ? 'nový' : 'new'], ['/', cs ? 'hledat' : 'search']].map(([k, l]) => '<span>' + kbd(k) + ' ' + esc(l) + '</span>').join('') + '</div>';
}
ACT.cmdkPick = el => { const it = CK.list[+el.dataset.k]; it && cmdkRun(it); };
function cmdkRun(it) { cmdkClose(); it.run(); }

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown', e => {
  if (!DESK.on) return;
  const typing = e.target.closest && e.target.closest('input,textarea,[contenteditable]');
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); $('#cmdk.on') ? cmdkClose() : cmdkOpen(); return; }
  if (mod && /^[1-4]$/.test(e.key)) { e.preventDefault(); cmdkClose(); if (SH.open) closeSheet(true); go(['home', 'spaces', 'board', 'plan'][+e.key - 1]); return; }
  if (!typing && !SH.open && $('#viewer').classList.contains('on') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const n = VW.idx + (e.key === 'ArrowRight' ? 1 : -1); if (n >= 0 && n < VW.list.length) { VW.idx = n; paintViewer(e.key === 'ArrowRight' ? 1 : -1); } e.preventDefault(); return; }
  if (typing || mod || e.altKey || SH.open || $('#cmdk.on') || $('#viewer').classList.contains('on')) return;
  if (/^[1-4]$/.test(e.key)) { e.preventDefault(); go(['home', 'spaces', 'board', 'plan'][+e.key - 1]); }
  else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openAdd({}); }
  else if (e.key === '/') { e.preventDefault(); cmdkOpen(); }
});

/* ---------------- SPACES ---------------- */
function deskSpaces() {
  const cs = lang() === 'cs'; const list = filteredCards(); const d = T(); const td = dow(d);
  const card = c => {
    const hb = c.type === 'habit'; const ps = projectStats(c.id);
    const g = hb ? goalOf(c) : Math.max(1, ps.total); const k = hb ? habitWeek(c.id).filter(Boolean).length : ps.done;
    const w = habitWeek(c.id);
    const nxt = hb ? (cardItems(c.id).find(i => occurs(i, d) && !isDone(i, d)) || cardItems(c.id).find(i => !i.repeat && !i.done)) : ps.next;
    const sub = hb ? t('streak') + ' ' + streakOf(c.id) + ' ' + t('days') + ' · ' + t('best', bestStreak(c.id)) : (c.deadline ? t('deadline') + ' ' + dayShort(c.deadline) + ' · ' + deadlineText(c.deadline) : ps.open + ' ' + t('open') + (ps.noDay ? ' · ' + ps.noDay + (cs ? ' bez dne' : ' no day') : ''));
    return '<button class="pn frost dcard press" data-a="openCard" data-id="' + c.id + '" style="--c:' + c.color + '"><div class="ph2"><span class="cap kk"><span class="led" style="--c:' + c.color + '"></span>' + esc((hb ? t('habit') + ' · ' + goalText(goalOf(c)) : t('project')) + (c.sh ? ' · Spolu' : '')) + '</span>' + (c.sh && chOfCard(c) && members(chOfCard(c)).length > 1 ? avStack(members(chOfCard(c)), 24) : '<span class="muted">' + ico(cardIcon(c), 16, 1.8) + '</span>') + '</div>'
      + '<div class="dch"><b>' + esc(c.name) + '</b><span class="dring">' + ringSVG(64, k / g, c.color, 4) + '<span>' + k + '/' + g + '</span></span></div><div class="muted dsub">' + esc(sub) + '</div>'
      + '<span class="cap" style="margin-top:16px">' + esc(t('thisWeekCap')) + '</span><div class="dwk">' + w.map((on, j) => '<span><i class="' + (on ? 'on' : '') + (j === td ? ' td' : '') + '"></i>' + WD1[lang()][j] + '</span>').join('') + '</div>'
      + (nxt ? '<div class="dnext"><span class="cap" style="color:' + c.color + ';filter:brightness(1.3)">' + esc(t('nextStep')) + '</span><span>' + esc(nxt.t) + '</span><small class="muted">' + esc(whenLabel(nxt) || (cs ? 'bez dne' : 'no day')) + '</small></div>' : '<div class="dnext"><span class="muted">' + esc(t('noTasksYet')) + '</span></div>') + '</button>';
  };
  const cards = list.map(card).join('') + (list.length % 4 === 0 && list.length ? '' : '<button class="pn dcard dnew press" data-a="newCard"><span class="ci" style="width:56px;height:56px;border-radius:28px">' + ico('plus', 24, 1.8) + '</span><b>' + esc(t('newCard')) + '</b><span class="muted">' + esc(t('newCardSub')) + '</span></button>');
  // projects in time
  const start = addD(weekStart(d), -7), span = 35; const pos = x => clamp(daysBetween(start, x) / span * 100, 0, 100);
  const projs = S.cards.filter(c => c.type === 'project');
  const bars = projs.map(c => { const its = cardItems(c.id).filter(i => i.date); const a = [c.created || d, ...its.map(i => i.date)].sort()[0]; const b = c.deadline || its.map(i => i.date).sort().pop() || addD(d, 7);
    const dots = its.map(i => '<i class="pd' + (i.done ? ' dn' : '') + '" style="left:' + pos(i.date) + '%" title="' + esc(i.t) + '"></i>').join('');
    return '<div class="pr"><button class="pl" data-a="openCard" data-id="' + c.id + '"><span class="dot" style="--c:' + c.color + '"></span>' + esc(c.name) + '</button><span class="pt2" style="--c:' + c.color + '"><i class="pb" style="left:' + pos(a) + '%;width:' + Math.max(2, pos(b) - pos(a)) + '%"></i>' + dots + (c.deadline ? '<i class="pdl" style="left:' + pos(c.deadline) + '%"></i>' : '') + '</span></div>'; }).join('');
  const ticks = [0, 7, 14, 21, 28].map(k => '<span style="left:' + (k / span * 100) + '%">' + dOf(addD(start, k)).getDate() + '. ' + (dOf(addD(start, k)).getMonth() + 1) + '.</span>').join('');
  const tl = '<section class="pn frost solid" style="grid-column:1/8"><div class="ph2"><span class="cap">' + esc(cs ? 'Projekty v čase' : 'Projects over time') + '</span><span class="muted">5 ' + esc(cs ? 'týdnů' : 'weeks') + '</span></div>'
    + (projs.length ? '<div class="ptl">' + bars + '<div class="pr"><span></span><span class="ptk">' + ticks + '</span></div><i class="pnow" style="--p:' + (pos(d) / 100) + '"><b>' + esc(t('today').toLowerCase()) + '</b></i></div>' : '<div class="muted dempty">' + esc(cs ? 'Zatím žádný projekt.' : 'No projects yet.') + '</div>') + '</section>';
  const heat = S.cards.map(c => { let cells = ''; for (let k = 27; k >= 0; k--) { const x = addD(d, -k); const n = completionsOn(x, c.id); cells += '<i style="' + (n ? 'background:' + c.color + ';opacity:' + (n > 1 ? 1 : .7) : '') + '"></i>'; } return '<div class="hr"><span><span class="dot" style="--c:' + c.color + '"></span>' + esc(c.name) + '</span><span class="hc">' + cells + '</span></div>'; }).join('');
  const quiet = S.cards.filter(c => c.type === 'habit').map(c => [c, lastActive(c.id)]).filter(([c, la]) => !la || daysBetween(la, d) >= 3)[0];
  const rh = '<section class="pn frost solid" style="grid-column:8/13"><div class="ph2"><span class="cap">' + esc(t('rhythm')) + '</span><span class="muted">' + esc(cs ? 'všechny karty' : 'all cards') + '</span></div>' + (heat || '<div class="muted dempty">—</div>')
    + (quiet ? '<div class="muted" style="margin-top:auto;padding-top:12px;font:400 13px/1.4 Inter">' + esc(t('quiet', quiet[0].name, quiet[1] ? daysBetween(quiet[1], d) : 7).replace(/<[^>]+>/g, '')) + '</div>' : '') + '</section>';
  const seg = '<div class="seg frost">' + [['all', t('all') + ' · ' + S.cards.length], ['habit', t('habits')], ['project', t('projects')]].map(([k, l]) => '<button class="' + (V.deckFilter === k ? 'on' : '') + '" data-a="dDeck" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
  return '<main class="dmain g12 rows scrolly"><div class="dph"><div class="dgrp"><h1>Spaces</h1>' + seg + '</div><button class="dadd cr press" data-a="newCard">' + ico('plus', 16, 2.4) + esc(t('newCard')) + '</button></div>'
    + '<div class="dcards">' + cards + '</div>' + tl + rh + '</main>';
}
ACT.dDeck = el => { V.deckFilter = el.dataset.k; deskRender(); };

/* ---------------- CARD ---------------- */
function deskCard() { const c = cardById(V.card); const sh = c && c.sh && chOfCard(c); return '<main class="dmain g12 rows dcardv" id="dCardMain"><div class="dph"><div class="dgrp"><button class="cb frost press" data-a="closeCard" aria-label="Back">' + ico('back', 20, 2.2) + '</button><span id="dCardKick"></span></div><div class="dgrp">' + (sh ? '<button class="chip frost press" style="height:44px;border-radius:22px" data-a="spInvite" data-id="' + c.id + '">' + ico('users', 16, 2) + esc(lang() === 'cs' ? 'Pozvat' : 'Invite') + '</button>' : '') + '<button class="cb frost press" data-a="editCard" aria-label="' + esc(t('editCard')) + '">' + ico('more', 20, 2) + '</button></div></div>'
  + '<section class="pn plain" id="dC1" style="grid-column:1/6"></section><section class="pn plain" id="dC2" style="grid-column:6/10"></section><section class="pn plain" id="dC3" style="grid-column:10/13"></section></main>'; }
function deskCardMount() {
  // the phone's card view is built (with its live inputs) and its parts are moved into the desktop columns
  const src = $('#s-card'); DESK.mounting = true; try { _renderCard(); } finally { DESK.mounting = false; }
  const kids = [...src.children];
  const kick = kids.find(x => x.classList.contains('kick')); const name = kids.find(x => x.classList.contains('cname')); const cnote = kids.find(x => x.classList.contains('cnote'));
  const stack = kids.find(x => x.classList.contains('stack')); const secs = kids.filter(x => x.classList.contains('sec'));
  const c1 = $('#dC1'), c2 = $('#dC2'), c3 = $('#dC3'); if (!c1) return;
  if (kick) $('#dCardKick').appendChild(kick);
  if (name) c1.appendChild(name); if (cnote) c1.appendChild(cnote); if (stack) c1.appendChild(stack);
  const cap = s => (s.querySelector('.cap') || {}).textContent || '';
  secs.forEach((s, k) => { const isMom = s.querySelector('.thumbs'); const isNote = s.querySelector('#cardNote'); const isSp = s.querySelector('.pact,[data-a="spLeave"]'); (isMom || isNote || isSp ? c3 : c2).appendChild(s); });
  const news = c3.querySelector('.pact'); if (news) c3.prepend(news.closest('.sec'));
  src.innerHTML = '';
}

/* ---------------- shared drag & drop (plan) ---------------- */
function dragStart(e, info) {
  if (e.button !== 0) return;
  const st = { x: e.clientX, y: e.clientY, info, el: e.currentTarget, moved: false, ghost: null, pid: e.pointerId };
  DESK.drag = st;
  const move = ev => {
    if (!st.moved && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) < 6) return;
    if (!st.moved) { st.moved = true; document.body.classList.add('ddragging'); st.ghost = document.createElement('div'); st.ghost.className = 'dghost cr'; st.ghost.innerHTML = ico('grip', 14, 2) + '<span class="dot" style="--c:' + info.color + '"></span>' + esc(info.title); document.body.appendChild(st.ghost); if (info.blockEl) info.blockEl.classList.add('lifting'); }
    st.ghost.style.left = ev.clientX + 'px'; st.ghost.style.top = ev.clientY + 'px';
    planHover(ev, st);
  };
  const up = ev => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
    document.body.classList.remove('ddragging');
    if (st.ghost) st.ghost.remove(); if (info.blockEl) info.blockEl.classList.remove('lifting');
    const tgt = st.target; planHoverClear();
    DESK.drag = null;
    if (!st.moved) { info.click && info.click(); return; }
    if (tgt) planDrop(info, tgt);
  };
  const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); document.body.classList.remove('ddragging'); if (st.ghost) st.ghost.remove(); planHoverClear(); DESK.drag = null; };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  e.preventDefault();
}
const snap15 = m => Math.round(m / 15) * 15;
function planHover(ev, st) {
  st.target = null; planHoverClear(true);
  const el = document.elementFromPoint(ev.clientX, ev.clientY); if (!el) return;
  const col = el.closest('.wgc'); const all = el.closest('.wad'); const rcol = el.closest('.rvd,.dmc');
  const cs = lang() === 'cs';
  if (col) {
    const r = col.getBoundingClientRect(); const dur = st.info.dur || 45;
    let m = snap15(360 + (ev.clientY - r.top) / r.height * 1080 - (st.info.grabOff || 0)); m = clamp(m, 360, 1440 - 15);
    st.target = { d: col.dataset.d, time: mtime(m) };
    const pv = document.createElement('div'); pv.className = 'dprev'; pv.style.top = ((m - 360) / 1080 * 100) + '%'; pv.style.height = (Math.min(dur, 1440 - m) / 1080 * 100) + '%';
    pv.innerHTML = '<b>' + esc(dayShort(col.dataset.d) + ' · ' + mtime(m) + ' · ' + durLabel(dur)) + '</b>'; col.appendChild(pv);
  } else if (all) {
    st.target = { d: all.dataset.d, time: null }; all.classList.add('over');
    const pv = document.createElement('div'); pv.className = 'dprev2'; pv.textContent = dayShort(all.dataset.d) + ' · ' + (cs ? 'bez času' : 'no time'); all.appendChild(pv);
  } else if (rcol) {
    st.target = { d: rcol.dataset.d, time: 'keep' }; rcol.classList.add('over');
  }
}
function planHoverClear() { $$('.dprev,.dprev2').forEach(x => x.remove()); $$('.wad.over,.rvd.over,.dmc.over').forEach(x => x.classList.remove('over')); }
function planDrop(info, tg) {
  const cs = lang() === 'cs';
  if (info.kind === 'idea') {
    const m = S.moments.find(x => x.id === info.id); if (!m) return;
    const it = { id: uid(), t: (m.title || m.note || '').split('\n')[0].slice(0, 120) || (cs ? 'Nápad' : 'Idea'), card: m.card || null, created: T(), date: tg.d };
    if (tg.time && tg.time !== 'keep') { it.time = tg.time; it.dur = 45; it.remind = S.push.def != null ? S.push.def : 10; }
    S.items.push(it); m.planned = it.id; save(); render();
    toast(esc(t('planned', dayName(it.date) + (it.time ? ' ' + it.time : ''))), { label: t('undo'), fn: () => { S.items = S.items.filter(x => x !== it); delete m.planned; save(); render(); } });
    return;
  }
  const i = itemById(info.id); if (!i) return;
  const before = JSON.stringify(i);
  if (i.repeat) {
    if (tg.time && tg.time !== 'keep') { i.time = tg.time; i.dur = i.dur || 45; }
    else if (!tg.time) { delete i.time; delete i.dur; }
    if (info.from && info.from !== tg.d) toast(esc(cs ? 'Opakovaná věc: změnil se jen čas, dny zůstaly' : 'Repeating item: only the time changed'));
  } else {
    i.date = tg.d;
    if (tg.time && tg.time !== 'keep') { i.time = tg.time; i.dur = i.dur || 45; if (i.remind === undefined) i.remind = S.push.def != null ? S.push.def : 10; }
    else if (!tg.time) { delete i.time; delete i.dur; }
  }
  save(); render();
  if (!(i.repeat && info.from && info.from !== tg.d)) toast(esc(t('dragTo', dayName(tg.d) + (i.time ? ' ' + i.time : ''))), { label: t('undo'), fn: () => { Object.keys(i).forEach(k => delete i[k]); Object.assign(i, JSON.parse(before)); save(); render(); } });
}
function resizeStart(e, id, d, rzEl) {
  e.stopPropagation(); e.preventDefault();
  const i = itemById(id); if (!i) return; const blk = rzEl.closest('.wb'); const col = blk.closest('.wgc'); const r = col.getBoundingClientRect();
  const start = tmin(i.time); let dur = i.dur || 45; const lab = blk.querySelector('small');
  const move = ev => { const m = 360 + (ev.clientY - r.top) / r.height * 1080; dur = clamp(snap15(m - start), 15, 1440 - start); blk.style.height = (dur / 1080 * 100) + '%'; if (lab) lab.textContent = i.time + ' · ' + durLabel(dur); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); const old = i.dur; i.dur = dur; save(); render(); toast(esc((lang() === 'cs' ? 'Délka ' : 'Length ') + durLabel(dur)), { label: t('undo'), fn: () => { i.dur = old; save(); render(); } }); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
document.addEventListener('pointerdown', e => {
  if (!DESK.on) return;
  const rz = e.target.closest('.wb .rz'); if (rz) { const b = rz.closest('.wb'); resizeStart(e, b.dataset.id, b.dataset.d, rz); return; }
  const src = e.target.closest('[data-drag]'); if (!src || e.target.closest('.c0')) return;
  const [kind, id] = src.dataset.drag.split(':');
  if (kind === 'idea') { const m = S.moments.find(x => x.id === id); if (!m) return; dragStart(e, { kind, id, title: (m.title || m.note || '').split('\n')[0].slice(0, 60), color: cardColor(m.card), dur: 45, click: () => openViewer(id) }); return; }
  const i = itemById(id); if (!i) return;
  const isBlock = src.classList.contains('wb');
  let grabOff = 0; if (isBlock) { const col = src.closest('.wgc').getBoundingClientRect(); grabOff = (e.clientY - src.getBoundingClientRect().top) / col.height * 1080; }
  dragStart(e, { kind: 'item', id, title: i.t, color: cardColor(i.card), dur: i.dur || 45, from: src.dataset.d, blockEl: isBlock ? src : null, grabOff, click: () => openItem(id) });
});

/* ---------------- PLAN: planning desk ---------------- */
function lanes(blocks) { const ends = []; blocks.sort((a, b) => a.s - b.s || b.e - a.e); for (const b of blocks) { let k = ends.findIndex(e => e <= b.s); if (k < 0) { k = ends.length; ends.push(0); } ends[k] = b.e; b.lane = k; } const n = Math.max(1, ends.length); blocks.forEach(b => { b.n = n; }); return blocks; }
function deskPlan() {
  if (DESK.mode === 'review') return deskReview();
  const cs = lang() === 'cs'; if (!V.planWeek) V.planWeek = weekStart(T());
  const days = [0, 1, 2, 3, 4, 5, 6].map(k => addD(V.planWeek, k)); const nm = nowMin();
  const seg = '<div class="seg frost"><button class="' + (DESK.mode === 'week' ? 'on' : '') + '" data-a="dPlanMode" data-k="week">' + esc(t('week')) + '</button><button class="' + (DESK.mode === 'month' ? 'on' : '') + '" data-a="dPlanMode" data-k="month">' + esc(cs ? 'Měsíc' : 'Month') + '</button></div>';
  const ws = V.planWeek, we = addD(ws, 6);
  const lbl = dOf(ws).getDate() + '. ' + (dOf(ws).getMonth() + 1) + '. – ' + dOf(we).getDate() + '. ' + (dOf(we).getMonth() + 1) + '.';
  let tot = 0, dn = 0; days.forEach(d => { const its = itemsOn(d); tot += its.length; dn += its.filter(i => isDone(i, d)).length; });
  if (!DESK.mon) DESK.mon = T().slice(0, 7);
  const [my, mm] = DESK.mon.split('-').map(Number); const isMon = DESK.mode === 'month';
  const nav = isMon
    ? '<button class="cb frost press" data-a="dMon" data-n="-1" aria-label="Previous month">' + ico('chevL', 16, 2.4) + '</button><b class="wlbl">' + esc(MON[lang()][mm - 1] + ' ' + my) + '</b><button class="cb frost press" data-a="dMon" data-n="1" aria-label="Next month">' + ico('chev', 16, 2.4) + '</button>' + (DESK.mon !== T().slice(0, 7) ? '<button class="chip frost press" data-a="dMonToday">' + esc(t('today')) + '</button>' : '')
    : '<span class="muted">' + esc(cs ? tot + ' položek · ' + dn + ' hotovo' : tot + ' items · ' + dn + ' done') + '</span><button class="cb frost press" data-a="dWeek" data-n="-1" aria-label="Previous week">' + ico('chevL', 16, 2.4) + '</button><b class="wlbl">' + esc(lbl) + '</b><button class="cb frost press" data-a="dWeek" data-n="1" aria-label="Next week">' + ico('chev', 16, 2.4) + '</button>' + (ws !== weekStart(T()) ? '<button class="chip frost press" data-a="dWeekToday">' + esc(t('today')) + '</button>' : '');
  const hdr = '<div class="dph"><div class="dgrp"><h1>' + esc(t('plan')) + '</h1>' + seg + '<button class="chip frost press" data-a="dReview">' + ico('sun', 15, 2) + esc(cs ? 'Nedělní plánování' : 'Plan next week') + '</button></div><div class="dgrp">' + nav + '</div></div>';
  // sources
  const src = (kind, id, title, sub, c) => '<div class="dsrc" data-drag="' + kind + ':' + id + '" role="button" tabindex="0"><span class="muted">' + ico('grip', 14, 2) + '</span><span class="dot" style="--c:' + c + '"></span><span class="st"><span>' + esc(title) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></div>';
  const nd = undatedItems(), od = overdueItems();
  const ideas = S.moments.filter(m => (m.kind === 'note' || m.kind === 'link') && !(m.planned && itemById(m.planned))).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 6);
  const side = '<section class="pn frost" style="grid-column:1/4"><div class="ph2"><span class="cap">' + esc(cs ? 'Připravené k plánu' : 'Ready to plan') + '</span></div><div class="muted" style="font:400 13px/1.4 Inter;margin:-6px 0 6px">' + esc(cs ? 'Chyť a pusť na den a čas.' : 'Grab and drop on a day and time.') + '</div><div class="pscroll">'
    + (od.length ? '<div class="cap dsc" style="color:#ffb3a9">' + esc(t('overdue')) + ' · ' + od.length + '</div>' + od.map(i => src('item', i.id, i.t, dayShort(i.date), cardColor(i.card))).join('') : '')
    + '<div class="cap dsc">' + esc(t('noDayYet')) + ' · ' + nd.length + '</div>' + (nd.map(i => src('item', i.id, i.t, (cardById(i.card) || {}).name || '', cardColor(i.card))).join('') || '<div class="muted dempty">' + esc(cs ? 'Všechno má svůj den.' : 'Everything has a day.') + '</div>')
    + '<div class="cap dsc">' + esc(cs ? 'Nápady z Boardu' : 'Ideas from Board') + '</div>' + (ideas.map(m => src('idea', m.id, (m.title || m.note || '').split('\n')[0], (m.kind === 'link' ? (m.site || '') : '') + (m.kind === 'link' ? ' · ' : '') + (cs ? 'nápad · ' : 'idea · ') + dayShort(m.d), cardColor(m.card))).join('') || '<div class="muted dempty">' + esc(cs ? 'Žádné nové nápady.' : 'No new ideas.') + '</div>')
    + '</div></section>';
  if (isMon) return '<main class="dmain g12 rows">' + hdr + side + deskMonth() + '</main>';
  // grid
  const head = days.map(d => '<button class="wgh' + (d === T() ? ' tdy' : '') + '" data-a="dGoDay" data-d="' + d + '"><span>' + WD[lang()][dow(d)] + '</span><b>' + dOf(d).getDate() + '</b></button>').join('');
  const allday = days.map(d => '<div class="wad" data-d="' + d + '">' + itemsOn(d).filter(i => !i.time).map(i => '<div class="wac' + (isDone(i, d) ? ' done' : '') + '" data-drag="item:' + i.id + '" data-d="' + d + '" style="--c:' + cardColor(i.card) + '">' + (i.repeat ? ico('repeat', 10, 2.6) : '') + esc(i.t) + '</div>').join('') + '</div>').join('');
  const cols = days.map(d => {
    const bl = lanes(itemsOn(d).filter(i => i.time).map(i => ({ i, s: tmin(i.time), e: tmin(i.time) + (i.dur || 45) })));
    let h = bl.map(b => { const i = b.i; const on = isDone(i, d); const top = (Math.max(360, b.s) - 360) / 1080 * 100, ht = (Math.min(1440, b.e) - Math.max(360, b.s)) / 1080 * 100; const w = 100 / b.n;
      return '<div class="wb' + (on ? ' done' : '') + (i.repeat ? ' rep' : '') + '" data-drag="item:' + i.id + '" data-id="' + i.id + '" data-d="' + d + '" style="--c:' + cardColor(i.card) + ';top:' + top + '%;height:' + Math.max(1.6, ht) + '%;left:calc(' + (b.lane * w) + '% + 2px);width:calc(' + w + '% - 4px)" title="' + esc(i.time + ' ' + i.t) + '">' + ((i.dur || 45) <= 30 ? '<span><em>' + i.time + '</em> ' + esc(i.t) + '</span>' : '<span>' + esc(i.t) + '</span><small>' + i.time + ' · ' + durLabel(i.dur || 45) + '</small>') + checkBtn(i, d) + '<i class="rz" aria-hidden="true"></i></div>'; }).join('');
    if (d === T() && nm >= 360) h += '<span class="wnow" style="top:' + ((nm - 360) / 1080 * 100) + '%"></span>';
    return '<div class="wgc' + (d === T() ? ' tdy' : '') + '" data-d="' + d + '">' + h + '</div>';
  }).join('');
  const lines = Array.from({ length: 19 }, (_, k) => k + 6).map(h => '<span class="whl' + (h % 3 ? ' minor' : '') + '" style="top:' + ((h - 6) / 18 * 100) + '%"><b>' + pad(h) + '</b></span>').join('');
  const grid = '<section class="pn frost solid wgp" style="grid-column:4/13"><div class="wgrid2"><span></span>' + head + '</div><div class="wgrid2 wadrow"><span class="cap" style="font-size:9.5px;align-self:center">' + esc(cs ? 'celý den' : 'all day') + '</span>' + allday + '</div><div class="wbody" id="wBody"><div class="wcan"><div class="wlines">' + lines + '</div><div class="wcols">' + cols + '</div></div></div></section>';
  return '<main class="dmain g12 rows">' + hdr + side + grid + '</main>';
}
function deskMonth() {
  const [y, m] = DESK.mon.split('-').map(Number); const first = y + '-' + pad(m) + '-01'; const start = weekStart(first);
  const n = new Date(y, m, 0).getDate(); const weeks = Math.ceil((dow(first) + n) / 7);
  let cells = '';
  for (let k = 0; k < weeks * 7; k++) {
    const d = addD(start, k); const its = itemsOn(d); const inM = d.slice(0, 7) === DESK.mon;
    cells += '<div class="dmc' + (inM ? '' : ' out') + (d === T() ? ' tdy' : '') + (d < T() ? ' past' : '') + '" data-d="' + d + '"><button class="dmd" data-a="dMonDay" data-d="' + d + '">' + dOf(d).getDate() + '</button>'
      + its.slice(0, 3).map(i => '<span class="dme' + (isDone(i, d) ? ' done' : '') + '" style="--c:' + cardColor(i.card) + '"' + (i.repeat ? '' : ' data-drag="item:' + i.id + '" data-d="' + d + '"') + '>' + (i.time ? '<em>' + i.time + '</em>' : '') + esc(i.t) + '</span>').join('')
      + (its.length > 3 ? '<button class="dmm" data-a="dMonDay" data-d="' + d + '">+' + (its.length - 3) + '</button>' : '') + '</div>';
  }
  return '<section class="pn frost solid dmon" style="grid-column:4/13"><div class="dmh">' + WD[lang()].map(w => '<span>' + w + '</span>').join('') + '</div><div class="dmg" style="grid-template-rows:repeat(' + weeks + ',minmax(0,1fr))">' + cells + '</div></section>';
}
ACT.dMon = el => { const [y, m] = DESK.mon.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.n, 1); DESK.mon = d.getFullYear() + '-' + pad(d.getMonth() + 1); deskRender(); };
ACT.dMonToday = () => { DESK.mon = T().slice(0, 7); deskRender(); };
ACT.dMonDay = el => { V.planWeek = weekStart(el.dataset.d); DESK.mode = 'week'; deskRender(); };
ACT.dPlanMode = el => { DESK.mode = el.dataset.k; deskRender(); };
ACT.dWeek = el => { V.planWeek = addD(V.planWeek || weekStart(T()), 7 * +el.dataset.n); deskRender(); };
ACT.dWeekToday = () => { V.planWeek = weekStart(T()); deskRender(); };
ACT.dGoDay = el => { V.deskDay = el.dataset.d === T() ? null : el.dataset.d; go('home'); };
ACT.dReview = () => { DESK.mode = 'review'; deskRender(true); };

/* ---------------- Sunday planning ---------------- */
function deskReview() {
  const cs = lang() === 'cs'; const d = T();
  const past = weekDays(d); const next = [0, 1, 2, 3, 4, 5, 6].map(k => addD(weekStart(d), 7 + k));
  const vals = past.map(x => x <= d ? completionsOn(x) : 0); const total = vals.reduce((a, b) => a + b, 0); const mx = Math.max(1, ...vals);
  const best = vals.indexOf(Math.max(...vals));
  const bars = past.map((x, k) => '<span><i style="height:' + (x <= d ? Math.max(4, vals[k] / mx * 70) : 4) + 'px;' + (x === d ? 'background:var(--green);box-shadow:0 0 10px rgba(63,191,127,.6)' : x > d ? 'background:transparent;box-shadow:inset 0 0 0 1px rgba(243,234,216,.3)' : '') + '"></i>' + WD1[lang()][k] + '</span>').join('');
  const cg = S.cards.map(c => { const hb = c.type === 'habit'; const g = hb ? goalOf(c) : Math.max(1, projectStats(c.id).total); const k = hb ? habitWeek(c.id).filter(Boolean).length : past.reduce((a, x) => a + completionsOn(x, c.id), 0);
    return '<div class="cg"><div><span><span class="led" style="--c:' + c.color + '"></span>' + esc(c.name) + '</span><b>' + k + ' / ' + (hb ? g : cs ? 'týden' : 'week') + (hb && k >= g ? ' ✓' : '') + '</b></div><i><i style="width:' + Math.min(100, k / (hb ? g : Math.max(k, 1)) * 100) + '%;background:' + c.color + '"></i></i></div>'; }).join('');
  const unfinished = [...overdueItems(), ...S.items.filter(i => !i.repeat && i.date && i.date >= past[0] && i.date <= past[6] && i.date >= d && !i.done)];
  const left = '<section class="pn frost" style="grid-column:1/5"><div class="ph2"><span class="cap">' + esc((cs ? 'Tento týden · ' : 'This week · ') + dayShort(past[0]) + ' – ' + dayShort(past[6])) + '</span></div>'
    + '<div class="rvtop"><span class="num" style="font-size:56px">' + total + '<small style="font-size:15px">' + esc(t('weekDone')) + '</small></span><div class="rvb">' + bars + '</div></div>'
    + '<div class="muted" style="font:400 13px/1.4 Inter;margin:8px 0 6px">' + esc(total ? t('bestDay', WD[lang()][best]) : t('noneYet')) + '</div><div class="pscroll">' + cg
    + '<div class="cap dsc">' + esc(cs ? 'Nedokončené · ' : 'Unfinished · ') + unfinished.length + '</div>' + (unfinished.map(i => '<div class="dsrc" data-drag="item:' + i.id + '" data-d="' + i.date + '" role="button" tabindex="0"><span class="muted">' + ico('grip', 14, 2) + '</span><span class="dot" style="--c:' + cardColor(i.card) + '"></span><span class="st"><span>' + esc(i.t) + '</span><small>' + esc(dayShort(i.date)) + '</small></span></div>').join('') || '<div class="muted dempty">' + esc(cs ? 'Nic nevisí. 👌' : 'Nothing left over.').replace(' 👌', '') + '</div>')
    + '<div class="cap dsc">' + esc(t('noDayYet')) + '</div>' + undatedItems().map(i => '<div class="dsrc" data-drag="item:' + i.id + '" role="button" tabindex="0"><span class="muted">' + ico('grip', 14, 2) + '</span><span class="dot" style="--c:' + cardColor(i.card) + '"></span><span class="st"><span>' + esc(i.t) + '</span></span></div>').join('') + '</div></section>';
  const cols = next.map(x => { const its = itemsOn(x);
    return '<div class="rvd" data-d="' + x + '"><div class="rvh"><span>' + WD[lang()][dow(x)] + '</span><b>' + dOf(x).getDate() + '</b></div>' + (its.map(i => '<div class="rvi' + (i.repeat ? ' rep' : '') + '" ' + (i.repeat ? '' : 'data-drag="item:' + i.id + '" data-d="' + x + '"') + ' style="--c:' + cardColor(i.card) + '"><small><span class="dot" style="--c:' + cardColor(i.card) + '"></span>' + (i.time || '—') + (i.repeat ? ' · ' + ico('repeat', 10, 2.6) : '') + '</small><span>' + esc(i.t) + '</span></div>').join('') || '<div class="muted rve">' + esc(cs ? 'volno' : 'free') + '</div>') + '</div>'; }).join('');
  const right = '<section class="pn frost solid" style="grid-column:5/13"><div class="ph2"><span class="cap">' + esc((cs ? 'Příští týden · ' : 'Next week · ') + dayShort(next[0]) + ' – ' + dayShort(next[6])) + '</span><span class="muted">' + esc(cs ? 'opakované jsou předvyplněné · přetáhni zleva' : 'repeating ones are prefilled · drag from the left') + '</span></div><div class="rvgrid">' + cols + '</div>'
    + '<div class="rvfoot"><span class="muted">' + esc(cs ? 'Až budeš hotový, Aurora nastaví připomínky na celý týden.' : 'When you are done, Aurora sets reminders for the whole week.') + '</span><button class="dadd cr press" data-a="dReviewDone">' + esc(cs ? 'Hotovo, týden je naplánovaný' : 'Done, week planned') + '</button></div></section>';
  const hdr = '<div class="dph"><div><h1>' + esc(cs ? 'Tvůj týden → další týden' : 'Your week → next week') + '</h1><span class="sub">' + esc(dLong(d) + (cs ? ' · 10 minut a máš hotovo' : ' · 10 minutes and you are set')) + '</span></div><div class="dgrp"><button class="chip frost press" data-a="dPlanMode" data-k="week">' + ico('chevL', 14, 2.4) + esc(cs ? 'Zpět na týden' : 'Back to week') + '</button></div></div>';
  return '<main class="dmain g12 rows">' + hdr + left + right + '</main>';
}
ACT.dReviewDone = () => { DESK.mode = 'week'; V.planWeek = addD(weekStart(T()), 7); if (typeof pushSync === 'function') pushSync(true); deskRender(true); toast(esc(lang() === 'cs' ? 'Týden je naplánovaný ✓' : 'Week planned ✓')); };

/* ---------------- BOARD: moodboard ---------------- */
function deskBoardList() {
  let ms = boardList();
  if (V.boardType === 'img') ms = ms.filter(m => m.kind === 'photo' || m.kind === 'video');
  else if (V.boardType === 'link') ms = ms.filter(m => m.kind === 'link');
  else if (V.boardType === 'note') ms = ms.filter(m => m.kind === 'note');
  return ms;
}
function deskBoard() {
  const cs = lang() === 'cs'; const ms = deskBoardList();
  const chips = '<button class="chip ' + (V.boardFilter === 'all' ? 'cr' : 'frost') + ' press" data-a="boardFilter" data-k="all">' + esc(t('all')) + ' · ' + S.moments.length + '</button>' + S.cards.map(c => '<button class="chip ' + (V.boardFilter === c.id ? 'cr' : 'frost') + ' press" data-a="boardFilter" data-k="' + c.id + '"><span class="dot" style="--c:' + c.color + '"></span>' + esc(c.name) + '</button>').join('') + '<button class="chip ' + (V.boardFilter === 'none' ? 'cr' : 'frost') + ' press" data-a="boardFilter" data-k="none">' + esc(t('noCard')) + '</button>'
    + '<span style="flex:1"></span>' + [['img', 'photo', cs ? 'Obrázky' : 'Images'], ['link', 'link', cs ? 'Odkazy' : 'Links'], ['note', 'note', cs ? 'Poznámky' : 'Notes']].map(([k, i, l]) => '<button class="chip ' + (V.boardType === k ? 'cr' : 'frost') + ' press" data-a="dBType" data-k="' + k + '">' + ico(i, 15, 2) + esc(l) + '</button>').join('');
  const hdr = '<div class="dph"><h1>Board</h1><div class="dqin frost"><input id="dQuick" autocomplete="off" placeholder="' + esc(cs ? 'Hoď nápad nebo vlož odkaz… Enter ho přidá' : 'Drop an idea or paste a link… Enter adds it') + '"><span class="muted dqh">' + esc(cs ? 'Enter = hodit · ' : 'Enter = add · ') + MOD + 'V = ' + esc(cs ? 'obrázek / odkaz' : 'image / link') + '</span><label class="cb in press pick" aria-label="' + esc(t('photoVideo')) + '">' + ico('photo', 18, 1.9) + '<input type="file" id="dFiles" accept="image/*,video/*" multiple></label><button class="dadd cr press" data-a="dQuickGo">' + esc(t('throwIt')) + '</button></div>'
    + '<button class="cb frost press" data-a="boardSearch" aria-label="' + esc(t('search')) + '">' + ico(V.boardSearch ? 'x' : 'search', 19, 2) + '</button></div>';
  const search = V.boardSearch ? '<div class="search frost dsearch">' + ico('search', 18, 2) + '<input id="boardQ" type="search" placeholder="' + esc(t('searchPh')) + '" value="' + esc(V.boardQ) + '" autocomplete="off"></div>' : '';
  const grid = ms.length ? '<div class="dmason">' + ms.map(tileMoment).join('') + '</div>' : '<div class="dempty2"><b>' + esc(S.moments.length ? (cs ? 'Nic neodpovídá filtru.' : 'Nothing matches.') : (cs ? 'Board je prázdný' : 'The board is empty')) + '</b><span class="muted">' + esc(cs ? 'Napiš nápad nahoru, vlož odkaz, nebo sem přetáhni fotky ze složky.' : 'Type an idea above, paste a link, or drop photos here.') + '</span></div>';
  return '<main class="dmain g12 rows board3">' + hdr + '<div class="dchips">' + chips + '</div>' + search + '<div class="dbgrid">' + grid + '</div><div id="dDrop" class="ddrop"><div><span class="ddi">' + ico('upload', 30, 1.8) + '</span><b>' + esc(cs ? 'Pusť a přidá se na Board' : 'Drop to add to Board') + '</b><span class="muted">' + esc(cs ? 'fotky a videa ze složky' : 'photos and videos from a folder') + '</span></div></div></main>';
}
function deskBoardMount() {
  const q = $('#dQuick'); if (q) q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT.dQuickGo(); } });
  const f = $('#dFiles'); if (f) f.addEventListener('change', () => { addFiles([...f.files]); f.value = ''; });
  const bq = $('#boardQ'); if (bq) { bq.addEventListener('input', () => { V.boardQ = bq.value; const g = $('.dbgrid'); if (g) g.innerHTML = '<div class="dmason">' + deskBoardList().map(tileMoment).join('') + '</div>'; }); bq.focus(); }
}
ACT.dBType = el => { V.boardType = V.boardType === el.dataset.k ? 'all' : el.dataset.k; deskRender(); };
ACT.dQuickGo = () => {
  const q = $('#dQuick'); const v = (q && q.value || '').trim(); if (!v) { q && q.focus(); return; }
  const card = V.boardFilter !== 'all' && V.boardFilter !== 'none' ? V.boardFilter : null;
  if (isURL(v)) addLink(v, '', card); else { S.moments.push({ id: uid(), kind: 'note', card, note: v, d: T(), ts: Date.now() }); save(); }
  deskRender(); const q2 = $('#dQuick'); q2 && q2.focus(); toast(esc(isURL(v) ? (lang() === 'cs' ? 'Odkaz přidán' : 'Link added') : t('ideaAdded')));
};
async function addFiles(files) {
  const ok = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/')); if (!ok.length) return;
  const card = V.boardFilter !== 'all' && V.boardFilter !== 'none' ? V.boardFilter : null; let n = 0;
  toast(esc(t('saving')));
  for (const file of ok) {
    try {
      if (file.type.startsWith('video/') && file.size > 500 * 1024 * 1024) { toast(esc(t('tooBig'))); continue; }
      const kind = file.type.startsWith('video/') ? 'video' : 'photo'; let blob = file, r = 1, dur = 0;
      if (kind === 'photo') { blob = await compressImage(file, 2200); r = await imgRatio(blob); } else { const vi = await vidInfo(blob); r = vi.r; dur = vi.dur; }
      const key = await putMedia(blob); const m = { id: uid(), kind, card, note: '', d: T(), img: key, r, dur, ts: Date.now() + n };
      if (kind === 'video') { try { const th = await videoThumb(blob); if (th) { m.thumb = await putMedia(th); await mediaURL(m.thumb); } } catch (e) {} }
      S.moments.push(m); n++;
    } catch (e) {}
  }
  save(); render(); toast(esc((lang() === 'cs' ? 'Přidáno na Board: ' : 'Added to Board: ') + n));
}
/* drag files from the computer onto the board */
let dragDepth = 0;
window.addEventListener('dragenter', e => { if (!DESK.on || V.tab !== 'board' || V.card || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; dragDepth++; const z = $('#dDrop'); z && z.classList.add('on'); });
window.addEventListener('dragleave', () => { if (!DESK.on) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) { const z = $('#dDrop'); z && z.classList.remove('on'); } });
window.addEventListener('dragover', e => { if (DESK.on && V.tab === 'board' && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => { if (!DESK.on || V.tab !== 'board') return; e.preventDefault(); dragDepth = 0; const z = $('#dDrop'); z && z.classList.remove('on'); addFiles([...(e.dataTransfer.files || [])]); });
/* ⌘V on the board: a picture or a link */
document.addEventListener('paste', e => {
  if (!DESK.on || V.tab !== 'board' || V.card || SH.open || $('#cmdk.on')) return;
  const cd = e.clipboardData; if (!cd) return;
  const files = [...cd.files].filter(f => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); addFiles(files); return; }
  const txt = (cd.getData('text') || '').trim();
  const inField = e.target.closest && e.target.closest('input,textarea');
  if (isURL(txt) && (!inField || e.target.id === 'dQuick')) { e.preventDefault(); addLink(txt, '', null); toast(esc(lang() === 'cs' ? 'Odkaz přidán' : 'Link added')); }
});
const _boardFilter = ACT.boardFilter, _boardSearch = ACT.boardSearch;
ACT.boardFilter = el => { if (!DESK.on) return _boardFilter(el); V.boardFilter = el.dataset.k; deskRender(); };
ACT.boardSearch = () => { if (!DESK.on) return _boardSearch(); V.boardSearch = !V.boardSearch; if (!V.boardSearch) V.boardQ = ''; deskRender(); };

/* settings overlay: click outside closes */
document.addEventListener('click', e => { if (DESK.on && V.settingsOpen && e.target === $('#app')) closeSettings(); });

/* keep the clock and the now-line fresh on the desktop home */
setInterval(() => { if (!DESK.on || !S || document.hidden || V.tab !== 'home' || V.card || SH.open || $('#cmdk.on') || $('#viewer').classList.contains('on')) return; const a = document.activeElement; if (a && a.closest && a.closest('#desk input,#desk textarea')) return; deskRender(); }, 30000);

/* this file can arrive after the app has already started (slow network): switch now */
if (typeof S !== 'undefined' && S) deskCheck();
