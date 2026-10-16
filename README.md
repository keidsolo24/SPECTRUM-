# Aurora Glass · testovací verze

Celá Aurora v novém stylu (Liquid Glass + krémová, tmavomodré panely a Bricolage 800 ze staré Aurory). Běží jako PWA, funguje offline a data zůstávají v telefonu.

**Adresa:** https://keidsolo24.github.io/SPECTRUM-/glass/

## Na iPhone
1. Otevři adresu v Safari.
2. Sdílet → **Přidat na plochu** → Přidat.
3. Aurora se otevírá přes celý displej jako appka.

## Co umí
- **Home · Přístroj:** jen to podstatné. Ciferník dne 06–24, koule s odpočtem, Hotovo a krátký seznam Pak (max 3, zbytek v Plánu).
- **Spaces:** karty jako balíček nebo seznam, filtr návyky/projekty, nová karta.
- **Karta:** návyk (týden, série, měsíc, rytmus; klepnutím označíš den) nebo projekt (otevřené, deadline, další krok); úkoly, momenty, poznámka, úprava a smazání.
- **Board:** fotky a videa z galerie nebo foťáku, poznámky, filtr podle karty, hledání. Prohlížeč vždy přes celý displej, **dvojklep = původní velikost**, klepnutí schová ovládání, swipe do stran další, dolů zavřít. Připnout, do karty, upravit, smazat.
- **Plán:** den jako osa s „teď“, týden jako 7 sloupců na ose 06–24, měsíc, bez dne (přetažením na den).
- **+:** plán / poznámka / foto. Rozumí „zítra v 10“, „v pátek“, „každý den“.
- **Nastavení:** jméno, vzhled (tapeta, sklo/plné, ztmavení), nápovědy, nedělní týden, jazyk CZ/EN, video manuál, přidat na plochu, import ze staré Aurory, záloha a obnova, ukázková data, smazání.

## Vzhled a chování
Matné sklo bez lesku, bez barevné záře za obrazovkou (jen tapeta). Pevná hlavička nahoře, obsah projíždí pod ní, dole pevná lišta. Žádné zoomování ani posouvání celé stránky.

## Video manuál
`tutorial.mp4` (20 s) se pustí z úvodní obrazovky nebo v Nastavení → Video manuál.

## Nahrání na GitHub
1. github.com/keidsolo24/SPECTRUM- → **Add file → Upload files**.
2. Přetáhni celou složku `glass` (z rozbaleného zipu) a dej **Commit changes**.
3. Za 1–2 minuty běží na https://keidsolo24.github.io/SPECTRUM-/glass/

## Data
Ukládá se do IndexedDB `aurora-glass` v telefonu. Stará Aurora (`aurora-v13`) zůstává nedotčená. Import z ní jen čte.
Záloha: Nastavení → Exportovat zálohu (JSON s fotkami).

## Soubory
`index.html`, `app.css`, `js/` (core, ui, screens, sheets, app), `sw.js` (offline), `manifest.webmanifest`, `tutorial.mp4` (video manuál), `fonts/`, ikony, tapeta.
