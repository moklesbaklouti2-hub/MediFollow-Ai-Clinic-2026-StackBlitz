import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { MEDICAL_DICTIONARY } from '../src/data/medicalDictionary';

// Exécute les fonctions réelles du correcteur extraites du composant,
// sans monter React ni accéder au microphone. Aucun faux moteur de correction.
const source = readFileSync(new URL('../src/components/OrbAssistant.tsx', import.meta.url), 'utf8');
const start = source.indexOf('const medicalSpeechTerms =');
const end = source.indexOf('const suggestionsByPage:', start);
assert.ok(start >= 0 && end > start, 'Bloc du moteur de dictée introuvable');
const engine = source.slice(start, end);
const compiled = ts.transpileModule(engine, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
type Correction = { original: string; replacement: string };
type SpeechEngine = {
  findMedicalSpeechCorrections: (text: string) => Correction[];
  applyMedicalSpeechCorrection: (text: string, correction: Correction) => string;
  chooseMedicalSpeechAlternative: (result: unknown) => string;
  hasDictatedClinicalNumber: (text: string) => boolean;
};
const runtime = runInNewContext(
  compiled + '\n({ findMedicalSpeechCorrections, applyMedicalSpeechCorrection, chooseMedicalSpeechAlternative, hasDictatedClinicalNumber })',
  { MEDICAL_DICTIONARY, console, RegExp, Map, Array },
) as SpeechEngine;

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
console.log('OK : ' + assertions + ' assertions sur les fonctions réelles de correction médicale (sans navigateur).');
