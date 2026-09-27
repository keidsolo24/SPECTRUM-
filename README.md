# AURORA 11

One look, built from the tutorial video. Dark / warm (spectrum) and Light / blue.

## Nasazeni (GitHub Pages)
Nahraj OBSAH teto slozky do repa (index.html v rootu, vedle icons/ a manifest.webmanifest). Build krok neni potreba.

## Data
Stejne uloziste jako predchozi verze (IndexedDB `aurora-test-local-v1`, SCHEMA 6) — data v telefonu zustanou.
Sync pres ucet (Supabase) funguje stejne jako drive (Settings → Account & sync).

## Uprava
Zdroje jsou v `source/` (app.html = logika, aurora.css = vzhled, glue.js = nove obrazovky, intro.js = intro).
Po zmene spust `python build.py` a nahraj novy index.html.
