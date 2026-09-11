/**
 * Registro delle versioni, per ambiente.
 *
 * Come funziona il numero di versione:
 * - ogni rilascio su **sviluppo** è una voce `X.Y.Z-dev.N`, con N che cresce
 *   a ogni pubblicazione su dev;
 * - quando quel lavoro va in **produzione** si aggiunge una sola voce `X.Y.Z`
 *   che riassume il periodo ed elenca in `include` le versioni dev raccolte.
 *   Così su dev si vede il dettaglio giorno per giorno, in produzione si vede
 *   cosa è cambiato tra un rilascio e l'altro.
 *
 * Questo file è la fonte di verità: sta nel repo, si rivede nella diff del
 * commit e non richiede né tabelle né automatismi nella pipeline. La voce va
 * aggiunta **nello stesso commit** delle modifiche che descrive.
 */

export type Ambiente = "dev" | "prod";

export interface Rilascio {
  /** Semver: "0.5.0" in produzione, "0.5.0-dev.3" su sviluppo. */
  versione: string;
  ambiente: Ambiente;
  /** Data del rilascio (YYYY-MM-DD). */
  data: string;
  /** Una riga che dice di cosa si è trattato. */
  titolo: string;
  /** I punti delle modifiche, scritti per chi usa l'app. */
  punti: string[];
  /** Solo per i rilasci in produzione: le versioni dev che contiene. */
  include?: string[];
}

/** Dal più recente al più vecchio: l'ordine in cui vengono mostrati. */
export const RILASCI: Rilascio[] = [
  {
    versione: "0.5.0",
    ambiente: "prod",
    data: "2026-09-11",
    titolo: "Abbonamenti, archivio piatti, dashboard e app da telefono",
    punti: [
      "Nuova sezione Abbonamenti: spese ricorrenti con le rate generate da sé in base alla frequenza, sospensione e ripresa, e il conto di quanto pesano al mese.",
      "Alimentazione: archivio dei piatti personali con porzioni, alimenti recenti da riaggiungere in un tocco, ricerca ordinata per pertinenza e pagina Andamento con le medie del periodo.",
      "Dashboard: il riquadro principale di ogni sezione è sempre in testa e non si rimuove, gli altri si scelgono da un pannello che li mostra in anteprima, e si riordinano trascinandoli — anche col dito, tenendo premuto.",
      "Profilo: nome, colore dell'app, tema e password in un unico posto, con reset assistito per chi amministra.",
      "Su telefono la navigazione è passata in basso, a portata di pollice, con l'azione più usata al centro.",
      "Sotto il cofano: molte meno chiamate al server durante gli inserimenti, e la sessione scaduta riporta al login invece di mostrare un errore.",
    ],
    include: [
      "0.5.0-dev.12",
      "0.5.0-dev.11",
      "0.5.0-dev.10",
      "0.5.0-dev.9",
      "0.5.0-dev.8",
      "0.5.0-dev.7",
      "0.5.0-dev.6",
      "0.5.0-dev.5",
      "0.5.0-dev.4",
      "0.5.0-dev.3",
      "0.5.0-dev.2",
      "0.5.0-dev.1",
    ],
  },
  {
    versione: "0.5.0-dev.12",
    ambiente: "dev",
    data: "2026-09-11",
    titolo: "Riquadro principale unico e riquadri alti quanto il contenuto",
    punti: [
      "Il riquadro principale di ogni sezione occupa tutta la larghezza. In Consumi e Costi raccoglie i tre numeri che si leggono insieme — quanto c'è da pagare, quanto hai già speso in tutto, le prossime scadenze — e in Alimentazione affianca alle calorie la media giornaliera dei macronutrienti.",
      "\"Totale generale già pagato\" e \"Media macro degli ultimi 7 giorni\" non sono più riquadri a parte: sono dentro il riquadro principale della loro sezione.",
      "Il riquadro degli abbonamenti mostra anche le prossime rate: per ogni abbonamento attivo la rata da saldare se c'è, altrimenti la data del prossimo addebito.",
      "I riquadri non vengono più stirati fino all'altezza del più alto della riga: ognuno è alto quanto il suo contenuto, quindi niente scatole mezze vuote.",
      "Le voci come \"Diario di oggi\", \"Andamento completo\" o \"Vai al diario\" iniziano con la maiuscola.",
      "Ogni riquadro principale costa una richiesta invece di tre: aprire una dashboard ne chiede meno di prima.",
    ],
  },
  {
    versione: "0.5.0-dev.11",
    ambiente: "dev",
    data: "2026-09-11",
    titolo: "Riquadri della dashboard che si spostano col dito",
    punti: [
      "Sul telefono tieni premuto un riquadro per un attimo e poi lo trascini dove vuoi, come sulla schermata di un telefono. Il nuovo ordine si salva da solo, senza passare da \"Personalizza\".",
      "Se il dito si muove subito la pagina scorre come sempre: il riquadro si aggancia solo se resti fermo un quarto di secondo.",
      "Quando si aggancia, una vibrazione breve lo segnala e il riquadro si solleva con un bordo colorato, così si vede quale stai spostando.",
      "Alzando il dito non si apre più per sbaglio la pagina del riquadro appena spostato.",
      "Col mouse non cambia niente: si trascina dalla maniglia in \"Personalizza\". In più ora si può riordinare anche da tastiera, con spazio e frecce sulla maniglia.",
    ],
  },
  {
    versione: "0.5.0-dev.10",
    ambiente: "dev",
    data: "2026-09-10",
    titolo: "Su telefono la navigazione passa in basso",
    punti: [
      "Le pagine della sezione in cui sei stanno in una barra in basso, dove arriva il pollice: al massimo cinque voci, con icona ed etichetta.",
      "In Alimentazione la voce centrale è \"Aggiungi\", in rilievo: è la cosa che si fa più spesso in tutta l'app. Il pulsante rotondo che stava sopra il diario è stato rimosso, era lo stesso comando due volte.",
      "La sezione si cambia toccando il nome in alto a sinistra: si apre un elenco che sale dal basso. Il menu a panino non serve più.",
      "Profilo, tema e uscita sono nel pallino con le iniziali, in alto a destra.",
      "Sul computer non cambia niente: resta il menu di sinistra, con tutte le voci e le etichette complete.",
      "La voce \"Dashboard\" si chiama \"Riepilogo\", in barra e nel menu.",
    ],
  },
  {
    versione: "0.5.0-dev.9",
    ambiente: "dev",
    data: "2026-09-09",
    titolo: "Meno chiamate al server durante gli inserimenti",
    punti: [
      "Aggiungere un alimento è una sola richiesta invece di due: il controllo del doppione lo fa il server nello stesso giro.",
      "Le fonti esterne (Open Food Facts, USDA) vengono interrogate solo quando smetti di scrivere, non a ogni pezzo di parola; i tuoi piatti continuano a comparire subito.",
      "I risultati dei termini già cercati restano in memoria per tutta la visita: correggere una parola o tornare indietro non rifà le ricerche.",
      "Le voci del menu di lato non vengono più precaricate: erano quattro richieste per ogni pagina aperta, rifatte dopo ogni salvataggio.",
      "Se la sessione è scaduta o è stata revocata mentre una scheda era aperta, l'app riporta al login invece di mostrare \"Application error\": prima ogni azione da quella scheda tornava un errore del server.",
    ],
  },
  {
    versione: "0.5.0-dev.8",
    ambiente: "dev",
    data: "2026-09-08",
    titolo: "Dashboard: widget fissi e pannello di scelta con anteprime",
    punti: [
      "Nuovo pulsante \"Aggiungi widget\" accanto a Personalizza: apre un pannello con tutti i widget disponibili, ognuno con una descrizione e un'anteprima con dati di esempio, così si vede cosa si sta aggiungendo prima di aggiungerlo.",
      "\"Totale da pagare\" e \"Prossime scadenze\" sono diventati un unico riquadro: il totale dice quanto, l'elenco dice quando, e il dato viene chiesto al database una volta sola invece di due.",
      "I widget essenziali di una sezione (da pagare e scadenze per Consumi e Costi, calorie per Alimentazione) restano in testa alla dashboard e non si possono rimuovere né spostare.",
      "Il riordino si salva subito quando trascini, senza dover premere Fine.",
    ],
  },
  {
    versione: "0.5.0-dev.7",
    ambiente: "dev",
    data: "2026-09-08",
    titolo: "Colore del tema scelto da te",
    punti: [
      "Nel profilo si può scegliere il colore dell'app: undici campioni pronti oppure un colore qualsiasi.",
      "Dal colore scelto viene ricavata tutta la palette — accento, sfondi virati verso quella tinta, bordi — e il testo viene scelto in base alla luminosità del colore, così resta leggibile anche su tinte chiare come il giallo.",
      "Rosso, verde e giallo di errori, conferme e avvisi non cambiano: devono restare riconoscibili.",
      "Il colore viene applicato prima che la pagina si disegni e vale su tutti i dispositivi, come il tema.",
    ],
  },
  {
    versione: "0.5.0-dev.6",
    ambiente: "dev",
    data: "2026-09-02",
    titolo: "Profilo utente: nome, tema e password in un unico posto",
    punti: [
      "In basso a sinistra, al posto di \"Esci\", c'è il tuo profilo: apre un menu con Impostazioni profilo, Preferenze moduli ed Esci.",
      "Puoi scegliere come farti chiamare: il nome sostituisce l'email nella barra laterale (per accedere si continua a usare l'email).",
      "Tema chiaro, scuro o come il sistema, salvato sul profilo e quindi valido su tutti i dispositivi. Viene applicato prima che la pagina si disegni, senza il lampo di tema sbagliato.",
      "Password e sessioni attive si trovano ora nella pagina del profilo, insieme al resto.",
      "Chi dimentica la password non resta fuori: un amministratore, dalla pagina Utenti, genera una password temporanea da comunicare, che chiude le sessioni aperte di quell'account.",
    ],
  },
  {
    versione: "0.5.0-dev.5",
    ambiente: "dev",
    data: "2026-09-02",
    titolo: "Ricerca alimenti ordinata per pertinenza e registro delle versioni",
    punti: [
      "Cercando un alimento vengono prima i risultati che iniziano col termine cercato, poi quelli che lo contengono: le fonti esterne ordinano per popolarità e portavano in cima prodotti poco pertinenti.",
      "La ricerca ignora accenti e maiuscole: \"caffe\" trova \"Caffè macinato\".",
      "Nuova pagina Impostazioni › Versioni con il registro delle modifiche dell'ambiente in cui si sta lavorando.",
    ],
  },
  {
    versione: "0.5.0-dev.4",
    ambiente: "dev",
    data: "2026-09-02",
    titolo: "Correzioni sui caricamenti e sui grafici, widget calorie unificato",
    punti: [
      "Il diario mostrava a volte i dati di una visita precedente: ora ogni modifica aggiorna tutte le pagine dell'area alimentazione, non solo quella aperta.",
      "Nei grafici i giorni senza registrazioni non vengono più disegnati come giorni a zero: restano vuoti, così le linee dei macronutrienti non crollano sui giorni saltati.",
      "I grafici mostrano subito i valori definitivi, senza animazione d'ingresso.",
      "\"Calorie di oggi\" e \"Calorie degli ultimi 7 giorni\" sono ora un unico riquadro con oggi, media settimanale e grafico.",
      "Nuovo widget \"Media macro degli ultimi 7 giorni\" con confronto sugli obiettivi.",
    ],
  },
  {
    versione: "0.5.0-dev.3",
    ambiente: "dev",
    data: "2026-09-01",
    titolo: "Correzioni all'aggiunta di un alimento",
    punti: [
      "Il giorno scelto nel diario non si perde più: sta nell'indirizzo della pagina, quindi resta anche dopo aver aggiunto un alimento e funziona col tasto indietro.",
      "Dopo aver aggiunto un alimento si resta sulla schermata di inserimento, pronti per il pasto successivo.",
      "Se l'alimento è già presente nello stesso pasto compare una richiesta in primo piano: sommare le quantità o tenere due righe separate.",
      "\"Oggi\" viene calcolato sull'ora italiana: dopo mezzanotte i pasti non finiscono più nel giorno precedente.",
    ],
  },
  {
    versione: "0.5.0-dev.2",
    ambiente: "dev",
    data: "2026-09-01",
    titolo: "Archivio piatti personale, porzioni e revisione dell'alimentazione",
    punti: [
      "I piatti diventano un archivio personale: ricette con ingredienti oppure piatti e prodotti con i valori dell'etichetta, e compaiono nella ricerca quando si aggiunge un pasto.",
      "Porzioni: \"1 piatto = 350 g\", per registrare per porzioni invece che in grammi.",
      "Elenco dei recenti con aggiunta in un tap e copia dei pasti da un altro giorno.",
      "Nuova pagina Andamento: calorie e macronutrienti su 7, 30 o 90 giorni, con medie e aderenza agli obiettivi.",
      "Gli obiettivi si possono calcolare dai propri dati (peso, altezza, età, attività).",
      "Le eliminazioni si annullano da un avviso invece di chiedere conferma prima.",
      "App installabile sul telefono, comandi più grandi e campi numerici che accettano la virgola.",
    ],
  },
  {
    versione: "0.5.0-dev.1",
    ambiente: "dev",
    data: "2026-08-26",
    titolo: "Modulo Abbonamenti",
    punti: [
      "Nuovo modulo Abbonamenti: spese ricorrenti con generazione automatica delle rate secondo la frequenza scelta.",
      "Sincronizzazione dei dati da produzione a sviluppo, riservata al superadmin.",
    ],
  },
  {
    versione: "0.4.0",
    ambiente: "prod",
    data: "2026-08-26",
    titolo: "Passaggio a Cloudflare, ruoli utente e tema scuro",
    punti: [
      "L'app gira su Cloudflare Workers con database D1: nessun servizio esterno, deploy automatico a ogni pubblicazione.",
      "Ruoli utente e gestione degli account dalle impostazioni.",
      "Tema scuro.",
      "Bollette: divisione della spesa con un'altra famiglia, periodi di competenza, allegati e ricevute in PDF, statistiche per tipo e andamento mensile.",
      "Alimentazione: diario dei pasti, ricerca alimenti su Open Food Facts e USDA, obiettivi nutrizionali, ricette con ingredienti.",
      "Dashboard personalizzabile con widget riordinabili.",
    ],
  },
];

/** I rilasci di un ambiente, dal più recente. */
export function rilasciDi(ambiente: Ambiente): Rilascio[] {
  return RILASCI.filter((r) => r.ambiente === ambiente);
}

/** Versione attualmente in esecuzione nell'ambiente indicato. */
export function versioneCorrente(ambiente: Ambiente): Rilascio | undefined {
  return rilasciDi(ambiente)[0];
}

/** Le voci dev raccolte in un rilascio di produzione. */
export function devInclusi(r: Rilascio): Rilascio[] {
  if (!r.include?.length) return [];
  return r.include
    .map((v) => RILASCI.find((x) => x.versione === v))
    .filter((x): x is Rilascio => x !== undefined);
}
