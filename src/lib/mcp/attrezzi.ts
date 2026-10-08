import { getDb } from "@/lib/cf";
import { oggiIso, spostaGiorno } from "@/lib/utils";

/**
 * Gli attrezzi che una chat può usare sull'app, per ora solo in lettura.
 *
 * Stretti di proposito: uno per domanda, con i campi dichiarati. La tentazione
 * sarebbe esporre un attrezzo solo che accetta una query — comodissimo, e la
 * cosa peggiore che si possa dare a un modello che legge testo scritto da
 * altri. Qui il massimo che può succedere è leggere i propri dati.
 *
 * Non passano dalle Server Action del resto dell'app: quelle ricavano l'utente
 * dal cookie di sessione, e qui di cookie non ce n'è. L'utente arriva da chi
 * chiama, già risolto.
 */

export interface Attrezzo {
  nome: string;
  titolo: string;
  descrizione: string;
  /** Vero se modifica qualcosa: serve a non mostrarlo a chi ha solo lettura. */
  scrive?: boolean;
  schema: Record<string, unknown>;
  esegui: (
    userId: string,
    argomenti: Record<string, unknown>
  ) => Promise<{ testo: string; dati: unknown }>;
}

/** Legge un intero di `argomenti`, con minimo, massimo e valore di ripiego. */
function intero(
  argomenti: Record<string, unknown>,
  chiave: string,
  ripiego: number,
  min: number,
  max: number
): number {
  const v = Number(argomenti[chiave]);
  if (!Number.isFinite(v)) return ripiego;
  return Math.min(max, Math.max(min, Math.round(v)));
}

const GIORNO = /^\d{4}-\d{2}-\d{2}$/;

function giornoValido(argomenti: Record<string, unknown>, chiave: string): string | null {
  const v = argomenti[chiave];
  return typeof v === "string" && GIORNO.test(v) ? v : null;
}

const fmt1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

// ----------------------------- Diario -----------------------------

interface RigaDiario {
  data: string;
  pasto: string;
  nome_alimento: string;
  marca: string | null;
  quantita_g: number;
  kcal: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
}

const diario: Attrezzo = {
  nome: "leggi_diario",
  titolo: "Diario alimentare",
  descrizione:
    "Legge cosa è stato mangiato, pasto per pasto, con i totali di calorie e macronutrienti per ogni giorno. Senza argomenti restituisce oggi.",
  schema: {
    type: "object",
    properties: {
      data: {
        type: "string",
        description:
          "Giorno da leggere, nel formato AAAA-MM-GG. Se non indicato, oggi.",
      },
      giorni: {
        type: "number",
        description:
          "Quanti giorni leggere all'indietro a partire da `data` compreso. Da 1 a 90, di norma 1.",
      },
    },
  },
  async esegui(userId, argomenti) {
    const fine = giornoValido(argomenti, "data") ?? oggiIso();
    const giorni = intero(argomenti, "giorni", 1, 1, 90);
    const inizio = spostaGiorno(fine, -(giorni - 1));

    const { results } = await getDb()
      .prepare(
        `select data, pasto, nome_alimento, marca, quantita_g,
                quantita_g * kcal_100        / 100 as kcal,
                quantita_g * proteine_100    / 100 as proteine,
                quantita_g * carboidrati_100 / 100 as carboidrati,
                quantita_g * grassi_100      / 100 as grassi
           from diario_pasti
          where user_id = ? and data >= ? and data <= ?
          order by data asc, created_at asc`
      )
      .bind(userId, inizio, fine)
      .all<RigaDiario>();

    const righe = results ?? [];
    if (righe.length === 0) {
      return {
        testo:
          giorni === 1
            ? `Il ${fine} non risulta niente di segnato.`
            : `Dal ${inizio} al ${fine} non risulta niente di segnato.`,
        dati: { inizio, fine, giorni: [] },
      };
    }

    // Raggruppate per giorno: è il modo in cui la domanda viene posta
    // ("ieri cosa ho mangiato?"), e tiene i totali accanto alle righe che li
    // compongono invece di lasciarli da sommare a chi legge.
    const perGiorno = new Map<string, RigaDiario[]>();
    for (const r of righe) {
      const arr = perGiorno.get(r.data) ?? [];
      arr.push(r);
      perGiorno.set(r.data, arr);
    }

    const pezzi: string[] = [];
    const dati: unknown[] = [];

    for (const [data, voci] of perGiorno) {
      const tot = voci.reduce(
        (a, v) => ({
          kcal: a.kcal + Number(v.kcal),
          proteine: a.proteine + Number(v.proteine),
          carboidrati: a.carboidrati + Number(v.carboidrati),
          grassi: a.grassi + Number(v.grassi),
        }),
        { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 }
      );

      pezzi.push(
        `${data} — ${Math.round(tot.kcal)} kcal · P ${fmt1(tot.proteine)} g · C ${fmt1(tot.carboidrati)} g · G ${fmt1(tot.grassi)} g\n` +
          voci
            .map(
              (v) =>
                `  · ${v.pasto}: ${v.nome_alimento}${v.marca ? ` (${v.marca})` : ""}, ${Math.round(Number(v.quantita_g))} g, ${Math.round(Number(v.kcal))} kcal`
            )
            .join("\n")
      );

      dati.push({
        data,
        totali: {
          kcal: Math.round(tot.kcal),
          proteine: Number(fmt1(tot.proteine)),
          carboidrati: Number(fmt1(tot.carboidrati)),
          grassi: Number(fmt1(tot.grassi)),
        },
        voci: voci.map((v) => ({
          pasto: v.pasto,
          alimento: v.nome_alimento,
          marca: v.marca,
          grammi: Math.round(Number(v.quantita_g)),
          kcal: Math.round(Number(v.kcal)),
        })),
      });
    }

    return { testo: pezzi.join("\n\n"), dati: { inizio, fine, giorni: dati } };
  },
};

// ------------------------------ Peso ------------------------------

interface RigaPeso {
  data: string;
  peso_kg: number;
  nota: string | null;
}

const peso: Attrezzo = {
  nome: "leggi_peso",
  titolo: "Registro del peso",
  descrizione:
    "Legge le pesate registrate nel periodo, dalla più vecchia alla più recente, con la variazione fra la prima e l'ultima.",
  schema: {
    type: "object",
    properties: {
      giorni: {
        type: "number",
        description:
          "Quanti giorni indietro guardare a partire da oggi. Da 1 a 1825, di norma 90.",
      },
    },
  },
  async esegui(userId, argomenti) {
    const giorni = intero(argomenti, "giorni", 90, 1, 1825);
    const inizio = spostaGiorno(oggiIso(), -(giorni - 1));

    const { results } = await getDb()
      .prepare(
        `select data, peso_kg, nota from pesi
          where user_id = ? and data >= ?
          order by data asc`
      )
      .bind(userId, inizio)
      .all<RigaPeso>();

    const righe = (results ?? []).map((r) => ({
      data: r.data,
      peso_kg: Number(r.peso_kg),
      nota: r.nota,
    }));

    if (righe.length === 0) {
      return {
        testo: `Nessuna pesata registrata negli ultimi ${giorni} giorni.`,
        dati: { giorni, pesate: [], variazione_kg: null },
      };
    }

    const prima = righe[0];
    const ultima = righe[righe.length - 1];
    const delta = ultima.peso_kg - prima.peso_kg;

    const testa =
      righe.length === 1
        ? `Una sola pesata: ${fmt1(ultima.peso_kg)} kg il ${ultima.data}.`
        : `${righe.length} pesate, da ${fmt1(prima.peso_kg)} kg il ${prima.data} a ${fmt1(ultima.peso_kg)} kg il ${ultima.data} (${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmt1(Math.abs(delta))} kg).`;

    return {
      testo:
        testa +
        "\n" +
        righe
          .map((r) => `  · ${r.data}: ${fmt1(r.peso_kg)} kg${r.nota ? ` — ${r.nota}` : ""}`)
          .join("\n"),
      dati: {
        giorni,
        pesate: righe,
        variazione_kg: righe.length > 1 ? Number(fmt1(delta)) : null,
      },
    };
  },
};

// --------------------------- Cerca fra le proprie cose ---------------------------

interface RigaTrovata {
  nome: string;
  marca: string | null;
  kcal_100: number;
  proteine_100: number;
  carboidrati_100: number;
  grassi_100: number;
  fibre_100: number;
  quanta: number;
}

const cerca: Attrezzo = {
  nome: "cerca_alimento",
  titolo: "Cerca fra i tuoi alimenti",
  descrizione:
    "Cerca per nome fra gli alimenti che hai già segnato in passato, e restituisce i loro valori per 100 g. Usalo prima di aggiungere qualcosa al diario: i valori che torna sono quelli che hai già verificato tu, mentre inventarli è il modo più facile di sbagliare.",
  schema: {
    type: "object",
    required: ["testo"],
    properties: {
      testo: { type: "string", description: "Parte del nome da cercare." },
    },
  },
  async esegui(userId, argomenti) {
    const q = String(argomenti.testo ?? "").trim();
    if (q.length < 2) {
      return { testo: "Scrivi almeno due lettere.", dati: { risultati: [] } };
    }

    /*
      Si cerca nello storico del diario, non in un catalogo: quello che hai già
      mangiato è esattamente quello che probabilmente stai per rimangiare, e
      sono valori che a suo tempo hai scelto tu. Si raggruppa per nome perché
      lo stesso alimento compare decine di volte, e si ordina per quante.
    */
    const { results } = await getDb()
      .prepare(
        `select nome_alimento as nome, marca,
                max(kcal_100) as kcal_100, max(proteine_100) as proteine_100,
                max(carboidrati_100) as carboidrati_100, max(grassi_100) as grassi_100,
                max(fibre_100) as fibre_100, count(*) as quanta
           from diario_pasti
          where user_id = ? and lower(nome_alimento) like ?
          group by lower(nome_alimento), coalesce(marca,'')
          order by quanta desc
          limit 10`
      )
      .bind(userId, `%${q.toLowerCase()}%`)
      .all<RigaTrovata>();

    const righe = results ?? [];
    if (righe.length === 0) {
      return {
        testo: `Niente che somigli a "${q}" fra quello che hai già segnato. Se vuoi aggiungerlo lo stesso, servono i valori per 100 g presi dall'etichetta: calorie, proteine, carboidrati e grassi, e devono tornare fra loro.`,
        dati: { risultati: [] },
      };
    }

    return {
      testo: righe
        .map(
          (r) =>
            `· ${r.nome}${r.marca ? ` (${r.marca})` : ""} — per 100 g: ${Math.round(Number(r.kcal_100))} kcal, P ${fmt1(Number(r.proteine_100))}, C ${fmt1(Number(r.carboidrati_100))}, G ${fmt1(Number(r.grassi_100))} · segnato ${r.quanta} ${r.quanta === 1 ? "volta" : "volte"}`
        )
        .join("\n"),
      dati: {
        risultati: righe.map((r) => ({
          nome: r.nome,
          marca: r.marca,
          kcal_100: Number(r.kcal_100),
          proteine_100: Number(r.proteine_100),
          carboidrati_100: Number(r.carboidrati_100),
          grassi_100: Number(r.grassi_100),
          fibre_100: Number(r.fibre_100),
        })),
      },
    };
  },
};

export const ATTREZZI: Attrezzo[] = [diario, peso, cerca];
