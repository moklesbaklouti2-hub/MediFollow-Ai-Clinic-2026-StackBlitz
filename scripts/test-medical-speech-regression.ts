import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findMedicalSpeechCorrections, applyMedicalSpeechCorrection, chooseMedicalSpeechAlternative, hasDictatedClinicalNumber, type MedicalSpeechCorrection } from '../src/services/medicalSpeech';

// Tests directs du module réellement utilisé par HELIOS, sans navigateur.
const runtime = { findMedicalSpeechCorrections, applyMedicalSpeechCorrection, chooseMedicalSpeechAlternative, hasDictatedClinicalNumber };
type Correction = MedicalSpeechCorrection;

let assertions = 0;
function suggestions(text: string): Correction[] {
  return runtime.findMedicalSpeechCorrections(text);
}
function expectSuggestion(text: string, original: string, replacement: string) {
  const correction = suggestions(text).find(item => item.original.toLocaleLowerCase('fr') === original.toLocaleLowerCase('fr') && item.replacement === replacement);
  assert.ok(correction, 'Suggestion manquante : ' + original + ' → ' + replacement + ' dans ' + text);
  assertions++;
  const actual = runtime.applyMedicalSpeechCorrection(text, correction);
  assert.ok(actual.includes(replacement), 'Le clic simulé ne remplace pas la séquence : ' + text + ' => ' + actual);
  assertions++;
  return actual;
}
function expectNoReplacement(text: string, replacement: string) {
  assert.ok(!suggestions(text).some(item => item.replacement === replacement), 'Suggestion dangereuse : ' + text + ' → ' + replacement);
  assertions++;
}
expectSuggestion('présence d’un excédent amygdalien', 'excédent amygdalien', 'exsudat amygdalien');
expectSuggestion('présence d’un excédent amygdalia', 'excédent amygdalia', 'exsudat amygdalien');
expectSuggestion('présence d’un alexuda amygdalien', 'alexuda amygdalien', 'exsudat amygdalien');
expectSuggestion('présence d’un ex soudain amygdalien', 'ex soudain', 'exsudat');
expectSuggestion('des adénopathie cervicales bilatérale', 'des adénopathie cervicales bilatérale', 'des adénopathies cervicales bilatérales');
expectSuggestion('des adénopathies cervicales bilatérale', 'des adénopathies cervicales bilatérale', 'des adénopathies cervicales bilatérales');
expectSuggestion('le patient présente une display', 'display', 'dyspnée');
expectSuggestion('une annexida amygdalien', 'annexida', 'exsudat');

expectNoReplacement('un échange amical', 'amygdalite');
expectNoReplacement('présence d’un amygdania', 'amygdalite');
expectNoReplacement('présence d’une amygdalite', 'amygdalien');
expectNoReplacement('un excédent budgétaire', 'exsudat amygdalien');
expectNoReplacement('des adénopathies cervicales bilatérales', 'des adénopathies cervicales bilatérales');
expectNoReplacement('odynophagie', 'dysphagie');
expectNoReplacement('ex soudain départ', 'exsudat');
// Un mot ORL dans la phrase suivante ou éloigné du mot suspect
// ne constitue pas un indice suffisant de dictée « exsudat ».
expectNoReplacement('Ex soudain. Examen des amygdales.', 'exsudat');
expectNoReplacement('ex soudain accompagné de toux puis examen des amygdales.', 'exsudat');
expectSuggestion('Présence d’un ex soudain sur les amygdales.', 'ex soudain', 'exsudat');
const mixedFragment = 'Expression ex soudain rapportée. Présence d’un ex soudain amygdalien.';
const mixedFragmentSuggestion = suggestions(mixedFragment).find(item =>
  item.original === 'ex soudain' && item.replacement === 'exsudat'
);
assert.ok(mixedFragmentSuggestion, 'Occurrence ORL de ex soudain non repérée.');
assert.equal(runtime.applyMedicalSpeechCorrection(mixedFragment, mixedFragmentSuggestion!),
  'Expression ex soudain rapportée. Présence d’un exsudat amygdalien.');
assertions += 2;

// « excellent » ne doit pas être corrigé parce que la même dictée contient
// une autre phrase ORL. Seule l'occurrence clairement localisée est suggérée.
expectNoReplacement('Le résultat est excellent. Présence de plaques sur les amygdales.', 'exsudat');
expectNoReplacement('Examen excellent. Des plaques sont visibles sur les amygdales.', 'exsudat');
expectNoReplacement('Présence d’un excellent résultat sur les amygdales.', 'exsudat');
expectNoReplacement('Un excellent travail de rééducation.', 'exsudat');
const localizedExsudat = 'Le patient a un état excellent. Présence d’un excellent sur les amygdales.';
const localizedCorrection = suggestions(localizedExsudat).find(item => item.original === 'excellent' && item.replacement === 'exsudat');
assert.ok(localizedCorrection, 'La suggestion ORL localisée doit rester disponible');
const localizedResult = runtime.applyMedicalSpeechCorrection(localizedExsudat, localizedCorrection!);
assert.equal(localizedResult, 'Le patient a un état excellent. Présence d’un exsudat sur les amygdales.');
assertions += 2;
expectSuggestion('Présence d’un excellent au niveau des amygdales.', 'excellent', 'exsudat');
expectSuggestion('Présence d’un excellent dans la gorge.', 'excellent', 'exsudat');


const original = 'SpO₂ 87 %, température 38,5 degrés : absence de dyspnée';
const corrections = suggestions(original);
for (const correction of corrections) {
  const updated = runtime.applyMedicalSpeechCorrection(original, correction);
  assert.ok(updated.includes('87 %') && updated.includes('38,5') && updated.includes('absence'), 'Donnée clinique critique altérée');
  assertions++;
}
assert.equal(runtime.hasDictatedClinicalNumber(original), true);
assert.equal(runtime.hasDictatedClinicalNumber('SpO₂ 97 %'), true);
assert.equal(runtime.hasDictatedClinicalNumber('absence de dyspnée'), false);
assertions += 3;

const alternatives = {
  length: 2,
  0: { transcript: 'présence d’un excédent amygdalien' },
  1: { transcript: 'présence d’un exsudat amygdalien' },
};
assert.equal(runtime.chooseMedicalSpeechAlternative(alternatives), 'présence d’un exsudat amygdalien');
assertions++;

// La phrase ORL exacte doit bénéficier du bonus de classement, sans créer
// de diagnostic absent des alternatives fournies par le navigateur.
const orlAlternatives = {
  length: 2,
  0: { transcript: 'présence d’un exsudat' },
  1: { transcript: 'présence d’un exsudat amygdalien' },
};
assert.equal(runtime.chooseMedicalSpeechAlternative(orlAlternatives), 'présence d’un exsudat amygdalien');
assertions++;
const nonOrlAlternatives = {
  length: 2,
  0: { transcript: 'exsudat' },
  1: { transcript: 'exsudat amygdaliennement' },
};
assert.equal(runtime.chooseMedicalSpeechAlternative(nonOrlAlternatives), 'exsudat');
assertions++;
// Ne jamais préférer une alternative qui change une donnée clinique critique.
const unsafeAlternatives = [
  ['SpO₂ 87 % avec disney', 'SpO₂ 97 % avec dyspnée'],
  ['absence de disney', 'présence de dyspnée'],
  ['sans disney', 'avec dyspnée'],
  ['glycémie 1,2 g/L avec disney', 'glycémie 12 g/L avec dyspnée'],
  ['paracétamol 500 mg avec disney', 'paracétamol 500 g avec dyspnée'],
  ['solution 5 ml avec disney', 'solution 5 l avec dyspnée'],
  ['SpO₂ 97 % avec disney', 'SpO₂ 97 avec dyspnée'],
  ['jamais de disney', 'présence de dyspnée'],
  ['non disney', 'dyspnée'],
  ['ni toux ni disney', 'toux et dyspnée'],
  ['douleur thoracique droite et disney', 'douleur thoracique gauche et dyspnée'],
  ['adénopathies bilatérales avec disney', 'adénopathies unilatérales avec dyspnée'],
  ['test positif avec disney', 'test négatif avec dyspnée'],
  ['douleur aiguë avec disney', 'douleur chronique avec dyspnée'],
  ['symptôme ancien avec disney', 'symptôme récent avec dyspnée'],
  ['allergie et disney', 'dyspnée'],
  ['sans allergie avec disney', 'allergie avec dyspnée'],
  ['paracétamol 500 mg matin avec disney', 'paracétamol 500 mg soir avec dyspnée'],
  ['prise quotidienne avec disney', 'prise hebdomadaire avec dyspnée'],
  ['une fois par jour avec disney', 'une fois par semaine avec dyspnée'],
  ['dose unique avec disney', 'dose quotidienne avec dyspnée'],
  ['traitement oral avec disney', 'traitement intraveineux avec dyspnée'],
  ['injection intramusculaire avec disney', 'injection sous-cutanée avec dyspnée'],
  ['voie IV avec disney', 'voie IM avec dyspnée'],
  ['voie rectale avec disney', 'voie orale avec dyspnée'],
  ['patiente enceinte avec disney', 'patiente ménopausée avec dyspnée'],
  ['grossesse et disney', 'dyspnée'],
  ['antécédent de diabète avec disney', 'antécédent d’asthme avec dyspnée'],
  ['sans antécédent chirurgical avec disney', 'sans antécédent de diabète avec dyspnée'],
];
for (const [initial, unsafe] of unsafeAlternatives) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: unsafe },
  }), initial, 'Alternative clinique dangereuse retenue : ' + unsafe);
  assertions++;
}
assert.equal(runtime.chooseMedicalSpeechAlternative({
  length: 2,
  0: { transcript: 'SpO₂ 97 % avec disney' },
  1: { transcript: 'SpO₂ 97 % avec dyspnée' },
}), 'SpO₂ 97 % avec dyspnée');
assertions++;

// Deux doses peuvent conserver les mêmes valeurs, unités et molécules,
// mais être attribuées au mauvais traitement par une alternative vocale.
const swappedMedicationDoses = [
  [
    'paracétamol 500 mg et amoxicilline 1000 mg avec disney',
    'amoxicilline 500 mg et paracétamol 1000 mg avec dyspnée',
  ],
  [
    'amoxicilline 500 mg et ibuprofène 200 mg avec disney',
    'ibuprofène 500 mg et amoxicilline 200 mg avec dyspnée',
  ],
  [
    'paracétamol 500 mg et acide clavulanique 125 mg avec disney',
    'acide clavulanique 500 mg et paracétamol 125 mg avec dyspnée',
  ],
];
for (const [initial, swapped] of swappedMedicationDoses) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: swapped },
  }), initial, 'Dose attribuée au mauvais médicament : ' + swapped);
  assertions++;
}
// Les fautes de vocabulaire corrigées n'altèrent pas les doses prescrites.
assert.equal(runtime.chooseMedicalSpeechAlternative({
  length: 2,
  0: { transcript: 'paracétamol 500 mg et amoxicilline 1000 mg avec disney' },
  1: { transcript: 'paracétamol 500 mg et amoxicilline 1000 mg avec dyspnée' },
}), 'paracétamol 500 mg et amoxicilline 1000 mg avec dyspnée');
assertions++;

// Une hypothèse peut intervertir les voies entre deux molécules sans
// changer ni l'ordre global des voies ni la liste des médicaments.
const swappedMedicationRoutes = [
  [
    'paracétamol oral et amoxicilline IV avec disney',
    'amoxicilline oral et paracétamol IV avec dyspnée',
  ],
  [
    'ibuprofène par voie orale et paracétamol par voie rectale avec disney',
    'paracétamol par voie orale et ibuprofène par voie rectale avec dyspnée',
  ],
  [
    'paracétamol voie sublinguale et acide clavulanique voie orale avec disney',
    'acide clavulanique voie sublinguale et paracétamol voie orale avec dyspnée',
  ],
];
for (const [initial, swapped] of swappedMedicationRoutes) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: swapped },
  }), initial, 'Voie attribuée au mauvais médicament : ' + swapped);
  assertions++;
}
// La reconnaissance d'une voie ne doit pas empêcher une amélioration
// purement lexicale lorsque médicaments, doses et voies sont inchangés.
for (const [initial, corrected] of [
  ['paracétamol oral et amoxicilline IV avec disney', 'paracétamol oral et amoxicilline IV avec dyspnée'],
  ['ibuprofène par voie orale et paracétamol par voie rectale avec disney', 'ibuprofène par voie orale et paracétamol par voie rectale avec dyspnée'],
  ['paracétamol 500 mg voie orale et amoxicilline 500 mg voie IV avec disney', 'paracétamol 500 mg voie orale et amoxicilline 500 mg voie IV avec dyspnée'],
]) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: corrected },
  }), corrected, 'Amélioration sans changement thérapeutique refusée : ' + corrected);
  assertions++;
}

// Des moments de prise peuvent être conservés globalement tout en
// étant réattribués à d'autres médicaments dans une transcription candidate.
const swappedMedicationTimes = [
  [
    'paracétamol le matin et amoxicilline le soir avec disney',
    'amoxicilline le matin et paracétamol le soir avec dyspnée',
  ],
  [
    'ibuprofène chaque soir et paracétamol chaque matin avec disney',
    'paracétamol chaque soir et ibuprofène chaque matin avec dyspnée',
  ],
  [
    'acide clavulanique midi et paracétamol nuit avec disney',
    'paracétamol midi et acide clavulanique nuit avec dyspnée',
  ],
];
for (const [initial, swapped] of swappedMedicationTimes) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: swapped },
  }), initial, 'Moment de prise attribué au mauvais médicament : ' + swapped);
  assertions++;
}
// La simple correction de vocabulaire reste possible si les médicaments,
// les moments et les autres données critiques sont inchangés.
for (const [initial, corrected] of [
  ['paracétamol le matin et amoxicilline le soir avec disney', 'paracétamol le matin et amoxicilline le soir avec dyspnée'],
  ['ibuprofène chaque soir et paracétamol chaque matin avec disney', 'ibuprofène chaque soir et paracétamol chaque matin avec dyspnée'],
  ['paracétamol 500 mg le matin et amoxicilline 500 mg le soir avec disney', 'paracétamol 500 mg le matin et amoxicilline 500 mg le soir avec dyspnée'],
]) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: corrected },
  }), corrected, 'Correction lexicale sûre bloquée : ' + corrected);
  assertions++;
}

// Le même ordre de chiffres / « fois par jour » ne prouve pas que la
// fréquence thérapeutique soit toujours attribuée au bon médicament.
const swappedMedicationFrequencies = [
  [
    'paracétamol 2 fois par jour et amoxicilline 3 fois par jour avec disney',
    'amoxicilline 2 fois par jour et paracétamol 3 fois par jour avec dyspnée',
  ],
  [
    'amoxicilline 3 prises par jour et ibuprofène 2 prises par jour avec disney',
    'ibuprofène 3 prises par jour et amoxicilline 2 prises par jour avec dyspnée',
  ],
  [
    'ibuprofène 1 fois par semaine et paracétamol 2 fois par jour avec disney',
    'paracétamol 1 fois par semaine et ibuprofène 2 fois par jour avec dyspnée',
  ],
];
for (const [initial, swapped] of swappedMedicationFrequencies) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: swapped },
  }), initial, 'Fréquence attribuée au mauvais médicament : ' + swapped);
  assertions++;
}
// Les alternatives plus lisibles restent sélectionnées si les molécules,
// quantités et fréquences dictées n'ont pas été modifiées.
for (const [initial, corrected] of [
  ['paracétamol 2 fois par jour et amoxicilline 3 fois par jour avec disney', 'paracétamol 2 fois par jour et amoxicilline 3 fois par jour avec dyspnée'],
  ['amoxicilline 3 prises par jour et ibuprofène 2 prises par jour avec disney', 'amoxicilline 3 prises par jour et ibuprofène 2 prises par jour avec dyspnée'],
  ['amoxicilline 500 mg 2 fois par jour avec disney', 'amoxicilline 500 mg 2 fois par jour avec dyspnée'],
]) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: corrected },
  }), corrected, 'Correction lexicale sans changement de fréquence refusée : ' + corrected);
  assertions++;
}

// La conservation de la liste de nombres et des unités n'assure pas
// qu'un chiffre reste associé à la bonne mesure clinique.
const reassignedClinicalMeasurements = [
  [
    'glycémie 1,2 g/L et lactates 2,5 g/L avec disney',
    'lactates 1,2 g/L et glycémie 2,5 g/L avec dyspnée',
  ],
  [
    'SpO₂ 97 % et saturation 88 % avec disney',
    'saturation 97 % et SpO₂ 88 % avec dyspnée',
  ],
  [
    'température 38,5 degrés et pouls 96 bpm avec disney',
    'pouls 38,5 degrés et température 96 bpm avec dyspnée',
  ],
];
for (const [initial, reassigned] of reassignedClinicalMeasurements) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: reassigned },
  }), initial, 'Association mesure/valeur modifiée : ' + reassigned);
  assertions++;
}
// Une amélioration lexicale réelle reste possible sans changer les mesures.
assert.equal(runtime.chooseMedicalSpeechAlternative({
  length: 2,
  0: { transcript: 'SpO₂ 97 % et glycémie 1,2 g/L avec disney' },
  1: { transcript: 'SpO₂ 97 % et glycémie 1,2 g/L avec dyspnée' },
}), 'SpO₂ 97 % et glycémie 1,2 g/L avec dyspnée');
assertions++;

// Protéger les constantes dictées avec « à / de » et les tensions
// exprimées en paires systolique/diastolique, y compris « sur ».
const reassignedSpokenVitals = [
  [
    'glycémie à 1,2 g/L et saturation à 98 % avec disney',
    'saturation à 1,2 g/L et glycémie à 98 % avec dyspnée',
  ],
  [
    'température de 38,5 degrés et pouls de 96 bpm avec disney',
    'pouls de 38,5 degrés et température de 96 bpm avec dyspnée',
  ],
  [
    'TA 120/80 et pression artérielle 140/90 avec disney',
    'pression artérielle 120/80 et TA 140/90 avec dyspnée',
  ],
  [
    'tension artérielle 120 sur 80 et pression artérielle 100 sur 60 avec disney',
    'pression artérielle 120 sur 80 et tension artérielle 100 sur 60 avec dyspnée',
  ],
];
for (const [initial, unsafe] of reassignedSpokenVitals) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: unsafe },
  }), initial, 'Constante réattribuée dans la transcription : ' + unsafe);
  assertions++;
}
for (const [initial, safe] of [
  ['TA 120/80 avec disney', 'TA 120/80 avec dyspnée'],
  ['glycémie à 1,2 g/L et saturation à 98 % avec disney', 'glycémie à 1,2 g/L et saturation à 98 % avec dyspnée'],
]) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: safe },
  }), safe, 'Amélioration vocale non clinique refusée : ' + safe);
  assertions++;
}

// Une hypothèse mieux notée ne doit pas déplacer une négation ni
// en changer la cible clinique connue (toux / dyspnée).
const negationMeaningChanges = [
  ['pas de disney avec toux', 'toux avec pas de dyspnée'],
  ['absence de display avec toux', 'toux avec absence de dyspnée'],
  ['pas de toux et disney', 'pas de dyspnée et toux'],
  ['absence de toux avec display', 'absence de dyspnée avec toux'],
];
for (const [initial, unsafe] of negationMeaningChanges) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: unsafe },
  }), initial, 'Sens de la négation modifié : ' + unsafe);
  assertions++;
}

// La négation doit conserver sa cible clinique : retrouver le mot ailleurs
// dans l'alternative ne suffit pas si la cible sous « pas de » disparaît.
// Une cible mal reconnue dans la seconde hypothèse reste non fiable.
const lostNegationTargets = [
  ['pas de toux et disney', 'pas de display et toux avec dyspnée'],
  ['absence de dyspnée et display', 'absence de disney et dyspnée avec exsudat'],
  ['aucune fièvre avec display', 'aucune disney avec fièvre et exsudat'],
];
for (const [initial, unsafe] of lostNegationTargets) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: unsafe },
  }), initial, 'Cible de négation connue effacée : ' + unsafe);
  assertions++;
}
// Une transcription initiale erronée (« disney ») peut en revanche être
// améliorée lorsque les autres termes et la position de négation sont conservés.
assert.equal(runtime.chooseMedicalSpeechAlternative({
  length: 2,
  0: { transcript: 'pas de disney avec toux' },
  1: { transcript: 'pas de dyspnée avec toux' },
}), 'pas de dyspnée avec toux');
assertions++;

// Une négation portant sur plusieurs mots doit conserver le terme complet.
// Les deux expressions restent ailleurs dans la dictée : la seule présence
// lexicale ne suffit donc pas à préserver le sens de la phrase.
const negatedCompoundTargets = [
  [
    "absence d'insuffisance cardiaque avec insuffisance respiratoire et disney",
    "absence d'insuffisance respiratoire avec insuffisance cardiaque et dyspnée",
  ],
  [
    "pas d'infection bactérienne avec infection virale et disney",
    "pas d'infection virale avec infection bactérienne et dyspnée",
  ],
  [
    "absence de syndrome coronarien aigu avec syndrome cérébelleux et disney",
    "absence de syndrome cérébelleux avec syndrome coronarien aigu et dyspnée",
  ],
];
for (const [initial, alternative] of negatedCompoundTargets) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: alternative },
  }), initial, 'Cible composée sous négation remplacée : ' + alternative);
  assertions++;
}
// Même expression niée, seule une erreur de vocabulaire est améliorée.
assert.equal(runtime.chooseMedicalSpeechAlternative({
  length: 2,
  0: { transcript: "absence d'insuffisance cardiaque avec disney" },
  1: { transcript: "absence d'insuffisance cardiaque avec dyspnée" },
}), "absence d'insuffisance cardiaque avec dyspnée");
assertions++;

// Protéger les symptômes et expressions médicales déjà correctement
// reconnus, même si une seconde hypothèse a un score lexical supérieur.
const missingMedicalTerms = [
  ['toux avec disney', 'dyspnée et exsudat amygdalien'],
  ['odynophagie avec display', 'dysphagie et dyspnée'],
  ['fièvre avec disney', 'dyspnée et toux'],
  ['insuffisance cardiaque avec disney', 'insuffisance respiratoire et dyspnée'],
  ['douleur thoracique avec disney', 'douleur abdominale avec dyspnée et exsudat'],
];
for (const [initial, alternative] of missingMedicalTerms) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: alternative },
  }), initial, 'Terme médical déjà reconnu supprimé ou remplacé : ' + alternative);
  assertions++;
}
// Une mention clinique répétée n'est pas préservée par sa seule présence.
// Les alternatives riches en vocabulaire ne doivent pas en faire disparaître
// une occurrence, même si les deux phrases restent sans chiffres ni négations.
const lostRepeatedTerms = [
  ['toux et toux avec disney', 'toux avec dyspnée et exsudat'],
  ['insuffisance cardiaque, insuffisance cardiaque avec disney', 'insuffisance cardiaque avec dyspnée et exsudat'],
  ['douleur thoracique et douleur thoracique avec disney', 'douleur thoracique avec dyspnée et exsudat'],
];
for (const [initial, unsafe] of lostRepeatedTerms) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: unsafe },
  }), initial, 'Terme médical répété supprimé : ' + unsafe);
  assertions++;
}
// Une alternative plus précise conserve le droit d'enrichir le texte tant
// que toutes les occurrences reconnues et leur nombre sont préservés.
const safeRepeatedTerms = [
  ['toux et toux avec disney', 'toux et toux avec dyspnée'],
  ['insuffisance cardiaque, insuffisance cardiaque avec disney', 'insuffisance cardiaque, insuffisance cardiaque avec dyspnée'],
];
for (const [initial, corrected] of safeRepeatedTerms) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: corrected },
  }), corrected, 'Alternative avec occurrences intactes refusée : ' + corrected);
  assertions++;
}

// La correction d'une erreur non médicale, elle, doit rester possible.
for (const [initial, corrected] of [
  ['toux avec disney', 'toux avec dyspnée'],
  ['insuffisance cardiaque avec disney', 'insuffisance cardiaque avec dyspnée'],
]) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: corrected },
  }), corrected, 'Amélioration vocale sûre bloquée : ' + corrected);
  assertions++;
}

// La suggestion médicale ne doit jamais être appliquée sans clic du médecin.
const dictatedRaw = 'le patient présente une disney';
const suggested = suggestions(dictatedRaw).find(item => item.replacement === 'dyspnée');
assert.ok(suggested, 'Suggestion de dyspnée absente');
assert.equal(dictatedRaw, 'le patient présente une disney', 'Dictée brute modifiée');
assert.equal(runtime.applyMedicalSpeechCorrection(dictatedRaw, suggested!), 'le patient présente une dyspnée');
assertions += 3;

// Une alternative sûre doit rester sélectionnable à constantes et négations égales.
const safeClinicalAlternatives = [
  ['absence de disney', 'absence de dyspnée', 'absence de dyspnée'],
  ['paracétamol 500 mg et disney', 'paracétamol 500 mg et dyspnée', 'paracétamol 500 mg et dyspnée'],
  ['SpO₂ 97 % avec disney', 'SpO₂ 97 % avec dyspnée', 'SpO₂ 97 % avec dyspnée'],
];
for (const [initial, alternative, expected] of safeClinicalAlternatives) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: alternative },
  }), expected);
  assertions++;
}

// Cas limites du navigateur : pas d'hypothèse, une seule hypothèse,
// égalité de score et alternatives vides. La transcription d'origine prime.
const edgeCases = [
  { input: { length: 0 }, expected: '' },
  { input: { length: 1, 0: { transcript: '  dyspnée  ' } }, expected: 'dyspnée' },
  { input: { length: 2, 0: { transcript: 'toux' }, 1: { transcript: 'toux' } }, expected: 'toux' },
  { input: { length: 3, 0: { transcript: 'exsudat' }, 1: { transcript: '  ' }, 2: { transcript: 'exsudat amygdalien' } }, expected: 'exsudat amygdalien' },
  { input: { length: 2, 0: { transcript: 'absence de dyspnée' }, 1: { transcript: 'dyspnée' } }, expected: 'absence de dyspnée' },
];
for (const { input, expected } of edgeCases) {
  assert.equal(runtime.chooseMedicalSpeechAlternative(input), expected);
  assertions++;
}

// Stabilité : sélectionner une hypothèse ne doit ni modifier les résultats
// fournis par le navigateur, ni changer la transcription à un second appel.
const stableInput = {
  length: 3,
  0: { transcript: 'présence d’un exsudat' },
  1: { transcript: '   ' },
  2: { transcript: 'présence d’un exsudat amygdalien' },
};
const stableSnapshot = JSON.stringify(stableInput);
const firstChoice = runtime.chooseMedicalSpeechAlternative(stableInput);
assert.equal(firstChoice, 'présence d’un exsudat amygdalien');
assert.equal(runtime.chooseMedicalSpeechAlternative(stableInput), firstChoice);
assert.equal(JSON.stringify(stableInput), stableSnapshot);
assertions += 3;

// Une proposition alternative ne peut pas inventer ou supprimer des
// informations critiques, même si elle contient davantage de termes médicaux.
const criticalOmissions = [
  ['SpO₂ 98 % et dyspnée', 'dyspnée'],
  ['absence de dyspnée', 'dyspnée'],
  ['allergie au latex avec dyspnée', 'dyspnée'],
  ['grossesse avec dyspnée', 'dyspnée'],
  ['voie intraveineuse avec dyspnée', 'dyspnée'],
];
for (const [initial, omitted] of criticalOmissions) {
  assert.equal(runtime.chooseMedicalSpeechAlternative({
    length: 2,
    0: { transcript: initial },
    1: { transcript: omitted },
  }), initial, 'Information clinique supprimée : ' + omitted);
  assertions++;
}

// La sélection doit rester stable si le navigateur répète des hypothèses
// identiques et ne doit pas altérer les mesures déjà présentes.
const duplicateAlternatives = {
  length: 3,
  0: { transcript: 'SpO₂ 98 % avec dyspnée' },
  1: { transcript: 'SpO₂ 98 % avec dyspnée' },
  2: { transcript: 'SpO₂ 98 % avec dyspnée' },
};
const duplicateSnapshot = JSON.stringify(duplicateAlternatives);
for (let attempt = 0; attempt < 5; attempt++) {
  assert.equal(runtime.chooseMedicalSpeechAlternative(duplicateAlternatives), 'SpO₂ 98 % avec dyspnée');
  assertions++;
}
assert.equal(JSON.stringify(duplicateAlternatives), duplicateSnapshot);
assertions++;


// Contrat de lecture ponctuelle Orb (inspection du vrai composant React).
// L'essai microphone et l'interaction vocale restent à effectuer sur Android.
const orbSource = readFileSync(new URL('../src/components/OrbAssistant.tsx', import.meta.url), 'utf8');
assert.ok(orbSource.includes('function readMessageAloud(reply: string)') &&
  orbSource.includes('onClick={() => readMessageAloud(message.content)}'),
  'La lecture d’une seule réponse de MediFollow doit être proposée.');
assertions++;
assert.ok(orbSource.includes('if (!window.confirm(') &&
  orbSource.includes('informations confidentielles'),
  'La lecture ponctuelle doit demander une confirmation explicite de confidentialité.');
assertions++;
assert.ok(orbSource.includes('if ((!manual && !voiceRepliesRef.current)') &&
  orbSource.includes('speakReply(reply, true);'),
  'La lecture ponctuelle doit fonctionner sans activer les réponses automatiques.');
assertions++;
const readBlock = orbSource.split('function readMessageAloud(reply: string)')[1]?.split('function closePanel()')[0] ?? '';
assert.ok(readBlock.indexOf('commandListeningEnabledRef.current = false;') > readBlock.indexOf('window.confirm(') &&
  readBlock.includes('recognitionRef.current?.abort();') && readBlock.includes('recognitionRef.current = null;'),
  'Le microphone doit être désarmé après consentement, avant lecture ponctuelle.');
assertions++;
const closeBlock = orbSource.split('function closePanel()')[1]?.split('function toggleVoiceReplies()')[0] ?? '';
assert.ok(closeBlock.includes('stopSpeaking();') &&
  closeBlock.includes('recognitionRef.current?.abort();') &&
  orbSource.includes('onClick={closePanel}') &&
  orbSource.includes('panelOpen ? closePanel() : setPanelOpen(true)'),
  'La fermeture par bouton ou Orb doit arrêter la parole et l’écoute.');
assertions++;
assert.ok(orbSource.includes("disabled={!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)}") &&
  orbSource.includes('className="mf-orb-read-reply"') &&
  orbSource.includes('aria-label={`Lire à voix haute'),
  'Le contrôle ponctuel doit être étiqueté et indisponible sans synthèse vocale.');
assertions++;

// QW-006 — garde de sécurité après un échec de reconnaissance Android.
// Contrôles structurels du vrai gestionnaire d'événements, sans prétendre
// simuler matériellement le navigateur ni la permission système Android.
const failedSessionHandler = orbSource.split('recognition.onerror = (event) => {')[1]
  ?.split('recognition.onend = () => {')[0] ?? '';
assert.ok(failedSessionHandler.includes('sessionEnded = true;'),
  'Une erreur doit rendre la session vocale terminale.'); assertions++;
assert.ok(failedSessionHandler.includes('commandListeningEnabledRef.current = false;'),
  'Une erreur doit désarmer toutes les commandes, pas seulement certains codes.'); assertions++;
assert.ok(failedSessionHandler.includes('recognitionRef.current = null;') &&
  failedSessionHandler.includes('setIsListening(false);'),
  'Une erreur doit libérer le micro et son affichage même sans événement onend.'); assertions++;
assert.ok(failedSessionHandler.includes("if (mode === 'command') setInput('');") &&
  failedSessionHandler.includes("speechCurrentTextRef.current = '';"),
  'La commande incomplète ne doit pas rester prête à être envoyée après une erreur.'); assertions++;
assert.ok(failedSessionHandler.includes('recognition.abort();') &&
  failedSessionHandler.indexOf('sessionEnded = true;') < failedSessionHandler.indexOf('recognition.abort();'),
  'La session doit être neutralisée avant tout callback causé par abort.'); assertions++;
const endHandler = orbSource.split('recognition.onend = () => {')[1]
  ?.split("setSpeechMessage('');")[0] ?? '';
assert.ok(endHandler.includes('if (sessionEnded || recognitionRef.current !== recognition) return;') &&
  endHandler.includes('if (mode === \'command\' && commandListeningEnabledRef.current)'),
  'onend ne doit ni exécuter ni redémarrer une session déjà échouée.'); assertions++;

console.log('OK : ' + assertions + ' assertions sur les fonctions réelles de correction médicale et le contrat vocal Orb (sans navigateur).');
