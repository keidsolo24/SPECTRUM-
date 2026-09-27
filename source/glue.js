window.AURORA_ATOMIC = true;
/* AURORA 11 — glue between the native app logic and the new presentation.
   Replaces the old skin layers (motion, prism, deck, atmos, material, editors). */
const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
let currentTransition = null, activeIntro = null;
function transition(update) {
  if (!document.startViewTransition || reducedMotion.matches) { update(); return null; }
  currentTransition?.skipTransition?.();
  const t = document.startViewTransition(update);
  currentTransition = t; t.ready.catch(() => {}); t.finished.then(() => { if (currentTransition === t) currentTransition = null; }, () => {});
  return t;
}
function syncInterface() { document.documentElement.dataset.interface = 'aurora'; }
function setInterface() {}
function readMotionIntro() { return {}; }
function publishMotionIntro() {}
function announceAuroraReady() {}
async function applyExportedDesign() {}
function motionEnter() {
  if (reducedMotion.matches || homeEdit) return;
  const root = document.querySelector('.screen.active'); if (!root) return;
  [...root.querySelectorAll('.wg,.a-card,.acc,.block,.bcard')].slice(0, 10).forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: i * 30, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  });
}
function showTab(tab, opts = {}) {
  const update = () => showTabCore(tab, opts);
  if (tab === currentTab || document.documentElement.classList.contains('preapp') || document.querySelector('dialog[open]')) return update();
  transition(update);
}
/* Splash = the new AURORA intro. Dark theme → spectrum, light → blue. */
showSplash = function (cb) {
  document.documentElement.classList.add('preapp');
  const theme = document.documentElement.dataset.theme === 'light' ? 'blue' : 'spectrum';
  let done = false;
  AuroraIntro.play({ theme }).then(() => {
    if (done) return; done = true;
    document.documentElement.classList.remove('preapp');
    cb();
  });
  // the app sits under the intro and gets revealed by the portal
  setTimeout(() => { if (!done && S.settings.onboarded) { /* prepaint home behind */ } }, 0);
};
function replayLogo() { showSplash(() => enterApp()); }
document.addEventListener('click', e => { if (e.target.closest('[data-replay-mark]')) replayLogo(); }, true);
/* press feedback */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.iconbtn,.btn,.pill,#tabbar button,.w-tick,.check,.a-press');
  if (!b || reducedMotion.matches) return;
  b.animate([{ scale: 1 }, { scale: .94 }, { scale: 1 }], { duration: 260, easing: 'cubic-bezier(.18,.75,.2,1)' });
}, { passive: true });
/* dot-matrix digits (the "00" counter from the design) */
const DOTF = {0:['01110','10001','10011','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['00010','00110','01010','10010','11111','00010','00010'],5:['11111','10000','11110','00001','00001','10001','01110'],6:['00110','01000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00010','01100']};
function dotSVG(str, r = 2.2, g = 6.4) {
  str = String(str); const cw = 5 * g, gap = g * 1.2; let out = '';
  [...str].forEach((ch, ci) => { const rows = DOTF[ch]; if (!rows) return; const ox = ci * (cw + gap);
    rows.forEach((row, y) => [...row].forEach((c, x) => { out += `<circle cx="${ox + x * g + g / 2}" cy="${y * g + g / 2}" r="${r}" fill="currentColor" opacity="${c === '1' ? 1 : .14}"/>`; })); });
  const W = str.length * cw + (str.length - 1) * gap;
  return `<svg class="a-dots" width="${W}" height="${7 * g}" viewBox="0 0 ${W} ${7 * g}" aria-hidden="true">${out}</svg>`;
}
const pad2 = n => String(Math.min(99, n)).padStart(2, '0');
const _renderHome = renderHome;
renderHome = function () {
  _renderHome();
  const el = document.getElementById('homeDots'); if (el) el.innerHTML = dotSVG(pad2(quickTasks().length));
};

/* =====================================================================
   HOME — widgets in the Aurora 11 look (Now · To do · Visuals · Spaces)
   ===================================================================== */
W_SIZES.spaces = ['m', 'l'];
W_SINGLE.push('spaces');
W_NAME.spaces = 'Spaces';
W_DESC.spaces = { m: 'three at a glance', l: 'all of them' };
function a11Layout() {
  const L = homeLayout();
  if (S.settings.a11Home !== true) {
    const keep = L.filter(w => w.kind === 'space');
    const w = (kind, size) => ({ id: uid(), kind, size, pick: true });
    S.settings.home = [w('nearest', 's'), w('todo', 's'), w('visuals', 'm'), w('spaces', 'm'), ...keep];
    S.settings.a11Home = true; touch(S.settings);
  }
  return S.settings.home;
}
const dueShort = sp => { const l = daysLeft(sp.due); if (l == null) return ''; if (l < 0) return `${-l} d over`; if (l === 0) return 'Due today'; if (l === 1) return 'Due tomorrow'; if (l < 7) return 'Due ' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseKey(sp.due).getDay()]; return 'Due ' + fmtShort(parseKey(sp.due)); };
const aCheck = (attr, on) => `<button class="a-chk ${on ? 'on' : ''}" ${attr} aria-label="${on ? 'Undo' : 'Done'}">${TICK}</button>`;
function aNow(z) {
  const sp = nearestJob();
  if (!sp) return `<span class="w-kick">Now</span><div class="w-sp"></div><div class="a-sub">No open job. Add a Project and it shows up here.</div>`;
  const nx = (sp.next || '').trim();
  return `<span class="w-kick">Now</span>
    <button class="a-where" data-open-sector="${sp.id}"><i style="background:${spaceColor(sp.id) || 'var(--ink-2)'}"></i>${esc(sp.name)}</button>
    ${nx ? `<div class="a-big ${z}">${esc(nx)}</div>` : `<input class="a-quick" data-sp-next="${sp.id}" maxlength="90" placeholder="What is the one next thing?" enterkeyhint="done">`}
    <div class="w-sp"></div>
    <div class="a-foot"><span class="a-sub">${esc(dueShort(sp) || projectState(sp).name)}</span>${nx ? `<button class="a-ring" data-next-done="${sp.id}" aria-label="Done — ask for the next step">${TICK}</button>` : ''}</div>`;
}
function aTodo(z) {
  const all = quickTasks(); const n = z === 's' ? 3 : z === 'm' ? 3 : 6;
  const rows = all.slice(0, n).map(t => `<div class="a-row">${aCheck(`data-task="${t.id}"`, false)}<span>${esc(t.text)}</span></div>`).join('');
  return `<button class="a-wt" data-go="todo">To do${all.length > n ? `<span>+${all.length - n}</span>` : ''}</button>
    <div class="a-rows">${rows || `<div class="a-sub">Nothing open.</div>`}</div>
    ${z === 'l' ? `<div class="w-sp"></div><input class="a-quick" id="wQuick" maxlength="120" placeholder="+ Quick one…" enterkeyhint="done">` : ''}`;
}
function aVisuals(z) {
  const es = live(S.entries).filter(e => e.kind !== 'note').sort((a, b) => (b.c || b.u) - (a.c || a.u));
  if (!es.length) return `<button class="a-wt" data-go="board">Visuals</button><div class="w-sp"></div><button class="a-sub" data-add>+ A photo or a clip</button>`;
  const n = z === 's' ? 1 : 4;
  return `<button class="a-wt" data-go="board">Visuals</button><div class="a-vis n${Math.min(n, es.length)}">${es.slice(0, n).map(e =>
    `<span class="a-im" data-open="${e.id}"><img data-img="${e.kind === 'video' ? e.poster : e.img}" alt="">${e.kind === 'video' ? '<svg class="a-play"><use href="#play"/></svg>' : ''}</span>`).join('')}</div>`;
}
function aSpaces(z) {
  const list = allSpaces(); const n = z === 'l' ? 6 : 3;
  if (!list.length) return `<button class="a-wt" data-go="sectors">Spaces</button><div class="w-sp"></div><button class="a-sub" data-go="sectors">+ Add your first Space</button>`;
  return `<button class="a-wt" data-go="sectors">Spaces<span>${list.length} Space${list.length > 1 ? 's' : ''} ↗</span></button>
    <div class="a-sps">${list.slice(0, n).map(sp => {
      const d7 = spaceDays7(sp.id);
      const sub = sp.type === 'project' ? (dueShort(sp) || projectState(sp).name) : sp.type === 'client' ? (RELATIONS[sp.rel] || RELATIONS.oneoff).name : `${d7}/7 days`;
      return `<button class="a-sp" data-open-sector="${sp.id}" style="--sec:${spaceColor(sp.id) || '#8a8fa3'}"><b>${esc(sp.name)}</b><span>${esc(sub)}</span></button>`; }).join('')}</div>`;
}
const _widgetHTML = widgetHTML;
widgetHTML = function (w) {
  if (!['nearest', 'todo', 'visuals', 'spaces'].includes(w.kind)) return _widgetHTML(w);
  const z = w.size;
  const inner = w.kind === 'nearest' ? aNow(z) : w.kind === 'todo' ? aTodo(z) : w.kind === 'visuals' ? aVisuals(z) : aSpaces(z);
  const edit = homeEdit ? `<span class="wrm" data-w-rm="${w.id}" role="button" aria-label="Remove widget">−</span>
     <span class="wsz">${['s', 'm', 'l'].map(s => `<i class="${s === z ? 'on' : ''} ${W_SIZES[w.kind].includes(s) ? '' : 'na'}" data-w-size="${w.id}" data-v="${s}">${s.toUpperCase()}</i>`).join('')}</span>` : '';
  return `<div class="wg wg-${z} a-w a-w-${w.kind}" data-wid="${w.id}">${inner}${edit}</div>`;
};
const _openWidget = openWidget;
openWidget = function (id) { const w = homeLayout().find(x => x.id === id); if (w?.kind === 'spaces') return showTab('sectors'); return _openWidget(id); };
const _renderPlane = renderPlane;
renderPlane = function (flip) { if (S.settings.a11Home !== true) a11Layout(); return _renderPlane(flip); };
const _renderSettings = renderSettings;
renderSettings = function () {
  _renderSettings();
  const t = S.settings.theme; const el = document.getElementById('lookSub');
  if (el) el.textContent = t === 'light' ? 'Light · blue' : t === 'system' ? 'Auto · follows your device' : 'Dark · warm';
};

/* =====================================================================
   SPACES — a stack of cards you swipe through (or a grid)
   A tap opens the whole card (native card view with every action).
   ===================================================================== */
let aFilter = 'all', aIdx = 0;
const aList = () => allSpaces().filter(s => aFilter === 'all' || s.type === aFilter);
function aCardNum(sp) {
  if (sp.type === 'personal') { const n = live(S.habits).filter(h => h.space === sp.id).length; return [n, n === 1 ? 'habit' : 'habits']; }
  if (sp.type === 'client') { const n = clientProjects(sp.id).length; return [n, n === 1 ? 'project' : 'projects']; }
  const l = daysLeft(sp.due); if (l != null) return [Math.abs(l), l < 0 ? 'days over' : l === 1 ? 'day left' : 'days left'];
  return [live(S.tasks).filter(t => t.space === sp.id && !t.done).length, 'open tasks'];
}
function aCardLine(sp) {
  if (sp.type === 'project') return (sp.next || '').trim() ? 'Next: ' + sp.next.trim() : (sp.note || 'Set the next step.');
  return sp.note || (sp.type === 'client' ? 'Everything you are building together.' : 'What this area means to you.');
}
function aCardFoot(sp) {
  if (sp.type === 'client') { const m = clientMoney(sp.id); if (m.overdue) return `<span class="red">${fmtMoney(m.overdue)} CZK overdue</span>`; if (m.awaiting) return `${fmtMoney(m.awaiting)} CZK awaiting`; }
  if (sp.type === 'project') { const st = projectState(sp); if (sp.state && sp.state !== 'me') return esc(st.name) + (st.days ? ' · ' + st.days + ' d' : ''); }
  const n = live(S.tasks).filter(t => t.space === sp.id && !t.done).length;
  return `${n} open task${n === 1 ? '' : 's'}`;
}
function aCard(sp, i) {
  const [num, unit] = aCardNum(sp); const wk = sectorWeek(sp.id); const d7 = wk.filter(d => d.on).length;
  const days = 'MTWTFSS'; const col = spaceColor(sp.id) || '#8a8fa3';
  return `<article class="a-card" data-card="${sp.id}" style="--sec:${col}" tabindex="0" aria-label="${esc(sp.name)}">
    <div class="a-card-top"><span class="a-eyebrow"><i></i>${esc(SPACE_TYPES[sp.type]?.name || '')}</span><span class="a-num">${String(i + 1).padStart(2, '0')}</span></div>
    <h2 class="a-card-nm">${esc(sp.name)}</h2>
    <div class="a-card-mid">${dotSVG(pad2(num), 2.6, 7.2)}<span class="a-unit">${esc(unit)}</span>
      <div class="a-l7"><span>Last 7 days</span><span>${d7}/7</span></div>
      <div class="a-week">${wk.map(d => `<i class="${d.on ? 'on' : ''}" data-d="${days[(parseKey(d.k).getDay() + 6) % 7]}"></i>`).join('')}</div>
      <p class="a-line">${esc(aCardLine(sp))}</p></div>
    <div class="a-card-foot"><span>${aCardFoot(sp)}</span><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></div>
  </article>`;
}
function aLayoutDeck() {
  const deck = document.getElementById('aDeck'); if (!deck) return;
  const cards = [...deck.querySelectorAll('.a-card')]; const w = deck.clientWidth;
  const step = Math.min(170, w * .42);
  cards.forEach((c, i) => {
    const d = i - aIdx - (deck._drag || 0), ad = Math.abs(d);
    c.style.transform = `translateX(${d * step}px) translateZ(${-Math.min(ad,2) * 60}px) rotateY(${Math.max(-40, Math.min(40, -d * 20))}deg) scale(${Math.max(.7, 1 - ad * .12)})`;
    c.style.opacity = String(ad > 2.4 ? 0 : Math.max(0, 1 - ad * .38));
    c.style.zIndex = String(100 - Math.round(ad * 10));
    c.classList.toggle('front', Math.round(d) === 0);
  });
  document.querySelectorAll('#aDeck .a-pips i').forEach((p, i) => p.classList.toggle('on', i === aIdx));
}
renderSector = function () {
  const list = aList();
  if (aIdx >= list.length) aIdx = Math.max(0, list.length - 1);
  if (currentSector) { const j = list.findIndex(s => s.id === currentSector); if (j >= 0) aIdx = j; }
  const types = ['all', 'personal', 'client', 'project'];
  const names = { all: 'All', personal: 'Personal', client: 'Clients', project: 'Projects' };
  document.getElementById('aFilter').innerHTML = types.map(t => `<button class="${t === aFilter ? 'on' : ''}" data-afilter="${t}">${names[t]}</button>`).join('');
  const grid = S.settings.spacesGrid === true;
  document.getElementById('aMode').textContent = grid ? 'Grid ↔' : 'Stack ↔';
  const deck = document.getElementById('aDeck'), gridEl = document.getElementById('aGrid');
  deck.hidden = grid; gridEl.hidden = !grid;
  if (!list.length) {
    const empty = `<div class="a-empty"><h2>Room for something new.</h2><p>A Space holds one part of your life, a client or a job.</p><button class="btn primary" data-a-newspace>+ Add a Space</button></div>`;
    deck.innerHTML = empty; gridEl.innerHTML = ''; return;
  }
  if (grid) { gridEl.innerHTML = list.map(aCard).join(''); return; }
  deck.innerHTML = `<div class="a-stage">${list.map(aCard).join('')}</div>${list.length > 1 ? `<div class="a-pips">${list.map(() => '<i></i>').join('')}</div>` : ''}`;
  aLayoutDeck();
};
/* swipe the stack */
(() => {
  let x0 = null, id = null, moved = false;
  document.addEventListener('pointerdown', e => {
    const deck = e.target.closest('#aDeck'); if (!deck || e.button > 0) return;
    x0 = e.clientX; id = e.pointerId; moved = false; deck._drag = 0;
  });
  document.addEventListener('pointermove', e => {
    if (x0 == null || e.pointerId !== id) return;
    const deck = document.getElementById('aDeck'); const dx = e.clientX - x0;
    if (Math.abs(dx) > 6) moved = true;
    const n = aList().length; let drag = -dx / Math.min(170, deck.clientWidth * .42);
    if ((aIdx + drag < 0) || (aIdx + drag > n - 1)) drag *= .35;
    deck._drag = drag; deck.classList.add('dragging'); aLayoutDeck();
  });
  const end = e => {
    if (x0 == null) return; const deck = document.getElementById('aDeck');
    const n = aList().length; const d = deck._drag || 0; deck._drag = 0; deck.classList.remove('dragging');
    aIdx = Math.max(0, Math.min(n - 1, Math.round(aIdx + d + (Math.abs(d) > .18 && Math.abs(d) < .5 ? Math.sign(d) * .5 : 0))));
    currentSector = aList()[aIdx]?.id || null;
    aLayoutDeck(); x0 = null;
    if (!moved) { const c = e.target.closest?.('.a-card'); if (c) { const i = aList().findIndex(s => s.id === c.dataset.card); if (i === aIdx) openCard(c.dataset.card); else { aIdx = i; currentSector = c.dataset.card; aLayoutDeck(); } } }
    else navigator.vibrate?.(5);
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', () => { if (x0 != null) { const d = document.getElementById('aDeck'); d._drag = 0; aLayoutDeck(); x0 = null; } });
  document.addEventListener('keydown', e => {
    if (currentTab !== 'sectors' || cardOpen || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { aIdx = Math.max(0, Math.min(aList().length - 1, aIdx + (e.key === 'ArrowRight' ? 1 : -1))); currentSector = aList()[aIdx]?.id; aLayoutDeck(); }
    if (e.key === 'Enter' && e.target.closest?.('.a-card')) openCard(e.target.closest('.a-card').dataset.card);
  });
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-afilter]'); if (f) { aFilter = f.dataset.afilter; aIdx = 0; currentSector = null; renderSector(); return; }
    if (e.target.closest('#aMode')) { S.settings.spacesGrid = !(S.settings.spacesGrid === true); touch(S.settings); renderSector(); return; }
    if (e.target.closest('[data-a-newspace]')) return openSpaceSheet();
    const g = e.target.closest('#aGrid .a-card'); if (g) openCard(g.dataset.card);
  });
  addEventListener('resize', () => { if (currentTab === 'sectors') aLayoutDeck(); });
})();

/* =====================================================================
   BOARD — clean masonry: pictures, clips and notes. No dates on the wall.
   ===================================================================== */
boardCard = function (e, i) {
  let inner, cls = '';
  if (e.kind === 'note') { inner = `<div class="a-bnote">${esc(e.text)}</div>`; cls = 'is-note'; }
  else if (e.kind === 'video') inner = `<div class="media" data-vid="${e.id}"><img data-img="${e.poster}" alt="${esc(e.text)}"><video data-vsrc="${e.img}" muted loop playsinline preload="none" disablepictureinpicture></video><span class="a-badge"><svg><use href="#play"/></svg>${fmtDur(e.dur)}</span></div>`;
  else inner = `<div class="media"><img data-img="${e.img}" alt="${esc(e.text)}"></div>`;
  const sp = e.space && spaceById(e.space);
  return `<div class="bcard a-bcard ${cls}" role="button" tabindex="0" aria-label="Open ${esc(e.text || e.kind)}" data-open="${e.id}" style="--i:${Math.min(i, 14)};${sp ? `--sec:${spaceColor(sp.id) || 'transparent'}` : ''}">${inner}${sp && e.kind !== 'note' ? '<i class="a-bdot"></i>' : ''}</div>`;
};
renderBoardHero = function () {
  const el = document.getElementById('boardHero'); if (!el) return;
  const es = live(S.entries);
  const ph = es.filter(e => e.kind === 'image').length, vd = es.filter(e => e.kind === 'video').length, nt = es.length - ph - vd;
  const parts = [ph ? `${ph} photo${ph > 1 ? 's' : ''}` : '', vd ? `${vd} clip${vd > 1 ? 's' : ''}` : '', nt ? `${nt} note${nt > 1 ? 's' : ''}` : ''].filter(Boolean);
  el.innerHTML = es.length ? `<div class="a-bhead"><span class="a-bno">${es.length}</span><span class="a-bsub">${parts.join('<br>')}</span></div>`
    : `<div class="a-head a-head-page"><div><div class="a-eyebrow">Your wall</div><h1 class="a-title">Board</h1></div></div>`;
};

/* =====================================================================
   VIEWER — a photo, clip or note opens as a card, like a Space card.
   Swipe or use the arrows to move through the Board.
   ===================================================================== */
const Viewer = (() => {
  let list = [], i = 0, el = null, x0 = null, dx = 0;
  const cur = () => list[i];
  function build() {
    el = document.createElement('div'); el.id = 'aViewer'; el.className = 'a-viewer'; el.hidden = true;
    el.innerHTML = `<div class="a-v-bg" data-v-close></div><div class="a-v-card" id="aVCard"></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    el.addEventListener('pointerdown', e => { if (e.target.closest('button,video,input')) return; x0 = e.clientX; dx = 0; });
    el.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; const c = document.getElementById('aVCard'); c.style.transition = 'none'; c.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`; });
    const up = () => { if (x0 == null) return; const c = document.getElementById('aVCard'); c.style.transition = ''; c.style.transform = ''; if (Math.abs(dx) > 70) step(dx < 0 ? 1 : -1); x0 = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    addEventListener('keydown', e => { if (el.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  }
  async function paint(dir = 0) {
    const e = cur(); if (!e) return close();
    const c = document.getElementById('aVCard'); const sp = e.space && spaceById(e.space);
    c.style.setProperty('--sec', (sp && spaceColor(sp.id)) || '#8a8fa3');
    let media = '';
    if (e.kind === 'video') { const u = await imageUrl(e.img); media = `<div class="a-v-media"><video src="${u || ''}" controls autoplay playsinline loop></video></div>`; }
    else if (e.kind === 'image') { const u = await imageUrl(e.img); media = `<div class="a-v-media"><img src="${u || ''}" alt=""></div>`; }
    else media = `<div class="a-v-note">${esc(e.text)}</div>`;
    const chips = allSpaces().map(s => `<button class="${s.id === e.space ? 'on' : ''}" data-v-space="${s.id}" style="--sec:${spaceColor(s.id) || '#8a8fa3'}"><i></i>${esc(s.name)}</button>`).join('');
    c.innerHTML = `<div class="a-v-top"><span class="a-eyebrow"><i></i>${sp ? esc(sp.name) : 'Board'}</span><span class="a-num">${pad2(i + 1)} / ${pad2(list.length)}</span><button class="a-v-x" data-v-close aria-label="Close">×</button></div>
      ${media}
      ${e.kind !== 'note' && e.text ? `<p class="a-v-cap">${esc(e.text)}</p>` : ''}
      <div class="a-v-foot"><span>${fmtLong(new Date(e.c || e.u))}</span><div><button class="a-v-btn" data-v-tag>${sp ? 'Move' : 'Add to a Space'}</button><button class="a-v-btn danger" data-v-del>Delete</button></div></div>
      <div class="a-v-spaces" hidden>${chips}<button data-v-space="">No Space</button></div>`;
    if (dir && !reducedMotion.matches) c.animate([{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  function step(d) { if (!list.length) return; const n = i + d; if (n < 0 || n >= list.length) return; i = n; paint(d); }
  async function onClick(ev) {
    const t = ev.target;
    if (t.closest('[data-v-close]')) return close();
    if (t.closest('[data-v-tag]')) { el.querySelector('.a-v-spaces').hidden = !el.querySelector('.a-v-spaces').hidden; return; }
    const sp = t.closest('[data-v-space]');
    if (sp) { const e = cur(); e.space = sp.dataset.vSpace || undefined; touch(e); toast(e.space ? 'Moved to ' + spaceName(e.space) : 'Back on the Board'); paint(); render(); return; }
    if (t.closest('[data-v-del]')) {
      const e = cur(); close();
      if (await confirmSheet('Delete this?')) { e.del = 1; touch(e); if (e.img) { forgetImage(e.img); DB.del('images', e.img); } if (e.poster) { forgetImage(e.poster); DB.del('images', e.poster); } render(); }
    }
  }
  function open(id) {
    if (!el) build();
    list = live(S.entries).sort((a, b) => (b.c || b.u) - (a.c || a.u));
    i = Math.max(0, list.findIndex(x => x.id === id));
    $$('.media[data-vid] video').forEach(v => { try { v.pause(); } catch (err) {} });
    el.hidden = false; document.documentElement.classList.add('a-viewing');
    paint(); requestAnimationFrame(() => el.classList.add('in'));
  }
  function close() {
    if (!el || el.hidden) return;
    el.classList.remove('in'); document.documentElement.classList.remove('a-viewing');
    el.querySelector('video')?.pause();
    setTimeout(() => { el.hidden = true; document.getElementById('aVCard').innerHTML = ''; if (currentTab === 'board') hydrateVideos(document.getElementById('boardCols')); }, 220);
  }
  return { open, close, isOpen: () => el && !el.hidden };
})();
openEntry = id => Viewer.open(id);

/* =====================================================================
   TO DO — list + the month on every screen size
   ===================================================================== */
renderTodoHero = function () {
  const el = document.getElementById('todoHero'); if (!el) return;
  const open = live(S.tasks).filter(t => !t.done).length;
  el.innerHTML = `<div class="a-head a-head-page"><div><h1 class="a-title">To do</h1><div class="a-sub2">${open ? open + ' open' : 'All clear'}</div></div></div>`;
};
const _renderTodo = renderTodo;
renderTodo = function () {
  _renderTodo();
  if (!isWide()) { renderHeatmap(); const st = overallStreaks(); $('#tCur').textContent = st.cur; $('#tBest').textContent = st.best; $('#tDone').textContent = st.done; }
};

/* =====================================================================
   SPACE CARD (opened) — the same card as in the stack, grown to full size
   ===================================================================== */
const _secCard = secCard;
secCard = function (x) {
  const html = _secCard(x);
  const [num, unit] = aCardNum(x); const wk = sectorWeek(x.id); const d7 = wk.filter(d => d.on).length;
  const hero = `<div class="a-cv-hero">${dotSVG(pad2(num), 2.8, 7.6)}<span class="a-unit">${esc(unit)}</span>
    <div class="a-l7"><span>Last 7 days</span><span>${d7}/7</span></div>
    <div class="a-week">${wk.map(d => `<i class="${d.on ? 'on' : ''}" data-d="${'MTWTFSS'[(parseKey(d.k).getDay() + 6) % 7]}"></i>`).join('')}</div></div>`;
  return html.replace('</header>', '</header>' + hero);
};
const _refreshSector = refreshSector;
refreshSector = function () { _refreshSector(); if (!cardOpen && currentTab === 'sectors') renderSector(); };
const _openCard = openCard;
openCard = function (id) {
  _openCard(id);
  const v = document.getElementById('cardView'); const sp = spaceById(id);
  v.style.setProperty('--sec', (sp && spaceColor(sp.id)) || '#8a8fa3');
};
