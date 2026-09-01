"use client";

import {
  createContext,
  useCallback,
  useContext,
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

const DURATA_CON_AZIONE = 8000;
const DURATA_SEMPLICE = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const contatore = useRef(0);

  const chiudi = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostra = useCallback(
    (t: ToastInput) => {
      const id = ++contatore.current;
      setItems((prev) => [...prev, { ...t, id }]);
      setTimeout(
        () => chiudi(id),
        t.azione ? DURATA_CON_AZIONE : DURATA_SEMPLICE
      );
    },
    [chiudi]
  );

  return (
    <ToastContext.Provider value={mostra}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:bottom-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg",
              t.tono === "errore" && "border-destructive/40"
            )}
          >
            {t.tono === "errore" ? (
              <X className="h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-success" />
            )}
            <span className="min-w-0 flex-1">{t.messaggio}</span>
            {t.azione && (
              <button
                onClick={async () => {
                  chiudi(t.id);
                  await t.azione!.onClick();
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium transition hover:bg-accent"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {t.azione.label}
              </button>
            )}
            <button
              onClick={() => chiudi(t.id)}
              aria-label="Chiudi notifica"
              className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
