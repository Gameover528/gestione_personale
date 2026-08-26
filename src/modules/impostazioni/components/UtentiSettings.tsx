"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  creaUtenteAction,
  impostaStatoUtenteAction,
  impostaRuoloUtenteAction,
  type CreaUtenteResult,
  type UtenteInfo,
} from "../queries";
import type { Ruolo, StatoAccount } from "@/lib/auth/roles";
import { Card, CardTitle, Badge } from "@/core/components/ui";

const initialState: CreaUtenteResult = {};

const LABEL_RUOLO: Record<Ruolo, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  utilizzatore: "Utilizzatore",
};

const LABEL_STATO: Record<StatoAccount, string> = {
  attivo: "Attivo",
  sospeso: "Sospeso",
  bloccato: "Bloccato",
};

export function UtentiSettings({
  utenti,
  utenteCorrenteId,
  ruoloRichiedente,
}: {
  utenti: UtenteInfo[];
  utenteCorrenteId: string;
  ruoloRichiedente: Ruolo;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    creaUtenteAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [azioneInCorso, setAzioneInCorso] = useState<string | null>(null);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  async function cambiaStato(id: string, nuovoStato: StatoAccount) {
    setAzioneInCorso(id);
    setErroreAzione(null);
    try {
      const res = await impostaStatoUtenteAction(id, nuovoStato);
      if (res.error) setErroreAzione(res.error);
      else router.refresh();
    } finally {
      setAzioneInCorso(null);
    }
  }

  async function cambiaRuolo(id: string, nuovoRuolo: "admin" | "utilizzatore") {
    setAzioneInCorso(id);
    setErroreAzione(null);
    try {
      const res = await impostaRuoloUtenteAction(id, nuovoRuolo);
      if (res.error) setErroreAzione(res.error);
      else router.refresh();
    } finally {
      setAzioneInCorso(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Account esistenti</CardTitle>
        {erroreAzione && (
          <p className="mt-2 text-sm text-destructive">{erroreAzione}</p>
        )}
        <ul className="mt-3 divide-y">
          {utenti.map((u) => {
            const seStesso = u.id === utenteCorrenteId;
            const modificabile = u.ruolo !== "superadmin" && !seStesso;
            const inCorso = azioneInCorso === u.id;
            return (
              <li key={u.id} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.email}</span>
                  {seStesso && (
                    <span className="text-xs text-muted-foreground">(tu)</span>
                  )}
                  <Badge variant={u.ruolo === "superadmin" ? "default" : u.ruolo === "admin" ? "success" : "default"}>
                    {LABEL_RUOLO[u.ruolo]}
                  </Badge>
                  <Badge
                    variant={
                      u.stato === "attivo" ? "success" : u.stato === "sospeso" ? "warning" : "destructive"
                    }
                  >
                    {LABEL_STATO[u.stato]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    dal {new Date(u.created_at).toLocaleDateString("it-IT")}
                  </span>
                </div>

                {modificabile && (
                  <div className="flex flex-wrap items-center gap-2">
                    {ruoloRichiedente === "superadmin" && (
                      <select
                        value={u.ruolo === "admin" ? "admin" : "utilizzatore"}
                        disabled={inCorso}
                        onChange={(e) =>
                          cambiaRuolo(u.id, e.target.value as "admin" | "utilizzatore")
                        }
                        className="rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="utilizzatore">Utilizzatore</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {u.stato === "attivo" ? (
                      <>
                        <button
                          disabled={inCorso}
                          onClick={() => cambiaStato(u.id, "sospeso")}
                          className="rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                        >
                          Sospendi
                        </button>
                        <button
                          disabled={inCorso}
                          onClick={() => cambiaStato(u.id, "bloccato")}
                          className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                        >
                          Blocca
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={inCorso}
                        onClick={() => cambiaStato(u.id, "attivo")}
                        className="rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                      >
                        Riattiva
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle>Aggiungi un account</CardTitle>
        <form
          ref={formRef}
          action={formAction}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Creazione…" : "Crea account"}
          </button>
        </form>
        {state.error && (
          <p className="mt-2 text-sm text-destructive">{state.error}</p>
        )}
        {state.ok && (
          <p className="mt-2 text-sm text-success">Account creato.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          I nuovi account nascono con ruolo &quot;Utilizzatore&quot;. Solo il
          superadmin può promuoverli ad Admin.
        </p>
      </Card>

      <p className="text-xs text-muted-foreground">
        Non è disponibile l&apos;eliminazione di un account da qui: cancellerebbe
        automaticamente tutti i suoi dati (bollette, diario, piatti). Se ti
        serve, fallo con cautela direttamente sul database con{" "}
        <code className="rounded bg-accent px-1">wrangler d1 execute</code>.
        Un account bloccato invece perde subito l&apos;accesso e tutte le sue
        sessioni attive, senza perdere i dati.
      </p>
    </div>
  );
}
