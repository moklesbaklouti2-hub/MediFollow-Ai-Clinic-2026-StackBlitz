import assert from 'node:assert/strict';
import { resolveLegacyPatientId } from '../src/services/patientLinkage.ts';
import { countUnlinkedClinicalRecords } from '../src/services/recordIntegrity.ts';
import { hasConfirmedPatientSelection } from '../src/services/patientSelectionGuard.ts';
import { selectUniquePatient } from '../src/services/uniquePatientSelection.ts';
import { latestVitalReadings } from '../src/clinical/patientVitals.ts';
import { buildClinicalMemory } from '../src/clinical/clinicalMemory.ts';
import { compareRecentVitals } from '../src/clinical/trends.ts';
import { buildPreventionReview } from '../src/clinical/prevention.ts';
import { buildReferralSource } from '../src/clinical/referral.ts';
import type { Consultation } from '../src/types/medical.ts';
import { readFileSync } from 'node:fs';
import { getConsultations, getPrescriptions, getPatients } from '../src/services/storage.ts';

// Real storage deserialization with a fully synthetic in-memory localStorage.
// No AI calls, no user/browser data and no external service.
const records = new Map<string, string>();
let writes = 0;
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { dispatchEvent: () => true },
});
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { writes++; records.set(key, value); },
  },
});
const identities = [
  { id: 'patient-alfa', name: 'Nadia Exemple' },
  { id: 'patient-beta', name: 'nadia exemple ' },
  { id: 'patient-unique', name: 'Karim Test' },
];
const lookupCases: Array<[unknown, unknown, string]> = [
  [undefined, 'Karim Test', 'patient-unique'],
  [null, '  KARIM TEST ', 'patient-unique'],
  [undefined, 'Nadia Exemple', ''],
  [undefined, 'nadia exemple', ''],
  [undefined, 'Inconnu', ''],
  [undefined, '', ''],
  [undefined, {}, ''],
  [undefined, ['Karim Test'], ''],
  ['patient-beta', 'Karim Test', 'patient-beta'],
  ['patient-other', 'Nadia Exemple', 'patient-other'],
  ['', 'Karim Test', ''],
  [0, 'Karim Test', ''],
];
for (const [id, name, expected] of lookupCases) {
  assert.equal(resolveLegacyPatientId(id, name, identities), expected);
}
assert.equal(resolveLegacyPatientId(undefined, ' Karim Test ', identities.slice(0, 2)), '',
  'Never assign a patient not present in the current list.');

const patients = identities.map((item) => ({
  ...item, age: 42, sex: 'Non renseigné', phone: '',
  lastVisit: '', status: 'Fictif', createdAt: '2026-01-01', updatedAt: '2026-01-01',
}));
records.set('medifollow-patients', JSON.stringify(patients));
const legacyCases = [
  { id: 'legacy-homonym', patient: 'Nadia Exemple', expected: '' },
  { id: 'legacy-unique', patient: ' KARIM TEST ', expected: 'patient-unique' },
  { id: 'explicit-homonym', patient: 'Nadia Exemple', patientId: 'patient-beta', expected: 'patient-beta' },
  { id: 'explicit-empty', patient: 'Karim Test', patientId: '', expected: '' },
  { id: 'legacy-unknown', patient: 'Patient non inscrit', expected: '' },
  { id: 'legacy-no-name', expected: '' },
  { id: 'legacy-invalid-name', patient: { name: 'Karim Test' }, expected: '' },
];
records.set('medifollow-consultations', JSON.stringify(legacyCases.map(({ expected: _expected, ...item }) => ({
  ...item, date: '2026-01-01', motif: 'Consultation fictive',
}))));
records.set('medifollow-prescriptions', JSON.stringify(legacyCases.map(({ expected: _expected, ...item }) => ({
  ...item, date: '2026-01-01', medications: [], advice: '',
}))));
assert.equal(getPatients().length, patients.length);
for (const [type, restored] of [
  ['consultation', getConsultations()],
  ['prescription', getPrescriptions()],
] as const) {
  assert.equal(restored.length, legacyCases.length, 'No legacy record may disappear.');
  for (const entry of legacyCases) {
    const record = restored.find(item => item.id === entry.id);
    assert.equal(record?.patientId, entry.expected,
      type + ': incorrect patient association for ' + entry.id);
  }
}
const integrity = countUnlinkedClinicalRecords(getPatients(), getConsultations(), getPrescriptions());
assert.deepEqual(integrity, { consultations: 5, prescriptions: 5 },
  'Les documents ambigus, sans identifiant ou orphelins doivent être signalés.');
assert.deepEqual(countUnlinkedClinicalRecords(
  [{ id: 'ok' }],
  [{ patientId: 'ok' }, { patientId: '' }, { patientId: 'ghost' }],
  [{ patientId: 'ghost' }, { patientId: 'ok' }],
), { consultations: 2, prescriptions: 1 });
assert.deepEqual(countUnlinkedClinicalRecords([], [], []), { consultations: 0, prescriptions: 0 });
const dashboardSource = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
assert.ok(dashboardSource.includes('countUnlinkedClinicalRecords(getPatients(), getConsultations(), getPrescriptions())') &&
  dashboardSource.includes('role="alert"') &&
  dashboardSource.includes('Documents sans dossier patient confirmé'),
  'Le tableau de bord doit afficher un avertissement sans divulguer les noms.');
assert.equal(writes, 0, 'Reading legacy data must never rewrite or migrate stored records.');

const patientSelectionCases: Array<[unknown, Array<{ id: string }>, boolean]> = [
  ['p1', [{ id: 'p1' }], true],
  ['p1', [{ id: 'p1' }, { id: 'p2' }], true],
  ['p1', [{ id: 'p1' }, { id: 'p1' }], false],
  ['missing', [{ id: 'p1' }], false],
  ['', [{ id: '' }], false],
  ['  ', [{ id: '  ' }], false],
  [0, [{ id: '0' }], false],
  [null, [{ id: 'p1' }], false],
  ['p1', [], false],
  [' p1 ', [{ id: 'p1' }], false],
];
for (const [patientId, patients, expected] of patientSelectionCases) {
  assert.equal(hasConfirmedPatientSelection(patientId, patients), expected,
    'Association documentaire au patient non confirmé.');
}
const consultationSource = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
const prescriptionSource = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
const consultationSave = consultationSource.split('function saveConsultation()')[1]?.split('const changes =')[0] ?? '';
const prescriptionValidation = prescriptionSource.split('function validatePrescription()')[1]?.split('function previewPrescription()')[0] ?? '';
assert.ok(consultationSave.includes('hasConfirmedPatientSelection(patientId, patients)') &&
  consultationSave.includes('window.alert('), 'Consultations ne protège pas les identités incertaines avant la sauvegarde.');
assert.ok(prescriptionValidation.includes('hasConfirmedPatientSelection(patientId, patients)') &&
  prescriptionValidation.includes('return false;'), 'Ordonnances ne refuse pas le patient incertain.');
console.log('PASS : sélection patient confirmée pour consultations et ordonnances (données fictives).');


// QW-033 — duplicated imported patient IDs cannot open a combined medical file.
const uniquePatients = [
  { id: 'a', name: 'Patient A fictif' },
  { id: 'b', name: 'Patient B fictif' },
  { id: 'a', name: 'Patient C fictif' },
];
assert.equal(selectUniquePatient(uniquePatients, 'a'), null,
  'Two imported patients with the same ID must never share one detail view.');
assert.equal(selectUniquePatient(uniquePatients, 'b')?.name, 'Patient B fictif');
assert.equal(selectUniquePatient(uniquePatients, 'missing'), null);
assert.equal(selectUniquePatient(uniquePatients, ''), null);
assert.equal(selectUniquePatient(uniquePatients, '  '), null);
assert.equal(selectUniquePatient(uniquePatients, null), null);
assert.equal(selectUniquePatient(uniquePatients, 1), null);
assert.equal(selectUniquePatient([], 'b'), null);
assert.equal(selectUniquePatient([{ id: 'x', name: 'Seul' }], 'x')?.name, 'Seul');
const patientPageSource = readFileSync(new URL('../src/pages/Patients.tsx', import.meta.url), 'utf8');
assert.ok(patientPageSource.includes('const selected = selectUniquePatient(patients, selectedId);') &&
  patientPageSource.includes('selectedId !== null && !selected') &&
  patientPageSource.includes('role="alert"') &&
  patientPageSource.includes('identifiant dupliqué') &&
  patientPageSource.includes('{selected && ('),
  'Patient detail must be closed and a warning shown if an imported ID is ambiguous.');
console.log('PASS: QW-033 nine synthetic patient selections and visible fail-closed UI contract.');


// QW-034 — vital readings must keep per-measurement provenance.
const v = (date: string, values: Partial<Consultation['vitals']>) => ({
  date, vitals: {
    systolic: '', diastolic: '', heartRate: '', spo2: '',
    temperature: '', respiratoryRate: '', weight: '', height: '', glycemia: '',
    ...values,
  },
});
const readings = latestVitalReadings([
  v('2026-11-11T15:00:00Z', { systolic: '140', heartRate: '88' }),
  v('2026-11-10T09:00:00Z', { diastolic: '80', systolic: '125', weight: '70' }),
  v('2026-11-08T11:00:00Z', { weight: '69', glycemia: '1,1' }),
]);
assert.deepEqual(readings.systolic, { value: '140', date: '2026-11-11T15:00:00Z' });
assert.deepEqual(readings.diastolic, { value: '80', date: '2026-11-10T09:00:00Z' });
assert.deepEqual(readings.heartRate, { value: '88', date: '2026-11-11T15:00:00Z' });
assert.deepEqual(readings.weight, { value: '70', date: '2026-11-10T09:00:00Z' });
assert.deepEqual(readings.glycemia, { value: '1,1', date: '2026-11-08T11:00:00Z' });
assert.equal(readings.spo2, undefined);
assert.deepEqual(latestVitalReadings([]), {});
assert.deepEqual(latestVitalReadings([v('2026-11-11', { systolic: '   ' })]), {});
assert.deepEqual(latestVitalReadings([v('2026-11-11', { temperature: ' 37.5 ' })]).temperature,
  { value: '37.5', date: '2026-11-11' });
const latestReadingsPage = readFileSync(new URL('../src/pages/Patients.tsx', import.meta.url), 'utf8');
assert.ok(latestReadingsPage.includes('latestVitalReadings(patientConsultations)') &&
  latestReadingsPage.includes('Mesurée le {displayDate(latestVitals[field.key]?.date') &&
  latestReadingsPage.includes('Object.keys(latestVitals).length === 0'),
  'Patient UI must show the date of each reading and indicate missing data.');
console.log('PASS QW-034: nine synthetic vital provenance checks and actual Patient UI contract.');


// QW-035 — Clinical Memory must only display explicitly recorded data of the
// selected patient; no diagnosis/treatment inferred from a missing value.
const patientMemory = {
  id: 'patient-fictif',
  clinicalHistory: { allergies: [
    { id: 'a', label: ' Pénicilline ', details: ' éruption fictive ' },
    { id: 'b', label: '  ' },
  ] },
  currentMedications: [
    { id: 'm1', name: ' Traitement fictif ', dosage: ' 5 mg ' },
    { id: 'm2', name: '' },
  ],
};
const memoryVisits = [
  { id: 'newest', patientId: 'patient-fictif', date: '2026-11-11', diagnosis: 'Diagnostic fictif 1' },
  { id: 'other', patientId: 'autre-patient', date: '2026-11-12', diagnosis: 'NE PAS AFFICHER' },
  { id: 'blank', patientId: 'patient-fictif', date: '2026-11-10', diagnosis: '' },
  { id: 'older', patientId: 'patient-fictif', date: '2026-10-05', diagnosis: 'Diagnostic fictif 2' },
  { id: 'oldest', patientId: 'patient-fictif', date: '2026-09-01', diagnosis: 'Diagnostic fictif 3' },
  { id: 'historical', patientId: 'patient-fictif', date: '2026-01-01', diagnosis: 'Diagnostic fictif 4' },
];
const clinicalMemory = buildClinicalMemory(patientMemory, memoryVisits);
assert.deepEqual(clinicalMemory.allergies, ['Pénicilline — éruption fictive']);
assert.deepEqual(clinicalMemory.declaredTreatments, ['Traitement fictif — 5 mg']);
assert.deepEqual(clinicalMemory.documentedDiagnoses.map(x => x.consultationId),
  ['newest', 'older', 'oldest']);
assert.equal(clinicalMemory.documentedDiagnoses[0]?.date, '2026-11-11');
assert.equal(clinicalMemory.documentedDiagnoses.some(x => x.label === 'NE PAS AFFICHER'), false);
assert.deepEqual(buildClinicalMemory({ id: 'sans-données' }, []), {
  allergies: [], declaredTreatments: [], documentedDiagnoses: [],
  documentedHistory: { medical: [], surgical: [], family: [] },
});
assert.deepEqual(buildClinicalMemory({ id: 'sans-données' }, memoryVisits).documentedDiagnoses, []);
assert.deepEqual(buildClinicalMemory({ id: 'patient-fictif', clinicalHistory: {
  allergies: [null, { id: 'a', label: 42 }] as never,
}, currentMedications: [null] as never }, []).allergies, []);
const missingDate = buildClinicalMemory({ id: 'patient-fictif' }, [
  { id: 'bad-date', patientId: 'patient-fictif', date: 'incorrect', diagnosis: 'Note fictive' },
]);
assert.equal(missingDate.documentedDiagnoses[0]?.date, 'Date non renseignée');
assert.equal(patientPageSource.includes('buildClinicalMemory(selected, patientConsultations)'), true);
assert.ok(patientPageSource.includes('HELIOS Clinical Memory · aperçu documentaire') &&
  patientPageSource.includes('Allergies déclarées') &&
  patientPageSource.includes('Traitements déclarés dans le dossier (à confirmer)') &&
  patientPageSource.includes('Non renseigné') &&
  patientPageSource.includes('clinicalMemory.documentedDiagnoses.map('),
  'Le composant Patients doit afficher la mémoire locale et sa provenance, sans conclusion automatique.');
console.log('PASS QW-035: 11 tests fictifs de mémoire documentaire et de liaison UI.');


// QW-036 — historical memory is documentary, separated by group, and safe
// for incomplete or malformed imported entries. No inference or patient mixing.
const datedHistoryPatient = {
  id: 'patient-fictif',
  clinicalHistory: {
    medical: [
      { id: 'mh1', label: ' HTA fictive ', date: ' vers 2020 ', details: ' à confirmer ' },
      { id: 'mh2', label: '   ' },
      null,
    ],
    surgical: [{ id: 'sh1', label: ' Appendicectomie fictive ', date: '2011' }],
    family: [
      { id: 'fh1', label: ' Diabète familial fictif ', details: ' parent déclaré ' },
      { id: 'fh2', label: 47 },
    ],
  },
};
const documentedHistory = buildClinicalMemory(datedHistoryPatient as never, memoryVisits);
assert.deepEqual(documentedHistory.documentedHistory.medical,
  ['HTA fictive · Date déclarée : vers 2020 · Précision : à confirmer']);
assert.deepEqual(documentedHistory.documentedHistory.surgical,
  ['Appendicectomie fictive · Date déclarée : 2011']);
assert.deepEqual(documentedHistory.documentedHistory.family,
  ['Diabète familial fictif · Précision : parent déclaré']);
assert.deepEqual(documentedHistory.allergies, []);
assert.deepEqual(documentedHistory.declaredTreatments, []);
assert.equal(documentedHistory.documentedDiagnoses.length, 3);
assert.deepEqual(buildClinicalMemory({ id: 'sans-antécédents' }, []).documentedHistory,
  { medical: [], surgical: [], family: [] });
assert.deepEqual(buildClinicalMemory({
  id: 'malformé',
  clinicalHistory: { medical: [42, null, [], { label: '' }] as never },
}, []).documentedHistory.medical, []);
assert.deepEqual(buildClinicalMemory({
  id: 'malformé',
  clinicalHistory: { family: { label: 'not-an-array' } as never },
}, []).documentedHistory.family, []);
assert.equal(datedHistoryPatient.clinicalHistory.medical[0]?.label, ' HTA fictive ',
  'Reading memory must not mutate source notes.');
assert.ok(patientPageSource.includes('clinicalMemory.documentedHistory[group.key].map(') &&
  patientPageSource.includes('Antécédents médicaux déclarés') &&
  patientPageSource.includes('Antécédents chirurgicaux déclarés') &&
  patientPageSource.includes('Antécédents familiaux déclarés') &&
  patientPageSource.includes('Non renseigné'),
  'HELIOS Clinical Memory must present all three original history groups without inventing negatives.');
console.log('PASS QW-036: 10 fictional history group and UI regression checks.');


// QW-037 — compare only full numeric values of the same kind, ordered by
// their recorded dates. No interpretation or patient data transmission.
const compareVisit = (id: string, date: string, values: Partial<Consultation['vitals']>) => ({
  id, date, vitals: {
    systolic: '', diastolic: '', heartRate: '', spo2: '',
    temperature: '', respiratoryRate: '', weight: '', height: '', glycemia: '',
    ...values,
  },
});
const trendFixture = [
  compareVisit('old', '2026-10-01T10:00:00Z', { weight: '70', systolic: '120', glycemia: '1,00' }),
  compareVisit('latest', '2026-11-11T10:00:00Z', { weight: '72', systolic: '135', glycemia: '1,20' }),
  compareVisit('bad', '2026-12-01', { weight: '72 kg', systolic: 'valeur absente' }),
  compareVisit('invalid-date', 'date inconnue', { weight: '90' }),
  compareVisit('middle', '2026-11-01T10:00:00Z', { weight: '71', systolic: '130' }),
];
const trendOriginal = JSON.stringify(trendFixture);
const comparisons = compareRecentVitals(trendFixture);
const byKey = (key: string) => comparisons.find(item => item.key === key);
assert.equal(byKey('weight')?.recent.value, 72);
assert.equal(byKey('weight')?.previous.value, 71);
assert.equal(byKey('weight')?.difference, 1);
assert.equal(byKey('weight')?.recent.date, '2026-11-11T10:00:00Z');
assert.equal(byKey('systolic')?.difference, 5);
assert.equal(byKey('glycemia')?.difference, 0.2);
assert.equal(byKey('diastolic'), undefined);
assert.equal(byKey('heartRate'), undefined);
assert.deepEqual(compareRecentVitals([]), []);
assert.deepEqual(compareRecentVitals([compareVisit('only', '2026-11-11', { weight: '70' })]), []);
assert.deepEqual(compareRecentVitals([
  compareVisit('latest', '2026-11-11', { weight: '70.1' }),
  compareVisit('old', '2026-11-10', { weight: '70,0' }),
]).find(item => item.key === 'weight')?.difference, 0.1);
assert.equal(JSON.stringify(trendFixture), trendOriginal, 'Trend calculation must not alter stored visits.');
assert.ok(patientPageSource.includes('compareRecentVitals(patientConsultations)') &&
  patientPageSource.includes('HELIOS Trends · comparaison des deux dernières mesures') &&
  patientPageSource.includes('Écart brut :') &&
  patientPageSource.includes('Deux mesures numériques datées sont nécessaires'),
  'The patient UI must show source dates and avoid a clinical interpretation.');
console.log('PASS QW-037: 12 numerical trend checks, immutable fixtures and UI contract.');


// QW-038 — Prevention is an immutable documentary discussion checklist,
// not a preventive-care score or decision. All dates must belong to the
// selected, uniquely identified patient and be parseable.
const preventionVisits = [
  { patientId: 'fictif-a', date: '2026-09-01' },
  { patientId: 'fictif-b', date: '2026-12-01' },
  { patientId: 'fictif-a', date: 'date inconnue' },
  { patientId: 'fictif-a', date: '2026-11-01' },
];
const preventionFixtureBefore = JSON.stringify(preventionVisits);
const prevention = buildPreventionReview({ id: 'fictif-a', age: 47 } as never, preventionVisits);
assert.equal(prevention.recordedAge, 47);
assert.equal(prevention.lastDatedConsultation, '2026-11-01');
assert.equal(prevention.discussionTopics.length, 4);
assert.deepEqual(prevention.discussionTopics.map(item => item.id),
  ['vaccins', 'depistages', 'habitudes', 'objectifs']);
assert.equal(JSON.stringify(preventionVisits), preventionFixtureBefore);
assert.equal(buildPreventionReview({ id: 'sans-visite', age: 21 } as never, preventionVisits)
  .lastDatedConsultation, null);
assert.equal(buildPreventionReview({ id: 'fictif-a', age: -1 } as never, []).recordedAge, null);
assert.equal(buildPreventionReview({ id: 'fictif-a', age: 'inconnu' } as never, []).recordedAge, null);
assert.equal(buildPreventionReview({ id: 'fictif-a', age: 0 } as never, []).recordedAge, 0);
assert.ok(patientPageSource.includes('buildPreventionReview(selected, patientConsultations)') &&
  patientPageSource.includes('HELIOS Prevention · préparation documentaire') &&
  patientPageSource.includes('preventionReview.discussionTopics.map(') &&
  patientPageSource.includes('Aucune vaccination, aucun dépistage') &&
  patientPageSource.includes('Aucune échéance, alerte, décision clinique'),
  'Patient view must show documentary prompts with explicit no-inference safeguards.');
console.log('PASS QW-038: 10 synthetic prevention-document checks and UI contract.');


 // QW-039 — deterministic, read-only referral preparation from the selected
 // patient's latest dated consultation; no referral decision, letter or send.
const referralFixtures = [
  { id: 'old', patientId: 'fictif-a', date: '2026-08-01', motif: ' ancien ', diagnosis: ' note ancienne ', plan: ' ancienne conduite ' },
  { id: 'other', patientId: 'fictif-b', date: '2026-12-15', motif: 'NE PAS MONTRER', diagnosis: 'NE PAS MONTRER', plan: 'NE PAS MONTRER' },
  { id: 'bad-date', patientId: 'fictif-a', date: 'date inconnue', motif: 'Ne pas retenir', diagnosis: '', plan: '' },
  { id: 'latest', patientId: 'fictif-a', date: '2026-11-11', motif: ' Vertiges fictifs ', diagnosis: ' Hypothèse notée ', plan: ' Réévaluer ' },
];
const referralBefore = JSON.stringify(referralFixtures);
const referral = buildReferralSource('fictif-a', referralFixtures);
assert.equal(referral?.consultationId, 'latest');
assert.equal(referral?.date, '2026-11-11');
assert.equal(referral?.recordedMotif, 'Vertiges fictifs');
assert.equal(referral?.recordedDiagnosis, 'Hypothèse notée');
assert.equal(referral?.recordedPlan, 'Réévaluer');
assert.equal(JSON.stringify(referralFixtures), referralBefore);
assert.equal(buildReferralSource('absent', referralFixtures), null);
assert.equal(buildReferralSource('', referralFixtures), null);
assert.equal(buildReferralSource('fictif-a', [
  { id: 'no-data', patientId: 'fictif-a', date: '2026-11-12', motif: '', diagnosis: '  ', plan: '  ' },
]).recordedDiagnosis, null);
assert.ok(patientPageSource.includes('buildReferralSource(selected.id, patientConsultations)') &&
  patientPageSource.includes('HELIOS Referral · préparation d\'orientation') &&
  patientPageSource.includes('aucune donnée n\'est transmise') &&
  patientPageSource.includes('Diagnostic consigné (non revalidé)'),
  'Referral preview must remain source-only, non-prescriptive and never transmitted.');
console.log('PASS QW-039: 10 fictional referral provenance and UI checks.');

console.log('PASS: legacy document linkage, 10 orphan records detected, visible dashboard warning and zero storage mutations.');
