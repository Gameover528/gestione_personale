"use client";

import { useActionState, useState } from "react";
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  type ImpostazioneResult,
} from "@/lib/auth/actions";
import { salvaNomeAction } from "../profilo";
import { salvaTema } from "@/core/theme/preferenze";
import { TEMI, applicaTema, type Tema } from "@/core/theme/tipi";
import { Card, CardTitle } from "@/core/components/ui";
import { TabBar, inputClass } from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";

const initialState: ImpostazioneResult = {};

export function ProfiloSettings({
  email,
  nomeIniziale,
  temaIniziale,
}: {
  email: string;
  nomeIniziale: string;
  temaIniziale: Tema;
}) {
  const toast = useToast();

  // --- Come farsi chiamare ---
  const [nome, setNome] = useState(nomeIniziale);
  const [salvandoNome, setSalvandoNome] = useState(false);

  async function salvaNome() {
    setSalvandoNome(true);
    try {
      const esito = await salvaNomeAction(nome);
      if (esito.error) toast({ messaggio: esito.error, tono: "errore" });
      else toast({ messaggio: "Nome aggiornato." });
    } catch {
      toast({ messaggio: "Errore durante il salvataggio.", tono: "errore" });
    } finally {
      setSalvandoNome(false);
    }
  }

  // --- Aspetto ---
  const [tema, setTema] = useState<Tema>(temaIniziale);

  async function cambiaTema(t: Tema) {
    setTema(t);
    applicaTema(t);
    try {
      await salvaTema(t);
    } catch {
      toast({ messaggio: "Tema non salvato: riprova.", tono: "errore" });
    }
  }

  // --- Password ---
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  // --- Sessioni ---
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      const res = await revokeOtherSessionsAction();
      toast({
        messaggio:
          res.rimosse > 0
            ? `Disconnesse ${res.rimosse} altre sessioni.`
            : "Nessun'altra sessione attiva.",
      });
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Come vuoi essere chiamato</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          È il nome che compare nell&apos;app al posto dell&apos;email. Per
          accedere si continua a usare <strong>{email}</strong>, che non si
          cambia da qui.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={40}
              placeholder="Es. Yuri"
              className={`${inputClass} w-60`}
            />
          </label>
          <button
            onClick={salvaNome}
            disabled={salvandoNome}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {salvandoNome ? "Salvataggio…" : "Salva"}
          </button>
          {nome.trim() !== "" && (
            <button
              onClick={() => {
                setNome("");
                salvaNomeAction("").then(() =>
                  toast({ messaggio: "Tornerai a essere identificato dall'email." })
                );
              }}
              className="text-sm text-muted-foreground hover:underline"
            >
              rimuovi
            </button>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Aspetto</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          La scelta vale su tutti i dispositivi con cui accedi.
        </p>
        <div className="mt-3">
          <TabBar
            label="Tema"
            items={TEMI}
            value={tema}
            onChange={cambiaTema}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Password</CardTitle>
        <form action={formAction} className="mt-3 flex max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="passwordAttuale" className="text-sm font-medium">
              Password attuale
            </label>
            <input
              id="passwordAttuale"
              name="passwordAttuale"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
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
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
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
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
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
        <p className="mt-3 text-xs text-muted-foreground">
          Hai dimenticato la password? Serve un amministratore: dalla pagina
          Utenti può generarti una password temporanea da cambiare al primo
          accesso.
        </p>
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
      </Card>
    </div>
  );
}
