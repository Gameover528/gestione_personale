"use client";

import { use, useActionState } from "react";
import { KeyRound } from "lucide-react";
import { sceltaPasswordAction, type ImpostazioneResult } from "@/lib/auth/actions";
import { destinazioneSicura } from "@/lib/auth/destinazione";

const iniziale: ImpostazioneResult = {};

const campo =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

/**
 * "Scegli la tua password", al primo accesso con una password decisa da un
 * admin. Il middleware tiene qui chi ce l'ha finché non la cambia; poi si
 * torna alla pagina che si voleva aprire.
 */
export default function CambiaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = use(searchParams);
  const destinazione = destinazioneSicura(Array.isArray(next) ? next[0] : next);
  const [stato, azione, inCorso] = useActionState(sceltaPasswordAction, iniziale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Scegli la tua password</h1>
          <p className="text-sm text-muted-foreground">
            Quella con cui sei entrato l&apos;ha scelta un amministratore, quindi
            la conosce anche lui. Prima di continuare scegline una tua.
          </p>
        </div>

        <form action={azione} className="flex flex-col gap-4">
          {destinazione && <input type="hidden" name="next" value={destinazione} />}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Nuova password</span>
            <input
              name="passwordNuova"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Ripetila</span>
            <input
              name="passwordConferma"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={campo}
            />
          </label>

          {stato.error && (
            <p role="alert" className="text-sm text-destructive">
              {stato.error}
            </p>
          )}

          <button
            type="submit"
            disabled={inCorso}
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {inCorso ? "Salvo…" : "Salva e continua"}
          </button>
        </form>

        {/* Un form e non un link: /auth/signout risponde solo a POST. */}
        <form action="/auth/signout" method="post" className="mt-6 text-center">
          <button type="submit" className="text-sm text-muted-foreground hover:underline">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
