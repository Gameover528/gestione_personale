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
        primary: "hsl(var(--primary))",
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
    },
  },
  plugins: [],
};

export default config;
