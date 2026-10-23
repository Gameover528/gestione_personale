"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastAzione {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastInput {
  messaggio: string;
  /** Azione facoltativa, tipicamente un "Annulla" per operazioni distruttive. */
  azione?: ToastAzione;
  tono?: "ok" | "errore";
}

interface ToastItem extends ToastInput {
  id: number;
}

/**
 * Notifiche brevi in basso allo schermo. Servono soprattutto per le azioni
 * distruttive: invece di chiedere conferma prima (che rallenta ogni singola
 * eliminazione), l'operazione parte subito e il toast offre "Annulla".
 */
const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/*
  Quanto restano. Prima erano 8 e 4 secondi fissi, e il toast è l'unico modo
  di annullare una dozzina di cancellazioni che non chiedono conferma: chi
  legge piano, o deve trovare il pulsante, lo perdeva. Ora "Annulla" resta 10
  secondi, il tempo si ferma finché il dito, il mouse o il focus ci sono
  sopra, e gli errori non spariscono da soli (WCAG 2.2.1: un limite di tempo
  deve potersi fermare).
*/
const DURATA_CON_AZIONE = 10000;
const DURATA_SEMPLICE = 5000;
/** Quanto dura l'uscita: la stessa dell'animazione "esce-basso" in tailwind.config.ts. */
const DURATA_USCITA = 150;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const contatore = useRef(0);

  const chiudi = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostra = useCallback((t: ToastInput) => {
    const id = ++contatore.current;
    setItems((prev) => [...prev, { ...t, id }]);
  }, []);

  const errori = items.filter((t) => t.tono === "errore");
  const altri = items.filter((t) => t.tono !== "errore");

  return (
    <ToastContext.Provider value={mostra}>
      {children}
      {/*
        Sopra la barra in basso e sopra l'area sicura dell'iPhone. Due regioni
        sempre presenti: gli errori in una "alert", che i lettori di schermo
        annunciano subito, il resto in una "polite". Prima passavano tutti
        dalla stessa regione cortese, errori compresi.
      */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 lg:bottom-4">
        <div role="alert" className="flex w-full flex-col items-center gap-2">
          {errori.map((t) => (
            <VoceToast key={t.id} t={t} onChiudi={() => chiudi(t.id)} />
          ))}
        </div>
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col items-center gap-2">
          {altri.map((t) => (
            <VoceToast key={t.id} t={t} onChiudi={() => chiudi(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Un toast, col suo tempo. Il conto alla rovescia si ferma per ogni motivo
 * attivo — puntatore sopra, focus dentro — e riparte solo quando non ne resta
 * nessuno: se tolgo il dito ma il focus è ancora sul pulsante, deve restare.
 */
function VoceToast({ t, onChiudi }: { t: ToastItem; onChiudi: () => void }) {
  const durata = t.tono === "errore" ? null : t.azione ? DURATA_CON_AZIONE : DURATA_SEMPLICE;
  const restante = useRef(durata ?? 0);
  const partito = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const motivi = useRef(new Set<string>());
  const [uscita, setUscita] = useState(false);
  // Anche in un ref: il timer tiene la versione di chiudi della comparsa.
  const inUscita = useRef(false);

  /*
    Prima di sparire scivola giù per un attimo: sparendo di colpo, chi aveva
    lo sguardo altrove non capiva se il toast c'era stato. Con il movimento
    ridotto si chiude subito, come prima.
  */
  const chiudi = useCallback(() => {
    if (inUscita.current) return;
    inUscita.current = true;
    window.clearTimeout(timer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onChiudi();
      return;
    }
    setUscita(true);
    window.setTimeout(onChiudi, DURATA_USCITA);
  }, [onChiudi]);

  const avvia = useCallback(() => {
    if (durata === null) return;
    window.clearTimeout(timer.current);
    partito.current = Date.now();
    timer.current = window.setTimeout(chiudi, restante.current);
  }, [durata, chiudi]);

  const pausa = (motivo: string) => {
    if (durata === null) return;
    if (motivi.current.size === 0) {
      window.clearTimeout(timer.current);
      // Mai meno di un secondo e mezzo alla ripresa: chi ha appena tolto il
      // dito deve fare in tempo a vedere che c'era ancora.
      restante.current = Math.max(1500, restante.current - (Date.now() - partito.current));
    }
    motivi.current.add(motivo);
  };

  const riprendi = (motivo: string) => {
    if (!motivi.current.delete(motivo)) return;
    if (motivi.current.size === 0) avvia();
  };

  useEffect(() => {
    avvia();
    return () => window.clearTimeout(timer.current);
    // Il timer parte una volta sola, alla comparsa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onPointerEnter={() => pausa("puntatore")}
      onPointerLeave={() => riprendi("puntatore")}
      onFocus={() => pausa("focus")}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) riprendi("focus");
      }}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg",
        uscita ? "motion-safe:animate-esce-basso" : "motion-safe:animate-entra-basso",
        t.tono === "errore" && "border-destructive/40"
      )}
    >
      {t.tono === "errore" ? (
        <X className="h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <Check className="h-4 w-4 shrink-0 text-success-testo" />
      )}
      <span className="min-w-0 flex-1">{t.messaggio}</span>
      {t.azione && (
        <button
          onClick={async () => {
            chiudi();
            await t.azione!.onClick();
          }}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 font-medium transition hover:bg-accent lg:min-h-0 lg:py-1.5"
        >
          <Undo2 className="h-3.5 w-3.5" />
          {t.azione.label}
        </button>
      )}
      <button
        onClick={chiudi}
        aria-label="Chiudi notifica"
        title="Chiudi notifica"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground lg:h-7 lg:w-7"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
