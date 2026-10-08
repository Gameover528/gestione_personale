import { getDb } from "@/lib/cf";
import { oggiIso } from "@/lib/utils";
import { valida, messaggioProblemi } from "@/modules/alimentazione/validazione";
import type { Attrezzo } from "./attrezzi";

/**
 * Gli attrezzi che modificano. Tre regole, e nessuna è decorativa.
 *
 * 1. NON SI INVENTANO I NUMERI. Per aggiungere un alimento che non esiste
 *    ancora bisogna dichiarare anche proteine, carboidrati e grassi, e devono
 *    tornare con le calorie entro il 10% — lo stesso controllo che l'app fa
 *    già sui dati di Open Food Facts, tarato su 153 prodotti veri. Un modello
 *    che tira a indovinare sbaglia proprio lì: mette calorie tonde e macro a
 *    caso. Se non tornano, non si scrive e si dice perché.
 *
 * 2. QUELLO CHE ENTRA DA QUI RESTA RICONOSCIBILE. Ogni riga nasce con
 *    `fonte = 'chat'`, come già succede per "off" o "manuale": nel diario si
 *    vede a colpo d'occhio cosa hai verificato tu e cosa no.
 *
 * 3. SI DISFA SOLO QUELLO CHE HA FATTO LEI. L'attrezzo che toglie filtra su
 *    `fonte = 'chat'`: una riga scritta da te dall'app non si tocca, qualunque
 *    identificativo le si passi.
 */

const FONTE = "chat";
const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const PASTI = ["colazione", "pranzo", "cena", "spuntino"];

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function giorno(v: unknown): string {
  return typeof v === "string" && GIORNO.test(v) ? v : oggiIso();
}

// --------------------------- Aggiungi un pasto ---------------------------

const aggiungiPasto: Attrezzo = {
  nome: "aggiungi_pasto",
  titolo: "Aggiungi al diario",
  descrizione:
    "Aggiunge un alimento al diario. Cerca prima con cerca_alimento e passa i valori che ti ha restituito: inventarli è l'errore più facile da fare. Se l'alimento non esiste ancora, i valori per 100 g devono essere coerenti fra loro (le calorie devono tornare con proteine, carboidrati e grassi) o l'aggiunta viene rifiutata.",
  scrive: true,
  schema: {
    type: "object",
    required: ["nome", "quantita_g", "kcal_100", "proteine_100", "carboidrati_100", "grassi_100"],
    properties: {
      nome: { type: "string", description: "Nome dell'alimento." },
      marca: { type: "string", description: "Marca, se c'è." },
      quantita_g: { type: "number", description: "Quanti grammi, davvero mangiati." },
      pasto: {
        type: "string",
        enum: PASTI,
        description: "In quale pasto. Se non indicato, pranzo.",
      },
      data: { type: "string", description: "Giorno AAAA-MM-GG. Se non indicato, oggi." },
      kcal_100: { type: "number", description: "Calorie per 100 g." },
      proteine_100: { type: "number", description: "Proteine per 100 g." },
      carboidrati_100: { type: "number", description: "Carboidrati per 100 g." },
      grassi_100: { type: "number", description: "Grassi per 100 g." },
      fibre_100: { type: "number", description: "Fibre per 100 g, se note." },
    },
  },
  async esegui(userId, a) {
    const nome = String(a.nome ?? "").trim();
    const quantita = numero(a.quantita_g);
    if (!nome) throw new Error("Serve il nome dell'alimento.");
    if (!(quantita > 0)) throw new Error("Serve una quantità in grammi maggiore di zero.");
    if (quantita > 5000) throw new Error("Quantità improbabile: oltre 5 kg in un pasto solo.");

    const per100 = {
      kcal: numero(a.kcal_100),
      proteine: numero(a.proteine_100),
      carboidrati: numero(a.carboidrati_100),
      grassi: numero(a.grassi_100),
      fibre: numero(a.fibre_100),
      zuccheri: 0,
      sale: 0,
    };

    /*
      Il controllo di coerenza, che qui è l'unica cosa che distingue un dato
      preso da un'etichetta da un numero inventato. In app è un avviso — si
      segnala e si lascia decidere — qui è un rifiuto: davanti all'app c'è una
      persona che vede il triangolo, davanti a questo attrezzo no.
    */
    const esito = valida(per100);
    const problema = messaggioProblemi(esito);
    if (problema) {
      throw new Error(
        `${problema} Controlla i valori per 100 g: con ${per100.proteine} g di proteine, ${per100.carboidrati} g di carboidrati e ${per100.grassi} g di grassi le calorie attese sono circa ${Math.round(esito.kcalAttese)}, non ${per100.kcal}.`
      );
    }

    const pasto = PASTI.includes(String(a.pasto)) ? String(a.pasto) : "pranzo";
    const data = giorno(a.data);
    const id = crypto.randomUUID();

    await getDb()
      .prepare(
        `insert into diario_pasti
           (id, user_id, data, pasto, nome_alimento, marca, quantita_g,
            kcal_100, proteine_100, carboidrati_100, grassi_100,
            fibre_100, zuccheri_100, sale_100, fonte)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
      )
      .bind(
        id, userId, data, pasto, nome,
        String(a.marca ?? "").trim() || null, quantita,
        per100.kcal, per100.proteine, per100.carboidrati, per100.grassi,
        per100.fibre, FONTE
      )
      .run();

    const f = quantita / 100;
    return {
      testo:
        `Aggiunto al diario: ${nome}, ${Math.round(quantita)} g, ${Math.round(per100.kcal * f)} kcal ` +
        `(${data}, ${pasto}). Per toglierlo: annulla_aggiunta con id ${id}.`,
      dati: { id, data, pasto, nome, quantita_g: quantita, kcal: Math.round(per100.kcal * f) },
    };
  },
};

// --------------------------- Registra una pesata ---------------------------

const registraPeso: Attrezzo = {
  nome: "registra_peso",
  titolo: "Registra una pesata",
  descrizione:
    "Segna quanto pesi in un certo giorno. Se quel giorno c'è già una pesata, la sostituisce.",
  scrive: true,
  schema: {
    type: "object",
    required: ["peso_kg"],
    properties: {
      peso_kg: { type: "number", description: "Peso in chilogrammi, con i decimali." },
      data: { type: "string", description: "Giorno AAAA-MM-GG. Se non indicato, oggi." },
      nota: { type: "string", description: "Una nota breve, facoltativa." },
    },
  },
  async esegui(userId, a) {
    const kg = Number(a.peso_kg);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      throw new Error("Il peso deve stare fra 20 e 400 kg.");
    }
    const data = giorno(a.data);
    const id = crypto.randomUUID();

    await getDb()
      .prepare(
        `insert into pesi (id, user_id, data, peso_kg, nota, fonte)
         values (?, ?, ?, ?, ?, ?)
         on conflict (user_id, data) do update
           set peso_kg = excluded.peso_kg, nota = excluded.nota, fonte = excluded.fonte`
      )
      .bind(id, userId, data, kg, String(a.nota ?? "").trim() || null, FONTE)
      .run();

    return {
      testo: `Registrato: ${kg.toFixed(1)} kg il ${data}.`,
      dati: { data, peso_kg: kg },
    };
  },
};

// --------------------------- Disfare ---------------------------

const annulla: Attrezzo = {
  nome: "annulla_aggiunta",
  titolo: "Togli quello che hai aggiunto",
  descrizione:
    "Toglie una riga che hai aggiunto tu in questa conversazione, passando l'id che ti è stato restituito. Non può togliere niente di scritto dall'app.",
  scrive: true,
  schema: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", description: "L'id restituito da aggiungi_pasto." },
    },
  },
  async esegui(userId, a) {
    const id = String(a.id ?? "");
    if (!id) throw new Error("Serve l'id della riga da togliere.");

    // Il filtro su fonte è la difesa: anche con l'id giusto, una riga scritta
    // dall'app non si cancella da qui.
    const res = await getDb()
      .prepare("delete from diario_pasti where id = ? and user_id = ? and fonte = ?")
      .bind(id, userId, FONTE)
      .run();

    if (!res.meta.changes) {
      throw new Error(
        "Non ho trovato niente da togliere con quell'id, oppure quella riga non l'avevo aggiunta io: dall'app si cancella a mano."
      );
    }
    return { testo: "Tolto dal diario.", dati: { id } };
  },
};

export const ATTREZZI_SCRITTURA: Attrezzo[] = [aggiungiPasto, registraPeso, annulla];
