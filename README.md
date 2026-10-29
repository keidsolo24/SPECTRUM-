# Aurora Glass v15.1 · testovací verze

Aurora jako PWA pro iPhone. Funguje offline a data zůstávají v telefonu. Notifikace jdou přes tvůj vlastní malý server na Cloudflare.

**Adresa:** https://keidsolo24.github.io/SPECTRUM-/glass/

## Novinky ve v15
- **Nové přidávání („+“):** nahoře jsou 4 dlaždice (Kdy, Čas, Karta, Opakovat). Ťukneš a výběr se rozbalí pod nimi. Dole je seznam s řádky Délka a Připomenout.
  - Všechno jde vyťukat. Psaní je jen zkratka: „Trénink po st pá v 18 #health“ samo vyplní dny, čas i kartu.
- **Opakování ve vybrané dny:** Opakovat → Vybrané → zapneš P Ú S Č P S N. Psaním třeba „po st pá“, „každé út a čt“ nebo „o víkendech“.
- **Rychlý nápad:** na Boardu otevře „+“ rovnou Nápad. „Hodit“ nebo Enter nápad přidá, klávesnice zůstane otevřená a můžeš psát další.
- **Z nápadu plán:** otevřeš nápad a dáš **Naplánovat**. Nápad zůstane na Boardu se značkou „v plánu“.
- **Cíl u karty (návyk):** třeba „3× týdně“ místo „každý den“. Analýza karty počítá s cílem. Ťukni na „Cíl“ v kartě.
- **Úkol v kartě větou:** „test pá 14:00“, pod polem uvidíš, co appka pochopila.
- **Klávesnice opravená:** panel sedí těsně nad klávesnicí, nic neodskočí a po zavření nezůstane mezera.
- **Notifikace:** připomínky k položkám s časem (V čas / 10 min / 30 min / 1 h / Večer předem). Ťuk na notifikaci otevře tu věc.
- **Apple pravidla:** ✕ vlevo, větší plochy na ťuknutí, smazání s „Zpět“ místo dotazu.

## Na iPhone
1. Otevři adresu v Safari.
2. Sdílet → **Přidat na plochu** → Přidat.
3. Notifikace fungují **jen z ikony na ploše**, ne v Safari.

## Notifikace · jednorázové nastavení (asi 10 min)
Viz `NOTIFIKACE.md`. Zkráceně:
1. Účet zdarma na dash.cloudflare.com.
2. Workers & Pages → Create → Worker `aurora-push` → Deploy → Edit code → vlož `worker/aurora-push.js` → Deploy.
3. Storage & Databases → KV → Create `aurora`. Ve Workeru Settings → Bindings → KV namespace, proměnná **AURORA**.
4. Ve Workeru Settings → Triggers → Cron: `* * * * *`.
5. V Auroře Nastavení → Notifikace: vlož adresu Workeru → Uložit a ověřit → Zapnout notifikace.

## Nahrání na GitHub
1. github.com/keidsolo24/SPECTRUM- → **Add file → Upload files**.
2. Přetáhni obsah složky `glass` (z rozbaleného zipu) do složky `glass` a dej **Commit changes**. Složku `worker` na GitHub dávat nemusíš, ta patří do Cloudflare.
3. Za 1–2 minuty běží nová verze. Appka nabídne „Nová verze → Načíst“.

## Data
Ukládá se do IndexedDB `aurora-glass` v telefonu. Data z v13 zůstávají, v15 je načte a doplní.
Na server jde jen název, čas a karta nadcházejících položek s připomínkou (na 14 dní dopředu).

## Soubory
`index.html`, `app.css`, `js/` (core, ui, screens, sheets, push, app), `sw.js` (offline + notifikace), `manifest.webmanifest`, `tutorial.mp4`, `fonts/`, ikony, tapeta, `worker/aurora-push.js` (server pro Cloudflare).
