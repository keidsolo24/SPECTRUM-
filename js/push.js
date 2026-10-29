'use strict';
/* ============ PUSH: reminders via your own Cloudflare Worker ============
   iPhone web apps can't schedule a notification themselves, so Aurora sends the
   upcoming reminders (title + time only) to a tiny worker that pushes them on time. */
const b64u = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const u = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return u; },
};
const isStandalone = () => !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIOS() && !isStandalone() ? 'install' : 'no';
  if (isIOS() && !isStandalone()) return 'install';
  return 'ok';
}
const pushBase = () => (S.push.url || '').trim().replace(/\/+$/, '');
async function pushApi(path, body) {
  const r = await fetch(pushBase() + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
async function pushSetServer(url) {
  url = (url || '').trim();
  if (url && !/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) url = 'https://' + url.replace(/^[a-z]+:\/\//i, '').replace(/^\/+/, '');
  S.push.url = url.replace(/\/+$/, ''); S.push.key = ''; save();
  if (!S.push.url) return false;
  const j = await pushApi('/key'); if (!j || !j.key) throw new Error('no key');
  S.push.key = j.key; save(); return true;
}
/* must be called straight from a tap (iOS asks for permission only from a user gesture) */
async function pushEnable() {
  if (pushSupport() !== 'ok') { toast(esc(lang() === 'cs' ? 'Nejdřív přidej Auroru na plochu' : 'Add Aurora to your Home Screen first')); return false; }
  if (!S.push.url) { toast(esc(lang() === 'cs' ? 'Chybí adresa serveru' : 'Server address missing')); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast(esc(lang() === 'cs' ? 'Notifikace nejsou povolené' : 'Notifications not allowed')); renderSettingsIf(); return false; }
  try {
    if (!S.push.key) await pushSetServer(S.push.url);
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey && b64u.enc(sub.options.applicationServerKey) !== S.push.key) { try { await sub.unsubscribe(); } catch (e) {} sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u.dec(S.push.key) });
    if (!S.push.id) { S.push.id = uid() + uid(); S.push.secret = b64u.enc(crypto.getRandomValues(new Uint8Array(24))); }
    await pushApi('/sub', { id: S.push.id, secret: S.push.secret, sub: sub.toJSON(), lang: S.lang });
    S.push.on = true; S.push.asked = true; S.push.err = ''; save();
    await pushSync(true);
    toast(esc(lang() === 'cs' ? 'Notifikace zapnuté' : 'Notifications on'));
    renderSettingsIf(); return true;
  } catch (e) {
    S.push.err = String(e && e.message || e); save(); renderSettingsIf();
    toast(esc(lang() === 'cs' ? 'Zapnutí se nepovedlo. Zkontroluj adresu serveru.' : 'Could not turn on. Check the server address.'));
    return false;
  }
}
async function pushDisable() {
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) {}
  try { if (S.push.id) await pushApi('/unsub', { id: S.push.id, secret: S.push.secret }); } catch (e) {}
  S.push.on = false; S.push.last = ''; save(); renderSettingsIf();
}
async function pushTest() {
  try { await pushApi('/test', { id: S.push.id, secret: S.push.secret, title: lang() === 'cs' ? 'Aurora funguje' : 'Aurora works', body: lang() === 'cs' ? 'Takhle ti přijde připomínka.' : 'This is how a reminder looks.' }); toast(esc(lang() === 'cs' ? 'Odesláno, za chvíli přijde' : 'Sent, arriving shortly')); }
  catch (e) { toast(esc(lang() === 'cs' ? 'Server neodpověděl' : 'Server did not answer')); }
}
function renderSettingsIf() { if (V.settingsOpen) renderSettings(); }

/* ----- reminders for the next 14 days ----- */
function reminderList() {
  const out = []; const now = Date.now(); const cs = lang() === 'cs';
  for (let k = -1; k <= 14; k++) {
    const d = addD(T(), k);
    for (const i of S.items) {
      if (!i.time || i.remind == null || !occurs(i, d) || isDone(i, d)) continue;
      const [y, m, dd] = d.split('-').map(Number); const [hh, mi] = i.time.split(':').map(Number);
      const start = new Date(y, m - 1, dd, hh, mi, 0, 0).getTime();
      let at, title;
      if (i.remind === 'eve') { const e = new Date(y, m - 1, dd - 1, 19, 0, 0, 0).getTime(); at = Math.min(e, start - 30 * 60000); title = (cs ? 'Zítra ' : 'Tomorrow ') + i.time + ' · ' + i.t; }
      else { const r = +i.remind || 0; at = start - r * 60000; title = r === 0 ? i.t + (cs ? ' začíná teď' : ' starts now') : i.t + (cs ? ' za ' : ' in ') + (r >= 60 ? (r / 60) + ' h' : r + ' min'); }
      if (at < now - 30000) continue;
      const c = cardById(i.card);
      const body = [i.time, c ? c.name : '', i.dur ? durLabel(i.dur) : ''].filter(Boolean).join(' · ');
      out.push({ k: i.id + '@' + d, at, title, body, url: './?item=' + encodeURIComponent(i.id) + '&d=' + d });
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, 250);
}
let pushT = null;
function pushSchedule() { if (!S || !S.push || !S.push.on) return; clearTimeout(pushT); pushT = setTimeout(() => pushSync(false), 1500); }
async function pushSync(force) {
  if (!S.push.on || !S.push.id || !pushBase()) return;
  const rem = reminderList(); const sig = JSON.stringify(rem.map(r => [r.k, r.at, r.title, r.body]));
  if (!force && sig === S.push.last) return;
  try { await pushApi('/sync', { id: S.push.id, secret: S.push.secret, rem }); S.push.last = sig; S.push.err = ''; S.push.synced = Date.now(); try { await DB.set('kv', 'state', JSON.parse(JSON.stringify(S))); } catch (e) {} }
  catch (e) { S.push.err = String(e && e.message || e); }
}
/* after the first timed item, offer reminders once (the tap on "Turn on" is the gesture iOS needs) */
function maybeAskPush() {
  if (!S.push || S.push.on || S.push.asked || !S.push.url || pushSupport() !== 'ok') return;
  if (!('Notification' in window) || Notification.permission === 'denied') return;
  S.push.asked = true; save();
  toast(esc(t('enableAsk')), { label: t('enable'), fn: () => pushEnable() });
}
/* keep the subscription alive and the list fresh when the app opens */
async function pushBoot() {
  if (!S.push.on || pushSupport() !== 'ok') return;
  try {
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub && Notification.permission === 'granted' && S.push.key) { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u.dec(S.push.key) }); await pushApi('/sub', { id: S.push.id, secret: S.push.secret, sub: sub.toJSON(), lang: S.lang }); }
    if (!sub) { S.push.on = false; save(); return; }
    await pushSync(true);
  } catch (e) {}
}

/* ----- Settings → Notifications ----- */
function notifPage() {
  const cs = lang() === 'cs'; const sup = pushSupport(); const p = S.push;
  const perm = 'Notification' in window ? Notification.permission : 'default';
  const on = p.on && perm === 'granted';
  let status;
  if (sup === 'install') status = cs ? 'Nejdřív přidej Auroru na plochu. Z prohlížeče iPhone notifikace nepustí.' : 'Add Aurora to your Home Screen first. iPhone does not allow notifications from the browser.';
  else if (sup === 'no') status = cs ? 'Tenhle prohlížeč notifikace neumí.' : 'This browser does not support notifications.';
  else if (perm === 'denied') status = cs ? 'Notifikace jsou zakázané. Povol je v Nastavení iPhonu → Notifikace → Aurora.' : 'Notifications are blocked. Allow them in iPhone Settings → Notifications → Aurora.';
  else if (!p.url) status = cs ? 'Vlož adresu svého serveru (Cloudflare Worker). Postup najdeš níž.' : 'Paste your server address (Cloudflare Worker). Steps below.';
  else if (!on && p.url === PUSH_DEFAULT) status = cs ? 'Ťukni na Zapnout a povol notifikace. Nic dalšího nastavovat nemusíš.' : 'Tap Turn on and allow notifications. Nothing else to set up.';
  else if (on) status = cs ? 'Připomínky chodí k položkám s časem.' : 'Reminders arrive for items with a time.';
  else status = cs ? 'Server je nastavený. Zapni notifikace.' : 'Server is set. Turn notifications on.';
  const defs = REM_OPTS.map(([k, l]) => '<button class="chip ' + (p.def === k ? 'cr' : 'in') + ' press" data-a="pushDef" data-k="' + k + '">' + esc(t(l)) + '</button>').join('');
  return '<div class="hdr"><button class="cb frost press" data-a="settingsBack" aria-label="Back">' + ico('back', 20, 2.2) + '</button><span></span></div><h1 class="t1" style="margin-bottom:18px">' + esc(t('notif')) + '</h1>'
    + '<section class="nstat frost' + (on ? ' on' : '') + '"><span class="ni">' + ico(on ? 'bell' : 'bellOff', 22, 1.9) + '</span><span class="tx"><b>' + esc(on ? t('notifOn') : t('notifOff')) + '</b><small>' + esc(status) + '</small></span>' + (sup === 'ok' && p.url && perm !== 'denied' ? '<span class="tg' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-a="pushToggle"></span>' : '') + '</section>'
    + (on ? '<div class="sec"><span class="cap">' + esc(cs ? 'Výchozí připomínka' : 'Default reminder') + '</span><div class="chips wrap">' + defs + '</div><div class="muted" style="font:400 12.5px/1.4 Inter;margin:10px 4px 0">' + esc(cs ? 'Platí pro nové položky s časem. U každé jde změnit v řádku Připomenout.' : 'Used for new timed items. Change it per item in the Remind row.') + '</div></div>'
      + '<div class="sec"><section class="grp frost solid"><button class="srow" data-a="pushTest">' + esc(cs ? 'Poslat zkušební notifikaci' : 'Send a test notification') + '<span class="r">' + ico('bell', 15, 2) + '</span></button><div class="srow" style="cursor:default"><span class="tx">' + esc(cs ? 'Naplánované připomínky' : 'Scheduled reminders') + '<small>' + esc(cs ? 'na dalších 14 dní' : 'for the next 14 days') + '</small></span><span class="r">' + reminderList().length + '</span></div></section></div>' : '')
    + (sup === 'ok' && p.url && !on && perm !== 'denied' ? '<div class="btnrow"><button class="pbtn cr press" data-a="pushOn">' + ico('bell', 18, 2) + esc(cs ? 'Zapnout notifikace' : 'Turn on notifications') + '</button></div>' : '')
    + '<div class="muted" style="font:400 12.5px/1.5 Inter;margin:14px 6px 0">' + esc(cs ? 'Na server autora Aurory jde jen název, čas a karta nadcházejících položek s připomínkou. Nic jiného z telefonu neodchází.' : 'Only the title, time and card of upcoming items with a reminder go to the Aurora author\'s server. Nothing else leaves the phone.') + '</div>'
    + '<details class="adv sec"' + (p.url && p.url !== PUSH_DEFAULT ? ' open' : '') + '><summary class="cap">' + esc(cs ? 'Pokročilé · vlastní server' : 'Advanced · own server') + '</summary><section class="frost solid" style="border-radius:24px;padding:14px 16px;margin-top:10px"><div class="fld in" style="padding:12px 14px"><input id="pushUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="aurora-push.tvuj-ucet.workers.dev" value="' + esc(p.url) + '" aria-label="Server"></div>'
    + '<div class="btnrow" style="margin-top:10px"><button class="pbtn ' + (p.url && p.key ? 'ghost' : 'cr') + ' press" data-a="pushSave">' + esc(p.url && p.key ? (cs ? 'Ověřit znovu' : 'Check again') : (cs ? 'Uložit a ověřit' : 'Save and check')) + '</button></div>'
    + (p.url && p.key ? '<div class="muted" style="font:400 12.5px/1.4 Inter;margin-top:10px;display:flex;gap:8px;align-items:center"><span class="led" style="--c:var(--green)"></span>' + esc(cs ? 'Server odpovídá' : 'Server responds') + '</div>' : '')
    + (p.err ? '<div style="font:400 12.5px/1.4 Inter;margin-top:10px;color:#ffb3a9">' + esc((cs ? 'Chyba: ' : 'Error: ') + p.err) + '</div>' : '') + '</section></div>'
    + '<div class="sec"><span class="cap">' + esc(cs ? 'Jak nastavit vlastní server · 10 minut' : 'Set up your own server · 10 minutes') + '</span><section class="frost solid steps" style="border-radius:24px;padding:16px 18px">'
    + (cs ? ['Založ si zdarma účet na <b>dash.cloudflare.com</b>.', '<b>Workers &amp; Pages → Create → Worker</b>, pojmenuj ho <b>aurora-push</b> a dej Deploy.', '<b>Edit code</b>: smaž vše, vlož obsah souboru <b>worker/aurora-push.js</b> a dej Deploy.', '<b>Storage &amp; Databases → KV → Create</b>, název <b>aurora</b>.', 'Ve Workeru <b>Settings → Bindings → Add → KV namespace</b>: jméno proměnné <b>AURORA</b>, vyber <b>aurora</b>.', '<b>Settings → Triggers → Cron Triggers → Add</b>: <b>* * * * *</b> (každou minutu).', 'Zkopíruj adresu Workeru (…workers.dev), vlož ji sem nahoru a dej <b>Uložit a ověřit</b>. Pak <b>Zapnout notifikace</b>.']
      : ['Create a free account at <b>dash.cloudflare.com</b>.', '<b>Workers &amp; Pages → Create → Worker</b>, name it <b>aurora-push</b>, Deploy.', '<b>Edit code</b>: replace everything with <b>worker/aurora-push.js</b>, Deploy.', '<b>Storage &amp; Databases → KV → Create</b>, name <b>aurora</b>.', 'In the Worker <b>Settings → Bindings → Add → KV namespace</b>: variable <b>AURORA</b>, pick <b>aurora</b>.', '<b>Settings → Triggers → Cron Triggers → Add</b>: <b>* * * * *</b> (every minute).', 'Copy the Worker address (…workers.dev), paste it above, tap <b>Save and check</b>, then <b>Turn on</b>.']).map((x, k) => '<div class="st"><b class="n">' + (k + 1) + '</b><span>' + x + '</span></div>').join('')
    + '</section></div></details>';
}
function mountNotifPage() { if (S.push.url && !S.push.key && !mountNotifPage._busy) { mountNotifPage._busy = true; pushSetServer(S.push.url).then(() => { mountNotifPage._busy = false; renderSettingsIf(); }).catch(() => { mountNotifPage._busy = false; }); }
  const i = $('#pushUrl'); if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT.pushSave(); } }); }
ACT.notifPage = () => { V.settingsPage = 'notif'; renderSettings(); $('#s-settings').scrollTop = 0; };
ACT.pushSave = async () => {
  const i = $('#pushUrl'); const v = i ? i.value : S.push.url; const b = $('[data-a="pushSave"]'); if (b) { b.disabled = true; b.textContent = lang() === 'cs' ? 'Ověřuju…' : 'Checking…'; }
  try { const ok = await pushSetServer(v); S.push.err = ''; save(); toast(esc(ok ? (lang() === 'cs' ? 'Server odpovídá' : 'Server responds') : (lang() === 'cs' ? 'Adresa smazána' : 'Address cleared'))); }
  catch (e) { S.push.err = lang() === 'cs' ? 'server neodpovídá (' + (e.message || e) + ')' : 'server does not respond (' + (e.message || e) + ')'; save(); }
  renderSettingsIf();
};
ACT.pushOn = () => pushEnable();
ACT.pushToggle = () => { if (S.push.on) pushDisable(); else pushEnable(); };
ACT.pushTest = () => pushTest();
ACT.pushDef = el => { const k = el.dataset.k; S.push.def = k === 'off' || k === 'eve' ? k : +k; save(); renderSettingsIf(); };

/* ----- open an item from a notification tap ----- */
function openDeepLink(href) {
  try {
    const u = new URL(href, location.href); const id = u.searchParams.get('item'); if (!id) return;
    const i = itemById(id); if (!i) return;
    if (SH.open) closeSheet(true); if ($('#viewer').classList.contains('on')) closeViewer();
    const d = u.searchParams.get('d') || i.date || T();
    V.planDay = d; V.planWeek = weekStart(d); V.planMode = 'list'; go('plan');
    setTimeout(() => openItem(id), 250);
  } catch (e) {}
}
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'open') openDeepLink(e.data.url); });
