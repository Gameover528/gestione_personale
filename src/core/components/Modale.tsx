"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Una finestra sopra la pagina, per un compito che inizia e finisce.
 *
 * Serve quando quello che si sta facendo è una parentesi: copiare un giorno,
 * sistemare gli obiettivi, creare un piatto. Il pannello che si apriva dentro
 * la pagina spingeva in basso tutto il resto e faceva perdere il punto in cui
 * si era; una pagina a sé faceva perdere la pagina.
 *
 * Non è la risposta a "sei sicuro?": per quello c'è il toast con Annulla (vedi
 * Toast.tsx), che non ferma nessuno e si può disfare.
 *
 * Lo stesso involucro era già scritto a mano tre volte (pannello dei widget,
 * menu a tendina del telefono, avviso dei doppioni), ogni copia con un pezzo in
 * meno: l'ultima si era persa la chiusura con Esc. Qui sta in un posto solo.
 */
export function Modale({
  titolo,
  sottotitolo,
  icona: Icona,
  larghezza = "media",
  onChiudi,
  children,
}: {
  titolo: string;
  sottotitolo?: string;
  icona?: LucideIcon;
  /** Quanto può crescere in larghezza su schermo grande. */
  larghezza?: "stretta" | "media" | "larga";
  onChiudi: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onChiudi();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onChiudi]);

  // Blocca lo scorrimento di quello che sta sotto: senza, su telefono il dito
  // che scorre dentro la finestra trascina la pagina dietro e si perde il
  // segno. Il valore precedente si rimette com'era, invece di forzare "auto":
  // le finestre possono sovrapporsi e l'ultima che chiude non deve decidere
  // per tutte.
  useEffect(() => {
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedente;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      {/*
        Il fondale è un vero <button> e non un <div> con onClick: così chiudere
        è raggiungibile anche da tastiera, senza inventare un gestore a parte.
      */}
      <button
        aria-label="Chiudi"
        onClick={onChiudi}
        className="fixed inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        className={cn(
          "relative my-4 w-full rounded-lg border bg-card p-4 shadow-xl sm:p-6",
          larghezza === "stretta" && "max-w-md",
          larghezza === "media" && "max-w-xl",
          larghezza === "larga" && "max-w-3xl"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              {Icona && <Icona className="h-5 w-5" />}
              {titolo}
            </h2>
            {sottotitolo && (
              <p className="mt-1 text-sm text-muted-foreground">{sottotitolo}</p>
            )}
          </div>
          <button
            onClick={onChiudi}
            aria-label="Chiudi"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
