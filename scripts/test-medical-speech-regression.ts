import assert from 'node:assert/strict';
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

console.log('OK : ' + assertions + ' assertions sur les fonctions réelles de correction médicale (sans navigateur).');
