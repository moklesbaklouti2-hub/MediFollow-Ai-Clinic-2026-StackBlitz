import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Tests de contrat du correcteur : ne prétendent PAS exécuter Chrome ou React.
// Vérifient les expressions observées et les cas qui ne doivent pas être modifiés.
const source = readFileSync(new URL('../src/components/OrbAssistant.tsx', import.meta.url), 'utf8');
const start = source.indexOf('const contextualPhrases:');
const end = source.indexOf('for (const { pattern, replacement } of contextualPhrases)', start);
assert.ok(start >= 0 && end > start, 'Les règles contextuelles doivent être centralisées');
const rules = source.slice(start, end);
const patterns = [...rules.matchAll(/pattern:\s*(\/[^\n]+\/[a-z]*)/g)].map(match => {
  const literal = match[1];
  const slash = literal.lastIndexOf('/');
  return new RegExp(literal.slice(1, slash), literal.slice(slash + 1));
});
assert.equal(patterns.length, 3, 'Trois règles contextuelles attendues');

const positives = [
  'excédent amygdalien',
  'excédent amygdalia',
  'alexuda amygdalien',
  'des adénopathie cervicales bilatérale',
  'des adénopathies cervicales bilatérale',
];
const negatives = [
  'amygdalite',
  'amygdalia',
  'un excédent budgétaire',
  'des adénopathies cervicales bilatérales',
  'absence d’exsudat amygdalien',
];
for (const phrase of positives) {
  assert.ok(patterns.some(pattern => { pattern.lastIndex = 0; return pattern.test(phrase); }), 'Suggestion attendue : ' + phrase);
}
for (const phrase of negatives) {
  assert.ok(patterns.every(pattern => { pattern.lastIndex = 0; return !pattern.test(phrase); }), 'Suggestion interdite : ' + phrase);
}
assert.ok(source.includes('found.set(normalizeSpeechCandidate(original), { original, replacement })'));
assert.ok(source.includes('function applyMedicalSpeechCorrection('));
assert.ok(source.includes("if (['amygdania', 'amygdalia'].includes(normalizedWord)) return null;"));
console.log('OK : 5 expressions à suggérer, 5 cas protégés, garde-fou et confirmation présents.');
