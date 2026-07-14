# Gestione Personale

Spazio personale **modulare** per gestire diverse aree della vita. Il primo modulo è **Bollette**; l'architettura è pensata per aggiungere altri moduli senza toccare navigazione e dashboard.

Stack: **Next.js 15** (App Router, TypeScript) · **Supabase** (Postgres, Auth, Storage) · **Tailwind CSS** · **Recharts** · **dnd-kit**. Deploy su **Vercel**.

## Funzionalità

- **Login** privato (email + password) con Supabase Auth.
- **Dashboard personalizzabile**: aggiungi/rimuovi widget e riordinali col drag-and-drop; il layout viene salvato per utente.
- **Modulo Bollette**: elenco con filtri (tipo, stato, anno), creazione/modifica, upload PDF, "segna come pagata", eliminazione, e statistiche (spesa per tipo, andamento mensile).
- **Modularità**: ogni modulo si registra da solo in `src/core/modules/registry.ts`.

---

## 1. Prerequisiti

- Node.js 18.18+ (consigliato 20+)
- Un account Supabase e un account Vercel

## 2. Crea il nuovo progetto Supabase

1. Vai su https://supabase.com/dashboard → **New project** (progetto dedicato, separato da quelli di lavoro).
2. Scegli una password DB e una region (es. Frankfurt/EU).
3. Quando è pronto: **Project Settings → API** e copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Crea le tabelle e lo storage

Apri **SQL Editor**, incolla il contenuto di [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e premi **Run**. Crea le tabelle `bollette` e `user_preferences`, le policy RLS e il bucket privato `bollette`.

### Crea il tuo utente

Poiché l'app è privata, crea l'account una volta sola. Due opzioni:

- **Authentication → Users → Add user** (imposta email e password, spunta "Auto Confirm User"), **oppure**
- Avvia l'app, vai su `/login`, clicca **Registrati**. Se in **Authentication → Providers → Email** la conferma via email è attiva, dovrai confermare dalla mail; per un uso solo personale puoi disattivare "Confirm email".

## 3. Configura ed avvia in locale

```bash
cp .env.local.example .env.local   # poi inserisci URL e anon key
npm install
npm run dev
```

App su http://localhost:3000 → verrai rediretto al login.

Comandi utili: `npm run typecheck`, `npm run build`.

## 4. GitHub + Vercel

```bash
git init
git add .
git commit -m "Gestione Personale: setup iniziale"
# crea un repo vuoto su GitHub, poi:
git remote add origin https://github.com/<tuo-utente>/gestione-personale.git
git push -u origin main
```

Su Vercel: **Add New → Project**, importa il repo. In **Environment Variables** aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gli stessi del `.env.local`). Deploy.

---

## Struttura del progetto

```
src/
  app/
    login/                 pagina di accesso
    auth/signout/          logout
    (app)/                 area protetta (richiede login)
      layout.tsx           shell con sidebar
      dashboard/           dashboard personalizzabile
      bollette/            modulo bollette (lista, nuova, [id] modifica)
  core/
    modules/               tipi + registro centrale dei moduli
    components/            Sidebar, UI condivisa
    dashboard/             griglia widget drag-and-drop + preferenze
  lib/
    supabase/              client browser/server + middleware
    utils.ts               helper (formattazione € e date)
  modules/
    bollette/              modulo Bollette auto-contenuto
      module.config.ts     dichiarazione al registro (nav + widget)
      types.ts, queries.ts
      components/           form + lista
      widgets/              widget per la dashboard
supabase/
  migrations/0001_init.sql schema DB + RLS + storage
```

## Come aggiungere un nuovo modulo

1. Crea `src/modules/<nome>/module.config.ts` che esporta un `ModuleConfig` (id, label, icona, voci `nav`, eventuali `widgets`).
2. Aggiungi le pagine sotto `src/app/(app)/<nome>/`.
3. Importa e registra il modulo in `src/core/modules/registry.ts`.

La sidebar e l'elenco dei widget della dashboard si aggiornano automaticamente. Se il modulo usa nuove tabelle, aggiungi una migration in `supabase/migrations/`.
