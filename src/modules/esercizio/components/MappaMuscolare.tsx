import {
  POLIGONI_FRONTE,
  POLIGONI_RETRO,
  VIEWBOX,
  type GruppoPoligoni,
} from "../muscoli/poligoni";
import { NOME_MUSCOLO, type Muscolo } from "../muscoli/tipi";

/**
 * La figura umana con i muscoli lavorati accesi: primari nel colore d'accento,
 * secondari nella stessa tinta ma smorzata.
 *
 * I colori arrivano dalle variabili della palette (`--primary`, `--muted`,
 * `--border`), quindi la figura segue il tema chiaro/scuro e il colore scelto
 * dall'utente senza nessun colore fissato qui dentro.
 *
 * Le due viste non sono mai entrambe obbligatorie: si mostra il retro solo se
 * c'e' qualcosa da accendere, altrimenti una schiena grigia accanto al petto
 * occupa mezzo schermo per non dire niente.
 */

interface Props {
  primari: Muscolo[];
  secondari?: Muscolo[];
  /** Mostra sempre entrambe le viste, anche quella senza muscoli accesi. */
  entrambeLeViste?: boolean;
}

/** Quanto e' "acceso" un gruppo: decide il colore. */
type Intensita = "primario" | "secondario" | "spento";

function intensita(
  muscolo: Muscolo,
  primari: Muscolo[],
  secondari: Muscolo[]
): Intensita {
  if (primari.includes(muscolo)) return "primario";
  if (secondari.includes(muscolo)) return "secondario";
  return "spento";
}

const RIEMPIMENTO: Record<Intensita, string> = {
  primario: "hsl(var(--primary))",
  // Stessa tinta dei primari ma in secondo piano: si legge la gerarchia senza
  // introdurre un secondo colore che competerebbe con l'accento.
  secondario: "hsl(var(--primary) / 0.45)",
  spento: "hsl(var(--muted))",
};

function Figura({
  gruppi,
  primari,
  secondari,
  titolo,
}: {
  gruppi: GruppoPoligoni[];
  primari: Muscolo[];
  secondari: Muscolo[];
  titolo: string;
}) {
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <svg
        viewBox={VIEWBOX}
        role="img"
        aria-label={titolo}
        className="h-auto w-full max-w-[150px]"
      >
        {gruppi.map((g) => {
          const stato = intensita(g.muscolo, primari, secondari);
          return (
            <g key={g.muscolo}>
              {g.poligoni.map((punti, i) => (
                <polygon
                  key={i}
                  points={punti}
                  fill={RIEMPIMENTO[stato]}
                  stroke="hsl(var(--border))"
                  strokeWidth={0.3}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">{titolo}</figcaption>
    </figure>
  );
}

export function MappaMuscolare({
  primari,
  secondari = [],
  entrambeLeViste = false,
}: Props) {
  const accesi = [...primari, ...secondari];
  const haFronte = POLIGONI_FRONTE.some((g) => accesi.includes(g.muscolo));
  const haRetro = POLIGONI_RETRO.some((g) => accesi.includes(g.muscolo));

  // Se non si accende niente da nessuna parte mostriamo comunque il fronte:
  // una figura grigia dice "nessun muscolo registrato" meglio del vuoto.
  const mostraFronte = entrambeLeViste || haFronte || !haRetro;
  const mostraRetro = entrambeLeViste || haRetro;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-center gap-4">
        {mostraFronte && (
          <Figura
            gruppi={POLIGONI_FRONTE}
            primari={primari}
            secondari={secondari}
            titolo="Fronte"
          />
        )}
        {mostraRetro && (
          <Figura
            gruppi={POLIGONI_RETRO}
            primari={primari}
            secondari={secondari}
            titolo="Retro"
          />
        )}
      </div>

      <LegendaMuscoli primari={primari} secondari={secondari} />
    </div>
  );
}

/**
 * L'elenco scritto dei muscoli: la figura da sola non basta: i gruppi piccoli
 * (obliqui, adduttori) si distinguono male, e i nomi servono anche a chi usa
 * un lettore di schermo.
 */
function LegendaMuscoli({
  primari,
  secondari,
}: {
  primari: Muscolo[];
  secondari: Muscolo[];
}) {
  if (primari.length === 0 && secondari.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Nessun muscolo indicato per questo esercizio.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      {primari.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Principali:</span>
          {primari.map((m) => (
            <span
              key={m}
              className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
            >
              {NOME_MUSCOLO[m]}
            </span>
          ))}
        </div>
      )}
      {secondari.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Secondari:</span>
          {secondari.map((m) => (
            <span
              key={m}
              className="rounded bg-primary/25 px-2 py-0.5 text-xs font-medium"
            >
              {NOME_MUSCOLO[m]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
