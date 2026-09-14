/**
 * I gruppi muscolari che la mappa sa illuminare, e come ci si arriva dai nomi
 * usati dalle fonti dati.
 *
 * Perche' 22 e non "tutti": il limite non e' il disegno ma il dato. Nessun
 * catalogo di esercizi etichetta piu' finemente di una ventina di gruppi — i
 * ~50 termini di ExerciseDB collassano qui sopra — e su una figura alta pochi
 * centimetri distinguere il vasto mediale dal retto femorale non si vedrebbe
 * comunque. Questi 22 coprono cio' che in palestra si allena davvero, inclusi
 * deltoide posteriore, avambracci e lombari.
 */

export const MUSCOLI = [
  "trapezius",
  "upper-back",
  "lower-back",
  "chest",
  "biceps",
  "triceps",
  "forearm",
  "back-deltoids",
  "front-deltoids",
  "abs",
  "obliques",
  "adductor",
  "abductors",
  "hamstring",
  "quadriceps",
  "calves",
  "gluteal",
  "head",
  "neck",
  "knees",
  "left-soleus",
  "right-soleus",
] as const;

export type Muscolo = (typeof MUSCOLI)[number];

const INSIEME = new Set<string>(MUSCOLI);

export function muscoloValido(v: string): v is Muscolo {
  return INSIEME.has(v);
}

/** Come si chiamano in italiano, per le etichette sotto la figura. */
export const NOME_MUSCOLO: Record<Muscolo, string> = {
  trapezius: "Trapezio",
  "upper-back": "Dorsali e alto schiena",
  "lower-back": "Lombari",
  chest: "Pettorali",
  biceps: "Bicipiti",
  triceps: "Tricipiti",
  forearm: "Avambracci",
  "back-deltoids": "Deltoidi posteriori",
  "front-deltoids": "Deltoidi anteriori",
  abs: "Addominali",
  obliques: "Obliqui",
  adductor: "Adduttori",
  abductors: "Abduttori",
  hamstring: "Femorali",
  quadriceps: "Quadricipiti",
  calves: "Polpacci",
  gluteal: "Glutei",
  head: "Testa",
  neck: "Collo",
  knees: "Ginocchia",
  "left-soleus": "Soleo sinistro",
  "right-soleus": "Soleo destro",
};

/**
 * Da nome libero a gruppo disegnabile.
 *
 * Le fonti dati non usano un vocabolario controllato: lo stesso muscolo compare
 * come "abs", "abdominals" o "core", e il deltoide come "delts", "deltoids" o
 * "shoulders". Qui si normalizza una volta sola. Le voci anatomiche (erector
 * spinae, teres minor, vastus medialis...) vengono da body-highlighter; quelle
 * colloquiali sono state aggiunte misurando i termini realmente presenti nel
 * catalogo ExerciseDB.
 *
 * Le chiavi vanno scritte in minuscolo: `normalizzaMuscolo` abbassa e ripulisce
 * prima di cercare.
 */
const ALIAS: Record<string, Muscolo> = {
  // --- schiena alta / dorsali
  "upper trapezius": "trapezius",
  traps: "trapezius",
  rhomboids: "upper-back",
  "levator scapulae": "upper-back",
  "upper back": "upper-back",
  back: "upper-back",
  lats: "upper-back",
  "latissimus dorsi": "upper-back",

  // --- schiena bassa
  "erector spinae": "lower-back",
  "lower back": "lower-back",
  spine: "lower-back",

  // --- petto
  "pectoralis major": "chest",
  pectorals: "chest",
  "upper chest": "chest",

  // --- core
  "rectus abdominis": "abs",
  "transverse abdominis": "abs",
  "serratus anterior": "abs",
  abdominals: "abs",
  core: "abs",
  "lower abs": "abs",

  // --- spalle
  "anterior deltoids": "front-deltoids",
  "medial deltoids": "front-deltoids",
  "lateral deltoids": "front-deltoids",
  delts: "front-deltoids",
  deltoids: "front-deltoids",
  shoulders: "front-deltoids",
  "posterior deltoids": "back-deltoids",
  "rear deltoids": "back-deltoids",
  infraspinatus: "back-deltoids",
  "teres minor": "back-deltoids",
  "teres major": "back-deltoids",
  supraspinatus: "back-deltoids",
  subscapularis: "back-deltoids",
  "rotator cuff": "back-deltoids",

  // --- braccia
  "biceps brachii": "biceps",
  brachialis: "biceps",
  brachioradialis: "biceps",
  "triceps brachii": "triceps",
  "flexor carpi radialis": "forearm",
  anconeus: "forearm",
  forearms: "forearm",
  wrists: "forearm",
  "wrist flexors": "forearm",
  "wrist extensors": "forearm",
  "grip muscles": "forearm",
  hands: "forearm",

  // --- bacino e gambe
  "gluteus maximus": "gluteal",
  "gluteus medius": "gluteal",
  "gluteus minimus": "gluteal",
  glutes: "gluteal",
  "rectus femoris": "quadriceps",
  "quadriceps femoris": "quadriceps",
  "vastus medialis": "quadriceps",
  quads: "quadriceps",
  "hip flexors": "quadriceps",
  "biceps femoris": "hamstring",
  hamstrings: "hamstring",
  "adductor magnus": "adductor",
  adductors: "adductor",
  "inner thighs": "adductor",
  groin: "adductor",
  "tensor fasciae latae": "abductors",

  // --- polpacci e piedi
  gastrocnemius: "calves",
  soleus: "calves",
  "tibialis anterior": "calves",
  "tibialis posterior": "calves",
  "extensor hallucis longus": "calves",
  "extensor digitorum longus": "calves",
  shins: "calves",
  ankles: "calves",
  "ankle stabilizers": "calves",
  feet: "calves",

  // --- collo
  sternocleidomastoid: "neck",
};

/**
 * Nomi che non sono muscoli e che quindi non illuminano niente: vanno scartati
 * in silenzio, non trattati come errore. ExerciseDB marca il cardio cosi'.
 */
const NON_MUSCOLI = new Set(["cardiovascular system", "cardio"]);

/**
 * Traduce un nome libero nel gruppo da illuminare, o null se non corrisponde a
 * nulla di disegnabile.
 */
export function normalizzaMuscolo(nome: string): Muscolo | null {
  const pulito = nome.trim().toLowerCase().replace(/\s+/g, " ");
  if (!pulito || NON_MUSCOLI.has(pulito)) return null;
  if (muscoloValido(pulito)) return pulito;
  if (ALIAS[pulito]) return ALIAS[pulito];
  // Ultimo tentativo sul singolare/plurale ("glute" -> "glutes").
  const senzaS = pulito.replace(/s$/, "");
  if (muscoloValido(senzaS)) return senzaS;
  return ALIAS[senzaS] ?? ALIAS[`${pulito}s`] ?? null;
}

/** Normalizza un elenco, togliendo i doppioni e ciò che non si disegna. */
export function normalizzaMuscoli(nomi: string[]): Muscolo[] {
  const out: Muscolo[] = [];
  for (const n of nomi) {
    const m = normalizzaMuscolo(n);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}
