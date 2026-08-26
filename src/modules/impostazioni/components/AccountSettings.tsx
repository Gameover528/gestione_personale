"use client";

import { useActionState, useState } from "react";
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  type ImpostazioneResult,
} from "@/lib/auth/actions";
import { Card, CardTitle } from "@/core/components/ui";

const initialState: ImpostazioneResult = {};

export function AccountSettings() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState<string | null>(null);

  async function handleRevoke() {
    setRevoking(true);
    setRevokeMsg(null);
    try {
      const res = await revokeOtherSessionsAction();
      setRevokeMsg(
        res.rimosse > 0
          ? `Disconnesse ${res.rimosse} altre sessioni.`
          : "Nessun'altra sessione attiva."
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Cambia password</CardTitle>
        <form action={formAction} className="mt-3 flex max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="passwordAttuale" className="text-sm font-medium">
              Password attuale
            </label>
            <input
              id="passwordAttuale"
              name="passwordAttuale"
              type="password"
              required
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="passwordNuova" className="text-sm font-medium">
              Nuova password
            </label>
            <input
              id="passwordNuova"
              name="passwordNuova"
              type="password"
              required
              minLength={6}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="passwordConferma" className="text-sm font-medium">
              Conferma nuova password
            </label>
            <input
              id="passwordConferma"
              name="passwordConferma"
              type="password"
              required
              minLength={6}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.ok && <p className="text-sm text-success">Password aggiornata.</p>}
          <button
            type="submit"
            disabled={isPending}
            className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Salvataggio…" : "Aggiorna password"}
          </button>
        </form>
      </Card>

      <Card>
        <CardTitle>Sessioni attive</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Se hai perso un dispositivo o hai fatto accesso da un posto che non
          riconosci, disconnetti tutte le altre sessioni: questo dispositivo
          resta collegato.
        </p>
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="mt-3 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
        >
          {revoking ? "Disconnessione…" : "Disconnetti altri dispositivi"}
        </button>
        {revokeMsg && (
          <p className="mt-2 text-sm text-muted-foreground">{revokeMsg}</p>
        )}
      </Card>
    </div>
  );
}
