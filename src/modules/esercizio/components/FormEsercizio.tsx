"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { creaEsercizio } from "../queries";
import { MUSCOLI, NOME_MUSCOLO, type Muscolo } from "../muscoli/tipi";
import { MappaMuscolare } from "./MappaMuscolare";
import { nomeAttrezzo } from "../types";
import {
  inputClass,
  bottoneClass,
  bottonePrimarioClass,
} from "@/core/components/controls";
import { Card, CardTitle } from "@/core/components/ui";

/** Attrezzi proposti: gli stessi nomi usati dal catalogo, così i MET combaciano. */
const ATTREZZI = [
  "body weight",
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "leverage machine",
  "smith machine",
  "band",
  "medicine ball",
  "stability ball",
  "stationary bike",
  "elliptical machine",
  "rope",
];

/**
 * Creazione di un esercizio personale.
 *
 * I muscoli si scelgono dai 22 gruppi che la mappa sa disegnare invece di
 * scriverli a mano: un nome libero non si illuminerebbe, e l'anteprima qui
 * accanto mostra subito il risultato mentre si seleziona.
 */
export function FormEsercizio() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [primari, setPrimari] = useState<Muscolo[]>([]);
  const [secondari, setSecondari] = useState<Muscolo[]>([]);
  const [attrezzo, setAttrezzo] = useState("");
  const [note, setNote] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  /**
   * Un muscolo sta in un elenco solo: sceglierlo come principale lo toglie dai
   * secondari e viceversa, altrimenti la mappa lo accenderebbe due volte e
   * vincerebbe l'intensità sbagliata.
   */
  function scegli(m: Muscolo, dove: "primari" | "secondari") {
    if (dove === "primari") {
      setSecondari((s) => s.filter((x) => x !== m));
      setPrimari((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
    } else {
      setPrimari((p) => p.filter((x) => x !== m));
      setSecondari((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
    }
  }

  async function salva() {
    if (!nome.trim()) {
      setErrore("Il nome è obbligatorio.");
      return;
    }
    if (primari.length === 0) {
      setErrore("Scegli almeno un muscolo principale.");
      return;
    }
    setErrore(null);
    setInCorso(true);
    try {
      await creaEsercizio({
        nome: nome.trim(),
        muscoli: primari,
        muscoli_secondari: secondari,
        attrezzo: attrezzo || null,
        note: note.trim() || null,
      });
      router.push("/esercizio/miei");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Che esercizio è</CardTitle>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Panca piana con bilanciere"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Attrezzo</span>
              <select
                value={attrezzo}
                onChange={(e) => setAttrezzo(e.target.value)}
                className={inputClass}
              >
                <option value="">Nessuno / non indicato</option>
                {ATTREZZI.map((a) => (
                  <option key={a} value={a}>
                    {nomeAttrezzo(a)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                Serve anche a stimare le calorie: da qui si ricava l&apos;impegno
                dell&apos;esercizio.
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Note (facoltative)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Presa larga, fermo un secondo al petto"
                className={inputClass}
              />
            </label>
          </div>
        </Card>

        <Card>
          <CardTitle>Muscoli principali</CardTitle>
          <SceltaMuscoli
            selezionati={primari}
            onScegli={(m) => scegli(m, "primari")}
          />
        </Card>

        <Card>
          <CardTitle>Muscoli secondari</CardTitle>
          <SceltaMuscoli
            selezionati={secondari}
            onScegli={(m) => scegli(m, "secondari")}
          />
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-4">
        <Card>
          <CardTitle>Anteprima</CardTitle>
          <div className="mt-3">
            <MappaMuscolare primari={primari} secondari={secondari} />
          </div>
        </Card>

        {errore && <p className="text-sm text-destructive">{errore}</p>}

        <div className="flex gap-2">
          <button
            onClick={salva}
            disabled={inCorso}
            className={bottonePrimarioClass}
          >
            {inCorso ? "Salvo…" : "Salva esercizio"}
          </button>
          <button
            onClick={() => router.push("/esercizio/miei")}
            className={bottoneClass}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

function SceltaMuscoli({
  selezionati,
  onScegli,
}: {
  selezionati: Muscolo[];
  onScegli: (m: Muscolo) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {MUSCOLI.map((m) => {
        const attivo = selezionati.includes(m);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={attivo}
            onClick={() => onScegli(m)}
            className={`inline-flex min-h-11 items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition lg:min-h-0 ${
              attivo
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {attivo && <Check className="h-3.5 w-3.5" />}
            {NOME_MUSCOLO[m]}
          </button>
        );
      })}
    </div>
  );
}
