"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

/**
 * Campo numerico "amichevole": accetta la virgola come separatore decimale
 * (che e' quello della tastiera italiana, mentre <input type="number"> a
 * seconda del browser la rifiuta) e su telefono apre la tastiera numerica.
 * Il valore resta una stringa: chi lo usa converte con parseNumero().
 */
export function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
>) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      className={cn(inputClass, className)}
    />
  );
}

/** Campo numerico con etichetta sopra, la forma usata nei form del modulo. */
export function NumberField({
  label,
  value,
  onChange,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <NumberInput value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

/**
 * Gruppo di schede accessibile: frecce e lettori di schermo si comportano
 * come su un vero tablist, non come su una fila di bottoni qualunque.
 */
export function TabBar<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition",
            value === t.value
              ? "bg-primary text-primary-foreground"
              : "border hover:bg-accent"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Interruttore on/off (es. i pasti da copiare): non e' una scheda, e' un toggle. */
export function ToggleChip({
  attivo,
  onClick,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition",
        attivo ? "bg-primary text-primary-foreground" : "border hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Bottone con la sola icona: area di tocco da 44 px (la soglia comoda su
 * telefono) ed etichetta per i lettori di schermo, non solo il tooltip.
 */
export function IconButton({
  label,
  onClick,
  children,
  tono = "neutro",
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tono?: "neutro" | "distruttivo";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent disabled:opacity-50",
        tono === "distruttivo" ? "hover:text-destructive" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
