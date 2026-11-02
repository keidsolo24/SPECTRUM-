'use strict';
/* ============ SPOLU: a card or a plan shared with up to 5 people ============
   Every shared card (or one shared plan item) is its own small space on your server.
   Everyone in it sees everything in it — nothing else from their Aurora.
   Records in a space:
     c:<id> card · i:<id> item · m:<id> moment · b:<media> photo preview
     x:<item>.<person> what that person has done (habits and plans: everyone ticks for themselves)
     u:<person> who is in · r:<person> removed by the owner · o:owner · a:<person>.<id> news
     k:<space> key to a shared plan item, handed to the people it is meant for */
Object.assign(IC, {
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c2.6-.2 5 1.6 5 4.8"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  leave: '<path d="M14 5h3.5A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h9"/>',
});
const SP = { busy: {}, timer: null, snaps: {}, again: {}, iv: null };
const MAXP = 5;
const PCOL = ['#ece9e1', '#ff8fb8', '#7fb3ff', '#8be0b0', '#ffc078'];
function meId() { if (!S.me || !S.me.id) S.me = { id: uid() }; return S.me.id; }
const chs = () => (S.shared || (S.shared = []));
const chBySp = sp => chs().find(c => c.sp === sp);
const chOfCard = c => c && c.sh ? chBySp(c.sh) : null;
function spaceOfItem(i) { const c = i.card ? cardById(i.card) : null; if (c && c.sh) return c.sh; return i.ish || null; }
function spaceOfMoment(m) { const c = m.card ? cardById(m.card) : null; return c && c.sh ? c.sh : null; }
const chOfItem = i => { const sp = spaceOfItem(i); return sp ? chBySp(sp) : null; };
/* project tasks are done together (anyone ticks, done for all); habits and plans per person */
function isTeam(i) { const c = i.card ? cardById(i.card) : null; return !!(c && c.sh && c.type === 'project'); }

function members(ch) {
  if (!ch) return [];
  const me = meId();
  const list = Object.entries(ch.mem || {}).filter(([, m]) => m && !m.removed).map(([id, m]) => ({ id, name: m.name || '?', joined: m.joined || 0 }));
  if (!list.some(m => m.id === me)) list.push({ id: me, name: S.name || '?', joined: ch.joined || 0 });
  list.sort((a, b) => a.joined - b.joined || a.id.localeCompare(b.id));
  return list.map((m, k) => ({ ...m, name: m.id === me ? (S.name || m.name) : m.name, color: PCOL[k % PCOL.length], me: m.id === me, owner: m.id === ch.owner, ini: ((m.id === me ? S.name : m.name) || '?').trim().charAt(0).toUpperCase() || '?' }));
}
const others = ch => members(ch).filter(m => !m.me);
function partners() { const map = new Map(); for (const ch of chs()) for (const m of others(ch)) if (!map.has(m.id)) map.set(m.id, m); return [...map.values()]; }
function namesOf(ms) { const cs = lang() === 'cs'; const n = ms.map(m => m.name); if (n.length <= 1) return n[0] || ''; return n.slice(0, -1).join(', ') + (cs ? ' a ' : ' and ') + n[n.length - 1]; }
function withNames(ms) { const cs = lang() === 'cs'; return (cs ? 's ' : 'with ') + namesOf(ms.map(m => ({ name: cs ? instr(m.name) : m.name }))); }
/* Czech "s Ájou / s Matějem" (good enough for common names; falls back to the plain name) */
function instr(n) {
  const s = (n || '').trim(); if (!s || /\s/.test(s)) return s;
  const l = s.toLowerCase();
  if (/a$/.test(l)) return s.slice(0, -1) + 'ou';
  if (/[eě]$/.test(l)) return s.slice(0, -1) + (l.endsWith('ie') ? 'í' : 'í');
  if (/[ií]$/.test(l)) return s;
  if (/[kh]$/.test(l) || /[bdfgjlmnprstvwz]$/.test(l)) return s + 'em';
  if (/[cčřšž]$/.test(l)) return s + 'em';
  return s;
}

/* ----- who has done what ----- */
function doneBy(i, d, memId) {
  if (memId === meId()) return isDone(i, d);
  if (isTeam(i)) return !!i.done && i.doneBy === memId;
  const b = (i._by || {})[memId]; if (!b) return false;
  return i.repeat ? (b.doneDates || []).includes(d) : !!b.done;
}
function memberDaySet(cardId, memId) {
  if (memId === meId()) return cardDaySet(cardId);
  const s = new Set();
  for (const i of S.items) {
    if (i.card !== cardId) continue;
    if (isTeam(i)) { if (i.done && i.doneOn && i.doneBy === memId) s.add(i.doneOn); continue; }
    const b = (i._by || {})[memId]; if (!b) continue;
    if (i.repeat) (b.doneDates || []).forEach(x => s.add(x)); else if (b.done && b.doneOn) s.add(b.doneOn);
  }
  return s;
}
const memberWeek = (cardId, memId, d = T()) => { const s = memberDaySet(cardId, memId); return weekDays(d).map(x => s.has(x)); };
function teamStreak(c) {
  const ms = members(chOfCard(c)); const g = goalOf(c); if (!ms.length) return 0;
  const sets = ms.map(m => memberDaySet(c.id, m.id));
  const met = ws => sets.every(s => weekDays(ws).filter(x => s.has(x)).length >= g);
  let ws = weekStart(T()); let n = 0;
  if (met(ws)) n++;
  ws = addD(ws, -7);
  for (let k = 0; k < 104 && met(ws); k++) { n++; ws = addD(ws, -7); }
  return n;
}
function teamBest(c) {
  const ms = members(chOfCard(c)); const g = goalOf(c); if (!ms.length) return 0;
  const sets = ms.map(m => memberDaySet(c.id, m.id));
  let ws = weekStart(c.created || T()), best = 0, cur = 0;
  for (let k = 0; k < 160 && ws <= T(); k++) { const ok = sets.every(s => weekDays(ws).filter(x => s.has(x)).length >= g); cur = ok ? cur + 1 : 0; best = Math.max(best, cur); ws = addD(ws, 7); }
  return best;
}

/* ----- small pieces of UI ----- */
function avHTML(m, s = 26, cls = '') { return '<span class="pav' + cls + '" style="width:' + s + 'px;height:' + s + 'px;--pc:' + m.color + ';font-size:' + Math.round(s * .46) + 'px" title="' + esc(m.name) + '">' + esc(m.ini) + '</span>'; }
function avStack(ms, s = 24, isOn) { return '<span class="pavs">' + ms.slice(0, 5).map(m => avHTML(m, s, isOn ? (isOn(m) ? ' on' : ' off') : '')).join('') + '</span>'; }
/* avatars on a plan row: who is in it, full = has done it */
function shareAv(i, d) {
  const ch = chOfItem(i); if (!ch) return '';
  const ms = members(ch); if (ms.length < 2) return '';
  return avStack(ms, 22, m => doneBy(i, d, m.id));
}
function shareSub(i) { const ch = chOfItem(i); if (!ch) return ''; const o = others(ch); return o.length ? withNames(o) : ''; }

/* ================= sync of shared spaces ================= */
const LOCAL_I = ['done', 'doneOn', 'doneDates', 'doneBy', 'ish'];
function cleanItem(i) { const team = isTeam(i); const o = {}; for (const k in i) { if (k[0] === '_') continue; if (!team && LOCAL_I.includes(k)) continue; if (team && k === 'ish') continue; o[k] = i[k]; } return o; }
function cleanCard(c) { const o = {}; for (const k in c) if (k !== 'sh' && k[0] !== '_' && k !== 'askedP') o[k] = c[k]; return o; }
function myX(i) { return i.repeat ? { doneDates: (i.doneDates || []).slice() } : { done: !!i.done, doneOn: i.doneOn || null }; }
const hasX = x => x.doneDates ? x.doneDates.length > 0 : !!x.done;
function chEnts(ch) {
  const me = meId(); const m = new Map();
  if (ch.kind === 'card') {
    const c = cardById(ch.ref); if (c) m.set('c:' + c.id, cleanCard(c));
    for (const x of S.moments) if (x.card === ch.ref) { if (!x.by) x.by = me; m.set('m:' + x.id, x); }
  }
  for (const i of S.items) {
    if (spaceOfItem(i) !== ch.sp) continue;
    if (!i.by) i.by = me;
    m.set('i:' + i.id, cleanItem(i));
    if (!isTeam(i)) { const x = myX(i); if (hasX(x)) m.set('x:' + i.id + '.' + me, x); }
  }
  const mine = (ch.mem || {})[me] || {};
  m.set('u:' + me, { name: (S.name || '').trim() || '?', joined: mine.joined || ch.joined || Date.now() });
  if (ch.owner === me) m.set('o:owner', { id: me });
  for (const r of ch.rm || []) m.set('r:' + r, { by: me });
  for (const a of (ch.act || []).filter(a => a.who === me).slice(-15)) m.set('a:' + me + '.' + a.id, { id: a.id, who: me, k: a.k, t: a.t, ts: a.ts });
  for (const k of ch.keys || []) m.set('k:' + k.sp, k);
  return m;
}
function mayDelete(k, snapV, me) {
  const t = k[0];
  if (t === 'c' || t === 'i' || t === 'm') return true;
  if (t === 'x') return k.endsWith('.' + me);
  if (t === 'a') return k.startsWith('a:' + me + '.');
  if (t === 'u') return k === 'u:' + me;
  return false; // keys (k) and removals (r) are never taken back automatically: my other devices don't hold them
}
async function chSnap(ch) { if (SP.snaps[ch.sp]) return SP.snaps[ch.sp]; let s = null; try { s = await DB.get('kv', 'snap:' + ch.sp); } catch (e) {} SP.snaps[ch.sp] = s || {}; return SP.snaps[ch.sp]; }
async function chSnapSave(ch) { try { await DB.set('kv', 'snap:' + ch.sp, SP.snaps[ch.sp] || {}); } catch (e) {} }
async function chApi(ch, path, body = {}) { return syncApi(path, Object.assign({ sp: ch.sp, secret: ch.secret }, body)); }

function chApply(ch, k, v) {
  const t = k[0], id = k.slice(2), me = meId(); let o = null;
  if (v != null) { try { o = JSON.parse(v); } catch (e) { return false; } }
  if (t === 'c') {
    if (ch.kind !== 'card' || id !== ch.ref) return false;
    if (v == null) { ch.gone = true; return true; }
    const ex = cardById(id); const keep = ex ? { sh: ch.sp, askedP: ex.askedP } : { sh: ch.sp };
    if (ex) { for (const kk of Object.keys(ex)) if (kk[0] !== '_') delete ex[kk]; Object.assign(ex, o, keep); } else S.cards.push(Object.assign(o, keep));
    return true;
  }
  if (t === 'i') {
    const idx = S.items.findIndex(x => x.id === id);
    if (v == null) { if (idx >= 0) S.items.splice(idx, 1); return true; }
    if (!o || o.id !== id) return false;
    const ex = idx >= 0 ? S.items[idx] : null;
    const team = (() => { const c = o.card ? cardById(o.card) : null; return !!(c && c.sh && c.type === 'project'); })();
    if (!team) {
      if (ex) { o.done = ex.done; o.doneOn = ex.doneOn; o.doneDates = ex.doneDates; o._by = ex._by; }
      else { if (o.repeat) o.doneDates = []; else { o.done = false; o.doneOn = null; } }
      delete o.doneBy;
      if (o.repeat && !Array.isArray(o.doneDates)) o.doneDates = [];
    }
    if (ch.kind === 'item') o.ish = ch.sp;
    if (idx >= 0) S.items[idx] = o; else S.items.push(o);
    return true;
  }
  if (t === 'x') {
    const dot = k.lastIndexOf('.'); const iid = k.slice(2, dot), mem = k.slice(dot + 1);
    ch.xs = ch.xs || {};
    if (v == null) delete ch.xs[k]; else ch.xs[k] = o;
    if (mem === me) { const it = itemById(iid); if (it && o && !isTeam(it)) { if (it.repeat) it.doneDates = (o.doneDates || []).slice(); else { it.done = !!o.done; it.doneOn = o.doneOn || null; } } }
    return true;
  }
  if (t === 'm') {
    const idx = S.moments.findIndex(x => x.id === id);
    if (v == null) { if (idx >= 0) S.moments.splice(idx, 1); return true; }
    if (!o || o.id !== id) return false;
    if (idx >= 0) S.moments[idx] = o; else S.moments.push(o);
    return true;
  }
  if (t === 'u') {
    ch.mem = ch.mem || {};
    if (v == null) { delete ch.mem[id]; return true; }
    ch.mem[id] = Object.assign({}, ch.mem[id], { name: o.name, joined: o.joined });
    return true;
  }
  if (t === 'r') { ch.mem = ch.mem || {}; if (v != null) { ch.mem[id] = Object.assign({}, ch.mem[id], { removed: true }); if (id === me) ch.kicked = true; } else if (ch.mem[id]) delete ch.mem[id].removed; return true; }
  if (t === 'o') { if (o && o.id) ch.owner = o.id; return true; }
  if (t === 'a') {
    ch.act = (ch.act || []).filter(a => a.key !== k);
    if (o) ch.act.push(Object.assign({}, o, { key: k }));
    ch.act.sort((a, b) => a.ts - b.ts); ch.act = ch.act.slice(-60);
    return true;
  }
  if (t === 'k') { if (o && Array.isArray(o.for) && o.for.includes(me) && !chBySp(o.sp)) (SP.pend = SP.pend || []).push(o); return true; }
  return false;
}
function chRebuildBy(ch) {
  const me = meId(); const by = {};
  for (const [k, x] of Object.entries(ch.xs || {})) { const dot = k.lastIndexOf('.'); const iid = k.slice(2, dot), mem = k.slice(dot + 1); if (mem === me) continue; (by[iid] = by[iid] || {})[mem] = x; }
  for (const i of S.items) if (spaceOfItem(i) === ch.sp) { if (isTeam(i)) delete i._by; else i._by = by[i.id] || {}; }
}

async function chPull(ch) {
  const snap = await chSnap(ch); let changed = false, media = false;
  for (let guard = 0; guard < 40; guard++) {
    const cur = ch.cur || { r: 0, k: '' };
    const j = await chApi(ch, '/s/pull', { since: cur.r, sinceK: cur.k });
    const local = chEnts(ch);
    for (const e of j.ents) {
      if (e.k.startsWith('b:')) {
        const key = e.k.slice(2); snap[e.k] = '1';
        if (e.v && e.v.startsWith('data:')) { try { const have = await DB.get('media', key); if (!have) { const blob = await (await fetch(e.v)).blob(); await DB.set('media', key, blob); MEDIA_URL.delete(key); await mediaURL(key); media = true; } } catch (er) {} }
        continue;
      }
      const mine = local.get(e.k); const mineS = mine ? JSON.stringify(mine) : undefined;
      if (mineS !== undefined && snap[e.k] !== undefined && mineS !== snap[e.k]) continue;
      if (mineS === undefined && snap[e.k] === undefined && e.v == null) continue;
      if (e.v != null && mineS === e.v) { snap[e.k] = e.v; continue; }
      if (chApply(ch, e.k, e.v)) { changed = true; if (e.v == null) delete snap[e.k]; else snap[e.k] = e.v; }
    }
    ch.cur = { r: j.upto, k: j.uptoK || '' };
    if (!j.more) break;
  }
  chRebuildBy(ch);
  await chSnapSave(ch);
  return { changed, media };
}

/* what I just did, for the news list and the other people's notifications */
function chEvents(ch, snap, cur) {
  if (ch.fresh) return [];
  const me = meId(), d = T(), ev = [];
  const card = ch.kind === 'card' ? cardById(ch.ref) : null;
  for (const [k, v] of cur) {
    const t = k[0];
    if (t === 'i' && v.by === me && snap[k] === undefined) ev.push({ k: 'add', t: v.t, iid: v.id });
    if (t === 'i' && isTeam(v) && v.done && v.doneBy === me && v.doneOn === d) { let was = null; try { was = snap[k] ? JSON.parse(snap[k]) : null; } catch (e) {} if (!was || !was.done) ev.push({ k: 'done', t: v.t, iid: v.id }); }
    if (t === 'x' && k.endsWith('.' + me)) {
      let was = null; try { was = snap[k] ? JSON.parse(snap[k]) : null; } catch (e) {}
      const now = v.doneDates ? v.doneDates.includes(d) : (v.done && v.doneOn === d);
      const bef = was ? (was.doneDates ? was.doneDates.includes(d) : (was.done && was.doneOn === d)) : false;
      if (now && !bef) { const it = itemById(k.slice(2, k.lastIndexOf('.'))); if (it) ev.push({ k: 'done', t: it.t, iid: it.id }); }
    }
    if (t === 'm' && v.by === me && snap[k] === undefined) ev.push({ k: v.kind === 'photo' || v.kind === 'video' ? 'photo' : v.kind === 'link' ? 'link' : 'note', t: (v.note || v.title || '').slice(0, 80) });
    if (t === 'u' && k === 'u:' + me && snap[k] === undefined && ch.owner !== me) ev.push({ k: 'join', t: card ? card.name : '' });
  }
  return ev.slice(0, 6);
}
function evText(ev, who, ch, forNotif, me) {
  const cs = lang() === 'cs'; const n = who || '?';
  const card = ch && ch.kind === 'card' ? cardById(ch.ref) : null;
  if (me) switch (ev.k) {
    case 'done': return (cs ? 'Máš hotovo: ' : 'You did: ') + ev.t;
    case 'add': return (cs ? 'Přidáno: ' : 'Added: ') + ev.t;
    case 'photo': return cs ? 'Přidána fotka' : 'Photo added';
    case 'note': return (cs ? 'Přidán nápad' : 'Idea added') + (ev.t ? ': ' + ev.t : '');
    case 'link': return cs ? 'Přidán odkaz' : 'Link added';
    case 'join': return cs ? 'Jsi teď v kartě' : 'You joined';
    default: return cs ? 'Ty' : 'You';
  }
  switch (ev.k) {
    case 'done': return forNotif ? n + (cs ? ' má hotovo ✓ · ' : ' is done ✓ · ') + ev.t : n + (cs ? ' má hotovo: ' : ' done: ') + ev.t;
    case 'add': return n + (cs ? ' přidává: ' : ' added: ') + ev.t;
    case 'photo': return n + (cs ? ' přidává fotku' : ' added a photo');
    case 'note': return n + (cs ? ' přidává nápad' : ' added an idea') + (ev.t ? ': ' + ev.t : '');
    case 'link': return n + (cs ? ' přidává odkaz' : ' added a link');
    case 'join': return n + (cs ? ' je teď v kartě' : ' joined') + (card && forNotif ? ' ' + card.name : '');
    case 'leave': return n + (cs ? ' už v kartě není' : ' left');
    default: return n;
  }
}
async function chPush(ch) {
  const snap = await chSnap(ch); const me = meId(); const now = Date.now();
  let cur = chEnts(ch);
  const ev = chEvents(ch, snap, cur);
  if (ev.length) {
    ch.act = ch.act || [];
    ev.forEach(e => ch.act.push({ id: uid(), who: me, k: e.k, t: e.t || '', ts: now, iid: e.iid }));
    cur = chEnts(ch);
  }
  const out = [];
  for (const [k, v] of cur) { const s = JSON.stringify(v); if (snap[k] !== s) out.push({ k, v: s, u: now }); }
  for (const k of Object.keys(snap)) { if (k[1] === ':' && !cur.has(k) && k[0] !== 'b' && mayDelete(k, snap[k], me)) out.push({ k, v: null, u: now }); }
  for (let i = 0; i < out.length; i += 200) {
    const part = out.slice(i, i + 200);
    await chApi(ch, '/s/push', { dev: (S.sync && S.sync.dev) || me, ents: part });
    for (const e of part) { if (e.v == null) delete snap[e.k]; else snap[e.k] = e.v; }
  }
  // photo previews of this card's moments
  if (ch.kind === 'card') {
    const keys = new Set(); S.moments.forEach(m => { if (m.card !== ch.ref) return; if (m.kind === 'photo' && m.img) keys.add(m.img); if (m.thumb) keys.add(m.thumb); });
    let sent = 0;
    for (const key of keys) {
      if (snap['b:' + key]) continue; if (sent >= 4) { SP.again[ch.sp] = true; break; }
      const d = await mediaPreview(key); if (!d) { snap['b:' + key] = 'x'; continue; }
      await chApi(ch, '/s/push', { dev: me, ents: [{ k: 'b:' + key, v: d, u: now }] });
      snap['b:' + key] = '1'; sent++;
    }
  }
  delete ch.fresh;
  await chSnapSave(ch);
  // tell the others (their phones), short and only for real moments
  if (ev.length) {
    const card = ch.kind === 'card' ? cardById(ch.ref) : null; const it = ch.kind === 'item' ? itemById(ch.ref) : null;
    const name = (S.name || '').trim() || '?';
    const pick = ev.filter(e => e.k === 'done' || e.k === 'join' || e.k === 'add').slice(0, 2);
    for (const e of pick) {
      const url = card ? './?card=' + encodeURIComponent(card.id) : it ? './?item=' + encodeURIComponent(it.id) : './';
      try { await chApi(ch, '/s/notify', { mem: me, title: card ? card.name : 'Aurora', body: evText(e, name, ch, true), url, tag: 'sp' + ch.sp.slice(0, 8) + e.k }); } catch (er) {}
    }
  }
  return out.length;
}
async function chSub(ch) {
  const want = S.push && S.push.on && S.push.id ? S.push.id : null;
  if (want === (ch.subDev || null)) return;
  try {
    if (ch.subDev && ch.subDev !== want) await chApi(ch, '/s/sub', { dev: ch.subDev, off: true });
    if (want) await chApi(ch, '/s/sub', { dev: want, mem: meId() });
    ch.subDev = want;
  } catch (e) {}
}
function chDropLocal(ch) {
  if (ch.kind === 'card') {
    const id = ch.ref;
    S.cards = S.cards.filter(c => c.id !== id);
    S.items = S.items.filter(i => i.card !== id);
    S.moments = S.moments.filter(m => m.card !== id);
    if (V.card === id) { try { closeCard(true); } catch (e) {} }
  } else S.items = S.items.filter(i => i.ish !== ch.sp);
  S.shared = chs().filter(x => x !== ch);
  delete SP.snaps[ch.sp]; try { DB.del('kv', 'snap:' + ch.sp); } catch (e) {}
}
async function chSync(ch) {
  if (!ch || SP.busy[ch.sp]) { if (ch) SP.again[ch.sp] = true; return false; }
  SP.busy[ch.sp] = true; SP.again[ch.sp] = false;
  let changed = false;
  try {
    const r = await chPull(ch); changed = r.changed || r.media;
    if (ch.kicked || ch.gone) {
      const card = ch.kind === 'card' ? cardById(ch.ref) : null; const nm = card ? card.name : '';
      chDropLocal(ch); await rawSave(); render();
      toast(esc(lang() === 'cs' ? (ch.gone ? 'Karta ' + nm + ' byla smazána' : 'Už nejsi v kartě ' + nm) : (ch.gone ? 'Card ' + nm + ' was deleted' : 'You are no longer in ' + nm)));
      return true;
    }
    await chPush(ch);
    await chSub(ch);
    ch.err = ''; ch.last = Date.now();
  } catch (e) { ch.err = e.status === 403 ? 'gone' : 'offline'; }
  finally { SP.busy[ch.sp] = false; }
  if (SP.pend && SP.pend.length) { const p = SP.pend.splice(0); for (const k of p) await joinKey(k); changed = true; }
  if (changed) { await rawSave(); if (typeof pushSchedule === 'function') pushSchedule(); render(); }
  else await rawSave();
  if (SP.again[ch.sp]) setTimeout(() => chSync(ch), 1500);
  return changed;
}
/* run now (waits if that space is just syncing) */
async function chSyncNow(ch) { for (let k = 0; k < 60 && SP.busy[ch.sp]; k++) await new Promise(r => setTimeout(r, 150)); return chSync(ch); }
async function spoluSyncAll() { for (const ch of chs().slice()) await chSync(ch); }
function spoluSchedule(ms = 2500) { if (!chs().length) return; clearTimeout(SP.timer); SP.timer = setTimeout(() => spoluSyncAll(), ms); }

/* ----- create / join / leave ----- */
async function newSpace(kind, ref) {
  const j = await syncApi('/s/new', {}); const me = meId(); const now = Date.now();
  const ch = { sp: j.sp, secret: j.secret, kind, ref, cur: { r: 0, k: '' }, mem: { [me]: { name: S.name || '?', joined: now } }, owner: me, act: [], xs: {}, keys: [], fresh: true, joined: now };
  chs().push(ch);
  return ch;
}
async function shareCard(card) {
  if (card.sh && chBySp(card.sh)) return chBySp(card.sh);
  const ch = await newSpace('card', card.id);
  card.sh = ch.sp; save();
  await chSync(ch);
  if (typeof syncNow === 'function' && syncOn()) syncSchedule(500);
  return ch;
}
async function shareItem(it) {
  if (it.ish && chBySp(it.ish)) return chBySp(it.ish);
  const ch = await newSpace('item', it.id);
  it.ish = ch.sp; save();
  await chSync(ch);
  return ch;
}
/* hand the key of a space to a person I already share something with */
async function giveKey(ch, memId) {
  const via = chs().find(x => x !== ch && x.kind === 'card' && others(x).some(m => m.id === memId)) || chs().find(x => x !== ch && others(x).some(m => m.id === memId));
  if (!via) return false;
  const card = ch.kind === 'card' ? cardById(ch.ref) : null; const it = ch.kind === 'item' ? itemById(ch.ref) : null;
  via.keys = (via.keys || []).filter(k => k.sp !== ch.sp);
  const title = card ? card.name : it ? it.t : '';
  via.keys.push({ sp: ch.sp, secret: ch.secret, kind: ch.kind, ref: ch.ref, for: [memId], by: meId(), title });
  save(); await chSyncNow(via);
  try { await chApi(via, '/s/notify', { mem: meId(), title: 'Aurora', body: ((S.name || '').trim() || '?') + (lang() === 'cs' ? ' sdílí: ' : ' shares: ') + title, url: './', tag: 'key' + ch.sp.slice(0, 8) }); } catch (e) {}
  return true;
}
async function joinKey(k) {
  if (chBySp(k.sp)) return;
  const ch = { sp: k.sp, secret: k.secret, kind: k.kind, ref: k.ref, cur: { r: 0, k: '' }, mem: {}, act: [], xs: {}, keys: [], joined: Date.now() };
  chs().push(ch);
  try { await chPull(ch); if (members(ch).filter(m => !m.me).length >= MAXP) { chDropLocal(ch); return; } await chPush(ch); await chSub(ch); } catch (e) {}
  const card = ch.kind === 'card' ? cardById(ch.ref) : null; const it = ch.kind === 'item' ? itemById(ch.ref) : null;
  const from = others(ch).find(m => m.owner) || others(ch)[0];
  toast(esc((from ? from.name : '') + (lang() === 'cs' ? ' tě přidává: ' : ' added you: ') + (card ? card.name : it ? it.t : '')));
}
/* peek at an invitation before saying yes */
async function peekInvite(code) {
  const j = await syncApi('/s/join', { code });
  const map = new Map(); let cur = { r: 0, k: '' };
  for (let g = 0; g < 20; g++) {
    const p = await syncApi('/s/pull', { sp: j.sp, secret: j.secret, since: cur.r, sinceK: cur.k });
    for (const e of p.ents) { if (e.k.startsWith('b:')) continue; if (e.v == null) map.delete(e.k); else map.set(e.k, e.v); }
    cur = { r: p.upto, k: p.uptoK || '' }; if (!p.more) break;
  }
  const P = (k) => { try { return JSON.parse(map.get(k)); } catch (e) { return null; } };
  let card = null, item = null, owner = null; const mem = {}; const removed = new Set(); let items = 0;
  for (const k of map.keys()) {
    if (k.startsWith('c:')) card = P(k);
    else if (k.startsWith('i:')) { items++; if (!item) item = P(k); }
    else if (k.startsWith('u:')) mem[k.slice(2)] = P(k);
    else if (k.startsWith('r:')) removed.add(k.slice(2));
    else if (k === 'o:owner') owner = (P(k) || {}).id;
  }
  const people = Object.entries(mem).filter(([id, v]) => v && !removed.has(id)).map(([id, v]) => ({ id, name: v.name, joined: v.joined || 0 })).sort((a, b) => a.joined - b.joined);
  return { sp: j.sp, secret: j.secret, kind: card ? 'card' : 'item', ref: card ? card.id : item ? item.id : null, card, item, owner, people, items };
}
async function acceptInvite(pv) {
  if (chBySp(pv.sp)) return chBySp(pv.sp);
  const ch = { sp: pv.sp, secret: pv.secret, kind: pv.kind, ref: pv.ref, cur: { r: 0, k: '' }, mem: {}, act: [], xs: {}, keys: [], joined: Date.now(), owner: pv.owner };
  chs().push(ch);
  await chSync(ch);
  save();
  return ch;
}
async function leaveSpace(ch, opts = {}) {
  const me = meId();
  try {
    const ents = [{ k: 'u:' + me, v: null, u: Date.now() }, { k: 'a:' + me + '.' + uid(), v: JSON.stringify({ id: uid(), who: me, k: 'leave', t: '', ts: Date.now() }), u: Date.now() }];
    if (opts.forAll) {
      const snap = await chSnap(ch);
      for (const k of Object.keys(snap)) if (k[1] === ':' && (k[0] === 'c' || k[0] === 'i' || k[0] === 'm')) ents.push({ k, v: null, u: Date.now() });
    }
    await chApi(ch, '/s/push', { dev: me, ents });
    if (ch.subDev) await chApi(ch, '/s/sub', { dev: ch.subDev, off: true });
  } catch (e) {}
  chDropLocal(ch); save(); render();
}
async function removeMember(ch, memId) { ch.rm = [...new Set([...(ch.rm || []), memId])]; ch.mem[memId] = Object.assign({}, ch.mem[memId], { removed: true }); save(); render(); await chSyncNow(ch); }
function inviteURL(code) { const u = new URL(location.href); u.search = ''; u.hash = ''; u.pathname = u.pathname.replace(/index\.html$/, ''); u.searchParams.set('join', code); return u.toString(); }

/* ================= sheets ================= */
function needName(then) {
  if ((S.name || '').trim()) { then(); return; }
  const cs = lang() === 'cs';
  openSheet({ title: cs ? 'Jak ti mají říkat?' : 'What should they call you?', right: cs ? 'Dál' : 'Next', body: '<div class="muted" style="font:400 14px/1.45 Inter;margin:0 2px 12px">' + esc(cs ? 'Tvoje jméno uvidí lidé ve sdílené kartě.' : 'People in the shared card will see your name.') + '</div><div class="fld in"><input id="nmIn" placeholder="' + esc(cs ? 'Tvoje jméno' : 'Your name') + '" autocomplete="given-name" enterkeyhint="done"></div>',
    mount: () => { const i = $('#nmIn'); autoFocus(i, 380); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); SH.onSave && SH.onSave(); } }); },
    onSave: () => { const v = ($('#nmIn').value || '').trim(); if (!v) return; S.name = v; save(); closeSheet(true); setTimeout(then, 320); } });
}
/* after a new habit: one gentle question */
function askPartner(card) {
  if (!card || card.askedP || card.sh) return;
  card.askedP = true; save();
  const cs = lang() === 'cs';
  const me = { name: S.name || '?', ini: ((S.name || '?').trim().charAt(0) || '?').toUpperCase(), color: PCOL[0] };
  openSheet({ title: '', leftLabel: cs ? 'Teď ne' : 'Not now', cls: 'askp', body: '<div class="askw"><div class="askav">' + avHTML(me, 52) + '<span class="pav plus" style="width:52px;height:52px">' + ico('plus', 22, 2.2) + '</span></div>'
    + '<div class="askt">' + esc(cs ? 'Chceš na ' + card.name + ' parťáka?' : 'Want a partner for ' + card.name + '?') + '</div>'
    + '<div class="muted asks">' + esc(cs ? 'Ve dvou se režim drží líp. Uvidíte navzájem, kdo dnes dal.' : 'It sticks better together. You both see who did it today.') + '</div>'
    + '<button class="pbtn cr press" style="width:100%" data-a="spInvite" data-id="' + card.id + '">' + ico('users', 18, 2.2) + esc(cs ? 'Pozvat parťáka' : 'Invite a partner') + '</button>'
    + '<button class="pbtn ghost press" style="width:100%;margin-top:8px" data-a="sheetCancel">' + esc(cs ? 'Teď ne' : 'Not now') + '</button></div>' });
}
ACT.spInvite = el => { const c = cardById(el.dataset.id || V.card); if (!c) return; closeSheet(true); needName(() => startInvite(c)); };
async function startInvite(card) {
  const cs = lang() === 'cs';
  try {
    if (!card.sh) toast(esc(cs ? 'Připravuju sdílení…' : 'Setting up sharing…'));
    const ch = card.sh ? chOfCard(card) : await shareCard(card);
    openInvite(ch);
  } catch (e) { toast(esc(e.code === 'nodb' ? (cs ? 'Na serveru chybí databáze D1 (viz návod)' : 'Server has no D1 database') : (cs ? 'Bez spojení se serverem. Zkus to za chvíli.' : 'No connection to the server. Try again soon.'))); }
}
async function openInvite(ch) {
  const cs = lang() === 'cs'; if (!ch) return;
  let code = ch.invite && ch.invite.exp > Date.now() + 864e5 ? ch.invite.code : '';
  if (!code) { try { const j = await chApi(ch, '/s/invite'); ch.invite = { code: j.code, exp: j.exp }; code = j.code; save(); } catch (e) { toast(esc(cs ? 'Bez spojení se serverem' : 'No connection to the server')); return; } }
  const card = ch.kind === 'card' ? cardById(ch.ref) : null; const it = ch.kind === 'item' ? itemById(ch.ref) : null;
  const name = card ? card.name : it ? it.t : '';
  const ms = members(ch); const full = ms.length >= MAXP;
  openSheet({ title: cs ? 'Pozvi parťáka' : 'Invite a partner', leftLabel: cs ? 'Hotovo' : 'Done', cls: 'invsheet', body:
    '<div class="invw"><div class="cap">' + esc((cs ? 'Kód do ' : 'Code for ') + (card ? (cs ? 'karty ' : 'card ') : '') + name) + '</div>'
    + '<div class="invc" id="invCode">' + esc(code) + '</div>'
    + '<div class="muted" style="font:400 13.5px/1.45 Inter">' + esc(cs ? 'Platí 7 dní · až ' + MAXP + ' lidí' : 'Valid 7 days · up to ' + MAXP + ' people') + '</div></div>'
    + (full ? '<div class="muted" style="text-align:center;margin:14px 0">' + esc(cs ? 'Karta je plná (' + MAXP + ' lidí).' : 'The card is full.') + '</div>' :
      '<button class="pbtn cr press" style="width:100%;margin-top:18px" data-a="invShare" data-k="' + esc(code) + '" data-n="' + esc(name) + '">' + ico('share', 18, 2.2) + esc(cs ? 'Poslat odkaz' : 'Send link') + '</button>'
      + '<button class="pbtn in press" style="width:100%;margin-top:8px" data-a="invCopy" data-k="' + esc(code) + '">' + ico('copy', 18, 2) + esc(cs ? 'Zkopírovat kód' : 'Copy code') + '</button>')
    + '<section class="grp frost solid" style="margin-top:14px"><div class="srow"><span class="ci" style="width:30px;height:30px;border-radius:15px;border:0;background:rgba(255,255,255,.08)">' + ico('users', 15, 2) + '</span><span class="tx">' + esc(cs ? 'Lidé' : 'People') + '</span><span class="r">' + avStack(ms, 24) + '<span class="muted" style="font:400 14px/1 Inter;margin-left:8px">' + ms.length + ' / ' + MAXP + '</span></span></div></section>'
    + '<div class="muted" style="font:400 12.5px/1.45 Inter;margin:12px 4px 0">' + esc(cs ? 'Kdo otevře odkaz, uvidí, co přesně se sdílí, a sám se rozhodne. Ve sdílené kartě vidíte všichni všechno. Nic jiného z vaší Aurory.' : 'Whoever opens the link sees what is shared and decides. Everyone sees everything in the shared card, nothing else.') + '</div>' });
}
ACT.invShare = async el => {
  const cs = lang() === 'cs'; const url = inviteURL(el.dataset.k);
  const text = cs ? 'Pojď do mé karty „' + el.dataset.n + '“ v Auroře. Kód: ' + el.dataset.k : 'Join my card "' + el.dataset.n + '" in Aurora. Code: ' + el.dataset.k;
  try { if (navigator.share) { await navigator.share({ title: 'Aurora', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + '\n' + url); toast(esc(cs ? 'Odkaz zkopírovaný' : 'Link copied')); } catch (e) { toast(esc(url)); }
};
ACT.invCopy = async el => { try { await navigator.clipboard.writeText(el.dataset.k); toast(esc(lang() === 'cs' ? 'Kód zkopírovaný' : 'Code copied')); } catch (e) { toast(esc(el.dataset.k)); } };

/* someone opens an invitation */
async function openJoin(code) {
  const cs = lang() === 'cs';
  toast(esc(cs ? 'Načítám pozvánku…' : 'Loading invitation…'));
  let pv;
  try { pv = await peekInvite(code); }
  catch (e) { toast(esc(e.code === 'badcode' ? (cs ? 'Pozvánka neplatí nebo vypršela' : 'Invitation invalid or expired') : (cs ? 'Bez spojení se serverem' : 'No connection to the server'))); if (!S.onboarded) setTimeout(() => showWelcome(), 900); return; }
  if (chBySp(pv.sp)) { const ch = chBySp(pv.sp); if (ch.kind === 'card') { hideWelcome(); openCard(ch.ref); } toast(esc(cs ? 'V téhle kartě už jsi' : 'You are already in this card')); return; }
  const owner = pv.people.find(p => p.id === pv.owner) || pv.people[0] || { name: '?' };
  const full = pv.people.length >= MAXP;
  const ownerAv = { name: owner.name, ini: (owner.name || '?').trim().charAt(0).toUpperCase(), color: PCOL[0] };
  const c = pv.card, it = pv.item;
  let prev;
  if (c) {
    const sub = c.type === 'habit' ? (cs ? 'Návyk · ' : 'Habit · ') + goalText(goalOf(c)) : (cs ? 'Projekt' : 'Project') + (c.deadline ? ' · ' + dayShort(c.deadline) : '');
    prev = '<span class="cap" style="display:flex;gap:8px;align-items:center;color:var(--ink)"><span class="led" style="--c:' + c.color + '"></span>' + esc(sub) + ' · Spolu</span><div class="jnm">' + esc(c.name) + '</div><div class="muted" style="font:400 14px/1.4 Inter">' + esc(cs ? pv.items + ' ' + (pv.items === 1 ? 'úkol' : pv.items < 5 && pv.items ? 'úkoly' : 'úkolů') + ' · ' + pv.people.length + ' / ' + MAXP + ' lidí' : pv.items + ' tasks · ' + pv.people.length + ' / ' + MAXP + ' people') + '</div>';
  } else if (it) {
    prev = '<span class="cap" style="color:var(--ink)">' + esc(cs ? 'Plán spolu' : 'Plan together') + '</span><div class="jnm">' + esc(it.t) + '</div><div class="muted" style="font:400 14px/1.4 Inter">' + esc([it.date ? dayShort(it.date) : '', it.time || ''].filter(Boolean).join(' · ')) + '</div>';
  } else prev = '<div class="jnm">?</div>';
  SP.join = pv;
  openSheet({ title: '', leftLabel: cs ? 'Ne, díky' : 'No thanks', cls: 'joinsheet', onClose: () => { if (!S.onboarded) setTimeout(() => { if (!S.onboarded) showWelcome(); }, 350); }, body: '<div class="joinw">' + avHTML(ownerAv, 60) + '<div class="jt">' + esc(owner.name + (cs ? (c ? ' tě zve do karty' : ' tě zve') : (c ? ' invites you to a card' : ' invites you'))) + '</div></div>'
    + '<section class="frost jprev">' + prev + '<div class="jwhat">' + ico('users', 18, 2) + '<span>' + esc(cs ? 'Všichni uvidíte všechno v ' + (c ? 'této kartě' : 'tomhle plánu') + '. Nic jiného z vaší Aurory.' : 'Everyone sees everything in this ' + (c ? 'card' : 'plan') + '. Nothing else from your Aurora.') + '</span></div></section>'
    + (full ? '<div class="muted" style="text-align:center;margin:16px 0">' + esc(cs ? 'Karta je plná (' + MAXP + ' lidí).' : 'This card is full.') + '</div>'
      : (!(S.name || '').trim() ? '<span class="cap lab">' + esc(cs ? 'Tvoje jméno' : 'Your name') + '</span><div class="fld in"><input id="jName" placeholder="' + esc(cs ? 'Jak ti mají říkat' : 'What they call you') + '" autocomplete="given-name"></div>' : '')
        + '<button class="pbtn cr press" style="width:100%;margin-top:16px" data-a="joinYes">' + esc(cs ? 'Přidat se' : 'Join') + '</button>')
    + '<button class="pbtn ghost press" style="width:100%;margin-top:8px" data-a="sheetCancel">' + esc(cs ? 'Ne, díky' : 'No thanks') + '</button>' });
}
ACT.joinYes = async () => {
  const cs = lang() === 'cs'; const pv = SP.join; if (!pv) return;
  const n = $('#jName'); if (n) { const v = n.value.trim(); if (!v) { n.focus(); toast(esc(cs ? 'Napiš své jméno' : 'Type your name')); return; } S.name = v; }
  const b = $('[data-a="joinYes"]'); if (b) { b.disabled = true; b.textContent = cs ? 'Přidávám…' : 'Joining…'; }
  try {
    const ch = await acceptInvite(pv); SP.join = null;
    S.onboarded = true; save(); closeSheet(true); hideWelcome();
    if (ch.kind === 'card') { go('spaces'); openCard(ch.ref); } else { go('plan'); }
    toast(esc(cs ? 'Jsi v tom ✓' : "You're in ✓"));
  } catch (e) { if (b) { b.disabled = false; b.textContent = cs ? 'Přidat se' : 'Join'; } toast(esc(cs ? 'Nepovedlo se, zkus to znovu' : 'Failed, try again')); }
};
/* type a code instead of opening the link */
ACT.joinCodeSheet = () => {
  const cs = lang() === 'cs';
  openSheet({ title: cs ? 'Pozvánka do karty' : 'Card invitation', right: cs ? 'Dál' : 'Next', body: '<div class="muted" style="font:400 14px/1.45 Inter;margin:0 2px 12px">' + esc(cs ? 'Opiš kód, který ti parťák poslal.' : 'Type the code your partner sent you.') + '</div><div class="fld in" style="padding:12px 14px"><input id="jcIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="RKSA-D5FY" style="font:700 22px/1.2 \'Bricolage Grotesque\';letter-spacing:.06em;text-transform:uppercase"></div>',
    mount: () => { const i = $('#jcIn'); autoFocus(i, 380); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); SH.onSave && SH.onSave(); } }); },
    onClose: () => { if (SP.fromWelcome && !SP.joining && !S.onboarded) setTimeout(() => showWelcome(), 350); SP.fromWelcome = false; },
    onSave: () => { const v = ($('#jcIn').value || '').trim(); if (v.replace(/[^a-z0-9]/gi, '').length !== 8) { toast(esc(cs ? 'Kód má 8 znaků' : 'The code has 8 characters')); return; } SP.joining = true; closeSheet(true); SP.joining = false; setTimeout(() => openJoin(v), 320); } });
};
/* card: people */
ACT.spLeave = el => {
  const cs = lang() === 'cs'; const c = cardById(el.dataset.id || V.card); const ch = c ? chOfCard(c) : null; if (!ch) return;
  confirmSheet(cs ? 'Opustit kartu ' + c.name + '? Zmizí z tvé Aurory, ostatním zůstane.' : 'Leave ' + c.name + '? It disappears from your Aurora, the others keep it.', cs ? 'Opustit' : 'Leave', async () => { closeSheet(true); await leaveSpace(ch); toast(esc(cs ? 'Kartu jsi opustil/a' : 'You left the card')); });
};
ACT.spDeleteAll = el => {
  const cs = lang() === 'cs'; const c = cardById(el.dataset.id || V.card); const ch = c ? chOfCard(c) : null; if (!ch) return;
  confirmSheet(cs ? 'Smazat kartu ' + c.name + ' pro všechny? Nejde to vrátit.' : 'Delete ' + c.name + ' for everyone? This cannot be undone.', cs ? 'Smazat pro všechny' : 'Delete for all', async () => { closeSheet(true); await leaveSpace(ch, { forAll: true }); toast(esc(cs ? 'Karta smazána' : 'Card deleted')); });
};
ACT.spRemove = el => {
  const cs = lang() === 'cs'; const c = cardById(V.card); const ch = c ? chOfCard(c) : null; if (!ch) return;
  const m = members(ch).find(x => x.id === el.dataset.k); if (!m) return;
  confirmSheet(cs ? 'Odebrat ' + m.name + ' z karty?' : 'Remove ' + m.name + ' from the card?', cs ? 'Odebrat' : 'Remove', () => removeMember(ch, m.id));
};
ACT.spLeaveItem = () => {
  const cs = lang() === 'cs'; const i = A && A.editId ? itemById(A.editId) : null; const ch = i ? chOfItem(i) : null; if (!ch || ch.kind !== 'item') return;
  confirmSheet(cs ? 'Odebrat se z „' + i.t + '“? Zmizí ti z plánu, ostatním zůstane.' : 'Leave "' + i.t + '"? It leaves your plan, the others keep it.', cs ? 'Odebrat mě' : 'Leave', async () => { closeSheet(true); await leaveSpace(ch); });
};

/* shared card: sections for the card screen */
function spoluHero(c) {
  const cs = lang() === 'cs'; const ch = chOfCard(c); const ms = members(ch); const d = T(); const td = dow(d);
  const g = goalOf(c);
  const rows = ms.map(m => { const w = memberWeek(c.id, m.id); const n = w.filter(Boolean).length;
    return '<div class="pwk">' + avHTML(m, 30) + '<span class="pnm">' + esc(m.me ? (cs ? 'Ty' : 'You') : m.name) + '</span><span class="pw">' + w.map((on, k) => '<i class="' + (on ? 'on' : '') + (k === td ? ' td' : '') + (k > td ? ' fu' : '') + '" style="--c:' + m.color + '"></i>').join('') + '</span><b>' + n + '/' + g + '</b></div>'; }).join('');
  const need = ms.map(m => ({ m, k: Math.max(0, g - memberWeek(c.id, m.id).filter(Boolean).length) }));
  const left = Math.max(0, 6 - td) + 1; // days left this week incl. today
  const allMet = need.every(x => !x.k);
  const same = need.every(x => x.k === need[0].k);
  const title = allMet ? (cs ? 'Cíl týdne máte všichni ✓' : 'Weekly goal met by all ✓') : same ? (cs ? 'Ještě ' + need[0].k + '× ' + (ms.length === 2 ? 'oba' : 'všichni') + ' a týden máte' : need[0].k + '× more each and the week is yours') : need.map(x => (x.m.me ? (cs ? 'ty' : 'you') : x.m.name) + ' ' + (x.k ? x.k + '×' : '✓')).join(' · ');
  const sub = allMet ? (cs ? 'Série pokračuje' : 'The streak continues') : (cs ? 'zbývá ' + left + ' ' + (left === 1 ? 'den' : left < 5 ? 'dny' : 'dní') : left + ' days left');
  const prog = ms.length ? need.reduce((a, x) => a + (g - x.k), 0) / (g * ms.length) : 0;
  return '<section class="hero frost spolu" style="--c:' + c.color + '"><span class="cap">' + esc(t('thisWeekCap')) + ' · <button class="goalb" data-a="editGoal">' + esc(t('goal')) + ' ' + esc(goalText(g)) + '</button></span>' + rows
    + '<div class="pjoin"><span class="pring">' + ringSVG(54, prog, c.color, 4) + '<b>' + Math.round(prog * 100) + '%</b></span><span class="tx"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span></div></section>';
}
function spoluStats(c) {
  const cs = lang() === 'cs'; const ms = members(chOfCard(c)); const st = teamStreak(c); const m = T().slice(0, 7);
  return '<div class="grid2"><div class="tile frost" style="min-height:96px"><span class="top"><span class="ci">' + ico('flame', 17, 1.7) + '</span><span class="fl"><span>' + esc(cs ? 'Spolu' : 'Together') + '</span><small>' + esc(t('best', teamBest(c))) + '</small></span></span><span class="bot"><span class="num">' + st + '<small>' + esc(cs ? (st === 1 ? 'týden v řadě' : st > 1 && st < 5 ? 'týdny v řadě' : 'týdnů v řadě') : 'weeks in a row') + '</small></span></span></div>'
    + '<div class="tile frost" style="min-height:96px"><span class="top"><span class="ci">' + ico('cal', 17, 1.7) + '</span><span class="fl"><span>' + esc(MON[lang()][new Date().getMonth()]) + '</span><small>' + esc(cs ? 'dní splněno' : 'days done') + '</small></span></span><span class="bot pmon">' + ms.slice(0, 3).map(x => avHTML(x, 20) + '<span class="num">' + [...memberDaySet(c.id, x.id)].filter(y => y.startsWith(m)).length + '</span>').join('') + '</span></div></div>';
}
function spoluHeat(c) {
  const cs = lang() === 'cs'; const ms = members(chOfCard(c)).slice(0, 4); const d = T(); const start = addD(weekStart(d), -21);
  const sets = ms.map(m => memberDaySet(c.id, m.id)); let both = 0; const cnt = {};
  let html = '';
  for (let k = 0; k < 28; k++) {
    const x = addD(start, k);
    if (x > d) { html += '<i class="fu"></i>'; continue; }
    const on = sets.map(s => s.has(x)); if (on.every(Boolean)) { both++; cnt[dow(x)] = (cnt[dow(x)] || 0) + 1; }
    html += '<i class="ph' + (x === d ? ' td' : '') + '">' + ms.map((m, j) => '<u style="' + (on[j] ? 'background:' + m.color : '') + '"></u>').join('') + '</i>';
  }
  const bestK = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return '<section class="frost solid" style="border-radius:30px;padding:16px 18px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="cap">' + esc(t('rhythm')) + '</span><span class="plg">' + ms.map(m => '<span><i style="background:' + m.color + '"></i>' + esc(m.me ? (cs ? 'Ty' : 'You') : m.name) + '</span>').join('') + '</span></div>'
    + '<div style="display:flex;gap:18px;align-items:flex-end;margin-top:14px"><div class="heat pheat">' + html + '</div><div style="display:flex;flex-direction:column;gap:8px;padding-bottom:4px;min-width:0"><span class="num" style="font-size:38px">' + both + '<small>' + esc(cs ? (ms.length === 2 ? 'dní oba' : 'dní všichni') : 'days all') + '</small></span><span style="font:400 12.5px/1.35 Inter;color:var(--ink2)">' + (bestK ? esc(cs ? 'Nejlíp vám jdou ' + ['pondělky', 'úterky', 'středy', 'čtvrtky', 'pátky', 'soboty', 'neděle'][+bestK[0]] + '.' : 'Your best day: ' + WD.en[+bestK[0]] + '.') : esc(cs ? 'Zatím žádný společný den.' : 'No shared day yet.')) + '</span></div></div>'
    + '<div class="muted" style="font:400 12px/1.35 Inter;margin-top:12px">' + esc(cs ? 'Každý čtvereček je den. Každý má v něm svůj proužek.' : 'Each square is a day, each person has a stripe.') + '</div></section>';
}
function agoText(ts) { const cs = lang() === 'cs'; const s = (Date.now() - ts) / 1000; if (s < 90) return cs ? 'teď' : 'now'; if (s < 3600) return (cs ? 'před ' : '') + Math.round(s / 60) + ' min' + (cs ? '' : ' ago'); const dd = new Date(ts); const day = dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate()); if (day === T()) return (cs ? 'dnes ' : 'today ') + pad(dd.getHours()) + ':' + pad(dd.getMinutes()); if (day === addD(T(), -1)) return cs ? 'včera' : 'yesterday'; return dayShort(day); }
function spoluNews(c) {
  const cs = lang() === 'cs'; const ch = chOfCard(c); const ms = members(ch);
  const list = (ch.act || []).slice().sort((a, b) => b.ts - a.ts).slice(0, 4);
  if (!list.length) return '';
  return '<div class="sec"><span class="cap" style="display:flex;justify-content:space-between">' + esc(cs ? 'Novinky' : 'News') + '<span class="muted" style="letter-spacing:0;text-transform:none;font:500 12px/1 Inter">' + esc(cs ? 'jen v kartě' : 'this card only') + '</span></span><section class="frost solid" style="border-radius:24px;padding:2px 14px">'
    + list.map(a => { const m = ms.find(x => x.id === a.who) || { name: '?', ini: '?', color: '#9fb3c4' }; return '<div class="pact">' + avHTML(m, 30) + '<span class="tx"><span>' + esc(evText(a, m.name, ch, false, m.me)) + '</span><small>' + esc(agoText(a.ts)) + '</small></span>' + (a.k === 'done' ? '<span style="color:var(--green)">' + ico('check', 16, 2.6) + '</span>' : '') + '</div>'; }).join('') + '</section></div>';
}
function spoluPeople(c) {
  const cs = lang() === 'cs'; const ch = chOfCard(c); const ms = members(ch); const iOwn = ch.owner === meId();
  return '<div class="sec"><span class="cap">' + esc((cs ? 'Lidé · ' : 'People · ') + ms.length + ' / ' + MAXP) + '</span><section class="grp frost solid">'
    + ms.map(m => { const n = memberWeek(c.id, m.id).filter(Boolean).length;
      return '<div class="srow pmem">' + avHTML(m, 34) + '<span class="tx">' + esc(m.me ? (cs ? 'Ty' : 'You') : m.name) + '<small>' + esc([m.owner ? (cs ? 'založil/a kartu' : 'created the card') : '', c.type === 'habit' ? n + '/' + goalOf(c) + (cs ? ' tento týden' : ' this week') : ''].filter(Boolean).join(' · ')) + '</small></span>' + (iOwn && !m.me ? '<button class="r muted" data-a="spRemove" data-k="' + m.id + '" style="font:400 13.5px/1 Inter">' + esc(cs ? 'Odebrat' : 'Remove') + '</button>' : '') + '</div>'; }).join('')
    + (ms.length < MAXP ? '<button class="srow" data-a="spInvite" data-id="' + c.id + '"><span class="ci" style="width:34px;height:34px;border-radius:17px;border:0;background:rgba(255,255,255,.08)">' + ico('plus', 16, 2.4) + '</span><span class="tx">' + esc(cs ? 'Pozvat další' : 'Invite more') + '</span><span class="r">' + ico('chev', 15, 2.2) + '</span></button>' : '')
    + '</section><section class="grp frost" style="margin-top:10px"><button class="srow red" data-a="spLeave" data-id="' + c.id + '">' + ico('leave', 16, 2) + esc(cs ? 'Opustit kartu' : 'Leave card') + '</button>' + (iOwn ? '<button class="srow red" data-a="spDeleteAll" data-id="' + c.id + '">' + ico('trash', 16, 2) + esc(cs ? 'Smazat kartu pro všechny' : 'Delete for everyone') + '</button>' : '') + '</section>'
    + '<div class="muted" style="font:400 12.5px/1.45 Inter;margin:10px 4px 0">' + esc(cs ? 'Všichni vidíte všechno v této kartě: úkoly, plán, poznámku, fotky a kdo co splnil. Nic jiného z vaší Aurory.' : 'Everyone sees everything in this card: tasks, plan, note, photos and who did what. Nothing else.') + '</div></div>';
}

/* boot: invitation link, keep shared cards fresh */
function spoluBoot() {
  if (!S.shared) S.shared = [];
  const q = new URLSearchParams(location.search); const code = q.get('join');
  if (code) { try { history.replaceState(null, '', location.pathname); } catch (e) {} setTimeout(() => openJoin(code), S.onboarded ? 600 : 1400); }
  if (chs().length) setTimeout(spoluSyncAll, 1200);
  clearInterval(SP.iv); SP.iv = setInterval(() => { if (!document.hidden && chs().length) spoluSyncAll(); }, 30000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) spoluSchedule(400); });

/* deleting a shared plan item removes it for everyone in it */
const _eDelete = ACT.eDelete;
ACT.eDelete = () => {
  const i = A && A.editId ? itemById(A.editId) : null; const ch = i ? chOfItem(i) : null;
  if (ch && ch.kind === 'item') { closeSheet(true); leaveSpace(ch, { forAll: true }); toast(esc(t('deleted'))); return; }
  _eDelete();
};
ACT.wInvite = () => { hideWelcome(); SP.fromWelcome = true; ACT.joinCodeSheet(); };
function momentBadge(m) { const ch = chBySp(spaceOfMoment(m)); if (!ch) return ''; const p = members(ch).find(x => x.id === m.by); return p && members(ch).length > 1 ? avHTML(p, 18, ' thb') : ''; }
