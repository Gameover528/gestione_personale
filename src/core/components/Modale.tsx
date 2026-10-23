"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Il comportamento comune a ogni finestra sopra la pagina, su un <dialog>
 * nativo aperto con showModal().
 *
 * PERCHÉ <dialog>. Prima le finestre erano un <div role="dialog"> sopra un
 * velo: il focus restava sulla pagina sotto, Tab proseguiva dietro il velo,
 * alla chiusura il focus non tornava al pulsante da cui si era partiti, e il
 * primo elemento raggiungibile da tastiera era il velo stesso. showModal() dà
 * da sé le cose difficili: il focus entra nella finestra, la pagina sotto
 * diventa inerte (né Tab né lettori di schermo ci arrivano), Esc chiude.
 *
 * Quello che resta da fare a mano, ed è qui:
 *  - Esc e il tocco sul velo non chiudono il <dialog> da soli ma chiamano
 *    onChiudi: è chi usa la finestra a decidere quando smontarla;
 *  - il focus torna all'elemento che l'aveva prima dell'apertura (il
 *    ripristino del browser non è affidabile ovunque quando l'elemento viene
 *    smontato invece che chiuso);
 *  - lo scorrimento della pagina sotto si blocca, che showModal non fa.
 *
 * Il velo è il ::backdrop del <dialog>; il tocco sul velo arriva come clic sul
 * <dialog> stesso (non su un figlio), ed è così che lo si riconosce.
 */
export function useDialogoModale(onChiudi: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const chiudi = useRef(onChiudi);
  chiudi.current = onChiudi;

  // Layout effect: si apre prima che la pagina venga disegnata, così non si
  // vede un istante la finestra fuori posto.
  useLayoutEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const prima = document.activeElement as HTMLElement | null;
    if (!dialogo.open) dialogo.showModal();

    const annulla = (e: Event) => {
      e.preventDefault(); // niente chiusura nativa: decide onChiudi
      chiudi.current();
    };
    dialogo.addEventListener("cancel", annulla);

    return () => {
      dialogo.removeEventListener("cancel", annulla);
      if (dialogo.open) dialogo.close();
      // Il focus torna dove era, se quell'elemento c'è ancora.
      if (prima && prima.isConnected) prima.focus();
    };
  }, []);

  useEffect(() => {
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedente;
    };
  }, []);

  /** Da mettere su onClick del <dialog>: chiude solo se il tocco è sul velo. */
  const onClickVelo = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) chiudi.current();
  };

  return { ref, onClickVelo };
}

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
  const { ref, onClickVelo } = useDialogoModale(onChiudi);

  return (
    /*
      Il <dialog> occupa tutto lo schermo ed è lui a scorrere: su telefono una
      finestra più alta dello schermo si legge scorrendo, come prima. Il suo
      riempimento (p-4) è "velo": un tocco lì chiude, uno sul pannello no.
    */
    <dialog
      ref={ref}
      onClick={onClickVelo}
      aria-label={titolo}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-transparent p-4 text-foreground backdrop:bg-black/50 motion-safe:backdrop:animate-velo-entra sm:p-6"
    >
      <div
        className={cn(
          "relative mx-auto my-4 w-full rounded-lg border bg-card p-4 shadow-xl motion-safe:animate-modale-entra sm:p-6",
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
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi"
            title="Chiudi"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground lg:h-9 lg:w-9"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </dialog>
  );
}
