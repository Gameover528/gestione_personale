/** Concatena classi condizionali (mini clsx). */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const currencyFmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatCurrency(value: number | null | undefined) {
  return currencyFmt.format(value ?? 0);
}

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return dateFmt.format(d);
}

/** Numero di giorni da oggi (negativo = scaduta). */
export function daysUntil(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Converte in numero il testo di un campo numerico, accettando la virgola
 * come separatore decimale (su tastiera italiana e' quello che si digita).
 * Ritorna 0 se il testo non e' un numero.
 */
export function parseNumero(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const x = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

/**
 * Fuso orario di riferimento dell'app. Serve perche' "oggi" va deciso in ora
 * locale: il Worker gira in UTC, quindi con new Date().toISOString() tra
 * mezzanotte e le 2 (ora italiana d'estate) "oggi" risulterebbe il giorno
 * prima — e uno spuntino di mezzanotte finirebbe nel giorno sbagliato.
 */
export const FUSO_ORARIO = "Europe/Rome";

// "sv-SE" formatta le date come YYYY-MM-DD, che e' il formato usato su database.
const isoFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: FUSO_ORARIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** La data di oggi (YYYY-MM-DD) nel fuso dell'app, uguale su server e client. */
export function oggiIso(): string {
  return isoFmt.format(new Date());
}

/** Sposta una data YYYY-MM-DD di N giorni (N negativo = indietro). */
export function spostaGiorno(giorno: string, delta: number): string {
  const d = new Date(`${giorno}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
