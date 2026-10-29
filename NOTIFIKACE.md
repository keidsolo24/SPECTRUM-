# Notifikace pro Auroru · nastavení serveru

Webová appka na iPhonu si neumí sama naplánovat připomínku. Proto ji v daný čas pošle tvůj malý server na Cloudflare. Je zdarma a stačí ho nastavit jednou.

## 1. Účet
dash.cloudflare.com → Sign up. Stačí plán Free.

## 2. Worker
1. Vlevo **Compute (Workers) → Workers & Pages → Create → Create Worker**.
2. Název: `aurora-push` → **Deploy**.
3. **Edit code** → smaž všechno v `worker.js` → vlož celý obsah souboru `worker/aurora-push.js` → **Deploy**.

## 3. Úložiště (KV)
1. Vlevo **Storage & Databases → KV → Create** → název `aurora` → Add.
2. Zpátky ve Workeru `aurora-push` → **Settings → Bindings → Add → KV namespace**.
   - Variable name: `AURORA` (přesně takhle, velkými písmeny)
   - KV namespace: `aurora`
   - → **Save / Deploy**

## 4. Každou minutu (Cron)
Worker → **Settings → Triggers → Cron Triggers → Add** → `* * * * *` → Save.

## 5. Kontrola
Otevři adresu Workeru v prohlížeči, třeba `https://aurora-push.<tvuj-ucet>.workers.dev/key`. Musí ukázat `{"ok":true,"app":"aurora-push","key":"…"}`.

## 6. V Auroře (z ikony na ploše)
1. Nastavení → **Notifikace**.
2. Vlož adresu Workeru → **Uložit a ověřit**. Musí se ukázat „Server odpovídá“.
3. **Zapnout notifikace** → iPhone se zeptá → Povolit.
4. **Poslat zkušební notifikaci**. Do pár sekund přijde.

## Volitelně
Ve Workeru Settings → Variables přidej `ALLOWED_ORIGIN` = `https://keidsolo24.github.io`. Server pak bude přijímat požadavky jen z tvé Aurory.

## Když něco nejde
- **„Server neodpovídá“:** zkontroluj adresu a že je navázané KV jako `AURORA`.
- **Notifikace nechodí:** zkontroluj Cron `* * * * *`. Appku otevírej z ikony na ploše. V iPhonu Nastavení → Notifikace → Aurora musí být povoleno.
- **Zamítnul jsi povolení:** povol ho v Nastavení iPhonu → Notifikace → Aurora. Když tam Aurora není, smaž ikonu z plochy a přidej ji znovu.
- **Připomínky se plánují na 14 dní dopředu** a obnoví se při každém otevření appky.
