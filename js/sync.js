'use strict';
/* ============ SYNC: same data on phone and computer ============
   Every card / item / moment is one record on your server. On each save Aurora compares the
   current state with what was last synced and sends only what changed (newest change wins per
   record). Photos travel as a preview copy; the original stays on the device it came from. */
const SY = { snap: null, busy: false, timer: null, again: false };
const syncOn = () => !!(S && S.sync && S.sync.sp && S.sync.secret);
function syncEnts() {
  const m = new Map();
  const sh = typeof spaceOfItem === 'function';
  for (const c of S.cards) if (!c.sh) m.set('c:' + c.id, c);
  for (const i of S.items) if (!sh || !spaceOfItem(i)) m.set('i:' + i.id, i);
  for (const x of S.moments) if (!sh || !spaceOfMoment(x)) m.set('m:' + x.id, x);
  for (const ch of S.shared || []) m.set('k:' + ch.sp, { sp: ch.sp, secret: ch.secret, kind: ch.kind, ref: ch.ref });
  m.set('p:prefs', { name: S.name || '', lang: S.lang, nudges: S.nudges, weekly: S.weekly, order: S.cards.map(c => c.id), me: S.me && S.me.id || null });
  return m;
}
async function snapLoad() { if (SY.snap) return SY.snap; try { SY.snap = (await DB.get('kv', 'syncsnap')) || {}; } catch (e) { SY.snap = {}; } return SY.snap; }
async function snapSave() { try { await DB.set('kv', 'syncsnap', SY.snap); } catch (e) {} }
async function syncApi(path, body) {
  const r = await fetch(pushBase() + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const er = new Error((j && (j.error || j.message)) || ('http ' + r.status)); er.code = j && j.error; er.status = r.status; throw er; }
  return j;
}
function syncSchedule(ms = 2500) { if (!syncOn()) return; clearTimeout(SY.timer); SY.timer = setTimeout(() => syncNow(), ms); }

/* preview copy of a photo / video thumbnail for the other devices */
async function mediaPreview(key) {
  try {
    const b = await DB.get('media', key); if (!b) return null;
    let out = b;
    if (b.type && b.type.startsWith('image/') && b.type !== 'image/svg+xml' && b.type !== 'image/gif') out = await compressImage(new File([b], 'p.jpg', { type: b.type }), 1400);
    if (out.size > 1500000) return null;
    return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(out); });
  } catch (e) { return null; }
}

async function syncPush() {
  const snap = await snapLoad(); const now = Date.now(); const cur = syncEnts();
  const out = [];
  for (const [k, v] of cur) { const s = JSON.stringify(v); if (snap[k] !== s) out.push({ k, v: s, u: now }); }
  for (const k of Object.keys(snap)) { if ((k[0] === 'c' || k[0] === 'i' || k[0] === 'm' || k[0] === 'k') && k[1] === ':' && !cur.has(k)) out.push({ k, v: null, u: now }); }
  for (let i = 0; i < out.length; i += 200) {
    const part = out.slice(i, i + 200);
    await syncApi('/s/push', { sp: S.sync.sp, secret: S.sync.secret, dev: S.sync.dev, ents: part });
    for (const e of part) { if (e.v == null) delete snap[e.k]; else snap[e.k] = e.v; }
  }
  // media previews (once per media key)
  const keys = new Set(); S.moments.forEach(m => { if (typeof spaceOfMoment === 'function' && spaceOfMoment(m)) return; if (m.kind === 'photo' && m.img) keys.add(m.img); if (m.thumb) keys.add(m.thumb); });
  let sent = 0;
  for (const key of keys) {
    if (snap['b:' + key]) continue; if (sent >= 6) { SY.again = true; break; }
    const d = await mediaPreview(key); if (!d) { snap['b:' + key] = 'x'; continue; }
    await syncApi('/s/push', { sp: S.sync.sp, secret: S.sync.secret, dev: S.sync.dev, ents: [{ k: 'b:' + key, v: d, u: now }] });
    snap['b:' + key] = '1'; sent++;
  }
  await snapSave();
  return out.length;
}
async function syncPull() {
  const snap = await snapLoad(); let changed = false, media = false, n = 0;
  for (let guard = 0; guard < 40; guard++) {
    const cur = S.sync.cur || { r: 0, k: '' };
    const j = await syncApi('/s/pull', { sp: S.sync.sp, secret: S.sync.secret, since: cur.r, sinceK: cur.k });
    const local = syncEnts();
    for (const e of j.ents) {
      n++;
      if (e.k.startsWith('b:')) {
        const key = e.k.slice(2); snap[e.k] = '1';
        if (e.v && e.v.startsWith('data:')) { try { const have = await DB.get('media', key); if (!have) { const blob = await (await fetch(e.v)).blob(); await DB.set('media', key, blob); MEDIA_URL.delete(key); await mediaURL(key); media = true; } } catch (er) {} }
        continue;
      }
      const mine = local.get(e.k); const mineS = mine ? JSON.stringify(mine) : undefined;
      if (mineS !== undefined && snap[e.k] !== undefined && mineS !== snap[e.k]) continue; // local change not pushed yet: ours goes up next
      if (mineS === undefined && snap[e.k] === undefined && e.v == null) continue;
      if (e.v != null && mineS === e.v) { snap[e.k] = e.v; continue; }
      applyEnt(e.k, e.v); changed = true;
      if (e.v == null) delete snap[e.k]; else snap[e.k] = e.v;
    }
    S.sync.cur = { r: j.upto, k: j.uptoK || '' };
    if (!j.more) break;
  }
  if (SY.order) { const o = SY.order, at = id => { const k = o.indexOf(id); return k < 0 ? 1e9 : k; }; S.cards.sort((a, b) => at(a.id) - at(b.id)); SY.order = null; }
  await snapSave();
  return { changed, media, n };
}
function applyEnt(k, v) {
  const t = k[0], id = k.slice(2);
  if (k === 'p:prefs') { if (v) { const p = JSON.parse(v); S.name = p.name || S.name; if (p.lang) S.lang = p.lang; S.nudges = p.nudges !== false; S.weekly = p.weekly !== false; if (Array.isArray(p.order)) SY.order = p.order; if (p.me && (!S.me || !S.me.id || !(S.shared || []).length)) S.me = { id: p.me }; } return; }
  if (t === 'k') {
    // a shared card / plan I am in (joined on my other device)
    S.shared = S.shared || [];
    const ch = S.shared.find(x => x.sp === id);
    if (v == null) { if (ch && typeof chDropLocal === 'function') chDropLocal(ch); return; }
    if (!ch) { const o = JSON.parse(v); S.shared.push({ sp: o.sp, secret: o.secret, kind: o.kind, ref: o.ref, cur: { r: 0, k: '' }, mem: {}, act: [], xs: {}, keys: [], joined: Date.now() }); if (typeof spoluSchedule === 'function') spoluSchedule(300); }
    return;
  }
  const arr = t === 'c' ? S.cards : t === 'i' ? S.items : t === 'm' ? S.moments : null; if (!arr) return;
  const idx = arr.findIndex(x => x.id === id);
  if (idx >= 0 && (arr[idx].sh || (typeof spaceOfItem === 'function' && t === 'i' && spaceOfItem(arr[idx])) || (t === 'm' && typeof spaceOfMoment === 'function' && spaceOfMoment(arr[idx])))) return; // now lives in a shared space
  if (v == null) { if (idx >= 0) arr.splice(idx, 1); return; }
  let o; try { o = JSON.parse(v); } catch (e) { return; }
  if (!o || o.id !== id) return;
  if (idx >= 0) arr[idx] = o; else arr.push(o);
}
async function syncNow(opts = {}) {
  if (!syncOn()) return false;
  if (SY.busy) { SY.again = true; return false; }
  SY.busy = true; SY.again = false; const before = S.sync.state;
  S.sync.state = 'busy'; syncBadge();
  try {
    await syncPush();
    const r = await syncPull();
    if (r.changed) { S.sync.state = 'ok'; S.sync.last = Date.now(); S.sync.err = ''; await rawSave(); applyLook(); render(); }
    else if (r.media) render();
    S.sync.state = 'ok'; S.sync.last = Date.now(); S.sync.err = '';
    await rawSave();
  } catch (e) {
    S.sync.state = 'err'; S.sync.err = e.code === 'nodb' ? (lang() === 'cs' ? 'Na serveru chybí databáze D1' : 'Server has no D1 database') : e.status === 403 ? (lang() === 'cs' ? 'Propojení už neplatí' : 'Link is no longer valid') : (lang() === 'cs' ? 'Bez spojení, zkusím znovu' : 'Offline, will retry');
  } finally {
    SY.busy = false; syncBadge(); if (V.settingsOpen && V.settingsPage === 'sync') renderSettings();
    if (SY.again) syncSchedule(1500);
  }
  return true;
}
/* save without scheduling another sync */
async function rawSave() { try { await DB.set('kv', 'state', JSON.parse(JSON.stringify(S))); } catch (e) {} }

/* ----- pairing ----- */
async function syncCreate() {
  const j = await syncApi('/s/new', {});
  S.sync = { sp: j.sp, secret: j.secret, dev: (S.sync && S.sync.dev) || uid(), cur: { r: 0, k: '' }, state: 'ok' };
  SY.snap = {}; await snapSave(); save();
  await syncNow();
  return syncCode();
}
async function syncCode() { const j = await syncApi('/s/code', { sp: S.sync.sp, secret: S.sync.secret }); S.sync.code = j.code; S.sync.codeExp = j.exp; return j; }
async function syncJoin(code, mode) {
  const j = await syncApi('/s/join', { code });
  if (mode === 'replace') { S.cards = []; S.items = []; S.moments = []; }
  S.sync = { sp: j.sp, secret: j.secret, dev: (S.sync && S.sync.dev) || uid(), cur: { r: 0, k: '' }, state: 'ok' };
  S.onboarded = true;
  SY.snap = {}; await snapSave();
  await syncPull();   // theirs first (incl. name & language), then ours go up
  await syncNow();
  save(); applyLook(); buildNav(); if (typeof hideWelcome === 'function') hideWelcome(); render();
}
function syncLeave() { S.sync = { dev: S.sync && S.sync.dev }; SY.snap = {}; snapSave(); save(); syncBadge(); }

/* ----- small status dot (desktop top bar + settings row) ----- */
function syncBadge() {
  const el = document.getElementById('syncDot'); if (!el) return;
  const st = !syncOn() ? 'off' : S.sync.state || 'ok';
  el.dataset.st = st; el.title = st === 'off' ? (lang() === 'cs' ? 'Synchronizace vypnutá' : 'Sync off') : st === 'err' ? (S.sync.err || 'Error') : st === 'busy' ? (lang() === 'cs' ? 'Synchronizuju…' : 'Syncing…') : (lang() === 'cs' ? 'Synchronizováno' : 'Synced');
}
function syncAgo() { if (!S.sync || !S.sync.last) return ''; const s = Math.round((Date.now() - S.sync.last) / 1000); const cs = lang() === 'cs'; if (s < 60) return cs ? 'právě teď' : 'just now'; const m = Math.round(s / 60); if (m < 60) return cs ? 'před ' + m + ' min' : m + ' min ago'; const h = Math.round(m / 60); return cs ? 'před ' + h + ' h' : h + ' h ago'; }

/* ----- Settings → Sync page ----- */
function syncPage() {
  const cs = lang() === 'cs'; const on = syncOn();
  let h = '<div class="hdr"><button class="cb frost press" data-a="settingsBack" aria-label="Back">' + ico('back', 20, 2.2) + '</button><span></span></div><h1 class="t1" style="margin-bottom:18px">' + esc(cs ? 'Synchronizace' : 'Sync') + '</h1>';
  const st = !on ? 'off' : S.sync.state === 'err' ? 'err' : 'ok';
  h += '<section class="nstat frost' + (st === 'ok' ? ' on' : '') + '"><span class="ni">' + ico('sync', 22, 1.9) + '</span><span class="tx"><b>' + esc(!on ? (cs ? 'Jen v tomto zařízení' : 'Only on this device') : st === 'err' ? (cs ? 'Problém' : 'Problem') : (cs ? 'Propojeno' : 'Linked')) + '</b><small>'
    + esc(!on ? (cs ? 'Propoj telefon a počítač, ať mají stejné plány, karty a nápady.' : 'Link your phone and computer so they share plans, cards and ideas.') : st === 'err' ? S.sync.err : (cs ? 'Poslední synchronizace ' : 'Last sync ') + syncAgo() + ' · ' + (S.items.length + S.cards.length + S.moments.length) + (cs ? ' záznamů' : ' records')) + '</small></span></section>';
  if (!on) {
    h += '<div class="sec"><span class="cap">' + esc(cs ? 'První zařízení' : 'First device') + '</span><section class="grp frost solid"><button class="srow" data-a="syncCreate"><span class="tx">' + esc(cs ? 'Vytvořit propojení' : 'Create a link') + '<small>' + esc(cs ? 'Dostaneš kód pro druhé zařízení' : 'You get a code for the other device') + '</small></span><span class="r">' + ico('chev', 15, 2.2) + '</span></button></section></div>'
      + '<div class="sec"><span class="cap">' + esc(cs ? 'Druhé zařízení' : 'Second device') + '</span><section class="frost solid" style="border-radius:24px;padding:14px 16px"><div class="fld in" style="padding:12px 14px"><input id="syncCodeIn" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="' + esc(cs ? 'Kód, např. RKSA-D5FY' : 'Code, e.g. RKSA-D5FY') + '" aria-label="Code" style="font:700 20px/1.2 \'Bricolage Grotesque\';letter-spacing:.06em;text-transform:uppercase"></div>'
      + ((S.cards.length + S.items.length + S.moments.length) ? '<div class="muted" style="font:400 12.5px/1.45 Inter;margin:10px 2px 0">' + esc(cs ? 'V tomto zařízení už nějaká data jsou. Vyber, co s nimi:' : 'This device already has data. Choose:') + '</div><div class="btnrow" style="margin-top:10px"><button class="pbtn ghost press" data-a="syncJoin" data-k="replace">' + esc(cs ? 'Nahradit' : 'Replace') + '</button><button class="pbtn cr press" data-a="syncJoin" data-k="merge">' + esc(cs ? 'Sloučit' : 'Merge') + '</button></div>'
        : '<div class="btnrow" style="margin-top:10px"><button class="pbtn cr press" data-a="syncJoin" data-k="merge">' + esc(cs ? 'Propojit' : 'Link') + '</button></div>')
      + '</section></div>';
  } else {
    const code = S.sync.code && S.sync.codeExp > Date.now() ? S.sync.code : '';
    h += '<div class="sec"><span class="cap">' + esc(cs ? 'Přidat další zařízení' : 'Add another device') + '</span><section class="frost solid" style="border-radius:24px;padding:18px">'
      + (code ? '<div style="font:800 40px/1 \'Bricolage Grotesque\';letter-spacing:.08em;text-align:center;padding:6px 0 4px" id="syncCodeBig">' + esc(code) + '</div><div class="muted" style="text-align:center;font:400 13px/1.45 Inter;margin-top:8px">' + esc(cs ? 'Na druhém zařízení: Nastavení → Synchronizace → zadej kód. Platí 15 minut.' : 'On the other device: Settings → Sync → enter the code. Valid 15 minutes.') + '</div>'
        : '<button class="pbtn cr press" style="width:100%" data-a="syncNewCode">' + ico('plus', 18, 2.4) + esc(cs ? 'Ukázat kód' : 'Show code') + '</button>')
      + '</section></div>'
      + '<div class="sec"><section class="grp frost solid"><button class="srow" data-a="syncNowBtn">' + esc(cs ? 'Synchronizovat teď' : 'Sync now') + '<span class="r">' + ico('sync', 15, 2) + '</span></button><button class="srow red" data-a="syncLeaveBtn">' + esc(cs ? 'Odpojit toto zařízení' : 'Unlink this device') + '</button></section></div>';
  }
  h += '<div class="muted" style="font:400 12.5px/1.5 Inter;margin:14px 6px 0">' + esc(cs ? 'Synchronizují se plány, karty, nápady a odkazy. Fotky jako náhled, originál zůstává v zařízení, kde vznikl. Data jsou na serveru autora Aurory, chráněná tajným klíčem tvých zařízení.' : 'Plans, cards, ideas and links sync. Photos as a preview; the original stays where it was taken. Data lives on the Aurora author\'s server, protected by your devices\' secret key.') + '</div>';
  return h;
}
function mountSyncPage() { const i = $('#syncCodeIn'); if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT.syncJoin({ dataset: { k: (S.cards.length + S.items.length + S.moments.length) ? 'merge' : 'merge' } }); } }); }
ACT.syncPage = () => { V.settingsPage = 'sync'; renderSettings(); $('#s-settings').scrollTop = 0; };
ACT.syncCreate = async () => { try { toast(esc(lang() === 'cs' ? 'Vytvářím propojení…' : 'Creating link…')); await syncCreate(); renderSettings(); } catch (e) { toast(esc(e.code === 'nodb' ? (lang() === 'cs' ? 'Na serveru chybí databáze D1 (viz návod)' : 'Server has no D1 database (see guide)') : (lang() === 'cs' ? 'Server neodpovídá' : 'Server not responding'))); } };
ACT.syncNewCode = async () => { try { await syncCode(); renderSettings(); } catch (e) { toast(esc(lang() === 'cs' ? 'Server neodpovídá' : 'Server not responding')); } };
ACT.syncJoin = async el => {
  const i = $('#syncCodeIn'); const code = (i && i.value || '').trim(); if (code.replace(/[^a-z0-9]/gi, '').length !== 8) { toast(esc(lang() === 'cs' ? 'Kód má 8 znaků' : 'The code has 8 characters')); return; }
  try { toast(esc(lang() === 'cs' ? 'Propojuju…' : 'Linking…')); await syncJoin(code, el.dataset.k); renderSettings(); toast(esc(lang() === 'cs' ? 'Propojeno ✓' : 'Linked ✓')); }
  catch (e) { toast(esc(e.code === 'badcode' ? (lang() === 'cs' ? 'Kód neplatí nebo vypršel' : 'Code invalid or expired') : e.code === 'nodb' ? (lang() === 'cs' ? 'Na serveru chybí databáze D1' : 'Server has no D1 database') : (lang() === 'cs' ? 'Server neodpovídá' : 'Server not responding'))); }
};
ACT.syncNowBtn = () => syncNow();
ACT.syncLeaveBtn = () => confirmSheet(lang() === 'cs' ? 'Odpojit toto zařízení? Data v něm zůstanou, jen se přestanou synchronizovat.' : 'Unlink this device? Its data stays, it just stops syncing.', lang() === 'cs' ? 'Odpojit' : 'Unlink', () => { syncLeave(); renderSettings(); });

/* ----- link moments: title + preview image via the server ----- */
const isURL = s => /^https?:\/\/[^\s]+$/i.test((s || '').trim());
async function fetchLinkMeta(m) {
  try {
    const r = await fetch(pushBase() + '/og?url=' + encodeURIComponent(m.url)); const j = await r.json();
    if (j && j.ok) { m.title = j.title || m.title; m.image = j.image || null; m.site = j.site || m.site; save(); render(); }
  } catch (e) {}
}
function addLink(url, note, card) {
  let site = ''; try { site = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
  const m = { id: uid(), kind: 'link', url: url.trim(), title: site, site, image: null, card: card || null, note: note || '', d: T(), ts: Date.now() };
  S.moments.push(m); save(); render(); fetchLinkMeta(m); return m;
}

/* keep in sync while the app is open */
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSchedule(300); });
setInterval(() => { if (!document.hidden) syncNow(); }, 60000);
