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

console.log('OK : ' + assertions + ' assertions sur les fonctions réelles de correction médicale (sans navigateur).');
