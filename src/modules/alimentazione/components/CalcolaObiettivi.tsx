"use client";

import { useState } from "react";
import { saveDatiCorporei } from "../queries";
import {
  ATTIVITA,
  OBIETTIVI_PESO,
  obiettiviProposti,
  type DatiCorporei,
} from "../types";
import { NumberField, inputClass } from "@/core/components/controls";
import { Calculator } from "lucide-react";
import { parseNumero } from "@/lib/utils";

const VUOTI = { eta: "", peso: "", altezza: "" };

/**
 * Propone gli obiettivi partendo da peso, altezza, età e attività: senza
 * questo aiuto la pagina degli obiettivi è una fila di campi a zero, e chi
 * non conosce già i propri numeri la salta (lasciando mezza app grigia).
 */
export function CalcolaObiettivi({
  iniziali,
  onProposta,
}: {
  iniziali: DatiCorporei | null;
  onProposta: (proposta: ReturnType<typeof obiettiviProposti>) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [sesso, setSesso] = useState<DatiCorporei["sesso"]>(
    iniziali?.sesso ?? "uomo"
  );
  const [obiettivo, setObiettivo] = useState<DatiCorporei["obiettivo"]>(
    iniziali?.obiettivo ?? "mantenere"
  );
  const [attivita, setAttivita] = useState(String(iniziali?.attivita ?? 1.375));
  const [campi, setCampi] = useState(
    iniziali
      ? {
          eta: String(iniziali.eta),
          peso: String(iniziali.peso_kg),
          altezza: String(iniziali.altezza_cm),
        }
      : VUOTI
  );
  const [errore, setErrore] = useState<string | null>(null);

  const dati: DatiCorporei = {
    sesso,
    eta: parseNumero(campi.eta),
    peso_kg: parseNumero(campi.peso),
    altezza_cm: parseNumero(campi.altezza),
    attivita: parseNumero(attivita) || 1.2,
    obiettivo,
  };
  const completo =
    dati.eta > 0 && dati.peso_kg > 0 && dati.altezza_cm > 0;
  const proposta = completo ? obiettiviProposti(dati) : null;

  async function applica() {
    if (!proposta) {
      setErrore("Compila età, peso e altezza.");
      return;
    }
    setErrore(null);
    onProposta(proposta);
    // I dati restano salvati tra le preferenze: la prossima volta il
    // calcolo è già compilato.
    try {
      await saveDatiCorporei(dati);
    } catch {
      // se non riusciamo a salvare le preferenze la proposta resta valida
    }
  }

  if (!aperto) {
    return (
      <button
        onClick={() => setAperto(true)}
        className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
      >
        <Calculator className="h-4 w-4" />
        {iniziali ? "Ricalcola dai miei dati" : "Non sai che valori mettere? Calcolali"}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Calcolo dei valori consigliati</p>
          <p className="text-xs text-muted-foreground">
            Stima di partenza (Mifflin-St Jeor): correggila dopo qualche
            settimana in base a come reagisci.
          </p>
        </div>
        <button
          onClick={() => setAperto(false)}
          className="text-sm text-primary hover:underline"
        >
          chiudi
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sesso</span>
          <select
            value={sesso}
            onChange={(e) => setSesso(e.target.value as DatiCorporei["sesso"])}
            className={inputClass}
          >
            <option value="uomo">Uomo</option>
            <option value="donna">Donna</option>
          </select>
        </label>
        <NumberField
          label="Età (anni)"
          value={campi.eta}
          onChange={(v) => setCampi((p) => ({ ...p, eta: v }))}
        />
        <NumberField
          label="Peso (kg)"
          value={campi.peso}
          onChange={(v) => setCampi((p) => ({ ...p, peso: v }))}
        />
        <NumberField
          label="Altezza (cm)"
          value={campi.altezza}
          onChange={(v) => setCampi((p) => ({ ...p, altezza: v }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Attività fisica</span>
          <select
            value={attivita}
            onChange={(e) => setAttivita(e.target.value)}
            className={inputClass}
          >
            {ATTIVITA.map((a) => (
              <option key={a.valore} value={a.valore}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Obiettivo</span>
          <select
            value={obiettivo}
            onChange={(e) =>
              setObiettivo(e.target.value as DatiCorporei["obiettivo"])
            }
            className={inputClass}
          >
            {OBIETTIVI_PESO.map((o) => (
              <option key={o.valore} value={o.valore}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {proposta && (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <span className="font-semibold">{proposta.kcal} kcal</span>{" "}
          <span className="text-muted-foreground">
            · proteine {proposta.proteine} g · carboidrati{" "}
            {proposta.carboidrati} g · grassi {proposta.grassi} g · fibre{" "}
            {proposta.fibre} g
          </span>
        </div>
      )}

      {errore && <p className="text-sm text-destructive">{errore}</p>}

      <button
        onClick={applica}
        disabled={!proposta}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        Usa questi valori
      </button>
      <p className="text-xs text-muted-foreground">
        I valori finiscono nei campi qui sotto: puoi modificarli prima di
        salvare.
      </p>
    </div>
  );
}
