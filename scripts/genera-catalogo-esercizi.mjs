#!/usr/bin/env node
// Genera d1/seed-esercizi.sql: il catalogo di esercizi da caricare in D1.
//
// La fonte e' il dataset di ExerciseDB (progetto open source, AGPL-3.0):
// https://github.com/bootstrapping-lab/exercisedb-api  -> src/data/exercises.json
// 1500 esercizi con muscoli primari e secondari, attrezzi, istruzioni passo-passo
// e il link alla GIF dimostrativa.
//
// Perche' in D1 e non in un JSON importato nel Worker: 1,3 MB dentro il bundle
// peserebbero su ogni richiesta, mentre in D1 la ricerca e' una query e il
// Worker resta leggero.
//
// I nomi dei muscoli si salvano COSI' COME ARRIVANO, senza normalizzarli qui:
// la traduzione verso i gruppi disegnabili sta in
// src/modules/esercizio/muscoli/tipi.ts ed e' una funzione pura, quindi
// migliorarla non obbliga a rigenerare il catalogo.
//
// Uso:
//   node scripts/genera-catalogo-esercizi.mjs
//   npx wrangler d1 execute gestione-personale-db --local  --file=./d1/seed-esercizi.sql

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const FONTE =
  "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json";
const USCITA = "./d1/seed-esercizi.sql";

/** Apostrofi raddoppiati: e' l'unico escape che serve a SQLite per un literal. */
function q(v) {
  if (v === null || v === undefined) return "null";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const json = (v) => q(JSON.stringify(v ?? []));

console.log("Scarico il dataset da ExerciseDB…");
const res = await fetch(FONTE);
if (!res.ok) {
  console.error(`Scaricamento non riuscito: HTTP ${res.status}`);
  process.exit(1);
}
const esercizi = await res.json();
if (!Array.isArray(esercizi) || esercizi.length === 0) {
  console.error("Il dataset scaricato non contiene esercizi.");
  process.exit(1);
}
console.log(`Esercizi trovati: ${esercizi.length}`);

const righe = esercizi.map((e) =>
  `(${[
    q(e.exerciseId),
    q(e.name),
    q(e.gifUrl),
    json(e.targetMuscles),
    json(e.secondaryMuscles),
    json(e.bodyParts),
    json(e.equipments),
    json(e.instructions),
  ].join(",")})`
);

// A lotti: un unico insert da 1500 righe supera i limiti di una singola
// istruzione, e in caso di errore non si capirebbe dove.
const LOTTO = 100;
const parti = [
  "-- Catalogo esercizi (generato da scripts/genera-catalogo-esercizi.mjs — non modificare a mano).",
  "-- Fonte: ExerciseDB (https://github.com/bootstrapping-lab/exercisedb-api), AGPL-3.0.",
  "delete from esercizi_catalogo;",
];
for (let i = 0; i < righe.length; i += LOTTO) {
  parti.push(
    "insert into esercizi_catalogo\n" +
      " (id, nome, gif_url, muscoli, muscoli_secondari, parti_corpo, attrezzi, istruzioni)\n" +
      " values\n " +
      righe.slice(i, i + LOTTO).join(",\n ") +
      ";"
  );
}

mkdirSync(dirname(USCITA), { recursive: true });
const sql = parti.join("\n\n") + "\n";
writeFileSync(USCITA, sql);
console.log(
  `Scritto ${USCITA} — ${righe.length} esercizi, ${(sql.length / 1024 / 1024).toFixed(2)} MB.`
);
