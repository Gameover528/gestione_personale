/**
 * Registro delle versioni.
 *
 * NUMERAZIONE — CalVer (calver.org): un rilascio si chiama con la sua data,
 * `2026.09.15`, e `2026.09.15.2` se ne capitano due nello stesso giorno.
 * Non semver, perché semver risponde a "se aggiorno mi si rompe
 * l'integrazione?" e qui non c'è nessuna integrazione da rompere: ci sono
 * persone che usano l'app. A loro la data dice subito quanto è vecchio quello
 * che stanno guardando e da quando è cambiato qualcosa, mentre "0.6.0" era un
 * numero scelto a sentimento — tanto che le vecchie voci portavano etichette
 * (`0.5.1`, `0.6.0`) di rilasci che non sono mai esistiti.
 *
 * VOCI — formato Keep a Changelog (keepachangelog.com): ogni modifica è una
 * riga sola, asciutta come un messaggio di commit ma scritta per chi usa
 * l'app, classificata in Aggiunto / Modificato / Corretto / Rimosso /
 * Sicurezza. Così chi legge trova a colpo d'occhio la categoria che gli
 * interessa invece di scorrere un elenco piatto.
 *
 * COME SI LAVORA
 * 1. Mentre si sviluppa, ogni modifica si aggiunge a `NON_RILASCIATO`, nello
 *    stesso commit del codice che descrive.
 * 2. Quando il lavoro va in produzione, quelle righe diventano un nuovo
 *    `Rilascio` in testa a `RILASCI` con la data del giorno, e
 *    `NON_RILASCIATO` torna vuoto.
 *
 * Ogni modifica si scrive quindi **una volta sola**: prima era descritta nella
 * voce di sviluppo e poi riscritta nel riassunto di produzione, con il doppio
 * del lavoro e il rischio che le due versioni divergessero.
 *
 * `migrazioni` elenca cosa va applicato al database perché quel rilascio
 * funzioni: è una lista di controllo prima del merge, non un dettaglio
 * tecnico. Ci siamo già fermati due volte per una migration dimenticata.
 */

export type Ambiente = "dev" | "prod";

export type Categoria =
  | "aggiunto"
  | "modificato"
  | "corretto"
  | "rimosso"
  | "sicurezza";

/** Ordine in cui le categorie compaiono, e come si chiamano a schermo. */
export const CATEGORIE: { valore: Categoria; label: string }[] = [
  { valore: "aggiunto", label: "Aggiunto" },
  { valore: "modificato", label: "Modificato" },
  { valore: "corretto", label: "Corretto" },
  { valore: "rimosso", label: "Rimosso" },
  { valore: "sicurezza", label: "Sicurezza" },
];

export interface Modifica {
  categoria: Categoria;
  /** Una riga, in italiano, per chi usa l'app. */
  testo: string;
}

export interface Rilascio {
  /** CalVer: "2026.09.15", o "2026.09.15.2" per il secondo dello stesso giorno. */
  versione: string;
  data: string;
  modifiche: Modifica[];
  /** Cosa applicare al database perché funzioni (numero migration o descrizione). */
  migrazioni?: string[];
}

/**
 * Quello che sta su sviluppo e non è ancora andato in produzione.
 * `null` quando dev e produzione sono allineati.
 */
export interface NonRilasciato {
  /** Data dell'ultima modifica aggiunta qui. */
  aggiornato: string;
  modifiche: Modifica[];
  migrazioni?: string[];
}

export const NON_RILASCIATO: NonRilasciato | null = {
  aggiornato: "2026-09-18",
  migrazioni: ["0011 — registro del peso"],
  modifiche: [
    // --- Peso
    { categoria: "aggiunto", testo: "Nuova sezione Peso: segni quanto pesi, con una nota se serve, e vedi l'andamento nel tempo invece del solo numero di oggi." },
    { categoria: "modificato", testo: "Le calorie bruciate di un allenamento usano il peso di quel periodo e non quello attuale: prima, dimagrendo, i numeri degli allenamenti passati cambiavano da soli." },
    { categoria: "modificato", testo: "Il calcolo degli obiettivi usa l'ultima pesata, e il peso che scrivi li' viene registrato come pesata di oggi: il peso sta in un posto solo." },

    // --- Sviluppo
    { categoria: "corretto", testo: "Solo per chi sviluppa: in locale l'app ora risponde ai clic e si aggiorna da sola a ogni modifica. Le regole di sicurezza bloccavano il server di sviluppo di Next; in produzione non cambia nulla." },

    // --- Alimentazione
    { categoria: "corretto", testo: "Gli obiettivi nutrizionali si potevano togliere: svuotare un campo e salvare lo cancellava a schermo, ma ricaricando l'obiettivo era tornato." },
    { categoria: "modificato", testo: "Nei grafici i colori delle serie non seguono piu' il colore scelto per l'app: con certi temi due linee finivano per essere dello stesso colore." },
    { categoria: "modificato", testo: "In Andamento il periodo (7, 30, 90 giorni) sta sulla stessa riga della scelta fra Alimentazione e Allenamento, a destra." },
    { categoria: "modificato", testo: "La media delle calorie dice ora su quanti giorni e' calcolata: conta solo quelli con qualcosa di segnato, perche' un giorno non compilato non e' un giorno a digiuno." },
    { categoria: "modificato", testo: "\"Copia giorno\" e \"Obiettivi\" si aprono in una finestra sopra il diario: non si perde piu' il giorno che stavi guardando." },
    { categoria: "aggiunto", testo: "Prima di copiare un giorno vedi l'elenco di cosa verrebbe copiato, pasto per pasto, e il pulsante dice quante voci sono." },
    { categoria: "modificato", testo: "In Aggiungi si parte dalla ricerca: sotto la casella vuota ci sono gli ultimi alimenti che hai segnato, che lasciano il posto ai risultati appena scrivi." },
    { categoria: "modificato", testo: "La scheda \"A mano\" e' diventata un \"+\" accanto alla ricerca: apre una finestra dove scegli se creare un alimento singolo o una ricetta fatta di ingredienti, e in entrambi i casi finisce subito nel diario." },
    { categoria: "corretto", testo: "I riquadri dei pasti nel diario avevano gli angoli sporgenti: l'intestazione grigia usciva dalla cornice arrotondata." },
    { categoria: "modificato", testo: "Le voci di menu si chiamano \"Diario\" e \"Dashboard\": dicono cosa si trova dietro, invece di nominare l'argomento." },
    { categoria: "corretto", testo: "L'app si installa davvero sul telefono: il file che il browser legge per installarla era protetto dal login, e quindi irraggiungibile." },
    { categoria: "corretto", testo: "Su iPhone l'icona sulla schermata Home e' quella dell'app, non una miniatura della pagina." },
    { categoria: "modificato", testo: "Nel registro delle versioni gli interventi sul database dei rilasci gia' pubblicati sono una riga di storia e non piu' un avviso: riguardavano chi pubblica, non chi usa l'app." },
  ],
};

/** Dal più recente al più vecchio: l'ordine in cui vengono mostrati. */
export const RILASCI: Rilascio[] = [
  {
    versione: "2026.09.15",
    data: "2026-09-15",
    migrazioni: [
      "0007 — freno ai tentativi di accesso",
      "0008 — esercizi e allenamenti",
      "0009 — schede",
      "0010 — riparazione tabelle schede",
      "Caricamento del catalogo esercizi (d1/seed-esercizi.sql)",
    ],
    modifiche: [
      // --- Qualità dei dati nutrizionali
      { categoria: "aggiunto", testo: "Gli alimenti con valori nutrizionali che non tornano mostrano un triangolo di avviso, con scritto cosa non torna: vale nella ricerca, nel diario e fra i piatti, anche per quelli registrati tempo fa." },
      { categoria: "modificato", testo: "Nel diario i carboidrati comprendono le fibre, come fanno le altre app: il riquadro separato delle fibre non c'è più." },

      // --- Area Salute
      { categoria: "aggiunto", testo: "Nuova area Salute, con le sezioni Cibo ed Esercizio." },
      { categoria: "aggiunto", testo: "Gli esercizi si cercano in italiano: scrivi \"panca piana\" o \"alzate laterali\" e trovi le voci giuste, anche se il catalogo è in inglese." },
      { categoria: "aggiunto", testo: "Puoi dare il tuo nome a un esercizio del catalogo: resta trovabile anche col nome originale." },
      { categoria: "aggiunto", testo: "Un allenamento si può registrare in qualsiasi giorno, e la data si corregge anche dopo." },
      { categoria: "aggiunto", testo: "Catalogo di 1500 esercizi, cercabili per nome, attrezzo o muscolo." },
      { categoria: "aggiunto", testo: "Figura del corpo con i muscoli lavorati illuminati, più dimostrazione animata e istruzioni passo passo." },
      { categoria: "aggiunto", testo: "Registrazione degli allenamenti: serie, ripetizioni, carichi e calorie stimate." },
      { categoria: "aggiunto", testo: "Schede di allenamento ricorrenti, da avviare o da richiamare dentro una sessione già aperta." },
      { categoria: "aggiunto", testo: "Esercizi personali, con la mappa muscolare che si accende mentre li componi." },
      { categoria: "aggiunto", testo: "Riquadro del bilancio energetico: mangiate meno bruciate, confrontate con l'obiettivo." },
      { categoria: "aggiunto", testo: "Andamento diviso in Cibo e Allenamento, sotto lo stesso periodo." },
      { categoria: "aggiunto", testo: "Obiettivo di giorni di allenamento a settimana, nelle preferenze." },
      { categoria: "modificato", testo: "Nel grafico delle calorie le bruciate scendono dalla cima delle mangiate: si legge quanto è entrato e quanto ne è stato tolto." },
      { categoria: "rimosso", testo: "Tolto dalla sezione Allenamento il grafico che ripeteva lo stesso confronto già presente in Cibo." },

      // --- Uso quotidiano
      { categoria: "modificato", testo: "Bollette e abbonamenti si usano col pollice: schede al posto della tabella, pulsanti più grandi, filtri raccolti dietro un pulsante." },
      { categoria: "aggiunto", testo: "Dopo una cancellazione compare \"Annulla\" per qualche secondo, al posto della finestra di conferma." },
      { categoria: "modificato", testo: "Ogni riquadro della dashboard chiede i dati una volta sola." },
      { categoria: "modificato", testo: "La sincronizzazione da produzione porta solo i dati del tuo account, senza toccare gli altri profili di prova." },

      // --- Sicurezza
      { categoria: "sicurezza", testo: "Chiusa una falla nel salvataggio di bollette e diario che permetteva di leggere dati di altri account." },
      { categoria: "sicurezza", testo: "Il login non lascia più capire se un'email è registrata, e si blocca per qualche minuto dopo 8 tentativi falliti." },
      { categoria: "sicurezza", testo: "Ogni pagina dichiara al browser regole di sicurezza: non è incorniciabile da altri siti e i moduli non possono inviare dati altrove." },
      { categoria: "sicurezza", testo: "L'export di backup non resta in nessuna cache e le sessioni scadute vengono ripulite." },

      // --- Correzioni
      { categoria: "corretto", testo: "Le schede non comparivano: mancavano le loro tabelle sul database." },
      { categoria: "corretto", testo: "Quando la lettura dei dati fallisce l'app lo dice, invece di restare in caricamento all'infinito." },
      { categoria: "corretto", testo: "Aprire un allenamento o una scheda non dà più, ogni tanto, la pagina di errore del server: l'elenco degli esercizi non si scarica più per intero a ogni apertura." },
    ],
  },
  {
    versione: "2026.09.11",
    data: "2026-09-11",
    modifiche: [
      { categoria: "aggiunto", testo: "Sezione Abbonamenti: spese ricorrenti con le rate generate da sé, sospensione e ripresa, e quanto pesano al mese." },
      { categoria: "aggiunto", testo: "Archivio dei piatti personali con porzioni, e alimenti recenti da riaggiungere in un tocco." },
      { categoria: "aggiunto", testo: "Pagina Andamento dell'alimentazione, con le medie del periodo." },
      { categoria: "aggiunto", testo: "Profilo: nome, colore dell'app, tema e password in un unico posto, con reset assistito per chi amministra." },
      { categoria: "modificato", testo: "Dashboard: il riquadro principale è sempre in testa, gli altri si scelgono da un pannello con le anteprime e si riordinano trascinandoli, anche col dito." },
      { categoria: "modificato", testo: "Su telefono la navigazione è passata in basso, con l'azione più usata al centro." },
      { categoria: "modificato", testo: "Molte meno chiamate al server durante gli inserimenti." },
      { categoria: "modificato", testo: "La ricerca degli alimenti è ordinata per pertinenza." },
      { categoria: "corretto", testo: "La sessione scaduta riporta al login invece di mostrare un errore." },
    ],
  },
  {
    versione: "2026.08.26",
    data: "2026-08-26",
    modifiche: [
      { categoria: "aggiunto", testo: "L'app gira su Cloudflare con database D1: nessun servizio esterno, pubblicazione automatica a ogni rilascio." },
      { categoria: "aggiunto", testo: "Ruoli utente e gestione degli account dalle impostazioni." },
      { categoria: "aggiunto", testo: "Tema scuro." },
      { categoria: "aggiunto", testo: "Bollette: divisione della spesa con un'altra famiglia, periodi di competenza, allegati e ricevute in PDF, statistiche per tipo e andamento mensile." },
      { categoria: "aggiunto", testo: "Alimentazione: diario dei pasti, ricerca su Open Food Facts e USDA, obiettivi nutrizionali, ricette con ingredienti." },
      { categoria: "aggiunto", testo: "Dashboard personalizzabile con widget riordinabili." },
    ],
  },
];

/** Il rilascio attualmente in produzione. */
export function ultimoRilascio(): Rilascio | undefined {
  return RILASCI[0];
}

/**
 * Come si chiama la versione in esecuzione. In produzione è l'ultimo rilascio;
 * su sviluppo non esiste un numero, perché sviluppo non è un rilascio ma
 * "quello che c'è adesso su develop".
 */
export function etichettaVersione(ambiente: Ambiente): string {
  if (ambiente === "prod") return ultimoRilascio()?.versione ?? "—";
  return NON_RILASCIATO ? "sviluppo" : (ultimoRilascio()?.versione ?? "—");
}

/** Raggruppa le modifiche per categoria, nell'ordine di CATEGORIE. */
export function perCategoria(
  modifiche: Modifica[]
): { categoria: Categoria; label: string; testi: string[] }[] {
  return CATEGORIE.map(({ valore, label }) => ({
    categoria: valore,
    label,
    testi: modifiche.filter((m) => m.categoria === valore).map((m) => m.testo),
  })).filter((g) => g.testi.length > 0);
}
