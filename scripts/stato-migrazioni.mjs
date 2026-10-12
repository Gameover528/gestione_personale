#!/usr/bin/env node
/**
 * Dice quali migration mancano, e su quale database.
 *
 * PERCHÉ ESISTE. Le migration si lanciano a mano, e la scelta è giusta: la
 * pipeline non deve toccare i dati. Ma "a mano" vuol dire che prima o poi una
 * si salta, e il momento in cui te ne accorgi è il peggiore possibile — una
 * pagina di errore davanti a chi sta usando l'app, con un messaggio che non
 * dice niente. È già successo tre volte: una migration passata a metà, una
 * dimenticata prima di un merge, una colonna nuova mancante in produzione.
 *
 * COSA FA. Legge i file in d1/migrations/, ricava quali tabelle e colonne
 * dovrebbero esistere, interroga i database e dice cosa manca dove, nominando
 * il file da lanciare.
 *
 * COSA NON FA, e va saputo:
 *  - capisce `create table` e `alter table ... add column`, non il resto: un
 *    indice mancante o un tipo diverso non li vede;
 *  - non controlla i dati, quindi un catalogo esercizi non caricato gli
 *    sfugge;
 *  - non sa se una migration è stata lanciata, sa se il suo *effetto* c'è.
 *    Che è la domanda vera: una migration registrata ma passata a metà
 *    risulterebbe comunque fatta, e invece qui si vede.
 *
 * USO
 *   node scripts/stato-migrazioni.mjs            # tutti e tre i database
 *   node scripts/stato-migrazioni.mjs local dev  # solo quelli indicati
 *
 * Esce con codice 1 se manca qualcosa: così si può mettere davanti a un merge.
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DATABASE = {
  local: { nome: "gestione-personale-db", dove: "--local", etichetta: "locale" },
  dev: { nome: "gestione-personale-db-dev", dove: "--remote", etichetta: "sviluppo" },
  prod: { nome: "gestione-personale-db", dove: "--remote", etichetta: "produzione" },
};

/** Da quale file arriva ogni tabella e ogni colonna che dovrebbe esserci. */
function attese() {
  const tabelle = new Map(); // tabella -> { file, colonne: Map(colonna -> file) }
  const dir = "d1/migrations";

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    // Via i commenti: dentro ce ne sono di lunghi, e contengono parole come
    // "create table" citate a parole, che altrimenti verrebbero lette come SQL.
    const sql = readFileSync(`${dir}/${file}`, "utf8")
      .split("\n")
      .filter((r) => !r.trimStart().startsWith("--"))
      .join("\n");

    for (const m of sql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)\s*\(([\s\S]*?)\n\s*\);/gi
    )) {
      const nome = m[1].toLowerCase();
      const colonne = tabelle.get(nome)?.colonne ?? new Map();
      for (const riga of m[2].split("\n")) {
        const c = riga.trim().match(/^([a-z0-9_]+)\s+(text|integer|real|blob|numeric)/i);
        if (c) colonne.set(c[1].toLowerCase(), file);
      }
      if (!tabelle.has(nome)) tabelle.set(nome, { file, colonne });
    }

    for (const m of sql.matchAll(
      /alter\s+table\s+([a-z0-9_]+)\s+add\s+column\s+([a-z0-9_]+)/gi
    )) {
      const nome = m[1].toLowerCase();
      const voce = tabelle.get(nome) ?? { file, colonne: new Map() };
      voce.colonne.set(m[2].toLowerCase(), file);
      tabelle.set(nome, voce);
    }
  }
  return tabelle;
}

/** Lo schema vero di un database: tabella -> insieme di colonne. */
function schemaReale(db) {
  /*
    Si chiama il file di wrangler con node, invece di passare da `npx`.
    Due problemi evitati in un colpo: con `shell: true` gli argomenti vengono
    concatenati senza virgolette e una query piena di spazi arriva a pezzi
    ("Unknown arguments: m.name, as, t, ..."), mentre senza shell Windows si
    rifiuta di avviare `npx.cmd` (EINVAL: i file batch vogliono una shell).
    Un file .js lo avvia direttamente, e ogni argomento resta intero.
  */
  const out = execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1", "execute", db.nome, db.dove, "--json",
      "--command",
      /*
        Le tabelle interne vanno escluse, e non per pulizia: D1 nega il
        pragma su quelle sue (`_cf_...`, `d1_...`) e l'intera query fallisce
        con "not authorized: SQLITE_AUTH". Una riga sola che non si riesce a
        leggere fa cadere tutto il resto.
      */
      "select m.name as t, p.name as c from sqlite_master m" +
        " join pragma_table_info(m.name) p" +
        " where m.type='table' and substr(m.name,1,1) <> '_'" +
        " and m.name not like 'sqlite%' and m.name not like 'd1%'",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 24 }
  );

  // wrangler stampa anche righe non JSON: si tiene dal primo "[".
  const righe = JSON.parse(out.slice(out.indexOf("[")))[0].results ?? [];
  const mappa = new Map();
  for (const r of righe) {
    const t = String(r.t).toLowerCase();
    if (!mappa.has(t)) mappa.set(t, new Set());
    mappa.get(t).add(String(r.c).toLowerCase());
  }
  return mappa;
}

const chiavi = process.argv.slice(2).filter((a) => a in DATABASE);
const daControllare = chiavi.length ? chiavi : Object.keys(DATABASE);
const tabelle = attese();

console.log(
  `Attese ${tabelle.size} tabelle dalle migration in d1/migrations.\n`
);

let qualcosaManca = false;

for (const chiave of daControllare) {
  const db = DATABASE[chiave];
  process.stdout.write(`${db.etichetta.padEnd(12)} `);

  let reale;
  try {
    reale = schemaReale(db);
  } catch (e) {
    // Si dice cosa è andato storto: "non raggiungibile" e basta manda a
    // indovinare fra autenticazione scaduta, rete, e nome sbagliato.
    console.log(`non letto — ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    qualcosaManca = true;
    continue;
  }

  /** I file da lanciare, con il motivo. */
  const mancanti = new Map();
  const aggiungi = (file, cosa) => {
    if (!mancanti.has(file)) mancanti.set(file, []);
    mancanti.get(file).push(cosa);
  };

  for (const [tabella, voce] of tabelle) {
    if (!reale.has(tabella)) {
      aggiungi(voce.file, `manca la tabella ${tabella}`);
      continue;
    }
    for (const [colonna, file] of voce.colonne) {
      if (!reale.get(tabella).has(colonna)) {
        aggiungi(file, `manca ${tabella}.${colonna}`);
      }
    }
  }

  if (mancanti.size === 0) {
    console.log("tutto a posto");
    continue;
  }

  qualcosaManca = true;
  console.log(`manca qualcosa:`);
  for (const [file, motivi] of [...mancanti].sort()) {
    console.log(`  ${file}`);
    for (const m of motivi) console.log(`      ${m}`);
    console.log(
      `      npx wrangler d1 execute ${db.nome} ${db.dove} --file=./d1/migrations/${file}`
    );
  }
  console.log();
}

if (qualcosaManca) {
  console.log(
    "\nNota: si controllano tabelle e colonne, non indici, tipi o dati caricati."
  );
  process.exit(1);
}
