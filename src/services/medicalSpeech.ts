import { MEDICAL_DICTIONARY } from '../data/medicalDictionary';

export type MedicalSpeechCorrection = { original: string; replacement: string };
export type SpeechResultLike = { isFinal: boolean; length: number; [index: number]: { transcript: string } };

// Vocabulaire médical utilisé pour départager les alternatives proposées
// par le moteur vocal du navigateur. Il ne remplace pas une validation humaine.
// Le vocabulaire de reconnaissance provient du référentiel médical structuré.
// Les synonymes sont également pris en compte pour départager les alternatives vocales.
const medicalSpeechTerms = MEDICAL_DICTIONARY.flatMap(entry => [entry.term, ...(entry.synonyms || [])]);
// Ensemble pré-normalisé pour les garde-fous de négation ; aucune correction automatique.
const medicalSpeechNormalizedTerms = new Set(medicalSpeechTerms.map(normalizeSpeechCandidate));

export function normalizeSpeechCandidate(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

// Corrections proposées uniquement pour les erreurs réellement observées pendant les tests.
// Elles restent soumises à la confirmation du médecin : aucune substitution automatique.
const observedMedicalSpeechCorrections: Record<string, string> = {
  exuda: 'exsudat',
  exudar: 'exsudat',
  exodat: 'exsudat',
  exida: 'exsudat',
  annexeda: 'exsudat',
  annexida: 'exsudat',
  audenophagie: 'odynophagie',
  disney: 'dyspnée',
  display: 'dyspnée',
  audiophagie: 'odynophagie',
  audinophagie: 'odynophagie',
  inaudipnee: 'dyspnée',
  athenopathie: 'adénopathie',
};



function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

// Clé phonétique française simplifiée : rapproche certaines graphies
// produites par la dictée sans prétendre remplacer un moteur médical spécialisé.
function frenchPhoneticKey(value: string): string {
  return normalizeSpeechCandidate(value)
    .replace(/œ/g, 'oe')
    .replace(/eaux?/g, 'o')
    .replace(/ph/g, 'f')
    .replace(/au/g, 'o')
    .replace(/ou/g, 'u')
    .replace(/oy/g, 'oi')
    .replace(/y/g, 'i')
    .replace(/qu/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c(?=[aou])/g, 'k')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/ch/g, 'sh')
    .replace(/tion/g, 'sion')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/(e|es|s|x)$/g, '');
}

function findClosestMedicalTerm(word: string): string | null {
  const normalizedWord = normalizeSpeechCandidate(word);
  if (normalizedWord.length < 5) return null;
  // Une graphie ambiguë entre un adjectif anatomique et un diagnostic
  // ne doit jamais être rapprochée automatiquement de « amygdalite ».
  // La dictée brute reste visible et doit être clarifiée par le médecin.
  if (['amygdania', 'amygdalia'].includes(normalizedWord)) return null;
  // Les mots ordinaires et les adjectifs anatomiques ne doivent pas devenir
  // un diagnostic par simple ressemblance phonétique.
  if (['amical', 'amicale', 'amicales', 'amicaux', 'amygdalien', 'amygdalienne', 'amygdaliens', 'amygdaliennes'].includes(normalizedWord)) return null;
  // Un terme médical déjà reconnu est correct : ne jamais le remplacer par
  // un autre terme voisin (ex. odynophagie/dysphagie) ni changer son nombre.
  if (medicalSpeechTerms.some(term => normalizeSpeechCandidate(term) === normalizedWord)) return null;
  // Reconnaître aussi les pluriels réguliers des termes du dictionnaire.
  if (normalizedWord.endsWith('s') && medicalSpeechTerms.some(term =>
    normalizeSpeechCandidate(term) === normalizedWord.slice(0, -1))) return null;
  // Ne pas proposer un autre diagnostic à partir d'un adjectif anatomique.
  // Exemple : « amygdalien » ne doit pas devenir « amygdalite ».
  if (normalizedWord === 'amygdalien' || normalizedWord === 'amygdalienne') return null;

  let bestTerm = '';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const term of medicalSpeechTerms) {
    // Les expressions composées sont évaluées plus tard avec le contexte.
    if (term.includes(' ')) continue;
    const normalizedTerm = normalizeSpeechCandidate(term);
    if (normalizedTerm.length < 5 || normalizedTerm === normalizedWord) continue;
    const distance = levenshteinDistance(normalizedWord, normalizedTerm);
    const phoneticDistance = levenshteinDistance(
      frenchPhoneticKey(word),
      frenchPhoneticKey(term),
    );
    const allowedDistance = normalizedWord.length >= 10 ? 3 : normalizedWord.length >= 7 ? 2 : 1;
    const phoneticLimit = normalizedWord.length >= 10 ? 3 : normalizedWord.length >= 7 ? 2 : 1;
    // Une proximité phonétique peut rattraper une graphie très déformée,
    // mais la suggestion reste soumise à validation par le médecin.
    const isClose = distance <= allowedDistance || phoneticDistance <= phoneticLimit;
    const combinedScore = Math.min(distance, phoneticDistance + 0.25);
    if (isClose && combinedScore < bestDistance) {
      bestDistance = combinedScore;
      bestTerm = term;
    }
  }
  return bestTerm || null;
}

function isLikelyExsudatContext(value: string): boolean {
  const normalizedText = normalizeSpeechCandidate(value);
  const hasClinicalCue = /\b(presence|depot|depots|plaque|plaques|enduit|examen)\b/.test(normalizedText);
  const hasAnatomicalSite = /\b(amygdale|amygdales|tonsille|tonsilles|pharynx|gorge)\b/.test(normalizedText);
  const hasLocationLink = /\b(sur|dans|au niveau de|au niveau des|au niveau du)\b/.test(normalizedText);
  return hasClinicalCue && hasAnatomicalSite && hasLocationLink;
}

// « excellent » est aussi un mot français courant. Ne suggérer « exsudat »
// que lorsqu'il occupe l'emplacement d'un nom dans UNE phrase ORL précise.
// Une autre phrase sur les amygdales ne doit pas contaminer un « excellent »
// décrivant l'état général, un bilan ou une conversation ordinaire.
function hasExsudatContextAt(value: string, index: number, length: number): boolean {
  const before = value.slice(0, index);
  const previousBoundary = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf('!'),
    before.lastIndexOf('?'),
    before.lastIndexOf(';'),
    before.lastIndexOf('\n'),
  );
  const following = value.slice(index + length);
  const nextBoundaryOffset = following.search(/[.!?;\n]/u);
  const nextBoundary = nextBoundaryOffset === -1
    ? value.length
    : index + length + nextBoundaryOffset;
  const clause = value.slice(previousBoundary + 1, nextBoundary);
  if (!isLikelyExsudatContext(clause)) return false;

  // Exiger « excellent sur les amygdales » (ou une localisation analogue)
  // immédiatement après le terme. « excellent résultat sur ... » n'en est pas un.
  const local = normalizeSpeechCandidate(value.slice(index + length, Math.min(nextBoundary, index + length + 65)));
  return /^\s*(?:sur|dans|au niveau (?:de|des|du))\b(?:\s+[\p{L}-]+){0,3}\s+(?:amygdales?|tonsilles?|pharynx|gorge)\b/u.test(local);
}

// Certains moteurs vocaux découpent « exsudat » en « ex soudain ».
// Une suggestion est affichée, jamais appliquée sans confirmation du médecin.
const fragmentedMedicalSpeechCorrections: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bex\s+soudain\b/giu, replacement: 'exsudat' },
];

export function findMedicalSpeechCorrections(value: string): MedicalSpeechCorrection[] {
  const found = new Map<string, MedicalSpeechCorrection>();
  // Corrections contextuelles : l'expression complète, jamais un diagnostic
  // inféré d'un mot isolé. Chaque suggestion exige un clic du médecin.
  const contextualPhrases: Array<{ pattern: RegExp; replacement: string }> = [
    {
      pattern: /\b(?:exc[eé]dent|alexuda)\s+(?:amygdalien|amygdalia)\b/giu,
      replacement: 'exsudat amygdalien',
    },
    {
      pattern: /\bdes\s+ad[eé]nopathie\s+cervicales\s+bilat[eé]rale\b/giu,
      replacement: 'des adénopathies cervicales bilatérales',
    },
    {
      pattern: /\bdes\s+ad[eé]nopathies\s+cervicales\s+bilat[eé]rale\b/giu,
      replacement: 'des adénopathies cervicales bilatérales',
    },
  ];
  for (const { pattern, replacement } of contextualPhrases) {
    for (const match of value.matchAll(pattern)) {
      const original = match[0];
      found.set(normalizeSpeechCandidate(original), { original, replacement });
    }
  }

  for (const { pattern, replacement } of fragmentedMedicalSpeechCorrections) {
    for (const match of value.matchAll(pattern)) {
      const original = match[0];
      // Éviter de transformer l'expression française « ex soudain » hors
      // contexte ORL : exiger un site anatomique adjacent.
      const nearby = normalizeSpeechCandidate(value.slice(match.index ?? 0, (match.index ?? 0) + original.length + 35));
      if (!/\b(amygdalien|amygdalienne|amygdales|tonsilles|pharynge|pharynx)\b/u.test(nearby)) continue;
      if (!found.has(normalizeSpeechCandidate(original))) {
        found.set(normalizeSpeechCandidate(original), { original, replacement });
      }
    }
  }
  for (const match of value.matchAll(/[\p{L}]+/gu)) {
    const original = match[0];
    const normalized = normalizeSpeechCandidate(original);
    // « excellent » est un mot français valide : ne le rapprocher d'« exsudat »
    // que dans une phrase ORL décrivant un dépôt ou une plaque sur une zone compatible.
    const contextualReplacement = normalized === 'excellent' && hasExsudatContextAt(value, match.index, original.length)
      ? 'exsudat'
      : null;
    const explicitReplacement = observedMedicalSpeechCorrections[normalized];
    const replacement = contextualReplacement
      || explicitReplacement
      || (normalized === 'excellent' ? null : findClosestMedicalTerm(original));
    if (replacement && normalized !== normalizeSpeechCandidate(replacement)) {
      if (!found.has(normalized)) found.set(normalized, { original, replacement });
    }
  }
  return Array.from(found.values());
}


// Les valeurs numériques dictées sont sensibles : une confusion 97/87 %
// ne peut pas être résolue par un dictionnaire ou une correction phonétique.
export function hasDictatedClinicalNumber(value: string): boolean {
  return /\b\d+(?:[,.]\d+)?\s*(?:%|pour\s*cent|degr[eé]s?|°|mmhg|g\s*\/\s*l|mg\s*\/\s*dl|bpm)/iu.test(value)
    || /\b(?:saturation|spo[2₂]|glyc[eé]mie|pression|tension|fr[eé]quence\s+cardiaque|temp[eé]rature)(?=\s|:)[^.!?]{0,50}\d/iu.test(value);
}

export function applyMedicalSpeechCorrection(value: string, correction: MedicalSpeechCorrection): string {
  const target = normalizeSpeechCandidate(correction.original);
  // Les suggestions portant sur plusieurs mots doivent remplacer la séquence
  // complète, sans modifier des occurrences isolées (« ex », « soudain »).
  if (/\s/u.test(correction.original)) {
    // Remplacer uniquement la séquence complète approuvée par le médecin.
    const escaped = correction.original.split(/\s+/u).join('\\s+');
    const phrasePattern = new RegExp('(?<![\\p{L}])' + escaped + '(?![\\p{L}])', 'giu');
    return value.replace(phrasePattern, (phrase, offset: number) => {
      if (normalizeSpeechCandidate(phrase).replace(/\s+/g, ' ') !== target.replace(/\s+/g, ' ')) return phrase;
      const before = value.slice(0, offset).trimEnd();
      const startsSentence = before.length === 0 || /[.!?]\s*$/.test(before);
      return startsSentence && phrase[0] === phrase[0].toLocaleUpperCase('fr')
        ? correction.replacement.charAt(0).toLocaleUpperCase('fr') + correction.replacement.slice(1)
        : correction.replacement;
    });
  }
  return value.replace(/[\p{L}]+/gu, (word, offset: number) => {
    if (normalizeSpeechCandidate(word) !== target) return word;
    // La suggestion « excellent » concerne uniquement l'occurrence ORL.
    // Un même compte rendu peut également contenir « excellent état général ».
    if (target === 'excellent' && correction.replacement === 'exsudat'
      && !hasExsudatContextAt(value, offset, word.length)) return word;
    // Une majuscule de reconnaissance (« Disney ») ne doit pas contaminer
    // un terme médical au milieu d'une phrase. La conserver en début de phrase.
    const before = value.slice(0, offset).trimEnd();
    const startsSentence = before.length === 0 || /[.!?]\s*$/.test(before);
    return startsSentence && word[0] === word[0].toLocaleUpperCase('fr')
      ? correction.replacement.charAt(0).toLocaleUpperCase('fr') + correction.replacement.slice(1)
      : correction.replacement;
  });
}

// Ne jamais changer automatiquement une valeur numérique ou une négation
// entre deux hypothèses de reconnaissance vocale, même si l'autre contient
// davantage de termes médicaux. Le médecin conserve la transcription initiale.
function criticalSpeechTokens(value: string): string {
  const normalized = normalizeSpeechCandidate(value);
  const numbers = Array.from(normalized.matchAll(/\b\d+(?:[,.]\d+)?\b/gu), match => match[0].replace(',', '.'));
  const negations = Array.from(normalized.matchAll(/\b(?:pas|sans|aucun|aucune|absence|nie|negatif|negative|non|jamais|ni)\b/gu), match => match[0]);
  // Même liste de négations dans une autre position peut inverser le sens.
  const negationWordPositions = Array.from(normalized.matchAll(/[\p{L}\p{N}]+/gu))
    .flatMap((match, index) => /^(?:pas|sans|aucun|aucune|absence|nie|negatif|negative|non|jamais|ni)$/u.test(match[0]) ? [index] : []);
  // Même valeur chiffrée avec une unité différente = risque de dose erronée.
  const units = Array.from(normalized.matchAll(/\b(?:mg|mcg|µg|ug|g|kg|ml|l|mmhg|bpm)\b|%/gu), match => match[0]);
  // La latéralité et la polarité d'un examen ne doivent pas être changées
  // par le classement automatique des hypothèses du navigateur.
  const laterality = Array.from(normalized.matchAll(/\b(?:droit|droite|droits|droites|gauche|gauches|bilateral|bilaterale|bilateraux|bilaterales|unilateral|unilaterale|unilateraux|unilaterales)\b/gu), match => match[0]);
  const polarity = Array.from(normalized.matchAll(/\b(?:positif|positive|positifs|positives|negatifs|negatives)\b/gu), match => match[0]);
  // Temporalité et allergies : ne pas inverser aigu/chronique,
  // ancien/récent ou présence/absence d'allergie lors du choix vocal.
  const chronology = Array.from(normalized.matchAll(/\b(?:aigu|aigue|aigus|aigues|chronique|chroniques|ancien|ancienne|anciens|anciennes|recent|recente|recents|recentes)\b/gu), match => match[0]);
  const allergy = Array.from(normalized.matchAll(/\b(?:allergie|allergies|allergique|allergiques|anaphylaxie)\b/gu), match => match[0]);
  // La fréquence et le moment d'administration sont des informations
  // thérapeutiques critiques, indépendamment du nombre dicté.
  const administration = Array.from(normalized.matchAll(/\b(?:matin|midi|soir|nuit|quotidien|quotidienne|quotidiens|quotidiennes|hebdomadaire|hebdomadaires|mensuel|mensuelle|mensuels|mensuelles|unique|uniques|fois|jour|jours|semaine|semaines|heure|heures)\b/gu), match => match[0]);
  // Voie d'administration : une confusion orale/IV/IM/SC peut être dangereuse.
  const routes = Array.from(normalized.matchAll(/\b(?:orale|oral|orales|oraux|intraveineuse|intraveineux|intramusculaire|intramusculaires|souscutanee|souscutanees|cutanee|cutanees|rectale|rectales|sublinguale|sublinguales|inhalation|inhalations|iv|im|sc)\b/gu), match => match[0]);
  // Grossesse et antécédents : ne pas ajouter, retirer ou remplacer
  // ces éléments dans une transcription alternative sélectionnée.
  const obstetrics = Array.from(normalized.matchAll(/\b(?:enceinte|grossesse|grossesses|gestante|gestantes|allaitement|allaite|menopause|menopausee|menopausees)\b/gu), match => match[0]);
  const history = Array.from(normalized.matchAll(/\b(?:antecedent|antecedents|chirurgie|chirurgical|chirurgicale|chirurgicaux|diabete|diabetique|hypertension|hta|asthme|epilepsie|infarctus|avc)\b/gu), match => match[0]);
  return JSON.stringify({ numbers, negations, negationWordPositions, units, laterality, polarity, chronology, allergy, administration, routes, obstetrics, history });
}

// Conserver tous les termes médicaux déjà reconnus dans la première
// hypothèse vocale. Une alternative mieux notée ne doit pas effacer un
// symptôme ou remplacer un diagnostic déjà lisible.
// La vérification inclut aussi les expressions composées du dictionnaire.
const medicalSpeechProtectedPatterns = Array.from(medicalSpeechNormalizedTerms, term => {
  const escaped = term.replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^\\p{L}])' + escaped + '(?=$|[^\\p{L}])', 'u');
});

function preservesRecognizedMedicalTerms(initial: string, alternative: string): boolean {
  const original = normalizeSpeechCandidate(initial);
  const proposed = normalizeSpeechCandidate(alternative);
  return medicalSpeechProtectedPatterns.every(pattern =>
    !pattern.test(original) || pattern.test(proposed)
  );
}

// Conserver la cible médicale COMPLETE après une négation.
// La comparaison d'un seul mot (« insuffisance ») ne distingue pas
// « insuffisance cardiaque » d'« insuffisance respiratoire ».
const medicalSpeechNegationTerms = Array.from(medicalSpeechNormalizedTerms, term => ({
  term,
  words: term.match(/[\p{L}\p{N}]+/gu) ?? [],
}))
  .filter(entry => entry.words.length > 0)
  .sort((left, right) => right.words.length - left.words.length);

// Si le médecin a dicté un terme connu après une négation, une hypothèse
// alternative ne doit pas changer cette cible. Les premiers mots inconnus
// (« disney ») peuvent en revanche être améliorés par le moteur vocal.
function negatedMedicalTargets(value: string): Array<string | null> {
  const words = normalizeSpeechCandidate(value).match(/[\p{L}\p{N}]+/gu) ?? [];
  const isNegation = /^(?:pas|sans|aucun|aucune|absence|nie|negatif|negative|non|jamais|ni)$/u;
  const isLinker = /^(?:de|du|des|d|le|la|les|un|une|l|au|aux)$/u;
  return words.flatMap((word, index) => {
    if (!isNegation.test(word)) return [];
    const following = words.slice(index + 1, index + 12);
    const firstClinicalWord = following.findIndex(token => !isLinker.test(token));
    if (firstClinicalWord === -1) return [null];
    const candidate = following.slice(firstClinicalWord);
    const longestKnownTerm = medicalSpeechNegationTerms.find(entry =>
      entry.words.every((termWord, offset) => candidate[offset] === termWord)
    );
    return [longestKnownTerm?.term ?? null];
  });
}

export function chooseMedicalSpeechAlternative(result: SpeechResultLike): string {
  const candidates = Array.from({ length: result.length }, (_, index) =>
    (result[index]?.transcript || '').trim()
  ).filter(Boolean);

  if (candidates.length <= 1) return candidates[0] || '';

  const scored = candidates.map((transcript, index) => {
    const normalized = normalizeSpeechCandidate(transcript);
    const score = medicalSpeechTerms.reduce((total, term) => {
      const normalizedTerm = normalizeSpeechCandidate(term);
      // Évite les faux positifs sur des fragments de mots (ex. « mal » dans « normal »).
      const escapedTerm = normalizedTerm.replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&');
      const exactTerm = new RegExp(`(^|[^\\p{L}])${escapedTerm}(?=$|[^\\p{L}])`, 'u');
      return total + (exactTerm.test(normalized) ? 3 : 0);
    }, 0);
    // Favoriser une expression ORL complète uniquement lorsqu'elle est
    // effectivement proposée par Chrome, sans fabriquer de mots.
    // Ce bonus ne s'applique pas à des termes isolés ni à d'autres contextes.
    const orlPhraseBonus = /\bexsudat\s+amygdalien(?:ne|s|nes)?\b/u.test(normalized) ? 7 : 0;
    return { transcript, score: score + orlPhraseBonus, index };
  });

  // Ne choisit une alternative que si elle contient un terme médical reconnu
  // que la première proposition ne contient pas. En cas d'égalité, garde l'original.
  const initialCriticalTokens = criticalSpeechTokens(candidates[0]);
  const initialNegationTargets = negatedMedicalTargets(candidates[0]);
  const safeCandidates = scored.filter(candidate => {
    if (criticalSpeechTokens(candidate.transcript) !== initialCriticalTokens) return false;
    if (!preservesRecognizedMedicalTerms(candidates[0], candidate.transcript)) return false;
    const proposedTargets = negatedMedicalTargets(candidate.transcript);
    // Ne jamais déplacer un symptôme connu hors d'une négation :
    // « pas de toux ... » ne doit pas devenir « pas de display ... toux ».
    // Une cible inconnue en alternative n'est pas une preuve d'équivalence.
    // Si la première cible était inconnue, une hypothèse corrigée reste possible.
    return !initialNegationTargets.some((target, index) =>
      target !== null && proposedTargets[index] !== target
    );
  });
  const best = safeCandidates.reduce((current, candidate) =>
    candidate.score > current.score ? candidate : current
  );
  return best.score > scored[0].score ? best.transcript : candidates[0];
}

