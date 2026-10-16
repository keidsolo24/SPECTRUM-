'use strict';
/* ============ SHEETS & VIEWER ============ */
function cardChips(sel, suggested, act = 'pickCard') {
  const order = S.cards.slice().sort((a, b) => (b.id === suggested) - (a.id === suggested));
  return order.map(c => '<button class="chip ' + (sel === c.id ? 'cr' : 'in') + ' press" data-a="' + act + '" data-k="' + c.id + '"><span class="dot" style="--c:' + c.color + (c.id === suggested ? ';box-shadow:0 0 6px ' + c.color : '') + '"></span>' + esc(c.name) + '</button>').join('')
    + '<button class="chip ' + (!sel ? 'cr' : 'in') + ' press" data-a="' + act + '" data-k="">' + esc(t('noCard')) + '</button>';
}
function whenChips(A) {
  const d = T(); const tm = addD(d, 1);
  const other = A.date && A.date !== d && A.date !== tm;
  return '<button class="chip ' + (A.date === d ? 'cr' : 'in') + ' press" data-a="aDate" data-k="' + d + '">' + esc(t('today')) + '</button>'
    + '<button class="chip ' + (A.date === tm ? 'cr' : 'in') + ' press" data-a="aDate" data-k="' + tm + '">' + esc(t('tomorrow')) + '</button>'
    + '<label class="chip pick ' + (other ? 'cr' : 'in') + '">' + ico('cal', 15, 2) + (other ? esc(dayShort(A.date)) : esc(t('pickDay'))) + '<input type="date" id="aDateIn" value="' + (A.date || '') + '"></label>'
    + '<label class="chip pick ' + (A.time ? 'cr' : 'in') + '">' + ico('clock', 15, 2) + (A.time ? A.time : esc(t('time'))) + '<input type="time" id="aTimeIn" value="' + (A.time || '') + '"></label>'
    + (A.time ? '<button class="chip in press" data-a="aClearTime" aria-label="Clear time">' + ico('x', 14, 2.4) + '</button>' : '')
    + (!A.repeat ? '<button class="chip ' + (!A.date ? 'cr' : 'in') + ' press" data-a="aDate" data-k="">' + esc(t('noDay')) + '</button>' : '');
}
function repeatSeg(A) { return '<div class="seg in" style="display:grid;grid-template-columns:repeat(4,1fr);height:42px">' + [['', t('off')], ['daily', t('daily')], ['weekdays', t('wkdays')], ['weekly', t('weeklyR')]].map(([k, l]) => '<button class="' + ((A.repeat || '') === k ? 'on' : '') + '" style="padding:0 6px;font-size:13px" data-a="aRepeat" data-k="' + k + '">' + esc(l) + '</button>').join('') + '</div>'; }
function durChips(A) { return [15, 30, 45, 60, 90, 120].map(m => '<button class="chip ' + ((A.dur || 45) === m ? 'cr' : 'in') + ' press" data-a="aDur" data-k="' + m + '">' + (m < 60 ? m + ' min' : (m / 60) + ' h') + '</button>').join(''); }
function landsText(A) {
  if (A.mode === 'note' || A.mode === 'photo') { const c = cardById(A.card); return t('landsBoard', c ? t('inCard', esc(c.name)) : ''); }
  if (A.repeat) return t('landsRepeat', esc((A.repeat === 'weekdays' ? t('weekdays') : A.repeat === 'weekly' ? t('everyWeek') + ' (' + WD[lang()][dow(A.date || T())] + ')' : t('everyDay')) + (A.time ? ' · ' + A.time : '')));
  if (!A.date) return t('landsNoDay');
  return t('landsPlan', esc(dayShort(A.date) + (A.time ? ' · ' + A.time : '')));
}

/* ---------------- ADD ---------------- */
let A = null;
function suggestCard(txt) {
  if (A.cardTouched) return A.card;
  const low = (txt || '').toLowerCase();
  const hit = S.cards.find(c => c.name.length > 2 && low.includes(c.name.toLowerCase()));
  return hit ? hit.id : A.baseCard;
}
function openAdd(o = {}) {
  const base = o.date !== undefined ? o.date : T();
  A = { mode: o.mode || 'plan', text: '', card: o.card || null, baseCard: o.card || (S.lastCard && cardById(S.lastCard) ? S.lastCard : null), cardTouched: !!o.card, date: base, baseDate: base, time: null, repeat: null, dur: 45, whenTouched: false, file: null, url: null, kind: null, noAutofocus: (o.mode || 'plan') === 'photo' };
  if (!o.card) A.card = A.baseCard;
  openSheet({ title: t('newT'), right: t('save'), rightDisabled: true, body: addBody(), mount: mountAdd, onSave: saveAdd, dirty: () => A && ((A.text || '').trim() || A.file), onClose: () => { if (A && A.url) { /* keep URL if saved */ } } });
}
function addBody() {
  const seg = '<div class="seg in" style="display:grid;grid-template-columns:repeat(3,1fr);height:44px">' + [['plan', 'cal', t('planT')], ['note', 'note', t('noteT')], ['photo', 'photo', t('photoT')]].map(([k, i, l]) => '<button class="' + (A.mode === k ? 'on' : '') + '" style="height:38px" data-a="aMode" data-k="' + k + '">' + ico(i, 15, 2) + esc(l) + '</button>').join('') + '</div>';
  let b = seg;
  if (A.mode === 'plan') {
    b += '<div class="fld in big" style="margin-top:12px"><div class="mirror" id="aMirror"></div><textarea id="aText" rows="2" enterkeyhint="done" placeholder="' + esc(t('whatPh')) + '" aria-label="' + esc(t('whatPh')) + '">' + esc(A.text) + '</textarea></div>'
      + '<span class="cap lab">' + esc(t('cardSuggest')) + '</span><div class="chips wrap" id="aCards">' + cardChips(A.card, suggestCard(A.text)) + '</div>'
      + '<span class="cap lab">' + esc(t('when')) + '</span><div class="chips wrap" id="aWhen">' + whenChips(A) + '</div>'
      + '<div id="aDurWrap"' + (A.time ? '' : ' hidden') + '><span class="cap lab">' + (lang() === 'cs' ? 'Délka' : 'Length') + '</span><div class="chips" id="aDur">' + durChips(A) + '</div></div>'
      + '<span class="cap lab">' + esc(t('repeat')) + '</span><div id="aRep">' + repeatSeg(A) + '</div>';
  } else if (A.mode === 'note') {
    b += '<div class="fld in big" style="margin-top:12px"><textarea id="aText" rows="4" placeholder="' + esc(t('notePh2')) + '" aria-label="' + esc(t('note')) + '" style="min-height:110px">' + esc(A.text) + '</textarea></div>'
      + '<span class="cap lab">' + esc(t('cardCap')) + '</span><div class="chips wrap" id="aCards">' + cardChips(A.card, suggestCard(A.text)) + '</div>';
  } else {
    b += '<div style="margin-top:12px">' + (A.file ? '<div class="mediaprev">' + (A.kind === 'video' ? '<video src="' + A.url + '" controls playsinline muted></video>' : '<img src="' + A.url + '" alt="">') + '</div><label class="pbtn ghost pick press" style="margin-top:10px;width:100%">' + ico('photo', 18, 2) + esc(t('change')) + '<input type="file" id="aFile" accept="image/*,video/*"></label>'
      : '<label class="pbtn cr pick press" style="width:100%;height:120px;border-radius:26px;flex-direction:column;gap:10px">' + ico('photo', 30, 1.8) + '<span>' + esc(t('choosePhoto')) + '</span><input type="file" id="aFile" accept="image/*,video/*"></label>') + '</div>'
      + '<div class="fld in" style="margin-top:12px"><input id="aText" placeholder="' + esc(t('captionPh')) + '" value="' + esc(A.text) + '" autocomplete="off" aria-label="' + esc(t('captionPh')) + '"></div>'
      + '<span class="cap lab">' + esc(t('cardCap')) + '</span><div class="chips wrap" id="aCards">' + cardChips(A.card, suggestCard(A.text)) + '</div>';
  }
  b += '<div class="hint"><span class="led" style="--c:' + cardColor(A.card) + '"></span><span id="aHint">' + landsText(A) + '</span></div>';
  return b;
}
function refreshAdd(keepFocus) {
  const sb = $('#sheet .sb'); const y = sb.scrollTop; const f = document.activeElement && document.activeElement.id;
  sb.innerHTML = addBody(); mountAdd(); sb.scrollTop = y;
  if (keepFocus && f === 'aText') { const ta = $('#aText'); ta.focus({ preventScroll: true }); const n = ta.value.length; ta.setSelectionRange(n, n); }
}
function paintMirror() {
  const m = $('#aMirror'); if (!m) return;
  const p = NL(A.text); let h = '', last = 0;
  p.spans.forEach(([a, b]) => { h += esc(A.text.slice(last, a)) + '<mark>' + esc(A.text.slice(a, b)) + '</mark>'; last = b; });
  m.innerHTML = h + esc(A.text.slice(last)) + '​';
}
function canSave() { return A.mode === 'photo' ? !!A.file : !!A.text.trim(); }
function mountAdd() {
  const ta = $('#aText'); const sv = $('#sheetSave'); if (sv) sv.disabled = !canSave();
  if (ta) {
    const fit = () => { if (ta.tagName === 'TEXTAREA') { ta.style.height = 'auto'; ta.style.height = Math.max(A.mode === 'note' ? 110 : 58, ta.scrollHeight) + 'px'; } };
    ta.addEventListener('input', () => {
      A.text = ta.value; fit(); if (sv) sv.disabled = !canSave();
      if (A.mode === 'plan') {
        paintMirror(); const p = NL(A.text);
        if (!A.whenTouched) { A.date = p.date || A.baseDate; A.time = p.time; A.repeat = p.repeat; if (A.repeat && !A.date) A.date = T(); }
        updAddWhen();
      }
      const sc = suggestCard(A.text); if (!A.cardTouched && sc !== A.card) { A.card = sc; }
      const cc = $('#aCards'); if (cc) cc.innerHTML = cardChips(A.card, sc);
      $('#aHint').innerHTML = landsText(A); const l = $('#sheet .hint .led'); if (l) l.style.setProperty('--c', cardColor(A.card));
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && A.mode !== 'note') { e.preventDefault(); if (canSave()) saveAdd(); } });
    fit(); paintMirror();
    if (A.mode !== 'photo' && !A.text && !A.noAutofocus) setTimeout(() => { try { ta.focus({ preventScroll: true }); } catch (_) {} }, 380);
  }
  const f = $('#aFile'); if (f) f.addEventListener('change', async () => {
    const file = f.files && f.files[0]; if (!file) return;
    if (file.type.startsWith('video/') && file.size > 500 * 1024 * 1024) { toast(esc(t('tooBig'))); return; }
    if (file.type.startsWith('video/') && navigator.storage && navigator.storage.estimate) { try { const e = await navigator.storage.estimate(); if (e.quota && e.quota - (e.usage || 0) < file.size * 1.15) { toast(esc(t('noSpace'))); return; } } catch (er) {} }
    A.file = file; A.kind = file.type.startsWith('video/') ? 'video' : 'photo'; if (A.url) URL.revokeObjectURL(A.url); A.url = URL.createObjectURL(file); refreshAdd();
  });
  bindPickers();
}
function bindPickers() {
  const di = $('#aDateIn'); if (di) di.addEventListener('change', () => { if (di.value) { A.date = di.value; A.whenTouched = true; updAddWhen(); } });
  const ti = $('#aTimeIn'); if (ti) ti.addEventListener('change', () => { if (ti.value) { A.time = ti.value; if (!A.date && !A.repeat) A.date = T(); A.whenTouched = true; updAddWhen(); } });
}
function updAddWhen() {
  const w = $('#aWhen'); if (w) w.innerHTML = whenChips(A);
  const dw = $('#aDurWrap'); if (dw) dw.hidden = !A.time;
  const r = $('#aRep'); if (r) r.innerHTML = repeatSeg(A);
  const h = $('#aHint'); if (h) h.innerHTML = landsText(A);
  bindPickers();
}
ACT.aMode = el => { A.mode = el.dataset.k; if (A.mode !== 'plan') A.text = A.mode === 'photo' ? '' : A.text; A.noAutofocus = A.mode === 'photo'; refreshAdd(); };
ACT.pickCard = el => { A.card = el.dataset.k || null; A.cardTouched = true; const cc = $('#aCards'); if (cc) cc.innerHTML = cardChips(A.card, suggestCard(A.text)); $('#aHint').innerHTML = landsText(A); const l = $('#sheet .hint .led'); if (l) l.style.setProperty('--c', cardColor(A.card)); };
ACT.aDate = el => { A.date = el.dataset.k || null; if (!A.date) A.time = null; A.whenTouched = true; updAddWhen(); };
ACT.aClearTime = () => { A.time = null; A.whenTouched = true; updAddWhen(); };
ACT.aRepeat = el => { A.repeat = el.dataset.k || null; if (A.repeat && !A.date) A.date = T(); A.whenTouched = true; updAddWhen(); };
ACT.aDur = el => { A.dur = +el.dataset.k; $$('[data-a="aDur"]').forEach(b => { b.classList.toggle('cr', b === el); b.classList.toggle('in', b !== el); }); };
async function saveAdd() {
  if (!canSave()) return;
  const card = A.card && cardById(A.card) ? A.card : null; if (card) S.lastCard = card;
  if (A.mode === 'plan') {
    const p = NL(A.text); const title = stripSpans(A.text, p.spans) || A.text.trim();
    const it = { id: uid(), t: title, card, created: T() };
    if (A.date) it.date = A.date; if (A.time) { it.time = A.time; it.dur = A.dur || 45; }
    if (A.repeat) { it.repeat = A.repeat; it.doneDates = []; if (!it.date) it.date = T(); }
    S.items.push(it); save(); closeSheet(true); render();
    toast(esc(it.repeat ? t('saved') : it.date ? t('planned', dayName(it.date) + (it.time ? ' ' + it.time : '')) : t('undated')), { label: t('undo'), fn: () => { S.items = S.items.filter(x => x !== it); save(); render(); } });
  } else if (A.mode === 'note') {
    const m = { id: uid(), kind: 'note', card, note: A.text.trim(), d: T(), ts: Date.now() };
    S.moments.push(m); save(); closeSheet(true); render();
    toast(esc(t('noteAdded')), { label: t('undo'), fn: () => { S.moments = S.moments.filter(x => x !== m); save(); render(); } });
  } else {
    const sv = $('#sheetSave'); if (sv) { sv.disabled = true; sv.textContent = t('saving'); }
    try {
      let blob = A.file, r = 1, dur = 0;
      if (A.kind === 'photo') { blob = await compressImage(A.file); r = await imgRatio(blob); } else { const vi = await vidInfo(blob); r = vi.r; dur = vi.dur; }
      const key = await putMedia(blob);
      const m = { id: uid(), kind: A.kind, card, note: A.text.trim(), d: T(), img: key, r, dur, ts: Date.now() };
      if (A.kind === 'video') { try { const th = await videoThumb(blob); if (th) { m.thumb = await putMedia(th); await mediaURL(m.thumb); } } catch (e) {} }
      S.moments.push(m); save(); closeSheet(true); if (A.url) URL.revokeObjectURL(A.url);
      if (V.tab !== 'board' && !V.card) go('board'); else render();
      toast(esc(t('photoAdded')), { label: t('undo'), fn: () => { S.moments = S.moments.filter(x => x !== m); delMedia(key); save(); render(); } });
    } catch (e) { if (sv) sv.disabled = false; toast(lang() === 'cs' ? 'Uložení se nepovedlo' : 'Could not save'); }
  }
}
ACT.add = el => {
  if (el && el._suppress && Date.now() - el._suppress < 500) return;
  const d = el ? el.dataset : {};
  openAdd({ mode: d.mode || 'plan', card: d.card || (V.card || null), date: d.date !== undefined ? d.date : (d.ctx === 'today' ? T() : undefined) });
};

/* ---------------- ITEM ---------------- */
let E = null;
function openItem(id) {
  const i = itemById(id); if (!i) return;
  E = { id, t: i.t, card: i.card || null, date: i.date || null, time: i.time || null, repeat: i.repeat || null, dur: i.dur || 45, whenTouched: true, mode: 'plan' };
  openSheet({ title: t('editItem'), right: t('save'), body: itemBody(), mount: mountItem, onSave: saveItem, dirty: () => { const x = itemById(E.id); return x && (E.t !== x.t || E.card !== (x.card || null) || E.date !== (x.date || null) || E.time !== (x.time || null) || E.repeat !== (x.repeat || null)); } });
}
function itemBody() {
  const i = itemById(E.id); const d = i.repeat ? T() : (i.date || T()); const on = isDone(i, d);
  return '<div class="fld in big"><textarea id="eText" rows="1" aria-label="' + esc(t('title')) + '">' + esc(E.t) + '</textarea></div>'
    + '<span class="cap lab">' + esc(t('cardCap')) + '</span><div class="chips wrap" id="eCards">' + cardChips(E.card, null, 'eCard') + '</div>'
    + '<span class="cap lab">' + esc(t('when')) + '</span><div class="chips wrap" id="aWhen">' + whenChips(E).replace(/data-a="aDate"/g, 'data-a="eDate"').replace('data-a="aClearTime"', 'data-a="eClearTime"') + '</div>'
    + (E.time ? '<span class="cap lab">' + (lang() === 'cs' ? 'Délka' : 'Length') + '</span><div class="chips">' + durChips(E).replace(/data-a="aDur"/g, 'data-a="eDur"') + '</div>' : '')
    + '<span class="cap lab">' + esc(t('repeat')) + '</span>' + repeatSeg(E).replace(/data-a="aRepeat"/g, 'data-a="eRepeat"')
    + '<div class="btnrow"><button class="pbtn ' + (on ? 'ghost' : 'cr') + ' press" data-a="eDone">' + ico(on ? 'repeat' : 'check', 18, 2.4) + esc(on ? t('markUndone') : t('markDone')) + '</button></div>'
    + '<div class="btnrow" style="margin-top:8px"><button class="pbtn danger press" data-a="eDelete">' + ico('trash', 18, 2) + esc(t('deleteItem')) + '</button></div>';
}
function mountItem() {
  const ta = $('#eText'); const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(40, ta.scrollHeight) + 'px'; };
  ta.addEventListener('input', () => { E.t = ta.value; fit(); const sv = $('#sheetSave'); if (sv) sv.disabled = !E.t.trim(); }); requestAnimationFrame(fit);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ta.blur(); } });
  const di = $('#aDateIn'); if (di) di.addEventListener('change', () => { if (di.value) { E.date = di.value; refreshItem(); } });
  const ti = $('#aTimeIn'); if (ti) ti.addEventListener('change', () => { if (ti.value) { E.time = ti.value; if (!E.date && !E.repeat) E.date = T(); refreshItem(); } });
}
function refreshItem() { const sb = $('#sheet .sb'); const y = sb.scrollTop; sb.innerHTML = itemBody(); mountItem(); sb.scrollTop = y; }
ACT.eCard = el => { E.card = el.dataset.k || null; $('#eCards').innerHTML = cardChips(E.card, null, 'eCard'); };
ACT.eDate = el => { E.date = el.dataset.k || null; if (!E.date) E.time = null; refreshItem(); };
ACT.eClearTime = () => { E.time = null; refreshItem(); };
ACT.eRepeat = el => { E.repeat = el.dataset.k || null; if (E.repeat && !E.date) E.date = T(); refreshItem(); };
ACT.eDur = el => { E.dur = +el.dataset.k; $$('[data-a="eDur"]').forEach(b => { b.classList.toggle('cr', b === el); b.classList.toggle('in', b !== el); }); };
function saveItem() {
  const i = itemById(E.id); if (!i || !E.t.trim()) return;
  i.t = E.t.trim(); i.card = E.card && cardById(E.card) ? E.card : null;
  if (E.date) i.date = E.date; else delete i.date;
  if (E.time) { i.time = E.time; i.dur = E.dur || 45; } else { delete i.time; delete i.dur; }
  if (E.repeat) { if (!i.repeat) { i.doneDates = []; delete i.done; delete i.doneOn; } i.repeat = E.repeat; if (!i.date) i.date = T(); }
  else if (i.repeat) { delete i.repeat; delete i.doneDates; i.done = false; }
  save(); closeSheet(true); render(); toast(esc(t('saved')));
}
ACT.eDone = () => { const i = itemById(E.id); if (!i) return; const d = i.repeat ? T() : (i.date || T()); const v = !isDone(i, d); setDone(i, d, v); haptic(); closeSheet(true); render(); toast(esc(v ? t('completed', i.t) : t('reopened')), { label: t('undo'), fn: () => { setDone(i, d, !v); render(); } }); };
ACT.eDelete = () => { const i = itemById(E.id); if (!i) return; const idx = S.items.indexOf(i); S.items.splice(idx, 1); save(); closeSheet(true); render(); toast(esc(t('deleted')), { label: t('undo'), fn: () => { S.items.splice(idx, 0, i); save(); render(); } }); };
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
  K = c ? { id: c.id, name: c.name, type: c.type, color: c.color, deadline: c.deadline || null, note: c.note || '', habitAct: '' } : { id: null, name: '', type: 'habit', color: COLORS[S.cards.length % COLORS.length], deadline: null, note: '', habitAct: '' };
  openSheet({ title: c ? t('editCard') : t('newCard'), right: t('save'), rightDisabled: !K.name, body: cardBody(), mount: mountCardSheet, onSave: saveCardSheet, dirty: () => !c && K.name.trim() });
}
function cardBody() {
  return '<span class="cap lab" style="margin-top:4px">' + esc(t('cardName')) + '</span><div class="fld in"><input id="kName" value="' + esc(K.name) + '" placeholder="' + esc(t('cardNamePh')) + '" autocomplete="off" enterkeyhint="done"></div>'
    + '<span class="cap lab">' + esc(t('type')) + '</span><div class="seg in" style="display:grid;grid-template-columns:1fr 1fr;height:44px"><button class="' + (K.type === 'habit' ? 'on' : '') + '" style="height:38px" data-a="kType" data-k="habit">' + ico('flame', 15, 2) + esc(t('habit')) + '</button><button class="' + (K.type === 'project' ? 'on' : '') + '" style="height:38px" data-a="kType" data-k="project">' + ico('spark', 15, 2) + esc(t('project')) + '</button></div>'
    + '<div class="muted" style="font:400 12.5px/1.4 Inter;margin:8px 4px 0">' + esc(K.type === 'habit' ? (lang() === 'cs' ? 'Návyk se opakuje. Počítá dny, sérii a rytmus.' : 'A habit repeats. It counts days, streaks and rhythm.') : (lang() === 'cs' ? 'Projekt má úkoly a může mít deadline.' : 'A project has tasks and can have a deadline.')) + '</div>'
    + '<span class="cap lab">' + esc(t('color')) + '</span><div class="cols">' + COLORS.map(c => '<button class="' + (K.color === c ? 'on' : '') + '" style="--c:' + c + '" data-a="kColor" data-k="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>'
    + (K.type === 'habit' && !K.id ? '<span class="cap lab">' + (lang() === 'cs' ? 'Denní krok (nepovinné)' : 'Daily step (optional)') + '</span><div class="fld in"><input id="kAct" value="' + esc(K.habitAct) + '" placeholder="' + (lang() === 'cs' ? 'např. Číst 20 stran' : 'e.g. Read 20 pages') + '" autocomplete="off"></div>' : '')
    + (K.type === 'project' ? '<span class="cap lab">' + esc(t('deadlineOpt')) + '</span><div class="chips wrap"><label class="chip pick ' + (K.deadline ? 'cr' : 'in') + '">' + ico('cal', 15, 2) + (K.deadline ? esc(dayShort(K.deadline)) : esc(t('pickDay'))) + '<input type="date" id="kDl" value="' + (K.deadline || '') + '"></label>' + (K.deadline ? '<button class="chip in press" data-a="kDlClear">' + esc(t('clear')) + '</button>' : '') + '</div>' : '')
    + '<span class="cap lab">' + esc(t('cardNote')) + '</span><div class="fld in"><textarea id="kNote" rows="3" placeholder="' + esc(t('notePh')) + '">' + esc(K.note) + '</textarea></div>'
    + (K.id ? '<div class="btnrow"><button class="pbtn danger press" data-a="kDelete">' + ico('trash', 18, 2) + esc(t('deleteCard')) + '</button></div>' : '');
}
function mountCardSheet() {
  const n = $('#kName'); n.addEventListener('input', () => { K.name = n.value; $('#sheetSave').disabled = !K.name.trim(); });
  n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } });
  if (!K.id && !K.name) setTimeout(() => { try { n.focus({ preventScroll: true }); } catch (_) {} }, 380);
  const a = $('#kAct'); a && a.addEventListener('input', () => { K.habitAct = a.value; });
  const dl = $('#kDl'); dl && dl.addEventListener('change', () => { if (dl.value) { K.deadline = dl.value; refreshK(); } });
  const no = $('#kNote'); no.addEventListener('input', () => { K.note = no.value; });
}
function refreshK() { const sb = $('#sheet .sb'); const y = sb.scrollTop; sb.innerHTML = cardBody(); mountCardSheet(); sb.scrollTop = y; $('#sheetSave').disabled = !K.name.trim(); }
ACT.kType = el => { K.type = el.dataset.k; refreshK(); };
ACT.kColor = el => { K.color = el.dataset.k; $$('.cols button').forEach(b => b.classList.toggle('on', b === el)); };
ACT.kDlClear = () => { K.deadline = null; refreshK(); };
function saveCardSheet() {
  if (!K.name.trim()) return;
  if (K.id) { const c = cardById(K.id); Object.assign(c, { name: K.name.trim(), type: K.type, color: K.color, deadline: K.type === 'project' ? K.deadline : null, note: K.note }); save(); closeSheet(true); render(); toast(esc(t('saved'))); return; }
  const c = { id: uid(), name: K.name.trim(), type: K.type, color: K.color, deadline: K.type === 'project' ? K.deadline : null, note: K.note, created: T() };
  S.cards.push(c);
  if (K.type === 'habit' && K.habitAct.trim()) S.items.push({ id: uid(), t: K.habitAct.trim(), card: c.id, repeat: 'daily', doneDates: [], date: T(), created: T() });
  save(); closeSheet(true); toast(esc(t('cardCreated')));
  openCard(c.id);
}
ACT.kDelete = () => { const id = K.id; confirmSheet(t('sureCard'), t('del'), () => { S.cards = S.cards.filter(c => c.id !== id); S.items.forEach(i => { if (i.card === id) i.card = null; }); S.moments.forEach(m => { if (m.card === id) m.card = null; }); save(); closeCard(); render(); toast(esc(t('deleted'))); }); };
ACT.newCard = el => { if (el && el._suppress && Date.now() - el._suppress < 500) return; openCardSheet(null); };
ACT.editCard = () => openCardSheet(V.card);

/* ---------------- small sheets ---------------- */
ACT.editName = () => {
  let v = S.name || '';
  openSheet({ title: t('yourName'), right: t('save'), body: '<div class="fld in"><input id="nmIn" value="' + esc(v) + '" placeholder="' + esc(t('namePh')) + '" autocomplete="given-name" enterkeyhint="done"></div>', mount: () => { const i = $('#nmIn'); i.addEventListener('input', () => v = i.value); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#sheetSave').click(); } }); setTimeout(() => i.focus(), 380); }, onSave: () => { S.name = v.trim(); save(); closeSheet(true); renderSettings(); } });
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
    + '<div class="vact"><button class="frost press" data-a="vPin">' + ico('pin', 20, 1.9) + esc(m.pin ? t('unpin') : t('pin')) + '</button><button class="frost press" data-a="vCard">' + ico('card', 20, 1.9) + esc(t('toCard')) + '</button><button class="frost press" data-a="vEdit">' + ico('edit', 20, 1.9) + esc(t('edit')) + '</button><button class="frost press red" data-a="vDelete">' + ico('trash', 20, 1.9) + esc(t('del')) + '</button></div>';
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
  openSheet({ title: m.kind === 'note' ? t('note') : t('captionPh'), right: t('save'), body: '<div class="fld in big"><textarea id="vNoteIn" rows="3" style="min-height:90px">' + esc(v) + '</textarea></div>', mount: () => { const i = $('#vNoteIn'); i.addEventListener('input', () => { v = i.value; $('#sheetSave').disabled = m.kind === 'note' && !v.trim(); }); setTimeout(() => i.focus(), 380); }, onSave: () => { m.note = v.trim(); save(); closeSheet(true); paintViewer(); } });
};
ACT.vDelete = () => {
  confirmSheet(lang() === 'cs' ? 'Smazat tento moment?' : 'Delete this moment?', t('del'), () => {
    const m = curM(); S.moments = S.moments.filter(x => x !== m); save(); delMedia(m.img); if (m.thumb) delMedia(m.thumb);
    VW.list.splice(VW.idx, 1); if (!VW.list.length) { closeViewer(); toast(esc(t('deleted'))); return; }
    VW.idx = Math.min(VW.idx, VW.list.length - 1); paintViewer(); toast(esc(t('deleted')));
  });
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
