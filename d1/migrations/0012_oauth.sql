-- =====================================================================
-- OAuth per il server MCP: far collegare una chat ai propri dati.
--
-- Serve perché claude.ai non sa presentare una chiave fissa: l'unico modo
-- documentato è l'autorizzazione OAuth. Il giro è quello classico — l'utente
-- dà il consenso dentro l'app, ne esce un codice usa-e-getta, il codice si
-- scambia con un token.
--
-- NIENTE TABELLA DEI CLIENT. Il client è uno solo, scritto nel codice, e non
-- ha segreto: è un "client pubblico", e la sicurezza non si regge su una
-- password condivisa ma su tre cose che stanno qui — il consenso dell'utente,
-- l'indirizzo di ritorno dichiarato in anticipo, e PKCE. Una tabella di client
-- con le loro password sarebbe stata una cosa in più da custodire senza
-- proteggere niente di più.
--
-- TOKEN E CODICI SI SALVANO COME IMPRONTA, mai in chiaro: chi leggesse il
-- database non deve poterne usare nessuno. Stessa ragione per cui le password
-- non ci sono in chiaro. Qui basta SHA-256 senza sale: a differenza di una
-- password, un token è lungo e casuale, quindi non si indovina provando.
-- =====================================================================

-- Codici di autorizzazione: vivono un minuto e si consumano una volta sola.
create table if not exists oauth_codici (
  impronta       text primary key,
  user_id        text not null references users(id) on delete cascade,
  code_challenge text not null,
  redirect_uri   text not null,
  scadenza       text not null,
  created_at     text not null default (datetime('now'))
);

-- Token veri e propri. `tipo` distingue quello d'accesso (vita breve, viaggia
-- a ogni chiamata) da quello di rinnovo (vita lunga, viaggia solo per farsi
-- dare un accesso nuovo). Tenerli nella stessa tabella permette di revocare
-- un collegamento con una riga sola: `delete ... where sessione = ?`.
create table if not exists oauth_token (
  impronta   text primary key,
  user_id    text not null references users(id) on delete cascade,
  tipo       text not null,
  -- Lega fra loro accesso e rinnovo nati dallo stesso consenso: è "il
  -- collegamento" che l'utente vede e stacca da Impostazioni.
  sessione   text not null,
  scadenza   text,
  ultimo_uso text,
  created_at text not null default (datetime('now'))
);

create index if not exists oauth_token_user_idx on oauth_token (user_id, sessione);
create index if not exists oauth_codici_scadenza_idx on oauth_codici (scadenza);
