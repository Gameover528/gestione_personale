import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        // primary per riempire; come testo (link, voce attiva) primary-testo,
        // per anelli di focus e contorni di stato primary-anello: vedi palette.ts.
        primary: {
          DEFAULT: "hsl(var(--primary))",
          testo: "hsl(var(--primary-testo))",
          anello: "hsl(var(--primary-anello))",
        },
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        destructive: "hsl(var(--destructive))",
        success: { DEFAULT: "hsl(var(--success))", testo: "hsl(var(--success-testo))" },
        warning: { DEFAULT: "hsl(var(--warning))", testo: "hsl(var(--warning-testo))" },
        // Le serie dei grafici (vedi globals.css): mai primary né gli stati.
        serie: { 1: "hsl(var(--serie-1))", 2: "hsl(var(--serie-2))", 3: "hsl(var(--serie-3))" },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
      },
      /*
        Movimento: solo dove dice cosa sta succedendo (un toast che arriva e se
        ne va, una finestra che si apre, una barra che si riempie coi dati
        appena arrivati). Mai oltre i 250 ms, niente rimbalzi. Si usano sempre
        con motion-safe:, così chi ha chiesto meno movimento al sistema vede
        l'app ferma come prima.
      */
      keyframes: {
        "entra-basso": {
          from: { opacity: "0", transform: "translateY(0.5rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "esce-basso": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(0.5rem)" },
        },
        "modale-entra": {
          from: { opacity: "0", transform: "translateY(0.5rem) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "foglio-su": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "velo-entra": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        riempi: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
      },
      animation: {
        "entra-basso": "entra-basso 200ms ease-out",
        // forwards: resta trasparente fino a quando il toast viene smontato.
        "esce-basso": "esce-basso 150ms ease-in forwards",
        "modale-entra": "modale-entra 200ms ease-out",
        "foglio-su": "foglio-su 250ms cubic-bezier(0.32, 0.72, 0, 1)",
        "velo-entra": "velo-entra 200ms ease-out",
        riempi: "riempi 250ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
