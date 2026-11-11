import assert from 'node:assert/strict';
import express from 'express';
import { CLINICAL_PATHS } from '../security/protectedClinicalRouter.ts';
import { preventClinicalCaching } from '../security/noStoreClinicalResponses.ts';
import {
  readClinicalPromptText, MAX_CHAT_MESSAGE_CHARS, isClinicalChatMessageTooLong,
} from '../security/clinicalPromptInput.ts';
import { readFileSync } from 'node:fs';
import { detectClinicalSuggestions } from '../../src/clinical/clinicalTriggers.ts';
import type { Patient } from '../../src/types/medical.ts';
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


// Réponses utiles déjà consignées par le copilote : ne pas redemander
// une histoire de la maladie au seul motif que « symptômes » est vide.
for (const targetedInterview of [
  'Depuis trois jours, fièvre et toux nocturne, aggravation progressive.',
  'Début brutal hier soir ; pas de dyspnée ; hydratation correcte.',
]) {
  const result = detectClinicalSuggestions({
    specialty: 'Médecine de famille', motif: 'Toux', symptoms: '',
    history: '', targetedInterview, vitals: { ...blankVitals },
  });
  assert.ok(!result.some(s => s.id === 'missing-symptom-history'),
    'Une réponse ciblée déjà documentée ne doit pas redemander la même histoire.');
}
for (const targetedInterview of ['', '   ', '\t']) {
  const result = detectClinicalSuggestions({
    specialty: 'Médecine de famille', motif: 'Toux', symptoms: '',
    history: '', targetedInterview, vitals: { ...blankVitals },
  });
  assert.ok(result.some(s => s.id === 'missing-symptom-history'),
    'Une réponse ciblée blanche ne doit pas masquer un champ symptômes vide.');
}
{
  const result = detectClinicalSuggestions({
    specialty: 'Médecine de famille', motif: 'Toux', symptoms: 'Depuis hier',
    history: '', targetedInterview: '', vitals: { ...blankVitals },
  });
  assert.ok(!result.some(s => s.id === 'missing-symptom-history'),
    'La saisie existante de symptômes continue de fonctionner.');
}
console.log('OK — 6 contrôles contre les rappels redondants après interrogatoire ciblé.');

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


const bloodPressureCases = [
  { systolic: '140 mmHg', diastolic: '', flagged: true },
  { systolic: '', diastolic: '90 mm Hg', flagged: true },
  { systolic: '140,5', diastolic: '70', flagged: true },
  { systolic: ' 141 ', diastolic: '80 mmHg', flagged: true },
  { systolic: '139 mmHg', diastolic: '89 mm Hg', flagged: false },
  { systolic: '140/90', diastolic: '', flagged: false },
  { systolic: '140 inconnu', diastolic: '80', flagged: false },
  { systolic: '', diastolic: '', flagged: false },
] as const;
for (const bp of bloodPressureCases) {
  const result = detectClinicalSuggestions({
    specialty: 'Médecine de famille', motif: 'contrôle', symptoms: '',
    history: '', vitals: { ...blankVitals, systolic: bp.systolic, diastolic: bp.diastolic },
  });
  assert.equal(result.some(item => item.id === 'elevated-bp'), bp.flagged,
    'Interprétation tensionnelle incorrecte : ' + JSON.stringify(bp));
}
console.log('OK — 8 tests de lecture tensionnelle avec ou sans mmHg.');


// QW-009 — les pluriels de douleur thoracique doivent rester détectés,
// sans inventer de douleur présente lorsqu'ils sont explicitement niés.
for (const words of [
  'douleurs thoraciques à l’effort',
  'douleurs précordiales depuis 20 minutes',
  'oppressions thoraciques intermittentes',
  'thoracalgies nocturnes',
  'angors à l’effort',
]) {
  const result = detectMotif(words);
  assert.ok(result.some(item => item.id === 'chest-pain' && item.priority === 'high'),
    'Alerte prioritaire absente pour un pluriel : ' + words);
}
for (const words of [
  'pas de douleurs thoraciques',
  'absence de douleurs précordiales',
  'sans oppressions thoraciques',
  'aucunes douleurs thoraciques',
  'ni thoracalgies',
]) {
  const result = detectClinicalSuggestions({
    specialty: 'Médecine de famille', motif: 'toux', symptoms: words,
    history: '', vitals: { ...blankVitals },
  });
  assert.ok(!result.some(item => item.id === 'chest-pain' || item.id === 'missing-chest-pain-details'),
    'Alerte thoracique créée à partir d’une négation au pluriel : ' + words);
}
{
  const result = detectClinicalSuggestions({
    specialty: 'Médecine de famille', motif: 'toux',
    symptoms: 'Pas de douleurs thoraciques. Puis douleurs précordiales ce matin.',
    history: '', vitals: { ...blankVitals },
  });
  assert.ok(result.some(item => item.id === 'chest-pain' && item.priority === 'high'),
    'Une mention positive indépendante doit conserver l’alerte prioritaire.');
}
console.log('OK — 11 scénarios de douleur thoracique au pluriel, négations et mention positive indépendante.');


// QW-010 — ne pas confondre une rubrique créée et une donnée réellement
// renseignée ; reconnaître les données gynéco-obstétricales du dossier.
const historyFixture: Patient = {
  id: 'patient-fictif', name: 'Patient fictif', age: 37, sex: 'F',
  phone: '', lastVisit: '', status: 'active', createdAt: '', updatedAt: '',
};
const historyScenarios: Array<{
  label: string; change: Partial<Patient>; documentedHistory?: string; missing: boolean;
}> = [
  { label: 'dossier vide', change: {}, missing: true },
  { label: 'rubrique gynécologique remplie', change: {
    clinicalHistory: { gynecoObstetric: { lastMenstrualPeriod: '05/10/2026' } },
  }, missing: false },
  { label: 'rubrique gynécologique blanche', change: {
    clinicalHistory: { gynecoObstetric: { lastMenstrualPeriod: '   ' } },
  }, missing: true },
  { label: 'ligne antécédent vide', change: {
    clinicalHistory: { medical: [{ id: 'h1', label: '   ' }] },
  }, missing: true },
  { label: 'détail antécédent documenté', change: {
    clinicalHistory: { medical: [{ id: 'h1', label: '', details: 'Opération ancienne' }] },
  }, missing: false },
  { label: 'traitement sans nom', change: {
    currentMedications: [{ id: 'm1', name: '  ' }],
  }, missing: true },
  { label: 'traitement nommé', change: {
    currentMedications: [{ id: 'm1', name: 'Traitement test' }],
  }, missing: false },
  { label: 'autre antécédent rédigé', change: {
    clinicalHistory: { other: 'Observation documentée' },
  }, missing: false },
  { label: 'champ consultation renseigné', change: {}, documentedHistory: 'Antécédent décrit', missing: false },
];
for (const scenario of historyScenarios) {
  const results = detectClinicalSuggestions({
    patient: { ...historyFixture, ...scenario.change },
    specialty: 'Médecine de famille', motif: 'Consultation de contrôle',
    symptoms: 'Suivi', history: scenario.documentedHistory ?? '', vitals: { ...blankVitals },
  });
  assert.equal(results.some(item => item.id === 'missing-medical-history'), scenario.missing,
    'Faux rappel sur les antécédents : ' + scenario.label);
}
console.log('OK — 9 scénarios fictifs de complétude des antécédents et traitements.');

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


const consultationPageSource = readFileSync(new URL('../../src/pages/Consultations.tsx', import.meta.url), 'utf8');
const saveConsultationSource = consultationPageSource
  .split('function saveConsultation() {')[1]?.split('const vitalFields')[0] ?? '';
const successReset = saveConsultationSource.split('setSaved(true);')[1] ?? '';
assert.ok(saveConsultationSource.includes("if (!saved) {") && successReset.length > 0,
  'La réinitialisation doit rester conditionnée à la réussite de la sauvegarde.');
assert.ok(successReset.includes("setTargetedInterview('');"),
  'Après une sauvegarde réussie, les réponses ciblées doivent être effacées du brouillon.');
assert.ok(successReset.indexOf("setTargetedInterview('');") > successReset.indexOf("setHistory('');") &&
  successReset.indexOf("setTargetedInterview('');") < successReset.indexOf("setVitals({ ...emptyVitals });"),
  'Les réponses ciblées doivent être vidées en même temps que les autres champs du brouillon.');
assert.ok(!saveConsultationSource.split('setSaved(true);')[0].includes("setTargetedInterview('');"),
  'Une sauvegarde en échec ne doit pas effacer les réponses avant confirmation.');
console.log('OK — 4 contrôles contractuels : absence de transfert du brouillon ciblé après sauvegarde.');


// QW-013 — exercice HTTP réel du middleware sur un serveur Express
// éphémère exclusivement en loopback, avec des réponses fictives.
assert.ok(source.includes('app.use(CLINICAL_PATHS, preventClinicalCaching);') &&
  source.indexOf('app.use(CLINICAL_PATHS, preventClinicalCaching);') < source.indexOf('if (remoteAccessConfig) {'),
  'Les réponses cliniques doivent être protégées contre la mise en cache avant le contrôle distant.');
// QW-017: Express JSON parsing can reject a request before reaching the
// route handlers. Check the actual index.ts ordering, not just a mock app.
assert.ok(
  source.indexOf('app.use(CLINICAL_PATHS, preventClinicalCaching);') <
  source.indexOf("app.use(express.json({ limit: '64kb' }));"),
  'Les erreurs de JSON doivent recevoir no-store avant même le parseur.');

const noStoreApp = express();
noStoreApp.use(CLINICAL_PATHS, preventClinicalCaching);
noStoreApp.use(express.json({ limit: '64kb' }));
for (const path of CLINICAL_PATHS) {
  noStoreApp.post(path, (req, res) => {
    if (req.get('x-test-error') === 'yes') {
      res.status(400).json({ error: 'Donnée fictive refusée.' });
      return;
    }
    res.status(200).json({ reply: 'Réponse fictive.' });
  });
}
noStoreApp.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));
// Swallow the test parser errors without printing fake body content to logs.
noStoreApp.use((error: { status?: number }, _req: express.Request,
  res: express.Response, _next: express.NextFunction) => {
  res.status(error.status === 413 ? 413 : 400).json({ error: 'Corps JSON fictif invalide.' });
});
const noStoreServer = noStoreApp.listen(0, '127.0.0.1');
try {
  await new Promise<void>((resolve, reject) => {
    if (noStoreServer.listening) { resolve(); return; }
    noStoreServer.once('listening', resolve);
    noStoreServer.once('error', reject);
  });
  const addr = noStoreServer.address();
  assert.ok(addr && typeof addr !== 'string', 'Le test HTTP doit utiliser un port loopback éphémère.');
  const base = 'http://127.0.0.1:' + (addr as { port: number }).port;
  for (const path of CLINICAL_PATHS) {
    for (const simulateError of [false, true]) {
      const response = await fetch(base + path, {
        method: 'POST',
        headers: simulateError ? { 'x-test-error': 'yes' } : undefined,
      });
      assert.equal(response.status, simulateError ? 400 : 200,
        'Mauvais statut de réponse fictive sur ' + path);
      assert.equal(response.headers.get('cache-control'), 'no-store',
        'Réponse clinique susceptible de mise en cache : ' + path);
      assert.equal(response.headers.get('pragma'), 'no-cache',
        'Directive de cache ancienne absente : ' + path);
    }
  }
  // The 400 and 413 occur within express.json, before any clinical handler.
  // In all three paths the anti-cache headers must already be present.
  for (const path of CLINICAL_PATHS) {
    for (const fixture of [
      { code: 400, payload: '{', label: 'syntaxe JSON invalide' },
      { code: 413, payload: JSON.stringify({ text: 'x'.repeat(66_000) }), label: 'JSON trop volumineux' },
    ]) {
      const response = await fetch(base + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: fixture.payload,
      });
      assert.equal(response.status, fixture.code, path + ' : ' + fixture.label);
      assert.equal(response.headers.get('cache-control'), 'no-store',
        'Réponse de parseur JSON stockable : ' + path + ' / ' + fixture.label);
      assert.equal(response.headers.get('pragma'), 'no-cache',
        'En-tête de compatibilité anti-cache manquant : ' + path + ' / ' + fixture.label);
    }
  }
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), null,
    'Le middleware ne doit pas modifier les routes de santé publiques.');
} finally {
  await new Promise<void>((resolve, reject) =>
    noStoreServer.close(error => error ? reject(error) : resolve()),
  );
}
console.log('OK — 3 routes cliniques non stockables en succès, erreur applicative, JSON invalide et dépassement 64 Ko (requêtes fictives).');


// QW-014 — ne jamais transformer un JSON non textuel en instruction IA.
// Tous les exemples sont fictifs ; aucun appel réseau vers un fournisseur.
const promptInputCases: Array<{ value: unknown; expected: string }> = [
  { value: null, expected: '' },
  { value: undefined, expected: '' },
  { value: 123, expected: '' },
  { value: true, expected: '' },
  { value: false, expected: '' },
  { value: [], expected: '' },
  { value: ['ouvrir', 'patient'], expected: '' },
  { value: { text: 'symptôme fictif' }, expected: '' },
  { value: { toString: () => { throw new Error('Never coerce an object to a prompt'); } }, expected: '' },
  { value: '', expected: '' },
  { value: '   \t ', expected: '' },
  { value: '  Bonjour  ', expected: 'Bonjour' },
  { value: '  Dyspnée\n  ', expected: 'Dyspnée' },
];
for (const scenario of promptInputCases) {
  assert.equal(readClinicalPromptText(scenario.value), scenario.expected,
    'Coercition de commande ou message non sûr');
}
const commandRoute = source.split("app.post('/api/commands/interpret'")[1]?.split("app.post('/api/chat'")[0] ?? '';
assert.ok(commandRoute.includes('const instruction = readClinicalPromptText(req.body?.instruction);') &&
  commandRoute.includes("if (!instruction) return res.status(400)"),
  'La route des commandes doit refuser le JSON non textuel avant tout appel IA.');
assert.ok(chat.includes('const message = readClinicalPromptText(req.body?.message);') &&
  chat.includes("if (!message) return res.status(400)"),
  'La route Discussion IA doit refuser le JSON non textuel avant tout appel IA.');
console.log('OK — 13 cas de validation de prompts et 2 contrats de routes IA sans coercition.');


// QW-016 — limiter un message de chat avant la construction du contexte et
// l'appel à un fournisseur IA. Le maximum vaut 12 000 caractères UTF-16.
assert.equal(MAX_CHAT_MESSAGE_CHARS, 12_000);
for (const [length, expectedTooLong] of [
  [0, false], [1, false], [250, false], [11999, false],
  [12000, false], [12001, true], [15000, true], [50000, true],
] as const) {
  assert.equal(isClinicalChatMessageTooLong('x'.repeat(length)), expectedTooLong,
    'Limite chat incorrecte pour ' + length + ' caractères.');
}
assert.equal(isClinicalChatMessageTooLong(readClinicalPromptText('  ' + 'x'.repeat(12000) + '  ')), false,
  'Les espaces périphériques ne doivent pas faire rejeter un texte valide.');
assert.equal(isClinicalChatMessageTooLong(readClinicalPromptText('  ' + 'x'.repeat(12001) + '  ')), true,
  'Un texte au-dessus de la limite après trim doit être rejeté.');
assert.ok(chat.includes('if (isClinicalChatMessageTooLong(message))') &&
  chat.includes('return res.status(413).json(') &&
  chat.indexOf('if (isClinicalChatMessageTooLong(message))') < chat.indexOf('const completion = await createAiCompletion('),
  'Le rejet HTTP 413 doit se produire dans la vraie route avant l’appel IA.');
console.log('OK — 12 contrôles fictifs de la limite de longueur chat et du garde HTTP 413.');

console.log('OK — Vérifications statiques des routes et 4 scénarios cliniques préparés.');
console.log('NOTE — La qualité des réponses cliniques nécessite encore des tests réels du modèle et une revue médicale.');
