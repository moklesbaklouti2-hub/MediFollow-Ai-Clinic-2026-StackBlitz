import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectClinicalSuggestions } from '../../src/clinical/clinicalTriggers.ts';

const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
const clinical = source.split("app.post('/api/clinical/analyze'")[1]?.split("app.post('/api/")[0] ?? '';
const chat = source.split("app.post('/api/chat'")[1] ?? '';
assert.ok(clinical.includes("createAiCompletion"), 'Analyse clinique manquante');
assert.ok(clinical.includes("typeof parsed.priorityReason !== 'string' || !parsed.priorityReason.trim()"),
  'Une justification de priorité vide ne doit pas être acceptée');
assert.ok(clinical.includes("typeof item.reason === 'string' && item.reason.trim().length > 0"),
  'Les hypothèses sans argument clinique valide doivent être écartées');
assert.ok(!clinical.includes('Erreur du moteur clinique : ${detail'), 'Détails internes du fournisseur exposés au client');
assert.ok(!clinical.includes("console.error('Erreur analyse clinique détaillée:', error)"), 'Erreur fournisseur brute journalisée');
assert.ok(!/\b(?:message|history|clinicalInterview|memoryContext)\b/.test(
  clinical.slice(0, clinical.indexOf('const completion ='))
), 'La route clinique référence une variable de conversation non déclarée');
assert.ok(clinical.includes("if (contextText.length > 30000)"), 'Limite de taille du contexte clinique absente');
assert.ok(clinical.includes("!['routine', 'attention', 'urgent'].includes(String(parsed.priority))"),
  'Priorité clinique non restreinte aux trois valeurs attendues');
assert.ok(clinical.includes("!Array.isArray(parsed.nextQuestionOptions)"),
  'Options de réponse clinique non vérifiées');
assert.ok(clinical.includes("if (statusCode === 429)"), 'Traitement du quota clinique absent');
assert.ok(clinical.includes("error: 'Le moteur clinique est temporairement indisponible."),
  'Message générique de panne clinique absent');
assert.ok(chat.includes('const memoryContext ='), 'Mémoire conversationnelle absente');
assert.ok(chat.indexOf('const memoryContext =') < chat.indexOf('interviewInstructions + memoryContext'),
  'Mémoire utilisée avant sa déclaration');

const cases = [
  { name: 'ORL', text: 'Homme de 28 ans, odynophagie, fièvre 39 °C, respiration normale, déglutition conservée.', danger: false },
  { name: 'Cardiologie', text: 'Femme de 65 ans, vertiges au lever, sous antihypertenseur.', danger: false },
  { name: 'Pédiatrie', text: 'Enfant de 3 ans, fièvre 39,5 °C depuis 24 heures.', danger: false },
  { name: 'Urgences', text: 'Homme de 55 ans, douleur thoracique constrictive depuis 30 minutes avec sueurs.', danger: true },
];
for (const scenario of cases) {
  assert.ok(scenario.text.length > 20);
  console.log('SCÉNARIO FICTIF PRÊT —', scenario.name, scenario.danger ? '(alerte attendue)' : '');
}
// Tests fonctionnels du détecteur : ne jamais couper les mots accentués.
const blankVitals = {
  systolic: '', diastolic: '', heartRate: '', spo2: '',
  temperature: '', respiratoryRate: '', weight: '', height: '', glycemia: '',
};
const detectMotif = (motif: string, specialty = 'Médecine de famille') =>
  detectClinicalSuggestions({ specialty, motif, symptoms: '', history: '', vitals: { ...blankVitals } });
for (const [motif, expectedId] of [
  ['douleur précordiale récente', 'chest-pain'],
  ['douleur pre\u0301cordiale récente', 'chest-pain'],
  ['douleur thoracique récente', 'chest-pain'],
  ['suivi prénatal', 'pregnancy'],
  ['consultation obstétrique', 'pregnancy'],
] as const) {
  assert.ok(
    detectMotif(motif).some(suggestion => suggestion.id === expectedId),
    'Déclencheur clinique absent après normalisation du motif : ' + motif,
  );
}
for (const motif of ['céphalée isolée', 'consultation dermatologique']) {
  const suggestions = detectMotif(motif);
  assert.ok(!suggestions.some(suggestion => ['chest-pain', 'pregnancy'].includes(suggestion.id)),
    'Alerte thoracique ou obstétricale non justifiée : ' + motif);
}
console.log('OK — 7 tests de déclencheurs cliniques (accents, formes décomposées et contrôles négatifs).');

console.log('OK — Vérifications statiques des routes et 4 scénarios cliniques préparés.');
console.log('NOTE — La qualité des réponses cliniques nécessite encore des tests réels du modèle et une revue médicale.');
