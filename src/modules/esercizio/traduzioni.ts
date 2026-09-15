/**
 * Dizionario italiano → inglese per cercare nel catalogo.
 *
 * Il catalogo (ExerciseDB) ha i nomi solo in inglese, ma chi cerca scrive
 * "panca piana", non "bench press". Qui non si traducono i nomi da mostrare —
 * tradurne 1500 parola per parola darebbe italiano storto, perché cambia anche
 * l'ordine ("barbell incline bench press" è "panca inclinata con bilanciere",
 * non "bilanciere inclinata panca pressa"). Si traduce solo **quello che si
 * digita**, per farlo arrivare alle voci giuste.
 *
 * Una voce può avere più corrispondenti inglesi, e più parole italiane possono
 * puntare allo stesso termine: basta che una delle due strade porti al nome.
 *
 * Copre i termini che compaiono davvero nel catalogo: le 200 parole più
 * frequenti coprono il 90% delle occorrenze nei 1500 nomi.
 */
export const DA_ITALIANO: Record<string, string[]> = {
  // --- attrezzi
  manubri: ["dumbbell"],
  manubrio: ["dumbbell"],
  bilanciere: ["barbell"],
  bilancere: ["barbell"],
  cavi: ["cable"],
  cavo: ["cable"],
  elastico: ["band"],
  elastici: ["band"],
  kettlebell: ["kettlebell"],
  macchina: ["machine", "lever"],
  macchine: ["machine", "lever"],
  multipower: ["smith"],
  palla: ["ball"],
  fitball: ["stability ball"],
  corda: ["rope"],
  panca: ["bench"],
  sbarra: ["bar", "pull-up"],
  parallele: ["dip", "parallel"],
  ruota: ["wheel"],
  slitta: ["sled"],
  cyclette: ["bike"],
  ellittica: ["elliptical"],
  tapis: ["treadmill"],
  "corpo libero": ["body weight"],

  // --- movimenti
  distensioni: ["press"],
  distensione: ["press"],
  spinte: ["press", "push"],
  spinta: ["press", "push"],
  pressa: ["press"],
  curl: ["curl"],
  rematore: ["row"],
  remata: ["row"],
  tirata: ["pull", "row"],
  trazioni: ["pull-up", "pullup", "chin-up"],
  trazione: ["pull-up", "pullup"],
  flessioni: ["push-up", "pushup"],
  piegamenti: ["push-up", "pushup"],
  alzate: ["raise"],
  alzata: ["raise"],
  sollevamento: ["raise", "lift"],
  croci: ["fly", "flye"],
  croce: ["fly", "flye"],
  aperture: ["fly", "flye"],
  estensioni: ["extension"],
  estensione: ["extension"],
  flessione: ["curl", "flexion"],
  stacco: ["deadlift"],
  stacchi: ["deadlift"],
  squat: ["squat"],
  accosciata: ["squat"],
  affondo: ["lunge"],
  affondi: ["lunge"],
  crunch: ["crunch"],
  plank: ["plank"],
  dip: ["dip"],
  scrollate: ["shrug"],
  scrollata: ["shrug"],
  torsione: ["twist", "rotation"],
  rotazione: ["rotation"],
  slancio: ["swing", "clean"],
  slanci: ["swing"],
  strappo: ["snatch"],
  spinte_sopra: ["overhead press"],
  allungamento: ["stretch"],
  stretching: ["stretch"],
  salto: ["jump"],
  salti: ["jump"],
  camminata: ["walk"],
  corsa: ["run"],

  // --- muscoli
  petto: ["chest", "pectoral"],
  pettorali: ["chest", "pectoral"],
  pettorale: ["chest", "pectoral"],
  bicipiti: ["biceps"],
  bicipite: ["biceps"],
  tricipiti: ["triceps"],
  tricipite: ["triceps"],
  spalle: ["shoulder", "delt"],
  spalla: ["shoulder", "delt"],
  deltoidi: ["delt", "deltoid"],
  deltoide: ["delt", "deltoid"],
  dorsali: ["lat", "back"],
  dorsale: ["lat", "back"],
  schiena: ["back"],
  trapezio: ["trap"],
  trapezi: ["trap"],
  addominali: ["abs", "abdominal"],
  addome: ["abs", "abdominal"],
  obliqui: ["oblique"],
  lombari: ["lower back"],
  glutei: ["glute"],
  gluteo: ["glute"],
  quadricipiti: ["quad"],
  quadricipite: ["quad"],
  femorali: ["hamstring"],
  femorale: ["hamstring"],
  polpacci: ["calf", "calve"],
  polpaccio: ["calf", "calve"],
  avambracci: ["forearm"],
  avambraccio: ["forearm"],
  adduttori: ["adductor"],
  abduttori: ["abductor"],
  collo: ["neck"],
  gamba: ["leg"],
  gambe: ["leg"],
  braccio: ["arm"],
  braccia: ["arm"],
  coscia: ["thigh"],
  cosce: ["thigh"],
  anca: ["hip"],
  anche: ["hip"],
  polso: ["wrist"],
  polsi: ["wrist"],
  caviglia: ["ankle"],

  // --- posizioni e varianti
  seduto: ["seated"],
  seduta: ["seated"],
  "in piedi": ["standing"],
  eretto: ["standing"],
  sdraiato: ["lying"],
  disteso: ["lying"],
  supino: ["lying", "supine"],
  prono: ["prone"],
  inclinata: ["incline"],
  inclinato: ["incline"],
  declinata: ["decline"],
  declinato: ["decline"],
  piana: ["flat", "bench"],
  piano: ["flat"],
  laterale: ["lateral", "side"],
  laterali: ["lateral", "side"],
  frontale: ["front"],
  anteriore: ["front", "anterior"],
  posteriore: ["rear", "back"],
  inverso: ["reverse"],
  inversa: ["reverse"],
  rovesciata: ["reverse"],
  stretta: ["close"],
  stretto: ["close"],
  larga: ["wide"],
  largo: ["wide"],
  presa: ["grip"],
  singolo: ["one", "single"],
  singola: ["one", "single"],
  alternato: ["alternating", "alternate"],
  alternati: ["alternating", "alternate"],
  concentrato: ["concentration"],
  martello: ["hammer"],
  bulgaro: ["bulgarian"],
  romeno: ["romanian"],
  rumeno: ["romanian"],
  sumo: ["sumo"],
  "sopra la testa": ["overhead"],
  dietro: ["behind"],
  gomito: ["elbow"],
  ginocchio: ["knee"],
  ginocchia: ["knee"],
};

/**
 * Espande una parola digitata nelle sue possibili forme inglesi, tenendo
 * sempre anche l'originale: chi scrive "bench" o "squat" dev'essere servito
 * come chi scrive "panca".
 */
export function espandi(parola: string): string[] {
  const p = parola.toLowerCase().trim();
  if (!p) return [];
  const fuori = new Set<string>([p]);
  for (const t of DA_ITALIANO[p] ?? []) fuori.add(t);
  // Plurali e singolari comuni: "manubri" e "manubrio" ci sono entrambi nel
  // dizionario, ma per il resto vale la pena provare anche senza la vocale
  // finale, così "pettorali" trova anche una voce scritta "pettorale".
  const senzaFinale = p.replace(/[aeio]$/, "");
  for (const [k, v] of Object.entries(DA_ITALIANO)) {
    if (k.startsWith(senzaFinale) && senzaFinale.length >= 4) {
      for (const t of v) fuori.add(t);
    }
  }
  return [...fuori];
}
