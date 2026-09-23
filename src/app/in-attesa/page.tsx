import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { getUtenteInAttesa } from "@/lib/auth/session";

/**
 * La schermata di chi ha chiesto un accesso e aspetta.
 *
 * Non è una pagina dell'app: sta fuori dall'area protetta, non ha la barra di
 * navigazione e non legge un solo dato. Usa `getUtenteInAttesa`, che risponde
 * soltanto per gli account in attesa: un account approvato che ci finisce
 * viene rimandato via dal middleware, uno senza sessione pure.
 */
export default async function InAttesaPage() {
  const utente = await getUtenteInAttesa();
  if (!utente) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Hourglass className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">Richiesta ricevuta</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ciao {utente.nome ?? utente.email}, la tua richiesta è arrivata e deve
          essere approvata a mano. Non serve che tu faccia altro: quando sarà
          approvata, questa pagina lascerà il posto all&apos;app.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Se ci vuole troppo, fai un fischio a chi ti ha mandato il link.
        </p>

        <p className="mt-6 text-xs text-muted-foreground">
          Hai chiesto l&apos;accesso come <strong>{utente.email}</strong>.
        </p>

        {/*
          Un form e non un link: /auth/signout risponde solo a POST, ed è
          giusto così — una disconnessione che si attiva seguendo un link può
          essere innescata da un'immagine o da un preferito. Niente JavaScript,
          quindi funziona anche su questa pagina che non ne carica.
        */}
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="text-sm text-primary hover:underline"
          >
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
