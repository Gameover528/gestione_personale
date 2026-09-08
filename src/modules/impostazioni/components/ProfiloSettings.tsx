"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  type ImpostazioneResult,
} from "@/lib/auth/actions";
import { salvaNomeAction } from "../profilo";
import { salvaColore, salvaTema } from "@/core/theme/preferenze";
import {
  TEMI,
  applicaColore,
  applicaTema,
  coloreValido,
  type Tema,
} from "@/core/theme/tipi";
import { COLORI_PRESET } from "@/core/theme/palette";
import { Card, CardTitle } from "@/core/components/ui";
import { TabBar, inputClass } from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import { cn } from "@/lib/utils";

const initialState: ImpostazioneResult = {};

export function ProfiloSettings({
  email,
  nomeIniziale,
  temaIniziale,
  coloreIniziale,
}: {
  email: string;
  nomeIniziale: string;
  temaIniziale: Tema;
  coloreIniziale: string | null;
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

  // --- Colore ---
  const [colore, setColore] = useState<string | null>(coloreIniziale);
  const coloreSalvato = useRef<string | null>(coloreIniziale);
  /** Ultimo colore mostrato, leggibile anche dalla pulizia dell'effetto. */
  const coloreCorrente = useRef<string | null>(coloreIniziale);
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null);
  const richiestaColore = useRef(0);

  /**
   * Mostra la palette derivata dal colore, solo lato client: è un foglio di
   * stile sostituito, non costa una chiamata al server.
   */
  function anteprimaColore(hex: string | null) {
    coloreCorrente.current = hex;
    setColore(hex);
    applicaColore(hex);
  }

  async function salvaOra(hex: string | null) {
    if (attesa.current) {
      clearTimeout(attesa.current);
      attesa.current = null;
    }
    if (hex === coloreSalvato.current) return;
    const token = ++richiestaColore.current;
    try {
      await salvaColore(hex);
      coloreSalvato.current = hex;
    } catch {
      // Segnala solo se è ancora l'ultima scelta: un tentativo superato da una
      // scelta più recente non è un errore da mostrare.
      if (token === richiestaColore.current) {
        toast({ messaggio: "Colore non salvato: riprova.", tono: "errore" });
      }
    }
  }

  /** Scelta con un gesto singolo (campione, ripristino): si salva subito. */
  function scegliColore(hex: string | null) {
    anteprimaColore(hex);
    salvaOra(hex);
  }

  /**
   * Scelta dal selettore di sistema: emette un evento per ogni spostamento del
   * cursore, quindi la palette si aggiorna subito ma il salvataggio parte una
   * volta sola, a scelta ferma. Senza questa attesa una singola scelta faceva
   * partire centinaia di chiamate al server, che annullandosi a vicenda
   * facevano comparire "colore non salvato" anche quando riusciva.
   */
  function trascinaColore(hex: string | null) {
    anteprimaColore(hex);
    if (attesa.current) clearTimeout(attesa.current);
    attesa.current = setTimeout(() => salvaOra(hex), 600);
  }

  // Se si lascia la pagina prima che l'attesa sia scaduta la scelta andrebbe
  // persa: qui si salva comunque, senza attenderne l'esito.
  useEffect(() => {
    return () => {
      if (coloreCorrente.current !== coloreSalvato.current) {
        salvaColore(coloreCorrente.current).catch(() => {});
      }
    };
  }, []);

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
        <CardTitle>Colore</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Dal colore scelto viene ricavata tutta la palette: accento, sfondi
          virati verso quella tinta e testi scelti in base alla luminosità, così
          da restare sempre leggibili.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {COLORI_PRESET.map((c) => (
            <button
              key={c.hex}
              onClick={() => scegliColore(c.hex)}
              aria-label={c.nome}
              aria-pressed={colore === c.hex}
              title={c.nome}
              style={{ backgroundColor: c.hex }}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition",
                colore === c.hex
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105"
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Oppure scegline uno</span>
            <input
              type="color"
              value={colore ?? "#2563eb"}
              onChange={(e) => trascinaColore(coloreValido(e.target.value))}
              aria-label="Colore personalizzato"
              className="h-9 w-14 cursor-pointer rounded-md border bg-background p-1"
            />
          </label>
          {colore && (
            <button
              onClick={() => scegliColore(null)}
              className="text-sm text-muted-foreground hover:underline"
            >
              torna al colore predefinito
            </button>
          )}
        </div>

        <div className="mt-4 rounded-lg border p-3">
          <p className="text-sm font-medium">Anteprima</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              Pulsante
            </span>
            <span className="rounded-md border px-3 py-1.5 text-sm">Bordo</span>
            <span className="rounded-md bg-muted px-3 py-1.5 text-sm">Sfondo</span>
            <span className="text-sm text-muted-foreground">Testo secondario</span>
            <span className="text-sm text-success">Conferma</span>
            <span className="text-sm text-destructive">Errore</span>
          </div>
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
