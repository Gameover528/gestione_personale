# Sviluppo e gestione

Tutto quello che serve per lavorare al progetto. Per capire *cosa fa* l'app e come si usa, vedi il [README](../README.md).

---

## Stack

- **Next.js 15** (App Router, TypeScript, React 19).
- **Cloudflare Workers** come hosting, tramite l'adapter [OpenNext](https://opennext.js.org/cloudflare): nessun server da gestire.
- **D1** (SQLite gestito da Cloudflare) per tutti i dati: bollette, abbonamenti, diario, piatti, esercizi, allenamenti, schede, preferenze, utenti e sessioni.
- **Workers KV** per gli allegati PDF delle bollette e per la cache delle GIF degli esercizi.
- **Autenticazione scritta in casa** (niente Auth0/Supabase): email + password con PBKDF2, sessioni su cookie httpOnly, tutto in `src/lib/auth/`. Nessuna registrazione pubblica: gli account si creano con uno script.
- **Tailwind CSS**, **Recharts** (grafici), **dnd-kit** (drag-and-drop della dashboard).

Gira interamente sul piano gratuito di Cloudflare. Vale la pena sapere che quel piano dà **circa 10 ms di CPU per richiesta**: quando lo si sfora il browser riceve l'errore 1102 ("Worker exceeded resource limits"). È già successo mandando al client l'intero catalogo esercizi con le istruzioni — vedi il commento in `src/modules/esercizio/queries.ts`.

---

## Sviluppo locale

```bash
npm install
npm run dev
```

App su http://localhost:3000. Le variabili D1/KV non passano da `.env`: sono binding definiti in `wrangler.jsonc`, disponibili anche in `next dev` grazie a `initOpenNextCloudflareForDev()` in `next.config.mjs`.

Il database locale parte vuoto (solo schema): per provare l'app serve almeno un utente.

```bash
node scripts/seed-users.mjs "email" "password"
npx wrangler d1 execute gestione-personale-db --local --file=./d1/seed-users.sql
rm d1/seed-users.sql   # contiene l'hash della password: non si tiene e non si committa
```

Altri comandi: `npm run typecheck`, `npm run build`, `npm run preview` (build reale + anteprima sul runtime Workers: più fedele di `npm run dev` per provare qualcosa prima di pubblicarlo).

---

## I tre database

| | comando | chi lo usa |
|---|---|---|
| locale | `--local` | `npm run dev` e `npm run preview` sulla tua macchina |
| sviluppo | `--remote` su `gestione-personale-db-dev` | il worker `gestione-personale-dev` |
| produzione | `--remote` su `gestione-personale-db` | il sito vero |

⚠️ **Ogni comando `wrangler d1 execute` va scritto con `--local` o `--remote` esplicito.** Sono database separati: una modifica fatta in locale non si vede in produzione e viceversa. Lo stesso vale per `kv key put`.

```bash
# interrogare i dati veri
npx wrangler d1 execute gestione-personale-db --remote --command "select * from bollette order by created_at desc limit 5"

# log del worker di produzione, quando qualcosa non va live
npx wrangler tail

# export di backup (D1 non ne fa di automatici scaricabili)
npx wrangler d1 export gestione-personale-db --remote --output=backup.sql
```

---

## Migrazioni: si applicano a mano

**La pipeline non tocca il database.** I file in `d1/migrations/` si lanciano a mano, e vanno lanciati **prima** di pubblicare il codice che li richiede — altrimenti il codice nuovo cerca tabelle che non esistono ancora.

```bash
npx wrangler d1 execute gestione-personale-db --local  --file=./d1/migrations/0011_qualcosa.sql
npx wrangler d1 execute gestione-personale-db-dev --remote --file=./d1/migrations/0011_qualcosa.sql
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/migrations/0011_qualcosa.sql
```

Non c'è una tabella che tenga il conto di cosa è già passato: il controllo si fa guardando lo schema.

```bash
npx wrangler d1 execute gestione-personale-db --remote --command "select name from sqlite_master where type='table' order by name"
```

**Una migration può passare a metà.** È successo con la `0009`: alcune istruzioni erano andate, altre no, e le schede non si vedevano. Da lì la `0010`, scritta per essere rilanciabile senza danni. Se una migration fallisce a metà strada, la riparazione si scrive come nuovo file idempotente invece di rilanciare quello vecchio.

Il catalogo esercizi non è una migration ma un caricamento dati:

```bash
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-esercizi.sql
```

---

## Pubblicare

Basta il push: ci pensa `.github/workflows/deploy.yml`.

- `develop` → worker di sviluppo (`gestione-personale-dev`)
- `main` → produzione

Il deploy a mano (`npm run deploy:dev`, `npm run deploy:prod`) serve solo a pubblicare senza passare da git.

L'app sa in che ambiente gira dalla variabile `AMBIENTE` in `wrangler.jsonc` (`dev` o `prod`).

---

## Registro delle versioni

Vive in `src/core/versioni/changelog.ts` e si vede in **Impostazioni › Versioni**. Due convenzioni, entrambe standard:

- **[CalVer](https://calver.org)** per i numeri: un rilascio si chiama con la sua data, `2026.09.15`, e `2026.09.15.2` se ne capitano due nello stesso giorno.
- **[Keep a Changelog](https://keepachangelog.com)** per le voci: una riga ciascuna, classificate in Aggiunto / Modificato / Corretto / Rimosso / Sicurezza, scritte per chi usa l'app e non per chi legge il codice.

Come si lavora:

1. Mentre sviluppi, ogni modifica va in **`NON_RILASCIATO`**, nello stesso commit del codice che descrive.
2. Quando quel lavoro arriva in produzione, quelle righe diventano un nuovo `Rilascio` in testa a `RILASCI`, con la data del giorno, e `NON_RILASCIATO` torna a `null`.

Il campo `migrazioni` elenca cosa va applicato al database perché quel rilascio funzioni. Sul non rilasciato è una lista di controllo prima di pubblicare, con tanto di avviso giallo; sui rilasci passati resta come storia, in una riga.

---

## Account

```bash
node scripts/seed-users.mjs "nuovaemail@esempio.it" "passwordSicura"
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-users.sql
rm d1/seed-users.sql
```

Chi ha il ruolo di amministratore può poi gestire gli altri da **Impostazioni › Utenti**, reset password compreso.

---

## Icone dell'app installabile (PWA)

Il manifest è generato da `src/app/manifest.ts`; le icone stanno in `public/`.

Due cose che si dimenticano facilmente:

- **`/manifest.webmanifest` deve restare pubblico.** Il browser lo scarica *prima* dell'installazione, quando non c'è ancora nessuna sessione: se il middleware lo rimanda al login, l'app non si installa. C'è un'eccezione esplicita in `src/middleware.ts`.
- **Safari non legge le icone SVG.** L'`apple-touch-icon` deve essere un PNG opaco, altrimenti sulla schermata Home dell'iPhone compare una miniatura della pagina al posto dell'icona.

Le sorgenti restano gli SVG; i PNG si rigenerano da lì con `sharp` (già fra le dipendenze):

```bash
node -e "
const sharp = require('sharp');
const { readFileSync } = require('node:fs');
const normale = readFileSync('public/icon.svg');
const maskable = readFileSync('public/icon-maskable.svg');
(async () => {
  await sharp(normale).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(normale).resize(512, 512).png().toFile('public/icon-512.png');
  await sharp(maskable).resize(512, 512).png().toFile('public/icon-maskable-512.png');
  await sharp(normale).resize(180, 180).flatten({ background: '#2563eb' }).png().toFile('public/apple-touch-icon.png');
})();
"
```

Non c'è service worker: l'app si installa e parte a schermo pieno, ma non funziona offline.

---

## Setup da zero (nuovo account Cloudflare)

```bash
npm install
npx wrangler login

npx wrangler d1 create gestione-personale-db
# copia il "database_id" in wrangler.jsonc → d1_databases[0].database_id

npx wrangler kv namespace create ALLEGATI
# copia l'"id" in wrangler.jsonc → kv_namespaces[0].id

# tutte le migration, in ordine
for f in d1/migrations/*.sql; do
  npx wrangler d1 execute gestione-personale-db --remote --file="$f"
done
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-esercizi.sql

node scripts/seed-users.mjs "tuaemail@esempio.it" "passwordSicura"
npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-users.sql
rm d1/seed-users.sql
```

Se serve la ricerca alimenti USDA (opzionale): `npx wrangler secret put USDA_API_KEY`. Poi `npm run deploy`.

`scripts/migrate-data.mjs` serve solo a un'eventuale migrazione una tantum da un vecchio progetto Supabase: per un setup pulito non serve.

---

## Struttura

```
src/
  middleware.ts            sessione, protezione delle rotte, CSP e header di sicurezza
  app/
    login/                 pagina di accesso
    auth/signout/          logout
    manifest.ts            manifest PWA
    api/allegati/          serve i PDF da KV, protetta
    api/backup/            export dei dati
    api/esercizio-gif/     GIF degli esercizi, scaricate una volta e messe in cache su KV
    (app)/                 area protetta: una cartella per modulo
  core/
    modules/               tipi + registro centrale di macro-aree e moduli
    navigazione/           sidebar, barra in basso su telefono
    components/            UI condivisa
    dashboard/             griglia widget drag-and-drop + preferenze
    theme/                 temi e colore dell'app
    versioni/              registro delle versioni
  lib/
    cf.ts                  accesso ai binding Cloudflare (D1, KV)
    auth/                  password, sessioni, ruoli, freno ai tentativi di accesso
    utils.ts               formattazione € e date
  modules/
    bollette/  abbonamenti/  alimentazione/  esercizio/  impostazioni/
d1/
  migrations/              schema, un file per modifica
  seed-esercizi.sql        catalogo di 1500 esercizi
scripts/
  seed-users.mjs           crea account
  genera-catalogo-esercizi.mjs  rigenera seed-esercizi.sql da ExerciseDB
  migrate-data.mjs         migrazione una tantum dal vecchio Supabase
```

---

## Aggiungere un modulo

1. Crea `src/modules/<nome>/module.config.ts` che esporta un `ModuleConfig` (id, label, icona, `basePath` univoco, voci `nav`, eventuali `widgets`).
2. Aggiungilo all'array `moduli` della macro-area giusta in `src/core/modules/registry.ts`. Per una macro-area nuova, aggiungi una voce a `macroAree`.
3. Aggiungi le pagine sotto `src/app/(app)/<nome>/`.
4. Se servono tabelle nuove, scrivi una migration in `d1/migrations/` e applicala (locale, dev, prod).
5. Aggiungi le voci al registro delle versioni.

Sidebar, menu e dashboard si aggiornano da soli.

---

## Regole da non dimenticare

- **Le query sono Server Action** (`"use server"` in cima a `queries.ts`). Un file `"use server"` può esportare **solo funzioni async**: una costante esportata fa fallire la build.
- **Gli argomenti di una Server Action arrivano dal client.** Il tipo TypeScript non protegge niente a runtime: un `Object.keys(input)` usato per costruire SQL è una falla di injection, e lo è stata davvero. Le colonne modificabili si dichiarano in un'allowlist e si filtra su quella.
- **Filtra sempre su `user_id`** preso dalla sessione (`requireSessionUser()` in `src/lib/auth/session.ts`). D1 non ha row-level security: l'isolamento fra utenti è responsabilità del codice.
- **`src/app/layout.tsx` deve sempre importare `"./globals.css"`**: la funzione "organizza importazioni" di alcuni editor lo toglie scambiandolo per inutilizzato. Se lo stile sparisce, è la prima cosa da guardare.
- **I file generati dagli script** (`d1/seed-users.sql`, `d1/migrate-data.sql`, `allegati-migrati/`) contengono dati e segreti reali: sono esclusi da git e vanno cancellati dopo l'uso.
- **Negli elenchi lunghi, `prefetch={false}`** sui link: senza, ogni risultato di ricerca fa partire una richiesta al worker.
