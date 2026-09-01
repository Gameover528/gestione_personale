# Gestione Personale

Spazio personale **modulare** per gestire diverse aree della vita quotidiana, in un'unica web app privata. Nessuna registrazione pubblica: è pensata per uso proprio (o di pochi familiari), con account creati a mano.

**App in produzione:** https://gestione-personale.personalmanage.workers.dev

---

## Cosa fa

- **Bollette**: registra bollette (luce, gas, acqua, internet, telefono, rifiuti...), scadenze, importi, stato pagamento, upload della ricevuta PDF, divisione della spesa con un'altra famiglia/persona, statistiche (spesa per tipo, andamento mensile).
- **Alimentazione**: diario dei pasti giorno per giorno, con ricerca alimenti (Open Food Facts + opzionale USDA), obiettivi nutrizionali personali (min/max su calorie, proteine, ecc.) e un **archivio personale di piatti**: possono essere ricette composte da più ingredienti (valori calcolati automaticamente) oppure piatti e prodotti con i valori dell'etichetta inseriti a mano; in entrambi i casi compaiono nei risultati di ricerca quando si aggiunge un pasto. Inoltre: **porzioni** ("1 piatto = 350 g", si registra per porzioni invece che in grammi), lista dei **recenti** con aggiunta in un tap, **copia dei pasti** da un altro giorno, pagina **Andamento** (calorie e macronutrienti su 7/30/90 giorni, medie e aderenza agli obiettivi) e **calcolo degli obiettivi** dai propri dati (Mifflin-St Jeor: peso, altezza, età, attività).

  La ricerca alimenti è in due fasi: i piatti personali (query locale) compaiono subito, Open Food Facts e USDA arrivano dopo; se le fonti esterne non rispondono l'utente vede "servizio non raggiungibile" con un tasto Riprova, non "nessun risultato". Le eliminazioni non chiedono conferma ma offrono **Annulla** in un toast (vedi `src/core/components/Toast.tsx`), che ripristina la riga con id e data di creazione originali.
- **Dashboard personalizzabile**: widget riordinabili col drag-and-drop, layout salvato per utente.
- **Installabile come app** (PWA): manifest in `src/app/manifest.ts` con icone in `public/`, scorciatoia diretta ad "Aggiungi un pasto". Non c'è service worker: l'app si installa e parte a schermo pieno, ma non funziona offline. Le icone sono SVG: Chrome le accetta, per iOS conviene aggiungere due PNG (192 e 512 px) in `public/` e referenziarle nel manifest.
- **Modularità**: l'app è pensata per aggiungere in futuro altri moduli (es. spese generali, manutenzioni casa, ecc.) senza toccare navigazione o dashboard — vedi [Come aggiungere un nuovo modulo](#come-aggiungere-un-nuovo-modulo).

## Com'è fatto (stack)

- **Next.js 15** (App Router, TypeScript, React 19) come framework applicativo.
- **Cloudflare Workers** come hosting, tramite l'adapter [OpenNext](https://opennext.js.org/cloudflare) (nessun server da gestire, deploy globale).
- **D1** (SQLite gestito da Cloudflare) per tutti i dati: bollette, diario, piatti, preferenze, utenti e sessioni.
- **Workers KV** per gli allegati PDF delle bollette.
- **Autenticazione custom**: niente servizio esterno (tipo Auth0/Supabase Auth) — login email+password con hashing PBKDF2 e sessioni su cookie httpOnly, tutto gestito in `src/lib/auth/`. Non c'è registrazione pubblica: gli account si creano con uno script (vedi sotto).
- **Tailwind CSS**, **Recharts** (grafici), **dnd-kit** (drag-and-drop).

Tutto il progetto gira sul piano gratuito di Cloudflare: per un uso personale come questo non si pagano costi (Workers, D1 e Workers KV hanno soglie gratuite ampiamente sufficienti).

---

## Info utili per l'uso quotidiano

**Aggiungere un nuovo account** (es. un familiare):
```bash
node scripts/seed-users.mjs "nuovaemail@esempio.it" "passwordSicura"
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-users.sql
rm d1/seed-users.sql   # contiene l'hash della password, non va tenuto/commitato
```

**Pubblicare una modifica al codice** (dopo aver testato in locale con `npm run preview`):
```bash
npm run deploy
```

**Modificare lo schema del database** (aggiungere una colonna/tabella): crea un nuovo file in `d1/migrations/` (es. `0002_qualcosa.sql`), poi applicalo sia in locale che in produzione:
```bash
npx wrangler d1 execute gestione-personale-db --local  --file=./d1/migrations/0002_qualcosa.sql
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/migrations/0002_qualcosa.sql
```

**Vedere/interrogare i dati reali** (es. controllare una bolletta):
```bash
npx wrangler d1 execute gestione-personale-db --remote --command "select * from bollette order by created_at desc limit 5"
```

**Vedere i log del Worker in produzione** (utile se qualcosa non funziona live):
```bash
npx wrangler tail
```

**Backup dei dati**: D1 non fa backup automatici scaricabili in un click. Per un export manuale periodico:
```bash
npx wrangler d1 export gestione-personale-db --remote --output=backup.sql
```

⚠️ **Attenzione ai due database**: ogni comando `wrangler d1 execute`/`kv key put` va sempre specificato con `--local` (il database di sviluppo, usato da `npm run dev`/`npm run preview`) o `--remote` (quello vero, in produzione). Sono due database completamente separati: una modifica fatta solo in locale non si vede in produzione e viceversa.

---

## Sviluppo locale

```bash
npm install
npm run dev
```

App su http://localhost:3000. Le variabili D1/KV non passano da `.env`: sono binding definiti in `wrangler.jsonc`, disponibili anche in `next dev` grazie a `initOpenNextCloudflareForDev()` in `next.config.mjs`. Il database locale è vuoto di default (solo schema): per provare l'app serve almeno un utente, creato con `node scripts/seed-users.mjs "email" "password"` e applicato con `npx wrangler d1 execute gestione-personale-db --local --file=./d1/seed-users.sql`.

Comandi utili: `npm run typecheck`, `npm run build`, `npm run preview` (build reale + anteprima sul runtime Workers, più fedele di `npm run dev` per testare prima di un deploy).

---

## Setup da zero (disaster recovery / nuovo account Cloudflare)

Se dovessi mai ricreare il progetto da un altro account Cloudflare:

```bash
npm install
npx wrangler login

npx wrangler d1 create gestione-personale-db
# copia il "database_id" restituito in wrangler.jsonc → d1_databases[0].database_id

npx wrangler kv namespace create ALLEGATI
# copia l'"id" restituito in wrangler.jsonc → kv_namespaces[0].id

npx wrangler d1 execute gestione-personale-db --local  --file=./d1/migrations/0001_init.sql
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/migrations/0001_init.sql

node scripts/seed-users.mjs "tuaemail@esempio.it" "passwordSicura"
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-users.sql
rm d1/seed-users.sql
```

Se serve anche `USDA_API_KEY` (ricerca alimenti USDA, opzionale): `npx wrangler secret put USDA_API_KEY`.

Poi `npm run deploy` come al solito. `scripts/migrate-data.mjs` serve solo per un'eventuale migrazione una tantum da un vecchio progetto Supabase — non serve per un setup pulito.

---

## Struttura del progetto

```
src/
  app/
    login/                 pagina di accesso
    auth/signout/          logout
    api/allegati/[...path] route protetta che serve i PDF da Workers KV
    (app)/                 area protetta (richiede login)
      layout.tsx           shell con sidebar
      dashboard/           dashboard personalizzabile
      bollette/            modulo bollette (lista, nuova, [id] modifica)
  core/
    modules/               tipi + registro centrale dei moduli
    components/            Sidebar, UI condivisa
    dashboard/             griglia widget drag-and-drop + preferenze (D1)
  lib/
    cf.ts                  accesso ai binding Cloudflare (D1, KV)
    auth/                  password hashing, sessioni, login/logout (D1)
    utils.ts               helper (formattazione € e date)
  modules/
    bollette/               modulo Bollette auto-contenuto (D1 + KV per i PDF)
    alimentazione/           modulo Alimentazione (D1)
d1/
  migrations/0001_init.sql  schema D1 (utenti, sessioni, bollette, alimentazione, preferenze)
scripts/
  seed-users.mjs            crea account (email + password hashata)
  migrate-data.mjs           migrazione una tantum da un vecchio progetto Supabase
wrangler.jsonc               config Worker: binding D1 (DB) e KV (ALLEGATI)
open-next.config.ts          config adapter OpenNext per Cloudflare
```

## Come aggiungere un nuovo modulo

1. Crea `src/modules/<nome>/module.config.ts` che esporta un `ModuleConfig` (id, label, icona, voci `nav`, eventuali `widgets`).
2. Aggiungi le pagine sotto `src/app/(app)/<nome>/`.
3. Importa e registra il modulo in `src/core/modules/registry.ts`.
4. Se il modulo usa nuove tabelle, aggiungi una migration in `d1/migrations/` e applicala (locale + remote).
5. Le query/mutazioni vanno scritte come Server Action (`"use server"` in cima al file `queries.ts`), filtrando sempre esplicitamente su `user_id` letto dalla sessione (`requireSessionUser()` / `getSessionUser()` in `src/lib/auth/session.ts`) — D1 non ha RLS, l'isolamento per utente è responsabilità del codice, non del database.

La sidebar e l'elenco dei widget della dashboard si aggiornano automaticamente.

## Note tecniche da ricordare

- **`src/app/layout.tsx` deve sempre importare `"./globals.css"`**: alcuni editor/estensioni ("organizza importazioni") possono rimuoverlo per errore scambiandolo per un import inutilizzato. Se lo stile sparisce dall'app, è la prima cosa da controllare.
- I file generati dagli script (`d1/seed-users.sql`, `d1/migrate-data.sql`, `d1/upload-allegati.sh`, `allegati-migrati/`) contengono dati/segreti reali e sono esclusi da git: vanno cancellati dopo l'uso, non committati.
