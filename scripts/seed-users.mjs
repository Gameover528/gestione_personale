#!/usr/bin/env node
// Genera un file SQL con gli account (email + password hashata con PBKDF2,
// stesso algoritmo di src/lib/auth/password.ts) da applicare al database D1.
//
// Uso:
//   node scripts/seed-users.mjs "email1@esempio.it" "passwordSegreta1" ["email2@esempio.it" "passwordSegreta2" ...]
//
// Poi:
//   npx wrangler d1 execute gestione-personale-db --local  --file=./d1/seed-users.sql
//   npx wrangler d1 execute gestione-personale-db --remote --file=./d1/seed-users.sql
//   rm d1/seed-users.sql   (contiene gli hash: non va committato)

import { webcrypto as crypto } from "node:crypto";
import { writeFileSync } from "node:fs";

const ITERATIONS = 100_000;

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${toHex(salt)}:${toHex(hash)}`;
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length % 2 !== 0) {
    console.error(
      'Uso: node scripts/seed-users.mjs "email1" "password1" ["email2" "password2" ...]'
    );
    process.exit(1);
  }

  const statements = [];
  for (let i = 0; i < args.length; i += 2) {
    const email = args[i].trim().toLowerCase();
    const password = args[i + 1];
    if (password.length < 6) {
      console.error(`Password troppo corta per ${email} (minimo 6 caratteri).`);
      process.exit(1);
    }
    const hash = await hashPassword(password);
    const id = crypto.randomUUID();
    statements.push(
      `insert into users (id, email, password_hash) values ('${id}', '${sqlEscape(
        email
      )}', '${hash}')\n  on conflict (email) do update set password_hash = excluded.password_hash;`
    );
  }

  const outPath = "d1/seed-users.sql";
  writeFileSync(outPath, statements.join("\n") + "\n", "utf8");

  console.log(`Scritto ${outPath} con ${statements.length} utente/i.`);
  console.log("Applica al database con:");
  console.log(`  npx wrangler d1 execute gestione-personale-db --local  --file=./${outPath}`);
  console.log(`  npx wrangler d1 execute gestione-personale-db --remote --file=./${outPath}`);
  console.log("Poi elimina il file (contiene gli hash delle password):");
  console.log(`  rm ${outPath}`);
}

main();
