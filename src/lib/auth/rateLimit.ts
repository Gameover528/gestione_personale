import { getDb } from "@/lib/cf";

/**
 * Freno alla forza bruta sul login, appoggiato alla tabella `login_attempts`
 * (migration 0007). La "chiave" è l'IP di chi tenta, o l'email quando l'IP non
 * è disponibile: si conta quanti tentativi falliti cadono in una finestra e,
 * oltre la soglia, si blocca la chiave per qualche minuto. Un login riuscito
 * azzera il conteggio.
 */

const SOGLIA = 8; // tentativi falliti tollerati nella finestra
const FINESTRA_MIN = 15; // ampiezza della finestra
const BLOCCO_MIN = 15; // durata del blocco una volta superata la soglia

export interface EsitoLimite {
  bloccato: boolean;
  /** Minuti (arrotondati per eccesso) prima di poter riprovare, se bloccato. */
  riprovaTraMin?: number;
}

interface RigaTentativi {
  tentativi: number;
  finestra_inizio: string;
  blocco_fino: string | null;
}

/** True se `iso` (formato SQLite datetime) è nel futuro rispetto ad adesso. */
function nelFuturo(iso: string | null): boolean {
  if (!iso) return false;
  // Entrambi trattati come UTC: le date le scrive sempre datetime('now').
  return new Date(iso.replace(" ", "T") + "Z").getTime() > Date.now();
}

function minutiDaOra(iso: string): number {
  const ms = new Date(iso.replace(" ", "T") + "Z").getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 60000));
}

/**
 * Se la tabella login_attempts non c'è ancora (codice in produzione prima
 * della migration 0007), il freno si disattiva ma il login continua a
 * funzionare: meglio restare senza limitatore per il tempo di applicare la
 * migration che bloccare fuori tutti gli utenti. Una volta applicata la
 * migration, il limitatore riparte da solo senza bisogno di rideploy.
 */
function tabellaAssente(err: unknown): boolean {
  return /no such table|login_attempts/i.test(String((err as Error)?.message ?? err));
}

/**
 * Da chiamare PRIMA di verificare la password: se la chiave è in blocco, il
 * tentativo non deve nemmeno arrivare al confronto.
 */
export async function controllaLimiteLogin(
  chiave: string
): Promise<EsitoLimite> {
  try {
    const row = await getDb()
      .prepare("select tentativi, finestra_inizio, blocco_fino from login_attempts where chiave = ?")
      .bind(chiave)
      .first<RigaTentativi>();

    if (row && nelFuturo(row.blocco_fino)) {
      return { bloccato: true, riprovaTraMin: minutiDaOra(row.blocco_fino!) };
    }
    return { bloccato: false };
  } catch (err) {
    if (tabellaAssente(err)) return { bloccato: false };
    throw err;
  }
}

/**
 * Registra un tentativo fallito. Se la finestra è scaduta riparte da capo;
 * al raggiungimento della soglia imposta il blocco.
 */
export async function registraFallimentoLogin(chiave: string): Promise<void> {
  const db = getDb();
  try {
    const row = await db
      .prepare("select tentativi, finestra_inizio, blocco_fino from login_attempts where chiave = ?")
      .bind(chiave)
      .first<RigaTentativi>();

    const finestraViva =
      row && nelFuturo(iso(row.finestra_inizio, FINESTRA_MIN));
    const tentativi = finestraViva ? row!.tentativi + 1 : 1;
    const bloccoFino =
      tentativi >= SOGLIA
        ? `datetime('now', '+${BLOCCO_MIN} minutes')`
        : null;

    // finestra_inizio si azzera quando la finestra è scaduta (nuovo conteggio).
    await db
      .prepare(
        `insert into login_attempts (chiave, tentativi, finestra_inizio, blocco_fino)
         values (?, ?, datetime('now'), ${bloccoFino ?? "null"})
         on conflict (chiave) do update set
           tentativi = ?,
           finestra_inizio = case when ? then login_attempts.finestra_inizio else datetime('now') end,
           blocco_fino = ${bloccoFino ?? "null"}`
      )
      .bind(chiave, tentativi, tentativi, finestraViva ? 1 : 0)
      .run();
  } catch (err) {
    if (tabellaAssente(err)) return;
    throw err;
  }
}

/** Login riuscito: la chiave riparte pulita. */
export async function azzeraLimiteLogin(chiave: string): Promise<void> {
  try {
    await getDb()
      .prepare("delete from login_attempts where chiave = ?")
      .bind(chiave)
      .run();
  } catch (err) {
    if (tabellaAssente(err)) return;
    throw err;
  }
}

/** Aggiunge minuti a una data SQLite, per il calcolo "finestra ancora viva". */
function iso(base: string, minuti: number): string {
  const t = new Date(base.replace(" ", "T") + "Z").getTime() + minuti * 60000;
  return new Date(t).toISOString().slice(0, 19).replace("T", " ");
}
