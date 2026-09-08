/**
 * Palette derivata da un solo colore scelto dall'utente.
 *
 * L'app è già costruita su una tinta (il blu ~221°): sfondi, bordi e testi
 * secondari sono grigi virati verso quella tinta, con luminosità calibrate per
 * il tema chiaro e per quello scuro. Qui si tiene tutta quella calibrazione e
 * si sostituisce solo la **tonalità**, presa dal colore scelto: si ottiene un
 * tema coerente senza poter creare combinazioni illeggibili.
 *
 * Due accortezze:
 * - se il colore scelto è praticamente grigio, la palette diventa neutra
 *   invece di virare verso il rosso (tonalità 0 di un grigio);
 * - il testo sopra il colore d'accento viene scelto tra chiaro e scuro in base
 *   alla **luminosità** del colore: su un giallo il bianco sarebbe illeggibile.
 *
 * Rosso, verde e giallo di stato (errori, conferme, avvisi) non seguono la
 * tinta: devono restare riconoscibili.
 */

export interface ColorePreset {
  nome: string;
  hex: string;
}

/** Campioni pronti: il primo è il colore attuale dell'app. */
export const COLORI_PRESET: ColorePreset[] = [
  { nome: "Blu", hex: "#2563eb" },
  { nome: "Indaco", hex: "#4f46e5" },
  { nome: "Viola", hex: "#7c3aed" },
  { nome: "Fucsia", hex: "#c026d3" },
  { nome: "Rosso", hex: "#dc2626" },
  { nome: "Arancio", hex: "#ea580c" },
  { nome: "Ambra", hex: "#d97706" },
  { nome: "Verde", hex: "#16a34a" },
  { nome: "Verde acqua", hex: "#0d9488" },
  { nome: "Ciano", hex: "#0891b2" },
  { nome: "Grigio", hex: "#64748b" },
];

export interface Hsl {
  /** Tonalità in gradi, 0-360. */
  h: number;
  /** Saturazione 0-1. */
  s: number;
  /** Luminosità 0-1. */
  l: number;
}

/** Converte "#rrggbb" (o "rrggbb") in HSL; null se non è un colore valido. */
export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return [r1 + m, g1 + m, b1 + m];
}

/** Luminosità relativa secondo WCAG (0 = nero, 1 = bianco). */
export function luminanza(colore: Hsl): number {
  const lineare = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const [r, g, b] = hslToRgb(colore).map(lineare);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG tra due colori (1 = identici, 21 = nero/bianco). */
export function contrasto(a: Hsl, b: Hsl): number {
  const la = luminanza(a);
  const lb = luminanza(b);
  const [max, min] = la > lb ? [la, lb] : [lb, la];
  return (max + 0.05) / (min + 0.05);
}

export type ModoTema = "chiaro" | "scuro";

/** Sotto questa saturazione il colore scelto è considerato un grigio. */
const SOGLIA_NEUTRO = 0.1;

/**
 * Contrasto obiettivo: il minimo WCAG AA per il testo e' 4,5, ma le variabili
 * CSS arrotondano la luminosita' all'intero percentuale, che puo' mangiare un
 * decimo di contrasto. Si punta un filo piu' in alto per restare sopra la
 * soglia anche dopo l'arrotondamento.
 */
const CONTRASTO_MINIMO = 4.6;

function hsl(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/**
 * Sposta la luminosità di un colore, un punto per volta nella direzione
 * indicata, fino a raggiungere il contrasto minimo sullo sfondo dato.
 *
 * Serve perché la stessa luminosità rende in modo molto diverso a seconda
 * della tonalità: un verde al 47% è molto più luminoso di un blu al 47%, e a
 * tinta cambiata il testo secondario diventerebbe illeggibile. Così ogni
 * tonalità trova la propria luminosità invece di ereditare quella del blu.
 */
function perContrasto(
  colore: Hsl,
  sfondo: Hsl,
  verso: "piuScuro" | "piuChiaro",
  limite: number
): Hsl {
  const passo = verso === "piuScuro" ? -0.01 : 0.01;
  let corrente = { ...colore };
  for (let i = 0; i < 60; i++) {
    if (contrasto(corrente, sfondo) >= CONTRASTO_MINIMO) break;
    const l = corrente.l + passo;
    if (verso === "piuScuro" ? l < limite : l > limite) break;
    corrente = { ...corrente, l };
  }
  return corrente;
}

/**
 * Variabili CSS del tema per una tonalità, nella forma attesa da globals.css
 * ("H S% L%"). `neutro` azzera le saturazioni per i grigi.
 */
export function variabiliTema(
  hex: string,
  modo: ModoTema
): Record<string, string> | null {
  const scelto = hexToHsl(hex);
  if (!scelto) return null;

  const h = scelto.h;
  const m = scelto.s < SOGLIA_NEUTRO ? 0 : 1;

  // Coppie tonalità/saturazione/luminosità riprese dal tema originale.
  const chiaro = modo === "chiaro";
  const sfondo: Hsl = chiaro
    ? { h, s: 0.4 * m, l: 0.98 }
    : { h, s: 0.47 * m, l: 0.08 };

  // Il testo sopra il colore d'accento: si prende quello che stacca di più e,
  // se non basta, si sposta la luminosità dell'accento fino a farlo bastare
  // (su un giallo il bianco non diventa leggibile schiarendolo ancora).
  const testoChiaro: Hsl = { h, s: 0.4 * m, l: 0.98 };
  const testoScuro: Hsl = { h, s: 0.47 * m, l: 0.11 };
  const primaryBase: Hsl = chiaro
    ? { h, s: 0.83 * m, l: 0.53 }
    : { h, s: 0.91 * m, l: 0.6 };
  const suChiaro = contrasto(primaryBase, testoChiaro);
  const suScuro = contrasto(primaryBase, testoScuro);
  const primaryForeground = suChiaro >= suScuro ? testoChiaro : testoScuro;
  const primary = perContrasto(
    primaryBase,
    primaryForeground,
    // Col testo chiaro l'accento va scurito, col testo scuro schiarito.
    suChiaro >= suScuro ? "piuScuro" : "piuChiaro",
    suChiaro >= suScuro ? 0.3 : 0.8
  );

  // Il testo secondario cerca la luminosità che gli garantisce leggibilità.
  const secondario = perContrasto(
    chiaro ? { h, s: 0.16 * m, l: 0.47 } : { h, s: 0.2 * m, l: 0.65 },
    sfondo,
    chiaro ? "piuScuro" : "piuChiaro",
    chiaro ? 0.25 : 0.9
  );

  const vars: Record<string, string> = chiaro
    ? {
        background: hsl(h, 40 * m, 98),
        foreground: hsl(h, 47 * m, 11),
        card: "0 0% 100%",
        muted: hsl(h, 40 * m, 96),
        "muted-foreground": hsl(secondario.h, secondario.s * 100, secondario.l * 100),
        border: hsl(h, 32 * m, 91),
        accent: hsl(h, 40 * m, 94),
      }
    : {
        background: hsl(h, 47 * m, 8),
        foreground: hsl(h, 40 * m, 96),
        card: hsl(h, 40 * m, 12),
        muted: hsl(h, 30 * m, 16),
        "muted-foreground": hsl(secondario.h, secondario.s * 100, secondario.l * 100),
        border: hsl(h, 25 * m, 20),
        accent: hsl(h, 30 * m, 18),
      };

  vars.primary = hsl(primary.h, primary.s * 100, primary.l * 100);
  vars["primary-foreground"] = hsl(
    primaryForeground.h,
    primaryForeground.s * 100,
    primaryForeground.l * 100
  );

  return vars;
}

function blocco(selettore: string, vars: Record<string, string>): string {
  const righe = Object.entries(vars)
    .map(([k, v]) => `--${k}:${v};`)
    .join("");
  return `${selettore}{${righe}}`;
}

/**
 * CSS completo del colore scelto: sovrascrive le variabili di globals.css per
 * il tema chiaro e per quello scuro. Ritorna stringa vuota se il colore non è
 * valido, così l'app resta sui valori di default.
 */
export function cssTema(hex: string | null | undefined): string {
  if (!hex) return "";
  const chiaro = variabiliTema(hex, "chiaro");
  const scuro = variabiliTema(hex, "scuro");
  if (!chiaro || !scuro) return "";
  return blocco(":root", chiaro) + blocco(".dark", scuro);
}

/** Id dell'elemento <style> che porta il colore scelto, lato server e client. */
export const ID_STILE_TEMA = "tema-colore";
