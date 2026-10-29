'use strict';
/* ============ SHEETS & VIEWER ============ */
function cardChips(sel, suggested, act = 'pickCard') {
  const order = S.cards.slice().sort((a, b) => (b.id === suggested) - (a.id === suggested));
  return order.map(c => '<button class="chip ' + (sel === c.id ? 'cr' : 'in') + ' press" data-a="' + act + '" data-k="' + c.id + '"><span class="dot" style="--c:' + c.color + (c.id === suggested ? ';box-shadow:0 0 6px ' + c.color : '') + '"></span>' + esc(c.name) + '</button>').join('')
    + '<button class="chip ' + (!sel ? 'cr' : 'in') + ' press" data-a="' + act + '" data-k="">' + esc(t('noCard')) + '</button>';
}
/* ---------------- ADD / EDIT (tiles + list) ---------------- */
let A = null;
const REM_OPTS = [['off', 'rOff'], [0, 'rAt'], [10, 'r10'], [30, 'r30'], [60, 'r60'], ['eve', 'rEve']];
const QUICK_TIMES = ['08:00', '10:00', '12:00', '14:00', '18:00', '20:00'];
function durLabel(m) { return m < 60 ? m + ' min' : (m % 60 ? (m / 60).toString().replace('.', lang() === 'cs' ? ',' : '.') : m / 60) + ' h'; }
function remLabel(r) { const o = REM_OPTS.find(x => x[0] === r); return o ? t(o[1]) : t('r10'); }
function suggestCard(txt) {
  if (A.cardTouched) return A.card;
  const low = (txt || '').toLowerCase();
  const hit = S.cards.find(c => c.name.length > 2 && low.includes(c.name.toLowerCase()));
  return hit ? hit.id : A.baseCard;
}
function openAdd(o = {}) {
  const base = o.date !== undefined ? o.date : T();
  const mode = o.mode === 'photo' || o.mode === 'note' ? 'note' : 'plan';
  A = { mode, editId: null, text: o.text || '', card: o.card || null, baseCard: o.card || (S.lastCard && cardById(S.lastCard) ? S.lastCard : null), cardTouched: !!o.card,
    date: base, baseDate: base, time: null, repeat: null, days: [], dur: 45, remind: S.push && S.push.def != null ? S.push.def : 10,
    dT: false, tT: false, rT: false, tile: null, row: null, mon: null, file: null, url: null, kind: null, fromMoment: o.fromMoment || null, spans: [] };
  if (mode === 'note') { A.baseCard = o.card || null; A.card = o.card || null; }
  else if (!o.card) A.card = A.baseCard;
  if (A.text) applyParse();
  openAddSheet(o.pickPhoto);
}
function openItem(id) {
  const i = itemById(id); if (!i) return;
  const rep = i.repeat === 'weekly' ? 'days' : (i.repeat || null);
  A = { mode: 'plan', editId: id, text: i.t, card: i.card || null, baseCard: i.card || null, cardTouched: true, date: i.date || null, baseDate: i.date || null, time: i.time || null,
    repeat: rep, days: i.repeat === 'weekly' ? [dow(i.date || T())] : (i.days || []).slice(), dur: i.dur || 45, remind: i.remind === undefined ? (S.push.def != null ? S.push.def : 10) : (i.remind === null ? 'off' : i.remind),
    dT: true, tT: true, rT: true, tile: null, row: null, mon: null, spans: [] };
  A.orig = JSON.stringify(planFields());
  openAddSheet(false);
}
function openAddSheet(pickPhoto) {
  const head = A.editId ? '<span class="tl">' + esc(t('editT')) + '</span>'
    : '<div class="seg in mseg"><button class="' + (A.mode === 'plan' ? 'on' : '') + '" data-a="aMode" data-k="plan">' + esc(t('planT')) + '</button><button class="' + (A.mode === 'note' ? 'on' : '') + '" data-a="aMode" data-k="note">' + esc(t('idea')) + '</button></div>';
  openSheet({ titleHTML: head, leftHTML: '<button class="xbtn in press" data-a="sheetCancel" aria-label="' + esc(t('cancel')) + '">' + ico('x', 16, 2.4) + '</button>', right: saveLabel(), rightDisabled: !canSave(), body: addBody(), mount: () => mountAdd(pickPhoto), onSave: () => saveAdd(), dirty: addDirty, cls: 'addsheet' });
}
function saveLabel() { return A.editId ? t('save') : A.mode === 'note' ? t('throwIt') : t('addBtn'); }
function addDirty() { if (!A) return false; if (A.editId) return JSON.stringify(planFields()) !== A.orig; return !!((A.text || '').trim() || A.file); }
function planFields() { return [A.text.trim(), A.card, A.date, A.time, A.repeat, (A.days || []).join(), A.dur, A.remind]; }
function canSave() { return A.mode === 'note' ? !!(A.text.trim() || A.file) : !!A.text.trim(); }

/* ----- parse typed sentence into fields (fields the user tapped stay as tapped) ----- */
function applyParse() {
  if (A.editId) { A.spans = []; return; }
  const p = NL(A.text); A.spans = p.spans;
  if (!A.dT) A.date = p.date || (p.repeat ? T() : A.baseDate);
  if (!A.tT) A.time = p.time;
  if (!A.rT) { A.repeat = p.repeat; A.days = p.days || []; }
  if (p.card && !A.cardTouched) { A.card = p.card; A._tagCard = true; }
  else if (!A.cardTouched) { const sc = suggestCard(A.text); A.card = A._tagCard && !p.card ? sc : (p.card || sc); A._tagCard = !!p.card; }
}

/* ----- body ----- */
function addBody() {
  if (A.mode === 'note') {
    return '<div class="fld in big ideaf"><textarea id="aText" rows="3" enterkeyhint="send" placeholder="' + esc(t('ideaPh')) + '" aria-label="' + esc(t('idea')) + '">' + esc(A.text) + '</textarea>' + clrBtn() + '</div>'
      + '<div id="aDyn">' + noteDyn() + '</div>';
  }
  return '<div class="fld in big"><div class="mirror" id="aMirror"></div><textarea id="aText" rows="1" enterkeyhint="done" placeholder="' + esc(t('planPh')) + '" aria-label="' + esc(t('title')) + '">' + esc(A.text) + '</textarea>' + clrBtn() + '</div>'
    + '<div id="aDyn">' + planDyn() + '</div>';
}
function clrBtn() { return '<button class="clr" id="aClr" data-a="aClear" aria-label="' + esc(t('clearTx')) + '"' + (A.text ? '' : ' hidden') + '>' + ico('x', 12, 3) + '</button>'; }
function tileB(k, cap, val, sub, dot) {
  const on = A.tile === k;
  return '<button class="atile ' + (on ? 'cr' : 'in') + ' press" data-a="aTile" data-k="' + k + '" aria-expanded="' + on + '"><span class="cap">' + esc(cap) + '</span><span class="v">' + (dot ? '<span class="dot" style="--c:' + dot + '"></span>' : '') + '<span>' + val + '</span></span><small>' + esc(sub) + '</small></button>';
}
function whenVal() {
  if (A.repeat) { const d = A.date || T(); return [d <= T() ? esc(t('today')) : esc(dayShort(d)) + '.', lang() === 'cs' ? 'začíná' : 'starts']; }
  if (!A.date) return [esc(t('noDay')), t('anyTimeS')];
  const n = daysBetween(T(), A.date);
  if (n === 0) return [esc(t('today')), dayShort(A.date).toLowerCase() + '.'];
  if (n === 1) return [esc(t('tomorrow')), dayShort(A.date).toLowerCase() + '.'];
  return [esc(dayShort(A.date)) + '.', n > 1 ? (lang() === 'cs' ? 'za ' + n + ' dní' : 'in ' + n + ' days') : (lang() === 'cs' ? 'před ' + (-n) + ' dny' : (-n) + ' days ago')];
}
function repVal() {
  if (!A.repeat) return [esc(t('off')), lang() === 'cs' ? 'jednou' : 'once'];
  if (A.repeat === 'daily') return [esc(t('dailyS')), t('everyDay')];
  if (A.repeat === 'weekdays') return [esc(t('wkdaysS')), lang() === 'cs' ? 'Po – Pá' : 'Mon – Fri'];
  const ds = (A.days || []).slice().sort((a, b) => a - b);
  if (!ds.length) return [esc(t('selDays')), lang() === 'cs' ? 'vyber dny' : 'pick days'];
  return [esc(ds.map(k => WD[lang()][k]).join(' ')), goalText(ds.length)];
}
function planDyn() {
  const [wv, ws] = whenVal(); const [rv, rs] = repVal(); const c = cardById(A.card);
  let h = '<div class="atiles">'
    + tileB('when', t('when'), wv, ws)
    + tileB('time', t('time'), A.time ? esc(A.time) : '—', A.time ? t('forDur', durLabel(A.dur || 45)) : t('noTimeS'))
    + tileB('card', t('cardCap'), c ? esc(c.name) : esc(t('noCard')), c ? (c.type === 'habit' ? t('countsStreak') : t('projectT')) : t('optional'), c ? c.color : null)
    + tileB('rep', t('repeat'), rv, rs) + '</div>';
  if (A.tile) h += '<div class="atray in">' + trayHTML() + '</div>';
  if (A.time) {
    h += '<div class="alist in">'
      + listRow('dur', 'dur', t('length'), durLabel(A.dur || 45), () => '<div class="chips wrap">' + [15, 30, 45, 60, 90, 120].map(m => '<button class="chip ' + ((A.dur || 45) === m ? 'cr' : 'in') + ' press" data-a="aDur" data-k="' + m + '">' + durLabel(m) + '</button>').join('') + '</div>')
      + listRow('rem', 'bell', t('remind'), remLabel(A.remind), () => '<div class="chips wrap">' + REM_OPTS.map(([k, l]) => '<button class="chip ' + (A.remind === k ? 'cr' : 'in') + ' press" data-a="aRem" data-k="' + k + '">' + esc(t(l)) + '</button>').join('') + '</div>' + (!S.push.on ? '<div class="muted asub">' + esc(lang() === 'cs' ? 'Notifikace zapneš v Nastavení → Notifikace.' : 'Turn on notifications in Settings → Notifications.') + '</div>' : ''))
      + '</div>';
  }
  h += '<div class="hint"><span class="led" style="--c:' + cardColor(A.card) + '"></span><span id="aHint">' + landsText() + '</span></div>';
  if (A.editId) {
    const i = itemById(A.editId); const d = i.repeat ? T() : (i.date || T()); const on = isDone(i, d);
    h += '<div class="btnrow"><button class="pbtn ' + (on ? 'ghost' : 'cr') + ' press" data-a="eDone">' + ico(on ? 'repeat' : 'check', 18, 2.4) + esc(on ? t('markUndone') : t('markDone')) + '</button></div>'
      + '<div class="btnrow" style="margin-top:8px"><button class="pbtn danger press" data-a="eDelete">' + ico('trash', 18, 2) + esc(t('deleteItem')) + '</button></div>';
  }
  return h;
}
function listRow(k, icn, label, val, body) {
  const on = A.row === k;
  return '<button class="lrw press" data-a="aRow" data-k="' + k + '" aria-expanded="' + on + '"><span class="li">' + ico(icn, 15, 2) + '</span><span class="ll">' + esc(label) + '</span><span class="lv"><b>' + esc(val) + '</b>' + ico(on ? 'chevD' : 'chev', 13, 2.4) + '</span></button>' + (on ? '<div class="lexp">' + body() + '</div>' : '');
}
function trayHTML() {
  const cs = lang() === 'cs';
  if (A.tile === 'when') {
    if (A.mon) return monHTML();
    const days = [0, 1, 2, 3, 4, 5, 6].map(k => addD(T(), k));
    return '<div class="d7">' + days.map((d, k) => '<button class="dpl ' + (A.date === d ? 'cr' : 'in') + ' press" data-a="aDay" data-k="' + d + '"><span>' + esc(k === 0 ? t('today') : WD[lang()][dow(d)]) + '</span><b>' + dOf(d).getDate() + '</b></button>').join('') + '</div>'
      + '<div class="chips wrap" style="margin-top:8px"><button class="chip ' + (A.date && daysBetween(T(), A.date) > 6 || (A.date && A.date < T()) ? 'cr' : 'in') + ' press" data-a="aMon">' + ico('cal', 15, 2) + esc(A.date && (daysBetween(T(), A.date) > 6 || A.date < T()) ? dayShort(A.date) : t('otherDay')) + '</button>'
      + (!A.repeat ? '<button class="chip ' + (!A.date ? 'cr' : 'in') + ' press" data-a="aDay" data-k="">' + esc(t('noDay')) + '</button>' : '') + '</div>';
  }
  if (A.tile === 'time') {
    const other = A.time && !QUICK_TIMES.includes(A.time);
    return '<div class="chips wrap"><button class="chip ' + (!A.time ? 'cr' : 'in') + ' press" data-a="aTime" data-k="">' + esc(t('noTime')) + '</button>'
      + QUICK_TIMES.map(x => '<button class="chip ' + (A.time === x ? 'cr' : 'in') + ' press" data-a="aTime" data-k="' + x + '">' + x + '</button>').join('')
      + '<label class="chip pick ' + (other ? 'cr' : 'in') + '">' + ico('clock', 15, 2) + esc(other ? A.time : t('otherTime')) + '<input type="time" id="aTimeIn" value="' + (A.time || '') + '" aria-label="' + esc(t('time')) + '"></label></div>';
  }
  if (A.tile === 'card') {
    const sug = suggestCard(A.text);
    return '<div class="chips wrap" id="aCards">' + cardChips(A.card, sug) + '</div>';
  }
  if (A.tile === 'rep') {
    const segs = [['', t('off')], ['daily', t('dailyS')], ['weekdays', t('wkdaysS')], ['days', t('selDays')]];
    return '<div class="seg in seg4">' + segs.map(([k, l]) => '<button class="' + ((A.repeat || '') === k ? 'on' : '') + '" data-a="aRepeat" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>'
      + (A.repeat === 'days' ? '<div class="wdsel">' + WD1[lang()].map((l, k) => '<button class="' + ((A.days || []).includes(k) ? 'cr' : 'in') + ' press" data-a="aWd" data-k="' + k + '" aria-pressed="' + (A.days || []).includes(k) + '" aria-label="' + esc(WD[lang()][k]) + '">' + l + '</button>').join('') + '</div>' : '')
      + (cs ? '' : '');
  }
  return '';
}
function monHTML() {
  const [y, m] = A.mon.split('-').map(Number); const first = y + '-' + pad(m) + '-01'; const nDays = new Date(y, m, 0).getDate(); const off = dow(first);
  let g = WD1[lang()].map(w => '<span class="wl">' + w + '</span>').join('');
  for (let k = 0; k < off; k++) g += '<span></span>';
  for (let k = 1; k <= nDays; k++) { const d = y + '-' + pad(m) + '-' + pad(k); g += '<button class="' + (d === A.date ? 'cr' : '') + (d === T() ? ' td' : '') + (d < T() ? ' past' : '') + '" data-a="aDay" data-k="' + d + '">' + k + '</button>'; }
  return '<div class="amh"><button class="cb in press" data-a="aMonShift" data-n="-1" aria-label="Previous month">' + ico('chevL', 15, 2.4) + '</button><b>' + esc(MON[lang()][m - 1] + ' ' + y) + '</b><button class="cb in press" data-a="aMonShift" data-n="1" aria-label="Next month">' + ico('chev', 15, 2.4) + '</button></div><div class="amg">' + g + '</div>';
}
function noteDyn() {
  const c = cardById(A.card);
  let h = '';
  if (A.file) h += '<div class="mediaprev" style="margin-top:10px">' + (A.kind === 'video' ? '<video src="' + A.url + '" controls playsinline muted></video>' : '<img src="' + A.url + '" alt="">') + '<button class="xbtn in press mrm" data-a="aNoFile" aria-label="' + esc(t('removeFile')) + '">' + ico('x', 14, 2.6) + '</button></div>';
  h += '<div class="alist in">'
    + '<label class="lrw pick press"><span class="li">' + ico('photo', 15, 2) + '</span><span class="ll">' + esc(t('photoVideo')) + '</span><span class="lv"><b>' + esc(A.file ? t('change') : '') + '</b>' + ico('plus', 13, 2.4) + '</span><input type="file" id="aFile" accept="image/*,video/*"></label>'
    + listRow('card', 'card', t('cardCap'), c ? c.name : t('noCard'), () => '<div class="chips wrap" id="aCards">' + cardChips(A.card, suggestCard(A.text)) + '</div>')
    + '</div>';
  h += '<div class="hint"><span class="led" style="--c:' + cardColor(A.card) + '"></span><span id="aHint">' + esc(c ? t('ideaLandsCard', c.name) : t('ideaLands')) + '</span></div>';
  return h;
}
function landsText() {
  const parts = [];
  if (A.repeat) {
    const r = A.repeat === 'days' ? (A.days && A.days.length ? daysText(A.days) : (lang() === 'cs' ? 'vyber dny' : 'pick days')) : A.repeat === 'weekdays' ? t('weekdays') : t('everyDay');
    parts.push(esc(r) + (A.time ? (lang() === 'cs' ? ' v ' : ' at ') + A.time : ''));
    const s = t('lands2', parts.join('')) + (A.date && A.date > T() ? ', ' + esc(t('startFrom', dayShort(A.date))) : '') + '.';
    return s + remindText();
  }
  if (!A.date) return esc(t('landsNoDay'));
  return t('lands2', esc(dayShort(A.date) + (A.time ? ' · ' + A.time : ''))) + '.' + remindText();
}
function remindText() {
  if (!A.time || A.remind === 'off' || !S.push.on) return '';
  let at;
  if (A.remind === 'eve') at = (lang() === 'cs' ? 'večer předem' : 'the evening before');
  else at = mtime((tmin(A.time) - (+A.remind || 0) + 1440) % 1440);
  return ' ' + t('remindAt', esc(at)) + '.';
}
function updAdd() {
  const d = $('#aDyn'); if (!d) return;
  d.innerHTML = A.mode === 'note' ? noteDyn() : planDyn();
  bindAddDyn();
  const sv = $('#sheetSave'); if (sv) { sv.disabled = !canSave(); sv.textContent = saveLabel(); }
}
function refreshAdd() {
  const sb = $('#sheet .sb'); const y = sb.scrollTop;
  sb.innerHTML = addBody(); mountAdd(); sb.scrollTop = y;
}
function paintMirror() {
  const m = $('#aMirror'); if (!m) return;
  let h = '', last = 0;
  (A.spans || []).forEach(([a, b]) => { h += esc(A.text.slice(last, a)) + '<mark>' + esc(A.text.slice(a, b)) + '</mark>'; last = b; });
  m.innerHTML = h + esc(A.text.slice(last)) + '​';
}
function mountAdd(pickPhoto) {
  const ta = $('#aText'); const sv = $('#sheetSave'); if (sv) sv.disabled = !canSave();
  if (ta) {
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(A.mode === 'note' ? 96 : 34, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', () => {
      A.text = ta.value; fit();
      const c = $('#aClr'); if (c) c.hidden = !A.text;
      if (A.mode === 'plan') { applyParse(); paintMirror(); } else if (!A.cardTouched) A.card = suggestCard(A.text);
      updAdd();
    });
    ta.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      if (!canSave()) return;
      if (A.mode === 'note') saveAdd({ keep: true }); else saveAdd();
    });
    ta.addEventListener('focus', () => { if (A.tile || A.row) { A.tile = null; A.row = null; A.mon = null; updAdd(); } });
    fit(); paintMirror();
    if (!A.editId && !pickPhoto && !A.text) autoFocus(ta);
  }
  bindAddDyn();
  if (pickPhoto) { const f = $('#aFile'); if (f) try { f.click(); } catch (e) {} }
}
function bindAddDyn() {
  const ti = $('#aTimeIn'); if (ti) ti.addEventListener('change', () => { if (ti.value) { A.time = ti.value; A.tT = true; if (!A.date && !A.repeat) { A.date = T(); A.dT = true; } updAdd(); } });
  const f = $('#aFile'); if (f) f.addEventListener('change', async () => {
    const file = f.files && f.files[0]; if (!file) return;
    if (file.type.startsWith('video/') && file.size > 500 * 1024 * 1024) { toast(esc(t('tooBig'))); return; }
    if (file.type.startsWith('video/') && navigator.storage && navigator.storage.estimate) { try { const e = await navigator.storage.estimate(); if (e.quota && e.quota - (e.usage || 0) < file.size * 1.15) { toast(esc(t('noSpace'))); return; } } catch (er) {} }
    A.file = file; A.kind = file.type.startsWith('video/') ? 'video' : 'photo'; if (A.url) URL.revokeObjectURL(A.url); A.url = URL.createObjectURL(file); updAdd();
  });
}
const blurField = () => { const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur(); };
ACT.aMode = el => { if (A.mode === el.dataset.k) return; A.mode = el.dataset.k; A.tile = null; A.row = null; if (A.mode === 'plan') { applyParse(); } $$('#sheet .mseg button').forEach(b => b.classList.toggle('on', b.dataset.k === A.mode)); refreshAdd(); const sv = $('#sheetSave'); if (sv) { sv.textContent = saveLabel(); sv.disabled = !canSave(); } autoFocus($('#aText'), 60); };
ACT.aTile = el => { const k = el.dataset.k; blurField(); A.row = null; A.tile = A.tile === k ? null : k; A.mon = null; updAdd(); };
ACT.aRow = el => { const k = el.dataset.k; blurField(); A.tile = null; A.row = A.row === k ? null : k; updAdd(); };
ACT.aClear = () => { A.text = ''; A.spans = []; const ta = $('#aText'); if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input')); ta.focus({ preventScroll: true }); } };
ACT.aDay = el => { const d = el.dataset.k || null; A.date = d; A.dT = true; if (!d) { A.time = null; A.tT = true; } A.mon = null; A.tile = null; updAdd(); };
ACT.aMon = () => { A.mon = (A.date || T()).slice(0, 7); updAdd(); };
ACT.aMonShift = el => { const [y, m] = A.mon.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.n, 1); A.mon = d.getFullYear() + '-' + pad(d.getMonth() + 1); updAdd(); };
ACT.aTime = el => { A.time = el.dataset.k || null; A.tT = true; if (A.time && !A.date && !A.repeat) { A.date = T(); A.dT = true; } A.tile = null; updAdd(); };
ACT.aRepeat = el => { const k = el.dataset.k || null; A.repeat = k; A.rT = true; if (k === 'days' && !(A.days || []).length) A.days = [dow(A.date || T())]; if (k && !A.date) { A.date = T(); } updAdd(); };
ACT.aWd = el => { const k = +el.dataset.k; const s2 = new Set(A.days || []); s2.has(k) ? s2.delete(k) : s2.add(k); A.days = [...s2].sort((a, b) => a - b); A.rT = true; haptic(); updAdd(); };
ACT.aDur = el => { A.dur = +el.dataset.k; A.row = null; updAdd(); };
ACT.aRem = el => { const k = el.dataset.k; A.remind = k === 'off' || k === 'eve' ? k : +k; A.row = null; updAdd(); };
ACT.aNoFile = () => { if (A.url) URL.revokeObjectURL(A.url); A.file = null; A.url = null; A.kind = null; updAdd(); };
ACT.pickCard = el => { A.card = el.dataset.k || null; A.cardTouched = true; A.tile = null; A.row = null; updAdd(); };

async function saveAdd(o = {}) {
  if (!A || !canSave()) return;
  const card = A.card && cardById(A.card) ? A.card : null; if (card) S.lastCard = card;
  if (A.mode === 'plan') {
    const title = A.editId ? A.text.trim() : (stripSpans(A.text, A.spans || []) || A.text.trim());
    const rep = A.repeat === 'days' && !(A.days || []).length ? null : A.repeat;
    let it, isNew = false;
    if (A.editId) { it = itemById(A.editId); if (!it) return; } else { it = { id: uid(), created: T() }; isNew = true; }
    it.t = title; it.card = card;
    if (A.date) it.date = A.date; else delete it.date;
    if (A.time) { it.time = A.time; it.dur = A.dur || 45; it.remind = A.remind === 'off' ? null : A.remind; } else { delete it.time; delete it.dur; delete it.remind; }
    if (rep) {
      if (!it.repeat) { it.doneDates = []; delete it.done; delete it.doneOn; }
      it.repeat = rep; if (rep === 'days') it.days = A.days.slice(); else delete it.days;
      if (!it.date) it.date = T();
    } else if (it.repeat) { delete it.repeat; delete it.days; delete it.doneDates; it.done = false; }
    if (isNew) S.items.push(it);
    if (A.fromMoment) { const m = S.moments.find(x => x.id === A.fromMoment); if (m) m.planned = it.id; }
    save(); closeSheet(true); render();
    if (isNew) toast(esc(it.repeat ? t('saved') + ' · ' + repText(it) : it.date ? t('planned', dayName(it.date) + (it.time ? ' ' + it.time : '')) : t('undated')), { label: t('undo'), fn: () => { S.items = S.items.filter(x => x !== it); S.moments.forEach(m => { if (m.planned === it.id) delete m.planned; }); save(); render(); } });
    else toast(esc(t('saved')));
    if (isNew && it.time && it.remind != null && typeof maybeAskPush === 'function') setTimeout(maybeAskPush, 5200);
    return;
  }
  // idea (note / photo / video)
  if (!A.file) {
    const m = { id: uid(), kind: 'note', card, note: A.text.trim(), d: T(), ts: Date.now() };
    S.moments.push(m); save(); render();
    if (o.keep) {
      A.text = ''; const ta = $('#aText'); if (ta) { ta.value = ''; ta.style.height = 'auto'; ta.focus({ preventScroll: true }); } const c = $('#aClr'); if (c) c.hidden = true; updAdd();
      toast(esc(t('ideaAdded')), { label: t('undo'), fn: () => { S.moments = S.moments.filter(x => x !== m); save(); render(); } });
      return;
    }
    closeSheet(true); if (V.tab !== 'board' && !V.card) go('board'); else render();
    toast(esc(t('ideaAdded')), { label: t('undo'), fn: () => { S.moments = S.moments.filter(x => x !== m); save(); render(); } });
    return;
  }
  const sv = $('#sheetSave'); if (sv) { sv.disabled = true; sv.textContent = t('saving'); }
  try {
    let blob = A.file, r = 1, dur = 0;
    if (A.kind === 'photo') { blob = await compressImage(A.file); r = await imgRatio(blob); } else { const vi = await vidInfo(blob); r = vi.r; dur = vi.dur; }
    const key = await putMedia(blob);
    const m = { id: uid(), kind: A.kind, card, note: A.text.trim(), d: T(), img: key, r, dur, ts: Date.now() };
    if (A.kind === 'video') { try { const th = await videoThumb(blob); if (th) { m.thumb = await putMedia(th); await mediaURL(m.thumb); } } catch (e) {} }
    S.moments.push(m); save(); closeSheet(true); if (A.url) URL.revokeObjectURL(A.url);
    if (V.tab !== 'board' && !V.card) go('board'); else render();
    toast(esc(t('photoAdded')), { label: t('undo'), fn: () => { S.moments = S.moments.filter(x => x !== m); delMedia(key); if (m.thumb) delMedia(m.thumb); save(); render(); } });
  } catch (e) { if (sv) { sv.disabled = false; sv.textContent = saveLabel(); } toast(lang() === 'cs' ? 'Uložení se nepovedlo' : 'Could not save'); }
}
ACT.add = el => {
  if (el && el._suppress && Date.now() - el._suppress < 500) return;
  const d = el ? el.dataset : {};
  openAdd({ mode: d.mode || 'plan', pickPhoto: d.mode === 'photo', card: d.card || (V.card || null), date: d.date !== undefined ? d.date : (d.ctx === 'today' ? T() : undefined) });
};
ACT.eDone = () => { const i = itemById(A.editId); if (!i) return; const d = i.repeat ? T() : (i.date || T()); const v = !isDone(i, d); setDone(i, d, v); haptic(); closeSheet(true); render(); toast(esc(v ? t('completed', i.t) : t('reopened')), { label: t('undo'), fn: () => { setDone(i, d, !v); render(); } }); };
ACT.eDelete = () => { const i = itemById(A.editId); if (!i) return; const idx = S.items.indexOf(i); S.items.splice(idx, 1); save(); closeSheet(true); render(); toast(esc(t('deleted')), { label: t('undo'), fn: () => { S.items.splice(idx, 0, i); save(); render(); } }); };
ACT.openItem = el => { if (el._suppress && Date.now() - el._suppress < 500) return; openItem(el.dataset.id); };

/* ---------------- WHEN (quick) ---------------- */
let W = null;
ACT.when = el => {
  if (el._suppress && Date.now() - el._suppress < 500) return;
  const i = itemById(el.dataset.id); if (!i) return;
  W = { id: i.id, date: i.date || null, time: i.time || null };
  const days = [0, 1, 2, 3, 4, 5, 6].map(k => addD(T(), k));
  const body = () => '<div style="font:700 20px/1.25 \'Bricolage Grotesque\';margin:2px 2px 16px">' + esc(i.t) + '</div><div class="chips wrap">' + days.map(d => '<button class="chip ' + (W.date === d ? 'cr' : 'in') + ' press" data-a="wDate" data-k="' + d + '">' + esc(daysBetween(T(), d) <= 1 ? dayName(d) : dayShort(d)) + '</button>').join('')
    + '<label class="chip pick in">' + ico('cal', 15, 2) + esc(t('pickDay')) + '<input type="date" id="wDateIn" value="' + (W.date || '') + '"></label></div>'
    + '<span class="cap lab">' + esc(t('time')) + '</span><div class="chips wrap"><label class="chip pick ' + (W.time ? 'cr' : 'in') + '">' + ico('clock', 15, 2) + (W.time || esc(t('time'))) + '<input type="time" id="wTimeIn" value="' + (W.time || '') + '"></label>' + (W.time ? '<button class="chip in press" data-a="wClearTime">' + ico('x', 14, 2.4) + '</button>' : '') + '</div>';
  const mount = () => {
    const di = $('#wDateIn'); di && di.addEventListener('change', () => { if (di.value) { W.date = di.value; rer(); } });
    const ti = $('#wTimeIn'); ti && ti.addEventListener('change', () => { if (ti.value) { W.time = ti.value; if (!W.date) W.date = T(); rer(); } });
  };
  const rer = () => { $('#sheet .sb').innerHTML = body(); mount(); };
  W.rer = rer;
  openSheet({ title: t('when'), right: t('save'), body: body(), mount, onSave: () => { const x = itemById(W.id); if (!x) return; if (W.date) x.date = W.date; else delete x.date; if (W.time) { x.time = W.time; x.dur = x.dur || 45; } else { delete x.time; } save(); closeSheet(true); render(); toast(esc(W.date ? t('planned', dayName(W.date) + (W.time ? ' ' + W.time : '')) : t('saved'))); } });
};
ACT.wDate = el => { W.date = el.dataset.k; W.rer(); };
ACT.wClearTime = () => { W.time = null; W.rer(); };

/* ---------------- CARD create / edit ---------------- */
let K = null;
function openCardSheet(id) {
  const c = id ? cardById(id) : null;
  K = c ? { id: c.id, name: c.name, type: c.type, color: c.color, deadline: c.deadline || null, note: c.note || '', habitAct: '', goal: c.type === 'habit' ? goalOf(c) : 7 } : { id: null, name: '', type: 'habit', color: COLORS[S.cards.length % COLORS.length], deadline: null, note: '', habitAct: '', goal: 7 };
  openSheet({ title: c ? t('editCard') : t('newCard'), right: t('save'), rightDisabled: !K.name, body: cardBody(), mount: mountCardSheet, onSave: saveCardSheet, dirty: () => !c && K.name.trim() });
}
function cardBody() {
  return '<span class="cap lab" style="margin-top:4px">' + esc(t('cardName')) + '</span><div class="fld in"><input id="kName" value="' + esc(K.name) + '" placeholder="' + esc(t('cardNamePh')) + '" autocomplete="off" enterkeyhint="done"></div>'
    + '<span class="cap lab">' + esc(t('type')) + '</span><div class="seg in" style="display:grid;grid-template-columns:1fr 1fr;height:44px"><button class="' + (K.type === 'habit' ? 'on' : '') + '" style="height:38px" data-a="kType" data-k="habit">' + ico('flame', 15, 2) + esc(t('habit')) + '</button><button class="' + (K.type === 'project' ? 'on' : '') + '" style="height:38px" data-a="kType" data-k="project">' + ico('spark', 15, 2) + esc(t('project')) + '</button></div>'
    + '<div class="muted" style="font:400 12.5px/1.4 Inter;margin:8px 4px 0">' + esc(K.type === 'habit' ? (lang() === 'cs' ? 'Návyk se opakuje. Počítá dny, sérii a rytmus.' : 'A habit repeats. It counts days, streaks and rhythm.') : (lang() === 'cs' ? 'Projekt má úkoly a může mít deadline.' : 'A project has tasks and can have a deadline.')) + '</div>'
    + '<span class="cap lab">' + esc(t('color')) + '</span><div class="cols">' + COLORS.map(c => '<button class="' + (K.color === c ? 'on' : '') + '" style="--c:' + c + '" data-a="kColor" data-k="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>'
    + (K.type === 'habit' ? '<span class="cap lab">' + esc(t('goal')) + ' · ' + esc(t('goalSub')) + '</span><div class="chips wrap">' + [1, 2, 3, 4, 5, 6, 7].map(n => '<button class="chip ' + ((K.goal || 7) === n ? 'cr' : 'in') + ' press" data-a="kGoal" data-k="' + n + '">' + esc(goalText(n)) + '</button>').join('') + '</div>' : '')
    + (K.type === 'habit' && !K.id ? '<span class="cap lab">' + (lang() === 'cs' ? 'Denní krok (nepovinné)' : 'Daily step (optional)') + '</span><div class="fld in"><input id="kAct" value="' + esc(K.habitAct) + '" placeholder="' + (lang() === 'cs' ? 'např. Číst 20 stran' : 'e.g. Read 20 pages') + '" autocomplete="off"></div>' : '')
    + (K.type === 'project' ? '<span class="cap lab">' + esc(t('deadlineOpt')) + '</span><div class="chips wrap"><label class="chip pick ' + (K.deadline ? 'cr' : 'in') + '">' + ico('cal', 15, 2) + (K.deadline ? esc(dayShort(K.deadline)) : esc(t('pickDay'))) + '<input type="date" id="kDl" value="' + (K.deadline || '') + '"></label>' + (K.deadline ? '<button class="chip in press" data-a="kDlClear">' + esc(t('clear')) + '</button>' : '') + '</div>' : '')
    + '<span class="cap lab">' + esc(t('cardNote')) + '</span><div class="fld in"><textarea id="kNote" rows="3" placeholder="' + esc(t('notePh')) + '">' + esc(K.note) + '</textarea></div>'
    + (K.id ? '<div class="btnrow"><button class="pbtn danger press" data-a="kDelete">' + ico('trash', 18, 2) + esc(t('deleteCard')) + '</button></div>' : '');
}
function mountCardSheet() {
  const n = $('#kName'); n.addEventListener('input', () => { K.name = n.value; $('#sheetSave').disabled = !K.name.trim(); });
  n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } });
  if (!K.id && !K.name) autoFocus(n, 380);
  const a = $('#kAct'); a && a.addEventListener('input', () => { K.habitAct = a.value; });
  const dl = $('#kDl'); dl && dl.addEventListener('change', () => { if (dl.value) { K.deadline = dl.value; refreshK(); } });
  const no = $('#kNote'); no.addEventListener('input', () => { K.note = no.value; });
}
function refreshK() { const sb = $('#sheet .sb'); const y = sb.scrollTop; sb.innerHTML = cardBody(); mountCardSheet(); sb.scrollTop = y; $('#sheetSave').disabled = !K.name.trim(); }
ACT.kType = el => { K.type = el.dataset.k; refreshK(); };
ACT.kColor = el => { K.color = el.dataset.k; $$('.cols button').forEach(b => b.classList.toggle('on', b === el)); };
ACT.kDlClear = () => { K.deadline = null; refreshK(); };
ACT.kGoal = el => { K.goal = +el.dataset.k; $$('[data-a="kGoal"]').forEach(b => { b.classList.toggle('cr', b === el); b.classList.toggle('in', b !== el); }); };
ACT.editGoal = () => {
  const c = cardById(V.card); if (!c) return;
  openSheet({ title: t('goal'), leftLabel: t('close'), body: '<div style="font:800 24px/1.15 \'Bricolage Grotesque\';margin:2px 2px 6px">' + esc(c.name) + '</div><div class="muted" style="font:400 14px/1.4 Inter;margin:0 2px 16px">' + esc(lang() === 'cs' ? 'Kolik dní v týdnu chceš? Analýza karty počítá s tímhle cílem.' : 'How many days a week? The card counts against this goal.') + '</div><div class="chips wrap">' + [1, 2, 3, 4, 5, 6, 7].map(n => '<button class="chip ' + (goalOf(c) === n ? 'cr' : 'in') + ' press" data-a="setGoal" data-k="' + n + '">' + esc(goalText(n)) + '</button>').join('') + '</div>' });
};
ACT.setGoal = el => { const c = cardById(V.card); if (!c) return; c.goal = +el.dataset.k; save(); closeSheet(true); render(); toast(esc(t('goal') + ' · ' + goalText(c.goal))); };
function saveCardSheet() {
  if (!K.name.trim()) return;
  if (K.id) { const c = cardById(K.id); Object.assign(c, { name: K.name.trim(), type: K.type, color: K.color, deadline: K.type === 'project' ? K.deadline : null, note: K.note, goal: K.type === 'habit' ? K.goal : undefined }); save(); closeSheet(true); render(); toast(esc(t('saved'))); return; }
  const c = { id: uid(), name: K.name.trim(), type: K.type, color: K.color, deadline: K.type === 'project' ? K.deadline : null, note: K.note, created: T(), goal: K.type === 'habit' ? K.goal : undefined };
  S.cards.push(c);
  if (K.type === 'habit' && K.habitAct.trim()) S.items.push(K.goal >= 7 ? { id: uid(), t: K.habitAct.trim(), card: c.id, repeat: 'daily', doneDates: [], date: T(), created: T() } : { id: uid(), t: K.habitAct.trim(), card: c.id, created: T() });
  save(); closeSheet(true); toast(esc(t('cardCreated')));
  openCard(c.id);
}
ACT.kDelete = () => { const id = K.id; confirmSheet(t('sureCard'), t('del'), () => { S.cards = S.cards.filter(c => c.id !== id); S.items.forEach(i => { if (i.card === id) i.card = null; }); S.moments.forEach(m => { if (m.card === id) m.card = null; }); save(); closeCard(); render(); toast(esc(t('deleted'))); }); };
ACT.newCard = el => { if (el && el._suppress && Date.now() - el._suppress < 500) return; openCardSheet(null); };
ACT.editCard = () => openCardSheet(V.card);

/* ---------------- small sheets ---------------- */
ACT.editName = () => {
  let v = S.name || '';
  openSheet({ title: t('yourName'), right: t('save'), body: '<div class="fld in"><input id="nmIn" value="' + esc(v) + '" placeholder="' + esc(t('namePh')) + '" autocomplete="given-name" enterkeyhint="done"></div>', mount: () => { const i = $('#nmIn'); i.addEventListener('input', () => v = i.value); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#sheetSave').click(); } }); autoFocus(i, 380); }, onSave: () => { S.name = v.trim(); save(); closeSheet(true); renderSettings(); } });
};
ACT.pickLang = () => {
  openSheet({ title: t('language'), leftLabel: t('close'), body: '<section class="grp frost solid">' + ['en', 'cs'].map(k => '<button class="srow" data-a="setLang" data-k="' + k + '">' + esc(t('lang_' + k)) + (S.lang === k ? '<span class="r" style="color:var(--green)">' + ico('check', 18, 2.6) + '</span>' : '') + '</button>').join('') + '</section>' });
};
ACT.setLang = el => { S.lang = el.dataset.k; save(); closeSheet(true); applyLook(); buildNav(); render(); renderSettings(); };
ACT.installInfo = () => {
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  openSheet({ title: t('install'), leftLabel: t('close'), body: '<div style="display:flex;gap:16px;align-items:center;margin:4px 0 18px"><img src="icon-180.png" alt="" style="width:64px;height:64px;border-radius:16px;box-shadow:0 6px 18px rgba(0,0,0,.3)"><div style="font:800 22px/1.15 \'Bricolage Grotesque\'">' + esc(standalone ? t('installed') : t('installT')) + '</div></div><div style="font:400 15.5px/1.6 Inter;color:var(--ink2)">' + t('installP') + '</div><div class="btnrow"><button class="pbtn cr press" data-a="sheetCancel">OK</button></div>' });
};
ACT.weekReview = () => {
  const days = weekDays(); const d = T(); const vals = days.map(x => x <= d ? completionsOn(x) : 0); const total = vals.reduce((a, b) => a + b, 0); const mx = Math.max(1, ...vals);
  const bestK = vals.indexOf(Math.max(...vals));
  const per = S.cards.map(c => [c, days.reduce((a, x) => a + completionsOn(x, c.id), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const body = '<div style="font:800 30px/1.05 \'Bricolage Grotesque\';letter-spacing:-.02em">' + esc(t('weekReview')) + '</div><div class="muted" style="font:400 14px/1 Inter;margin-top:8px">' + esc(dayShort(days[0]) + ' – ' + dayShort(days[6])) + '</div>'
    + '<section class="frost solid" style="border-radius:26px;padding:18px;margin-top:16px"><div class="num" style="font-size:48px">' + total + '<small>' + esc(t('weekDone')) + '</small></div><div style="display:flex;justify-content:space-between;align-items:flex-end;height:80px;margin-top:16px">'
    + days.map((x, k) => '<span style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><i style="width:14px;border-radius:5px;height:' + (x <= d ? Math.max(4, Math.round(vals[k] / mx * 56)) : 5) + 'px;background:' + (x === d ? 'var(--green);box-shadow:0 0 10px var(--green)' : x <= d ? 'rgba(243,234,216,.45)' : 'transparent;border:1px dashed rgba(243,234,216,.4)') + '"></i><span class="muted" style="font:400 11px/1 Inter">' + WD1[lang()][k] + '</span></span>').join('') + '</div>'
    + (total ? '<div style="margin-top:14px;font:400 14px/1.4 Inter;color:var(--ink2)">' + esc(t('bestDay', WD[lang()][bestK])) + '</div>' : '<div style="margin-top:14px;font:400 14px/1.4 Inter;color:var(--ink2)">' + esc(t('noneYet')) + '</div>') + '</section>'
    + (per.length ? '<span class="cap lab">' + esc(t('perCard')) + '</span><section class="grp frost solid">' + per.map(([c, n]) => '<button class="srow" data-a="reviewCard" data-id="' + c.id + '"><span class="led" style="--c:' + c.color + '"></span>' + esc(c.name) + '<span class="r">' + n + ico('chev', 14, 2.2) + '</span></button>').join('') + '</section>' : '')
    + '<div class="btnrow"><button class="pbtn cr press" data-a="planNextWeek">' + esc(t('planNext')) + '</button></div>';
  openSheet({ title: '', leftLabel: t('close'), body });
};
ACT.reviewCard = el => { closeSheet(true); openCard(el.dataset.id); };
ACT.planNextWeek = () => { closeSheet(true); V.planMode = 'week'; V.planWeek = addD(weekStart(T()), 7); V.planDay = V.planWeek; if (V.card) closeCard(); go('plan'); };

/* ---------------- VIEWER ---------------- */
const VW = { list: [], idx: 0 };
function openViewer(id) {
  const m = S.moments.find(x => x.id === id); if (!m) return;
  const inBoard = V.tab === 'board' && !V.card;
  VW.list = (inBoard ? boardList() : (V.card ? cardMoments(V.card) : [m])).map(x => x.id);
  if (!VW.list.includes(id)) VW.list = [id];
  VW.idx = VW.list.indexOf(id); paintViewer(); $('#viewer').classList.add('on'); $('#viewer').classList.remove('bare', 'orig'); document.body.classList.add('viewing');
}
function paintViewer(dir) {
  const v = $('#viewer'); const m = S.moments.find(x => x.id === VW.list[VW.idx]); if (!m) { closeViewer(); return; }
  const c = cardById(m.card); const u = mediaNow(m.img);
  const med = m.kind === 'note' ? '<div class="vnote frost" style="--c:' + cardColor(m.card) + '">' + esc(m.note) + '</div>' : m.kind === 'video' ? '<video src="' + u + '"' + (m.thumb ? ' poster="' + mediaNow(m.thumb) + '"' : '') + ' playsinline autoplay loop preload="auto"></video>' : '<img src="' + u + '" alt="' + esc(m.note || '') + '">';
  v.innerHTML = (m.kind !== 'note' && m.kind !== 'video' ? '<div class="vbg" style="background-image:url(' + u + ')"></div>' : m.kind === 'note' ? '<div class="vbg" style="background:' + cardColor(m.card) + ';opacity:.5"></div>' : '')
    + '<div class="vmed" id="vmed">' + med + '</div>'
    + '<div class="vtop"><span class="who frost">' + (c ? '<span class="led" style="--c:' + c.color + '"></span>' + esc(c.name) + ' · ' : '') + esc(dayName(m.d)) + '</span><span style="flex:1"></span>' + (m.kind === 'video' ? '<button class="cb frost press" id="vPlayBtn" data-a="vPlay" aria-label="Play">' + ico('pause', 20, 2) + '</button>' : '') + '<button class="cb frost press" data-a="closeViewer" aria-label="' + esc(t('close')) + '">' + ico('x', 20, 2.2) + '</button></div>'
    + (VW.list.length > 1 ? '<div class="vcount">' + (VW.idx + 1) + ' / ' + VW.list.length + '</div>' : '')
    + (m.note && m.kind !== 'note' ? '<div class="vcap">' + esc(m.note) + '</div>' : '')
    + '<div class="vact"><button class="cr press vplan" data-a="vPlan">' + ico(m.planned && itemById(m.planned) ? 'check' : 'cal', 20, 2) + esc(m.planned && itemById(m.planned) ? t('inPlan') : t('plan2')) + '</button><button class="frost press" data-a="vCard">' + ico('card', 20, 1.9) + esc(c ? c.name : t('toCard')) + '</button><button class="frost press" data-a="vPin">' + ico('pin', 20, 1.9) + esc(m.pin ? t('unpin') : t('pin')) + '</button><button class="frost press" data-a="vEdit">' + ico('edit', 20, 1.9) + esc(t('edit')) + '</button><button class="frost press red" data-a="vDelete" aria-label="' + esc(t('del')) + '">' + ico('trash', 20, 1.9) + esc(t('del')) + '</button></div>';
  const vv = $('#vmed video'); if (vv) { const pp = vv.play(); if (pp && pp.catch) pp.catch(() => { vv.muted = true; vv.play().catch(() => {}); const b = $('#vPlayBtn'); if (b) b.innerHTML = ico('play', 20, 2); }); }
  if (dir && !RM) $('#vmed').animate([{ transform: 'translateX(' + (dir * 60) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
function closeViewer() { const v = $('#viewer'); const vid = $('video', v); if (vid) vid.pause(); v.classList.remove('on'); v.innerHTML = ''; document.body.classList.remove('viewing'); render(); }
ACT.closeViewer = closeViewer;
ACT.vPlay = () => { const vd = $('#viewer video'); if (!vd) return; if (vd.paused) vd.play().catch(() => {}); else vd.pause(); const b = $('#vPlayBtn'); if (b) b.innerHTML = ico(vd.paused ? 'play' : 'pause', 20, 2); };
ACT.viewMoment = el => { if (el.closest('.spc') && !el.closest('.thumbs')) return; openViewer(el.dataset.id); };
const curM = () => S.moments.find(x => x.id === VW.list[VW.idx]);
ACT.vPin = () => { const m = curM(); m.pin = !m.pin; save(); paintViewer(); toast(esc(m.pin ? t('pin') : t('unpin'))); };
ACT.vCard = () => {
  const m = curM();
  openSheet({ title: t('pickCard'), leftLabel: t('close'), body: '<section class="grp frost solid">' + S.cards.map(c => '<button class="srow" data-a="vSetCard" data-k="' + c.id + '"><span class="led" style="--c:' + c.color + '"></span>' + esc(c.name) + (m.card === c.id ? '<span class="r" style="color:var(--green)">' + ico('check', 18, 2.6) + '</span>' : '') + '</button>').join('') + '<button class="srow" data-a="vSetCard" data-k="">' + esc(t('noCard')) + (!m.card ? '<span class="r" style="color:var(--green)">' + ico('check', 18, 2.6) + '</span>' : '') + '</button></section>' });
};
ACT.vSetCard = el => { const m = curM(); m.card = el.dataset.k || null; save(); closeSheet(true); paintViewer(); toast(esc(m.card ? cardById(m.card).name : t('noCard'))); };
ACT.vEdit = () => {
  const m = curM(); let v = m.note || '';
  openSheet({ title: m.kind === 'note' ? t('note') : t('captionPh'), right: t('save'), body: '<div class="fld in big"><textarea id="vNoteIn" rows="3" style="min-height:90px">' + esc(v) + '</textarea></div>', mount: () => { const i = $('#vNoteIn'); i.addEventListener('input', () => { v = i.value; $('#sheetSave').disabled = m.kind === 'note' && !v.trim(); }); autoFocus(i, 380); }, onSave: () => { m.note = v.trim(); save(); closeSheet(true); paintViewer(); } });
};
/* delete with undo instead of a confirm dialog (media is removed only once the undo window has passed) */
ACT.vDelete = () => {
  const m = curM(); if (!m) return; const idx = S.moments.indexOf(m); const at = VW.idx;
  S.moments.splice(idx, 1); save();
  let undone = false;
  const purge = setTimeout(() => { if (!undone && !S.moments.includes(m)) { delMedia(m.img); if (m.thumb) delMedia(m.thumb); } }, 6500);
  VW.list.splice(VW.idx, 1);
  if (!VW.list.length) closeViewer(); else { VW.idx = Math.min(VW.idx, VW.list.length - 1); paintViewer(); }
  toast(esc(t('deleted')), { label: t('undo'), fn: () => { undone = true; clearTimeout(purge); S.moments.splice(Math.min(idx, S.moments.length), 0, m); save(); if ($('#viewer').classList.contains('on')) { VW.list.splice(at, 0, m.id); VW.idx = at; paintViewer(); } else render(); } });
};
ACT.vPlan = () => {
  const m = curM(); if (!m) return;
  if (m.planned && itemById(m.planned)) { const id = m.planned; closeViewer(); openItem(id); return; }
  const text = (m.note || '').split('\n')[0].slice(0, 120);
  closeViewer();
  openAdd({ mode: 'plan', text, card: m.card || null, fromMoment: m.id });
  if (!text) autoFocus($('#aText'), 380);
};
(function viewerGestures() {
  const v = $('#viewer'); let s = null, lastTap = 0;
  v.addEventListener('pointerdown', e => { if (e.target.closest('button,.vcap,.vnote')) return; s = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  v.addEventListener('pointermove', e => { if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; const m = $('#vmed'); if (m) m.style.transform = Math.abs(dy) > Math.abs(dx) ? 'translateY(' + Math.max(0, dy) + 'px) scale(' + (1 - Math.max(0, dy) / 1600) + ')' : 'translateX(' + dx + 'px)'; });
  const end = e => {
    if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y, dt = Date.now() - s.t; s = null; const m = $('#vmed'); if (m) m.style.transform = '';
    if (dy > 110 && Math.abs(dy) > Math.abs(dx)) { closeViewer(); return; }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { const n = VW.idx + (dx < 0 ? 1 : -1); if (n >= 0 && n < VW.list.length) { VW.idx = n; paintViewer(dx < 0 ? 1 : -1); } return; }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 300) { const now = Date.now(); if (now - lastTap < 300) { v.classList.toggle('orig'); const md = $('#vmed'); if (md && !RM) md.animate([{ opacity: .55, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }); lastTap = 0; } else { lastTap = now; setTimeout(() => { if (lastTap === now) v.classList.toggle('bare'); }, 300); } }
  };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', () => { s = null; const m = $('#vmed'); if (m) m.style.transform = ''; });
})();
