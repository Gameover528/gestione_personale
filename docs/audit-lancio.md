# Audit pre-lancio — Gestione Personale

> Esercizio: *se l'app andasse in vendita fra un mese a utenti medi italiani, soprattutto da telefono, cosa la fermerebbe e cosa mancherebbe?* Non è un piano di lancio vero: è un elenco di cose da fare, ordinato per peso.

Fatto il 22/10/2026 su `main` @ `63ca41e`.

**Come è stato fatto.** Dodici revisori hanno letto il codice da prospettive diverse: accesso, bollette, alimentazione, esercizio, impostazioni, grafica, sicurezza e legale, affidabilità, accessibilità, concorrenti, flussi, commerciale. Hanno prodotto 317 osservazioni. Un verificatore scettico per revisore le ha ricontrollate sul codice: 314 confermate o ridimensionate, 3 smentite. Le voci doppie sono state unite in 177, e un critico ha cercato cosa mancava (11 voci in più). Infine un giro dal vivo da telefono con un utente appena creato, e un controllo a mano di 10 delle voci più pesanti, risultate vere tutte e 10.

Ogni voce ha l'evidenza (file:riga, o la ricerca fatta per dire che qualcosa manca). I percorsi sono relativi a `src/` dove non indicato. Le caselle si spuntano anche in Obsidian.

## Il quadro

Gestione Personale ha una base tecnica sana. I dati sono isolati per user_id, con allowlist delle colonne. Codici e token OAuth sono salvati come impronta, c'è Turnstile, il backup segue la regola della sync e le eliminazioni hanno l'annulla. Le funzioni coprono già bollette, abbonamenti, diario, piatti, allenamenti e peso. Così com'è, però, l'app è uno strumento per pochi invitati e non un prodotto da vendere. Bloccano il lancio quattro cose: mancano informativa, termini, note legali del venditore e consenso esplicito ai dati sanitari; le licenze di ExerciseDB (AGPL e GIF) e di Open Food Facts (ODbL) non sono verificate né rispettate; non si può pagare; da telefono Peso, Piatti, Catalogo e Miei esercizi non si raggiungono. Subito dopo vengono i problemi che un cliente pagante incontra presto. Non c'è recupero della password né servizio email. Non c'è modo di cancellare l'account. Chi si registra resta in attesa senza notifiche, e l'assistenza non ha un canale. Le pagine di errore sono quelle inglesi di Next, e i riquadri restano su 'Caricamento…' all'infinito. Con 100 allenamenti si supera il limite di parametri di D1, e i tetti del piano gratuito valgono per tutti gli utenti insieme. Le 5 cose da fare per prime sono queste. (1) Pagine /privacy e /termini, con consenso art. 9 e età minima in registrazione. (2) Parere legale sulle licenze dei dati di terzi, con eventuale sostituzione del catalogo esercizi. (3) Dominio proprio, servizio email transazionale e Stripe, per avere recupero password, verifica dell'email, attivazione immediata e incasso. (4) Accesso da telefono a Peso, Piatti ed Esercizi, insieme a error.tsx/not-found.tsx e a un hook comune per gli errori di caricamento. (5) Correzione del limite D1 a 100 parametri e passaggio a Workers Paid con allegati su R2.

| Tema | 🔴 | 🟠 | 🟡 | ⚪ | Totale |
|---|---:|---:|---:|---:|---:|
| Sicurezza e privacy | 1 | 3 | 6 | 5 | 15 |
| Lancio commerciale | 3 | 4 | 3 | 1 | 11 |
| Accesso e account |  | 2 | 6 | 4 | 12 |
| Flussi e usabilità |  |  | 3 |  | 3 |
| Grafica e navigazione | 1 | 1 | 9 | 4 | 15 |
| Accessibilità |  | 4 | 7 | 7 | 18 |
| Affidabilità e prestazioni |  | 5 | 10 | 3 | 18 |
| Consumi e Costi |  | 3 | 16 | 8 | 27 |
| Alimentazione |  | 8 | 13 | 5 | 26 |
| Esercizio e peso |  | 6 | 12 | 8 | 26 |
| Impostazioni e chat |  | 1 | 6 | 3 | 10 |
| Funzionalità mancanti |  | 1 | 3 | 4 | 8 |
| **Totale** | **5** | **38** | **94** | **52** | **189** |

🔴 bloccante: senza questo non si vende (obblighi legali, sicurezza, perdita di dati, flusso principale impossibile) · 🟠 alta: un utente medio lo nota presto · 🟡 media: migliora sensibilmente · ⚪ bassa: rifinitura.  
Sforzo: S ore · M 1-2 giorni · L una settimana · XL più settimane.

## Da dove partire

### Correzioni di codice: poche ore l'una, effetto grande

Bug veri, quasi tutti di sforzo S. Alcuni perdono dati in silenzio: il carico con la virgola, l'allegato rimosso, la pesata sovrascritta dalla chat. Uno rompe l'app oltre una soglia che un utente costante raggiunge in un anno: 100 allenamenti.

- [ ] **GRA-01** Peso, Piatti, Catalogo e Miei esercizi non raggiungibili da telefono — sforzo S
- [ ] **AFF-01** Con 100 o più allenamenti si rompono Andamento e i riquadri della dashboard Salute — sforzo S
- [ ] **ESE-02** Con la virgola decimale il carico viene salvato vuoto — sforzo S
- [ ] **CON-02** 'Rimuovi' sull'allegato cancella subito il file, anche se poi si annulla — sforzo S
- [ ] **CON-01** Gli allegati sopra 1 MB non si caricano — sforzo S
- [ ] **ALI-26** La ricerca alimenti usa un endpoint di Open Food Facts che risponde 503 circa una volta su tre — sforzo S
- [ ] **AFF-03** Errori e 404 mostrano le pagine inglesi di Next, senza via d'uscita — sforzo S
- [ ] **ESE-01** Pressa 45° e hack squat chiedono minuti e km invece di ripetizioni e kg — sforzo S
- [ ] **IMP-02** Una chat può sovrascrivere una pesata scritta dall'utente, contro quanto promette il consenso — sforzo S
- [ ] **ACC-01** Dopo il login si perde la pagina richiesta e il collegamento della chat si interrompe — sforzo S
- [ ] **ALI-01** Il '+' centrale aggiunge sempre a oggi, anche guardando un altro giorno — sforzo S
- [ ] **AFF-05** Dopo ogni rilascio l'app già aperta sul telefono smette di salvare — sforzo M

### Decisioni da prendere prima di vendere (non sono codice)

Questi punti chiedono un consulente, un contratto o una scelta di prodotto prima di una riga di codice. Senza i primi quattro l'app non si può vendere nell'UE, nemmeno a codice perfetto.

- [ ] **SIC-01** Nessuna informativa privacy, termini d'uso, consenso ai dati sanitari né età minima — sforzo M
- [ ] **COM-01** Licenze dei dati di terzi non verificate o non rispettate (ExerciseDB AGPL e GIF, Open Food Facts ODbL) — sforzo M
- [ ] **COM-02** Non si può pagare: niente piani, prova gratuita, abbonamento o fattura — sforzo L
- [ ] **COM-11** Mancano note legali e informazioni obbligatorie del venditore (identità, P.IVA, recesso) — sforzo M
- [ ] **COM-03** Il sito è su *.workers.dev: nessun dominio proprio — sforzo S
- [ ] **ACC-02** Password dimenticata: niente link sul login e niente servizio email — sforzo L
- [ ] **COM-06** L'approvazione manuale di ogni iscritto lascia il cliente in attesa senza notifiche — sforzo M
- [ ] **SIC-02** Un account non si può cancellare, né dall'utente né dall'admin — sforzo M
- [ ] **AFF-02** Sul piano gratuito Cloudflare, superati i tetti giornalieri l'app si ferma per tutti — sforzo S

## 🔴 Bloccanti (5)

### Sicurezza e privacy

- [ ] **SIC-01 · Nessuna informativa privacy, termini d'uso, consenso ai dati sanitari né età minima**  
  🔴 bloccante · sforzo M (1-2 giorni) · Registrazione / tutta l'app

  L'app raccoglie dati sanitari (art. 9 GDPR) e li condivide con terzi: Cloudflare e, tramite le chat collegate, Anthropic. Mancano l'informativa (artt. 13-14), i termini di servizio con recesso e responsabilità, i dati del titolare con la partita IVA e il consenso esplicito, documentato e revocabile. Non è indicata un'età minima. Senza questi elementi l'app non si può vendere nell'UE.

  **Proposta:** Scrivere con un consulente informativa, termini e note legali (titolare, basi giuridiche, sub-responsabili, conservazione, diritti, recesso) e pubblicarli su /privacy e /termini, aggiunte a isPublic nel middleware. In registrazione: due caselle obbligatorie, non preselezionate e distinte (termini; dati sanitari) più la dichiarazione dell'età minima, salvate in una tabella consensi con versione e data. Chiedere il consenso agli utenti esistenti al primo accesso, rendere revocabile il consenso, mettere i link da login, registrazione e Profilo. Valutare una DPIA.

  <sub>Evidenza: ModuloRegistrazione.tsx:43-115 (solo nome/email/password/Turnstile); lib/auth/actions.ts:124-216 e insert :207-212 senza consenso; login/page.tsx:67-72 senza link legali; ricerca 'privacy|informativa|termini|gdpr|consenso' in src: nessun risultato pertinente; nessuna colonna di consenso in d1/migrations; oauth/authorize/page.tsx:93-127 non nomina Anthropic</sub>

### Lancio commerciale

- [ ] **COM-01 · Licenze dei dati di terzi non verificate o non rispettate (ExerciseDB AGPL e GIF, Open Food Facts ODbL)**  
  🔴 bloccante · sforzo M (1-2 giorni) · Esercizio (catalogo, GIF) / Alimentazione (ricerca, cache)

  Il catalogo di 1500 esercizi viene da ExerciseDB, con licenza AGPL-3.0. Le GIF sono scaricate da un CDN di terzi e ridistribuite dal nostro dominio, e nessuno ha verificato i diritti per un uso commerciale. I dati di Open Food Facts (ODbL) richiedono un'attribuzione, e salvati in alimenti_cache formano un database derivato soggetto a share-alike. Oggi la licenza non compare da nessuna parte.

  **Proposta:** Chiedere un parere legale prima del lancio. Per gli esercizi: licenza commerciale di ExerciseDB oppure un catalogo con licenza permissiva (es. free-exercise-db) con immagini proprie. Pagina 'Fonti e licenze' con l'attribuzione ODbL a OFF, USDA e body-highlighter, e 'Fonte: Open Food Facts (ODbL)' sui risultati. Valutare se alimenti_cache va trattata come database derivato.

  <sub>Evidenza: scripts/genera-catalogo-esercizi.mjs:4-5 e d1/seed-esercizi.sql:3 (AGPL-3.0); api/esercizio-gif/[id]/route.ts:31-76 (cache su KV); catalogo/[id]/page.tsx:97-120 (nessuna licenza); alimentazione/types.ts:106-107; queries.ts:576-588; d1/migrations/0002_cache_alimenti.sql; ricerca 'odbl|licenz|license' in src: nessun risultato</sub>

- [ ] **COM-11 · Mancano note legali e informazioni obbligatorie del venditore (identità, P.IVA, recesso)**  
  🔴 bloccante · sforzo M (1-2 giorni) · Tutta l'app / login / futura pagina di acquisto

  Nell'app e nel README non c'è nessuna indicazione di chi vende il servizio: niente ragione sociale, sede, partita IVA, PEC, né informazioni sul diritto di recesso di 14 giorni e sulla garanzia di conformità dei contenuti e servizi digitali. Per un sito che vende a consumatori italiani queste informazioni sono obbligatorie (art. 7 D.Lgs. 70/2003 sul commercio elettronico, art. 35 DPR 633/72 per la P.IVA sul sito, artt. 49 e 52 del Codice del Consumo per i contratti a distanza). È un obbligo diverso da quelli di SIC-01 (privacy, termini, consenso sanitario) e di COM-02 (sistema di pagamento): anche con informativa e pagamenti pronti, senza queste informazioni la vendita resta irregolare.

  **Proposta:** Aggiungere una pagina pubblica 'Note legali' (dati del titolare, sede, P.IVA, PEC, contatto) e una sezione 'Condizioni di vendita' con recesso, durata, rinnovo e garanzia legale. Collegarle dal piè di pagina di login e registrazione, dalla futura pagina di acquisto e da Impostazioni.

  <sub>Evidenza: Cercato 'partita iva|p.iva|note legali|ragione sociale|titolare del trattamento|contatti|privacy|termini' in src, README.md e docs/sviluppo.md: nessun risultato pertinente (solo identificatori di codice come CampiValori). Cercato 'recesso|condizioni|chi siamo|footer' in src: solo un commento in src/app/api/esercizio-gif/[id]/route.ts:11. La pagina di login (src/app/login/page.tsx) non ha piè di pagina né link a informazioni legali.</sub>

- [ ] **COM-02 · Non si può pagare: niente piani, prova gratuita, abbonamento o fattura**  
  🔴 bloccante · sforzo L (una settimana) · Commerciale / Account

  Un account è soltanto attivo o non attivo, e lo decide un admin. Non esistono prezzi, prova gratuita, scadenza o integrazione di pagamento. Non si emettono ricevute o fatture e non si blocca chi smette di pagare.

  **Proposta:** Stripe Billing (Checkout, Customer Portal, webhook firmato su /api/stripe) e colonne piano, stato_abbonamento, fine_prova e stripe_customer_id su users. Il middleware manda chi ha la prova scaduta o un pagamento fallito su una pagina 'rinnova'. Fatturazione elettronica tramite un servizio collegato allo SdI, da decidere con il commercialista.

  <sub>Evidenza: Ricerca 'stripe|paddle|trial|prezz|fattur' in src e d1/migrations: nessun risultato pertinente; lib/auth/roles.ts:13 (solo attivo/in_attesa/sospeso/bloccato); package.json senza SDK di pagamento</sub>

### Grafica e navigazione

- [ ] **GRA-01 · Peso, Piatti, Catalogo e Miei esercizi non raggiungibili da telefono**  
  🔴 bloccante · sforzo S (ore) · Navigazione mobile / Salute

  Le voci fuoriBarra mancano dalla barra in basso, e la sidebar sotto lg è nascosta. Nessuna pagina ha un link a /peso, /alimentazione/piatti, /esercizio/catalogo o /esercizio/miei. Da telefono quindi non si registra il peso, non si correggono o eliminano i piatti e non si creano esercizi personali. Il messaggio 'Creane uno nella sezione Piatti' porta a un vicolo cieco.

  **Proposta:** Aggiungere un widget Peso alla dashboard Salute con link a /peso. Mettere scorciatoie contestuali: 'Gestisci i miei piatti' in Aggiungi e nel Diario, 'Schede, Catalogo, Miei esercizi' in cima a /esercizio, 'Crea esercizio personale' quando la ricerca non trova niente. In alternativa, una voce 'Altro' nella barra. Aggiungere un controllo in barra.ts che segnali le voci fuoriBarra senza punto d'ingresso.

  <sub>Evidenza: peso/module.config.ts:14; alimentazione/module.config.ts:16-25; esercizio/module.config.ts:21,28,35; core/navigazione/barra.ts:55; Sidebar.tsx:56 (hidden lg:flex); HeaderMobile.tsx:69-90; RicercaAggiungi.tsx:581-584; docs/flusso.canvas:26</sub>

## 🟠 Gravità alta (38)

### Sicurezza e privacy

- [ ] **SIC-02 · Un account non si può cancellare, né dall'utente né dall'admin**  
  🟠 alta · sforzo M (1-2 giorni) · Profilo / Utenti

  Non esiste nessuna funzione di eliminazione: la pagina Utenti rimanda a 'wrangler d1 execute'. Il diritto alla cancellazione (art. 17) diventa così un'operazione SQL manuale in produzione. Il cascade su D1 non tocca i PDF in KV, e le richieste rifiutate restano per sempre con nome, email e hash della password. Non è bloccante, perché la richiesta può essere evasa a mano entro un mese.

  **Proposta:** Aggiungere 'Elimina account' in Profilo: conferma con password e scrittura di 'ELIMINA', proposta di scaricare prima il backup, poi cancellazione con tabelleUtente()/ordinaPerDipendenze in un batch, delle chiavi KV con prefisso user_id/, delle sessioni e dei token OAuth. La stessa azione per l'admin, anche per le richieste rifiutate.

  <sub>Evidenza: UtentiSettings.tsx:288-295; ricerca 'delete from users|eliminaAccount' in src: nessun risultato; bollette/queries.ts:152-167 (allegati in KV fuori dal cascade); d1/migrations/0001_init.sql:21,33</sub>

- [ ] **SIC-03 · Reset della password da admin: nessun cambio obbligato, nessuna verifica d'identità, nessuna traccia**  
  🟠 alta · sforzo M (1-2 giorni) · Impostazioni › Utenti

  Qualsiasi admin può generare una password temporanea per qualunque account non superadmin, altri admin compresi, ed entrare nei suoi dati sanitari. Non c'è verifica di chi chiede il reset. Niente obbliga a cambiare la temporanea o le password scelte dall'admin alla creazione dell'account. Nessuna azione dell'admin viene registrata. Il titolare se ne accorge solo perché le sue sessioni si chiudono.

  **Proposta:** Colonna users.password_da_cambiare (temporanea con scadenza a 24 h) e un redirect obbligato a 'Scegli la tua password'. Reset sugli admin riservato al superadmin. Tabella audit_admin (chi, cosa, su chi, quando), visibile al superadmin e mostrata all'utente in Profilo. Una procedura scritta di verifica dell'identità, poi il reset via email.

  <sub>Evidenza: lib/auth/roles.ts:21-25; impostazioni/queries.ts:48-63, :206-239; UtentiSettings.tsx:110-115; ProfiloSettings.tsx:335-339; ricerca 'must_change|deve_cambiare|audit' in src e d1: nessun risultato</sub>

- [ ] **SIC-04 · Il Worker di sviluppo pubblico può leggere e scrivere il database di produzione**  
  🟠 alta · sforzo M (1-2 giorni) · Infrastruttura (wrangler, deploy)

  L'ambiente dev, pubblicato a ogni push su develop, ha il binding DB_PROD. La 'sola lettura' è solo una convenzione. Qualsiasi difetto del codice di sviluppo espone i dati sanitari dei clienti, comprese le sessioni salvate in chiaro.

  **Proposta:** Togliere DB_PROD dal Worker dev. Fare la sync da terminale o con un endpoint di produzione protetto che restituisce solo i dati del richiedente. In alternativa, mettere il dev dietro Cloudflare Access.

  <sub>Evidenza: wrangler.jsonc:54-61; .github/workflows/deploy.yml; impostazioni/sync.ts:51-62; lib/cf.ts:22-25</sub>

### Lancio commerciale

- [ ] **COM-03 · Il sito è su *.workers.dev: nessun dominio proprio**  
  🟠 alta · sforzo S (ore) · Infrastruttura / Marchio

  L'indirizzo gestione-personale.personalmanage.workers.dev sembra un sito di prova e non ispira fiducia per caricare dati sanitari. Senza un dominio proprio non si possono mandare email, e Turnstile su workers.dev può dare l'errore 110200.

  **Proposta:** Registrare un dominio legato al nuovo marchio e collegarlo come Custom Domain del Worker. Dichiararlo su Turnstile, usarlo come mittente delle email e reindirizzare workers.dev con un 301.

  <sub>Evidenza: README.md:5; wrangler.jsonc senza routes/custom_domain; docs/sviluppo.md:163-167</sub>

- [ ] **COM-04 · Nessun canale di assistenza, aiuto o feedback**  
  🟠 alta · sforzo S (ore) · Impostazioni / login

  Non esistono un indirizzo di supporto, una pagina di aiuto o un modo per segnalare un problema. I messaggi 'Contatta un amministratore' non dicono come farlo. Chi dimentica la password o trova un errore non sa a chi rivolgersi.

  **Proposta:** Aggiungere 'Aiuto e contatti' in Impostazioni, con FAQ, l'indirizzo supporto@dominio e un modulo 'Segnala un problema' che allega in automatico pagina e versione e salva in una tabella letta dall'admin. Mettere il contatto anche sul login e nei messaggi di errore.

  <sub>Evidenza: lib/auth/actions.ts:88,91; impostazioni/module.config.ts:16-32; ricerca 'supporto|assistenza|faq|feedback|mailto' in src: nessun canale</sub>

- [ ] **COM-05 · Nessuna pagina pubblica di presentazione: chi arriva finisce sul login**  
  🟠 alta · sforzo M (1-2 giorni) · / e /login

  Chi non ha sessione viene mandato a /login, dove trova un'icona generica e 'Accedi al tuo spazio'. Nessuna pagina spiega cosa fa l'app, quanto costa, chi la gestisce o come si installa: queste informazioni stanno solo nel README.

  **Proposta:** Una landing statica su / per chi non ha sessione: proposta di valore, schermate da telefono, prezzi, FAQ, istruzioni di installazione, link legali e i pulsanti 'Prova gratis' e 'Accedi'. Chi è loggato continua ad andare alla dashboard.

  <sub>Evidenza: src/app/page.tsx:4-6; middleware.ts:104-145, :178-181; login/page.tsx:19-25; layout.tsx:15</sub>

- [ ] **COM-06 · L'approvazione manuale di ogni iscritto lascia il cliente in attesa senza notifiche**  
  🟠 alta · sforzo M (1-2 giorni) · Registrazione / In attesa / Utenti

  Ogni registrazione resta 'in_attesa' finché un admin non entra in Utenti, e nessuno lo avvisa. La pagina di attesa è statica, dice 'fai un fischio a chi ti ha mandato il link' e promette di aggiornarsi da sola senza farlo. All'approvazione l'utente non riceve nessuna notifica. Lista unica, approvazione una alla volta: con centinaia di iscritti non regge.

  **Proposta:** Per la vendita: attivazione immediata con prova gratuita, tenendo come freno Turnstile e la verifica dell'email. Se l'approvazione resta: contatore delle richieste sulla voce Utenti, email all'admin e all'utente approvato, controllo automatico dello stato ogni 30-60 s nella pagina di attesa, tempo indicativo e contatto di supporto, filtro 'Da approvare' e approvazione multipla.

  <sub>Evidenza: lib/auth/actions.ts:206-215; in-attesa/page.tsx:20-50; impostazioni/queries.ts:17-28; UtentiSettings.tsx:77, :125-233; 'in_attesa' assente dalla navigazione</sub>

### Accesso e account

- [ ] **ACC-01 · Dopo il login si perde la pagina richiesta e il collegamento della chat si interrompe**  
  🟠 alta · sforzo S (ore) · Middleware / login / OAuth

  Il redirect a /login non conserva la destinazione, e loginAction porta sempre a /consumi-costi. Chi collega Claude da un browser senza sessione, cioè quasi sempre da telefono, fa il login e finisce sulla dashboard: il consenso OAuth si perde. Succede lo stesso con la scorciatoia PWA 'Aggiungi un pasto' a sessione scaduta. Il commento della pagina di consenso dice il contrario.

  **Proposta:** Nel middleware e in requireSessionUser rimandare a /login?next=<path+query>. Il form passa il valore in un campo nascosto, e loginAction ci rimanda solo se è un percorso interno (inizia con '/' e non con '//'). Fare lo stesso per la registrazione. Provare il giro claude.ai → authorize → login → consenso.

  <sub>Evidenza: middleware.ts:177-181; lib/auth/session.ts:135-139; lib/auth/actions.ts:99; oauth/authorize/page.tsx:19-21 (commento falso); manifest.ts:41; ricerca 'next=|returnTo|redirectTo' in src: nessun risultato</sub>

- [ ] **ACC-02 · Password dimenticata: niente link sul login e niente servizio email**  
  🟠 alta · sforzo L (una settimana) · Login / recupero accesso

  Il login non ha il link di recupero, e la spiegazione sta in Profilo, visibile solo a chi è già entrato. Il reset passa da un admin che genera una password e la 'comunica a voce', cosa impossibile con clienti sconosciuti e senza canale di contatto. Non esiste un servizio email, quindi mancano anche verifica dell'indirizzo, benvenuto, ricevute e avvisi. Esiste una via di recupero, quindi non è bloccante.

  **Proposta:** Collegare un servizio transazionale (Resend, Postmark o SES) con SPF/DKIM/DMARC sul nuovo dominio. Creare /password-dimenticata e /reimposta?token con un token monouso, salvato con hash e valido 30 minuti, e chiudere le sessioni dopo il cambio. Aggiungere i modelli in italiano per benvenuto, approvazione e ricevute. Tenere il reset da admin come ripiego.

  <sub>Evidenza: login/page.tsx:27-72; ProfiloSettings.tsx:335-339; impostazioni/queries.ts:200-239; UtentiSettings.tsx:111; lib/auth/actions.ts:134-137; ricerca 'resend|smtp|MailChannels|forgot' in src: nessun risultato</sub>

### Grafica e navigazione

- [ ] **GRA-02 · Su iPhone ogni campo fa ingrandire la pagina**  
  🟠 alta · sforzo S (ore) · Tutti i form (inputClass), data del Diario

  inputClass usa text-sm (14 px) e il selettore della data del Diario text-xs (12 px). Safari su iOS ingrandisce la pagina su ogni campo con testo sotto i 16 px e non torna indietro da solo: a ogni inserimento l'utente deve riportare lo zoom con due dita.

  **Proposta:** Usare 'text-base lg:text-sm' in inputClass e nei campi scritti a mano, e portare la data del Diario a min-h-11. Non usare maximum-scale=1.

  <sub>Evidenza: core/components/controls.tsx:14-15; DiarioGiorno.tsx:255; login/page.tsx:37,49-50; PreferenzeModuli.tsx:63,79; layout.tsx:25-31</sub>

### Accessibilità

- [ ] **A11Y-01 · I toast con 'Annulla' e gli errori spariscono in 4-8 secondi**  
  🟠 alta · sforzo S (ore) · Toast

  I timer sono fissi e non si fermano al tocco o al focus. Il toast è l'unico modo di annullare 12 azioni distruttive, che non chiedono conferma. Gli errori spariscono dopo 4 s e passano dalla stessa regione 'polite' delle conferme (WCAG 2.2.1).

  **Proposta:** Mettere in pausa il timer su pointerenter, focusin e touchstart. Lasciare gli errori finché l'utente non li chiude, in una regione role=alert. Portare i toast con Annulla ad almeno circa 10 s.

  <sub>Evidenza: core/components/Toast.tsx:41-42, :56-59, :68; 12 occorrenze di 'label: Annulla'</sub>

- [ ] **A11Y-02 · Verde e giallo usati come testo sono quasi illeggibili in tema chiaro**  
  🟠 alta · sforzo S (ore) · Badge di stato e conferme

  --success e --warning servono per colori pieni ma vengono usati come testo, con contrasto 2,30:1 e 2,14:1 sulla card. Le etichette 'Pagata', 'Da dividere', '3g' e 'Salvato' si leggono a fatica.

  **Proposta:** Aggiungere token per il testo di stato, come --success-testo (142 72% 26%) e --warning-testo (32 95% 28%), con contrasto ≥4,5, e usarli in Badge e nelle conferme.

  <sub>Evidenza: core/components/ui.tsx:74-75; globals.css:16-17; BolletteList.tsx:351-488; PreferenzeModuli.tsx:90,170; ProfiloSettings.tsx:275,326</sub>

- [ ] **A11Y-03 · Il colore d'accento scelto dall'utente rende illeggibili link, voce attiva e anello di focus**  
  🟠 alta · sforzo M (1-2 giorni) · Tema (tutta l'app)

  La palette controlla solo il contrasto del testo sopra --primary, ma --primary è usato anche come colore del testo e come anello di focus. In tema chiaro il contrasto è 1,54:1 con Verde, 1,46 con Verde acqua, 2,01 con Ciano; in scuro 2,99 con Indaco. La schermata promette invece testi 'sempre leggibili'.

  **Proposta:** Token derivati --primary-testo (≥4,5 su background, card e muted) e --ring (≥3), calcolati in variabiliTema() e mappati in tailwind. Un test su tutti i preset in entrambi i temi.

  <sub>Evidenza: core/theme/palette.ts:174-191; ProfiloSettings.tsx:220-223; BarraInferiore.tsx:71; HeaderMobile.tsx:81; controls.tsx:15 (focus:ring-primary); 19 occorrenze di text-primary</sub>

- [ ] **A11Y-04 · Le finestre modali non gestiscono il focus**  
  🟠 alta · sforzo M (1-2 giorni) · Modale, Foglio, pannello widget, avviso doppione

  All'apertura il focus resta sulla pagina sotto, Tab prosegue dietro il velo e alla chiusura il focus non torna al pulsante di partenza. Il primo elemento tabulabile è il velo 'Chiudi'. Il pannello widget e l'avviso doppione sono ancora copie scritte a mano, e l'avviso non si chiude con Esc.

  **Proposta:** Riscrivere Modale su <dialog> con showModal(), oppure gestire a mano focus iniziale, trappola, inert e ritorno del focus. Togliere il velo dalla sequenza di Tab e portare Foglio, pannello widget e avviso doppione su Modale.

  <sub>Evidenza: core/components/Modale.tsx:39-45, :66-70; HeaderMobile.tsx:152-185; DashboardGrid.tsx:290-312; RicercaAggiungi.tsx:423-438; ricerca '.focus()|inert' in src: nessun risultato</sub>

### Affidabilità e prestazioni

- [ ] **AFF-01 · Con 100 o più allenamenti si rompono Andamento e i riquadri della dashboard Salute**  
  🟠 alta · sforzo S (ore) · Esercizio / Andamento / Dashboard Salute

  listAllenamenti costruisce una clausola IN con un segnaposto per ogni allenamento. D1 accetta al massimo 100 parametri, mentre il SQLite locale non ha questo limite, quindi in sviluppo non si vede. riepilogoAllenamento ne usa 101 e andamentoAllenamenti fino a 500. Oltre i 100 allenamenti la pagina Andamento va in errore e i riquadri Bilancio e Riepilogo restano su '…'. attributiEsercizi ha lo stesso schema.

  **Proposta:** Sostituire la IN con una subquery (select id from allenamenti where user_id=? order by … limit ?) o con una join, oppure spezzare gli id in blocchi da 90. Aggiungere un test con 150 allenamenti.

  <sub>Evidenza: esercizio/allenamenti.ts:136-142, :86-92, :462, :498; alimentazione/andamento/page.tsx:10-15; BilancioEnergetico.tsx:18; RiepilogoAllenamento.tsx:18</sub>

- [ ] **AFF-02 · Sul piano gratuito Cloudflare, superati i tetti giornalieri l'app si ferma per tutti**  
  🟠 alta · sforzo S (ore) · Infrastruttura (Workers, D1, KV)

  Sul piano gratuito si hanno circa 10 ms di CPU per richiesta (l'errore 1102 è già capitato), 100.000 richieste al giorno, KV con 1 GB e 1.000 scritture al giorno. Il middleware interroga D1 a ogni richiesta, quindi a quota esaurita non si apre più nessuna pagina. listRecenti e listEsercizi leggono molte righe a ogni apertura. PDF e cache delle GIF condividono lo stesso KV.

  **Proposta:** Passare a Workers Paid prima del lancio e impostare limits.cpu_ms e gli avvisi di consumo. Spostare i PDF su R2, separati dalle GIF. Rendere incrementale listRecenti. Togliere dal README la frase sul piano gratuito.

  <sub>Evidenza: README.md:130; docs/sviluppo.md:16-17; middleware.ts:152-163; alimentazione/queries.ts:276-291; esercizio/queries.ts:104-132; bollette/queries.ts:161-171</sub>

- [ ] **AFF-03 · Errori e 404 mostrano le pagine inglesi di Next, senza via d'uscita**  
  🟠 alta · sforzo S (ore) · Tutta l'app (PWA)

  Mancano error.tsx, global-error.tsx e not-found.tsx. Un errore del server mostra 'Application error…' in inglese senza menu, e notFound() mostra '404 This page could not be found'. Nell'app installata a schermo intero non c'è nemmeno il tasto indietro del browser. Anche il middleware interroga D1 senza try/catch.

  **Proposta:** Aggiungere (app)/error.tsx dentro l'AppShell, con 'Riprova' tramite reset(), 'Torna alla dashboard' e il digest da citare al supporto. Aggiungere global-error.tsx e not-found.tsx in italiano. Nel middleware un try/catch con una pagina 'Servizio momentaneamente non disponibile'.

  <sub>Evidenza: find src/app error.tsx/not-found.tsx/global-error.tsx: nessun file; abbonamenti/[id]/page.tsx:13; catalogo/[id]/page.tsx:17; manifest.ts:19 (standalone); middleware.ts:152-163</sub>

- [ ] **AFF-04 · Riquadri ed elenchi restano su '…' o 'Caricamento…' all'infinito quando il server fallisce**  
  🟠 alta · sforzo M (1-2 giorni) · Dashboard, Bollette, Abbonamenti, Allenamento, Andamento

  Nei .tsx ci sono 33 .then() e 9 .catch(). Widget, elenchi bollette e abbonamenti, dettaglio allenamento e Andamento restano bloccati in caricamento se la chiamata fallisce. Il changelog dichiara il problema corretto, ma la correzione copre solo l'Esercizio, dove i messaggi parlano di 'migration del database'. Nemmeno 'Salvato' del layout gestisce l'errore.

  **Proposta:** Un hook comune useDati(fn) che restituisca {dati, errore, riprova} e un componente <StatoErrore> ('Non riesco a caricare i dati. Controlla la connessione e riprova'), usati ovunque. Togliere il gergo delle migration. Aggiungere una regola di lint su .then senza catch.

  <sub>Evidenza: RiepilogoCosti.tsx:21-25; DashboardGrid.tsx:82, :131, :162; BolletteList.tsx:66-85; AbbonamentiList.tsx:30; AndamentoSalute.tsx:61-64; MacroOggi.tsx:123-140; AllenamentoDettaglio.tsx:48-54; AllenamentiList.tsx:76; EserciziList.tsx:45; changelog.ts:194</sub>

- [ ] **AFF-05 · Dopo ogni rilascio l'app già aperta sul telefono smette di salvare**  
  🟠 alta · sforzo M (1-2 giorni) · Rilasci / PWA

  Gli ID delle server action cambiano a ogni build e ogni push su main va in produzione. La PWA lasciata aperta continua a usare il JS vecchio e riceve 'Failed to find Server Action' o chunk mancanti: i pasti non si salvano finché l'utente non chiude e riapre l'app, e nessuno glielo dice.

  **Proposta:** Attivare la skew protection di OpenNext, o almeno fissare NEXT_SERVER_ACTIONS_ENCRYPTION_KEY. Intercettare gli errori di azione o chunk mancante con un avviso 'Nuova versione disponibile: tocca per aggiornare'.

  <sub>Evidenza: Ricerca 'deploymentId|NEXT_SERVER_ACTIONS_ENCRYPTION_KEY|skew': nessun risultato; open-next.config.ts:3; .github/workflows/deploy.yml</sub>

### Consumi e Costi

- [ ] **CON-01 · Gli allegati sopra 1 MB non si caricano**  
  🟠 alta · sforzo S (ore) · Bollette - allegati

  Il file passa come argomento della server action uploadAllegato, e Next limita il corpo delle server action a 1 MB. Nel progetto il limite non è alzato. Le bollette scansionate e molti PDF dei gestori lo superano, e in quel caso compare un errore generico e tecnico. Manca anche un controllo della dimensione lato client.

  **Proposta:** Caricare con una route POST dedicata (/api/allegati), in streaming verso R2 o KV, oppure alzare bodySizeLimit. Mettere un limite esplicito di 10 MB controllato sia sul client sia sul server, con un messaggio in italiano. Se createBolletta fallisce, ripulire il file già caricato.

  <sub>Evidenza: BollettaForm.tsx:101-115 e :140-143 (mostra err.message); bollette/queries.ts:161-172; next.config.mjs senza serverActions.bodySizeLimit; ricerca 'bodySizeLimit|file.size' in src: nessun risultato</sub>

- [ ] **CON-02 · 'Rimuovi' sull'allegato cancella subito il file, anche se poi si annulla**  
  🟠 alta · sforzo S (ore) · Bollette - modifica

  In modifica, 'Rimuovi' cancella subito il PDF da KV, prima del salvataggio e senza conferma. Se l'utente preme Annulla, la bolletta resta collegata a un file che non esiste più e il documento è perso. Per sostituire un allegato bisogna per forza passare da 'Rimuovi'.

  **Proposta:** Segnare il file come 'da rimuovere' solo nello stato del form (con un 'Ripristina') e cancellarlo da KV dopo un updateBolletta riuscito. Aggiungere 'Sostituisci' e 'Apri' accanto all'allegato.

  <sub>Evidenza: BollettaForm.tsx:149-159 (removeAllegato al clic), :309-349 (nessun input di sostituzione), :362-368 (Annulla = router.back); bollette/queries.ts:181-185</sub>

- [ ] **CON-03 · Abbonamenti senza addebito automatico: ogni rata va spuntata a mano**  
  🟠 alta · sforzo S (ore) · Abbonamenti

  Tutte le rate nascono 'da_pagare', anche quelle addebitate in automatico, che sono la maggior parte. Un abbonamento iniziato due anni fa genera subito circa 24 rate arretrate da spuntare una per una, e intanto la dashboard segnala debiti che non esistono.

  **Proposta:** Casella 'Addebito automatico', attiva di default: le rate scadute nascono già pagate alla loro data. Nel dettaglio, un pulsante 'Segna pagate tutte le arretrate'.

  <sub>Evidenza: abbonamenti/queries.ts:44-53 (insert 'da_pagare'), :203 (una rata alla volta); AbbonamentoForm.tsx:78-81; AbbonamentoDettaglio.tsx:293-317; AbbonamentiAttivi.tsx:251-252</sub>

### Alimentazione

- [ ] **ALI-01 · Il '+' centrale aggiunge sempre a oggi, anche guardando un altro giorno**  
  🟠 alta · sforzo S (ore) · Diario (telefono)

  Su telefono il pulsante Aggiungi del diario, che passa ?data=, è nascosto, e il '+' della barra porta sempre ad /alimentazione/aggiungi senza data. Chi guarda ieri e tocca '+' registra il pasto oggi.

  **Proposta:** Quando l'utente è nel diario, la barra aggiunge ?data= (e il pasto) all'azione principale. In alternativa, un pulsante flottante 'Aggiungi a ieri' quando il giorno mostrato non è oggi.

  <sub>Evidenza: BarraInferiore.tsx:54; alimentazione/module.config.ts:30-34; DiarioGiorno.tsx:300-308 (hidden lg:inline-flex); RicercaAggiungi.tsx:86-89</sub>

- [ ] **ALI-02 · Il calcolatore degli obiettivi non ha limiti di sicurezza né avvertenze sanitarie**  
  🟠 alta · sforzo S (ore) · Obiettivi (calcolatore)

  Il calcolatore accetta qualsiasi età, peso e altezza e non ha un minimo di calorie: a una donna di 60 anni e 45 kg propone circa 950 kcal. Le proteine sono 2 g per kg di peso totale, quindi 300 g a 150 kg. Mancano avvertenze per minori, gravidanza e disturbi alimentari e il 'non sostituisce il parere medico'.

  **Proposta:** Validare gli intervalli (età 18-100, peso 30-300, altezza 120-230). Fissare un minimo di kcal (1200 per le donne, 1500 per gli uomini) con una spiegazione. Calcolare le proteine sul peso di riferimento quando il BMI supera 30. Aggiungere un'avvertenza fissa nel calcolatore e nei termini.

  <sub>Evidenza: alimentazione/types.ts:381-419; CalcolaObiettivi.tsx:56-58; ricerca 'medic|non sostituisce|gravidanz' in src: nessun risultato</sub>

- [ ] **ALI-03 · Bilancio energetico: l'allenamento conta due volte e gli obiettivi 'minimo' risultano in rosso**  
  🟠 alta · sforzo S (ore) · Bilancio energetico / Calorie / Diario

  L'obiettivo calorico include già l'attività (fattore LAF), ma il bilancio sottrae anche le kcal stimate degli allenamenti, calcolate in modo lordo come MET×kg×ore: chi si allena crede di avere più margine di quello reale. Il diario confronta l'obiettivo con le calorie mangiate, la dashboard con il netto, quindi lo stesso giorno dà esiti opposti. Superare un obiettivo di tipo 'minimo' (aumento di massa) viene mostrato in rosso come un errore.

  **Proposta:** Adottare una regola sola e usarla sia nel diario sia nella dashboard. O il livello di attività esclude gli allenamenti, o si sottrae solo la quota netta (MET−1)×kg×ore. Colori e testi devono tenere conto di obiettivo.tipo. Aggiungere una riga 'Come la calcoliamo'.

  <sub>Evidenza: alimentazione/types.ts:363-369, :381-384, :400; BilancioEnergetico.tsx:18, :25-47; CalorieOggiESettimana.tsx:62, :106-109; core/dashboard/queries.ts:74-79; DiarioGiorno.tsx:417-421; esercizio/met.ts:95-101</sub>

- [ ] **ALI-26 · La ricerca alimenti usa un endpoint di Open Food Facts che risponde 503 circa una volta su tre**  
  🟠 alta · sforzo S (ore) · Alimentazione / Aggiungi

  cercaOFF interroga il vecchio /cgi/search.pl. Nel giro dal vivo, un utente nuovo che cercava 'parmigiano' ha visto 'Gli archivi esterni non hanno risposto' e non poteva aggiungere niente se non a mano. È il flusso principale dell'area Salute. Misurato su 9 chiamate: /cgi/search.pl ha dato 503 in 3 casi su 9 (sia it. sia world.), mentre search.openfoodfacts.org (il motore nuovo, 'search-a-licious') ha risposto 3 volte su 3 in circa 200 ms. I 3 tentativi da 400 ms di fetchConRetry non bastano quando il 503 dura qualche secondo.

  **Proposta:** Passare a https://search.openfoodfacts.org/search (filtrando i campi), tenendo /cgi/search.pl come ripiego. Mostrare intanto i risultati locali (piatti, recenti, cache) invece del solo errore. Avere una base di alimenti generici italiani sempre disponibile (vedi ALI-07).

  <sub>Evidenza: alimentazione/queries.ts:443-450 (URL), :401-421 (fetchConRetry 3×400 ms); prova con fetch da Node, 3 giri su 3 endpoint</sub>

- [ ] **ALI-04 · La ricerca su Open Food Facts non ha timeout e rischia di superare il limite di richieste**  
  🟠 alta · sforzo M (1-2 giorni) · Aggiungi (ricerca)

  La ricerca usa search.pl, che è lento, con fetch senza timeout e 3 tentativi, anche dopo una risposta 429. Tutte le richieste partono dagli IP di Cloudflare con un User-Agent senza contatto, e OFF limita a circa 10 ricerche al minuto. Con qualche decina di utenti a pranzo, il flusso principale risponde 'archivi non raggiungibili' o resta in attesa a lungo.

  **Proposta:** Mettere AbortSignal.timeout(4000) per tentativo, al massimo un retry e nessuno sui 4xx. Usare un User-Agent con email di contatto. Mostrare subito cache e piatti. A medio termine, importare in D1 un sottoinsieme dei prodotti italiani OFF (o usare l'API v2) e cercare lì per primo.

  <sub>Evidenza: alimentazione/queries.ts:401-421 (fetchConRetry), :441-452, :573; useRicercaAlimenti.ts:22</sub>

- [ ] **ALI-05 · Manca la scansione del codice a barre**  
  🟠 alta · sforzo M (1-2 giorni) · Aggiungi

  I prodotti confezionati si trovano solo scrivendo il nome. Nei concorrenti la scansione del codice a barre è la funzione principale. La Permissions-Policy oggi blocca anche la fotocamera.

  **Proposta:** Pulsante 'Scansiona' in Aggiungi: BarcodeDetector con ripiego su zxing-js, poi OFF /api/v2/product/{ean} passato dal controllo di coerenza dei valori, salvataggio dell'EAN in cache e apertura diretta della scheda quantità. Impostare camera=(self). Se il prodotto non c'è, aprire il modulo 'A mano' con il codice già compilato.

  <sub>Evidenza: Ricerca 'barcode|BarcodeDetector|zxing|getUserMedia' in src: nessun risultato; alimentazione/queries.ts:445; middleware.ts:85-86 (camera=())</sub>

- [ ] **ALI-06 · I carboidrati si contano in tre modi diversi (le fibre USDA due volte)**  
  🟠 alta · sforzo M (1-2 giorni) · Diario, Andamento, Dashboard

  Il diario somma carboidrati e fibre, mentre Andamento e i widget usano i carboidrati senza fibre: lo stesso giorno ha due valori e l'obiettivo risulta rispettato in un posto e sforato nell'altro. USDA dichiara i carboidrati 'by difference', che includono già le fibre, quindi per quegli alimenti le fibre si contano due volte.

  **Proposta:** Adottare una sola convenzione (carboidrati da etichetta UE, fibra esclusa), normalizzare all'import i dati USDA e usare un'unica funzione totaliGiorno ovunque, calcolatore compreso.

  <sub>Evidenza: DiarioGiorno.tsx:407-416; AndamentoAlimentazione.tsx:97, :363-371; MacroOggi.tsx:100-137; MedieMacro.tsx:13; alimentazione/queries.ts:500-513; types.ts:412-416</sub>

- [ ] **ALI-07 · Gli alimenti generici italiani sono difficili da trovare**  
  🟠 alta · sforzo L (una settimana) · Ricerca

  OFF contiene quasi solo prodotti di marca. USDA viene interrogato in italiano e risponde con nomi inglesi e senza porzioni: per 'latte' è probabile che restituisca 'Coffee, latte'. Mela, zucchine e petto di pollo restituiscono risultati non pertinenti. Mancano le tabelle italiane CREA, BDA o CIQUAL.

  **Proposta:** Importare in D1 una tabella italiana di alimenti generici (CREA, verificando la licenza, oppure CIQUAL, aperta) con porzioni domestiche, e cercarla per prima. Usare USDA solo come ultima risorsa o toglierlo.

  <sub>Evidenza: alimentazione/queries.ts:443-517; ricerca 'crea|bda|ciqual' nel modulo: nessun risultato</sub>

### Esercizio e peso

- [ ] **ESE-01 · Pressa 45° e hack squat chiedono minuti e km invece di ripetizioni e kg**  
  🟠 alta · sforzo S (ore) · Allenamento / Schede

  Gli esercizi con MET ≥ 7 vengono trattati come cardio. 'sled machine' ha MET 8, quindi 18 esercizi di forza, tra cui la leg press, chiedono durata e distanza. Lo stesso succede a 10 esercizi su 11 con la corda. Il plank invece chiede ripetizioni e kg. Le calorie di questi esercizi risultano gonfiate.

  **Proposta:** Aggiungere al catalogo una colonna tipo (forza / cardio / a tempo), calcolata nello script di generazione con correzioni manuali e modificabile per singolo esercizio. Portare il MET di 'sled machine' a circa 5.

  <sub>Evidenza: esercizio/met.ts:34-35; AllenamentoDettaglio.tsx:33-38; SchedaDettaglio.tsx:238-240; d1/seed-esercizi.sql (18 righe 'sled machine' non cardio)</sub>

- [ ] **ESE-02 · Con la virgola decimale il carico viene salvato vuoto**  
  🟠 alta · sforzo S (ore) · Allenamento / Schede

  Carico, distanza e durata usano type=number, letti con Number() e salvati quando si esce dal campo. Se il browser rifiuta '62,5' il valore diventa '', e salva() scrive peso_kg = null senza avviso: il carico sparisce e cambia anche la stima delle calorie.

  **Proposta:** Sostituire questi campi con NumberInput e parseNumero, come fa RegistroPeso.tsx. Non salvare null quando il testo non è vuoto ma non si converte: evidenziare il campo in rosso. Dare una conferma discreta a salvataggio riuscito.

  <sub>Evidenza: core/components/controls.tsx:25-30; AllenamentoDettaglio.tsx:199-251, :520-523, :571-614; SchedaDettaglio.tsx:256-260, :286-337</sub>

- [ ] **ESE-03 · L'elenco mostra solo gli ultimi 30 allenamenti**  
  🟠 alta · sforzo S (ore) · Allenamenti

  listAllenamenti() ha un limite predefinito di 30 e non c'è paginazione. Dopo due o tre mesi gli allenamenti più vecchi non si aprono più, e nessuna scritta avverte che l'elenco è troncato.

  **Proposta:** Paginazione a cursore su (data, created_at) con un pulsante 'Mostra allenamenti precedenti', oppure raggruppamento per mese. Finché manca, scrivere 'ultimi 30'.

  <sub>Evidenza: esercizio/allenamenti.ts:112, :126; AllenamentiList.tsx:34</sub>

- [ ] **ESE-04 · Mancano storico, record e progressi per singolo esercizio**  
  🟠 alta · sforzo M (1-2 giorni) · Catalogo / Andamento

  La pagina di un esercizio non mostra quando lo si è fatto né con quali carichi. Mancano carico massimo, 1RM, volume e un grafico dei progressi. L'Andamento conta solo i minuti, quindi alla domanda 'sto migliorando?' l'app non risponde.

  **Proposta:** Sezione 'I tuoi numeri' nella pagina dell'esercizio: ultime sessioni, carico massimo, 1RM con la formula di Epley e un grafico. Toast 'Nuovo record!' quando si supera il massimo. Indice su allenamento_serie(user_id, esercizio_id).

  <sub>Evidenza: catalogo/[id]/page.tsx:10-121; AndamentoAllenamenti.tsx:35-60; d1/migrations/0008_esercizio.sql (indice solo su allenamento_id, ordine)</sub>

- [ ] **ESE-05 · Le serie e gli allenamenti si perdono senza avviso se la rete cade**  
  🟠 alta · sforzo M (1-2 giorni) · Allenamento / Schede

  Le serie si salvano all'uscita dal campo senza catch, e anche creare un allenamento, avviare una scheda, aggiungere serie o togliere una voce usano try/finally senza catch. In palestra, con poca rete, il numero resta a schermo ma non è salvato, e nessun messaggio lo segnala.

  **Proposta:** Mostrare lo stato di ogni riga (salvato, in corso, errore con 'Riprova'), un toast 'Non salvato: controlla la connessione' in tutti questi punti e un salvataggio anche su visibilitychange. Poi una coda locale per le modifiche non inviate.

  <sub>Evidenza: AllenamentoDettaglio.tsx:57-74, :199-214, :281-292, :511-531; AllenamentiList.tsx:178-194; SchedaDettaglio.tsx:63-77; manifest.ts:8-9</sub>

- [ ] **ESE-06 · Nomi e istruzioni degli esercizi sono in inglese**  
  🟠 alta · sforzo L (una settimana) · Catalogo / Allenamento / Schede

  La ricerca accetta l'italiano, ma i 1500 esercizi compaiono con il nome inglese ('sled 45° leg press') in elenco, allenamento e scheda, e le istruzioni passo passo sono in inglese. L'utente può solo rinominarli uno alla volta.

  **Proposta:** Generare una volta le colonne nome_it e istruzioni_it (traduzione assistita, con revisione dei 200-300 esercizi più usati) e mostrarle di default, tenendo l'inglese come alias di ricerca.

  <sub>Evidenza: esercizio/traduzioni.ts:4-9; catalogo/[id]/page.tsx:33, :80-87; d1/seed-esercizi.sql</sub>

### Impostazioni e chat

- [ ] **IMP-01 · Nell'app non c'è nessuna guida per collegare una chat**  
  🟠 alta · sforzo S (ore) · Profilo › Chat collegate

  L'indirizzo /api/mcp e l'identificativo del client compaiono solo in docs/sviluppo.md. Il riquadro 'Chat collegate' resta nascosto finché non c'è un collegamento, quindi l'utente non sa nemmeno che la funzione esiste.

  **Proposta:** Mostrare sempre il riquadro. Quando è vuoto, una guida in 3 passi con l'indirizzo completo e l'id del client, ciascuno con un pulsante 'Copia', un link ai connettori di claude.ai, una riga su lettura e scrittura e l'indicazione dei piani di Claude che lo supportano.

  <sub>Evidenza: ChatCollegate.tsx:45 (return null se vuoto); docs/sviluppo.md:246-254; lib/oauth/config.ts:18; changelog.ts:119</sub>

### Funzionalità mancanti

- [ ] **FUN-01 · Nessun promemoria per scadenze, rate, pesate o allenamenti**  
  🟠 alta · sforzo L (una settimana) · Bollette / Abbonamenti / Peso / Esercizio

  La scadenza si vede solo aprendo la dashboard. Non ci sono notifiche push, email, export .ics, cron o badge sull'icona. Mancano anche l'avviso per la pesata e quello per l'obiettivo di allenamento. Per un gestore di bollette il promemoria è la funzione che l'utente si aspetta per prima.

  **Proposta:** Primo passo (S): 'Aggiungi al calendario' (.ics con avviso 2-3 giorni prima) su bolletta e rata, più un feed .ics personale. Avvisi in app ('Ultima pesata 9 giorni fa'). Poi: service worker con Web Push (VAPID) e un Cron Trigger giornaliero o un'email riassuntiva, con preferenze sull'anticipo. Su iOS serve la PWA installata.

  <sub>Evidenza: Ricerca 'promemoria|Notification|serviceWorker|PushManager|.ics|crons' in src e wrangler.jsonc: nessun risultato; manifest.ts:8-10; BolletteList.tsx:484-490; RiepilogoCosti.tsx:350-354</sub>

## 🟡 Gravità media (94)

### Sicurezza e privacy

- [ ] **SIC-05 · Il freno ai tentativi di login conta solo per indirizzo IP**  
  🟡 media · sforzo S (ore) · Login / registrazione

  Il limite è di 8 errori in 15 minuti per IP. Con il CGNAT o una rete aziendale blocca utenti innocenti, mentre un attacco distribuito o via IPv6 non lo incontra mai e manca un limite per account. Contano come errori anche le email già esistenti in registrazione. Le righe di login_attempts restano a tempo indefinito.

  **Proposta:** Usare due chiavi: IP, con IPv6 raggruppato per /64 e una soglia più alta, ed email, con ritardo progressivo o Turnstile dopo N fallimenti invece del blocco. Avvisare l'utente dopo molti fallimenti. Ripulire periodicamente login_attempts.

  <sub>Evidenza: lib/auth/actions.ts:53-58, :160-166, :197-198; lib/auth/rateLimit.ts:11-13, :112-117</sub>

- [ ] **SIC-06 · Cambiare o resettare la password non chiude le altre sessioni né le chat collegate**  
  🟡 media · sforzo S (ore) · Profilo / Utenti

  changePasswordAction aggiorna solo l'hash: le altre sessioni restano valide fino a 30 giorni. Né il cambio, né 'Disconnetti altri dispositivi', né il reset da admin toccano oauth_token, il cui rinnovo vale 180 giorni: una chat collegata da un estraneo continua a leggere e scrivere. Il rimedio manuale esiste.

  **Proposta:** Al cambio password chiudere le altre sessioni. Al reset da admin cancellare tutte le sessioni e i token OAuth. Offrire 'stacca anche le chat collegate' in Disconnetti e confermare nel messaggio cosa è stato chiuso.

  <sub>Evidenza: lib/auth/actions.ts:224-259; impostazioni/queries.ts:233-237; lib/oauth/collegamenti.ts:77; lib/oauth/token.ts:236; lib/oauth/config.ts:50-51</sub>

- [ ] **SIC-07 · Gli id di sessione sono salvati in chiaro nel database**  
  🟡 media · sforzo S (ore) · Autenticazione

  Codici e token OAuth sono salvati come SHA-256, mentre l'id di sessione, cioè il valore stesso del cookie, è in chiaro. Chi legge la tabella sessions, da un backup, da DB_PROD o dalla console, ottiene cookie validi per 30 giorni.

  **Proposta:** Salvare e cercare l'hash SHA-256 dell'id, come fa impronta(). Tutti dovranno rifare il login una volta.

  <sub>Evidenza: lib/auth/session.ts:22, :36-50; middleware.ts:150-158; lib/oauth/token.ts:39-50</sub>

- [ ] **SIC-08 · Upload degli allegati senza controlli lato server su tipo ed estensione**  
  🟡 media · sforzo S (ore) · Bollette - allegati

  Il PDF viene verificato solo nel browser. Il server prende estensione e Content-Type da quanto dichiara il client, e la route li restituisce senza Content-Disposition né nosniff. Un .svg sfugge anche al middleware, che lo esclude. Oggi è sfruttabile solo contro sé stessi, ma con qualsiasi condivisione futura diventerebbe un XSS.

  **Proposta:** Controllare i magic bytes ('%PDF-', e JPEG/PNG se si accettano le foto), forzare estensione e content-type e imporre un limite di dimensione. Nella route aggiungere Content-Disposition inline, X-Content-Type-Options: nosniff e una CSP default-src 'none'.

  <sub>Evidenza: bollette/queries.ts:161-172; api/allegati/[...path]/route.ts:26-31; middleware.ts:207; BollettaForm.tsx:103-113</sub>

- [ ] **SIC-09 · Le server action non validano gli input a runtime**  
  🟡 media · sforzo M (1-2 giorni) · Tutti i moduli (server action)

  Bollette, alimentazione, esercizio, peso, dashboard e admin scrivono i valori del client affidandosi ai tipi TS. Passano importi negativi o NaN, pasti fuori elenco (che entrano nei totali senza essere visibili), stringhe enormi, serie=100000 che sfora la CPU, uno stato o un ruolo admin arbitrario e allegato_path altrui. Il danno è limitato ai propri dati, ma resta il gonfiamento dello spazio su D1.

  **Proposta:** Schemi zod o valibot all'inizio di ogni action, condivisi con MCP: enum per tipo, stato, pasto e ruolo, range numerici, lunghezze massime, formato delle date, allegato_path con prefisso user.id. Allowlist per stato e ruolo admin. In iniziaDaScheda un batch unico.

  <sub>Evidenza: bollette/queries.ts:62-97, :126-150; alimentazione/queries.ts:96-180, :238-256, :372-389, :737-776; DiarioGiorno.tsx:100, :489-491; peso/queries.ts:81-95; esercizio/schede.ts:215, :252-293; impostazioni/queries.ts:76-134; core/dashboard/preferences.ts:31-46; d1/migrations/0001_init.sql (nessun CHECK)</sub>

- [ ] **SIC-15 · Gli account admin e superadmin sono protetti solo da una password, senza secondo fattore**  
  🟡 media · sforzo M (1-2 giorni) · Autenticazione / Impostazioni › Utenti

  Un admin può generare una password temporanea per qualunque utente e poi entrare al suo posto, quindi un solo account admin violato dà accesso ai dati sanitari e di spesa di tutti i clienti. L'accesso è comunque solo email e password: non esiste un secondo fattore (TOTP o passkey), nemmeno opzionale e nemmeno per i ruoli amministrativi. Per un servizio a pagamento con dati sanitari è una mancanza che un cliente o un revisore nota subito. L'audit parla di reset (SIC-03) e di sessioni (SIC-06), non dell'autenticazione a due fattori.

  **Proposta:** Introdurre il TOTP (Web Crypto, senza servizi esterni), obbligatorio per admin e superadmin e facoltativo per gli utenti, con codici di recupero. In alternativa, passkey WebAuthn.

  <sub>Evidenza: Cercato 'totp|2fa|due fattori|two.factor|passkey|webauthn' in src, README.md e docs: nessun risultato. src/lib/auth/actions.ts:41-100 (login con sola password); src/modules/impostazioni/queries.ts:206 (generaPasswordTemporaneaAction, a disposizione degli admin).</sub>

### Lancio commerciale

- [ ] **COM-07 · README e documentazione dicono il contrario di ciò che l'app fa**  
  🟡 media · sforzo S (ore) · README / docs

  Il README dice due volte che non c'è registrazione pubblica, ma /registrati esiste. Promette la foto della bolletta, ma si accettano solo PDF. Dice 'che non vende niente'. Anche docs/sviluppo.md si contraddice.

  **Proposta:** Separare il README tecnico dal testo commerciale, da spostare sulla landing. Correggere registrazione, allegati e piano. Riformulare in 'niente pubblicità, i tuoi dati non vengono venduti'.

  <sub>Evidenza: README.md:7, :15, :93, :120; docs/sviluppo.md:13 contro :128; login/page.tsx:69-71</sub>

- [ ] **COM-08 · Nessuna metrica di prodotto**  
  🟡 media · sforzo M (1-2 giorni) · Analytics

  Non si sa chi si registra, chi completa il primo inserimento o chi torna. Prova, prezzo e canali non si possono valutare, e la CSP oggi bloccherebbe comunque gli script esterni.

  **Proposta:** Cloudflare Web Analytics sulla landing e un registro di eventi anonimo server-side (D1 o Analytics Engine) con una dashboard per il superadmin, da citare nell'informativa.

  <sub>Evidenza: ricerca 'analytics|plausible|posthog' in src: nessun risultato; middleware.ts:76</sub>

- [ ] **COM-09 · Nome e icona non vendibili: 'Gestione Personale' sembra un software per le risorse umane**  
  🟡 media · sforzo M (1-2 giorni) · Marchio / PWA

  'Gestione personale' richiama il software per le risorse umane, è generico e difficilmente registrabile. Il nome breve è 'Gestione', l'icona sono quattro quadrati generici e al login c'è LayoutGrid di lucide. Le descrizioni di layout e manifest non coincidono, e dentro l'app nome e logo non compaiono mai.

  **Proposta:** Un nome di fantasia verificato su TMview/UIBM (classi 9, 42, 44) con un payoff descrittivo, un logo originale per icone, login e sidebar e descrizioni uniformi.

  <sub>Evidenza: manifest.ts:13-15; layout.tsx:8-9, :20; public/icon.svg; login/page.tsx:5,20-23; ModuloRegistrazione.tsx:31</sub>

### Accesso e account

- [ ] **ACC-03 · La sessione scade dopo 30 giorni fissi anche per chi usa l'app ogni giorno**  
  🟡 media · sforzo S (ore) · Sessioni / PWA

  expires_at si fissa al login e non si rinnova mai. Una volta al mese l'utente viene buttato fuori, magari mentre segna un pasto, e senza recupero autonomo della password rischia di restare fuori.

  **Proposta:** Scadenza scorrevole: quando mancano meno di 15 giorni, aggiornare expires_at e il cookie, al massimo una volta al giorno. Valutare 90 giorni scorrevoli con un limite assoluto.

  <sub>Evidenza: lib/auth/session.ts:6, :36-51; ricerca 'update sessions' in src: nessun risultato; README.md:58</sub>

- [ ] **ACC-04 · L'admin non vede il nome di chi chiede l'accesso**  
  🟡 media · sforzo S (ore) · Impostazioni › Utenti

  La registrazione rende obbligatorio il nome 'per chi deve approvarti', ma listUtenti non lo legge e l'elenco mostra solo l'email.

  **Proposta:** Aggiungere nome alla select e a UtenteInfo e mostrarlo in grassetto prima dell'email.

  <sub>Evidenza: lib/auth/actions.ts:147-149, :208; impostazioni/queries.ts:8-14, :23-24; UtentiSettings.tsx:133</sub>

- [ ] **ACC-05 · Le azioni admin partono con un tocco, senza conferma**  
  🟡 media · sforzo S (ore) · Impostazioni › Utenti

  Approva e Rifiuta, Sospendi e Blocca sono pulsanti text-xs affiancati. 'Password temporanea' sostituisce subito la password e disconnette l'utente, e il ruolo cambia appena si tocca la tendina. Un tocco sbagliato chiude fuori un cliente.

  **Proposta:** Chiedere conferma con il nome dell'utente per Rifiuta, Blocca, Password temporanea e cambio di ruolo. Portare l'area di tocco a 44 px su telefono.

  <sub>Evidenza: UtentiSettings.tsx:58-69, :159-217; impostazioni/queries.ts:228-243</sub>

- [ ] **ACC-06 · 'Rifiuta' blocca per sempre, senza motivo e con l'email occupata**  
  🟡 media · sforzo S (ore) · Utenti / login

  Rifiuta imposta lo stato 'bloccato', lo stesso di un utente sanzionato. Al login la persona legge 'Questo account è stato bloccato. Contatta un amministratore.', senza un contatto. Non può registrarsi di nuovo perché l'email risulta 'già in uso', e non esiste un campo per il motivo.

  **Proposta:** Chiedere conferma. Al rifiuto cancellare l'account, oppure usare uno stato 'rifiutato' con un motivo facoltativo, un messaggio dedicato e il contatto di supporto.

  <sub>Evidenza: UtentiSettings.tsx:194-200; lib/auth/actions.ts:87-89, :197-203; impostazioni/queries.ts:95-98</sub>

- [ ] **ACC-07 · Dopo un errore login e registrazione si svuotano, e Turnstile non si rinnova**  
  🟡 media · sforzo S (ore) · Accedi, Registrati, Nuovo abbonamento

  Con React 19 e useActionState i campi non controllati si azzerano dopo ogni invio, anche se c'è un errore. In registrazione, se l'email esiste già, il token Turnstile è consumato e al nuovo invio compare il messaggio sulle registrazioni chiuse.

  **Proposta:** Restituire nello stato i valori non segreti e usarli come defaultValue. Chiamare turnstile.reset() dopo ogni errore e distinguere nel messaggio un token scaduto da un blocco vero.

  <sub>Evidenza: package.json (react 19.0.0); login/page.tsx:27-52; ModuloRegistrazione.tsx:43-102; AbbonamentoForm.tsx:16,23; registrati/Turnstile.tsx:18-23; lib/auth/actions.ts:168-174</sub>

- [ ] **ACC-08 · Email mai verificata e non modificabile**  
  🟡 media · sforzo M (1-2 giorni) · Registrazione / In attesa / Profilo

  L'email si controlla solo con una regex. Ci si può registrare con l'email di un altro, che poi si sente dire 'già in uso'. Un errore di battitura non si corregge, dalla pagina di attesa non si può annullare la richiesta e nessuno, nemmeno l'admin, può cambiare l'email. L'approvazione manuale attenua l'uso dell'email altrui.

  **Proposta:** Colonna email_verificata_at e codice o link di conferma alla registrazione (richiede ACC-02). In attesa: 'Correggi email' e 'Annulla richiesta'. In Profilo: 'Cambia email' con password e riconferma. La stessa possibilità per l'admin.

  <sub>Evidenza: lib/auth/actions.ts:134-140, :197-203; in-attesa/page.tsx:34-50; ProfiloSettings.tsx:165-167; impostazioni/profilo.ts:14-16; schema users in 0001_init.sql:12-17</sub>

### Flussi e usabilità

- [ ] **FLU-01 · Ricette e moduli si perdono con un tocco fuori dalla finestra o con Indietro**  
  🟡 media · sforzo S (ore) · Crea un piatto / Piatti / Bollette

  La finestra 'Crea un piatto' si chiude con un tocco sullo sfondo o con Esc e perde quanto inserito. In tutta l'app non c'è protezione per le modifiche non salvate.

  **Proposta:** Una prop 'sporco' su Modale che chiede 'Scartare le modifiche?', beforeunload in PiattoEditor e BollettaForm, o una bozza in sessionStorage.

  <sub>Evidenza: Modale.tsx:41, :68; RicercaAggiungi.tsx:605-611; ricerca 'beforeunload' in src: nessun risultato</sub>

- [ ] **FLU-03 · L'app si apre sempre su Consumi e Costi, anche per chi usa solo la Salute**  
  🟡 media · sforzo S (ore) · Avvio app / dopo il login

  La pagina iniziale è fissa: la radice, il login e il middleware rimandano tutti a /consumi-costi. Chi installa l'app per il diario alimentare (l'uso più frequente secondo il manifest e il README) a ogni apertura dall'icona atterra sulla dashboard delle bollette e deve cambiare area. La scorciatoia 'Aggiungi un pasto' esiste solo su Android tenendo premuta l'icona. Il problema non riguarda solo il primo accesso (FLU-02): si ripete a ogni apertura.

  **Proposta:** Aggiungere in Preferenze la voce 'Pagina iniziale' (Consumi e Costi, Salute, Diario), salvata in user_preferences, e usarla nel redirect di / e dopo il login. Come alternativa più semplice, ricordare l'ultima area visitata.

  <sub>Evidenza: src/app/page.tsx:4-5 (redirect(DEFAULT_AREA_HREF)); src/core/modules/registry.ts:101 (DEFAULT_AREA_HREF = la prima macro-area); src/middleware.ts:190 ('/consumi-costi' scritto a mano); src/lib/auth/actions.ts:99; src/app/manifest.ts:17 (start_url '/').</sub>

- [ ] **FLU-02 · Primo accesso: dashboard di zeri con '🎉', nessuna guida e aree non personalizzabili**  
  🟡 media · sforzo M (1-2 giorni) · Primo accesso / Dashboard / Preferenze

  Si atterra sempre su Consumi e Costi, anche se ci si è iscritti per la dieta. L'utente vede '0,00 €' e 'Nessuna scadenza in sospeso 🎉'. Non ci sono benvenuto, primi passi, FAQ o aiuto, che stanno solo nel README. Non si può scegliere l'area iniziale né nascondere quelle che non si usano. Gli stati vuoti non propongono azioni.

  **Proposta:** Una schermata di benvenuto ('Cosa vuoi tenere sotto controllo?') che salva le aree attive e quella iniziale in user_preferences e filtra la navigazione. Una scheda 'Primi passi' con 2-3 azioni sulle dashboard vuote, niente 🎉 con zero dati, una guida all'installazione e una pagina Aiuto con FAQ.

  <sub>Evidenza: src/app/page.tsx:4-6; middleware.ts:190; lib/auth/actions.ts:99; core/modules/registry.ts:101; RiepilogoCosti.tsx:35-65; MacroOggi.tsx:69-70; SpesaPerTipo.tsx:39-42; README.md:62-84, :74</sub>

### Grafica e navigazione

- [ ] **GRA-03 · Nessun segnale di caricamento cambiando pagina**  
  🟡 media · sforzo S (ore) · Navigazione

  Non c'è nessun loading.tsx e la barra e la sidebar hanno prefetch={false}. Su rete mobile, dopo un tocco su una pagina server la vecchia resta immobile e l'utente tocca di nuovo. Altrove c'è solo il testo 'Caricamento…'.

  **Proposta:** Aggiungere (app)/loading.tsx con uno scheletro, evidenziare subito la voce toccata (useLinkStatus), una barra di avanzamento sottile e un componente <Scheletro> condiviso.

  <sub>Evidenza: BarraInferiore.tsx:62; Sidebar.tsx:247; find loading.tsx: nessun file; 'Caricamento…' in 15 componenti</sub>

- [ ] **GRA-04 · Grafici poco leggibili in tema scuro: tooltip bianco, assi grigi, colori fissi**  
  🟡 media · sforzo S (ore) · Grafici Recharts

  Il tooltip ha sfondo bianco fisso mentre l'etichetta eredita il testo chiaro, quindi è invisibile in tema scuro. I tick #666 hanno contrasto 3,03:1 in scuro. In MacroOggi #3b82f6 e #cbd5e1 sono fissi, e l'obiettivo ha contrasto 1,48:1 in chiaro.

  **Proposta:** Un <TooltipGrafico> condiviso con i token card, border e foreground, e una costante tick con fill muted-foreground. In MacroOggi usare --serie-1 e una tinta ≥3:1 per l'obiettivo.

  <sub>Evidenza: recharts DefaultTooltipContent.js:108-113; AndamentoAlimentazione.tsx:250,318; CalorieOggiESettimana.tsx:137; MacroOggi.tsx:79-98; AndamentoMensile.tsx:50; RegistroPeso.tsx:291</sub>

- [ ] **GRA-05 · I controlli nativi restano chiari dentro il tema scuro**  
  🟡 media · sforzo S (ore) · globals.css

  .dark non dichiara color-scheme, quindi calendario, select, checkbox e scrollbar restano in versione chiara: circa 30 controlli.

  **Proposta:** Dichiarare color-scheme: light in :root e color-scheme: dark in .dark.

  <sub>Evidenza: globals.css:43-63</sub>

- [ ] **GRA-06 · Il ritorno all'elenco funziona in modo diverso da modulo a modulo**  
  🟡 media · sforzo S (ore) · Pagine di dettaglio

  Le pagine dell'Esercizio hanno '← Elenco' in alto. Modifica bolletta, dettaglio abbonamento e Modifica piatto no. Nella PWA su iPhone non c'è il tasto Indietro del browser.

  **Proposta:** Aggiungere a PageHeader una prop indietro={{href,label}} e usarla in tutte le pagine di secondo livello.

  <sub>Evidenza: bollette/[id]/page.tsx:24-35; abbonamenti/[id]/page.tsx:15-20; alimentazione/piatti/[id]/page.tsx:20-29; HeaderMobile.tsx:44-67</sub>

- [ ] **GRA-07 · Voci di menu, titoli di pagina e nomi delle sezioni non coincidono**  
  🟡 media · sforzo S (ore) · Salute (navigazione e titoli)

  La voce 'Esercizio' apre 'Allenamenti', e 'Catalogo esercizi' apre 'Esercizio'. Per l'alimentazione si usano Diario, Diario alimentare, Alimentazione e Cibo, e il '+' per un singolo alimento apre 'Crea un piatto'.

  **Proposta:** Un glossario unico: titolo della pagina uguale all'etichetta della voce, Allenamenti, Schede, Esercizi, 'Crea alimento o ricetta'. Allineare README e canvas.

  <sub>Evidenza: esercizio/module.config.ts:7,13,24; esercizio/page.tsx:8; catalogo/page.tsx:8; catalogo/[id]/page.tsx:30; AndamentoSalute.tsx:21; RicercaAggiungi.tsx:506,607</sub>

- [ ] **GRA-08 · Il '+' di Salute aggiunge sempre un alimento, e Consumi e Costi non ha il '+'**  
  🟡 media · sforzo S (ore) · Barra inferiore

  C'è una sola azione principale per area. Anche in Allenamenti il '+' apre la ricerca alimenti, mentre Consumi e Costi non ha 'nuova bolletta'.

  **Proposta:** Rendere il '+' contestuale al modulo, oppure aprire un foglio 'Cosa vuoi aggiungere?'. Dare il '+' anche a Consumi e Costi.

  <sub>Evidenza: core/navigazione/barra.ts:61-63; alimentazione/module.config.ts:30-34</sub>

- [ ] **GRA-14 · Su iPhone la barra inferiore finisce sotto l'indicatore Home: la protezione dell'area sicura non funziona**  
  🟡 media · sforzo S (ore) · Barra inferiore / foglio del menu mobile (PWA installata)

  La barra di navigazione in basso e il foglio del menu usano padding-bottom: env(safe-area-inset-bottom) per non finire sotto la barra dei gesti. Il viewport però non dichiara viewport-fit=cover, e senza questa dichiarazione i browser (WebKit in particolare) restituiscono 0 per env(safe-area-inset-*). Il commento nel codice descrive un comportamento che quindi non avviene: sull'app installata su iPhone (e su Android con le pagine a tutto schermo) le voci della barra restano attaccate al bordo, dove il tocco si confonde con il gesto di uscita dall'app.

  **Proposta:** Aggiungere viewportFit: 'cover' all'export viewport di src/app/layout.tsx e controllare che l'intestazione in alto rispetti env(safe-area-inset-top). Verificarlo su un iPhone reale con l'app installata.

  <sub>Evidenza: src/core/components/BarraInferiore.tsx:29-35 (commento e classe pb-[env(safe-area-inset-bottom)]); src/core/components/HeaderMobile.tsx:175 (stesso padding nel foglio); src/app/layout.tsx:25-31: l'export viewport contiene solo themeColor, senza viewportFit. Cercato 'viewport-fit|viewportFit' in src: nessun risultato.</sub>

- [ ] **GRA-09 · Barra di stato e splash non seguono il tema né il colore scelto**  
  🟡 media · sforzo M (1-2 giorni) · PWA (layout, manifest)

  theme_color è fisso a blu e stacca dall'intestazione bianca, e non segue né il colore scelto né il tema dell'app. Lo splash è bianco anche con il tema scuro. Su iOS la barra è bianca e mancano le immagini di avvio.

  **Proposta:** theme-color uguale alla card del tema attivo, generato da getAspetto() e aggiornato in applicaTema. Su iOS black-translucent con safe-area. Immagini di avvio chiare e scure.

  <sub>Evidenza: layout.tsx:18-30; manifest.ts:20-21; HeaderMobile.tsx:44</sub>

- [ ] **GRA-10 · Pulsanti e campi scritti a mano sotto i 44 px**  
  🟡 media · sforzo M (1-2 giorni) · Design system

  22 pulsanti primari e 8 campi copiano gli stili senza min-h-11, e TabBar e ToggleChip sono alti 36 px. Ogni ritocco grafico va ripetuto in 30 punti.

  **Proposta:** Componenti <Bottone variante> e <Campo>, min-h-11 anche per TabBar e ToggleChip, e un controllo in CI contro le copie.

  <sub>Evidenza: controls.tsx:109-114, :138-141; ObiettiviForm.tsx:141; ProfiloSettings.tsx:183,330; PreferenzeModuli.tsx:86,166; UtentiSettings.tsx:190,271; login/page.tsx:61</sub>

### Accessibilità

- [ ] **A11Y-05 · La torta 'Spesa per tipo' non ha legenda né valori, e i colori si confondono**  
  🟡 media · sforzo S (ore) · Widget SpesaPerTipo

  Ci sono solo spicchi colorati, e tipo e importo si vedono con il tooltip, uno spicchio alla volta. Due verdi e la coppia rosso/ambra sono indistinguibili per chi ha un deficit cromatico, e non c'è alternativa testuale. L'anteprima nel pannello widget mostra barre, cioè un grafico diverso.

  **Proposta:** Sostituire la torta con barre orizzontali con nome, importo e percentuale, come nell'anteprima, oppure affiancarle un elenco con legenda e marcare la torta aria-hidden. Rivedere i colori.

  <sub>Evidenza: bollette/widgets/SpesaPerTipo.tsx:57-75; bollette/types.ts:52-58; bollette/module.config.ts:34-41</sub>

- [ ] **A11Y-06 · Andamento mensile e Macro di oggi non hanno alternativa testuale**  
  🟡 media · sforzo S (ore) · Dashboard

  Gli altri grafici hanno role=img con un riassunto e i valori in testo. Questi due no.

  **Proposta:** Applicare lo stesso schema: role=img con aria-label riassuntivo e un elenco dei valori (anche sr-only).

  <sub>Evidenza: bollette/widgets/AndamentoMensile.tsx:44-53; alimentazione/widgets/MacroOggi.tsx:73-109</sub>

- [ ] **A11Y-07 · L'esito dell'obiettivo è indicato solo dal colore**  
  🟡 media · sforzo S (ore) · Andamento / Medie macro

  Il valore dell'obiettivo diventa verde o rosso senza icone né parole (WCAG 1.4.1), e il verde ha contrasto 2,3:1.

  **Proposta:** Aggiungere un'icona con testo ('rispettato', 'superato', 'non raggiunto') e usare token di testo con contrasto adeguato.

  <sub>Evidenza: AndamentoAlimentazione.tsx:383-390; MedieMacro.tsx:76-83</sub>

- [ ] **A11Y-08 · Tutte le pagine hanno lo stesso titolo**  
  🟡 media · sforzo S (ore) · Metadata (36 pagine)

  Il titolo è sempre 'Gestione Personale'. Cronologia e selettore delle app non distinguono le pagine, e il lettore di schermo non annuncia la navigazione (WCAG 2.4.2).

  **Proposta:** Un title.template '%s · NomeApp' e un title per pagina, con generateMetadata per i dettagli.

  <sub>Evidenza: src/app/layout.tsx:7-9 (unico metadata)</sub>

- [ ] **A11Y-09 · I bordi dei campi sono quasi invisibili**  
  🟡 media · sforzo S (ore) · Tutti i form

  --border ha contrasto 1,19-1,28:1 contro i 3:1 richiesti (WCAG 1.4.11): al sole non si vede dove scrivere.

  **Proposta:** Un token --input più scuro (≥3:1) solo per i bordi dei controlli.

  <sub>Evidenza: globals.css:13, :59; controls.tsx:15</sub>

- [ ] **A11Y-10 · I messaggi di stato non vengono annunciati**  
  🟡 media · sforzo S (ore) · Ricerca alimenti, Diario, Impostazioni

  Lo stato della ricerca OFF, il cambio di giorno nel diario, le conferme 'Salvato' e i '…' dei widget non vengono letti (WCAG 4.1.3).

  **Proposta:** Un contenitore role=status sempre presente e un testo sr-only 'Caricamento' al posto dei '…'.

  <sub>Evidenza: RicercaFeedback.tsx:24-55; DiarioGiorno.tsx:246-249; PreferenzeModuli.tsx:90,170; DashboardGrid.tsx:160; AndamentoMensile.tsx:41</sub>

- [ ] **A11Y-11 · Gli errori dei moduli non vengono annunciati né collegati al campo**  
  🟡 media · sforzo M (1-2 giorni) · Tutti i form

  22 paragrafi rossi senza regione live e nessun aria-invalid o aria-describedby. Dopo 'Accedi' il lettore di schermo non dice nulla.

  **Proposta:** Un componente <MessaggioErrore role=alert>, aria-invalid e aria-describedby sul campo e il focus sul primo campo errato.

  <sub>Evidenza: Toast.tsx:68 (unica regione live); login/page.tsx:54-56; BollettaForm.tsx:352; RicercaAggiungi.tsx:744</sub>

### Affidabilità e prestazioni

- [ ] **AFF-06 · Il backup può superare il limite di CPU con molti dati**  
  🟡 media · sforzo S (ore) · /api/backup

  Il backup legge tutte le righe di tutte le tabelle e fa JSON.stringify indentato in una sola richiesta: con anni di diario potrebbe superare i 10 ms di CPU. Va misurato.

  **Proposta:** Misurare con wrangler tail su dati realistici. Se serve, togliere l'indentazione, generare il file in streaming tabella per tabella o dividerlo per area.

  <sub>Evidenza: api/backup/route.ts:40-61; lib/dati-utente.ts:55-70</sub>

- [ ] **AFF-07 · Recharts e i widget si caricano su ogni pagina**  
  🟡 media · sforzo S (ore) · Bundle client

  La navigazione importa il registro, che importa i widget e quindi recharts: il layout (app) pesa circa 805 KB di JS, contro circa 350-400 KB di una pagina senza grafici.

  **Proposta:** Separare il registro della navigazione da quello dei widget e caricare i grafici con next/dynamic. Verificare con @next/bundle-analyzer.

  <sub>Evidenza: Sidebar.tsx:1,18; BarraInferiore.tsx:1,5; HeaderMobile.tsx:11; core/modules/registry.ts:8-15; bollette/module.config.ts:3-5; app-build-manifest.json</sub>

- [ ] **AFF-08 · Le rate degli abbonamenti vengono rigenerate dall'inizio a ogni apertura**  
  🟡 media · sforzo S (ore) · Abbonamenti / Dashboard

  Per ogni abbonamento, in sequenza (N+1), si ricalcolano tutte le date da data_inizio e si fa un insert or ignore per ciascuna. Un settimanale di 5 anni produce circa 260 istruzioni a ogni visita.

  **Proposta:** Partire da max(data_scadenza) con una sola query aggregata, oppure salvare 'rate_generate_fino_al'. Usare Promise.all o un unico batch, o un cron giornaliero.

  <sub>Evidenza: abbonamenti/queries.ts:25-68, :77, :260-264</sub>

- [ ] **AFF-09 · Pipeline senza concurrency, senza controllo delle migration e senza smoke test**  
  🟡 media · sforzo S (ore) · CI/CD

  Due push ravvicinati possono lasciare in produzione la versione più vecchia. La pipeline non usa lo script delle migration, già incappato tre volte in quelle dimenticate. Manca uno smoke test dopo il deploy, e il rollback non è documentato.

  **Proposta:** Aggiungere un gruppo concurrency al workflow. Eseguire node scripts/stato-migrazioni.mjs prod prima del deploy, fermandosi se esce con 1, poi un curl di verifica. Documentare wrangler rollback.

  <sub>Evidenza: .github/workflows/deploy.yml; scripts/stato-migrazioni.mjs:6-10, :29; docs/sviluppo.md:91-98</sub>

- [ ] **AFF-10 · Allegati orfani, nessuna quota e tabelle tecniche mai ripulite**  
  🟡 media · sforzo M (1-2 giorni) · Allegati KV / manutenzione dati

  Il PDF di una bolletta eliminata si cancella con un setTimeout nel browser: se l'app si chiude prima, il file resta in KV per sempre, e così quelli caricati prima di un salvataggio fallito. Il conservare oltre lo scopo tocca l'art. 5.1.e. Non c'è quota per utente. Sessioni, oauth_token scaduti, login_attempts e alimenti_cache non hanno una pulizia programmata, e le chat scadute restano in elenco.

  **Proposta:** Cancellazione logica (deleted_at) e un Cron Trigger giornaliero che elimina righe e PDF scaduti, chiavi KV non referenziate, sessioni, token, login_attempts e cache vecchie. Tabella allegati con i byte per una quota per utente mostrata nel Profilo. Allegati su R2. Filtrare i collegamenti scaduti e definire una regola per gli account inattivi.

  <sub>Evidenza: BolletteList.tsx:43-48, :108-118; bollette/queries.ts:147-172; BollettaForm.tsx:101-115; lib/auth/session.ts:25-30; lib/oauth/token.ts:76-79; lib/oauth/collegamenti.ts:30-63; wrangler.jsonc senza crons</sub>

- [ ] **AFF-11 · Le calorie degli allenamenti si ricalcolano in JS su tutto lo storico**  
  🟡 media · sforzo M (1-2 giorni) · Esercizio / Dashboard Salute / Andamento

  pesoAllaData scorre tutte le pesate con Date.parse per ogni allenamento. Il bilancio di oggi carica 100 allenamenti e l'andamento 500, anche per 7 giorni. È un rischio di errore 1102 per gli utenti più attivi, non misurato.

  **Proposta:** Filtrare in SQL per periodo, cercare la pesata con due puntatori su stringhe, leggere solo gli allenamenti di oggi e valutare di salvare le kcal stimate sull'allenamento.

  <sub>Evidenza: esercizio/allenamenti.ts:70-74, :160-168, :459-498; peso/types.ts:26-46; peso/queries.ts:44-48; core/dashboard/queries.ts:66-70</sub>

- [ ] **AFF-12 · Dashboard lente: una richiesta per widget, eseguite una alla volta**  
  🟡 media · sforzo M (1-2 giorni) · Dashboard

  Ogni widget chiama una server action in useEffect e le chiamate vengono serializzate. AndamentoMensile e SpesaPerTipo scaricano ciascuno tutte le bollette di sempre.

  **Proposta:** Caricare sul server layout e dati dei widget con un solo Promise.all e passarli come props. Aggregare in SQL per anno e mese.

  <sub>Evidenza: DashboardGrid.tsx:82; AndamentoMensile.tsx:24-26; SpesaPerTipo.tsx:15-16; bollette/queries.ts:32-52</sub>

- [ ] **AFF-13 · Nessun backup automatico né procedura di ripristino documentata**  
  🟡 media · sforzo M (1-2 giorni) · Operatività

  Esiste solo un d1 export manuale. Il Time Travel di D1 c'è ma non è documentato, e i PDF in KV non hanno nessuna copia.

  **Proposta:** Un export notturno di D1 su R2 con copia di KV e conservazione per 30 giorni. Documentare e provare wrangler d1 time-travel restore.

  <sub>Evidenza: docs/sviluppo.md:58-59; wrangler.jsonc senza crons; ricerca 'time.travel|restore' nella documentazione: nessun risultato</sub>

- [ ] **AFF-14 · Nessun monitoraggio né avviso sugli errori**  
  🟡 media · sforzo M (1-2 giorni) · Operatività

  In src c'è un solo console.warn e ci sono 42 catch vuoti, anche su OFF e KV. Non ci sono alert per errori 5xx o 1102, quote vicine al limite o servizi esterni irraggiungibili.

  **Proposta:** console.error con contesto negli errori server, Notifications di Cloudflare o Sentry, e un health check esterno su /api/salute con select 1.

  <sub>Evidenza: wrangler.jsonc:13-15; barra.ts:74; alimentazione/queries.ts (cercaOFF/USDA); api/esercizio-gif/[id]/route.ts:66-70</sub>

- [ ] **AFF-15 · Nessun test automatico: la CI fa solo typecheck e build**  
  🟡 media · sforzo L (una settimana) · Qualità / CI

  Non c'è nessun file di test né un framework installato. Bug come il limite D1 o il fuso orario arrivano agli utenti, e funzioni pure come rate, MET e validazione non sono coperte.

  **Proposta:** Vitest sulle funzioni pure, test di integrazione su D1 locale con volumi realistici e smoke test Playwright (login, pasto, bolletta, pagamento Stripe in test) in CI, più l'approvazione manuale dell'environment di produzione.

  <sub>Evidenza: package.json:5-17; .github/workflows/deploy.yml; nessun *.test o *.spec fuori da node_modules</sub>

### Consumi e Costi

- [ ] **CON-04 · Gli importi di bollette e abbonamenti usano type=number, che può rifiutare la virgola**  
  🟡 media · sforzo S (ore) · Bollette / Abbonamenti - form

  I tre form usano type=number, che il progetto stesso documenta come problematico con la virgola. Nei browser che la rifiutano la validazione nativa blocca l'invio. Il resto dell'app usa NumberInput, quindi l'utente trova due comportamenti diversi.

  **Proposta:** Usare NumberInput e parseNumero nei tre form e nelle server action, accettando anche '1.234,56'.

  <sub>Evidenza: controls.tsx:25-29; BollettaForm.tsx:120, :186-196; AbbonamentoForm.tsx:42-50; AbbonamentoDettaglio.tsx:131-140; abbonamenti/queries.ts:104,139</sub>

- [ ] **CON-05 · Inserire una bolletta è lento: tre date obbligatorie e nessun valore proposto**  
  🟡 media · sforzo S (ore) · Nuova bolletta

  Servono fornitore, importo, scadenza e un periodo obbligatorio dal-al, anche se il codice prevede già il ripiego sulla scadenza. Tutti i campi partono vuoti e il tipo è sempre 'Luce'. Il README promette 'trenta secondi'.

  **Proposta:** Rendere facoltativo il periodo, in una sezione 'Altri dettagli'. Proporre scadenza e periodo (il bimestre precedente per luce e gas). Datalist dei fornitori già usati con tipo scelto in automatico.

  <sub>Evidenza: BollettaForm.tsx:37-56, :94-96, :206-223; bollette/types.ts:99-102; README.md:77,93</sub>

- [ ] **CON-06 · 'Segna come pagata' e 'Segna come divisa' senza annulla né gestione errori**  
  🟡 media · sforzo S (ore) · Bollette - elenco

  Le spunte agiscono al primo tocco, senza toast con Annulla, che invece l'eliminazione ha, e senza try/catch. Un tocco sbagliato toglie la bolletta dai 'Da pagare' senza che l'utente se ne accorga.

  **Proposta:** Mostrare un toast 'Bolletta di X segnata pagata · Annulla' che ripristina stato e data, e un toast di errore se l'operazione fallisce.

  <sub>Evidenza: BolletteList.tsx:131-142, :232, :516-541</sub>

- [ ] **CON-07 · Date di pagamento e rate calcolate in UTC**  
  🟡 media · sforzo S (ore) · Bollette / Abbonamenti

  oggiISO() degli abbonamenti e 'Segna pagata' usano toISOString(). Tra mezzanotte e le 2 italiane la data registrata è quella del giorno prima, la rata di oggi non viene generata e il form propone come inizio la data di ieri.

  **Proposta:** Usare ovunque oggiIso() di lib/utils.ts, eliminare oggiISO e aggiungere un controllo in CI su toISOString().slice(0,10).

  <sub>Evidenza: abbonamenti/types.ts:101-104; abbonamenti/queries.ts:29,162,209; AbbonamentoForm.tsx:74; BolletteList.tsx:131-135; lib/utils.ts:48-67</sub>

- [ ] **CON-08 · L'elenco bollette non ha ricerca né totale**  
  🟡 media · sforzo S (ore) · Bollette - elenco

  Non si può cercare per fornitore o nelle note, e con i filtri attivi l'elenco non mostra il totale, che si calcola solo nel PDF esportato, mentre il README promette il contrario.

  **Proposta:** Casella di ricerca su fornitore e note, filtrata sul client, e una riga 'N bollette · Totale X € · Da pagare Y €' calcolata sugli elementi filtrati.

  <sub>Evidenza: BolletteList.tsx:194, :260-308; README.md:96</sub>

- [ ] **CON-09 · Il PDF della bolletta può non aprirsi su iPhone, e l'errore è JSON grezzo**  
  🟡 media · sforzo S (ore) · Bollette - allegati

  window.open parte dopo l'await di una server action, cioè fuori dal gesto dell'utente: Safari e la PWA possono bloccarlo. Il rischio è plausibile ma non verificato. Se il file manca, la scheda mostra {error:'Non trovato'}.

  **Proposta:** Usare un normale <a href=/api/allegati/... target=_blank>. Per gli errori, una pagina HTML in italiano. Provare su iPhone e Android e valutare la CSP sulla route.

  <sub>Evidenza: BolletteList.tsx:144-147; bollette/queries.ts:175-179; api/allegati/[...path]/route.ts:20-28; middleware.ts:69, :206-213</sub>

- [ ] **CON-10 · Ogni bolletta mostra fino a sei azioni fatte solo di icone**  
  🟡 media · sforzo S (ore) · Bollette - elenco

  Dividi, PDF, ricevuta, pagata, modifica ed elimina sono solo icone, con il significato affidato al title, che su un touch non si vede. La carta (ricevuta) e la spunta (pagata) si confondono.

  **Proposta:** Su telefono lasciare visibili 'Segna pagata' con testo e 'PDF', e raccogliere il resto in un menu '⋯' con le etichette.

  <sub>Evidenza: BolletteList.tsx:515-556; controls.tsx:152-179</sub>

- [ ] **CON-11 · La bolletta non si può fotografare: solo PDF**  
  🟡 media · sforzo M (1-2 giorni) · Bollette - allegati

  Il README promette 'La fotografi o scarichi il PDF', ma il campo accetta solo application/pdf e rifiuta le immagini. Da telefono il caso più comune, foto o screenshot, è bloccato. L'allegato però è facoltativo.

  **Proposta:** Accettare image/* con capture per la fotocamera, ridurre l'immagine nel browser (canvas, circa 1600-2000 px, JPEG) e servirla con il Content-Type giusto, oppure convertirla in PDF con jsPDF.

  <sub>Evidenza: BollettaForm.tsx:103-113, :323, :345; README.md:13, :93; api/allegati/[...path]/route.ts:28</sub>

- [ ] **CON-12 · La divisione con 'l'altra famiglia' è pensata per il caso dell'autore (3 e 2 persone)**  
  🟡 media · sforzo M (1-2 giorni) · Divisione spesa / Preferenze moduli

  La divisione presume un solo altro nucleo, che 'paghi sempre tu' e la ripartizione per persone, con default 3/2 (modificabili). Le bollette non condivise vengono salvate comunque con 3/2. Gli stati non dicono se e quando si è stati rimborsati. Il widget 'Da recuperare' compare a tutti. 'Preferenze moduli' è un nome tecnico.

  **Proposta:** 'Spesa condivisa' con un nome configurabile, ripartizione a metà, in percentuale o per persone, stati 'Da rimborsare' e 'Rimborsata il gg/mm'. Default 1/1 o chiesto al primo uso, null per le non condivise, widget nascosto finché non si usa la funzione. Rinominare in 'Preferenze'.

  <sub>Evidenza: bollette/types.ts:61-91; BollettaForm.tsx:58-63, :127-130, :262-274; impostazioni/queries.ts:146-150; DashboardGrid.tsx:84; impostazioni/module.config.ts:24-29</sub>

- [ ] **CON-13 · I grafici di spesa non contano gli abbonamenti**  
  🟡 media · sforzo M (1-2 giorni) · Dashboard Consumi e Costi

  'Spesa per tipo' e 'Andamento mensile' leggono solo le bollette, quindi la spesa mensile reale non si vede da nessuna parte.

  **Proposta:** Un widget 'Spesa totale per mese' (bollette più rate, a barre impilate) e la voce Abbonamenti nella ripartizione per tipo.

  <sub>Evidenza: SpesaPerTipo.tsx:5, :15-36; AndamentoMensile.tsx:13, :24-38; AbbonamentiAttivi.tsx:216-221; RiepilogoCosti.tsx:54</sub>

- [ ] **CON-14 · Tipi di bolletta fissi e nessuna categoria per gli abbonamenti**  
  🟡 media · sforzo M (1-2 giorni) · Bollette / Abbonamenti

  I tipi sono sette e fissi: condominio, affitto, mutuo e assicurazione finiscono in 'Altro'. Gli abbonamenti non hanno una categoria.

  **Proposta:** Una tabella categorie_spesa per utente, precaricata con i tipi attuali, con nome e colore modificabili e condivisa con gli abbonamenti.

  <sub>Evidenza: bollette/types.ts:1-8, :51-59; d1/migrations/0004_abbonamenti.sql</sub>

- [ ] **CON-15 · Niente 'Duplica', bollette ricorrenti o fornitori suggeriti**  
  🟡 media · sforzo M (1-2 giorni) · Bollette

  Ogni bolletta si inserisce da zero, anche quando arriva ogni due mesi dallo stesso fornitore. La divisione invece è già precompilata dalle preferenze.

  **Proposta:** 'Nuova come questa', precompilata con il periodo successivo e l'importo vuoto. Datalist dei fornitori. Più avanti l'opzione 'Ricorrente ogni N mesi' come bozza da completare.

  <sub>Evidenza: BolletteList.tsx:499-558; BollettaForm.tsx:65-70; ricerca 'duplica|ricorrent|datalist' in bollette: nessun risultato</sub>

- [ ] **CON-16 · Data di inizio, frequenza e singole rate di un abbonamento non si correggono**  
  🟡 media · sforzo M (1-2 giorni) · Abbonamenti - dettaglio

  Si modificano solo nome, importo e note. Per un errore sulla data o sulla frequenza bisogna eliminare l'abbonamento e ricrearlo, perdendo le spunte. Il nuovo prezzo vale solo per le rate future e una singola rata non si modifica.

  **Proposta:** Permettere di cambiare inizio e frequenza rigenerando le rate non pagate. Aggiungere 'Nuovo prezzo dal gg/mm' e la modifica della singola rata.

  <sub>Evidenza: abbonamenti/queries.ts:131-152; AbbonamentoDettaglio.tsx:141-143, :167-170</sub>

- [ ] **CON-17 · Abbonamenti senza data di rinnovo né preavviso di disdetta**  
  🟡 media · sforzo M (1-2 giorni) · Abbonamenti

  Per assicurazioni e contratti annuali non si può indicare quando si rinnovano né entro quando disdire.

  **Proposta:** Campi facoltativi 'Rinnovo il' e 'Preavviso (giorni)', con il badge 'Disdici entro gg/mm' e un promemoria.

  <sub>Evidenza: abbonamenti/types.ts:12-23</sub>

- [ ] **CON-18 · L'area 'Consumi e Costi' non registra i consumi (kWh, Smc, m³)**  
  🟡 media · sforzo M (1-2 giorni) · Bollette

  Senza la quantità consumata non si capisce se la spesa è salita per il consumo o per il prezzo.

  **Proposta:** Campi facoltativi consumo (con l'unità in base al tipo) e lettura del contatore, con il costo unitario e il confronto con l'anno precedente.

  <sub>Evidenza: core/modules/registry.ts:33; d1/migrations/0001_init.sql (bollette senza consumo)</sub>

- [ ] **CON-25 · Le rate di un abbonamento che parte il 29, 30 o 31 slittano per sempre al 28**  
  🟡 media · sforzo M (1-2 giorni) · Abbonamenti (generazione delle rate, Prossime scadenze)

  prossimaData dichiara di mantenere il giorno originale del ciclo, ma calcola ogni rata partendo dalla precedente invece che dalla data di inizio. Un abbonamento mensile iniziato il 31 gennaio genera 31/01, 28/02 e poi 28/03, 28/04 e così via, invece di 31/03 e 30/04. Un annuale iniziato il 29 febbraio di un anno bisestile resta al 28 febbraio anche negli anni bisestili successivi. Le scadenze mostrate non corrispondono più agli addebiti reali, e poiché le rate si generano con insert or ignore sulla coppia (abbonamento, data), correggere il calcolo senza ripulire i dati creerebbe rate doppie.

  **Proposta:** Calcolare la k-esima rata come data_inizio + k periodi, limitando il giorno alla fine del mese, invece di sommare un periodo alla rata precedente. Accompagnare la correzione con una migration che sposti le rate già generate da_pagare alla data giusta, prima di generarne di nuove.

  <sub>Evidenza: src/modules/abbonamenti/types.ts:68-98 (il commento parla di 'giorno originale del ciclo', ma il codice usa il giorno di dataISO, cioè della rata precedente); src/modules/abbonamenti/queries.ts:33-40 (cursore = prossimaData(cursore, ...) in ciclo); src/modules/abbonamenti/queries.ts:308 (la prossima scadenza si calcola dall'ultima rata). Cercato '29 febbraio|fine mese' nel changelog: nessuna correzione.</sub>

### Alimentazione

- [ ] **ALI-08 · Manca l'aggiunta rapida delle sole calorie**  
  🟡 media · sforzo S (ore) · Aggiungi

  Per segnare '900 kcal al ristorante' bisogna dare un nome, inserire le kcal per 100 g e poi i grammi. I concorrenti hanno l''Aggiunta rapida'.

  **Proposta:** Voce 'Solo calorie' nel '+': kcal totali, macro e nome facoltativi, salvata come una voce di 100 g.

  <sub>Evidenza: RicercaAggiungi.tsx:848-882</sub>

- [ ] **ALI-09 · 'Usa questi valori' registra una pesata falsa e cancella la nota**  
  🟡 media · sforzo S (ore) · Obiettivi → Peso

  Il calcolatore precompila il peso con l'ultima pesata, anche se vecchia, e 'Usa questi valori' la salva come pesata di oggi prima ancora di salvare gli obiettivi. L'upsert sovrascrive con nota = null.

  **Proposta:** Registrare la pesata solo se il peso è cambiato e solo al salvataggio. Usare coalesce sulla nota e mostrare 'Ultima pesata: 80 kg il 12/09'.

  <sub>Evidenza: alimentazione/queries.ts:911-950; peso/queries.ts:84-91; CalcolaObiettivi.tsx:59-74</sub>

- [ ] **ALI-10 · Gli obiettivi aperti dal diario mostrano il calcolatore vuoto e rischiano di essere cancellati**  
  🟡 media · sforzo S (ore) · Diario → finestra Obiettivi

  La finestra carica i dati dopo l'apertura, ma CalcolaObiettivi fissa i campi al primo render. Su una rete lenta, 'Salva' prima del caricamento esegue saveObiettivi([]), che cancella tutti gli obiettivi.

  **Proposta:** Mostrare uno stato di caricamento con Salva disabilitato, e montare il calcolatore solo dopo la lettura (key legata ai dati) o passare gli iniziali dal server.

  <sub>Evidenza: DiarioGiorno.tsx:389-402; ObiettiviForm.tsx:38-50, :74-84; alimentazione/queries.ts:372-387; CalcolaObiettivi.tsx:28-45</sub>

- [ ] **ALI-11 · Il salvataggio di un piatto non è atomico**  
  🟡 media · sforzo S (ore) · Piatti

  updatePiatto fa update, delete e insert in tre chiamate separate. Se l'ultima fallisce, la ricetta resta senza ingredienti e a 0 kcal. createPiatto ha lo stesso problema.

  **Proposta:** Eseguire tutto in un unico db.batch, come già fa saveObiettivi.

  <sub>Evidenza: alimentazione/queries.ts:746-773, :787-822, :653-665</sub>

- [ ] **ALI-12 · Nelle ricette non si scrivono grammi decimali**  
  🟡 media · sforzo S (ore) · Editor piatti

  Il campo grammi converte e riscrive il valore a ogni tasto: digitando '2,5' si ottiene '25'. Svuotandolo diventa '0'.

  **Proposta:** Tenere il testo come stringa e convertirlo solo per i calcoli e al salvataggio, come fanno gli altri NumberInput.

  <sub>Evidenza: PiattoEditor.tsx:227-233, :366-371; lib/utils.ts:41-46</sub>

- [ ] **ALI-13 · I pasti vuoti spariscono dal diario, e con loro il loro '+'**  
  🟡 media · sforzo S (ore) · Diario

  Le sezioni senza righe non vengono mostrate. Manca così il '+' che porta già il giorno e il pasto giusti, e non si vede cosa resta da segnare.

  **Proposta:** Mostrare sempre le 4 sezioni: quelle vuote con una riga compatta '+ Aggiungi a cena' e 0 kcal.

  <sub>Evidenza: DiarioGiorno.tsx:489-491, :504-511</sub>

- [ ] **ALI-14 · Il diario non dice quante calorie restano**  
  🟡 media · sforzo S (ore) · Diario

  In cima ci sono 6 riquadri (3 righe su telefono) con totale e massimo, ma manca il 'ti restano 650 kcal' con una barra di avanzamento.

  **Proposta:** Una barra unica 'Obiettivo − Mangiate = Rimanenti' e i macro in una riga compatta.

  <sub>Evidenza: DiarioGiorno.tsx:404-448</sub>

- [ ] **ALI-15 · Le ricette non hanno peso da cotto né numero di porzioni**  
  🟡 media · sforzo M (1-2 giorni) · Piatti

  I valori per 100 g si calcolano sui pesi a crudo. Chi pesa il piatto cotto registra calorie gonfiate più del doppio, e non si può dire 'per 4 persone'. Esiste un ripiego: la porzione standard.

  **Proposta:** Campi 'Peso finale da cotto' e 'Numero di porzioni' (migration peso_finale_g), con per100 calcolato sul peso finale.

  <sub>Evidenza: alimentazione/types.ts:261-266; alimentazione/queries.ts:653-667; PiattoEditor.tsx:507-541</sub>

- [ ] **ALI-16 · La voce del diario si modifica poco e l'avviso 'dati da verificare' non porta da nessuna parte**  
  🟡 media · sforzo M (1-2 giorni) · Diario

  Si cambiano solo grammi e pasto: non il giorno, non le porzioni, non i valori. L'avviso dice 'Puoi correggerli a mano', ma il modo non esiste, e su telefono la spiegazione sta solo nel title. Il salvataggio di 0 g o un errore di rete passano in silenzio.

  **Proposta:** Modifica in una scheda come quella di Aggiungi (quantità in g o porzioni, pasto, giorno, 'Correggi valori'). Bloccare quantità ≤ 0, mostrare un toast di errore e rendere il triangolo un pulsante.

  <sub>Evidenza: DiarioGiorno.tsx:128-144, :540-568; alimentazione/queries.ts:164; validazione.ts:124; AvvisoDati.tsx:31-38</sub>

- [ ] **ALI-17 · I 'recenti' aggiungono valori vecchi dopo la correzione di un piatto**  
  🟡 media · sforzo M (1-2 giorni) · Aggiungi (recenti)

  I recenti copiano i valori per 100 g delle righe di diario già salvate. Se si corregge un piatto, il '+' rapido continua ad aggiungere i valori sbagliati.

  **Proposta:** Salvare piatto_id sulla riga di diario e usare i valori attuali del piatto.

  <sub>Evidenza: alimentazione/queries.ts:276-302; RicercaAggiungi.tsx:279-293; types.ts:124-136</sub>

- [ ] **ALI-18 · Mancano le porzioni domestiche (cucchiaio, fetta, bicchiere)**  
  🟡 media · sforzo M (1-2 giorni) · Aggiungi

  Ogni alimento ha al massimo una porzione generica, e USDA nessuna. Da telefono, senza bilancia, bisogna conoscere i grammi.

  **Proposta:** Misure standard nel selettore dell'unità (cucchiaio, cucchiaino, bicchiere, tazza, fetta) e le porzioni della tabella italiana.

  <sub>Evidenza: alimentazione/queries.ts:459-465, :499-516; types.ts:97-99</sub>

- [ ] **ALI-19 · Mancano i grassi saturi e i micronutrienti**  
  🟡 media · sforzo M (1-2 giorni) · Nutrienti

  'Di cui saturi' è obbligatorio nell'etichetta UE ma non ha un campo. Mancano anche sodio, potassio, calcio, ferro e vitamine.

  **Proposta:** Colonna saturi_100, letta da OFF e USDA, con un obiettivo massimo. I micronutrienti in un secondo momento, in sola lettura.

  <sub>Evidenza: alimentazione/types.ts:10-32; d1/migrations/0001_init.sql:76-82; RicercaAggiungi.tsx:880</sub>

- [ ] **ALI-20 · Mancano preferiti e pasti salvati**  
  🟡 media · sforzo M (1-2 giorni) · Aggiungi

  I recenti sono solo gli ultimi 20 alimenti. Non si salva 'La mia colazione' come gruppo e non si fissano i preferiti.

  **Proposta:** Una stella su risultati e voci con una sezione Preferiti. 'Salva questo pasto' e una scheda 'Pasti salvati' con inserimento in un tocco e annulla.

  <sub>Evidenza: alimentazione/queries.ts:276-291; RicercaAggiungi.tsx:522-544</sub>

### Esercizio e peso

- [ ] **ESE-07 · La durata delle serie cardio non entra nel calcolo delle calorie**  
  🟡 media · sforzo S (ore) · Calorie stimate

  Le kcal dipendono solo dalla durata della sessione, che è facoltativa: '30 min di corsa' registrati come serie non contano. Il MET medio dà lo stesso peso a 40 minuti di cyclette e a 5 minuti di curl.

  **Proposta:** Sommare le kcal delle serie che hanno una durata, applicare il MET medio solo ai minuti restanti e usare la somma delle durate quando manca quella della sessione.

  <sub>Evidenza: esercizio/allenamenti.ts:165, :204; met.ts:85-89; AllenamentoDettaglio.tsx:419-421</sub>

- [ ] **ESE-08 · Gli esercizi personali non si possono modificare**  
  🟡 media · sforzo S (ore) · Miei esercizi

  Un esercizio personale si può solo creare ed eliminare. Ricrearlo per correggere un errore cambia l'id e scollega lo storico.

  **Proposta:** Aggiungere aggiornaEsercizio con controllo del proprietario e riusare FormEsercizio in modalità modifica.

  <sub>Evidenza: esercizio/queries.ts:187-240; MieiEserciziList.tsx</sub>

- [ ] **ESE-09 · I campi delle serie sono alti 36 px, sotto la regola dei 44 px**  
  🟡 media · sforzo S (ore) · Allenamento

  I campi delle serie sono h-9 w-16, mentre il resto dell'app usa almeno 44 px. È la schermata più usata con una mano sola.

  **Proposta:** Portarli a min-h-11 e w-20 con un font più grande. Valutare pulsanti −/+ per carico e ripetizioni.

  <sub>Evidenza: AllenamentoDettaglio.tsx:216-217; controls.tsx:6-15</sub>

- [ ] **ESE-10 · Non si può ripetere un allenamento né salvarlo come scheda**  
  🟡 media · sforzo S (ore) · Allenamenti

  Chi non usa le schede deve ricomporre l'allenamento ogni volta, esercizio per esercizio.

  **Proposta:** Aggiungere al dettaglio 'Ripeti oggi', che copia le serie come iniziaDaScheda, e 'Salva come scheda'.

  <sub>Evidenza: AllenamentiList.tsx:124-157; ricerca 'duplica|ripeti|salva come scheda' in esercizio: nessun risultato</sub>

- [ ] **ESE-11 · Peso: mancano peso obiettivo, BMI e progresso**  
  🟡 media · sforzo S (ore) · Peso

  Non si può indicare un peso da raggiungere. Mancano la linea dell'obiettivo sul grafico, i kg mancanti, il ritmo settimanale e la data stimata. Il BMI non compare mai, anche se l'altezza è già salvata.

  **Proposta:** Campo peso_obiettivo; in /peso un riquadro con kg mancanti, ritmo delle ultime 4 settimane, data prevista e una linea sul grafico. BMI con la fascia OMS e una nota sui suoi limiti.

  <sub>Evidenza: RegistroPeso.tsx:221-237; alimentazione/types.ts:360, :375-377, :405; CalcolaObiettivi.tsx:42; ricerca 'bmi|peso_obiettivo' in src: nessun risultato</sub>

- [ ] **ESE-12 · Il grafico del peso non rispetta il tempo sull'asse orizzontale**  
  🟡 media · sforzo S (ore) · Peso › Andamento

  L'asse X è categorico: un giorno e tre settimane occupano lo stesso spazio, quindi la pendenza è falsata. Le etichette gg/mm senza anno sono ambigue nelle viste lunghe.

  **Proposta:** Usare XAxis type=number con scale=time sul timestamp, e mostrare l'anno nelle etichette oltre i 12 mesi.

  <sub>Evidenza: RegistroPeso.tsx:42-45, :277-284</sub>

- [ ] **ESE-13 · I carichi dell'ultima volta non vengono proposti**  
  🟡 media · sforzo M (1-2 giorni) · Allenamento / Schede

  FormSerie parte vuoto e iniziaDaScheda copia i numeri fissi della scheda. Durante l'allenamento non si vede 'precedente: 60 kg × 8'.

  **Proposta:** Una query sull'ultima serie dell'esercizio (con indice user_id, esercizio_id), una riga grigia 'L'ultima volta…' e in iniziaDaScheda l'opzione 'usa i carichi dell'ultima volta'.

  <sub>Evidenza: AllenamentoDettaglio.tsx:504-508; esercizio/schede.ts:239-277</sub>

- [ ] **ESE-14 · Nuoto, bici, padel e camminata non si registrano come attività a tempo**  
  🟡 media · sforzo M (1-2 giorni) · Miei esercizi

  Il catalogo non le ha, e un esercizio personale viene trattato come forza con MET 5. Un aggiramento esiste: scegliere 'cyclette' o 'corda' come attrezzo.

  **Proposta:** 'Tipo' e 'Intensità' nel form personale, oppure attività comuni già pronte con il MET del Compendium.

  <sub>Evidenza: esercizio/queries.ts:80-93; FormEsercizio.tsx:18-32, :97-124; met.ts:22</sub>

- [ ] **ESE-15 · Nessuna modalità 'allenamento in corso': niente cronometro né timer di recupero**  
  🟡 media · sforzo M (1-2 giorni) · Allenamento

  La durata si scrive a mano, e senza durata non c'è stima delle calorie. Non c'è un timer di recupero tra le serie.

  **Proposta:** 'Inizia ora' e 'Termina' con durata calcolata. Timer di recupero alla spunta della serie (60/90/120 s), calcolato dall'orario di fine e con vibrazione.

  <sub>Evidenza: AllenamentiList.tsx:217-228; AllenamentoDettaglio.tsx:328-387</sub>

- [ ] **ESE-16 · Le serie della scheda risultano svolte anche se saltate**  
  🟡 media · sforzo M (1-2 giorni) · Allenamento da scheda

  Avviando una scheda tutte le serie vengono inserite come fatte. Chi ne salta una deve cancellarla, altrimenti storico e calorie sono falsati.

  **Proposta:** Colonna 'completata' con una spunta per riga. Storico e record contano solo le serie completate, e a fine allenamento si chiede 'Elimino le non fatte?'.

  <sub>Evidenza: esercizio/schede.ts:242-297; d1/migrations/0008_esercizio.sql; AllenamentoDettaglio.tsx:219-262</sub>

- [ ] **ESE-17 · Una scheda non si modifica e togliere una voce non si annulla**  
  🟡 media · sforzo M (1-2 giorni) · Schede

  aggiornaScheda non è usata da nessun componente. Le voci si tolgono soltanto, senza Annulla né gestione degli errori, e non si possono correggere né riordinare.

  **Proposta:** Modifica sul posto delle voci e del nome, riordino e Annulla dopo l'eliminazione.

  <sub>Evidenza: esercizio/schede.ts:105-116; SchedaDettaglio.tsx:63-67; AllenamentoDettaglio.tsx:64-70</sub>

- [ ] **ESE-18 · Gli esercizi di un allenamento non si riordinano**  
  🟡 media · sforzo M (1-2 giorni) · Allenamento

  Le serie si aggiungono sempre in coda: aggiungendone una a un esercizio già presente, il gruppo si spezza in due blocchi.

  **Proposta:** '+ serie' per gruppo, che inserisce subito dopo, e frecce su/giù con un'action che rinumera l'ordine.

  <sub>Evidenza: esercizio/allenamenti.ts:337-347; AllenamentoDettaglio.tsx:89-94</sub>

### Impostazioni e chat

- [ ] **IMP-02 · Una chat può sovrascrivere una pesata scritta dall'utente, contro quanto promette il consenso**  
  🟡 media · sforzo S (ore) · Chat collegate (registra_peso)

  Il consenso promette che la chat 'Non potrà toccare quello che hai scritto tu dall'app', ma registra_peso fa un upsert sul giorno: sostituisce la pesata, cambia la fonte, cancella la nota, e annulla_aggiunta non la recupera.

  **Proposta:** Aggiungere all'upsert 'where pesi.fonte = 'chat'' e rifiutare con un messaggio chiaro quando la pesata esistente l'ha scritta l'utente. In alternativa, correggere il testo del consenso.

  <sub>Evidenza: lib/mcp/scrittura.ts:132-133, :154-157; oauth/authorize/page.tsx:117-121</sub>

- [ ] **IMP-03 · Il server MCP dice 'Sola lettura' anche con la scrittura concessa, e il consenso non nomina Anthropic**  
  🟡 media · sforzo S (ore) · Chat collegate (MCP) / consenso

  Le instructions mandate alla chat sono fisse su 'Sola lettura', quindi il modello può rifiutarsi di scrivere anche quando l'utente l'ha permesso. La pagina del consenso parla di 'un'applicazione di chat' senza dire che i dati andranno ad Anthropic, negli Stati Uniti.

  **Proposta:** Costruire le instructions in base a puoScrivere(ambito). Nel consenso aggiungere la frase 'i dati letti vengono inviati ad Anthropic (Claude), negli USA' con i link alle due informative.

  <sub>Evidenza: api/mcp/route.ts:169-171, :199-200; oauth/authorize/page.tsx:92-139</sub>

- [ ] **IMP-04 · La pagina Versioni parla a chi sviluppa e confessa una falla passata**  
  🟡 media · sforzo S (ore) · Impostazioni › Versioni

  In produzione la pagina mostra l'ambiente, l'elenco delle migration, voci 'Solo per chi sviluppa', 'database D1' e 'Chiusa una falla… dati di altri account'. Per un cliente è gergo, oppure un campanello d'allarme.

  **Proposta:** Un campo pubblico o interno su Modifica. Migration e ambiente visibili solo al superadmin. Un registro pubblico che parte dalla 1.0. Verificare con un legale gli obblighi degli artt. 33-34 per la falla passata.

  <sub>Evidenza: RegistroVersioni.tsx:49-62, :99, :158-163; changelog.ts:130-217; versioni/page.tsx:15-21</sub>

- [ ] **IMP-05 · Il backup non contiene i PDF delle bollette né il profilo**  
  🟡 media · sforzo M (1-2 giorni) · Impostazioni › Backup

  Il JSON contiene solo i percorsi degli allegati, non i file, ed esclude la tabella users. La pagina lo dice in gergo ('restano su Workers KV'). I PDF si scaricano solo uno per uno dall'elenco.

  **Proposta:** 'Scarica archivio completo': uno ZIP in streaming con il JSON, il profilo e allegati/AAAA-MM-GG_fornitore.pdf. Togliere il gergo dal testo.

  <sub>Evidenza: api/backup/route.ts:40-93; backup/page.tsx:21-23; bollette/queries.ts:167, :201</sub>

- [ ] **IMP-06 · La scelta tra 'solo lettura' e 'lettura e scrittura' non la fa l'utente**  
  🟡 media · sforzo M (1-2 giorni) · Consenso OAuth / Chat collegate

  Il permesso dipende dallo scope chiesto dal client, e la pagina offre solo Consenti o Annulla. Per ridurre i permessi bisogna staccare e ricollegare la chat.

  **Proposta:** Due opzioni nel consenso, che possono solo restringere lo scope, e in Chat collegate 'togli la scrittura' su un collegamento esistente.

  <sub>Evidenza: oauth/authorize/page.tsx:53-54, :146-167; ChatCollegate.tsx:90; docs/flusso.canvas:80</sub>

- [ ] **IMP-07 · Nessuna importazione: né del proprio backup né da altre app**  
  🟡 media · sforzo L (una settimana) · Impostazioni › Backup

  Il backup si scarica ma non si ricarica. Chi arriva da MyFitnessPal, Strong o da un Excel deve ricominciare da zero.

  **Proposta:** 'Ripristina da backup' (formato 2) con anteprima, 'unisci' o 'sostituisci', ordinaPerDipendenze, colonneDi e user_id forzato. Poi importatori CSV per bollette, peso e allenamenti.

  <sub>Evidenza: backup/page.tsx:17-31; api/backup/route.ts:24-26; ricerca 'ripristin|restore|importa' in src: nessuna funzione</sub>

### Funzionalità mancanti

- [ ] **FUN-02 · Nessuna esportazione in CSV o Excel**  
  🟡 media · sforzo S (ore) · Bollette / Abbonamenti / Diario / Backup

  Esistono solo il PDF della lista bollette e un JSON tecnico con i nomi delle tabelle. Un utente non può dare le spese al commercialista né il diario al nutrizionista.

  **Proposta:** 'Esporta CSV' su Bollette (con i filtri attivi), Abbonamenti, Diario, Peso e Allenamenti: separatore ';', virgola decimale, date gg/mm/aaaa, BOM UTF-8 e intestazioni in italiano. Tenere il JSON per il ripristino.

  <sub>Evidenza: BolletteList.tsx:149-234; api/backup/route.ts:51-59; lib/dati-utente.ts:24-39; ricerca 'csv' in src: nessun risultato</sub>

- [ ] **FUN-03 · Senza rete l'app non si apre e non registra nulla**  
  🟡 media · sforzo L (una settimana) · PWA

  Non c'è un service worker. In palestra o in viaggio compare la pagina d'errore del browser e pasti e serie non si possono segnare. L'errore però è visibile, quindi si può riprovare.

  **Proposta:** Un service worker con la shell in cache e una pagina offline in italiano. Poi una coda in IndexedDB per pasti, serie e pesate, con l'indicazione 'da sincronizzare'.

  <sub>Evidenza: manifest.ts:8-9; README.md:67,95,124; docs/sviluppo.md:201; public/ contiene solo icone</sub>

- [ ] **FUN-04 · Non si condivide nulla con partner o famiglia**  
  🟡 media · sforzo L (una settimana) · Consumi e Costi / Account

  La divisione è solo un calcolo verso 'l'altra famiglia', che non vede nulla. Due conviventi devono inserire le stesse bollette due volte.

  **Proposta:** Primo passo: un link in sola lettura, revocabile, con 'da recuperare'. Poi un nucleo familiare con bollette e abbonamenti in comune e la Salute privata, ed eventualmente un piano famiglia.

  <sub>Evidenza: bollette/types.ts:61-91; bollette/queries.ts:25</sub>

## ⚪ Gravità bassa (52)

### Sicurezza e privacy

- [ ] **SIC-10 · Due azioni scrivono righe agganciate a oggetti di altri utenti**  
  ⚪ bassa · sforzo S (ore) · Piatti / Allenamenti

  updatePiatto inserisce gli ingredienti anche se l'update non ha toccato righe, e ripristinaSerie non verifica di chi è l'allenamento. Le join in listPiatti e listAllenamenti non filtrano per user_id. Serve conoscere un UUID altrui.

  **Proposta:** Controllare meta.changes in updatePiatto, verificare la proprietà in ripristinaSerie come fa aggiungiSerie e aggiungere 'and i.user_id = p.user_id' e 's.user_id = a.user_id' alle join.

  <sub>Evidenza: alimentazione/queries.ts:618-630, :697-735, :778-823; esercizio/allenamenti.ts:119-122, :332, :418-445</sub>

- [ ] **SIC-11 · Regole della password incoerenti: 8 caratteri in registrazione, 6 altrove**  
  ⚪ bassa · sforzo S (ore) · Registrazione / Profilo / Utenti

  Cambio password, creazione da admin e login accettano 6 caratteri. Non c'è controllo sulle password comuni e la 2FA manca. Le iterazioni di PBKDF2 non si possono alzare oltre 100.000 su Workers.

  **Proposta:** Una costante PASSWORD_MIN = 8 (o 10) usata ovunque, un breve elenco di password comuni, il controllo che sia diversa dall'email e la pianificazione di un TOTP opzionale.

  <sub>Evidenza: lib/auth/actions.ts:141, :233; ProfiloSettings.tsx:307,321; impostazioni/queries.ts:48; login/page.tsx:49-51; lib/auth/password.ts:5</sub>

- [ ] **SIC-12 · La scorciatoia MCP senza autenticazione non è legata all'ambiente, e i commenti sono superati**  
  ⚪ bassa · sforzo S (ore) · Server MCP

  Se MCP_LOCALE e MCP_UTENTE finissero in produzione, /api/mcp risponderebbe senza token. I commenti dicono ancora 'nessuna autenticazione' e '404 a tutto', e la documentazione parla di due strumenti di sola lettura, mentre sono sei.

  **Proposta:** Attivare la scorciatoia solo con NODE_ENV=development o un AMBIENTE diverso da prod, e aggiornare commenti e documentazione.

  <sub>Evidenza: api/mcp/route.ts:8-28, :64-66, :89-93; middleware.ts:110-116; docs/sviluppo.md:207</sub>

- [ ] **SIC-13 · jspdf 2.5.2 ha vulnerabilità note**  
  ⚪ bassa · sforzo S (ore) · Export PDF bollette

  Sono note vulnerabilità DoS/ReDoS, corrette nella 3.x. Il rischio è basso perché la libreria gira sui dati dell'utente stesso.

  **Proposta:** Aggiornare jspdf e jspdf-autotable e aggiungere npm audit --omit=dev alla pipeline.

  <sub>Evidenza: package.json (jspdf ^2.5.2); BolletteList.tsx:151-152</sub>

- [ ] **SIC-14 · D1 e KV creati senza vincolo di giurisdizione UE**  
  ⚪ bassa · sforzo M (1-2 giorni) · Infrastruttura

  Non c'è nessuna giurisdizione né location hint: i dati sanitari possono stare fuori dallo SEE. La posizione reale non si ricava dal codice e Cloudflare offre DPA e SCC.

  **Proposta:** Ricreare D1 con giurisdizione eu e migrare prima del lancio, mettere gli allegati su R2 UE, archiviare il DPA e dichiararlo nell'informativa.

  <sub>Evidenza: wrangler.jsonc:22-68; docs/sviluppo.md:278</sub>

### Lancio commerciale

- [ ] **COM-10 · Link condivisi senza anteprima e descrizioni incoerenti**  
  ⚪ bassa · sforzo S (ore) · Metadati / SEO

  Mancano openGraph, twitter, robots e sitemap. La descrizione è in prima persona e il manifest non cita la parte Salute. Il problema conta solo dopo che esisterà la landing.

  **Proposta:** metadataBase, una descrizione commerciale, un'immagine OG 1200x630, robots.ts e sitemap.ts limitati alle pagine pubbliche e il manifest allineato.

  <sub>Evidenza: layout.tsx:7-23; manifest.ts:15</sub>

### Accesso e account

- [ ] **ACC-09 · Se la verifica anti-bot fallisce, il messaggio parla di 'registrazioni chiuse'**  
  ⚪ bassa · sforzo S (ore) · /registrati

  Se la verifica fallisce, per esempio per un blocco della pubblicità, l'utente legge che le registrazioni sono chiuse e che deve farsi creare l'accesso da 'chi amministra'.

  **Proposta:** 'Non siamo riusciti a completare il controllo di sicurezza. Ricarica la pagina; se usi un blocco della pubblicità, prova a disattivarlo. Se il problema continua, scrivi a <supporto>.'

  <sub>Evidenza: lib/auth/actions.ts:168-174</sub>

- [ ] **ACC-10 · Il form di login non dichiara autocomplete e non ha 'mostra password'**  
  ⚪ bassa · sforzo S (ore) · /login

  Email e password non hanno autoComplete, che invece registrazione e profilo hanno, e manca il pulsante per mostrare la password. Il messaggio di errore è generico per scelta.

  **Proposta:** autoComplete='username' e 'current-password', inputMode email e autoCapitalize none, inputClass a 44 px e un pulsante a forma di occhio.

  <sub>Evidenza: login/page.tsx:32-51; ModuloRegistrazione.tsx:53-97; ProfiloSettings.tsx:292-319</sub>

- [ ] **ACC-11 · L'elenco utenti non ha ricerca, filtri né paginazione**  
  ⚪ bassa · sforzo M (1-2 giorni) · Impostazioni › Utenti

  Tutti gli account stanno in un'unica lista. L'ultimo accesso non è visibile.

  **Proposta:** Ricerca su email e nome, filtri per stato, paginazione da 50 e l'ultimo accesso ricavato da sessions.

  <sub>Evidenza: impostazioni/queries.ts:17-28; UtentiSettings.tsx:125-233</sub>

- [ ] **ACC-12 · 'Sessioni attive' non mostra quali dispositivi sono collegati**  
  ⚪ bassa · sforzo M (1-2 giorni) · Profilo

  C'è solo 'Disconnetti altri dispositivi'. sessions non salva né il dispositivo né l'ultimo uso.

  **Proposta:** Colonne user_agent e ultimo_uso, e un elenco con 'Esci' per ogni dispositivo.

  <sub>Evidenza: ProfiloSettings.tsx:342-356; d1/migrations/0001_init.sql:19-24</sub>

### Grafica e navigazione

- [ ] **GRA-11 · Termini tecnici o inglesi per un utente medio**  
  ⚪ bassa · sforzo S (ore) · Dashboard, Impostazioni, barra

  'Clicca Personalizza… widget', 'Dashboard', 'Preferenze moduli' e 'Versioni', che occupa uno dei cinque posti della barra.

  **Proposta:** Usare Riepilogo o Home, 'riquadri', 'Tocca Personalizza' e 'Preferenze', e spostare Versioni in fondo al Profilo come 'Novità'.

  <sub>Evidenza: consumi-costi/page.tsx:11; alimentazione/dashboard/page.tsx:13; DashboardGrid.tsx:168-222; barra.ts:44; impostazioni/module.config.ts:25-30</sub>

- [ ] **GRA-12 · I titoli di sezione sono più deboli del contenuto e la gerarchia salta da h1 a h3**  
  ⚪ bassa · sforzo S (ore) · ui.tsx (CardTitle, PageHeader)

  CardTitle è un h3 grigio a 14 px, mentre il contenuto è più grande e nero. Non ci sono h2 intermedi, quindi la navigazione per titoli risulta incoerente.

  **Proposta:** Una scala a 3 livelli e CardTitle come h2 di default, con una prop 'as'.

  <sub>Evidenza: core/components/ui.tsx:22-34, :53</sub>

- [ ] **GRA-15 · L'app installata è bloccata in verticale, anche su tablet e pieghevoli**  
  ⚪ bassa · sforzo S (ore) · PWA (manifest)

  Il manifest impone orientation: 'portrait'. Su tablet Android e su telefoni pieghevoli l'app installata non ruota, e i grafici di andamento e l'elenco delle bollette, che in orizzontale avrebbero più spazio, restano stretti. Su computer e iPad il vincolo viene ignorato, quindi l'esperienza cambia da un dispositivo all'altro.

  **Proposta:** Togliere il vincolo oppure usare 'any', visto che il layout è già responsive (sidebar da lg in su).

  <sub>Evidenza: src/app/manifest.ts:19 (orientation: 'portrait').</sub>

- [ ] **GRA-13 · Lo scorrimento avviene in un contenitore interno alto 100vh**  
  ⚪ bassa · sforzo M (1-2 giorni) · AppShell

  Su iPhone 100vh è più alto dell'area visibile. Il tocco sulla barra di stato e la compressione delle barre di Safari non funzionano, e manca overscroll-behavior.

  **Proposta:** Far scorrere il documento con header sticky e barra fixed, oppure usare h-dvh con overscroll-behavior: contain.

  <sub>Evidenza: AppShell.tsx:26, :32; Sidebar.tsx:56</sub>

### Accessibilità

- [ ] **A11Y-12 · Il testo secondario è sotto 4,5:1 sugli sfondi grigi**  
  ⚪ bassa · sforzo S (ore) · Tema / thead bollette

  muted-foreground ha contrasto 4,30:1 su muted e 4,10:1 su accent, perché il calcolo avviene solo contro lo sfondo. Lo scarto è piccolo.

  **Proposta:** Calcolare il contrasto contro lo sfondo più scuro tra background, muted e accent, con un default di circa 215 19% 42%.

  <sub>Evidenza: globals.css:10-14; palette.ts:193-198; BolletteList.tsx:392</sub>

- [ ] **A11Y-13 · TabBar dichiara role=tab ma non si comporta come un vero tablist**  
  ⚪ bassa · sforzo S (ore) · TabBar (10 usi)

  Mancano le frecce, il tabindex a rotazione e il tabpanel. Per Chiaro/Scuro si tratta di una scelta, non di schede. Tab e Invio funzionano.

  **Proposta:** Implementare il pattern completo, oppure usare radiogroup o aria-pressed dove si tratta di una scelta.

  <sub>Evidenza: controls.tsx:83-121; ProfiloSettings.tsx:209-214</sub>

- [ ] **A11Y-14 · Riordino dei widget: annunci in inglese e nessuna alternativa al trascinamento**  
  ⚪ bassa · sforzo S (ore) · Dashboard (Personalizza)

  dnd-kit usa testi predefiniti in inglese. Su telefono si può solo trascinare (WCAG 2.5.7). Le maniglie misurano 24 px e hanno title generici.

  **Proposta:** Passare accessibility in italiano, aggiungere 'Sposta prima' e 'Sposta dopo' da 44 px e aria-label con il titolo del widget.

  <sub>Evidenza: DashboardGrid.tsx:155-157, :168-186, :227-231, :461-476</sub>

- [ ] **A11Y-15 · Manca 'Salta al contenuto' e la sidebar non segnala la pagina corrente**  
  ⚪ bassa · sforzo S (ore) · AppShell / Sidebar

  NavLink non ha aria-current. Il menu delle aree non ha aria-expanded e non si chiude con Esc.

  **Proposta:** Un link di salto verso main#contenuto, aria-current=page, aria-expanded ed Esc sul menu.

  <sub>Evidenza: AppShell.tsx:25-44; Sidebar.tsx:58-102, :224-258; BarraInferiore.tsx:58</sub>

- [ ] **A11Y-16 · L'impostazione 'Riduci movimento' non viene rispettata**  
  ⚪ bassa · sforzo S (ore) · Tutta l'app

  Transizioni e ingrandimenti non si disattivano con prefers-reduced-motion.

  **Proposta:** Una media query reduce in globals.css che azzera transizioni e animazioni, escluso lo spinner.

  <sub>Evidenza: globals.css:72; ProfiloSettings.tsx:238; DashboardGrid.tsx:453</sub>

- [ ] **A11Y-17 · Testi da 10-11 px nella barra e nelle anteprime**  
  ⚪ bassa · sforzo S (ore) · Barra mobile, anteprime, MacroOggi

  Le etichette sono troppo piccole per un pubblico non giovane.

  **Proposta:** Portare tutto ad almeno 12 px e verificare che i nomi non vengano troncati.

  <sub>Evidenza: BarraInferiore.tsx:88; Anteprima.tsx:53,84; MacroOggi.tsx:91,104</sub>

- [ ] **A11Y-18 · Dopo un'eliminazione il focus si perde in cima alla pagina**  
  ⚪ bassa · sforzo M (1-2 giorni) · Liste con eliminazione

  Il pulsante che aveva il focus sparisce e il focus torna al body. L'Annulla del toast resta irraggiungibile da tastiera.

  **Proposta:** Spostare il focus sulla riga successiva o sul titolo e rendere raggiungibile l'Annulla.

  <sub>Evidenza: Ricerca '.focus()' nei tsx: nessun risultato; 12 azioni con Annulla</sub>

### Affidabilità e prestazioni

- [ ] **AFF-16 · La stessa sessione viene letta 4-5 volte per pagina**  
  ⚪ bassa · sforzo S (ore) · Tutte le pagine

  Middleware, getAspetto, il layout e ogni requireSessionUser rifanno la stessa query, senza cache() di React. Sono letture per chiave, quindi l'impatto è piccolo.

  **Proposta:** Avvolgere getSessionUser in cache() ed eventualmente passare l'id utente verificato dal middleware in un header interno.

  <sub>Evidenza: middleware.ts:152-163; core/theme/preferenze.ts:21-28; (app)/layout.tsx:11; lib/auth/session.ts:66-98</sub>

- [ ] **AFF-17 · Le miniature degli esercizi scaricano la GIF intera**  
  ⚪ bassa · sforzo M (1-2 giorni) · Miniatura / api/esercizio-gif

  Per una miniatura di 40 px si scarica la GIF animata intera passando dal Worker, il che pesa sulla rete mobile al primo caricamento. Grazie alla cache del browser e alle scritture KV una tantum il consumo resta limitato.

  **Proposta:** Miniature WebP statiche generate una volta e servite come asset, con la GIF solo nel dettaglio.

  <sub>Evidenza: Miniatura.tsx:40-48; AllenamentoDettaglio.tsx:442,467; api/esercizio-gif/[id]/route.ts:23-69; middleware.ts:207</sub>

- [ ] **AFF-18 · Fuso orario fisso su Roma: in viaggio il 'giorno' del diario e degli allenamenti è sbagliato**  
  ⚪ bassa · sforzo M (1-2 giorni) · Diario / Allenamenti / Peso (date)

  Il giorno corrente è sempre calcolato su Europe/Rome, sia sul server sia sul client, e formatDate formatta senza fuso esplicito. Un utente in vacanza o in trasferta fuori dall'Italia (per esempio a New York) vede come 'Oggi' il giorno italiano: la cena delle 20 locali finisce nel giorno dopo, e lo stesso vale per il bilancio energetico e per gli allenamenti. In un fuso negativo, inoltre, le date scritte come YYYY-MM-DD vengono mostrate col giorno precedente.

  **Proposta:** Salvare il fuso del dispositivo nel profilo (Intl.DateTimeFormat().resolvedOptions().timeZone) e usarlo per calcolare 'oggi'. Formattare le date YYYY-MM-DD con timeZone 'UTC' per non spostarle.

  <sub>Evidenza: src/lib/utils.ts:54 (FUSO_ORARIO = 'Europe/Rome' costante); src/lib/utils.ts:56-67 (oggiIso usato da diario, allenamenti, peso); src/lib/utils.ts:15-25 (formatDate con new Date(stringa) senza timeZone).</sub>

### Consumi e Costi

- [ ] **CON-19 · 'Già pagato' è un totale di sempre e il suo link rimanda alla stessa pagina**  
  ⚪ bassa · sforzo S (ore) · Dashboard - RiepilogoCosti

  Il riquadro somma tutto il pagato da sempre, senza indicare un periodo, e il link porta a /consumi-costi, la pagina in cui l'utente si trova già.

  **Proposta:** 'Pagato nel 2026' con il confronto sull'anno precedente, e un link alle bollette pagate dell'anno.

  <sub>Evidenza: RiepilogoCosti.tsx:44, :309; bollette/queries.ts:17-30; abbonamenti/queries.ts:191-201</sub>

- [ ] **CON-20 · 'Da pagare' e 'Prossime scadenze' ignorano le rate degli abbonamenti**  
  ⚪ bassa · sforzo S (ore) · Dashboard - RiepilogoCosti

  I due totali contano solo le bollette, mentre 'Già pagato' include anche le rate. Le rate arretrate compaiono comunque nel widget degli abbonamenti.

  **Proposta:** Includere le rate da pagare e la prossima rata, con un'icona che distingue bollette e abbonamenti.

  <sub>Evidenza: core/dashboard/queries.ts:23-44; RiepilogoCosti.tsx:39-54, :296-360</sub>

- [ ] **CON-21 · La disdetta funziona diversamente tra elenco e dettaglio**  
  ⚪ bassa · sforzo S (ore) · Abbonamenti

  Dall'elenco la disdetta è immediata con Annulla. Dal dettaglio parte un confirm() nativo che dice 'non è reversibile'. 'Riattiva' compare solo per i sospesi, e non si può indicare una data di effetto.

  **Proposta:** Lo stesso schema nelle due viste (azione immediata più toast), 'Riattiva' anche per i disdetti, un campo data_fine e un <ConfermaModale> al posto di confirm().

  <sub>Evidenza: AbbonamentiList.tsx:51-66, :168; AbbonamentoDettaglio.tsx:57-66; abbonamenti/queries.ts:176-179</sub>

- [ ] **CON-22 · L'elenco abbonamenti non mostra né il costo annuo né la prossima scadenza**  
  ⚪ bassa · sforzo S (ore) · Abbonamenti - elenco

  L'elenco mostra rata e frequenza ed è ordinato per data di creazione. Il costo complessivo annuo non compare da nessuna parte.

  **Proposta:** Una testata 'Totale X €/mese · Y €/anno', la prossima scadenza per ogni voce e l'ordinamento per scadenza.

  <sub>Evidenza: AbbonamentiList.tsx:248-251; abbonamenti/queries.ts:59, :241-248</sub>

- [ ] **CON-23 · Andamento mensile: solo l'anno corrente, asse senza € e nessuno stato vuoto**  
  ⚪ bassa · sforzo S (ore) · Widget AndamentoMensile

  A gennaio il grafico è quasi vuoto. L'asse Y non ha € né separatori, e senza dati mostra 12 barre a zero.

  **Proposta:** Mostrare gli ultimi 12 mesi con l'anno precedente affiancato, l'asse formattato in € e un invito ad aggiungere la prima bolletta.

  <sub>Evidenza: AndamentoMensile.tsx:25, :41-55</sub>

- [ ] **CON-24 · Una bolletta inesistente resta su 'Caricamento…' all'infinito**  
  ⚪ bassa · sforzo S (ore) · Bollette - modifica

  getBolletta restituisce null quando la bolletta non c'è, ma la pagina tratta null come 'in caricamento'.

  **Proposta:** Distinguere undefined da null e mostrare 'Bolletta non trovata', oppure caricare sul server e chiamare notFound().

  <sub>Evidenza: bollette/[id]/page.tsx:15-33; bollette/queries.ts:53-61</sub>

- [ ] **CON-26 · Le bollette a credito (conguaglio a favore) non si possono registrare**  
  ⚪ bassa · sforzo S (ore) · Bollette - form

  Il campo importo ha min=0, quindi il browser rifiuta un importo negativo. Le bollette italiane di luce e gas con un conguaglio a favore del cliente hanno un totale negativo o un credito da riportare. Oggi l'utente non può registrarle così come sono: deve scrivere 0 (e i totali e la spesa per tipo risultano sbagliati) oppure non registrarle. Nessuna voce dell'audit tratta il caso del segno: CON-04 riguarda la virgola.

  **Proposta:** Permettere importi negativi oppure aggiungere l'opzione 'Bolletta a credito / rimborso' che salva un importo negativo. Mostrarlo in verde nell'elenco e contarlo correttamente in totali, quota da dividere e grafici.

  <sub>Evidenza: src/modules/bollette/components/BollettaForm.tsx:186-195 (input type=number step=0.01 min=0 per 'Importo (€)'); src/modules/bollette/components/BollettaForm.tsx:120 (parseFloat dell'importo, senza nessun altro tipo di voce).</sub>

- [ ] **CON-27 · Il filtro per anno delle bollette mostra solo gli ultimi sei anni e mai l'anno prossimo**  
  ⚪ bassa · sforzo S (ore) · Bollette - elenco (filtri ed esportazione PDF)

  Gli anni del filtro sono generati come l'anno corrente e i cinque precedenti. A dicembre le bollette con scadenza a gennaio dell'anno dopo non si possono filtrare, e chi inserisce lo storico (per esempio dal 2018) non può isolarlo né esportarlo in PDF per anno.

  **Proposta:** Ricavare gli anni dal minimo e dal massimo di data_scadenza delle bollette dell'utente, includendo l'anno successivo quando esistono scadenze future.

  <sub>Evidenza: src/modules/bollette/components/BolletteList.tsx:92 (Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)); src/modules/bollette/components/BolletteList.tsx:170 (l'anno finisce nell'intestazione del PDF).</sub>

### Alimentazione

- [ ] **ALI-21 · Manca il conteggio dell'acqua**  
  ⚪ bassa · sforzo S (ore) · Diario

  Non si possono segnare i bicchieri d'acqua né fissare un obiettivo di idratazione, funzioni presenti nei concorrenti.

  **Proposta:** Una riga 'Acqua' con +/- da 250 ml, una tabella diario_acqua, un obiettivo facoltativo, un widget e l'inclusione nel backup.

  <sub>Evidenza: Ricerca 'acqua|idrata' nel modulo: solo validazione.ts:46,81</sub>

- [ ] **ALI-22 · La cache degli alimenti non scade e salva risultati incompleti**  
  ⚪ bassa · sforzo S (ore) · Ricerca (cache)

  updated_at non viene mai letto. Se OFF è in errore e USDA risponde, cosa che succede solo con la chiave configurata, quel termine resta per sempre e per tutti con i soli risultati inglesi. La tabella cresce senza limite.

  **Proposta:** Salvare solo se nessuna fonte ha dato errore, considerare valida la cache solo per 30-60 giorni, pulirla periodicamente e normalizzare la chiave.

  <sub>Evidenza: alimentazione/queries.ts:554-593; d1/migrations/0002_cache_alimenti.sql:8-12</sub>

- [ ] **ALI-23 · Andamento: tabella promessa ma inesistente, aderenza gonfiata, massimo 90 giorni**  
  ⚪ bassa · sforzo S (ore) · Andamento

  L'aria-label rimanda a 'la tabella qui sotto', che non esiste. Anche un giorno con la sola colazione conta come obiettivo rispettato. Non ci sono viste per 6 mesi o 1 anno.

  **Proposta:** Una tabella dei giorni apribile, i giorni incompleti esclusi o segnati, e i periodi di 6 mesi e 1 anno aggregati per settimana.

  <sub>Evidenza: AndamentoAlimentazione.tsx:145-151, :215, :355-402; AndamentoSalute.tsx:12-16</sub>

- [ ] **ALI-24 · I pasti sono fissi a quattro**  
  ⚪ bassa · sforzo M (1-2 giorni) · Diario

  C'è un solo Spuntino, e pastoSuggerito manda tutto il pomeriggio in Spuntino e la sera in Cena.

  **Proposta:** Separare Spuntino e Merenda, permettere di rinominare le etichette e più avanti di definire pasti propri.

  <sub>Evidenza: alimentazione/types.ts:1-8, :145-150</sub>

- [ ] **ALI-25 · Gli obiettivi sono uguali tutti i giorni e non si esprimono in percentuale**  
  ⚪ bassa · sforzo M (1-2 giorni) · Obiettivi

  Non si possono avere più kcal nei giorni di allenamento, né macro in % delle calorie.

  **Proposta:** Un obiettivo per giorno della settimana e un selettore grammi / % kcal.

  <sub>Evidenza: d1/migrations/0001_init.sql:92-98; ObiettiviForm.tsx:105-135</sub>

### Esercizio e peso

- [ ] **ESE-19 · Catalogo senza filtri né miniature**  
  ⚪ bassa · sforzo S (ore) · Catalogo

  Senza ricerca il catalogo mostra i primi 40 esercizi in ordine alfabetico inglese, senza chip per muscolo o attrezzo e senza miniature. La ricerca testuale però copre già muscolo e attrezzo.

  **Proposta:** Chip dei gruppi muscolari, un select dell'attrezzo, la Miniatura e per primi gli esercizi più usati.

  <sub>Evidenza: EserciziList.tsx:38, :98-128</sub>

- [ ] **ESE-20 · Le note di allenamento e scheda vengono salvate ma non si possono scrivere**  
  ⚪ bassa · sforzo S (ore) · Allenamento / Schede

  La colonna note esiste, ma nessun campo permette di compilarla.

  **Proposta:** Un campo Note nell'intestazione, con un'anteprima nell'elenco.

  <sub>Evidenza: AllenamentiList.tsx:185; AllenamentoDettaglio.tsx:346; SchedeList.tsx:46</sub>

- [ ] **ESE-21 · Numeri col punto decimale in tutta l'app, e simboli corrotti nei nomi degli esercizi**  
  ⚪ bassa · sforzo S (ore) · Peso / Esercizio

  Peso e carichi compaiono come '72.5 kg' e il placeholder è '70.5'. Cinque nomi del catalogo contengono 'в°' al posto di '°'. Non riguarda solo l'esercizio: anche diario, ricette, Aggiungi, MedieMacro e Andamento usano toFixed(1). Nel diario di un utente nuovo si legge '0.0 g' accanto a '0,00 €'.

  **Proposta:** Formattare con toLocaleString('it-IT'), usare il placeholder '70,5' e correggere 'в°' nello script di generazione. Un solo formattatore (Intl.NumberFormat('it-IT')) per tutti i numeri a schermo.

  <sub>Evidenza: peso/types.ts:113-120; RegistroPeso.tsx:175; SchedaDettaglio.tsx:39; d1/seed-esercizi.sql; DiarioGiorno.tsx:56, :572-573; PiattiList, PiattoEditor, RicercaAggiungi, MedieMacro, AndamentoAlimentazione (toFixed)</sub>

- [ ] **ESE-22 · Toccando il nome di un esercizio si esce dall'allenamento senza poter tornare**  
  ⚪ bassa · sforzo S (ore) · Allenamento / pagina esercizio

  Il nome porta al catalogo, il cui 'indietro' è fisso su /esercizio/catalogo e non sull'allenamento.

  **Proposta:** Aprire i dettagli in un foglio modale oppure usare router.back().

  <sub>Evidenza: AllenamentoDettaglio.tsx:112-118; catalogo/[id]/page.tsx:25-31</sub>

- [ ] **ESE-23 · Manca il calcolatore dei dischi da montare**  
  ⚪ bassa · sforzo S (ore) · Allenamento

  Inserito un carico, l'app non dice quali dischi montare per lato.

  **Proposta:** Una finestrella sui carichi con bilanciere, con peso del bilanciere e dischi disponibili impostabili nelle preferenze.

  <sub>Evidenza: Ricerca 'dischi|plate' in src: nessun risultato</sub>

- [ ] **ESE-26 · Un allenamento creato e poi abbandonato conta come sessione e aggiunge calorie bruciate**  
  ⚪ bassa · sforzo S (ore) · Esercizio / Bilancio energetico / Andamento

  Con 'Crea e aggiungi esercizi' l'allenamento viene scritto nel database prima che ci sia un esercizio. Se l'utente cambia idea e torna indietro, l'allenamento resta nell'elenco come 'nessun esercizio'. Viene comunque contato fra le sessioni della settimana (gonfiando l'obiettivo 'giorni a settimana') e, se era stata scritta la durata, riceve una stima di calorie con il MET predefinito 5. Quelle calorie entrano nel bilancio energetico di oggi e fanno sembrare all'utente di poter mangiare di più.

  **Proposta:** Non contare nelle sessioni e nelle calorie gli allenamenti senza serie, oppure crearli solo al primo esercizio aggiunto. In alternativa, all'uscita da un allenamento vuoto chiedere 'Eliminare l'allenamento vuoto?'.

  <sub>Evidenza: src/modules/esercizio/components/AllenamentiList.tsx:178-191 (creaAllenamento seguito da router.push); src/modules/esercizio/allenamenti.ts:214-231 (insert immediato); src/modules/esercizio/met.ts:22 e 86-88 (MET_PREDEFINITO = 5 quando non ci sono esercizi); src/modules/esercizio/allenamenti.ts:165 (kcal calcolate anche senza serie); src/modules/esercizio/allenamenti.ts:468-476 (sessioni e kcalOggi contano tutti gli allenamenti del periodo); src/modules/esercizio/components/AndamentoAllenamenti.tsx:68 e 89-98.</sub>

- [ ] **ESE-24 · Peso: nessuna misura corporea né foto dei progressi**  
  ⚪ bassa · sforzo M (1-2 giorni) · Peso

  Si registrano solo i kg: vita, fianchi e % di grasso non si possono segnare.

  **Proposta:** Una tabella misure (data, tipo, valore) con un grafico per misura. Le foto più avanti.

  <sub>Evidenza: d1/migrations/0011_pesi.sql</sub>

- [ ] **ESE-25 · Niente superserie, note per serie o serie di riscaldamento**  
  ⚪ bassa · sforzo M (1-2 giorni) · Allenamento / Schede

  Le serie sono tutte uguali e non si possono raggruppare.

  **Proposta:** Colonne tipo, nota e gruppo, e il riscaldamento escluso dai record.

  <sub>Evidenza: d1/migrations/0008_esercizio.sql</sub>

### Impostazioni e chat

- [ ] **IMP-08 · Preferenze: errori silenziosi e campi senza etichetta collegata**  
  ⚪ bassa · sforzo S (ore) · Preferenze moduli / Utenti

  Se il caricamento fallisce il riquadro resta vuoto, e se il salvataggio fallisce non compare nessun messaggio. Le label 'Persone' non hanno htmlFor e il select del ruolo non ha etichetta. Un campo vuoto viene salvato come 0.

  **Proposta:** Catch con toast e stato di errore, collegamento htmlFor/id, aria-label 'Ruolo di …' e validazione con minimo 1.

  <sub>Evidenza: PreferenzeModuli.tsx:25-42, :55-80; UtentiSettings.tsx:159-168</sub>

- [ ] **IMP-09 · Le chat collegate non si distinguono e si staccano senza conferma**  
  ⚪ bassa · sforzo S (ore) · Profilo › Chat collegate

  Ogni collegamento si chiama solo 'Collegata il <data>'. 'Stacca' agisce subito, senza conferma né annulla.

  **Proposta:** Salvare con il token un'etichetta (user-agent o un nome scelto) e chiedere conferma prima di staccare.

  <sub>Evidenza: ChatCollegate.tsx:64, :90-96; lib/oauth/collegamenti.ts</sub>

- [ ] **IMP-10 · Se la risposta di rinnovo del token si perde, la chat collegata si stacca**  
  ⚪ bassa · sforzo S (ore) · Chat collegate (OAuth, rinnovo del token)

  Al rinnovo il server cancella subito tutti i token della sessione e ne crea di nuovi, senza un periodo di tolleranza. Se la risposta non arriva al client (rete lenta, timeout) o se il client rinnova due volte quasi insieme, il vecchio token di rinnovo non vale più e il nuovo non è mai arrivato: il collegamento smette di funzionare e l'utente deve rifare il consenso senza capire perché. Inoltre lettura e cancellazione non sono atomiche, quindi due rinnovi contemporanei possono entrambi riuscire e lasciare due coppie di token valide.

  **Proposta:** Tenere valido il token di rinnovo appena usato per 30-60 secondi, restituendo la stessa coppia nuova se viene ripresentato, e rendere l'operazione atomica (delete ... returning, oppure batch con controllo delle righe modificate).

  <sub>Evidenza: src/lib/oauth/token.ts:222-242 (select del rinnovo, poi delete di tutta la sessione, poi creaToken: tre istruzioni separate, senza tolleranza sul token appena usato).</sub>

### Funzionalità mancanti

- [ ] **FUN-05 · Nessuna serie di giorni consecutivi**  
  ⚪ bassa · sforzo S (ore) · Salute

  Non si vede da quanti giorni di fila si compila il diario.

  **Proposta:** Un contatore 'X giorni di fila' nel diario e in un widget.

  <sub>Evidenza: Ricerca 'streak|consecutiv|di fila' in src: nessun risultato pertinente</sub>

- [ ] **FUN-06 · Manca un budget mensile**  
  ⚪ bassa · sforzo M (1-2 giorni) · Consumi e Costi

  Non si può impostare un tetto di spesa, ma l'area riguarda soprattutto spese fisse.

  **Proposta:** Un budget mensile, poi per categoria, con una barra di avanzamento e un avviso all'80%.

  <sub>Evidenza: Ricerca 'budget|tetto' in src: nessun risultato pertinente</sub>

- [ ] **FUN-07 · Nessuna ricerca globale fra le aree**  
  ⚪ bassa · sforzo M (1-2 giorni) · Navigazione

  Per trovare una bolletta o una scheda bisogna sapere in quale sezione si trova.

  **Proposta:** Una lente in testata che cerca in bollette, abbonamenti, piatti, schede ed esercizi.

  <sub>Evidenza: Ricerca 'cmdk|ricerca globale' in src: nessun risultato</sub>

- [ ] **FUN-08 · Nessuna integrazione con Apple Salute o Health Connect**  
  ⚪ bassa · sforzo XL (più settimane) · Salute

  Passi, allenamenti dello smartwatch e peso della bilancia smart vanno riscritti a mano. Una web app non può leggerli.

  **Proposta:** Rimandare a dopo il lancio, poi un'app nativa (Capacitor) con i plugin. Spiegarlo nelle FAQ.

  <sub>Evidenza: Ricerca 'healthkit|health connect' in src: nessun risultato</sub>

## Appendice

### Smentite dai verificatori

Restano qui per trasparenza: sono state scartate, non dimenticate.

- ~~Lingua, fuso orario, valuta e unità non si possono configurare~~ — I fatti sono veri (Europe/Rome, it-IT, EUR, kg), ma il finding stesso dice che per un lancio rivolto a utenti italiani non serve. Per un utente medio italiano e per il lancio commerciale previsto è irrilevante.
- ~~Focus da tastiera invisibile su pulsanti e link~~ — L'evidenza principale è sbagliata: il campo di PiattiList.tsx:69-70 ha 'outline-none' insieme a 'focus:ring-2 focus:ring-primary', quindi un anello sostitutivo c'è. Lo stesso vale per inputClass. È vero che manca focus-visible, ma i pulsanti e i link conservano il contorno di focus predefinito del browser, che Tailwind preflight non rimuove. Dire che il focus è 'invisibile' non regge.
- ~~Solo italiano, senza predisposizione per altre lingue~~ — È vero che i testi e il formato it-IT sono fissi, ma per un lancio rivolto a utenti medi italiani è irrilevante: il finding stesso propone 'nessun intervento prima del lancio'. Non è una funzionalità mancante per questo pubblico.
- ~~Anche diario, ricette e Aggiungi mostrano i decimali col punto~~ — I toFixed(1) citati esistono davvero (DiarioGiorno, PiattiList, PiattoEditor, RicercaAggiungi, MedieMacro, AndamentoAlimentazione). Però è lo stesso difetto di ESE-21 (numeri col punto decimale), con la stessa causa e la stessa correzione: aggiunge solo altre schermate all'elenco. Lo stesso finding si presenta come estensione di ESE-21, quindi è un doppione. *(Riassorbita in ESE-21: il punto decimale nel diario l'ho visto io nel giro dal vivo.)*

### Lasciate fuori dai revisori per spazio (non verificate)

Ogni revisore poteva riportare al massimo 30 voci. Queste sono quelle oltre il limite: solo il titolo, senza verifica. Vanno prese come indizi.

- alimentazione: Aggiunta rapida dai recenti senza 'Annulla' nel messaggio di conferma (RicercaAggiungi.tsx:279-293, :403-416)
- alimentazione: Copia giorno ripetuta duplica le righe senza avviso (queries.ts:187-222)
- alimentazione: Grafico MacroOggi con colori fissi #3b82f6/#cbd5e1, poco leggibile in tema scuro (widgets/MacroOggi.tsx:160, :173)
- alimentazione: Ingrediente manuale della ricetta senza fibre, zuccheri e sale, salvati a 0 (PiattoEditor.tsx:201-218)
- alimentazione: Editor dei piatti senza avviso per modifiche non salvate su 'Annulla' (PiattoEditor.tsx:567-569)
- alimentazione: Codice morto: if vuoto in aggiuntaRapida (RicercaAggiungi.tsx:286-287)
- esercizio-peso: Nessuna importazione degli allenamenti da Strong/Hevy (CSV) per chi cambia app: cercato 'csv|importa' in src/modules/esercizio, nessun risultato (commerciale, bassa, M)
- esercizio-peso: Nomi delle pagine incoerenti: la pagina del catalogo si intitola 'Esercizio' (src/app/(app)/esercizio/catalogo/page.tsx:7) mentre la voce di menu 'Esercizio' apre 'Allenamenti' (ux, bassa, S)
- grafica: Interruttore del tema nel foglio profilo alto 36 px (ThemeToggle.tsx:40,49) e pulsante X della Modale con p-2: bersagli sotto i 44 px
- grafica: Stati vuoti con stile non uniforme: Esercizio ha l'icona (SchedeList.tsx:133, MieiEserciziList.tsx:77), Bollette e Abbonamenti no (BolletteList.tsx:315, AbbonamentiList.tsx:106)
- grafica: Login senza autoComplete='email'/'current-password' (login/page.tsx:32-51), invece presenti in registrazione e profilo
- grafica: Manifest senza 'id', 'screenshots' e 'categories' (manifest.ts): su Android l'installazione mostra il riquadro minimo invece di quello con anteprime; nessuna immagine Open Graph per l'anteprima del link condiviso
- flussi: Riquadro «Già pagato» della dashboard che rimanda alla pagina stessa (/consumi-costi) invece che a un elenco dei pagati (src/core/dashboard/widgets/RiepilogoCosti.tsx:44)
- flussi: Aggiunta rapida dai recenti in un tocco senza «Annulla» nella pagina Aggiungi: per toglierla bisogna andare nel diario (RicercaAggiungi.tsx:279-292, banner 401-414 senza annulla)
- flussi: Il canvas non corrisponde più al codice: dopo «Aggiungi al diario» non si torna al Diario, si resta su Aggiungi (RicercaAggiungi.tsx:296-300 contro il nodo p-pasto-4 del canvas)
- flussi: Il README dice «Non c'è registrazione pubblica», mentre il login offre «Chiedilo» e la registrazione libera esiste
- flussi: Nuovo abbonamento senza pulsante Annulla né link per tornare indietro (AbbonamentoForm.tsx:93-99)
- flussi: Il pulsante Annulla della bolletta usa router.back(): se la pagina è aperta direttamente, nell'app installata non torna all'elenco (BollettaForm.tsx:364)
- flussi: Il campo password del login non ha autoComplete="current-password" e l'email non ha autoComplete="email": i gestori di password su telefono funzionano peggio (login/page.tsx:32-51)
- flussi: Il segnaposto del peso è «70.5» con il punto invece della virgola italiana (RegistroPeso.tsx, NumberInput placeholder)
- flussi: Il riepilogo costi resta su «…» per sempre se la lettura fallisce, senza messaggio di errore (RiepilogoCosti.tsx:21-25)
- flussi: L'app installata non funziona senza rete (manca il service worker): in palestra senza campo non si apre nemmeno in sola lettura (manifest.ts:8-9)
