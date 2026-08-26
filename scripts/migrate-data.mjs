#!/usr/bin/env node
// Migra i dati di UN utente da Supabase (Postgres + Storage) a D1 + Workers KV.
//
// Presupposti:
//  - Hai già creato l'utente in D1 con scripts/seed-users.mjs (stessa email).
//  - Conosci l'ID utente Supabase (Authentication → Users, colonna "UID")
//    e l'ID utente D1 appena creato (Authentication è ora in D1: vedi sotto).
//
// Uso:
//   node scripts/migrate-data.mjs \
//     --supabase-url=https://xxxx.supabase.co \
//     --service-key=eyJ...   (Project Settings → API → service_role, NON la anon key) \
//     --old-user-id=<uuid utente Supabase> \
//     --new-user-id=<uuid utente D1>
//
// Per trovare il nuovo id utente D1:
//   npx wrangler d1 execute gestione-personale-db --remote --command "select id, email from users"
//
// Output:
//   d1/migrate-data.sql          → da applicare con wrangler d1 execute
//   allegati-migrati/<newId>/*   → PDF scaricati da Supabase Storage
//   d1/upload-allegati.sh        → comandi wrangler kv per caricarli su Workers KV
//
// Il file d1/migrate-data.sql contiene dati reali: non va committato
// (già escluso in .gitignore insieme a d1/seed-users.sql).

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : process.env[name.toUpperCase().replace(/-/g, "_")];
}

const SUPABASE_URL = arg("supabase-url");
const SERVICE_KEY = arg("service-key");
const OLD_USER_ID = arg("old-user-id");
const NEW_USER_ID = arg("new-user-id");
const ATTACHMENTS_ONLY = process.argv.includes("--attachments-only");

if (!SUPABASE_URL || !SERVICE_KEY || !OLD_USER_ID || !NEW_USER_ID) {
  console.error(
    "Uso: node scripts/migrate-data.mjs --supabase-url=... --service-key=... --old-user-id=... --new-user-id=..."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function sqlVal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insertStatement(table, row) {
  const cols = Object.keys(row);
  return `insert into ${table} (${cols.join(", ")}) values (${cols
    .map((c) => sqlVal(row[c]))
    .join(", ")});`;
}

function remapAllegato(p) {
  if (!p) return p;
  return p.replace(`${OLD_USER_ID}/`, `${NEW_USER_ID}/`);
}

async function fetchAll(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", OLD_USER_ID);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function main() {
  if (!ATTACHMENTS_ONLY) {
  const statements = [];

  // ---- bollette ----
  for (const b of await fetchAll("bollette")) {
    statements.push(
      insertStatement("bollette", {
        id: b.id,
        user_id: NEW_USER_ID,
        fornitore: b.fornitore,
        tipo: b.tipo,
        importo: b.importo,
        data_scadenza: b.data_scadenza,
        stato: b.stato,
        data_pagamento: b.data_pagamento,
        note: b.note,
        allegato_path: remapAllegato(b.allegato_path),
        pagamento_path: remapAllegato(b.pagamento_path),
        divisione: b.divisione,
        persone_tue: b.persone_tue,
        persone_altre: b.persone_altre,
        periodo_inizio: b.periodo_inizio,
        periodo_fine: b.periodo_fine,
        created_at: b.created_at,
      })
    );
  }

  // ---- user_preferences ----
  for (const p of await fetchAll("user_preferences")) {
    statements.push(
      insertStatement("user_preferences", {
        user_id: NEW_USER_ID,
        key: p.key,
        value: JSON.stringify(p.value ?? {}),
        updated_at: p.updated_at,
      })
    );
  }

  // ---- diario_pasti ----
  for (const d of await fetchAll("diario_pasti")) {
    statements.push(
      insertStatement("diario_pasti", {
        id: d.id,
        user_id: NEW_USER_ID,
        data: d.data,
        pasto: d.pasto,
        nome_alimento: d.nome_alimento,
        marca: d.marca,
        quantita_g: d.quantita_g,
        kcal_100: d.kcal_100,
        proteine_100: d.proteine_100,
        carboidrati_100: d.carboidrati_100,
        grassi_100: d.grassi_100,
        fibre_100: d.fibre_100,
        zuccheri_100: d.zuccheri_100,
        sale_100: d.sale_100,
        fonte: d.fonte,
        created_at: d.created_at,
      })
    );
  }

  // ---- obiettivi_nutrizionali ----
  for (const o of await fetchAll("obiettivi_nutrizionali")) {
    statements.push(
      insertStatement("obiettivi_nutrizionali", {
        user_id: NEW_USER_ID,
        nutriente: o.nutriente,
        valore: o.valore,
        tipo: o.tipo,
      })
    );
  }

  // ---- piatti + piatto_ingredienti ----
  const piatti = await fetchAll("piatti");
  for (const p of piatti) {
    statements.push(
      insertStatement("piatti", {
        id: p.id,
        user_id: NEW_USER_ID,
        nome: p.nome,
        created_at: p.created_at,
      })
    );
  }
  for (const p of piatti) {
    const { data: ings, error } = await supabase
      .from("piatto_ingredienti")
      .select("*")
      .eq("piatto_id", p.id);
    if (error) throw new Error(`piatto_ingredienti: ${error.message}`);
    for (const i of ings ?? []) {
      statements.push(
        insertStatement("piatto_ingredienti", {
          id: i.id,
          piatto_id: i.piatto_id,
          user_id: NEW_USER_ID,
          nome_alimento: i.nome_alimento,
          marca: i.marca,
          quantita_g: i.quantita_g,
          kcal_100: i.kcal_100,
          proteine_100: i.proteine_100,
          carboidrati_100: i.carboidrati_100,
          grassi_100: i.grassi_100,
          fibre_100: i.fibre_100,
          zuccheri_100: i.zuccheri_100,
          sale_100: i.sale_100,
          fonte: i.fonte,
        })
      );
    }
  }

  mkdirSync("d1", { recursive: true });
  writeFileSync("d1/migrate-data.sql", statements.join("\n") + "\n", "utf8");
  console.log(`Scritto d1/migrate-data.sql con ${statements.length} righe.`);
  }

  // ---- allegati PDF (Storage Supabase → Workers KV) ----
  const { data: files, error: listErr } = await supabase.storage
    .from("bollette")
    .list(OLD_USER_ID, { limit: 1000 });
  if (listErr) throw new Error(`storage.list: ${listErr.message}`);

  const uploadCmds = [];
  if (files && files.length > 0) {
    const outDir = path.join("allegati-migrati", NEW_USER_ID);
    mkdirSync(outDir, { recursive: true });
    for (const f of files) {
      const oldPath = `${OLD_USER_ID}/${f.name}`;
      const { data: blob, error: dlErr } = await supabase.storage
        .from("bollette")
        .download(oldPath);
      if (dlErr) {
        console.error(`Download fallito per ${oldPath}: ${dlErr.message}`);
        continue;
      }
      const localPath = path.join(outDir, f.name);
      writeFileSync(localPath, Buffer.from(await blob.arrayBuffer()));
      uploadCmds.push(
        `npx wrangler kv key put --binding=ALLEGATI "${NEW_USER_ID}/${f.name}" --path="./${localPath.replace(/\\/g, "/")}" --metadata='{"contentType":"application/pdf"}' --remote`
      );
    }
  }

  writeFileSync(
    "d1/upload-allegati.sh",
    "#!/usr/bin/env bash\nset -e\n" + uploadCmds.join("\n") + "\n",
    "utf8"
  );
  console.log(
    `Scritto d1/upload-allegati.sh con ${uploadCmds.length} comandi di upload.`
  );

  console.log("\nProssimi passi:");
  console.log("  1) npx wrangler d1 execute gestione-personale-db --remote --file=./d1/migrate-data.sql");
  console.log("  2) bash d1/upload-allegati.sh   (oppure incolla i comandi uno a uno)");
  console.log("  3) rm d1/migrate-data.sql d1/upload-allegati.sh -r allegati-migrati   (contengono dati reali)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
