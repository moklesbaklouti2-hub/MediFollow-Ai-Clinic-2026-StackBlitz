import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectClinicalSuggestions } from '../../src/clinical/clinicalTriggers.ts';
import { isCurrentClinicalRequest } from '../../src/services/clinicalRequestGuard.ts';

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

// Les réponses au copilote sont distinctes du champ « Symptômes ».
// Si les quatre éléments sont déjà consignés dans l'interrogatoire ciblé,
// ne pas les signaler comme manquants ; conserver l'alerte de gravité.
const completedChestInterview = detectClinicalSuggestions({
  specialty: 'Médecine de famille',
  motif: 'douleur thoracique',
  symptoms: 'douleur thoracique',
  history: '',
  targetedInterview: 'Début depuis 30 minutes. Aucune irradiation. Sueurs présentes. Douleur à l’effort.',
  vitals: { ...blankVitals },
});
assert.ok(completedChestInterview.some(item => item.id === 'chest-pain' && item.priority === 'high'),
  'L’alerte thoracique prioritaire ne doit jamais être supprimée par les réponses ciblées.');
assert.ok(!completedChestInterview.some(item => item.id === 'missing-chest-pain-details'),
  'Les éléments consignés dans les réponses ciblées ne doivent plus être réclamés.');

const incompleteChestInterview = detectClinicalSuggestions({
  specialty: 'Médecine de famille',
  motif: 'douleur précordiale',
  symptoms: 'douleur précordiale',
  history: '',
  targetedInterview: 'Depuis 20 minutes, pas d’irradiation.',
  vitals: { ...blankVitals },
});
const missingInterview = incompleteChestInterview.find(item => item.id === 'missing-chest-pain-details');
assert.ok(missingInterview, 'Les informations réellement manquantes restent à demander.');
assert.ok(missingInterview.checks.some(check => check.includes('symptômes associés')),
  'Les symptômes associés manquants doivent rester signalés.');
assert.ok(missingInterview.checks.some(check => check.includes('facteurs déclenchants')),
  'Les facteurs déclenchants manquants doivent rester signalés.');
assert.ok(!missingInterview.checks.some(check => check.includes('début et la durée') || check.includes('irradie')),
  'La durée et l’irradiation déjà documentées ne doivent pas être demandées à nouveau.');

const chestPainInTargetedOnly = detectClinicalSuggestions({
  specialty: 'Médecine de famille',
  motif: 'malaise',
  symptoms: '',
  history: '',
  targetedInterview: 'Douleur précordiale rapportée lors de l’interrogatoire ciblé.',
  vitals: { ...blankVitals },
});
assert.ok(chestPainInTargetedOnly.some(item => item.id === 'chest-pain' && item.priority === 'high'),
  'La douleur thoracique rapportée uniquement au copilote doit déclencher une vigilance.');

const noDetailsAtAll = detectClinicalSuggestions({
  specialty: 'Médecine de famille',
  motif: 'douleur thoracique',
  symptoms: 'douleur thoracique',
  history: '',
  vitals: { ...blankVitals },
});
assert.ok(noDetailsAtAll.some(item => item.id === 'missing-chest-pain-details'),
  'Sans interrogatoire ciblé, les éléments manquants restent détectés.');
console.log('OK — 8 assertions de cohérence entre réponses au copilote et alertes thoraciques.');

// Ne pas confondre une négation explicite et une douleur thoracique
// réellement signalée. Les cas ambigus restent volontairement alertés.
const negativeChestMentions = [
  { motif: 'toux', symptoms: 'Pas de douleur thoracique.' },
  { motif: 'toux', symptoms: 'Absence de douleur précordiale.' },
  { motif: 'toux', symptoms: 'Le patient nie une douleur thoracique.' },
  { motif: 'toux', symptoms: 'Sans oppression thoracique.' },
  { motif: 'toux', symptoms: '', targetedInterview: 'Aucune douleur thoracique rapportée.' },
  { motif: 'toux', symptoms: 'Pas de douleur thoracique, ni douleur précordiale.' },
];
for (const input of negativeChestMentions) {
  const suggestions = detectClinicalSuggestions({
    specialty: 'Médecine de famille',
    history: '', vitals: { ...blankVitals }, ...input,
  });
  assert.ok(!suggestions.some(s => s.id === 'chest-pain'),
    'Alerte de douleur thoracique créée sur une négation explicite : ' + JSON.stringify(input));
  assert.ok(!suggestions.some(s => s.id === 'missing-chest-pain-details'),
    'Questionnaire de douleur thoracique créé sur une négation explicite.');
}

const affirmingChestMentions = [
  { motif: 'douleur thoracique', symptoms: 'Pas de dyspnée.' },
  { motif: 'toux', symptoms: 'Pas de douleur thoracique. Mais douleur précordiale à l’effort.' },
  { motif: 'douleur précordiale', symptoms: '', targetedInterview: 'Le patient nie une douleur thoracique.' },
  { motif: 'toux', symptoms: 'Pas d’amélioration de douleur thoracique.' },
  { motif: 'malaise', symptoms: '', targetedInterview: 'Douleur thoracique au repos.' },
  { motif: 'toux', symptoms: 'Douleur thoracique ? À vérifier.' },
];
for (const input of affirmingChestMentions) {
  const suggestions = detectClinicalSuggestions({
    specialty: 'Médecine de famille',
    history: '', vitals: { ...blankVitals }, ...input,
  });
  assert.ok(suggestions.some(s => s.id === 'chest-pain' && s.priority === 'high'),
    'Alerte thoracique perdue malgré une mention positive ou incertaine : ' + JSON.stringify(input));
}
console.log('OK — 12 mentions thoraciques niées, positives ou incertaines contrôlées.');

// Réponse tardive d'une requête IA : ne pas réafficher une analyse
// attachée à un dossier précédent ou à une consultation fermée.
const firstClinicalRequest = new AbortController();
const anotherClinicalRequest = new AbortController();
const initialSnapshot = '{"motif":"vertiges","symptoms":"depuis 2 jours"}';
const updatedSnapshot = '{"motif":"vertiges","symptoms":"depuis 4 jours"}';
assert.equal(isCurrentClinicalRequest(firstClinicalRequest, firstClinicalRequest, initialSnapshot, initialSnapshot, true), true);
assert.equal(isCurrentClinicalRequest(firstClinicalRequest, anotherClinicalRequest, initialSnapshot, initialSnapshot, true), false);
assert.equal(isCurrentClinicalRequest(firstClinicalRequest, null, initialSnapshot, initialSnapshot, true), false);
assert.equal(isCurrentClinicalRequest(firstClinicalRequest, firstClinicalRequest, initialSnapshot, updatedSnapshot, true), false);
assert.equal(isCurrentClinicalRequest(firstClinicalRequest, firstClinicalRequest, initialSnapshot, initialSnapshot, false), false);
firstClinicalRequest.abort();
assert.equal(isCurrentClinicalRequest(firstClinicalRequest, firstClinicalRequest, initialSnapshot, initialSnapshot, true), false);
assert.equal(isCurrentClinicalRequest(anotherClinicalRequest, anotherClinicalRequest, updatedSnapshot, updatedSnapshot, true), true);
anotherClinicalRequest.abort();
assert.equal(isCurrentClinicalRequest(anotherClinicalRequest, anotherClinicalRequest, updatedSnapshot, updatedSnapshot, true), false);

// Vérifier que la garde accompagne réellement la réception de la réponse.
const reasoningHook = readFileSync(new URL('../../src/hooks/useClinicalReasoning.ts', import.meta.url), 'utf8');
const receiptIndex = reasoningHook.indexOf('const responseText = await response.text();');
const guardIndex = reasoningHook.indexOf('if (!isCurrentClinicalRequest(controller, activeRequest.current, snapshot, currentSnapshotRef.current, analysisAllowedRef.current)) return;');
const applyIndex = reasoningHook.indexOf('setAnalysis(data.analysis as ClinicalReasoningAnalysis);');
assert.ok(receiptIndex >= 0 && guardIndex > receiptIndex && applyIndex > guardIndex,
  'L’analyse est appliquée sans vérifier la requête active après réception.');
assert.ok(reasoningHook.includes('activeRequest.current?.abort();') &&
  reasoningHook.includes('activeRequest.current = null;'),
  'L’annulation de la requête au changement ou à la fermeture est absente.');
assert.ok(reasoningHook.includes('currentSnapshotRef.current = snapshot;') &&
  reasoningHook.includes('analysisAllowedRef.current = input.enabled && hasUsefulContent;'),
  'Le contexte actif et la désactivation du copilote doivent invalider une ancienne réponse.');
assert.ok(reasoningHook.includes('lastSnapshot.current === snapshot') &&
  reasoningHook.includes('controller.abort();') &&
  reasoningHook.includes("setStatus('idle');"),
  'Une analyse en cours doit être annulée lorsque le contexte change.');
assert.ok(reasoningHook.includes('if (isCurrentClinicalRequest(controller, activeRequest.current, snapshot, currentSnapshotRef.current, analysisAllowedRef.current)) {'),
  'Une erreur tardive ne doit pas écraser une nouvelle consultation.');
console.log('OK — 13 assertions pour le refus des réponses cliniques IA périmées.');

console.log('OK — Vérifications statiques des routes et 4 scénarios cliniques préparés.');
console.log('NOTE — La qualité des réponses cliniques nécessite encore des tests réels du modèle et une revue médicale.');
