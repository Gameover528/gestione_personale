import { AlertTriangle } from "lucide-react";
import { Badge } from "@/core/components/ui";
import { formatDate } from "@/lib/utils";
import { etichettaAmbiente } from "./ambiente";
import {
  perCategoria,
  type Ambiente,
  type Categoria,
  type Modifica,
  type NonRilasciato,
  type Rilascio,
} from "./changelog";

/**
 * Registro delle versioni.
 *
 * In produzione si vedono i rilasci, ognuno col suo nome a data. Su sviluppo,
 * in testa, c'è quello che non è ancora arrivato in produzione: è la domanda
 * che si fa chi prova l'app ("cosa c'è qui che là non c'è ancora?").
 *
 * Non è più un componente client: non c'è niente da aprire o richiudere, il
 * contenuto si legge tutto insieme.
 */

/** Il colore dell'etichetta dice di che tipo di cambiamento si tratta. */
const TONO: Record<Categoria, "success" | "default" | "warning"> = {
  aggiunto: "success",
  modificato: "default",
  corretto: "warning",
  rimosso: "default",
  sicurezza: "warning",
};

export function RegistroVersioni({
  ambiente,
  rilasci,
  nonRilasciato,
}: {
  ambiente: Ambiente;
  rilasci: Rilascio[];
  /** Presente solo su sviluppo: le modifiche non ancora in produzione. */
  nonRilasciato: NonRilasciato | null;
}) {
  const inProduzione = rilasci[0];

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Stai usando l&apos;ambiente di{" "}
        <strong>{etichettaAmbiente(ambiente).toLowerCase()}</strong>
        {ambiente === "prod" && inProduzione ? (
          <>
            , versione <strong>{inProduzione.versione}</strong>.
          </>
        ) : (
          <>
            . In produzione c&apos;è la{" "}
            <strong>{inProduzione?.versione ?? "—"}</strong>.
          </>
        )}
      </p>

      {ambiente === "dev" && nonRilasciato && (
        <section className="rounded-lg border border-primary/40">
          <header className="flex flex-wrap items-center gap-2 border-b bg-primary/10 px-4 py-2">
            <span className="font-semibold">Non ancora in produzione</span>
            <Badge variant="default">solo sviluppo</Badge>
            <span className="ml-auto text-sm text-muted-foreground">
              aggiornato il {formatDate(nonRilasciato.aggiornato)}
            </span>
          </header>
          <div className="space-y-3 px-4 py-3">
            <Modifiche modifiche={nonRilasciato.modifiche} />
            <Migrazioni elenco={nonRilasciato.migrazioni} />
          </div>
        </section>
      )}

      {rilasci.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun rilascio registrato.
        </p>
      ) : (
        <ol className="space-y-4">
          {rilasci.map((r, i) => (
            <li key={r.versione} className="rounded-lg border">
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted px-4 py-2">
                <span className="font-semibold">{r.versione}</span>
                {i === 0 && <Badge variant="success">in produzione</Badge>}
                <span className="ml-auto text-sm text-muted-foreground">
                  {formatDate(r.data)}
                </span>
              </div>
              <div className="space-y-3 px-4 py-3">
                <Modifiche modifiche={r.modifiche} />
                <Migrazioni elenco={r.migrazioni} storico />
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        I rilasci prendono il nome dalla loro data (2026.09.15). Le modifiche
        sono divise per tipo: aggiunte, cambiamenti, correzioni, rimozioni e
        sicurezza.
      </p>
    </div>
  );
}

function Modifiche({ modifiche }: { modifiche: Modifica[] }) {
  const gruppi = perCategoria(modifiche);
  if (gruppi.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna modifica.</p>;
  }

  return (
    <dl className="space-y-3">
      {gruppi.map((g) => (
        <div key={g.categoria} className="flex flex-col gap-1.5 sm:flex-row sm:gap-3">
          <dt className="sm:w-28 sm:shrink-0">
            <Badge variant={TONO[g.categoria]}>{g.label}</Badge>
          </dt>
          <dd className="min-w-0">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {g.testi.map((t, k) => (
                <li key={k}>{t}</li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Le migration necessarie.
 *
 * Si applicano a mano, quindi vanno dette a chi pubblica invece di restare
 * nascoste nel codice: due guasti sono gia' passati di qui. Ma il senso cambia
 * a seconda di dove si legge, e con esso il tono.
 *
 * Sul non rilasciato e' una lista di controllo: c'e' un lavoro da fare prima di
 * pubblicare, e l'avviso serve a non dimenticarlo. Su un rilascio gia' online
 * quel lavoro e' fatto, e un triangolo giallo allarmerebbe per niente chi usa
 * l'app e non ha nessun database da toccare. Li' resta come storia, in una riga
 * sola: serve ancora a sapere cosa rilanciare ripristinando un backup vecchio o
 * preparando un ambiente da zero.
 */
function Migrazioni({ elenco, storico }: { elenco?: string[]; storico?: boolean }) {
  if (!elenco?.length) return null;

  if (storico) {
    return (
      <p className="text-xs text-muted-foreground">
        Ha richiesto interventi sul database: {elenco.join("; ")}.
      </p>
    );
  }

  return (
    <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <p className="font-medium">Richiede interventi sul database</p>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          {elenco.map((m, k) => (
            <li key={k}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
