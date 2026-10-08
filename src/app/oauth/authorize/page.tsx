import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireSessionUser } from "@/lib/auth/session";
import {
  AMBITO_SCRITTURA,
  CLIENT_ID,
  ambitiRichiesti,
  redirectUriAmmesso,
} from "@/lib/oauth/config";
import { autorizza } from "../azioni";

/**
 * «Vuoi dare a una chat accesso ai tuoi dati?»
 *
 * È l'unico punto in cui la persona decide, quindi è l'unico punto in cui vale
 * la pena spiegare *cosa* sta concedendo: non "accesso all'account", ma leggere
 * il diario e il peso, e nient'altro.
 *
 * Non c'è un secondo login: si usa la sessione dell'app. Chi arriva qui senza
 * essere entrato viene mandato alla pagina di accesso e poi torna, perché
 * `requireSessionUser` fa esattamente quello.
 */

/** Gli errori che si possono dire prima di aver verificato chi sta chiedendo. */
function Rifiuto({ motivo }: { motivo: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Richiesta non valida</h1>
        <p className="mt-3 text-sm text-muted-foreground">{motivo}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Non è stato concesso niente. Puoi chiudere questa pagina.
        </p>
      </div>
    </div>
  );
}

export default async function AutorizzaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const uno = (k: string) => (Array.isArray(p[k]) ? p[k][0] : p[k]) ?? "";

  const clientId = uno("client_id");
  const redirectUri = uno("redirect_uri");
  const state = uno("state");
  const challenge = uno("code_challenge");
  const metodo = uno("code_challenge_method");
  const responseType = uno("response_type");
  const ambiti = ambitiRichiesti(uno("scope"));
  const scrive = ambiti.includes(AMBITO_SCRITTURA);

  /*
    I controlli si fanno PRIMA di mostrare qualunque cosa, e in quest'ordine:
    finché l'indirizzo di ritorno non è fra quelli ammessi non si può rimandare
    indietro niente — nemmeno un errore — perché rispedire a un indirizzo
    arbitrario è esattamente il modo in cui si fanno uscire i codici.
  */
  if (clientId !== CLIENT_ID) {
    return <Rifiuto motivo="L'applicazione che sta chiedendo l'accesso non è riconosciuta." />;
  }
  if (!redirectUriAmmesso(redirectUri)) {
    return (
      <Rifiuto motivo="L'indirizzo a cui l'applicazione vuole tornare non è fra quelli ammessi." />
    );
  }

  // Da qui in poi il ritorno è un indirizzo fidato, quindi gli errori si
  // possono mandare là, com'è previsto, invece di mostrarli qui.
  const errore = (codice: string) => {
    const u = new URL(redirectUri);
    u.searchParams.set("error", codice);
    if (state) u.searchParams.set("state", state);
    redirect(u.toString());
  };

  if (responseType !== "code") errore("unsupported_response_type");
  if (metodo !== "S256" || !challenge) errore("invalid_request");

  const utente = await requireSessionUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Dare accesso a una chat?</h1>
          <p className="text-sm text-muted-foreground">
            {scrive
              ? "Stai per permettere a un'applicazione di chat di leggere alcuni tuoi dati e di scrivere nel diario e nel registro del peso."
              : "Stai per permettere a un'applicazione di chat di leggere alcuni tuoi dati di questa app."}
          </p>
        </div>

        {/*
          L'elenco cambia con quello che si sta concedendo: una pagina che
          promette "non potra' scrivere" mentre sta concedendo la scrittura
          sarebbe peggio di nessuna pagina.
        */}
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Potrà:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>· leggere il tuo diario alimentare</li>
            <li>· leggere il tuo registro del peso</li>
            {scrive && (
              <>
                <li>· aggiungere pasti al diario e pesate al registro</li>
                <li>· togliere soltanto quello che ha aggiunto lei</li>
              </>
            )}
          </ul>
          <p className="mt-3 font-medium">Non potrà:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {scrive ? (
              <li>· toccare quello che hai scritto tu dall&apos;app</li>
            ) : (
              <li>· scrivere, modificare o cancellare niente</li>
            )}
            <li>· vedere bollette, abbonamenti o il tuo account</li>
            <li>· vedere i dati di altre persone</li>
          </ul>
        </div>

        {scrive && (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            Una chat può sbagliare le quantità. Quello che aggiunge resta
            segnato come arrivato da lì, così nel diario lo riconosci.
          </p>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Stai autorizzando come <strong>{utente.email}</strong>. Puoi staccare
          il collegamento quando vuoi da Impostazioni › Profilo.
        </p>

        {/*
          Un form con azione server, non un link: concedere è un effetto, e un
          effetto non deve poter partire perché qualcuno ti ha fatto aprire un
          indirizzo.
        */}
        <form action={autorizza} className="mt-6 flex gap-3">
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="code_challenge" value={challenge} />
          <input type="hidden" name="scope" value={ambiti.join(" ")} />
          <button
            type="submit"
            name="decisione"
            value="consenti"
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Consenti
          </button>
          <button
            type="submit"
            name="decisione"
            value="annulla"
            className="flex-1 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Annulla
          </button>
        </form>
      </div>
    </div>
  );
}
