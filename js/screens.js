'use strict';
/* ============ SCREENS ============ */
const V = { tab: 'home', card: null, spacesMode: 'deck', deckFilter: 'all', deckIdx: 0, boardFilter: 'all', boardSearch: false, boardQ: '', planMode: 'list', planDay: null, planWeek: null, monCursor: null, monSel: null, settingsPage: 'main', showDone: {}, settingsOpen: false };
const fmtDur = m => m >= 600 ? Math.round(m / 60) + 'h' : Math.floor(m / 60) + ':' + pad(m % 60);
function deadlineText(dl) { const n = daysBetween(T(), dl); if (n === 0) return t('dueToday'); if (n === 1) return t('tomorrow').toLowerCase(); if (n < 0) return t('overdueBy', -n); return t('daysLeft', n); }
function ruleOf(card) { const r = cardItems(card.id).find(i => i.repeat); return r ? (r.repeat === 'weekdays' ? t('weekdays') : r.repeat === 'weekly' ? t('everyWeek') : t('everyDay')) : ''; }
function kickOf(card) { return '<span class="kick cap" style="color:var(--ink)"><span class="led" style="--c:' + card.color + '"></span>' + esc(card.type === 'habit' ? t('habit') : t('project')) + (card.type === 'habit' && ruleOf(card) ? ' · ' + esc(ruleOf(card)) : '') + '</span>'; }
function checkBtn(i, d, color) { const on = isDone(i, d); return '<button class="c0' + (on ? ' on' : '') + '" style="--c:' + (color || cardColor(i.card)) + '" data-a="toggle" data-id="' + i.id + '" data-d="' + d + '" aria-label="' + esc(t('done')) + '" aria-pressed="' + on + '">' + ico('check', 14, 3) + '</button>'; }
function itemRow(i, d, opts = {}) {
  const on = isDone(i, d); let right = '';
  if (opts.right !== undefined) right = opts.right;
  else if (!i.repeat && !i.date && !on) right = '<button class="r warn" data-a="when" data-id="' + i.id + '">' + esc(t('whenAdd')) + '</button>';
  else { const late = !i.repeat && i.date && i.date < T() && !on; right = '<span class="r' + (late ? ' late' : '') + '">' + esc(whenLabel(i)) + '</span>'; }
  const sub = opts.sub !== undefined ? opts.sub : itemSub(i, opts.withCard !== false);
  return '<div class="irow' + (on ? ' done' : '') + '" role="button" tabindex="0" data-a="openItem" data-id="' + i.id + '">' + checkBtn(i, d) + '<span class="tx"><span>' + esc(i.t) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + right + '</div>';
}
function thumbHTML(m) {
  const c = cardColor(m.card);
  if (m.kind === 'note') return '<button class="th note" style="--c:' + c + '" data-a="viewMoment" data-id="' + m.id + '">' + esc(m.note.slice(0, 60)) + '</button>';
  const u = mediaNow(m.img);
  return '<button class="th" data-a="viewMoment" data-id="' + m.id + '">' + (m.kind === 'video' ? (m.thumb ? '<img src="' + mediaNow(m.thumb) + '" alt="">' : '<video src="' + u + '#t=0.1" muted playsinline preload="auto"></video>') : '<img src="' + u + '" alt="' + esc(m.note || '') + '" loading="lazy">') + '</button>';
}

/* ---------------- HOME ---------------- */
function homeModel() {
  const d = T(), nm = nowMin();
  const list = todayList();
  const timed = itemsOn(d).filter(i => i.time);
  const nextT = timed.find(i => !isDone(i, d) && tmin(i.time) + (i.dur || 45) > nm) || null;
  const nextAny = nextT || list.find(i => !isDone(i, d) && !i.time) || list.find(i => !isDone(i, d)) || null;
  const arcs = timed.map(i => { const s = tmin(i.time), e = s + (i.dur || 45); const st = isDone(i, d) ? 'done' : i === nextT ? 'next' : e < nm ? 'past' : 'later'; return { id: i.id, s, e, c: cardColor(i.card), st, t: i.t, time: i.time }; });
  return { d, nm, list, timed, nextT, nextAny, arcs, doneN: list.filter(i => isDone(i, d)).length };
}
function orbText(M) {
  if (M.nextT) { const s = tmin(M.nextT.time); if (s > M.nm) return [fmtDur(s - M.nm), t('to', M.nextT.t)]; return [t('now'), t('until', mtime(s + (M.nextT.dur || 45)))]; }
  const left = M.list.filter(i => !isDone(i, M.d)).length;
  if (left) return [String(left), t('left')];
  if (M.list.length) return ['✓', t('allDone')];
  return [mtime(M.nm), t('freeDay')];
}
function chooseTiles() {
  const d = T();
  const score = c => (itemsOn(d).some(i => i.card === c.id) ? 100 : 0) + (c.type === 'habit' ? 20 + streakOf(c.id) : 0) + (c.deadline ? Math.max(0, 30 - daysBetween(d, c.deadline)) : 0);
  return S.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 3);
}
function tileHTML(c) {
  const d = T();
  let num, small, sub, viz;
  if (c.type === 'habit') {
    const w = habitWeek(c.id), td = dow(d);
    num = w.filter(Boolean).length; small = '/ 7'; sub = t('thisWeek');
    viz = '<span class="vd" style="--c:' + c.color + '">' + w.map((on, k) => '<i class="' + (on ? 'on' : '') + (k === td && on ? ' td' : '') + '"></i>').join('') + '</span>';
  } else {
    const ps = projectStats(c.id);
    if (c.deadline) { const n = daysBetween(d, c.deadline); num = Math.abs(n); small = n < 0 ? (lang() === 'cs' ? 'dní po' : 'days late') : t('days'); sub = n < 0 ? t('deadline') : t('deadlineIn'); }
    else { num = ps.open; small = t('open'); sub = t('tasks'); }
    const vals = [6, 5, 4, 3, 2, 1, 0].map(k => completionsOn(addD(d, -k), c.id));
    viz = vals.some(Boolean) ? spark(vals, c.color) : '<span class="pbar" style="--c:' + c.color + '"><i style="width:' + (ps.total ? Math.round(ps.done / ps.total * 100) : 0) + '%"></i></span>';
  }
  return '<button class="tile frost press" data-a="openCard" data-id="' + c.id + '"><span class="top"><span class="ci">' + ico(cardIcon(c), 17, 1.7) + '</span><span class="fl"><span>' + esc(c.name) + '</span><small>' + esc(sub) + '</small></span></span><span class="bot"><span class="num">' + num + '<small>' + esc(small) + '</small></span>' + viz + '</span></button>';
}
function weekTileHTML() {
  const days = weekDays(), d = T(); const vals = days.map(x => x <= d ? completionsOn(x) : -1); const mx = Math.max(1, ...vals);
  const total = vals.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const bars = vals.map((v, k) => v < 0 ? '<i class="fu"></i>' : '<i class="' + (days[k] === d ? 'td' : '') + '" style="height:' + Math.max(3, Math.round(v / mx * 26)) + 'px"></i>').join('');
  return '<button class="tile frost solid press" data-a="weekReview"><span class="top"><span class="ci">' + ico('cal', 17, 1.7) + '</span><span class="fl"><span>' + esc(t('week')) + '</span><small>' + esc(t('weekDone')) + '</small></span></span><span class="bot"><span class="num">' + total + '</span><span class="bars">' + bars + '</span></span></button>';
}
function nudgeHTML() {
  if (!S.nudges) return '';
  const d = T();
  for (const c of S.cards) {
    if (c.type !== 'habit') continue;
    if (itemsOn(d).some(i => i.card === c.id && !isDone(i, d) && !i.repeat)) continue;
    const la = lastActive(c.id); const since = la ? daysBetween(la, d) : daysBetween(c.created || d, d);
    if (since >= 3 && completionsOn(d, c.id) === 0) return '<div class="nudge frost solid"><span class="led" style="--c:' + c.color + '"></span><span class="tx">' + t('quiet', '<b>' + esc(c.name) + '</b>', since) + ' ' + esc(t('tenMin')) + '</span><button class="chip cr press" data-a="nudgeAdd" data-id="' + c.id + '">' + esc(t('addIt')) + '</button></div>';
  }
  return '';
}
function laterHTML(M, nx) {
  const rest = M.list.filter(i => !isDone(i, M.d) && i !== nx);
  const cs = lang() === 'cs';
  if (!M.list.length) return '';
  const rows = rest.slice(0, 3).map(i => trow(i, i.date && i.date < M.d && !i.repeat ? i.date : M.d, null)).join('');
  const more = rest.length > 3 ? (cs ? 'a další ' + (rest.length - 3) + ' v Plánu' : '+' + (rest.length - 3) + ' more in Plan') : (cs ? 'Celý den v Plánu' : 'Whole day in Plan');
  return '<section class="later frost solid"><div class="lh"><span class="cap">' + esc(t('then')) + '</span><span class="muted" style="font:400 12.5px/1 Inter">' + (rest.length ? esc(t('leftN', rest.length)) : '') + '</span></div>'
    + (rows || '<div class="muted" style="font:400 14px/1.4 Inter;padding:10px 0 6px">' + esc(t('nothingElse')) + '</div>')
    + '<button class="more press" data-a="orbTap">' + esc(more) + ico('chev', 14, 2.2) + '</button></section>';
}
function renderHome() {
  const M = homeModel(); const el = $('#s-home');
  const [n, s] = orbText(M);
  const dots = M.list.slice(0, 12).map(i => '<i class="' + (isDone(i, M.d) ? 'on' : '') + '"></i>').join('');
  const nx = M.nextAny;
  const pill = nx
    ? '<button class="fp frost grow press" data-a="openItem" data-id="' + nx.id + '"><span class="ic"><span class="led" style="--c:' + cardColor(nx.card) + '"></span></span><span class="pt"><span>' + esc(nx.t) + '</span><small>' + esc([nx.time || (nx.date && nx.date < M.d ? dayName(nx.date) : t('anyTime')), nx.card && cardById(nx.card) ? cardById(nx.card).name : ''].filter(Boolean).join(' · ')) + '</small></span></button><button class="fp frost press" style="padding-right:20px" data-a="homeDone" data-id="' + nx.id + '"><span class="ic">' + ico('check', 18, 2.4) + '</span>' + esc(t('done')) + '</button>'
    : '<button class="fp frost grow press" data-a="add" data-ctx="today"><span class="ic">' + ico('plus', 18, 2.4) + '</span><span class="pt"><span>' + esc(t('addForToday')) + '</span><small>' + esc(dayShort(M.d)) + '</small></span></button>';
  const rest = M.list.filter(i => !isDone(i, M.d) && i !== nx);
  const then = rest.length
    ? '<section class="then frost"><span class="cap" style="flex:none">' + esc(t('then')) + '</span><div class="row">' + rest.map(i => '<button class="chip in press" data-a="openItem" data-id="' + i.id + '"><span class="dot" style="--c:' + cardColor(i.card) + '"></span>' + esc(i.t) + (i.time ? '<small>' + i.time + '</small>' : '') + '</button>').join('') + '</div></section>'
    : (M.list.length ? '<section class="then frost"><span class="cap" style="flex:none">' + esc(t('then')) + '</span><span class="muted" style="font:400 13.5px/1 Inter">' + esc(t('nothingElse')) + '</span></section>' : '');
  const tiles = chooseTiles();
  let tl = tiles.map(tileHTML).join('');
  if (tiles.length < 3) tl += '<button class="tile frost press" data-a="newCard"><span class="top"><span class="ci">' + ico('plus', 17, 1.9) + '</span><span class="fl"><span>' + esc(t('newCard')) + '</span><small>' + esc(t('newCardSub')) + '</small></span></span><span class="bot"><span class="num" style="opacity:.4">+</span></span></button>';
  tl += weekTileHTML();
  const weekly = S.weekly && dow(M.d) === 6 ? '<button class="nudge frost press" data-a="weekReview" style="width:100%;text-align:left"><span class="ci">' + ico('sun', 17, 1.7) + '</span><span class="tx"><b>' + esc(t('weekReview')) + '</b><br>' + esc(t('weekReviewSub')) + '</span>' + ico('chev', 16, 2.2) + '</button>' : '';
  el.innerHTML = '<div class="hdr"><img class="logo" src="logo.svg" alt="aurora"><button class="cb frost press" data-a="openSettings" aria-label="' + esc(t('settings')) + '">' + ico('gear', 21, 1.8) + '</button></div>'
    + '<div class="stack"><section class="inst big frost"><div class="fh"><div><span class="t">' + esc(t('today')) + '</span><span class="s">' + esc(dayShort(M.d)) + ' · ' + (M.list.length ? t('ofDone', '<b>' + M.doneN + '</b>', M.list.length) : esc(t('nothingToday'))) + '</span></div><span class="fdots">' + dots + '</span></div>'
    + '<div class="dialw" id="dialw">' + dialSVG(M.arcs, M.nm) + '<span class="flbl" style="left:106px;top:3px">06</span><span class="flbl" style="left:198px;top:159px">12</span><span class="flbl" style="left:14px;top:159px">18</span>'
    + '<button class="orb press" data-a="orbTap" aria-label="Plan"><span class="n" id="orbN">' + esc(n) + '</span><span class="s" id="orbS">' + esc(s) + '</span></button></div>'
    + '<div class="prow">' + pill + '</div></section>'
    + laterHTML(M, nx) + '</div>';
  el._arcs = M.arcs;
  auraFromCards(nx && nx.card ? cardColor(nx.card) : null);
}
let peekT = null;
ACT.peek = el => {
  const a = $('#s-home')._arcs[+el.dataset.k]; if (!a) return;
  clearTimeout(peekT); swapText($('#orbN'), a.time); swapText($('#orbS'), a.t);
  const p = $$('#dialw .arcI')[+el.dataset.k]; if (p && !RM) p.animate([{ strokeWidth: 6 }, { strokeWidth: 11 }, { strokeWidth: 6 }], { duration: 650, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  peekT = setTimeout(() => { const [n, s] = orbText(homeModel()); swapText($('#orbN'), n); swapText($('#orbS'), s); }, 2200);
};
ACT.orbTap = () => { V.planDay = T(); V.planWeek = weekStart(T()); V.planMode = 'list'; go('plan'); };
ACT.homeDone = el => {
  const i = itemById(el.dataset.id); if (!i) return;
  const d = i.repeat ? T() : T();
  setDone(i, d, true); haptic();
  const k = ($('#s-home')._arcs || []).findIndex(a => a.id === i.id);
  if (k >= 0 && !RM) { const p = $$('#dialw .arcI')[k]; if (p) p.animate([{ strokeWidth: 6 }, { strokeWidth: 13 }, { strokeWidth: 6 }], { duration: 600, easing: 'cubic-bezier(.3,1.4,.5,1)' }); }
  const ck = el.querySelector('svg path'); if (ck && !RM) ck.animate([{ strokeDasharray: '24', strokeDashoffset: 24 }, { strokeDasharray: '24', strokeDashoffset: 0 }], { duration: 360 });
  toast(esc(t('completed', i.t)), { label: t('undo'), fn: () => { setDone(i, d, false); render(); } });
  setTimeout(() => { render(); const tl = i.card && $('#s-home .tile[data-id="' + i.card + '"]'); if (tl) pulse(tl, cardColor(i.card)); }, 380);
};
ACT.nudgeAdd = el => { const c = cardById(el.dataset.id); if (!c) return; S.items.push({ id: uid(), t: '10 min · ' + c.name, card: c.id, date: T(), created: T() }); save(); render(); toast(esc(t('planned', t('today')))); };

/* ---------------- SPACES ---------------- */
function filteredCards() { return S.cards.filter(c => V.deckFilter === 'all' || (V.deckFilter === 'habit' ? c.type === 'habit' : c.type === 'project')); }
function deckCardHTML(c, idx, total) {
  const d = T();
  let ring, ringTx, sub, nextHTML, rows = '';
  if (c.type === 'habit') {
    const w = habitWeek(c.id); const n = w.filter(Boolean).length;
    ring = ringSVG(66, n / 7, c.color); ringTx = n + '/7';
    const st = streakOf(c.id); sub = esc(t('streak')) + ' <b>' + st + ' ' + esc(st === 1 ? t('day1') : t('days')) + '</b> · ' + esc(t('best', bestStreak(c.id)));
    const its = cardItems(c.id).filter(i => occurs(i, d));
    const nx = its.find(i => !isDone(i, d)) || its[0] || cardItems(c.id).find(i => !i.done);
    nextHTML = nx ? nextPill(nx, occurs(nx, d) ? d : (nx.date || d), c, its.length && occurs(nx, d) ? t('todayCap') : t('nextStep')) : emptyNext(c);
    cardItems(c.id).filter(i => i !== nx && (i.repeat || !i.done)).slice(0, 2).forEach(i => rows += itemRow(i, occurs(i, d) ? d : (i.date || d), { withCard: false }));
  } else {
    const ps = projectStats(c.id);
    ring = ringSVG(66, ps.total ? ps.done / ps.total : 0, c.color); ringTx = ps.done + '/' + ps.total;
    sub = c.deadline ? esc(t('deadline')) + ' ' + esc(dayShort(c.deadline)) + ' · <b>' + esc(deadlineText(c.deadline)) + '</b>' : esc(t('noDeadline'));
    nextHTML = ps.next ? nextPill(ps.next, ps.next.date || d, c, t('nextStep')) : emptyNext(c);
    cardItems(c.id).filter(i => !i.repeat && !i.done && i !== ps.next).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 2).forEach(i => rows += itemRow(i, i.date || d, { withCard: false }));
  }
  const ms = cardMoments(c.id);
  const mom = ms.length ? '<div class="cap mcap" style="margin-top:14px">' + esc(t('moments')) + ' · ' + ms.length + '</div><div class="thumbs" style="margin-top:9px">' + ms.slice(0, 4).map(thumbHTML).join('') + '</div>' : '';
  return '<section class="spc frost" data-card="' + c.id + '" data-a="openCard" data-id="' + c.id + '" role="button"><div class="h">' + kickOf(c) + '<span class="muted" style="font:400 12.5px/1 Inter">' + pad(idx + 1) + ' / ' + pad(total) + '</span></div>'
    + '<div class="ringw">' + ring + '<span>' + ringTx + '</span></div><div class="nm">' + esc(c.name) + '</div><div class="sub">' + sub + '</div>'
    + nextHTML + '<div style="margin-top:6px">' + rows + '</div>' + mom
    + '<div style="flex:1;min-height:14px"></div><button class="pbtn cr press" style="width:100%" data-a="openCard" data-id="' + c.id + '">' + esc(t('openCard')) + ' ' + ico('arrow', 18, 2.2) + '</button></section>';
}
function nextPill(i, d, c, label) {
  const on = isDone(i, d);
  return '<div class="nextp in" role="button" data-a="openItem" data-id="' + i.id + '"><button class="ic" data-a="toggle" data-id="' + i.id + '" data-d="' + d + '" aria-label="' + esc(t('done')) + '">' + (on ? '<span style="width:24px;height:24px;border-radius:12px;background:' + c.color + ';display:flex;align-items:center;justify-content:center;color:#13233a">' + ico('check', 14, 3) + '</span>' : '<i style="--c:' + c.color + '"></i>') + '</button><span class="tx"><span class="cap" style="color:' + c.color + ';filter:brightness(1.35)">' + esc(label) + '</span><span' + (on ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(i.t) + '</span></span><span class="muted" style="font:400 13px/1 Inter;flex:none">' + esc(whenLabel(i) || '') + '</span></div>';
}
function emptyNext(c) { return '<button class="nextp in press" data-a="add" data-card="' + c.id + '"><span class="ic">' + ico('plus', 18, 2.4) + '</span><span class="tx"><span style="white-space:normal;font:400 14px/1.35 Inter;color:var(--ink2)">' + esc(t('noTasksYet')) + '</span></span></button>'; }
function renderSpaces() {
  const el = $('#s-spaces'); const cs = filteredCards();
  const chips = [['all', t('all') + ' · ' + S.cards.length], ['habit', t('habits')], ['project', t('projects')]].map(([k, l]) => '<button class="chip ' + (V.deckFilter === k ? 'cr' : 'frost') + ' press" data-a="deckFilter" data-k="' + k + '">' + (k === 'habit' ? '<span class="dot" style="--c:var(--green)"></span>' : k === 'project' ? '<span class="dot" style="--c:var(--orange)"></span>' : '') + esc(l) + '</button>').join('');
  let body;
  if (!S.cards.length) body = '<section class="frost solid" style="border-radius:30px;padding:24px 20px;margin-top:6px"><div style="font:800 26px/1.1 \'Bricolage Grotesque\'">' + esc(t('newCard')) + '</div><p style="font:400 15px/1.45 Inter;color:var(--ink2);margin:10px 0 18px">' + esc(t('cardsEmpty')) + '</p><button class="pbtn cr press" style="width:100%" data-a="newCard">' + esc(t('addCard')) + '</button></section>';
  else if (V.spacesMode === 'deck') {
    V.deckIdx = clamp(V.deckIdx, 0, cs.length);
    body = '<div class="deck" id="deck">' + cs.map((c, k) => deckCardHTML(c, k, cs.length)).join('') + '<section class="spc frost" style="align-items:center;justify-content:center;text-align:center;gap:16px" data-a="newCard" role="button"><span class="ci" style="width:64px;height:64px;border-radius:32px">' + ico('plus', 28, 1.8) + '</span><div style="font:800 26px/1.1 \'Bricolage Grotesque\'">' + esc(t('newCard')) + '</div><div class="muted" style="font:400 14px/1.4 Inter;max-width:220px">' + esc(t('cardsEmpty')) + '</div></section></div>'
      + '<div class="ddots" id="ddots">' + [...cs, null].map((_, k) => '<i class="' + (k === V.deckIdx ? 'on' : '') + '"></i>').join('') + '</div>';
  } else {
    body = '<div class="stack">' + cs.map(c => {
      let sub, ring;
      if (c.type === 'habit') { const n = habitWeek(c.id).filter(Boolean).length; ring = ringSVG(48, n / 7, c.color, 3.5); sub = t('habit') + ' · ' + n + '/7 ' + t('thisWeek'); }
      else { const ps = projectStats(c.id); ring = ringSVG(48, ps.total ? ps.done / ps.total : 0, c.color, 3.5); sub = t('project') + ' · ' + ps.open + ' ' + t('open') + (c.deadline ? ' · ' + deadlineText(c.deadline) : ''); }
      return '<button class="lrow frost press" data-a="openCard" data-id="' + c.id + '"><span style="position:relative;width:48px;height:48px;flex:none">' + ring + '<span class="led" style="--c:' + c.color + ';position:absolute;left:20px;top:20px"></span></span><span class="tx"><span>' + esc(c.name) + '</span><small>' + esc(sub) + '</small></span>' + ico('chev', 16, 2.2) + '</button>';
    }).join('') + '<button class="lrow frost press" data-a="newCard"><span class="ci" style="width:48px;height:48px;border-radius:24px">' + ico('plus', 20, 1.8) + '</span><span class="tx"><span>' + esc(t('newCard')) + '</span><small>' + esc(t('newCardSub')) + '</small></span></button></div>';
  }
  el.innerHTML = '<div class="hdr"><h1 class="t1">' + esc(t('spaces')) + '</h1><div class="seg frost"><button class="' + (V.spacesMode === 'deck' ? 'on' : '') + '" data-a="spacesMode" data-k="deck">' + esc(t('deck')) + '</button><button class="' + (V.spacesMode === 'list' ? 'on' : '') + '" data-a="spacesMode" data-k="list">' + esc(t('list')) + '</button></div></div>'
    + '<div class="chips" style="margin-bottom:14px">' + chips + '</div>' + body;
  const deck = $('#deck');
  if (deck) {
    const w = () => (deck.firstElementChild ? deck.firstElementChild.getBoundingClientRect().width + 12 : 1);
    requestAnimationFrame(() => { deck.scrollLeft = V.deckIdx * w(); });
    let raf = 0;
    deck.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const k = Math.round(deck.scrollLeft / w()); if (k !== V.deckIdx) { V.deckIdx = k; $$('#ddots i').forEach((d, j) => d.classList.toggle('on', j === k)); const c = cs[k]; auraFromCards(c ? c.color : null); } }); }, { passive: true });
    const c = cs[V.deckIdx]; auraFromCards(c ? c.color : null);
  } else auraFromCards(null);
}
ACT.deckFilter = el => { V.deckFilter = el.dataset.k; V.deckIdx = 0; renderSpaces(); };
ACT.spacesMode = el => { V.spacesMode = el.dataset.k; renderSpaces(); };

/* ---------------- CARD DETAIL ---------------- */
function heatHTML(c) {
  const d = T(); const start = addD(weekStart(d), -21); const set = new Set();
  let html = ''; let good = 0; const cnt = {};
  for (let k = 0; k < 28; k++) {
    const x = addD(start, k); const n = completionsOn(x, c.id); if (x <= d) cnt[dow(x)] = (cnt[dow(x)] || 0) + (n ? 1 : 0);
    const cls = x > d ? 'fu' : n >= 3 ? 'l3' : n === 2 ? 'l2' : n === 1 ? 'l1' : '';
    html += '<i class="' + cls + (x === d ? ' td' : '') + '"' + (x <= d ? ' data-a="heatTap" data-d="' + x + '" role="button" aria-label="' + esc(dayShort(x)) + '"' : '') + '></i>';
    if (x >= weekStart(d) && x <= d && n) good++;
  }
  const bestK = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const total = [...cardDaySet(c.id)].filter(x => x >= start && x <= d).length;
  return '<section class="frost solid" style="border-radius:30px;padding:16px 18px"><div style="display:flex;justify-content:space-between"><span class="cap">' + esc(t('rhythm')) + '</span><span class="muted" style="font:400 12px/1 Inter">' + esc(t('less')) + ' <i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:color-mix(in srgb,' + c.color + ' 34%,transparent)"></i> <i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + c.color + '"></i> ' + esc(t('more')) + '</span></div>'
    + '<div style="display:flex;gap:18px;align-items:flex-end;margin-top:14px"><div class="heat" style="--c:' + c.color + '">' + html + '</div><div style="display:flex;flex-direction:column;gap:8px;padding-bottom:4px;min-width:0"><span class="num" style="font-size:38px">' + total + '<small>' + esc(t('of')) + ' ' + Math.max(total, Math.min(28, daysBetween(start, d) + 1, c.created ? daysBetween(c.created, d) + 1 : 28)) + '</small></span><span style="font:400 12.5px/1.35 Inter;color:var(--ink2)">' + (bestK && bestK[1] ? esc(t('bestDay', WD[lang()][+bestK[0]])) + '<br>' : '') + esc(t('goodDays', good)) + '</span></div></div><div class="muted" style="font:400 12px/1 Inter;margin-top:12px">' + esc(t('tapDayHint')) + '</div></section>';
}
function renderCard() {
  const el = $('#s-card'); const c = cardById(V.card); if (!c) { closeCard(); return; }
  const d = T(); let hero = '';
  if (c.type === 'habit') {
    const w = habitWeek(c.id); const n = w.filter(Boolean).length; const td = dow(d);
    const wd = w.map((on, k) => '<span><i class="' + (on ? 'on' : '') + (k === td ? ' td' : '') + (k > td ? ' fu' : '') + '"></i>' + WD1[lang()][k] + '</span>').join('');
    const st = streakOf(c.id), ms = monthCount(c.id);
    const wk = [3, 2, 1, 0].map(k => { const ws = addD(weekStart(d), -7 * k); return [0, 1, 2, 3, 4, 5, 6].filter(j => cardDaySet(c.id).has(addD(ws, j))).length; });
    hero = '<section class="hero frost" style="--c:' + c.color + '"><span class="cap">' + esc(t('thisWeekCap')) + '</span><div class="num" style="font-size:60px;margin-top:14px">' + n + '<small style="font-size:16px">/ 7 ' + esc(t('days')) + '</small></div><div class="wdots">' + wd + '</div>'
      + '<div class="ringw">' + segRing(112, 7, w, c.color, 5, td) + '<span><span style="font:800 24px/1 \'Bricolage Grotesque\'">' + Math.round(n / 7 * 100) + '%</span><span class="muted" style="font:400 11px/1 Inter">' + esc(t('ofTheWeek')) + '</span></span></div></section>'
      + '<div class="grid2"><div class="tile frost" style="min-height:96px"><span class="top"><span class="ci">' + ico('flame', 17, 1.7) + '</span><span class="fl"><span>' + esc(t('streak')) + '</span><small>' + esc(t('best', bestStreak(c.id))) + '</small></span></span><span class="bot"><span class="num">' + st + '<small>' + esc(st === 1 ? t('day1') : t('days')) + '</small></span>' + spark([1, 2, 3, 4, 5].map(k => Math.min(k, st + 1)), c.color, 54, 24) + '</span></div>'
      + '<div class="tile frost" style="min-height:96px"><span class="top"><span class="ci">' + ico('cal', 17, 1.7) + '</span><span class="fl"><span>' + esc(MON[lang()][new Date().getMonth()]) + '</span><small>' + esc(t('weekDone')) + '</small></span></span><span class="bot"><span class="num">' + ms + '<small>' + esc(t('days')) + '</small></span>' + spark(wk, c.color, 54, 24) + '</span></div></div>'
      + heatHTML(c);
  } else {
    const ps = projectStats(c.id); const mc = cardMoments(c.id).length;
    hero = '<div class="stat3"><div class="frost"><span class="cap">' + esc(t('openOf')) + '</span><span class="num">' + ps.open + '<small>' + esc(t('of')) + ' ' + ps.total + '</small></span></div>'
      + '<button class="frost press" data-a="editCard"><span class="cap">' + esc(t('deadline')) + '</span>' + (c.deadline ? '<span class="num">' + (daysBetween(d, c.deadline) >= 0 ? daysBetween(d, c.deadline) : '−' + (-daysBetween(d, c.deadline))) + '<small>' + esc(t('days')) + '</small></span>' : '<span class="num" style="font-size:20px;color:#ffc98a">' + esc(t('setDeadline')) + '</span>') + '</button>'
      + '<div class="frost"><span class="cap">' + esc(t('moments')) + '</span><span class="num">' + mc + '</span></div></div>';
    if (ps.next) hero += nextPill(ps.next, ps.next.date || d, c, t('nextStep')).replace('class="nextp in"', 'class="nextp frost" style="margin-top:0"');
  }
  const todays = cardItems(c.id).filter(i => occurs(i, d) || (!i.repeat && i.date && i.date < d && !i.done));
  const todayHTML = '<div class="sec"><span class="cap">' + esc(t('todayCap')) + '</span><section class="frost solid" style="border-radius:26px;padding:4px 12px">' + (todays.length ? todays.map(i => itemRow(i, occurs(i, d) ? d : i.date, { withCard: false })).join('') : '<div class="irow"><span class="tx"><small style="font-size:13.5px">' + esc(t('noTodayCard')) + '</small></span><button class="r warn" data-a="add" data-card="' + c.id + '" data-ctx="today">' + esc(t('addToday')) + '</button></div>') + '</section></div>';
  const open = cardItems(c.id).filter(i => (i.repeat || !i.done) && !todays.includes(i)).sort((a, b) => (a.repeat ? 0 : 1) - (b.repeat ? 0 : 1) || (a.date || '9999').localeCompare(b.date || '9999'));
  const doneL = cardItems(c.id).filter(i => !i.repeat && i.done).sort((a, b) => (b.doneOn || '').localeCompare(a.doneOn || ''));
  const sd = V.showDone[c.id];
  const tasks = '<div class="sec"><span class="cap" style="display:flex;justify-content:space-between;align-items:center">' + esc(t('tasks')) + (doneL.length ? '<button class="muted" style="letter-spacing:.06em;text-transform:none;font:500 12.5px/1 Inter" data-a="toggleShowDone">' + esc(sd ? t('hideDone') : t('showDone', doneL.length)) + ' ' + ico(sd ? 'chevL' : 'chevD', 12, 2.4) + '</button>' : '') + '</span><section class="frost solid" style="border-radius:26px;padding:4px 12px">'
    + open.map(i => itemRow(i, i.repeat ? d : (i.date || d), { withCard: false })).join('') + (sd ? doneL.map(i => itemRow(i, i.date || d, { withCard: false })).join('') : '')
    + '<div class="addline"><span class="ci" style="width:24px;height:24px;border-radius:12px;border-style:dashed">' + ico('plus', 14, 2.4) + '</span><input id="addTaskIn" enterkeyhint="done" autocomplete="off" placeholder="' + esc(t('addTask')) + '" aria-label="' + esc(t('addTask')) + '"></div></section></div>';
  const ps = projectStats(c.id);
  const noticed = S.nudges && c.type === 'project' && ps.noDay ? '<div class="sec"><section class="noticed frost"><span class="tx"><span class="cap">' + esc(t('noted')) + '</span>' + esc(ps.noDay === 1 ? t('noDayTask1') : t('noDayTasks', ps.noDay)) + '</span><button class="chip cr press" data-a="when" data-id="' + cardItems(c.id).find(i => !i.repeat && !i.done && !i.date).id + '">' + esc(t('pickDay')) + '</button></section></div>' : '';
  const ms = cardMoments(c.id);
  const mom = '<div class="sec"><span class="cap">' + esc(t('moments')) + (ms.length ? ' · ' + ms.length : '') + '</span><div class="thumbs"><button class="th press" data-a="add" data-card="' + c.id + '" data-mode="photo" aria-label="' + esc(t('capture')) + '" style="display:flex;align-items:center;justify-content:center;border:1.5px dashed rgba(243,234,216,.35);background:none">' + ico('plus', 22, 1.8) + '</button>' + ms.map(thumbHTML).join('') + '</div></div>';
  const note = '<div class="sec"><span class="cap">' + esc(t('note')) + '</span><section class="frost solid" style="border-radius:24px;padding:14px 16px"><textarea class="cn" id="cardNote" placeholder="' + esc(t('notePh')) + '" aria-label="' + esc(t('note')) + '">' + esc(c.note || '') + '</textarea></section></div>';
  el.innerHTML = '<div class="hdr"><button class="cb frost press" data-a="closeCard" aria-label="Back">' + ico('back', 20, 2.2) + '</button><button class="cb frost press" data-a="editCard" aria-label="' + esc(t('editCard')) + '">' + ico('more', 20, 2) + '</button></div>'
    + kickOf(c) + '<h1 class="cname">' + esc(c.name) + '</h1>' + (c.type === 'project' && c.deadline ? '<div class="cnote">' + esc(t('deadline')) + ' ' + esc(dayShort(c.deadline)) + ' · <b>' + esc(deadlineText(c.deadline)) + '</b></div>' : '')
    + '<div class="stack" style="margin-top:18px">' + hero + '</div>' + todayHTML + tasks + noticed + mom + note;
  setAura([c.color, c.color, S.cards.find(x => x.id !== c.id)?.color || '#6f8cff']);
  const inp = $('#addTaskIn');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const v = inp.value.trim(); if (!v) return; const p = NL(v); const it = { id: uid(), t: stripSpans(v, p.spans) || v, card: c.id, created: T() }; if (p.date) it.date = p.date; if (p.time) it.time = p.time; if (p.repeat) { it.repeat = p.repeat; it.doneDates = []; if (!it.date) it.date = T(); } S.items.push(it); save(); const y = el.scrollTop; renderCard(); el.scrollTop = y; const ni = $('#addTaskIn'); ni && ni.focus({ preventScroll: true }); haptic(); } });
  const ta = $('#cardNote'); let nt = null; ta.addEventListener('input', () => { clearTimeout(nt); nt = setTimeout(() => { c.note = ta.value; save(); }, 300); }); ta.addEventListener('blur', () => { c.note = ta.value; save(); });
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(90, ta.scrollHeight) + 'px'; }; ta.addEventListener('input', fit); requestAnimationFrame(fit);
}
ACT.toggleShowDone = () => { V.showDone[V.card] = !V.showDone[V.card]; const el = $('#s-card'); const y = el.scrollTop; renderCard(); el.scrollTop = y; };
ACT.heatTap = el => {
  const c = cardById(V.card); const x = el.dataset.d; if (!c) return;
  let r = cardItems(c.id).find(i => i.repeat);
  if (!r) { r = { id: uid(), t: c.name, card: c.id, repeat: 'daily', doneDates: [], date: addD(T(), -60), created: T() }; S.items.push(r); }
  const on = completionsOn(x, c.id) > 0;
  if (on) { cardItems(c.id).forEach(i => { if (i.repeat) i.doneDates = (i.doneDates || []).filter(z => z !== x); else if (i.done && i.doneOn === x) { i.done = false; i.doneOn = null; } }); }
  else { r.doneDates = r.doneDates || []; r.doneDates.push(x); }
  save(); haptic(); const s = $('#s-card'); const y = s.scrollTop; renderCard(); s.scrollTop = y;
};

/* ---------------- BOARD ---------------- */
function boardList() {
  let ms = S.moments.slice();
  if (V.boardFilter === 'none') ms = ms.filter(m => !m.card || !cardById(m.card));
  else if (V.boardFilter !== 'all') ms = ms.filter(m => m.card === V.boardFilter);
  if (V.boardQ) { const q = V.boardQ.toLowerCase(); ms = ms.filter(m => (m.note || '').toLowerCase().includes(q) || ((cardById(m.card) || {}).name || '').toLowerCase().includes(q)); }
  return ms.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.d || '').localeCompare(a.d || '') || (b.ts || 0) - (a.ts || 0));
}
function tileMoment(m) {
  const c = cardColor(m.card);
  if (m.kind === 'note') return '<button class="mt note press" style="--c:' + c + '" data-a="viewMoment" data-id="' + m.id + '">' + (m.card && cardById(m.card) ? '<span class="led" style="--c:' + c + '"></span>' : '<span class="led" style="--c:rgba(243,234,216,.6);box-shadow:none"></span>') + '<div class="nt">' + esc(m.note) + '</div><div class="dt">' + esc(dayShort(m.d)) + '</div>' + (m.pin ? '<span class="pin frost">' + ico('pin', 14, 1.9) + '</span>' : '') + '</button>';
  const u = mediaNow(m.img); const ar = 'aspect-ratio:1/' + clamp(m.r || 1, .55, 1.8).toFixed(3);
  const media = m.kind === 'video' ? (m.thumb ? '<img src="' + mediaNow(m.thumb) + '" alt="" style="' + ar + '">' : '<video src="' + u + '#t=0.1" muted playsinline preload="auto" style="' + ar + '"></video>') + '<span class="play frost">' + ico('play', 18, 2) + '</span>' + (m.dur ? '<span class="dur frost">' + Math.floor(m.dur / 60) + ':' + pad(Math.round(m.dur % 60)) + '</span>' : '') : '<img src="' + u + '" alt="' + esc(m.note || '') + '" style="' + ar + '" loading="lazy">';
  return '<button class="mt press" data-a="viewMoment" data-id="' + m.id + '">' + media + (m.note ? '<span class="capg">' + (m.card && cardById(m.card) ? '<span class="dot" style="--c:' + c + ';margin-right:6px;vertical-align:1px"></span>' : '') + esc(m.note) + '</span>' : '') + (m.pin ? '<span class="pin frost">' + ico('pin', 14, 1.9) + '</span>' : '') + '</button>';
}
function boardGrid(ms) {
  return ms.length ? '<div class="masonry">' + ms.map(tileMoment).join('') + '</div>' : '<section class="frost solid" style="border-radius:30px;padding:26px 20px;text-align:center"><p style="font:400 15px/1.45 Inter;color:var(--ink2);margin:0 0 18px">' + esc(S.moments.length ? (lang() === 'cs' ? 'Nic neodpovídá filtru.' : 'Nothing matches this filter.') : t('boardEmpty')) + '</p><button class="pbtn cr press" style="width:100%" data-a="add" data-mode="photo">' + esc(t('capture')) + '</button></section>';
}
function renderBoard() {
  const el = $('#s-board'); const ms = boardList();
  const chips = '<button class="chip ' + (V.boardFilter === 'all' ? 'cr' : 'frost') + ' press" data-a="boardFilter" data-k="all">' + esc(t('all')) + '</button>' + S.cards.map(c => '<button class="chip ' + (V.boardFilter === c.id ? 'cr' : 'frost') + ' press" data-a="boardFilter" data-k="' + c.id + '"><span class="dot" style="--c:' + c.color + '"></span>' + esc(c.name) + '</button>').join('') + '<button class="chip ' + (V.boardFilter === 'none' ? 'cr' : 'frost') + ' press" data-a="boardFilter" data-k="none">' + esc(t('noCard')) + '</button>';
  el.innerHTML = '<div class="hdr"><h1 class="t1">' + esc(t('board')) + '</h1><button class="cb frost press" data-a="boardSearch" aria-label="' + esc(t('search')) + '">' + ico(V.boardSearch ? 'x' : 'search', 20, 2) + '</button></div>'
    + (V.boardSearch ? '<div class="search frost">' + ico('search', 18, 2) + '<input id="boardQ" type="search" placeholder="' + esc(t('searchPh')) + '" value="' + esc(V.boardQ) + '" autocomplete="off"></div>' : '')
    + '<div class="chips" style="margin-bottom:14px">' + chips + '</div>'
    + '<div id="boardGrid">' + boardGrid(ms) + '</div>';
  const q = $('#boardQ'); if (q) { q.addEventListener('input', () => { V.boardQ = q.value; $('#boardGrid').innerHTML = boardGrid(boardList()); }); }
  auraFromCards(V.boardFilter !== 'all' && V.boardFilter !== 'none' ? cardColor(V.boardFilter) : null);
}
ACT.boardFilter = el => { V.boardFilter = el.dataset.k; renderBoard(); };
ACT.boardSearch = () => { V.boardSearch = !V.boardSearch; if (!V.boardSearch) V.boardQ = ''; renderBoard(); if (V.boardSearch) setTimeout(() => { const q = $('#boardQ'); q && q.focus(); }, 50); };

/* ---------------- PLAN ---------------- */
function dayDots(d) { const cs = [...new Set(itemsOn(d).map(i => cardColor(i.card)))].slice(0, 3); return cs.map(c => '<i style="--c:' + c + '"></i>').join(''); }
function weekStrip() {
  const ws = V.planWeek; let h = '';
  for (let k = 0; k < 7; k++) { const d = addD(ws, k); h += '<button class="wd' + (d === V.planDay ? ' on' : '') + (d === T() ? ' tdy' : '') + '" data-a="planDay" data-d="' + d + '"><span class="l">' + WD[lang()][k] + '</span><span class="n">' + dOf(d).getDate() + '</span><span class="ds">' + dayDots(d) + '</span></button>'; }
  return '<section class="wstrip frost" id="wstrip">' + h + '</section>';
}
function weekNav() {
  const ws = V.planWeek, we = addD(ws, 6);
  const lbl = dOf(ws).getDate() + '. ' + (dOf(ws).getMonth() !== dOf(we).getMonth() ? MON[lang()][dOf(ws).getMonth()].slice(0, 3) + ' ' : '') + '– ' + dOf(we).getDate() + '. ' + MON[lang()][dOf(we).getMonth()].slice(0, 3);
  return '<div class="wnav"><button class="frost press" data-a="weekShift" data-n="-1" aria-label="Previous week">' + ico('chevL', 15, 2.4) + '</button><span>' + esc(lbl) + (ws !== weekStart(T()) ? ' · <button data-a="weekToday" style="height:auto;padding:0;color:var(--ink);font-weight:600">' + esc(t('today')) + '</button>' : '') + '</span><button class="frost press" data-a="weekShift" data-n="1" aria-label="Next week">' + ico('chev', 15, 2.4) + '</button></div>';
}
function trow(i, d, nextId) {
  const on = isDone(i, d); const late = !i.repeat && i.date < T() && !on;
  return '<div class="trow' + (on ? ' done' : '') + (i.id === nextId ? ' next' : '') + (late ? ' late' : '') + '" role="button" data-a="openItem" data-id="' + i.id + '" style="--c:' + cardColor(i.card) + '"><span class="tm">' + (late ? esc(dayShort(i.date)) : i.time || esc(t('any'))) + '</span><span class="bar"></span><span class="tx"><span>' + esc(i.t) + '</span><small>' + esc([itemSub(i), i.dur && i.time ? i.dur + ' min' : ''].filter(Boolean).join(' · ') || (i.time ? '' : t('anyTime'))) + '</small></span>' + checkBtn(i, d) + '</div>';
}
function renderPlan() {
  const el = $('#s-plan'); if (!V.planDay) V.planDay = T(); if (!V.planWeek) V.planWeek = weekStart(V.planDay); if (!V.monCursor) V.monCursor = T().slice(0, 7);
  const seg = '<div class="seg frost">' + [['list', t('list')], ['week', t('week')], ['month', lang() === 'cs' ? 'Měsíc' : 'Month']].map(([k, l]) => '<button class="' + (V.planMode === k ? 'on' : '') + '" data-a="planMode" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
  let body = '';
  if (V.planMode === 'list') {
    const d = V.planDay, isT = d === T(); const its = itemsOn(d); const od = isT ? overdueItems() : [];
    const nm = nowMin(); const nextT = isT ? its.find(i => i.time && !isDone(i, d) && tmin(i.time) + (i.dur || 45) > nm) : null;
    let rows = ''; let nowPlaced = !isT;
    const nowLine = '<div class="nowl"><b>' + mtime(nm) + '</b><span><i></i></span></div>';
    its.forEach(i => { if (!nowPlaced && (!i.time || tmin(i.time) > nm)) { rows += nowLine; nowPlaced = true; } rows += trow(i, d, nextT && nextT.id); });
    if (!nowPlaced && its.length) rows += nowLine;
    const left = its.filter(i => !isDone(i, d)).length + od.length;
    body = weekStrip() + weekNav()
      + '<section class="dayp frost solid" style="margin-top:12px"><div class="dh"><b>' + esc(dayFull(d)) + '</b><span class="muted" style="font:400 13px/1 Inter">' + (its.length + od.length ? esc(t('leftN', left)) : '') + '</span></div>'
      + (od.length ? '<div class="cap" style="margin:10px 0 2px;color:#ffb3a9">' + esc(t('overdue')) + '</div>' + od.map(i => trow(i, i.date, null)).join('') + '<div style="height:1px;background:rgba(255,255,255,.08);margin:6px 0"></div>' : '')
      + (its.length ? rows : '<div class="muted" style="font:400 14px/1.4 Inter;padding:14px 0 4px">' + esc(t('emptyDay')) + '</div>')
      + '<button class="addday in press" data-a="add" data-date="' + d + '">' + ico('plus', 16, 2.2) + esc(t('addTo', lang() === 'cs' && Math.abs(daysBetween(T(), d)) <= 1 ? dayName(d).toLowerCase() : dayName(d))) + '</button></section>';
    const nd = undatedItems();
    body += '<section class="frost solid nodue" style="border-radius:30px;padding:16px 18px;margin-top:10px"><div style="display:flex;justify-content:space-between"><span class="cap">' + esc(t('noDayYet')) + ' · ' + nd.length + '</span><span class="muted" style="font:400 12px/1 Inter">' + esc(t('fromCards')) + '</span></div>'
      + (nd.length ? '<div class="chips wrap" style="margin-top:14px">' + nd.map(i => '<button class="chip in" data-a="when" data-drag="' + i.id + '" data-id="' + i.id + '"><span class="dot" style="--c:' + cardColor(i.card) + '"></span>' + esc(i.t) + '</button>').join('') + '</div><div class="muted" style="margin-top:14px;font:400 12.5px/1.35 Inter">' + esc(t('dragHint')) + '</div>' : '<div class="muted" style="margin-top:12px;font:400 13px/1.4 Inter">' + (lang() === 'cs' ? 'Všechno má svůj den.' : 'Everything has a day.') + '</div>') + '</section>';
  } else if (V.planMode === 'week') {
    const H = 432, S0 = 360, SPAN = 1080; const cs = lang() === 'cs';
    let head = '<span></span>', cols = '', tot = 0, dn = 0, best = [-1, 0];
    for (let k = 0; k < 7; k++) {
      const d = addD(V.planWeek, k); const its = itemsOn(d); const isT = d === T();
      const doneN = its.filter(i => isDone(i, d)).length; tot += its.length; dn += doneN; if (doneN > best[1]) best = [k, doneN];
      const un = its.filter(i => !i.time).slice(0, 3).map(i => '<i style="--c:' + cardColor(i.card) + ';' + (isDone(i, d) ? '' : 'opacity:.45') + '"></i>').join('');
      head += '<button class="' + (isT ? 'tdy' : '') + '" data-a="openDay" data-d="' + d + '">' + esc(WD[lang()][k].slice(0, 2)) + '<b>' + dOf(d).getDate() + '</b><span class="dd">' + un + '</span></button>';
      const nm = nowMin(); const nextT = isT ? its.find(i => i.time && !isDone(i, d) && tmin(i.time) + (i.dur || 45) > nm) : null;
      let bl = '';
      its.filter(i => i.time).forEach(i => {
        const st = Math.max(0, tmin(i.time) - S0), du = i.dur || 45; const top = st / SPAN * H; const h = Math.max(18, du / SPAN * H);
        bl += '<button class="wg-b' + (isDone(i, d) ? ' done' : '') + (nextT && nextT.id === i.id ? ' next' : '') + '" style="--c:' + cardColor(i.card) + ';top:' + top.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px" data-a="openItem" data-id="' + i.id + '" aria-label="' + esc(i.time + ' ' + i.t) + '"></button>';
      });
      if (isT) { const y = Math.min(H, Math.max(0, (nm - S0) / SPAN * H)); bl += '<span class="wg-now" style="top:' + y.toFixed(1) + 'px"></span>'; }
      cols += '<div class="wg-col' + (isT ? ' tdy' : '') + '" style="grid-column:' + (k + 2) + '" data-a="openDay" data-d="' + d + '">' + bl + '</div>';
    }
    let lines = ''; [0, 6, 12, 18].forEach(hh => { const y = hh / 18 * H; lines += '<span class="hl" style="top:' + y + 'px"></span><span class="hlab" style="top:' + y + 'px">' + pad(6 + hh) + '</span>'; });
    const sum = tot ? (cs ? '<b>' + dn + '</b> z ' + tot + ' hotovo' + (best[0] >= 0 ? ' · nejvíc ' + WD.cs[best[0]] : '') : '<b>' + dn + '</b> of ' + tot + ' done' + (best[0] >= 0 ? ' · best ' + WD.en[best[0]] : '')) : (cs ? 'Prázdný týden' : 'Empty week');
    body = weekNav().replace('class="wnav"', 'class="wnav" style="margin:0 4px 12px"')
      + '<section class="wgrid frost solid"><div class="wg-sum">' + sum + '</div><div class="wg-head">' + head + '</div><div class="wg-body" style="height:' + H + 'px">' + lines + cols + '</div>'
      + '<div class="wg-leg"><span><i class="o"></i>' + (cs ? 'naplánováno' : 'planned') + '</span><span><i></i>' + (cs ? 'hotovo' : 'done') + '</span><span><i class="nw"></i>' + (cs ? 'teď' : 'now') + '</span></div></section>'
      + '<div class="muted" style="text-align:center;font:400 12.5px/1.4 Inter;margin-top:10px">' + (cs ? 'Klepni na den pro detail, na blok pro úpravu.' : 'Tap a day for details, a block to edit.') + '</div>';
  } else {
    const [y, m] = V.monCursor.split('-').map(Number); const first = y + '-' + pad(m) + '-01'; const nDays = new Date(y, m, 0).getDate(); const off = dow(first);
    let g = WD1[lang()].map(w => '<span class="wl">' + w + '</span>').join('');
    for (let k = 0; k < off; k++) g += '<button class="pad" tabindex="-1" aria-hidden="true"></button>';
    const dls = new Set(S.cards.filter(c => c.deadline).map(c => c.deadline));
    for (let k = 1; k <= nDays; k++) {
      const d = y + '-' + pad(m) + '-' + pad(k); const n = completionsOn(d); const has = itemsOn(d).length;
      const cls = d > T() ? 'fu' : n >= 4 ? 'l3' : n >= 2 ? 'l2' : n >= 1 ? 'l1' : '';
      g += '<button class="' + cls + (d === T() ? ' td' : '') + (dls.has(d) ? ' dl' : '') + (d === V.monSel ? ' sel' : '') + '" data-a="monSel" data-d="' + d + '">' + k + (has && d >= T() ? '<i></i>' : '') + '</button>';
    }
    let det = '';
    if (V.monSel) {
      const d = V.monSel; const its = itemsOn(d); const dn = its.filter(i => isDone(i, d));
      const dlc = S.cards.filter(c => c.deadline === d);
      det = '<section class="frost solid" style="border-radius:28px;padding:16px 18px;margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font:800 20px/1 \'Bricolage Grotesque\'">' + esc(dayFull(d)) + '</b><span class="muted" style="font:400 13px/1 Inter">' + (its.length ? esc(t('doneOfDay', dn.length, its.length)) : '') + '</span></div>'
        + dlc.map(c => '<div style="margin-top:10px;font:500 14px/1.3 Inter;color:#ffc98a">' + esc(t('deadline')) + ' · ' + esc(c.name) + '</div>').join('')
        + (its.length ? '<div style="margin-top:6px">' + its.map(i => itemRow(i, d)).join('') + '</div>' : '<div class="muted" style="margin-top:10px;font:400 14px/1.4 Inter">' + esc(t('emptyDay')) + '</div>')
        + '<div class="btnrow" style="margin-top:12px"><button class="pbtn ghost press" data-a="add" data-date="' + d + '">' + ico('plus', 16, 2.2) + esc(t('addIt')) + '</button><button class="pbtn cr press" data-a="openDay" data-d="' + d + '">' + esc(t('openDay')) + '</button></div></section>';
    }
    body = '<section class="mon frost"><div class="mh"><button class="cb in press" style="width:38px;height:38px" data-a="monShift" data-n="-1" aria-label="Previous month">' + ico('chevL', 16, 2.4) + '</button><b>' + esc(MON[lang()][m - 1] + ' ' + y) + '</b><button class="cb in press" style="width:38px;height:38px" data-a="monShift" data-n="1" aria-label="Next month">' + ico('chev', 16, 2.4) + '</button></div><div class="mgrid">' + g + '</div>'
      + '<div class="legend"><span><i style="background:rgba(63,191,127,.28)"></i>' + esc(t('less')) + '</span><span><i style="background:rgba(63,191,127,.85)"></i>' + esc(t('moreDone')) + '</span><span><i style="box-shadow:inset 0 0 0 2px var(--orange)"></i>' + esc(t('deadlineLeg')) + '</span></div></section>' + det;
  }
  el.innerHTML = '<div class="hdr"><h1 class="t1">' + esc(t('plan')) + '</h1>' + seg + '</div>' + body;
  auraFromCards(null);
  if (V.planMode === 'list') bindPlanGestures();
}
ACT.planMode = el => { V.planMode = el.dataset.k; renderPlan(); };
ACT.planDay = el => { V.planDay = el.dataset.d; renderPlan(); };
ACT.weekShift = el => { const n = +el.dataset.n; V.planWeek = addD(V.planWeek, 7 * n); V.planDay = addD(V.planDay, 7 * n); renderPlan(); };
ACT.weekToday = () => { V.planWeek = weekStart(T()); V.planDay = T(); renderPlan(); };
ACT.openDay = el => { V.planDay = el.dataset.d; V.planWeek = weekStart(V.planDay); V.planMode = 'list'; renderPlan(); $('#s-plan').scrollTop = 0; };
ACT.monShift = el => { const [y, m] = V.monCursor.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.n, 1); V.monCursor = d.getFullYear() + '-' + pad(d.getMonth() + 1); V.monSel = null; renderPlan(); };
ACT.monSel = el => { V.monSel = V.monSel === el.dataset.d ? null : el.dataset.d; renderPlan(); };
function bindPlanGestures() {
  const strip = $('#wstrip'); if (!strip) return;
  let x0 = null, y0 = null;
  strip.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  strip.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { V.planWeek = addD(V.planWeek, dx < 0 ? 7 : -7); V.planDay = addD(V.planDay, dx < 0 ? 7 : -7); renderPlan(); } }, { passive: true });
  // drag undated chips onto week strip
  $$('.nodue [data-drag]').forEach(ch => {
    let st = null, ghost = null, moved = false, timer = null;
    ch.addEventListener('pointerdown', e => {
      st = { x: e.clientX, y: e.clientY, id: ch.dataset.drag }; moved = false;
      timer = setTimeout(() => { if (!st) return; moved = true; ghost = ch.cloneNode(true); ghost.classList.add('dragghost', 'frost'); ghost.style.left = st.x + 'px'; ghost.style.top = st.y + 'px'; document.body.appendChild(ghost); ch.classList.add('dragging'); haptic(); try { ch.setPointerCapture(e.pointerId); } catch (_) {} }, 260);
    });
    ch.addEventListener('pointermove', e => {
      if (!st) return;
      if (!moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) { clearTimeout(timer); if (!ghost) { st = null; return; } }
      if (ghost) { e.preventDefault(); ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; const tgt = document.elementFromPoint(e.clientX, e.clientY); $$('.wd').forEach(w => w.classList.toggle('drop', !!tgt && w.contains(tgt))); }
    });
    const end = e => {
      clearTimeout(timer);
      if (ghost) {
        const tgt = document.elementFromPoint(e.clientX, e.clientY); const wd = tgt && tgt.closest('.wd');
        ghost.remove(); ghost = null; ch.classList.remove('dragging'); $$('.wd').forEach(w => w.classList.remove('drop'));
        if (wd) { const i = itemById(st.id); if (i) { i.date = wd.dataset.d; save(); toast(esc(t('dragTo', dayName(i.date)))); V.planDay = i.date; renderPlan(); } }
        ch._suppress = Date.now();
      }
      st = null;
    };
    ch.addEventListener('pointerup', end); ch.addEventListener('pointercancel', end);
    ch.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* ---------------- SETTINGS ---------------- */
const WALLS = {
  aurora: { css: null }, ember: { css: 'radial-gradient(120% 80% at 20% 10%,#d9774a,transparent 60%),radial-gradient(120% 90% at 90% 80%,#7b2f4f,transparent 60%),#2a1622' },
  night: { css: 'radial-gradient(120% 80% at 80% 0%,#2f4f8f,transparent 60%),radial-gradient(100% 80% at 0% 100%,#1d6b6b,transparent 60%),#0b1424' },
};
function applyLook() {
  document.body.classList.toggle('solidui', S.surface === 'solid');
  document.body.classList.add('noaura');
  const img = $('#wallImg'); const w = S.wall;
  if (w === 'photo' && S.wallKey && mediaNow(S.wallKey)) { img.style.display = ''; img.src = mediaNow(S.wallKey); $('#bg').style.background = '#060b1c'; }
  else if (w === 'aurora' || !WALLS[w]) { img.style.display = ''; if (!img.src.endsWith('wall.jpg')) img.src = 'wall.jpg'; $('#bg').style.background = '#2c4770'; }
  else { img.style.display = 'none'; $('#bg').style.background = WALLS[w].css; }
  $('#wallDim').style.background = 'rgba(8,16,28,' + (clamp(S.dim ?? 22, 0, 70) / 100) + ')';
  document.documentElement.lang = S.lang;
}
function srow(a, label, right, extra = '') { return '<button class="srow" data-a="' + a + '"' + extra + '>' + label + '<span class="r">' + right + ico('chev', 15, 2.2) + '</span></button>'; }
function renderSettings() {
  const el = $('#s-settings');
  if (V.settingsPage === 'look') {
    const wl = [['aurora', t('wallAurora'), 'background-image:url(wall.jpg)'], ['photo', S.wallKey ? '' : t('ownPhoto'), S.wallKey ? 'background-image:url(' + mediaNow(S.wallKey) + ')' : 'background:rgba(255,255,255,.08)']];
    el.innerHTML = '<div class="hdr"><button class="cb frost press" data-a="settingsBack" aria-label="Back">' + ico('back', 20, 2.2) + '</button><span></span></div><h1 class="t1" style="margin-bottom:18px">' + esc(t('appearance')) + '</h1>'
      + '<div class="sec" style="margin-top:0"><span class="cap">' + esc(t('wallpaper')) + '</span><div class="walls">' + wl.map(([k, l, st]) => '<button class="' + (S.wall === k ? 'on' : '') + '" style="' + st + '" data-a="setWall" data-k="' + k + '">' + (l && k === 'photo' ? esc(l) : '') + '</button>').join('') + '</div>'
      + '<div class="wlabels" style="margin-top:10px">' + wl.map(([k, l]) => '<span class="muted" style="font:400 12px/1 Inter">' + esc(k === 'photo' ? t('photo') : l) + '</span>').join('') + '</div></div>'
      + '<div class="sec"><span class="cap">' + esc(t('surfaces')) + '</span><div class="seg frost" style="display:grid;grid-template-columns:1fr 1fr;height:46px"><button class="' + (S.surface !== 'solid' ? 'on' : '') + '" style="height:40px" data-a="setSurface" data-k="glass">' + esc(t('glass')) + '</button><button class="' + (S.surface === 'solid' ? 'on' : '') + '" style="height:40px" data-a="setSurface" data-k="solid">' + esc(t('solid')) + '</button></div></div>'
      + '<div class="sec"><section class="grp frost solid">'
      + '<div class="srow" style="flex-wrap:wrap"><span class="tx">' + esc(t('dim')) + '</span><span class="r" style="margin-left:auto">' + (S.dim ?? 22) + ' %</span><input type="range" min="0" max="60" step="2" value="' + (S.dim ?? 22) + '" id="dimR" style="width:100%;accent-color:#ece9e1;margin:6px 0 4px" aria-label="' + esc(t('dim')) + '"></div></section></div>';
    const r = $('#dimR'); r.addEventListener('input', () => { S.dim = +r.value; applyLook(); r.parentElement.querySelector('.r').textContent = S.dim + ' %'; }); r.addEventListener('change', save);
    return;
  }
  const initials = (S.name || 'A').trim().charAt(0).toUpperCase();
  el.innerHTML = '<div class="hdr"><button class="cb frost press" data-a="closeSettings" aria-label="Back">' + ico('back', 20, 2.2) + '</button><span></span></div><h1 class="t1" style="margin-bottom:18px">' + esc(t('settings')) + '</h1>'
    + '<button class="acct frost press" data-a="editName"><span class="avatar">' + esc(initials) + '</span><span style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1"><span style="font:600 17px/1.1 Inter">' + esc(S.name || t('yourName')) + '</span><span class="muted" style="font:400 13px/1 Inter">' + esc(t('savedLocal')) + '</span></span>' + ico('edit', 18, 2) + '</button>'
    + '<div class="sec"><span class="cap">' + esc(t('look')) + '</span><section class="grp frost solid"><button class="srow" data-a="lookPage" style="min-height:72px"><span style="flex:none;position:relative;width:34px;height:50px;border-radius:9px;overflow:hidden;' + (S.wall === 'photo' && S.wallKey ? 'background:url(' + mediaNow(S.wallKey) + ') center/cover' : S.wall !== 'aurora' && WALLS[S.wall] ? 'background:' + WALLS[S.wall].css : 'background:url(wall.jpg) center/cover') + ';box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)"><i style="position:absolute;left:4px;right:4px;top:8px;height:16px;border-radius:5px;background:rgba(255,255,255,.3)"></i><i style="position:absolute;left:4px;right:4px;bottom:5px;height:7px;border-radius:4px;background:rgba(255,255,255,.4)"></i></span><span class="tx">' + esc(t('appearance')) + '<small>' + esc((S.surface === 'solid' ? t('solid') : t('glass')) + ' · ' + (S.wall === 'photo' ? t('photo') : t('wall' + S.wall.charAt(0).toUpperCase() + S.wall.slice(1)))) + '</small></span><span class="r">' + ico('chev', 15, 2.2) + '</span></button></section></div>'
    + '<div class="sec"><span class="cap">' + esc(t('homeCap')) + '</span><section class="grp frost solid"><button class="srow" data-a="toggleNudges"><span class="tx">' + esc(t('nudges')) + '<small>' + esc(t('nudgesSub')) + '</small></span><span class="tg' + (S.nudges ? ' on' : '') + '" style="margin-left:auto"></span></button><button class="srow" data-a="toggleWeekly"><span class="tx">' + esc(t('weekly')) + '<small>' + esc(t('weeklySub')) + '</small></span><span class="tg' + (S.weekly ? ' on' : '') + '" style="margin-left:auto"></span></button></section></div>'
    + '<div class="sec"><span class="cap">Video</span><button class="vcard press" data-a="tutorial"><img src="tutorial-poster.jpg" alt=""><span class="vplay frost">' + ico('play', 22, 2) + '</span><span class="vt"><b>' + esc(lang() === 'cs' ? 'Jak Aurora funguje' : 'How Aurora works') + '</b><small>' + esc(lang() === 'cs' ? '49 s · krok po kroku' : '49 s · step by step') + '</small></span></button></div>'
    + '<div class="sec"><span class="cap">' + esc(t('general')) + '</span><section class="grp frost solid">' + srow('pickLang', esc(t('language')), esc(t('lang_' + S.lang))) + srow('tutorial', esc(t('tutorial')), '49 s') + srow('installInfo', esc(t('install')), '') + (V.oldExists ? srow('importOld', '<span class="tx">' + esc(t('importOld')) + '<small>' + esc(t('importOldSub')) + '</small></span>', '') : '') + '</section></div>'
    + '<div class="sec"><span class="cap">' + esc(t('data')) + '</span><section class="grp frost solid">' + srow('exportData', esc(t('backup')), ico('share', 15, 2)) + srow('restoreData', esc(t('restore')), '') + '<button class="srow red" data-a="deleteAll">' + esc(t('deleteAll')) + '</button></section></div>'
    + '<div class="ver">' + esc(t('ver', VERSION)) + '<br>' + S.cards.length + ' ' + esc(t('cards')) + ' · ' + S.items.length + ' items · ' + S.moments.length + ' ' + esc(t('moments').toLowerCase()) + '</div>';
}
ACT.lookPage = () => { V.settingsPage = 'look'; renderSettings(); $('#s-settings').scrollTop = 0; };
ACT.settingsBack = () => { V.settingsPage = 'main'; renderSettings(); };
ACT.setWall = el => { const k = el.dataset.k; if (k === 'photo' && (!S.wallKey || S.wall === 'photo')) { $('#wallIn').click(); return; } S.wall = k; save(); applyLook(); renderSettings(); };
ACT.setSurface = el => { S.surface = el.dataset.k; save(); applyLook(); renderSettings(); };
ACT.toggleAura = () => { S.aura = !S.aura; save(); applyLook(); renderSettings(); };
ACT.toggleNudges = () => { S.nudges = !S.nudges; save(); renderSettings(); };
ACT.toggleWeekly = () => { S.weekly = !S.weekly; save(); renderSettings(); };
