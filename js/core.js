'use strict';
/* ============ CORE: utils, i18n, storage, model ============ */
const VERSION = '1.0.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = n => String(n).padStart(2, '0');

/* ---------- dates ---------- */
const ds = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const T = () => ds(new Date());
const dOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addD = (s, n) => { const d = dOf(s); d.setDate(d.getDate() + n); return ds(d); };
const dow = s => (dOf(s).getDay() + 6) % 7; // Mon=0
const weekStart = s => addD(s, -dow(s));
const daysBetween = (a, b) => Math.round((dOf(b) - dOf(a)) / 864e5);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const tmin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const mtime = m => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);

/* ---------- i18n ---------- */
const L = {
  home: ['Home', 'Domů'], spaces: ['Spaces', 'Spaces'], board: ['Board', 'Board'], plan: ['Plan', 'Plán'],
  today: ['Today', 'Dnes'], tomorrow: ['Tomorrow', 'Zítra'], yesterday: ['Yesterday', 'Včera'],
  ofDone: ['{0} of {1} done', '{0} z {1} hotovo'], nothingToday: ['Nothing planned', 'Nic v plánu'],
  to: ['to {0}', 'do {0}'], now: ['now', 'teď'], until: ['until {0}', 'do {0}'], left: ['left today', 'zbývá dnes'],
  allDone: ['All done', 'Hotovo'], freeDay: ['Free day', 'Volný den'], done: ['Done', 'Hotovo'],
  then: ['Then', 'Pak'], nothingElse: ['Nothing else today', 'Dnes už nic dalšího'],
  addForToday: ['Add something for today', 'Přidej něco na dnešek'],
  thisWeek: ['this week', 'tento týden'], deadlineIn: ['deadline in', 'deadline za'], days: ['days', 'dní'], day1: ['day', 'den'],
  open: ['open', 'otevřené'], tasks: ['tasks', 'úkoly'], streak: ['Streak', 'Série'], week: ['Week', 'Týden'], weekDone: ['done', 'hotovo'],
  newCard: ['New card', 'Nová karta'], newCardSub: ['habit or project', 'návyk nebo projekt'],
  quiet: ['{0} is quiet for {1} days.', '{0} je {1} dny potichu.'], tenMin: ['10 min today?', '10 minut dnes?'], addIt: ['Add', 'Přidat'],
  weekReview: ['Your week', 'Tvůj týden'], weekReviewSub: ['Sunday look back · tap', 'Nedělní ohlédnutí · klepni'],
  deck: ['Deck', 'Karty'], list: ['List', 'Seznam'], all: ['All', 'Vše'], habits: ['Habits', 'Návyky'], projects: ['Projects', 'Projekty'],
  habit: ['Habit', 'Návyk'], project: ['Project', 'Projekt'], everyDay: ['every day', 'každý den'], weekdays: ['weekdays', 'všední dny'], everyWeek: ['every week', 'každý týden'],
  nextStep: ['Next step', 'Další krok'], noTasksYet: ['No tasks yet. What is the first small step?', 'Zatím žádné úkoly. Jaký je první malý krok?'],
  moments: ['Moments', 'Momenty'], openCard: ['Open card', 'Otevřít kartu'], noDeadline: ['no deadline', 'bez deadlinu'],
  deadline: ['Deadline', 'Deadline'], daysLeft: ['{0} days', '{0} dní'], dueToday: ['today', 'dnes'], overdueBy: ['{0} days late', '{0} dní po'],
  setDeadline: ['+ Set', '+ Nastavit'], openOf: ['Open', 'Otevřené'], of: ['of', 'z'],
  whenAdd: ['+ when', '+ kdy'], addTask: ['Add a task', 'Přidat úkol'], noted: ['Aurora noticed', 'Aurora si všimla'],
  noDayTasks: ['{0} tasks have no day. Give them one this week?', '{0} úkoly nemají den. Dáš jim ho tento týden?'],
  noDayTask1: ['1 task has no day. Give it one this week?', '1 úkol nemá den. Dáš mu ho tento týden?'],
  pickDay: ['Pick day', 'Vybrat den'], note: ['Note', 'Poznámka'], notePh: ['What is this card about?', 'O čem je tahle karta?'],
  showDone: ['{0} done', '{0} hotovo'], hideDone: ['Hide done', 'Skrýt hotové'],
  thisWeekCap: ['This week', 'Tento týden'], ofTheWeek: ['of the week', 'týdne'], best: ['best {0}', 'nejlépe {0}'],
  rhythm: ['Rhythm · 4 weeks', 'Rytmus · 4 týdny'], less: ['less', 'méně'], more: ['more', 'více'], bestDay: ['Best day {0}.', 'Nejlepší den {0}.'],
  goodDays: ['{0} good days this week.', '{0} dobré dny tento týden.'], month: ['month', 'měsíc'], tapDayHint: ['Tap a day to mark it.', 'Klepni na den a označ ho.'],
  todayCap: ['Today', 'Dnes'], noTodayCard: ['Nothing for today in this card.', 'V téhle kartě dnes nic.'], addToday: ['+ Add for today', '+ Přidat na dnešek'],
  search: ['Search', 'Hledat'], searchPh: ['Search notes', 'Hledat v poznámkách'], noCard: ['No card', 'Bez karty'],
  boardEmpty: ['Nothing captured yet. Add a photo, video or note.', 'Zatím nic. Přidej fotku, video nebo poznámku.'], capture: ['Capture', 'Zachytit'],
  pin: ['Pin', 'Připnout'], unpin: ['Unpin', 'Odepnout'], toCard: ['To card', 'Do karty'], edit: ['Edit', 'Upravit'], del: ['Delete', 'Smazat'],
  deleted: ['Deleted', 'Smazáno'], undo: ['Undo', 'Zpět'], saved: ['Saved', 'Uloženo'],
  leftN: ['{0} left', 'zbývá {0}'], anyTime: ['any time', 'kdykoli'], any: ['any', '—'], addTo: ['Add to {0}', 'Přidat na {0}'],
  noDayYet: ['No day yet', 'Bez dne'], fromCards: ['from your cards', 'z tvých karet'], dragHint: ['Drag onto a day above, or tap for “when”.', 'Přetáhni na den nahoře, nebo klepni pro „kdy“.'],
  overdue: ['From before', 'Z dřívějška'], emptyDay: ['Nothing on this day yet.', 'Na tento den zatím nic.'],
  doneOfDay: ['{0} of {1} done', '{0} z {1} hotovo'], openDay: ['Open day', 'Otevřít den'], deadlineLeg: ['deadline', 'deadline'], moreDone: ['more done', 'víc hotovo'],
  settings: ['Settings', 'Nastavení'], savedLocal: ['Saved on this phone', 'Uloženo v tomto telefonu'], yourName: ['Your name', 'Tvoje jméno'],
  look: ['Look', 'Vzhled'], appearance: ['Appearance', 'Vzhled'], glass: ['Glass', 'Sklo'], solid: ['Solid', 'Plné'],
  homeCap: ['Home', 'Home'], nudges: ['Helpful nudges', 'Nápovědy'], nudgesSub: ['when a habit goes quiet', 'když návyk utichne'],
  weekly: ['Sunday: Your week', 'Neděle: Tvůj týden'], weeklySub: ['a look back on Home', 'ohlédnutí na Home'],
  general: ['General', 'Obecné'], language: ['Language', 'Jazyk'], tutorial: ['Video manual', 'Video manuál'], install: ['Add to Home Screen', 'Přidat na plochu'],
  importOld: ['Import from Aurora', 'Import ze staré Aurory'], importOldSub: ['cards, plan and board from the current app', 'karty, plán a board ze současné appky'],
  data: ['Data', 'Data'], backup: ['Export backup', 'Exportovat zálohu'], restore: ['Restore backup', 'Obnovit zálohu'],
  sample: ['Load sample data', 'Nahrát ukázková data'], deleteAll: ['Delete all data', 'Smazat všechna data'],
  sureDel: ['Delete everything on this phone? This cannot be undone.', 'Smazat vše v tomto telefonu? Nejde to vrátit.'],
  sureSample: ['Replace your data with sample data?', 'Nahradit tvoje data ukázkovými?'],
  cancel: ['Cancel', 'Zrušit'], save: ['Save', 'Uložit'], newT: ['New', 'Nové'], close: ['Close', 'Zavřít'], yes: ['Yes', 'Ano'],
  wallpaper: ['Wallpaper', 'Tapeta'], surfaces: ['Buttons and panels', 'Tlačítka a panely'], aura: ['Color glow', 'Barevná záře'], auraSub: ['card colors behind the glass', 'barvy karet za sklem'],
  photo: ['Photo', 'Fotka'], ownPhoto: ['+ Photo', '+ Fotka'], dim: ['Dim background', 'Ztmavení pozadí'],
  planT: ['Plan', 'Plán'], noteT: ['Note', 'Poznámka'], photoT: ['Photo', 'Foto'],
  whatPh: ['What do you want to do?', 'Co chceš udělat?'], notePh2: ['Write a note…', 'Napiš poznámku…'], captionPh: ['Caption (optional)', 'Popisek (nepovinné)'],
  cardSuggest: ['Card · Aurora suggests', 'Karta · Aurora navrhuje'], cardCap: ['Card', 'Karta'], when: ['When', 'Kdy'], time: ['Time', 'Čas'], noDay: ['No day', 'Bez dne'],
  repeat: ['Repeat', 'Opakovat'], off: ['Off', 'Ne'], daily: ['Every day', 'Každý den'], wkdays: ['Weekdays', 'Všední dny'], weeklyR: ['Weekly', 'Týdně'],
  landsPlan: ['Lands in Plan on <b>{0}</b> and on Home that day.', 'Padne do Plánu na <b>{0}</b> a ten den na Home.'],
  landsRepeat: ['Repeats <b>{0}</b>. Shows on Home each time.', 'Opakuje se <b>{0}</b>. Ukáže se na Home pokaždé.'],
  landsNoDay: ['No day yet. It waits in Plan under “No day yet”.', 'Zatím bez dne. Počká v Plánu v „Bez dne“.'],
  landsBoard: ['Goes to Board{0}.', 'Půjde na Board{0}.'], inCard: [' and into {0}', ' a do karty {0}'],
  choosePhoto: ['Take or choose photo / video', 'Vyfotit nebo vybrat fotku / video'], change: ['Change', 'Změnit'],
  editItem: ['Edit', 'Upravit'], title: ['Title', 'Název'], deleteItem: ['Delete', 'Smazat'], markDone: ['Mark done', 'Označit hotové'], markUndone: ['Mark not done', 'Vrátit jako nehotové'],
  cardName: ['Name', 'Název'], cardNamePh: ['e.g. Learning, Studio Lumen', 'např. UČIT SE, Studio Lumen'], type: ['Type', 'Typ'], color: ['Color', 'Barva'],
  editCard: ['Edit card', 'Upravit kartu'], deleteCard: ['Delete card', 'Smazat kartu'], sureCard: ['Delete this card? Its tasks and moments stay without a card.', 'Smazat kartu? Úkoly a momenty zůstanou bez karty.'],
  cardNote: ['Description', 'Popis'], deadlineOpt: ['Deadline (optional)', 'Deadline (nepovinné)'], clear: ['Clear', 'Smazat'],
  welcomeT: ['Your day,<br>in one place.', 'Tvůj den<br>na jednom místě.'], welcomeP: ['Cards for what matters, a plan for when, a board for what you saw. Everything stays on this phone.', 'Karty pro to, na čem záleží, plán pro kdy a board pro to, co jsi viděl. Všechno zůstává v telefonu.'],
  startSample: ['Start with an example', 'Začít s ukázkou'], startEmpty: ['Start empty', 'Začít prázdné'], watchTour: ['Watch the 1-minute tour', 'Pustit 1minutovou prohlídku'],
  namePh: ['What should Aurora call you?', 'Jak ti má Aurora říkat?'],
  installT: ['Add Aurora to your Home Screen', 'Přidej Auroru na plochu'],
  installP: ['1. In Safari tap <b>Share</b> (square with arrow).<br>2. Choose <b>Add to Home Screen</b>.<br>3. Tap <b>Add</b>. Aurora then opens full screen like an app and works offline.', '1. V Safari klepni na <b>Sdílet</b> (čtverec se šipkou).<br>2. Vyber <b>Přidat na plochu</b>.<br>3. Klepni na <b>Přidat</b>. Aurora se pak otevírá přes celý displej jako appka a funguje i offline.'],
  installed: ['Already on your Home Screen', 'Už je na ploše'],
  imported: ['Imported {0} cards, {1} items, {2} moments', 'Importováno: {0} karet, {1} položek, {2} momentů'], nothingImport: ['Nothing to import found', 'Nic k importu'],
  restored: ['Backup restored', 'Záloha obnovena'], badFile: ['This file is not an Aurora backup', 'Tohle není záloha Aurory'],
  exported: ['Backup saved', 'Záloha uložena'], updateReady: ['New version ready', 'Nová verze připravena'], reload: ['Reload', 'Načíst'],
  tooBig: ['Video is too big (max 60 MB)', 'Video je moc velké (max 60 MB)'],
  wkSummary: ['{0} things done this week', 'Tento týden hotovo: {0}'], planNext: ['Plan next week', 'Naplánovat další týden'],
  perCard: ['By card', 'Podle karet'], noneYet: ['Nothing checked off yet. This page fills up as you go.', 'Zatím nic odškrtnuto. Stránka se plní postupně.'],
  peekAt: ['{0} · {1}', '{0} · {1}'], ver: ['Aurora Glass {0} · test build', 'Aurora Glass {0} · testovací verze'],
  dragTo: ['Moved to {0}', 'Přesunuto na {0}'], pickCard: ['Move to card', 'Přesunout do karty'],
  photoAdded: ['Added to Board', 'Přidáno na Board'], noteAdded: ['Note added', 'Poznámka přidána'], planned: ['Planned · {0}', 'Naplánováno · {0}'],
  undated: ['Saved · no day yet', 'Uloženo · zatím bez dne'], cardCreated: ['Card created', 'Karta vytvořena'],
  completed: ['Done · {0}', 'Hotovo · {0}'], reopened: ['Back to open', 'Zpět mezi otevřené'],
  addCard: ['+ New card', '+ Nová karta'], cards: ['cards', 'karet'], items0: ['No items', 'Žádné položky'],
  cardsEmpty: ['No cards yet. A card is a habit you keep or a project you finish.', 'Zatím žádné karty. Karta je návyk, který držíš, nebo projekt, který dotáhneš.'],
  tapToPeek: ['Tap an arc to peek', 'Klepni na oblouk'], notToday: ['Nothing timed today', 'Dnes nic na čas'],
  homeEmptyT: ['Plan your first thing', 'Naplánuj první věc'], replaceQ: ['Replace current data?', 'Nahradit současná data?'],
  wallAurora: ['Aurora', 'Aurora'], wallEmber: ['Ember', 'Žhar'], wallNight: ['Night', 'Noc'],
  tour: ['Tour', 'Prohlídka'], lang_en: ['English', 'English'], lang_cs: ['Čeština', 'Čeština'],
};
const WD = { en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] };
const WD1 = { en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], cs: ['P', 'Ú', 'S', 'Č', 'P', 'S', 'N'] };
const MON = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], cs: ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'] };
function t(k, ...a) { const e = L[k]; let s = e ? e[S && S.lang === 'cs' ? 1 : 0] : k; a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); }); return s; }
const lang = () => (S && S.lang) || 'en';
function dayShort(s) { return WD[lang()][dow(s)] + ' ' + dOf(s).getDate(); }
function dayName(s) { const d = daysBetween(T(), s); if (d === 0) return t('today'); if (d === 1) return t('tomorrow'); if (d === -1) return t('yesterday'); return dayShort(s); }
function dayFull(s) { return dayName(s) + (Math.abs(daysBetween(T(), s)) <= 1 ? ' · ' + dayShort(s) : ''); }
function plural(n, one, many) { return n === 1 ? one : many; }

/* ---------- storage ---------- */
const DB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('aurora-glass', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('media')) d.createObjectStore('media'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (st, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const x = d.transaction(st, mode); const q = fn(x.objectStore(st)); x.oncomplete = () => res(q && q.result); x.onerror = () => rej(x.error); x.onabort = () => rej(x.error); }); };
  return {
    get: (st, k) => tx(st, 'readonly', s => s.get(k)),
    set: (st, k, v) => tx(st, 'readwrite', s => s.put(v, k)),
    del: (st, k) => tx(st, 'readwrite', s => s.delete(k)),
    keys: st => tx(st, 'readonly', s => s.getAllKeys()),
    clear: st => tx(st, 'readwrite', s => s.clear()),
  };
})();
let S = null;
let saveT = null, saveFails = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    try { await DB.set('kv', 'state', JSON.parse(JSON.stringify(S))); saveFails = 0; }
    catch (e) { saveFails++; try { localStorage.setItem('aurora-glass-state', JSON.stringify(S)); } catch (_) {} }
  }, 120);
}
async function loadState() {
  try { const v = await DB.get('kv', 'state'); if (v) return v; } catch (e) {}
  try { const v = localStorage.getItem('aurora-glass-state'); if (v) return JSON.parse(v); } catch (e) {}
  return null;
}
function blankState() {
  const cs = (navigator.language || '').toLowerCase().startsWith('cs') || (navigator.language || '').toLowerCase().startsWith('sk');
  return { v: 1, name: '', lang: cs ? 'cs' : 'en', nudges: true, weekly: true, wall: 'aurora', wallKey: null, surface: 'glass', aura: true, dim: 22, cards: [], items: [], moments: [], onboarded: false, lastCard: null, created: T() };
}
function migrate(s) {
  const b = blankState();
  const o = Object.assign(b, s || {});
  o.cards = (o.cards || []).filter(Boolean); o.items = (o.items || []).filter(Boolean); o.moments = (o.moments || []).filter(Boolean);
  o.items.forEach(i => { if (i.repeat && !Array.isArray(i.doneDates)) i.doneDates = []; });
  return o;
}

/* ---------- media ---------- */
const MEDIA_URL = new Map();
async function putMedia(blob) { const k = 'm' + uid(); await DB.set('media', k, blob); MEDIA_URL.set(k, URL.createObjectURL(blob)); return k; }
async function mediaURL(k) {
  if (!k) return '';
  if (MEDIA_URL.has(k)) return MEDIA_URL.get(k);
  try { const b = await DB.get('media', k); if (!b) return ''; const u = URL.createObjectURL(b); MEDIA_URL.set(k, u); return u; } catch (e) { return ''; }
}
const mediaNow = k => MEDIA_URL.get(k) || '';
async function warmMedia() { const ks = new Set(); S.moments.forEach(m => m.img && ks.add(m.img)); if (S.wallKey) ks.add(S.wallKey); await Promise.all([...ks].map(mediaURL)); }
async function delMedia(k) { if (!k) return; try { await DB.del('media', k); } catch (e) {} const u = MEDIA_URL.get(k); if (u) URL.revokeObjectURL(u); MEDIA_URL.delete(k); }
async function compressImage(file, max = 1800) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
    return b && b.size < file.size ? b : file;
  } catch (e) { return file; }
}
function imgRatio(blob) { return new Promise(res => { const u = URL.createObjectURL(blob); const i = new Image(); i.onload = () => { res(i.naturalHeight / i.naturalWidth || 1); URL.revokeObjectURL(u); }; i.onerror = () => { res(1); URL.revokeObjectURL(u); }; i.src = u; }); }
function vidInfo(blob) { return new Promise(res => { const u = URL.createObjectURL(blob); const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.onloadedmetadata = () => { res({ r: v.videoHeight && v.videoWidth ? v.videoHeight / v.videoWidth : 1.3, dur: v.duration || 0 }); URL.revokeObjectURL(u); }; v.onerror = () => { res({ r: 1.3, dur: 0 }); URL.revokeObjectURL(u); }; v.src = u; }); }

/* ---------- model ---------- */
const COLORS = ['#3fbf7f', '#f0a44b', '#6f8cff', '#ff5c9a', '#b08cff', '#4cc9d9', '#e8c547', '#9fb3c4'];
const cardById = id => S.cards.find(c => c.id === id);
const cardColor = id => (cardById(id) || {}).color || '#9fb3c4';
const itemById = id => S.items.find(i => i.id === id);
function occurs(i, d) {
  if (!i.repeat) return i.date === d;
  const start = i.date || i.created || '2000-01-01';
  if (d < start) return false;
  if (i.repeat === 'weekdays') return dow(d) < 5;
  if (i.repeat === 'weekly') return dow(d) === dow(start);
  return true;
}
const isDone = (i, d) => i.repeat ? (i.doneDates || []).includes(d) : !!i.done;
function itemsOn(d) {
  return S.items.filter(i => occurs(i, d)).sort((a, b) => {
    const ta = tmin(a.time), tb = tmin(b.time);
    if (ta != null && tb != null) return ta - tb;
    if (ta != null) return -1; if (tb != null) return 1;
    return (a.created || '').localeCompare(b.created || '');
  });
}
const overdueItems = () => S.items.filter(i => !i.repeat && i.date && i.date < T() && !i.done).sort((a, b) => a.date.localeCompare(b.date));
const undatedItems = () => S.items.filter(i => !i.repeat && !i.date && !i.done);
function todayList() { const d = T(); return [...overdueItems(), ...itemsOn(d)]; }
function setDone(i, d, val) {
  if (i.repeat) {
    i.doneDates = i.doneDates || [];
    const has = i.doneDates.includes(d);
    if (val && !has) i.doneDates.push(d);
    if (!val && has) i.doneDates = i.doneDates.filter(x => x !== d);
  } else { i.done = !!val; i.doneOn = val ? T() : null; }
  save();
}
function completionsOn(d, cardId) {
  let n = 0;
  for (const i of S.items) {
    if (cardId !== undefined && i.card !== cardId) continue;
    if (i.repeat) { if ((i.doneDates || []).includes(d)) n++; }
    else if (i.done && i.doneOn === d) n++;
  }
  return n;
}
function cardDaySet(cardId) {
  const s = new Set();
  for (const i of S.items) {
    if (i.card !== cardId) continue;
    if (i.repeat) (i.doneDates || []).forEach(x => s.add(x));
    else if (i.done && i.doneOn) s.add(i.doneOn);
  }
  return s;
}
function weekDays(d = T()) { const w = weekStart(d); return [0, 1, 2, 3, 4, 5, 6].map(k => addD(w, k)); }
function habitWeek(cardId) { const s = cardDaySet(cardId); return weekDays().map(x => s.has(x)); }
function streakOf(cardId) {
  const s = cardDaySet(cardId); let d = T(); if (!s.has(d)) d = addD(d, -1);
  let n = 0; while (s.has(d)) { n++; d = addD(d, -1); } return n;
}
function bestStreak(cardId) {
  const s = [...cardDaySet(cardId)].sort(); let best = 0, cur = 0, prev = null;
  for (const d of s) { cur = prev && daysBetween(prev, d) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}
function monthCount(cardId) { const m = T().slice(0, 7); return [...cardDaySet(cardId)].filter(d => d.startsWith(m)).length; }
function cardItems(cardId) { return S.items.filter(i => i.card === cardId); }
function projectStats(cardId) {
  const its = cardItems(cardId).filter(i => !i.repeat);
  const open = its.filter(i => !i.done);
  const next = open.slice().sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (tmin(a.time) ?? 9999) - (tmin(b.time) ?? 9999))[0] || null;
  return { total: its.length, open: open.length, done: its.length - open.length, next, noDay: open.filter(i => !i.date).length };
}
function cardMoments(cardId) { return S.moments.filter(m => m.card === cardId).sort((a, b) => (b.d || '').localeCompare(a.d || '') || (b.ts || 0) - (a.ts || 0)); }
function lastActive(cardId) { const s = [...cardDaySet(cardId)].sort(); return s.length ? s[s.length - 1] : null; }
function itemSub(i, withCard = true) {
  const p = [];
  if (withCard && i.card && cardById(i.card)) p.push(cardById(i.card).name);
  if (i.repeat) p.push(i.repeat === 'weekdays' ? t('weekdays') : i.repeat === 'weekly' ? t('everyWeek') : t('everyDay'));
  return p.join(' · ');
}
function whenLabel(i) {
  if (i.repeat) return (i.time ? i.time + ' · ' : '') + (i.repeat === 'weekdays' ? t('weekdays') : i.repeat === 'weekly' ? t('everyWeek') : t('everyDay'));
  if (!i.date) return '';
  return dayName(i.date) + (i.time ? ' ' + i.time : '');
}

/* ---------- natural language when ---------- */
const NL = (() => {
  const B = '(?<![\\p{L}\\d])', E = '(?![\\p{L}\\d])';
  const days = [
    ['pondělí|pondeli|monday', 0], ['úterý|utery|tuesday', 1], ['středa|středu|streda|stredu|wednesday', 2], ['čtvrtek|ctvrtek|thursday', 3],
    ['pátek|patek|friday', 4], ['sobota|sobotu|saturday', 5], ['neděle|neděli|nedele|nedeli|sunday', 6]];
  return function parse(text) {
    const out = { date: null, time: null, repeat: null, spans: [] };
    if (!text) return out;
    const take = (re, fn) => { const m = new RegExp(B + '(?:' + re + ')' + E, 'iu').exec(text); if (m) { const r = fn(m); if (r !== false) out.spans.push([m.index, m.index + m[0].length]); } return m; };
    take('každý den|kazdy den|denně|denne|every day|daily', () => { out.repeat = 'daily'; });
    if (!out.repeat) take('všední dny|vsedni dny|ve všední dny|weekdays|every weekday', () => { out.repeat = 'weekdays'; });
    if (!out.repeat) take('každý týden|kazdy tyden|every week|weekly', () => { out.repeat = 'weekly'; });
    take('pozítří|pozitri|day after tomorrow', () => { out.date = addD(T(), 2); }) ||
    take('zítra|zitra|tomorrow|tmrw', () => { out.date = addD(T(), 1); }) ||
    take('dnes|dneska|today|tonight|večer|vecer', m => { out.date = T(); if (/večer|vecer|tonight/i.test(m[0]) && !out.time) out.time = '19:00'; });
    if (!out.date) {
      for (const [re, k] of days) {
        const m = take('(?:v |ve |on |next |příští |pristi )?(?:' + re + ')', () => {
          let d = T(); let n = (k - dow(d) + 7) % 7; if (n === 0) n = 7; out.date = addD(d, n);
        });
        if (m) break;
      }
    }
    take('(?:v|ve|at|o|@)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|h|hod)?', m => {
      let h = +m[1], mi = +(m[2] || 0); const ap = (m[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
      if (h > 23 || mi > 59) return false;
      out.time = pad(h) + ':' + pad(mi);
    }) || take('(\\d{1,2})[:](\\d{2})', m => { const h = +m[1], mi = +m[2]; if (h > 23 || mi > 59) return false; out.time = pad(h) + ':' + pad(mi); });
    if (out.time && !out.date && !out.repeat) out.date = T();
    out.spans.sort((a, b) => a[0] - b[0]);
    return out;
  };
})();
function stripSpans(text, spans) {
  let s = text; [...spans].sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { s = s.slice(0, a) + s.slice(b); });
  return s.replace(/\s{2,}/g, ' ').replace(/\s+([,.;!?])/g, '$1').replace(/^[\s,;\-–—]+|[\s,;\-–—]+$/g, '').trim();
}

/* ---------- sample data ---------- */
const ART = {
  alps: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d95d8"/><stop offset=".6" stop-color="#f2c6a0"/><stop offset="1" stop-color="#f6dcc0"/></linearGradient></defs><rect width="600" height="800" fill="url(#s)"/><circle cx="440" cy="260" r="56" fill="#fff4dc" opacity=".9"/><path d="M0 520 L130 330 L215 430 L330 240 L475 445 L600 345 V800 H0z" fill="#5b6f9e"/><path d="M330 240 L290 302 L318 296 L344 326 L372 290z M130 330 L102 372 L138 360 L158 380z" fill="#fff"/><path d="M0 600 L170 490 L315 565 L480 470 L600 528 V800 H0z" fill="#33456f"/><rect x="240" y="555" width="124" height="76" rx="6" fill="#f3ead8"/><path d="M226 562 L302 512 L378 562z" fill="#8a4b3a"/><rect x="266" y="580" width="20" height="20" fill="#f0a44b"/><rect x="316" y="580" width="20" height="20" fill="#f0a44b"/></svg>',
  cafe: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><radialGradient id="c" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#6b4430"/><stop offset="1" stop-color="#1e1612"/></radialGradient></defs><rect width="600" height="600" fill="url(#c)"/><circle cx="300" cy="300" r="190" fill="#efe6d6"/><circle cx="300" cy="300" r="150" fill="#7a4a2c"/><path d="M232 288 q68 -88 136 0 q-68 60 -136 0z" fill="#e9c9a3" opacity=".9"/><circle cx="510" cy="110" r="90" fill="#f0a44b" opacity=".35"/></svg>',
  sketch: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700"><rect width="600" height="700" fill="#efe6d6"/><g fill="none" stroke="#13233a" stroke-width="10" stroke-linecap="round"><circle cx="300" cy="300" r="136"/><path d="M260 226 V370 H350"/></g><g fill="none" stroke="#13233a" stroke-width="3" opacity=".35"><circle cx="300" cy="300" r="170"/><path d="M100 300 H500 M300 100 V500"/></g><rect x="130" y="560" width="76" height="76" rx="14" fill="#f3ead8" stroke="#13233a" stroke-opacity=".2" stroke-width="3"/><rect x="226" y="560" width="76" height="76" rx="14" fill="#13233a"/><rect x="322" y="560" width="76" height="76" rx="14" fill="#f0a44b"/></svg>',
  notes: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760"><rect width="600" height="760" fill="#f4f1ea"/><g stroke="#9fb3c4" stroke-width="3">' + Array.from({ length: 11 }, (_, k) => '<path d="M48 ' + (130 + k * 60) + ' H552"/>').join('') + '</g><path d="M104 0 V760" stroke="#e8a0a0" stroke-width="4"/><g fill="none" stroke="#13233a" stroke-width="7" stroke-linecap="round" opacity=".75"><path d="M140 172 q34 -26 68 0 t68 0 t68 0"/><path d="M140 232 q48 -20 96 0 t96 0"/><path d="M140 352 q34 -26 68 0 t68 0 t68 0 t68 0"/><path d="M140 412 q40 -20 80 0"/><path d="M140 532 q34 -26 68 0 t68 0 t68 0"/></g><circle cx="440" cy="226" r="48" fill="none" stroke="#3fbf7f" stroke-width="8"/></svg>',
};
async function sampleState(base) {
  const s = Object.assign(blankState(), base || {});
  const d = T();
  const c = (id, name, type, color, extra = {}) => Object.assign({ id, name, type, color, note: '', created: addD(d, -40) }, extra);
  s.cards = [
    c('ucit', 'UČIT SE', 'habit', '#3fbf7f', { note: s.lang === 'cs' ? 'Hodina denně, kapitola po kapitole.' : 'An hour a day, chapter by chapter.' }),
    c('lumen', 'Lumen', 'project', '#f0a44b', { deadline: addD(d, 7), note: s.lang === 'cs' ? 'Vizuál pro kavárnu, logo a menu.' : 'Visual identity for a café: logo and menu.' }),
    c('health', 'Health', 'habit', '#6f8cff', { note: s.lang === 'cs' ? 'Pohyb každý den, aspoň 30 minut.' : 'Move every day, at least 30 minutes.' }),
    c('night', 'Night drive', 'project', '#ff5c9a', { note: s.lang === 'cs' ? 'Krátký film o nočním městě.' : 'A short film about the city at night.' }),
  ];
  const hist = (seed, p) => { const a = []; for (let k = 1; k <= 60; k++) { const r = ((k * 7919 + seed) % 100) / 100; if (r < p) a.push(addD(d, -k)); } return a; };
  const it = (t2, card, extra = {}) => Object.assign({ id: uid(), t: t2, card, created: addD(d, -30) }, extra);
  const h = nowMin();
  const late = h > 19 * 60;
  const avail = Math.max(60, 24 * 60 - 15 - h);
  const q = m => Math.ceil(m / 5) * 5;
  const slot = (off) => mtime(clamp(late ? (off < 0 ? h - 120 : q(h + avail * ({40: .12, 100: .45, 190: .78}[off] || .5))) : Math.ceil((h + off) / 15) * 15, 6 * 60, 23 * 60 + 50));
  s.items = [
    it('Moodboard pro Lumen', 'lumen', { date: d, time: slot(-180), done: true, doneOn: d, dur: 60 }),
    it('Lekce 4 — grafy', 'ucit', { date: d, time: slot(40), dur: late ? Math.min(45, Math.round(avail * .25)) : 45 }),
    it('Trénink', 'health', { repeat: 'daily', time: slot(100), dur: late ? Math.min(60, Math.round(avail * .25)) : 60, doneDates: hist(3, .62), date: addD(d, -60) }),
    it('Nákup na víkend', null, { date: d, time: slot(190), dur: late ? Math.min(30, Math.round(avail * .15)) : 30 }),
    it('Zálohovat fotky', null, { date: d }),
    it('Číst 20 stran', 'ucit', { repeat: 'daily', doneDates: hist(11, .7), date: addD(d, -60) }),
    it('Poslat první skicu', 'lumen', { date: d }),
    it('Vybrat paletu', 'lumen', { date: addD(d, 1) }),
    it('Typografie titulku', 'lumen', {}),
    it('Menu — sazba', 'lumen', { date: addD(d, 5) }),
    it('Kickoff call', 'lumen', { date: addD(d, -3), done: true, doneOn: addD(d, -3) }),
    it('Test z kap. 3', 'ucit', {}),
    it('Scénář — 1. verze', 'night', { date: addD(d, 2), time: '10:00', dur: 90 }),
    it('Lokace: most a pumpa', 'night', {}),
    it('Natočit test světel', 'night', { date: addD(d, -1) }),
  ];
  const art = async (k, r) => { const b = new Blob([ART[k]], { type: 'image/svg+xml' }); const key = await putMedia(b); return { img: key, r }; };
  const now = Date.now();
  s.moments = [
    Object.assign({ id: uid(), kind: 'photo', card: null, note: s.lang === 'cs' ? 'Hotel v Alpách na jaro' : 'Hotel in the Alps for spring', d: addD(d, -1), pin: true, ts: now - 1e5 }, await art('alps', 1.33)),
    { id: uid(), kind: 'note', card: 'lumen', note: s.lang === 'cs' ? 'Paleta: krémová, tmavě modrá, oranžová' : 'Palette: cream, dark blue, orange', d: addD(d, -2), ts: now - 2e5 },
    Object.assign({ id: uid(), kind: 'photo', card: 'lumen', note: s.lang === 'cs' ? 'Lumen · skica loga' : 'Lumen · logo sketch', d: addD(d, -2), ts: now - 3e5 }, await art('sketch', 1.17)),
    Object.assign({ id: uid(), kind: 'photo', card: 'lumen', note: '', d: addD(d, -4), ts: now - 4e5 }, await art('cafe', 1)),
    { id: uid(), kind: 'note', card: 'ucit', note: s.lang === 'cs' ? 'Kapitola 3: shrnutí v 5 bodech, zítra zopakovat' : 'Chapter 3: summary in 5 points, review tomorrow', d: addD(d, -1), ts: now - 5e5 },
    Object.assign({ id: uid(), kind: 'photo', card: 'ucit', note: s.lang === 'cs' ? 'Výpisky z přednášky' : 'Lecture notes', d: addD(d, -3), ts: now - 6e5 }, await art('notes', 1.27)),
    { id: uid(), kind: 'note', card: 'night', note: s.lang === 'cs' ? 'Mokrý asfalt, teplá světla, žádný neon.' : 'Wet asphalt, warm lights, no neon.', d: addD(d, -5), ts: now - 7e5 },
  ];
  s.onboarded = true;
  return s;
}

/* ---------- import from Aurora v13 (same origin) ---------- */
async function oldAuroraExists() {
  try { if (!indexedDB.databases) return false; const l = await indexedDB.databases(); return l.some(x => x.name === 'aurora-v13'); } catch (e) { return false; }
}
async function readOldAurora() {
  if (!(await oldAuroraExists())) return null;
  const db = await new Promise((res, rej) => { const r = indexedDB.open('aurora-v13'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onupgradeneeded = () => { r.transaction.abort(); }; });
  try {
    if (!db.objectStoreNames.contains('kv')) return null;
    const get = (st, k) => new Promise((res) => { try { const x = db.transaction(st, 'readonly'); const q = x.objectStore(st).get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } });
    const st = await get('kv', 'state');
    if (!st || !Array.isArray(st.cards)) return null;
    const blobs = {};
    if (db.objectStoreNames.contains('images')) {
      for (const m of st.moments || []) if (typeof m.img === 'string' && m.img) { const b = await get('images', m.img); if (b) blobs[m.img] = b instanceof Blob ? b : (typeof b === 'string' && b.startsWith('data:') ? await (await fetch(b)).blob() : null); }
    }
    return { st, blobs };
  } finally { db.close(); }
}
async function importOld() {
  const r = await readOldAurora(); if (!r) return null;
  const { st, blobs } = r;
  const cards = (st.cards || []).map(c => ({ id: c.id || uid(), name: c.name || '—', type: c.type === 'habit' ? 'habit' : 'project', color: c.color || COLORS[0], deadline: c.deadline || null, note: Array.isArray(c.notes) ? c.notes.join('\n\n') : (c.note || ''), created: c.created || T() }));
  const items = (st.items || []).map(i => {
    const o = { id: i.id || uid(), t: i.t || i.title || '—', card: i.card || null, created: i.created || T() };
    if (i.date) o.date = i.date; if (i.time) o.time = i.time;
    if (i.repeat) { o.repeat = i.repeatRule === 'weekly' ? 'weekly' : 'daily'; o.doneDates = Array.isArray(i.doneDates) ? i.doneDates.slice() : []; }
    else { o.done = !!i.done; o.doneOn = i.done ? (i.doneOn || i.date || T()) : null; }
    return o;
  });
  const moments = [];
  for (const m of st.moments || []) {
    const o = { id: m.id || uid(), card: m.card || null, note: m.note || '', d: m.d || T(), pin: !!m.pin, ts: Date.now() - moments.length * 1000 };
    const b = typeof m.img === 'string' ? blobs[m.img] : null;
    if (b) { o.img = await putMedia(b); const vid = m.video || m.kind === 'video' || (b.type || '').startsWith('video/'); o.kind = vid ? 'video' : 'photo'; o.r = vid ? (await vidInfo(b)).r : await imgRatio(b); }
    else if (o.note) o.kind = 'note'; else continue;
    moments.push(o);
  }
  return { cards, items, moments, name: st.name || '' };
}

/* ---------- backup ---------- */
async function exportBackup() {
  const media = {};
  const keys = new Set(S.moments.map(m => m.img).filter(Boolean)); if (S.wallKey) keys.add(S.wallKey);
  for (const k of keys) { try { const b = await DB.get('media', k); if (b) media[k] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) {} }
  const data = { app: 'aurora-glass', v: 1, exported: new Date().toISOString(), state: S, media };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const name = 'aurora-backup-' + T() + '.json';
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return true; } catch (e) { if (e.name === 'AbortError') return false; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return true;
}
async function restoreBackup(file) {
  const txt = await file.text(); const data = JSON.parse(txt);
  if (!data || data.app !== 'aurora-glass' || !data.state) throw new Error('bad');
  await DB.clear('media'); MEDIA_URL.clear();
  for (const [k, u] of Object.entries(data.media || {})) { const b = await (await fetch(u)).blob(); await DB.set('media', k, b); }
  S = migrate(data.state); S.onboarded = true; save(); await warmMedia();
}
