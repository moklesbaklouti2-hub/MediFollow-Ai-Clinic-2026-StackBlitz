import assert from 'node:assert/strict';
import { hasRequiredConsultationDetails, hasUniqueConsultationId, isUnusedConsultationId, preservesConsultationAuditTimestamps, preservesConsultationPatientLink } from '../src/services/consultationIdentity.ts';
import { hasUniquePrescriptionId, isUnusedPrescriptionId, prescriptionHasRecordedStockMovement, preservesPrescriptionPatientId } from '../src/services/prescriptionIdentity.ts';
import { allowsFinalizedPrescriptionUpdate, allowsPrescriptionStatusTransition, allowsStockLinkedPrescriptionUpdate, hasDocumentedPrescriptionDispense, hasFullyDocumentedPrescriptionReturn, isCreatablePrescriptionStatus, isDeletablePrescriptionStatus, isDispensablePrescriptionStatus, preservesPrescriptionAuditTimestamps } from '../src/services/prescriptionFinality.ts';
import { resolveLegacyPatientId } from '../src/services/patientLinkage.ts';
import { countUnlinkedClinicalRecords } from '../src/services/recordIntegrity.ts';
import { hasConfirmedPatientSelection } from '../src/services/patientSelectionGuard.ts';
import { selectUniquePatient } from '../src/services/uniquePatientSelection.ts';
import { latestVitalReadings } from '../src/clinical/patientVitals.ts';
import { buildClinicalMemory } from '../src/clinical/clinicalMemory.ts';
import { compareRecentVitals } from '../src/clinical/trends.ts';
import { buildPreventionReview } from '../src/clinical/prevention.ts';
import { buildReferralSource } from '../src/clinical/referral.ts';
import { summarizeDocumentedSpecialties } from '../src/clinical/specialtyPathways.ts';
import { summarizeRecordedActivity } from '../src/clinical/activityStats.ts';
import { recordedDateTimestamp, orderRecordedNewest, displayRecordedDate } from '../src/clinical/medicalTimeline.ts';
import { documentedSupplementalOrders, documentedPrescriptionStatus } from '../src/clinical/prescriptionTimeline.ts';
import { filterRecordedEvents } from '../src/clinical/timelineFilter.ts';
import { searchRecordedEvents } from '../src/clinical/timelineSearch.ts';
import { filterDocumentedPrescriptionStatus } from '../src/clinical/timelineStatusFilter.ts';
import { filterTimelineByDateRange } from '../src/clinical/timelineDateRange.ts';
import { documentedSpecialtyOptions, filterTimelineBySpecialty } from '../src/clinical/timelineSpecialty.ts';
import { limitTimelineEvents } from '../src/clinical/timelineLimit.ts';
import { summarizeTimelineDocumentation, filterTimelineDocumentationGaps } from '../src/clinical/timelineQuality.ts';
import { sortTimelineByRecordedDate } from '../src/clinical/timelineSort.ts';
import { filterTimelineUndated } from '../src/clinical/timelineUndated.ts';
import { filterTimelineByRecordedOrderKind } from '../src/clinical/timelineOrderKinds.ts';
import { MAX_LOCAL_DOCUMENT_CHARS, previewLocalDocument } from '../src/clinical/documentReader.ts';
import { academySources } from '../src/clinical/academySources.ts';
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
assert.ok(dashboardSource.includes('countUnlinkedClinicalRecords(clinicalPatients, clinicalConsultations, getPrescriptions())') &&
  dashboardSource.includes('const clinicalPatients = getPatients();') &&
  dashboardSource.includes('const clinicalConsultations = getConsultations();') &&
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


// QW-040 — text preview is local, transient and never interpreted as clinical
// content. The real Patient UI mounts this component with a patient-specific key.
const simpleDocument = previewLocalDocument(' Rapport fictif\nLigne deux, sans diagnostic. ');
assert.equal(simpleDocument.hasContent, true);
assert.equal(simpleDocument.lineCount, 2);
assert.equal(simpleDocument.wordCount, 6);
assert.equal(simpleDocument.text.includes('Rapport fictif'), true);
assert.equal(previewLocalDocument('   ').hasContent, false);
assert.equal(previewLocalDocument(123).hasContent, false);
assert.equal(previewLocalDocument(null).characterCount, 0);
assert.equal(previewLocalDocument('<script>test fictif</script>').text,
  '<script>test fictif</script>');
assert.equal(previewLocalDocument('X'.repeat(MAX_LOCAL_DOCUMENT_CHARS + 5)).characterCount,
  MAX_LOCAL_DOCUMENT_CHARS);
assert.equal(previewLocalDocument('X'.repeat(MAX_LOCAL_DOCUMENT_CHARS + 5)).truncated, true);
const readerSource = readFileSync('src/components/LocalDocumentReader.tsx', 'utf8');
assert.ok(patientPageSource.includes('<LocalDocumentReader key={selected.id} />') &&
  readerSource.includes('HELIOS Document Reader · aperçu texte local') &&
  readerSource.includes('previewLocalDocument(rawText)') &&
  readerSource.includes("setRawText('')") &&
  !readerSource.includes('localStorage') && !readerSource.includes('fetch('),
  'Reader must stay transient, patient-keyed and without API calls or storage.');
console.log('PASS QW-040: 11 fictional local-document and UI checks.');


// QW-041 — institutional link directory, without medical synthesis or
// patient identifiers. Only hard-coded HTTPS destinations are permitted.
assert.equal(academySources.length, 4);
assert.equal(new Set(academySources.map(item => item.id)).size, academySources.length);
const allowedAcademyHosts = new Set(['portail.ineas.tn', 'www.who.int', 'www.has-sante.fr']);
for (const source of academySources) {
  const address = new URL(source.url);
  assert.equal(address.protocol, 'https:');
  assert.equal(allowedAcademyHosts.has(address.hostname), true);
  assert.equal(source.checkedOn, '2026-11-11');
  assert.ok(source.institution.trim() && source.title.trim() && source.description.trim());
}
const protocolPageSource = readFileSync('src/pages/Protocols.tsx', 'utf8');
assert.ok(protocolPageSource.includes('HELIOS Medical Academy · sources institutionnelles') &&
  protocolPageSource.includes('academySources.map(') &&
  protocolPageSource.includes('rel="noopener noreferrer"') &&
  protocolPageSource.includes('Aucun lien n\'envoie de données patient') &&
  protocolPageSource.includes('sans recommandations médicales validées'),
  'Academy should display official outbound sources only, with no patient data or claimed guideline validation.');
console.log('PASS QW-041: 4 official source links, HTTPS allowlist and UI safety contract.');


// QW-044 — documented specialty groups, strictly scoped to a confirmed
// patient's ID. No generated diagnoses, pathways or implied clinical status.
const specialtyVisits = [
  { id: 'c1', patientId: 'fictif-a', specialty: 'Médecine de famille', date: '2026-09-01' },
  { id: 'c2', patientId: 'fictif-a', specialty: ' Cardiologie ', date: '2026-10-15' },
  { id: 'c3', patientId: 'fictif-a', specialty: 'Médecine de famille', date: '2026-11-11' },
  { id: 'c4', patientId: 'fictif-b', specialty: 'Médecine de famille', date: '2026-12-01' },
  { id: 'c5', patientId: 'fictif-a', specialty: 'Cardiologie', date: 'date inconnue' },
  { id: 'c6', patientId: 'fictif-a', specialty: '', date: '2026-11-10' },
];
const originalSpecialtyVisits = JSON.stringify(specialtyVisits);
const specialtySummary = summarizeDocumentedSpecialties('fictif-a', specialtyVisits);
assert.equal(specialtySummary.length, 3);
assert.deepEqual(specialtySummary[0], {
  specialty: 'Cardiologie', count: 2, lastConsultationDate: '2026-10-15',
});
assert.deepEqual(specialtySummary[1], {
  specialty: 'Médecine de famille', count: 2, lastConsultationDate: '2026-11-11',
});
assert.deepEqual(specialtySummary[2], {
  specialty: 'Spécialité non renseignée', count: 1, lastConsultationDate: '2026-11-10',
});
assert.deepEqual(summarizeDocumentedSpecialties('', specialtyVisits), []);
assert.deepEqual(summarizeDocumentedSpecialties('absent', specialtyVisits), []);
assert.deepEqual(summarizeDocumentedSpecialties('fictif-a', [
  { id: 'c7', patientId: 'fictif-a', specialty: null as never, date: 'inconnue' },
]), [{ specialty: 'Spécialité non renseignée', count: 1, lastConsultationDate: null }]);
assert.equal(JSON.stringify(specialtyVisits), originalSpecialtyVisits);
assert.ok(patientPageSource.includes('summarizeDocumentedSpecialties(selected.id, patientConsultations)') &&
  patientPageSource.includes('HELIOS Parcours spécialisés · consultations documentées') &&
  patientPageSource.includes('documentedSpecialties.map(') &&
  patientPageSource.includes('ne confirme ni une maladie') &&
  patientPageSource.includes('Dernière date enregistrée :'),
  'Specialty group UI must show only documented visits with limits and provenance.');
console.log('PASS QW-044: synthetic specialty grouping, isolation and UI checks.');


// QW-045 — recorded-only activity counts. Exclude records with missing or
// duplicated patient IDs; no diagnosis derivation or field mutations.
const activityPatients = [{ id: 'a' }, { id: 'b' }, { id: 'dupe' }, { id: 'dupe' }];
const activityVisits = [
  { patientId: 'a', specialty: 'Médecine de famille', motif: 'Consultation fictive' },
  { patientId: 'b', specialty: ' Cardiologie ', motif: 'Vertiges fictifs' },
  { patientId: 'a', specialty: 'Médecine de famille', motif: 'Consultation fictive' },
  { patientId: 'dupe', specialty: 'Inconnue', motif: 'NE PAS COMPTER' },
  { patientId: 'absent', specialty: 'Inconnue', motif: 'NE PAS COMPTER' },
  { patientId: 'b', specialty: '', motif: '  ' },
];
const activityOriginal = JSON.stringify(activityVisits);
const activity = summarizeRecordedActivity(activityPatients, activityVisits);
assert.equal(activity.included, 4);
assert.equal(activity.excluded, 2);
assert.deepEqual(activity.specialties, [
  { label: 'Médecine de famille', count: 2 },
  { label: 'Cardiologie', count: 1 },
  { label: 'Non renseigné', count: 1 },
]);
assert.deepEqual(activity.motifs, [
  { label: 'Consultation fictive', count: 2 },
  { label: 'Non renseigné', count: 1 },
  { label: 'Vertiges fictifs', count: 1 },
]);
assert.equal(JSON.stringify(activityVisits), activityOriginal);
assert.deepEqual(summarizeRecordedActivity([], []), {
  included: 0, excluded: 0, specialties: [], motifs: [],
});
assert.equal(summarizeRecordedActivity([], activityVisits).excluded, activityVisits.length);
const dashboardActivitySource = readFileSync('src/pages/Dashboard.tsx', 'utf8');
assert.ok(dashboardActivitySource.includes('summarizeRecordedActivity(clinicalPatients, clinicalConsultations)') &&
  dashboardActivitySource.includes('HELIOS Activité — statistiques descriptives') &&
  dashboardActivitySource.includes('data.clinicalActivity.excluded') &&
  dashboardActivitySource.includes('group.items.slice(0, 5).map(') &&
  dashboardActivitySource.includes('pas des diagnostics validés') &&
  dashboardActivitySource.includes('Aucun envoi à une IA externe'),
  'Dashboard must present linked-only, descriptive activity and exclusion notice.');
console.log('PASS QW-045: verified-patient activity counts, malformed links and UI contracts.');


// QW-046 — Unified timeline dates: only explicit valid dates/timestamps rank
// visits, malformed imported dates remain visible as unknown and sort last.
const dateRecords = [
  { id: 'bad-two', date: 'date inconnue' },
  { id: 'old', date: '2026-10-09' },
  { id: 'bad-one', date: '2026-02-30' },
  { id: 'newest', date: '2026-11-11T10:00:00Z' },
  { id: 'middle', date: '2026-11-11' },
  { id: 'invalid-iso', date: '2026-02-30T10:00:00Z' },
];
const dateOriginal = JSON.stringify(dateRecords);
assert.deepEqual(orderRecordedNewest(dateRecords).map(item => item.id),
  ['newest', 'middle', 'old', 'bad-one', 'bad-two', 'invalid-iso']);
assert.equal(JSON.stringify(dateRecords), dateOriginal, 'Sorting must not mutate recorded events.');
assert.equal(recordedDateTimestamp('2026-11-11T11:00:00+01:00'),
  recordedDateTimestamp('2026-11-11T10:00:00Z'));
assert.ok(recordedDateTimestamp('2026-11-11') !== null);
for (const invalid of ['2026-02-30', '2026-02-29', 'date inconnue', '11/11/2026',
  '2026-11-11T09:00:00', '2026-02-30T09:00:00Z', '', null, 20261111]) {
  assert.equal(recordedDateTimestamp(invalid), null, 'Invalid date must not be ranked.');
  assert.equal(displayRecordedDate(invalid), 'Date non renseignée');
}
assert.notEqual(displayRecordedDate('2026-11-11T09:00:00Z'), 'Date non renseignée');
assert.ok(patientPageSource.includes('orderRecordedNewest(consultations.filter(') &&
  patientPageSource.includes('orderRecordedNewest(prescriptions.filter(') &&
  patientPageSource.includes('const medicalTimeline = useMemo(() => orderRecordedNewest([') &&
  patientPageSource.includes('recordedDateTimestamp(consultation.date) === null') &&
  patientPageSource.includes('Object.create(null)') &&
  patientPageSource.includes('Spécialité :</b>') &&
  patientPageSource.includes('displayRecordedDate(entry.date)'),
  'Unified timeline must sort safely, display specialties and reject invalid last-visit dates.');
console.log('PASS QW-046: fictional timeline date ordering, unknown dates, specialty and patient UI contracts.');


// QW-047 — existing prescriptions may contain laboratory, radiology and
// other items in addition to medications; preserve their original meaning.
const syntheticOrders = {
  items: [
    { id: 'lab', category: 'laboratory', name: 'NFS fictive', details: 'à réaliser selon décision médicale' },
    { id: 'rx', category: 'radiology', name: 'Radio fictive' },
    { id: 'treatment', category: 'treatment', name: 'Médicament fictif' },
    { id: 'other', category: 'other', name: 'Courrier fictif' },
    { id: 'blank', category: 'radiology', name: '  ' },
    null,
  ],
};
const ordersBefore = JSON.stringify(syntheticOrders);
assert.deepEqual(documentedSupplementalOrders(syntheticOrders as never), [
  { id: 'lab', category: 'laboratory', label: 'Analyse biologique prescrite',
    name: 'NFS fictive', details: 'à réaliser selon décision médicale' },
  { id: 'rx', category: 'radiology', label: 'Imagerie prescrite',
    name: 'Radio fictive', details: null },
  { id: 'other', category: 'other', label: 'Autre élément prescrit',
    name: 'Courrier fictif', details: null },
]);
assert.equal(JSON.stringify(syntheticOrders), ordersBefore, 'Read-only preview must not mutate prescriptions.');
assert.deepEqual(documentedSupplementalOrders({ items: undefined }), []);
assert.deepEqual(documentedSupplementalOrders({ items: 'incorrect' as never }), []);
assert.deepEqual(documentedSupplementalOrders({ items: [
  { category: 'laboratory', name: '  Bilan fictif  ', details: '  demandé  ' },
] as never }), [
  { id: 'élément-0', category: 'laboratory', label: 'Analyse biologique prescrite',
    name: 'Bilan fictif', details: 'demandé' },
]);
assert.ok(patientPageSource.includes('documentedSupplementalOrders(entry.prescription)') &&
  patientPageSource.includes('Examens et autres éléments prescrits (non présumés réalisés)') &&
  patientPageSource.includes('Array.isArray(entry.prescription.medications)') &&
  patientPageSource.includes('item.label') &&
  patientPageSource.includes('item.details'),
  'Timeline must expose recorded non-drug orders without claiming that tests were performed.');
console.log('PASS QW-047: synthetic laboratory/radiology/other order provenance and UI contracts.');

// QW-048 — Explicitly distinguish cancelled, draft, dispensed and legacy documents.
const statusFixtures = [
  ['draft', 'Brouillon — non validée'],
  ['validated', 'Validée (statut enregistré)'],
  ['dispensed', 'Délivrance enregistrée (statut)'],
  ['cancelled', 'Annulée — ne pas considérer comme active'],
  [undefined, 'Statut non renseigné (ancien dossier)'],
  [null, 'Statut inconnu ou invalide — vérification nécessaire'],
  ['unknown', 'Statut inconnu ou invalide — vérification nécessaire'],
  [42, 'Statut inconnu ou invalide — vérification nécessaire'],
] as const;
for (const [status, expected] of statusFixtures) {
  assert.equal(documentedPrescriptionStatus(status), expected);
}
assert.ok(patientPageSource.includes('Statut documentaire :') &&
  patientPageSource.includes('documentedPrescriptionStatus(entry.prescription.status)') &&
  patientPageSource.includes('documentedSupplementalOrders(entry.prescription)'),
  'Patient timeline must label prescription status without hiding historical orders.');
console.log('PASS QW-048: synthetic cancelled/draft/dispensed prescription statuses and timeline contract.');

// QW-049 — Patient timeline filters do not mutate or reorder dated records.
const timelineFixture = [
  { id: 'c2', type: 'consultation' as const },
  { id: 'p1', type: 'prescription' as const },
  { id: 'c1', type: 'consultation' as const },
];
const timelineBefore = JSON.stringify(timelineFixture);
assert.deepEqual(filterRecordedEvents(timelineFixture, 'all').map(item => item.id), ['c2', 'p1', 'c1']);
assert.deepEqual(filterRecordedEvents(timelineFixture, 'consultation').map(item => item.id), ['c2', 'c1']);
assert.deepEqual(filterRecordedEvents(timelineFixture, 'prescription').map(item => item.id), ['p1']);
assert.deepEqual(filterRecordedEvents([], 'prescription'), []);
assert.equal(JSON.stringify(timelineFixture), timelineBefore, 'Filtering must never modify clinical records.');
assert.ok(patientPageSource.includes('const visibleMedicalTimeline = filterRecordedEvents(medicalTimeline, timelineFilter)') &&
  patientPageSource.includes('pagedMedicalTimeline.map((entry)') &&
  patientPageSource.includes('id="patient-timeline-filter"') &&
  patientPageSource.includes('Consultations uniquement') &&
  patientPageSource.includes('Ordonnances uniquement') &&
  patientPageSource.includes('Aucun événement correspondant à la recherche ou au filtre pour ce patient.'),
  'Patient view must offer read-only filters with accurate empty states.');
console.log('PASS QW-049: synthetic medical timeline event filters and patient UI contracts.');

// QW-050 — Search is browser-local, accent-insensitive and read-only.
const searchFixture = [
  { id: 'c1', type: 'consultation' as const, consultation: {
    motif: 'Dyspnée', specialty: 'Cardiologie', diagnosis: '', symptoms: 'Douleur fictive' } },
  { id: 'p1', type: 'prescription' as const, prescription: {
    advice: 'À revoir', medications: [{ id: 'm1', name: 'Paracétamol fictif', dosage: '500 mg', route: 'orale', frequency: 'selon ordonnance fictive', duration: '2 jours', instructions: '' }],
    items: [{ id: 'rx1', category: 'radiology' as const, name: 'Échographie fictive', details: 'demande' }] } },
  { id: 'c2', type: 'consultation' as const, consultation: {
    motif: 'Contrôle', specialty: 'Médecine de famille', diagnosis: '', symptoms: '' } },
];
const searchOriginal = JSON.stringify(searchFixture);
assert.deepEqual(searchRecordedEvents(searchFixture, 'DYSPNEE').map(x => x.id), ['c1']);
assert.deepEqual(searchRecordedEvents(searchFixture, 'echographie').map(x => x.id), ['p1']);
assert.deepEqual(searchRecordedEvents(searchFixture, 'paracetamol').map(x => x.id), ['p1']);
assert.deepEqual(searchRecordedEvents(searchFixture, 'famille').map(x => x.id), ['c2']);
assert.deepEqual(searchRecordedEvents(searchFixture, '   ').map(x => x.id), ['c1', 'p1', 'c2']);
assert.deepEqual(searchRecordedEvents(searchFixture, 'absence').map(x => x.id), []);
assert.equal(JSON.stringify(searchFixture), searchOriginal, 'Local search must not mutate records.');
assert.ok(patientPageSource.includes('searchRecordedEvents(visibleMedicalTimeline, timelineSearch)') &&
  patientPageSource.includes('id="patient-timeline-search"') &&
  patientPageSource.includes('pagedMedicalTimeline.map((entry)'),
  'Patient timeline must search only the already selected and type-filtered events.');
console.log('PASS QW-050: accent-insensitive local timeline search and UI contracts.');

// QW-051 — Recorded prescription statuses remain documentary and are filtered
// only within the current patient's already selected event set.
const documentedStatusFixtures = [
  { id: 'c1', type: 'consultation' as const },
  { id: 'p0', type: 'prescription' as const, prescription: { status: 'draft' } },
  { id: 'p1', type: 'prescription' as const, prescription: { status: 'validated' } },
  { id: 'p2', type: 'prescription' as const, prescription: { status: 'dispensed' } },
  { id: 'p3', type: 'prescription' as const, prescription: { status: 'cancelled' } },
  { id: 'p4', type: 'prescription' as const, prescription: {} },
  { id: 'p5', type: 'prescription' as const, prescription: { status: 'invalid' } },
];
const statusOriginal = JSON.stringify(documentedStatusFixtures);
assert.deepEqual(filterDocumentedPrescriptionStatus(documentedStatusFixtures, 'all').map(x => x.id),
  ['c1', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
assert.deepEqual(filterDocumentedPrescriptionStatus(documentedStatusFixtures, 'cancelled').map(x => x.id), ['p3']);
assert.deepEqual(filterDocumentedPrescriptionStatus(documentedStatusFixtures, 'dispensed').map(x => x.id), ['p2']);
assert.deepEqual(filterDocumentedPrescriptionStatus(documentedStatusFixtures, 'draft').map(x => x.id), ['p0']);
assert.deepEqual(filterDocumentedPrescriptionStatus(documentedStatusFixtures, 'unknown').map(x => x.id), ['p4', 'p5']);
assert.equal(JSON.stringify(documentedStatusFixtures), statusOriginal, 'Status filter may not alter records.');
assert.ok(patientPageSource.includes("timelineFilter === 'prescription'") &&
  patientPageSource.includes('filterDocumentedPrescriptionStatus(searchedMedicalTimeline, prescriptionStatusFilter)') &&
  patientPageSource.includes('pagedMedicalTimeline.map((entry)') &&
  patientPageSource.includes('id="patient-timeline-status"') &&
  patientPageSource.includes("setPrescriptionStatusFilter('all')"),
  'Status select must be offered only for prescriptions, reset on type change and filter events without writing.');
console.log('PASS QW-051: synthetic documentary prescription status filters and patient UI contracts.');

// QW-052 — The timeline date range uses verified civil dates and never
// mutates event data or pretends malformed imported timestamps are valid.
const rangeFixtures = [
  { id: 'old', date: '2026-11-09' },
  { id: 'start', date: '2026-11-10T00:00:00Z' },
  { id: 'end', date: '2026-11-10T23:59:59Z' },
  { id: 'new', date: '2026-11-11' },
  { id: 'unknown', date: '2026-11-31' },
];
const rangeOriginal = JSON.stringify(rangeFixtures);
assert.deepEqual(filterTimelineByDateRange(rangeFixtures, '', '').map(item => item.id), ['old', 'start', 'end', 'new', 'unknown']);
assert.deepEqual(filterTimelineByDateRange(rangeFixtures, '2026-11-10', '2026-11-10').map(item => item.id), ['start', 'end']);
assert.deepEqual(filterTimelineByDateRange(rangeFixtures, '2026-11-11', '').map(item => item.id), ['new']);
assert.deepEqual(filterTimelineByDateRange(rangeFixtures, '', '2026-11-09').map(item => item.id), ['old']);
assert.deepEqual(filterTimelineByDateRange(rangeFixtures, '2026-11-11', '2026-11-09'), []);
assert.deepEqual(filterTimelineByDateRange(rangeFixtures, '2026-02-30', '').map(item => item.id), ['old', 'start', 'end', 'new', 'unknown']);
assert.equal(JSON.stringify(rangeFixtures), rangeOriginal, 'Date filtering must not mutate records.');
assert.ok(patientPageSource.includes('filterTimelineByDateRange(') &&
  patientPageSource.includes('id="patient-timeline-from"') &&
  patientPageSource.includes('id="patient-timeline-to"') &&
  patientPageSource.includes('pagedMedicalTimeline.map((entry)') &&
  patientPageSource.includes('Les événements sans date valide ne figurent pas'),
  'Date filters must be read-only, inclusive and explicit about unknown dates.');
console.log('PASS QW-052: inclusive UTC civil-date timeline filters and UI contract.');

// QW-053 — Specialty filtering must only use documented consultations from
// the currently selected patient, preserving original order and records.
const specialtyFixtures = [
  { id: 'c1', type: 'consultation' as const, consultation: { specialty: 'Cardiologie' } },
  { id: 'p1', type: 'prescription' as const },
  { id: 'c2', type: 'consultation' as const, consultation: { specialty: '' } },
  { id: 'c3', type: 'consultation' as const, consultation: { specialty: 'ORL' } },
  { id: 'c4', type: 'consultation' as const, consultation: { specialty: 'Cardiologie' } },
];
const specialtyBefore = JSON.stringify(specialtyFixtures);
assert.deepEqual(documentedSpecialtyOptions([
  { specialty: 'ORL' }, { specialty: 'Cardiologie' },
  { specialty: 'ORL ' }, {}, { specialty: ' ' },
]), ['Cardiologie', 'ORL']);
assert.deepEqual(filterTimelineBySpecialty(specialtyFixtures, 'specialty:Cardiologie').map(x => x.id), ['c1', 'c4']);
assert.deepEqual(filterTimelineBySpecialty(specialtyFixtures, 'missing').map(x => x.id), ['c2']);
assert.deepEqual(filterTimelineBySpecialty(specialtyFixtures, 'all').map(x => x.id), ['c1', 'p1', 'c2', 'c3', 'c4']);
assert.equal(JSON.stringify(specialtyFixtures), specialtyBefore, 'Specialty filter must not mutate records.');
assert.ok(patientPageSource.includes('documentedSpecialtyOptions(patientConsultations)') &&
  patientPageSource.includes('filterTimelineBySpecialty(dateFilteredMedicalTimeline, timelineSpecialtyFilter)') &&
  patientPageSource.includes('id="patient-timeline-specialty"') &&
  patientPageSource.includes('pagedMedicalTimeline.map((entry)') &&
  patientPageSource.includes("setTimelineSpecialtyFilter('all')"),
  'Specialty filter must be patient-scoped and reset when event type changes.');
console.log('PASS QW-053: documented specialty-only patient timeline filtering and UI contract.');

// QW-054 — Limit long timelines without deleting, reordering or persisting
// changes to any recorded events.
const manyTimelineEvents = Array.from({ length: 64 }, (_, index) => ({ id: 'event-' + index }));
const manyBefore = JSON.stringify(manyTimelineEvents);
assert.equal(limitTimelineEvents(manyTimelineEvents, '10').length, 10);
assert.equal(limitTimelineEvents(manyTimelineEvents, '25').length, 25);
assert.equal(limitTimelineEvents(manyTimelineEvents, '50').length, 50);
assert.equal(limitTimelineEvents(manyTimelineEvents, 'all').length, 64);
assert.equal(limitTimelineEvents(manyTimelineEvents, '10')[0].id, 'event-0');
assert.equal(JSON.stringify(manyTimelineEvents), manyBefore, 'Limiting must never modify storage events.');
assert.ok(patientPageSource.includes('limitTimelineEvents(sortedMedicalTimeline, timelineDisplayLimit)') &&
  patientPageSource.includes('pagedMedicalTimeline.map((entry)') &&
  patientPageSource.includes('id="patient-timeline-limit"') &&
  patientPageSource.includes('Tous les événements'),
  'Clinical history must remain fully accessible with a truthful display counter.');
console.log('PASS QW-054: long timeline display limit, full-history option and no mutation.');

// QW-055 — Filters are cleared on every patient switch and by an explicit
// control, preventing stale search criteria from being inherited by another
// fictitious patient dossier.
assert.ok(patientPageSource.includes('function resetTimelineControls()') &&
  patientPageSource.includes('function changeSelectedPatient(nextPatientId: string | null)') &&
  patientPageSource.includes('setTimelineFromDate(\'\')') &&
  patientPageSource.includes('setTimelineToDate(\'\')') &&
  patientPageSource.includes('setTimelineDisplayLimit(\'10\')') &&
  patientPageSource.includes('setTimelineSpecialtyFilter(\'all\')') &&
  patientPageSource.includes('setPrescriptionStatusFilter(\'all\')') &&
  patientPageSource.includes('changeSelectedPatient(patient.id)') &&
  patientPageSource.includes('changeSelectedPatient(newPatient.id)') &&
  patientPageSource.includes('onClick={resetTimelineControls}') &&
  patientPageSource.includes('Réinitialiser les filtres'),
  'All patient navigation and reset actions must clear the local timeline controls.');
console.log('PASS QW-055: explicit reset of timeline controls and safe patient switching.');

// QW-056 — Documentary counters are patient-local, read-only and do not
// transform missing clinical information into asserted findings.
const qualityFixtures = [
  { type: 'consultation' as const, date: '2026-11-11', consultation: { specialty: 'ORL' } },
  { type: 'consultation' as const, date: 'date invalide', consultation: { specialty: ' ' } },
  { type: 'prescription' as const, date: '2026-11-10T08:00:00Z', prescription: { status: 'cancelled' } },
  { type: 'prescription' as const, date: '2026-02-30', prescription: { status: 'unknown' } },
  { type: 'prescription' as const, date: '2026-11-09', prescription: {} },
];
const qualityBefore = JSON.stringify(qualityFixtures);
assert.deepEqual(summarizeTimelineDocumentation(qualityFixtures), {
  total: 5, datesUnspecified: 2, specialtiesUnspecified: 1, prescriptionStatusesUnspecified: 2,
});
assert.deepEqual(summarizeTimelineDocumentation([]), {
  total: 0, datesUnspecified: 0, specialtiesUnspecified: 0, prescriptionStatusesUnspecified: 0,
});
assert.equal(JSON.stringify(qualityFixtures), qualityBefore, 'Document quality counters cannot change records.');
assert.ok(patientPageSource.includes('summarizeTimelineDocumentation(medicalTimeline)') &&
  patientPageSource.includes('aria-label="Qualité documentaire de la chronologie"') &&
  patientPageSource.includes('Ces nombres décrivent les documents enregistrés, sans interprétation médicale.'),
  'Patient timeline quality counters must be descriptive and based on the selected dossier.');
console.log('PASS QW-056: patient timeline documentation completeness counters and no mutation.');

// QW-063 — Oldest/newest chronological presentation is pure and dates unknown
// are always disclosed last, independent of sort choice or patient identity.
const sortFixtures = [
  { id: 'new', type: 'consultation', date: '2026-11-12' },
  { id: 'invalid', type: 'prescription', date: '2026-02-30' },
  { id: 'old', type: 'consultation', date: '2026-01-02' },
  { id: 'same', type: 'prescription', date: '2026-11-12' },
];
const sortBefore = JSON.stringify(sortFixtures);
assert.deepEqual(sortTimelineByRecordedDate(sortFixtures, 'newest').map(x => x.id), ['new', 'same', 'old', 'invalid']);
assert.deepEqual(sortTimelineByRecordedDate(sortFixtures, 'oldest').map(x => x.id), ['old', 'new', 'same', 'invalid']);
assert.deepEqual(sortTimelineByRecordedDate([], 'oldest'), []);
assert.equal(JSON.stringify(sortFixtures), sortBefore, 'Sorting must not mutate records.');
assert.ok(patientPageSource.includes('sortTimelineByRecordedDate(qualityFilteredMedicalTimeline, timelineSortDirection)') &&
  patientPageSource.includes('limitTimelineEvents(sortedMedicalTimeline, timelineDisplayLimit)') &&
  patientPageSource.includes('id="patient-timeline-sort"') &&
  patientPageSource.includes("setTimelineSortDirection('newest')") &&
  patientPageSource.includes('Les dates non renseignées restent après les dates valides.'),
  'Timeline order selector must apply after existing filters and before display limit, reset on patient change.');
console.log('PASS QW-063: pure chronological sort, unknown dates last and UI contract.');

// QW-064 — Display only dated-unknown records without inventing dates.
const undatedFixtures = [
  { id: 'd1', date: '2026-11-11' },
  { id: 'd2', date: 'date non fiable' },
  { id: 'd3', date: '' },
  { id: 'd4', date: '2026-02-30' },
  { id: 'd5', date: '2026-11-09T08:00:00Z' },
];
const undatedBefore = JSON.stringify(undatedFixtures);
assert.deepEqual(filterTimelineUndated(undatedFixtures).map(x => x.id), ['d2', 'd3', 'd4']);
assert.deepEqual(filterTimelineUndated([]), []);
assert.equal(JSON.stringify(undatedFixtures), undatedBefore, 'Undated selection may not mutate historical documents.');
assert.ok(patientPageSource.includes('filterTimelineUndated(kindFilteredMedicalTimeline)') &&
  patientPageSource.includes('id="patient-timeline-undated"') &&
  patientPageSource.includes('disabled={timelineUndatedOnly}') &&
  patientPageSource.includes('setTimelineUndatedOnly(false)') &&
  patientPageSource.includes("setTimelineFromDate('')") &&
  patientPageSource.includes("setTimelineToDate('')"),
  'Undated-only mode must exclude date ranges and reset on patient change.');
console.log('PASS QW-064: synthetic unknown-date filter, no mutation and UI contract.');

// QW-065 — Reuse the same documentary gap rules as the quality counter,
// staying read-only and strictly limited to passed-in patient events.
const gapFixture = [
  { id: 'c1', type: 'consultation' as const, date: '2026-11-11', consultation: { specialty: 'ORL' } },
  { id: 'c2', type: 'consultation' as const, date: '2026-11-10', consultation: { specialty: '' } },
  { id: 'p1', type: 'prescription' as const, date: '2026-11-09', prescription: { status: 'cancelled' } },
  { id: 'p2', type: 'prescription' as const, date: 'no date', prescription: { status: 'draft' } },
  { id: 'p3', type: 'prescription' as const, date: '2026-11-08', prescription: { status: 'made-up' } },
];
const gapsBefore = JSON.stringify(gapFixture);
assert.deepEqual(filterTimelineDocumentationGaps(gapFixture).map(e => e.id), ['c2', 'p2', 'p3']);
assert.deepEqual(filterTimelineDocumentationGaps([]), []);
assert.equal(JSON.stringify(gapFixture), gapsBefore, 'Documentation gap view must not mutate any records.');
assert.ok(patientPageSource.includes('filterTimelineDocumentationGaps(specialtyFilteredMedicalTimeline)') &&
  patientPageSource.includes('id="patient-timeline-gaps"') &&
  patientPageSource.includes('sortTimelineByRecordedDate(qualityFilteredMedicalTimeline, timelineSortDirection)') &&
  patientPageSource.includes('setTimelineGapsOnly(false)') &&
  patientPageSource.includes('sans interprétation médicale.'),
  'Documentation gap view must be scoped to already selected/filtered records and remain neutral.');
console.log('PASS QW-065: documentary-only gap review and immutable, patient-scoped UI contract.');

// QW-066 — Presence of a prescribed category is not proof of a performed exam.
const kindFixtures = [
  { id: 'legacy', type: 'prescription' as const, prescription: { medications: [{ name: 'Traitement fictif' }] } },
  { id: 'mixed', type: 'prescription' as const, prescription: { items: [
    { category: 'laboratory', name: 'NFS fictive' }, { category: 'radiology', name: 'Radio fictive' },
    { category: 'other', name: 'Avis fictif' },
  ] } },
  { id: 'newdrug', type: 'prescription' as const, prescription: { items: [{ category: 'treatment', name: 'Traitement nouveau fictif' }] } },
  { id: 'invalid', type: 'prescription' as const, prescription: { items: [{ category: 'laboratory', name: '' }] } },
  { id: 'visit', type: 'consultation' as const },
];
const kindBefore = JSON.stringify(kindFixtures);
assert.deepEqual(filterTimelineByRecordedOrderKind(kindFixtures, 'all').map(x => x.id), ['legacy', 'mixed', 'newdrug', 'invalid', 'visit']);
assert.deepEqual(filterTimelineByRecordedOrderKind(kindFixtures, 'treatment').map(x => x.id), ['legacy', 'newdrug']);
assert.deepEqual(filterTimelineByRecordedOrderKind(kindFixtures, 'laboratory').map(x => x.id), ['mixed']);
assert.deepEqual(filterTimelineByRecordedOrderKind(kindFixtures, 'radiology').map(x => x.id), ['mixed']);
assert.deepEqual(filterTimelineByRecordedOrderKind(kindFixtures, 'other').map(x => x.id), ['mixed']);
assert.equal(JSON.stringify(kindFixtures), kindBefore, 'Recorded category filter must not mutate prescriptions.');
assert.ok(patientPageSource.includes('filterTimelineByRecordedOrderKind(statusFilteredMedicalTimeline, timelineOrderKind)') &&
  patientPageSource.includes('id="patient-timeline-kind"') &&
  patientPageSource.includes('setTimelineOrderKind(\'all\')') &&
  patientPageSource.includes('aucun acte n\'est présumé réalisé.'),
  'Prescription kind filter must apply only to documented orders, reset on type/patient changes.');
console.log('PASS QW-066: prescribed order category read-only filter, legacy meds and no mutation.');

// QW-069 — Source-only performance contract: memoized source events depend on
// patient identity and clinical sources, never on input/search state.
assert.ok(patientPageSource.includes('const patientConsultations = useMemo(') &&
  patientPageSource.includes('const patientPrescriptions = useMemo(') &&
  patientPageSource.includes('[consultations, selected?.id]') &&
  patientPageSource.includes('[prescriptions, selected?.id]') &&
  patientPageSource.includes('const medicalTimeline = useMemo(() => orderRecordedNewest([') &&
  patientPageSource.includes(']), [patientConsultations, patientPrescriptions]);'),
  'Base dossier timelines must update on patient/source change without sorting again for every UI keystroke.');
console.log('PASS QW-069: timeline memoization source contract.');

console.log('PASS: legacy document linkage, 10 orphan records detected, visible dashboard warning and zero storage mutations.');

// QW-076: imported duplicate consultation IDs must never update multiple records.
{
  const ids = [{ id: 'unique' }, { id: 'duplicate' }, { id: 'duplicate' }];
  const before = JSON.stringify(ids);
  assert.equal(hasUniqueConsultationId('unique', ids), true);
  assert.equal(hasUniqueConsultationId('duplicate', ids), false);
  assert.equal(hasUniqueConsultationId('absent', ids), false);
  assert.equal(hasUniqueConsultationId('', ids), false);
  assert.equal(hasUniqueConsultationId(null, ids), false);
  assert.equal(JSON.stringify(ids), before);
  const hookSource = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const updateBlock = hookSource.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  assert.ok(updateBlock.includes('hasUniqueConsultationId(id, currentConsultations)') &&
    updateBlock.indexOf('hasUniqueConsultationId(') < updateBlock.indexOf('saveConsultations(updated)'),
    'Consultation update must reject ambiguous IDs before any persistence.');
}
console.log('PASS QW-076: duplicate/missing consultation identifiers refuse update.');

// QW-077: deletion must also fail closed for duplicate or missing IDs.
{
  const ids = [{ id: 'one' }, { id: 'same' }, { id: 'same' }];
  assert.equal(hasUniqueConsultationId('one', ids), true);
  assert.equal(hasUniqueConsultationId('same', ids), false);
  assert.equal(hasUniqueConsultationId('unknown', ids), false);
  const code = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const deletion = code.split('const deleteConsultation = useCallback(')[1]
    ?.split('// ORDONNANCES')[0] ?? '';
  assert.ok(deletion.includes('if (!hasUniqueConsultationId(id, currentConsultations)) return false;') &&
    deletion.indexOf('hasUniqueConsultationId(') < deletion.indexOf('saveConsultations(updated)'),
    'No consultation may be deleted by an ambiguous or absent ID.');
}
console.log('PASS QW-077: ambiguous consultation IDs cannot trigger deletion.');

// QW-080: an imported duplicated prescription identifier must never
// update multiple prescriptions through the central storage hook.
{
  const importedIds = [{ id: 'rx-valid' }, { id: 'rx-duplicate' }, { id: 'rx-duplicate' }];
  const before = JSON.stringify(importedIds);
  assert.equal(hasUniquePrescriptionId('rx-valid', importedIds), true);
  assert.equal(hasUniquePrescriptionId('rx-duplicate', importedIds), false);
  assert.equal(hasUniquePrescriptionId('rx-missing', importedIds), false);
  assert.equal(hasUniquePrescriptionId('', importedIds), false);
  assert.equal(hasUniquePrescriptionId(null, importedIds), false);
  assert.equal(JSON.stringify(importedIds), before, 'Guard must not mutate prescriptions.');
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('hasUniquePrescriptionId(id, currentPrescriptions)') &&
    update.indexOf('hasUniquePrescriptionId(') < update.indexOf('savePrescriptions(updated)'),
    'The storage hook must reject ambiguous prescription IDs before any write.');
}
console.log('PASS QW-080: duplicate prescription ID rejected on update.');

// QW-081: deleting by a duplicated/missing prescription ID must be refused.
{
  const importedIds = [{ id: 'rx-one' }, { id: 'rx-same' }, { id: 'rx-same' }];
  assert.equal(hasUniquePrescriptionId('rx-one', importedIds), true);
  assert.equal(hasUniquePrescriptionId('rx-same', importedIds), false);
  assert.equal(hasUniquePrescriptionId('rx-absent', importedIds), false);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const deletion = hook.split('const deletePrescription = useCallback(')[1]
    ?.split('// PARAMÈTRES')[0] ?? '';
  assert.ok(deletion.includes('if (!hasUniquePrescriptionId(id, currentPrescriptions)) return false;') &&
    deletion.indexOf('hasUniquePrescriptionId(') < deletion.indexOf('savePrescriptions(updated)'),
    'Prescription deletion must reject ambiguous identifiers before persistence.');
}
console.log('PASS QW-081: duplicated prescription ID cannot trigger deletion.');

// QW-082: patient updates are rejected on duplicate, absent or blank ID.
{
  const importedPatients = [{ id: 'safe' }, { id: 'collision' }, { id: 'collision' }];
  const original = JSON.stringify(importedPatients);
  assert.equal(hasConfirmedPatientSelection('safe', importedPatients), true);
  assert.equal(hasConfirmedPatientSelection('collision', importedPatients), false);
  assert.equal(hasConfirmedPatientSelection('unlinked', importedPatients), false);
  assert.equal(hasConfirmedPatientSelection('', importedPatients), false);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const patientUpdate = hook.split('const updatePatient = useCallback(')[1]
    ?.split('const deletePatient = useCallback(')[0] ?? '';
  assert.ok(patientUpdate.includes('hasConfirmedPatientSelection(id, currentPatients)') &&
    patientUpdate.indexOf('hasConfirmedPatientSelection(') < patientUpdate.indexOf('savePatients(updated)'),
    'Do not write multiple patient records sharing the same imported ID.');
  assert.equal(JSON.stringify(importedPatients), original);
}
console.log('PASS QW-082: duplicate patient ID blocks update before persistence.');

// QW-083: deletion may not remove all duplicate patient IDs from an import.
{
  const importedPatients = [{ id: 'kept' }, { id: 'duplicate' }, { id: 'duplicate' }];
  assert.equal(hasConfirmedPatientSelection('kept', importedPatients), true);
  assert.equal(hasConfirmedPatientSelection('duplicate', importedPatients), false);
  assert.equal(hasConfirmedPatientSelection('missing', importedPatients), false);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const deletion = hook.split('const deletePatient = useCallback(')[1]
    ?.split('const restoreDeletedPatient = useCallback(')[0] ?? '';
  assert.ok(deletion.includes('if (!hasConfirmedPatientSelection(id, current.patients)) return false;') &&
    deletion.indexOf('hasConfirmedPatientSelection(') < deletion.indexOf('saveDeletedPatients(') &&
    deletion.indexOf('hasConfirmedPatientSelection(') < deletion.indexOf('savePatients('),
    'Patient deletion must be refused on ambiguous IDs before trash or patient writes.');
}
console.log('PASS QW-083: patient deletion fails closed on imported duplicate IDs.');

// QW-084: restoring a duplicate trash ID must not delete every matching entry.
{
  const trash = [
    { patient: { id: 'restore-ok' } },
    { patient: { id: 'restore-collision' } },
    { patient: { id: 'restore-collision' } },
  ];
  const before = JSON.stringify(trash);
  assert.equal(hasConfirmedPatientSelection('restore-ok', trash.map(row => row.patient)), true);
  assert.equal(hasConfirmedPatientSelection('restore-collision', trash.map(row => row.patient)), false);
  assert.equal(hasConfirmedPatientSelection('missing', trash.map(row => row.patient)), false);
  assert.equal(JSON.stringify(trash), before);
  const source = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const restore = source.split('const restoreDeletedPatient = useCallback(')[1]
    ?.split('// CONSULTATIONS')[0] ?? '';
  assert.ok(restore.includes('hasConfirmedPatientSelection(id, deletedPatients.map(item => item.patient))') &&
    restore.indexOf('hasConfirmedPatientSelection(') < restore.indexOf('savePatients(') &&
    restore.indexOf('hasConfirmedPatientSelection(') < restore.indexOf('saveDeletedPatients('),
    'Duplicated trash IDs must be refused before restoring or deleting any backup.');
}
console.log('PASS QW-084: ambiguous deleted patient ID cannot be restored.');

// QW-085: creating a consultation requires one existing patient ID at the
// storage-hook boundary, even if the caller bypasses the normal form.
{
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const add = hook.split('const addConsultation = useCallback(')[1]
    ?.split('const updateConsultation = useCallback(')[0] ?? '';
  assert.ok(add.includes('hasConfirmedPatientSelection(consultation.patientId, currentData.patients)') &&
    add.indexOf('hasConfirmedPatientSelection(') < add.indexOf('createId()') &&
    add.indexOf('hasConfirmedPatientSelection(') < add.indexOf('saveConsultations('),
    'Consultation creation must refuse missing or duplicate patient IDs before writing.');
  const sample = [{ id: 'patient' }, { id: 'collision' }, { id: 'collision' }];
  assert.equal(hasConfirmedPatientSelection('patient', sample), true);
  assert.equal(hasConfirmedPatientSelection('collision', sample), false);
  assert.equal(hasConfirmedPatientSelection('orphan', sample), false);
}
console.log('PASS QW-085: central consultation creation requires unique patient.');

// QW-086: prescriptions must never be created against an unconfirmed patient,
// including direct calls not passing through the user-facing form.
{
  const source = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const add = source.split('const addPrescription = useCallback(')[1]
    ?.split('const updatePrescription = useCallback(')[0] ?? '';
  assert.ok(add.includes('hasConfirmedPatientSelection(prescription.patientId, currentData.patients)') &&
    add.indexOf('hasConfirmedPatientSelection(') < add.indexOf('createId()') &&
    add.indexOf('hasConfirmedPatientSelection(') < add.indexOf('savePrescriptions('),
    'Prescription add must check unique patient identity before writing.');
  const records = [{ id: 'unique' }, { id: 'duplicate' }, { id: 'duplicate' }];
  assert.equal(hasConfirmedPatientSelection('unique', records), true);
  assert.equal(hasConfirmedPatientSelection('duplicate', records), false);
  assert.equal(hasConfirmedPatientSelection('unknown', records), false);
}
console.log('PASS QW-086: central prescription creation guarded by patient identity.');

// QW-087: preserve an inventory audit trail linked to a prescription, including
// dispenses and returns imported with older or missing prescription statuses.
{
  const movements = [
    { prescriptionId: 'rx-dispensed' },
    { prescriptionId: 'rx-returned' },
    { prescriptionId: undefined },
  ];
  const before = JSON.stringify(movements);
  assert.equal(prescriptionHasRecordedStockMovement('rx-dispensed', movements), true);
  assert.equal(prescriptionHasRecordedStockMovement('rx-returned', movements), true);
  assert.equal(prescriptionHasRecordedStockMovement('rx-unlinked', movements), false);
  assert.equal(prescriptionHasRecordedStockMovement('', movements), false);
  assert.equal(JSON.stringify(movements), before, 'No inventory mutation is permitted.');
  const source = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const deletion = source.split('const deletePrescription = useCallback(')[1]
    ?.split('// PARAMÈTRES')[0] ?? '';
  assert.ok(deletion.includes('prescriptionHasRecordedStockMovement(id, getInventoryData().movements)') &&
    deletion.indexOf('prescriptionHasRecordedStockMovement(') < deletion.indexOf('savePrescriptions(updated)'),
    'Deleting an order referenced by a stock movement must be blocked before persistence.');
}
console.log('PASS QW-087: inventory movement links prevent prescription deletion.');

// QW-088: the prescription screen must never silently imply that a blocked
// deletion succeeded, including duplicate imported IDs or stock trace links.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const block = source.split('function confirmDeletePrescription(')[1]
    ?.split('function resetForm()')[0] ?? '';
  assert.ok(block.includes("if (!deletePrescription(id))") &&
    block.includes('Suppression non effectuée') &&
    block.indexOf('window.confirm(') < block.indexOf('if (!deletePrescription(id))') &&
    block.indexOf('if (!deletePrescription(id))') < block.indexOf('window.alert('),
    'A blocked prescription deletion must show explicit feedback after consent.');
}
console.log('PASS QW-088: blocked prescription delete gets explicit UI feedback.');

// QW-089: a prescription edit, including the step before stock deduction,
// must never silently reassign the historical document to another patient.
{
  const current = { patientId: 'patient-a' };
  assert.equal(preservesPrescriptionPatientId(current, {}), true);
  assert.equal(preservesPrescriptionPatientId(current, { patientId: 'patient-a' }), true);
  assert.equal(preservesPrescriptionPatientId(current, { patientId: 'patient-b' }), false);
  assert.equal(preservesPrescriptionPatientId(current, { patientId: '' }), false);
  assert.equal(preservesPrescriptionPatientId(current, { patientId: undefined }), false);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('preservesPrescriptionPatientId(currentPrescription, changes)') &&
    update.indexOf('preservesPrescriptionPatientId(') < update.indexOf('savePrescriptions(updated)'),
    'Cross-patient prescription reassignment must be refused before persistence.');
}
console.log('PASS QW-089: prescription patient ownership cannot change silently.');

// QW-090: dispensing must verify unique order and patient ownership prior
// to the preliminary save and any real inventory adjustment.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const dispense = source.split('function dispenseSavedPrescription()')[1]
    ?.split('function handlePartialReturn(')[0] ?? '';
  assert.ok(dispense.includes('matchingPrescriptions.length === 1') &&
    dispense.includes('savedPrescription.patientId !== patientId') &&
    dispense.includes('hasConfirmedPatientSelection(patientId, latestData.patients)') &&
    dispense.includes('aucune délivrance ni déduction de stock') &&
    dispense.indexOf('matchingPrescriptions.length === 1') < dispense.indexOf('updatePrescription(') &&
    dispense.indexOf('savedPrescription.patientId !== patientId') < dispense.indexOf('dispenseInventoryItems('),
    'A wrong-patient or duplicate order must not reach inventory dispensing.');
}
console.log('PASS QW-090: reject ambiguous/wrong-patient dispense before stock write.');

// QW-091: never return dispensed stock for a stale or ambiguous imported order.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const cancellation = source.split('function cancelPrescription(')[1]
    ?.split('function openPrescription(')[0] ?? '';
  assert.ok(cancellation.includes('matchingPrescriptions.length === 1') &&
    cancellation.includes('current.patientId !== item.patientId') &&
    cancellation.includes('hasConfirmedPatientSelection(current.patientId, currentData.patients)') &&
    cancellation.includes('current.status === \'dispensed\'') &&
    cancellation.includes('cancelDispensedPrescriptionStock({ prescriptionId: current.id })') &&
    cancellation.indexOf('matchingPrescriptions.length === 1') < cancellation.indexOf('cancelDispensedPrescriptionStock(') &&
    cancellation.indexOf('hasConfirmedPatientSelection(') < cancellation.indexOf('cancelDispensedPrescriptionStock('),
    'No stock return before confirming the unique current prescription and patient.');
}
console.log('PASS QW-091: cancel dispensed prescription checks current identity before stock return.');

// QW-092: partial stock return requires an unambiguous, current dispensed
// prescription, a confirmed matching patient, and a unique linked movement.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const partialReturn = source.split('function handlePartialReturn(')[1]
    ?.split('function cancelPrescription(')[0] ?? '';
  assert.ok(partialReturn.includes('matchingPrescriptions.length === 1') &&
    partialReturn.includes('currentPrescription.patientId !== expectedPatientId') &&
    partialReturn.includes("currentPrescription.status !== 'dispensed'") &&
    partialReturn.includes('hasConfirmedPatientSelection(currentPrescription.patientId, latestData.patients)') &&
    partialReturn.includes('matchingMovements.length === 1') &&
    partialReturn.includes("currentMovement.type !== 'dispense'") &&
    partialReturn.includes('currentMovement.prescriptionId !== currentPrescription.id') &&
    partialReturn.includes('currentMovement.patientId !== currentPrescription.patientId') &&
    partialReturn.indexOf('matchingPrescriptions.length === 1') < partialReturn.indexOf('returnDispensedStock({') &&
    partialReturn.indexOf('window.confirm(') < partialReturn.indexOf('matchingPrescriptions.length === 1') &&
    source.includes('handlePartialReturn(item.id, item.patientId, movement.id, movement.itemName, remaining)'),
    'Partial return must re-read current prescription and movement after consent, before stock writes.');
}
console.log('PASS QW-092: a stale or cross-patient partial return cannot bypass ownership checks.');

// QW-093: opening the edit form must use only a unique current prescription
// belonging to a confirmed patient; stale history-card data cannot fill fields.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const open = source.split('function openPrescription(')[1]
    ?.split('function confirmDeletePrescription(')[0] ?? '';
  assert.ok(open.includes('const latestData = getMedicalData()') &&
    open.includes('matches.length === 1') &&
    open.includes('current.patientId !== item.patientId') &&
    open.includes('hasConfirmedPatientSelection(current.patientId, latestData.patients)') &&
    open.includes('Array.isArray(current.medications)') &&
    open.includes('setPatientId(current.patientId)') &&
    open.includes('setMedications(current.medications.map(') &&
    open.includes('setEditingId(current.id)') &&
    !open.includes('setEditingId(item.id)') &&
    open.indexOf('matches.length === 1') < open.indexOf('setPatientId(') &&
    open.indexOf('hasConfirmedPatientSelection(') < open.indexOf('setEditingId('),
    'Opening an order must refuse imported duplicates and re-read the current patient and medications.');
}
console.log('PASS QW-093: historical prescription editing cannot load a stale or ambiguous patient document.');

// QW-094: the central storage hook itself must preserve cancelled and
// dispensed prescriptions, even if the inventory log was lost on import.
{
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const deletion = hook.split('const deletePrescription = useCallback(')[1]
    ?.split('// PARAMÈTRES')[0] ?? '';
  assert.ok(deletion.includes('hasUniquePrescriptionId(id, currentPrescriptions)') &&
    deletion.includes("currentPrescription.status === 'cancelled'") &&
    deletion.includes("currentPrescription.status === 'dispensed'") &&
    deletion.includes('prescriptionHasRecordedStockMovement(id, getInventoryData().movements)') &&
    deletion.indexOf('hasUniquePrescriptionId(') < deletion.indexOf('currentPrescription.status') &&
    deletion.indexOf('currentPrescription.status') < deletion.indexOf('savePrescriptions(updated)') &&
    deletion.indexOf('prescriptionHasRecordedStockMovement(') < deletion.indexOf('savePrescriptions(updated)'),
    'Stored cancelled/dispensed prescriptions must survive direct hook deletion attempts.');
}
console.log('PASS QW-094: central deletion cannot erase cancelled or dispensed orders without movements.');

// QW-095: a previously annulled prescription can never be dispensed by a
// stale editing tab. Refuse before saving quantities or invoking stock logic.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const dispense = source.split('function dispenseSavedPrescription()')[1]
    ?.split('function handlePartialReturn(')[0] ?? '';
  const cancelGuard = dispense.indexOf("savedPrescription.status === 'cancelled'");
  assert.ok(cancelGuard > 0 &&
    dispense.includes('Délivrance refusée : cette ordonnance est annulée. Aucun stock déduit.') &&
    cancelGuard < dispense.indexOf('updatePrescription(') &&
    cancelGuard < dispense.indexOf('dispenseInventoryItems(') &&
    dispense.indexOf('matchingPrescriptions.length === 1') < cancelGuard,
    'A cancelled order must be rejected using the current stored status before any stock action.');
}
console.log('PASS QW-095: cancelled orders cannot trigger dispensing or stock deduction.');

// QW-096: a stale editing form cannot overwrite a cancelled or dispensed
// prescription (or a different patient's current prescription).
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const save = source.split('function savePrescription()')[1]
    ?.split('function updateDispensedQuantity(')[0] ?? '';
  assert.ok(save.includes('if (editingId)') &&
    save.includes('matches.length === 1') &&
    save.includes('current.patientId !== patientId') &&
    save.includes('hasConfirmedPatientSelection(patientId, currentData.patients)') &&
    save.includes("current.status === 'cancelled'") &&
    save.includes("current.status === 'dispensed'") &&
    save.includes('Modification refusée : ordonnance absente, annulée, délivrée ou dossier patient ambigu.') &&
    save.indexOf("current.status === 'cancelled'") < save.indexOf('updatePrescription(') &&
    save.indexOf("current.status === 'dispensed'") < save.indexOf('updatePrescription('),
    'Saving edits must refuse cancelled, dispensed or re-linked orders before persistence.');
}
console.log('PASS QW-096: stale form cannot edit dispensed or cancelled prescriptions.');

// QW-097: immutable finalized prescriptions at central storage boundary.
// A dispensed document may only be marked cancelled with a documented time;
// medication, patient, quantity and advice edits must remain forbidden.
{
  const nowIso = '2026-11-12T09:00:00.000Z';
  const dispensed = { status: 'dispensed' as const };
  const cancelled = { status: 'cancelled' as const };
  const draft = { status: 'draft' as const };
  assert.equal(allowsFinalizedPrescriptionUpdate(draft, { advice: 'Test fictif' }), true);
  assert.equal(allowsFinalizedPrescriptionUpdate(cancelled, { advice: 'Fictif' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(cancelled, { status: 'draft' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed, { advice: 'Fictif' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed, { medications: [] }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed, { status: 'draft' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed, { status: 'cancelled' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed,
    { status: 'cancelled', cancelledAt: 'date inconnue' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed,
    { status: 'cancelled', cancelledAt: nowIso, advice: 'Modification parasite' }), false);
  assert.equal(allowsFinalizedPrescriptionUpdate(dispensed,
    { status: 'cancelled', cancelledAt: nowIso }), true);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('allowsFinalizedPrescriptionUpdate(currentPrescription, changes)') &&
    update.indexOf('allowsFinalizedPrescriptionUpdate(') < update.indexOf('savePrescriptions(updated)'),
    'All callers must be subject to the finalized-order guard before any write.');
}
console.log('PASS QW-097: finalized prescription content immutable; explicit cancellation remains possible.');

// QW-098 — all dispense movements must have full, unambiguous return traces
// before the central hook permits the final status change to cancelled.
{
  const originals = [
    { id: 'disp-1', type: 'dispense' as const, itemId: 'lot-1',
      prescriptionId: 'rx-fictif', patientId: 'patient-fictif', quantity: 3 },
    { id: 'disp-2', type: 'dispense' as const, itemId: 'lot-2',
      prescriptionId: 'rx-fictif', patientId: 'patient-fictif', quantity: 2 },
  ];
  const returns = [
    { id: 'return-1', type: 'return' as const, itemId: 'lot-1',
      prescriptionId: 'rx-fictif', patientId: 'patient-fictif',
      quantity: 1, reversesMovementId: 'disp-1' },
    { id: 'return-2', type: 'return' as const, itemId: 'lot-1',
      prescriptionId: 'rx-fictif', patientId: 'patient-fictif',
      quantity: 2, reversesMovementId: 'disp-1' },
    { id: 'return-3', type: 'return' as const, itemId: 'lot-2',
      prescriptionId: 'rx-fictif', patientId: 'patient-fictif',
      quantity: 2, reversesMovementId: 'disp-2' },
  ];
  const complete = [...originals, ...returns];
  const before = JSON.stringify(complete);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', complete), true);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', []), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'autre-patient', complete), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('autre-rx', 'patient-fictif', complete), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', [...originals, ...returns.slice(0, 2)]), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', [...complete, returns[0]]), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', [
    ...originals, ...returns.slice(1), { ...returns[0], quantity: 4 },
  ]), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', [
    ...originals, ...returns.slice(1), { ...returns[0], patientId: 'autre-patient' },
  ]), false);
  assert.equal(hasFullyDocumentedPrescriptionReturn('rx-fictif', 'patient-fictif', [
    ...originals, ...returns, { ...returns[2], id: 'orphan', reversesMovementId: 'unknown' },
  ]), false);
  assert.equal(JSON.stringify(complete), before, 'Validation must be read-only.');
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('hasFullyDocumentedPrescriptionReturn(id, currentPrescription.patientId, getInventoryData().movements)') &&
    update.indexOf('hasFullyDocumentedPrescriptionReturn(') < update.indexOf('savePrescriptions(updated)'),
    'Complete returns must be checked before any status write.');
}
console.log('PASS QW-098: all returns fully documented before cancelling dispensed order.');

// QW-099: malformed explicit prescription statuses from imported archives
// cannot be treated as drafts for destructive actions.
{
  assert.equal(isDeletablePrescriptionStatus(undefined), true);
  assert.equal(isDeletablePrescriptionStatus('draft'), true);
  assert.equal(isDeletablePrescriptionStatus('validated'), true);
  assert.equal(isDeletablePrescriptionStatus('dispensed'), false);
  assert.equal(isDeletablePrescriptionStatus('cancelled'), false);
  assert.equal(isDeletablePrescriptionStatus(null), false);
  assert.equal(isDeletablePrescriptionStatus('unknown'), false);
  assert.equal(isDeletablePrescriptionStatus({ status: 'draft' }), false);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const deletion = hook.split('const deletePrescription = useCallback(')[1]
    ?.split('// PARAMÈTRES')[0] ?? '';
  assert.ok(deletion.includes('isDeletablePrescriptionStatus(currentPrescription.status)') &&
    deletion.indexOf('isDeletablePrescriptionStatus(') < deletion.indexOf('savePrescriptions(updated)'),
    'Unknown imported prescription status must stop central deletion.');
}
console.log('PASS QW-099: unknown imported statuses cannot be deleted as drafts.');

// QW-100: a stock deduction requires an explicitly dispensable current
// prescription status. Legacy missing/unknown/imported values fail closed.
{
  const cases: Array<[unknown, boolean]> = [
    ['draft', true], ['validated', true], ['dispensed', false],
    ['cancelled', false], [undefined, false], [null, false],
    ['unknown', false], ['DRAFT', false], [42, false],
  ];
  for (const [status, expected] of cases) {
    assert.equal(isDispensablePrescriptionStatus(status), expected);
  }
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const dispense = source.split('function dispenseSavedPrescription()')[1]
    ?.split('function handlePartialReturn(')[0] ?? '';
  assert.ok(dispense.includes('isDispensablePrescriptionStatus(savedPrescription.status)') &&
    dispense.includes('Délivrance refusée : statut de l’ordonnance absent ou non reconnu.') &&
    dispense.indexOf('isDispensablePrescriptionStatus(') < dispense.indexOf('updatePrescription(') &&
    dispense.indexOf('isDispensablePrescriptionStatus(') < dispense.indexOf('dispenseInventoryItems(') &&
    dispense.indexOf('matchingPrescriptions.length === 1') < dispense.indexOf('isDispensablePrescriptionStatus('),
    'Missing/unknown stored status must block any pre-dispense write or stock deduction.');
}
console.log('PASS QW-100: only explicit draft/validated statuses permit inventory dispensing.');


// QW-101: all recorded statuses must be represented consistently with the
// non-prescriptive patient timeline, including missing/unknown legacy ones.
{
  for (const status of ['draft', 'validated', 'dispensed', 'cancelled', undefined, null, 'invalid']) {
    assert.ok(documentedPrescriptionStatus(status).length > 0);
  }
  assert.notEqual(documentedPrescriptionStatus('validated'), documentedPrescriptionStatus('draft'));
  assert.notEqual(documentedPrescriptionStatus('cancelled'), documentedPrescriptionStatus('draft'));
  assert.notEqual(documentedPrescriptionStatus(undefined), documentedPrescriptionStatus('draft'));
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("import { documentedPrescriptionStatus } from '../clinical/prescriptionTimeline';") &&
    source.includes('Statut documentaire : {documentedPrescriptionStatus(item.status)}') &&
    !source.includes("'Brouillon / non délivrée'"),
    'Prescription history must not mislabel validated or unknown documents as drafts.');
}
console.log('PASS QW-101: history consistently labels recorded prescription statuses.');


// QW-102 — a 'dispensed' status must correspond to existing, unique,
// positive, patient-linked stock movements, not an unsupported claim.
{
  const movement = {
    id: 'dispense-1', itemId: 'lot-fictif', type: 'dispense' as const,
    prescriptionId: 'ordonnance-fictive', patientId: 'patient-fictif', quantity: 2,
  };
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif', [movement]), true);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif', []), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-autre', 'patient-fictif', [movement]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-autre', [movement]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [{ ...movement, id: '' }]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [{ ...movement, quantity: 0 }]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [{ ...movement, quantity: Number.NaN }]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [{ ...movement, itemId: '' }]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [movement, { ...movement }]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [movement, { ...movement, id: 'dispense-2', patientId: 'patient-autre' }]), false);
  assert.equal(hasDocumentedPrescriptionDispense('ordonnance-fictive', 'patient-fictif',
    [{ ...movement, type: 'return' }]), false);
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes("changes.status === 'dispensed'") &&
    update.includes('hasDocumentedPrescriptionDispense(id, currentPrescription.patientId, getInventoryData().movements)') &&
    update.indexOf('hasDocumentedPrescriptionDispense(') < update.indexOf('savePrescriptions(updated)'),
    'No central status update to dispensed without coherent real stock trace.');
}
console.log('PASS QW-102: untraced, ambiguous or cross-patient stock cannot certify dispensing.');


// QW-103: a failed post-dispense status write can leave a draft/validated
// prescription with real stock movements. Neither the UI nor a direct hook
// caller may cancel it as an order without dispensed inventory.
{
  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  const guard = update.indexOf("changes.status === 'cancelled'");
  assert.ok(guard >= 0 &&
    update.includes("currentPrescription.status !== 'dispensed'") &&
    update.includes('prescriptionHasRecordedStockMovement(id, getInventoryData().movements)') &&
    update.indexOf('prescriptionHasRecordedStockMovement(id, getInventoryData().movements)') < update.indexOf('savePrescriptions(updated)'),
    'Central prescription cancellation must reject inconsistent non-dispensed records with stock movements.');

  const page = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const cancel = page.split('function cancelPrescription(')[1]
    ?.split('function openPrescription(')[0] ?? '';
  assert.ok(cancel.includes("current.status !== 'dispensed'") &&
    cancel.includes('prescriptionHasRecordedStockMovement(current.id, getInventoryData().movements)') &&
    cancel.includes('Annulation refusée : un mouvement de stock existe malgré le statut non délivré.') &&
    cancel.indexOf('prescriptionHasRecordedStockMovement(') < cancel.indexOf('window.confirm(') &&
    cancel.indexOf('prescriptionHasRecordedStockMovement(') < cancel.indexOf('cancelDispensedPrescriptionStock(') &&
    cancel.indexOf('prescriptionHasRecordedStockMovement(') < cancel.indexOf('updatePrescription('),
    'The UI must stop a stale-status cancellation before confirmation, stock changes or saving.');

  const trace = [{ prescriptionId: 'rx-test' }, { prescriptionId: 'other' }];
  assert.equal(prescriptionHasRecordedStockMovement('rx-test', trace), true);
  assert.equal(prescriptionHasRecordedStockMovement('other', trace), true);
  assert.equal(prescriptionHasRecordedStockMovement('missing', trace), false);
  assert.equal(prescriptionHasRecordedStockMovement('', trace), false);
}
console.log('PASS QW-103: non-dispensed status cannot hide recorded stock during cancellation.');

// QW-104: a recorded stock movement locks the medical content even when the
// prescription is still marked draft after a failed post-dispense status write.
{
  const draft = { status: 'draft' as const };
  const validated = { status: 'validated' as const };
  const dispensed = { status: 'dispensed' as const };
  const legacy = { status: undefined };
  const when = '2026-11-12T09:00:00.000Z';

  assert.equal(allowsStockLinkedPrescriptionUpdate(draft, { advice: 'Fictif' }, false), true,
    'Draft without a stock trace must still allow normal editing.');
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft, { advice: 'Fictif' }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(validated, { medications: [] }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft, { date: '2026-11-12' }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft, { status: 'cancelled' }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(legacy, { status: 'dispensed', dispensedAt: when }, true), false,
    'Missing imported status must not be silently promoted.');
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft, { status: 'dispensed' }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft, { status: 'dispensed', dispensedAt: 'invalid' }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft,
    { status: 'dispensed', dispensedAt: when, advice: 'Changed after dispense' }, true), false);
  assert.equal(allowsStockLinkedPrescriptionUpdate(draft,
    { status: 'dispensed', dispensedAt: when }, true), true);
  assert.equal(allowsStockLinkedPrescriptionUpdate(validated,
    { status: 'dispensed', dispensedAt: when }, true), true);
  assert.equal(allowsStockLinkedPrescriptionUpdate(dispensed, { advice: 'Fictif' }, true), true,
    'Finalized records continue through the separate QW-097 guard.');

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('allowsStockLinkedPrescriptionUpdate(currentPrescription, changes,') &&
    update.includes('prescriptionHasRecordedStockMovement(id, getInventoryData().movements)') &&
    update.indexOf('allowsStockLinkedPrescriptionUpdate(') < update.indexOf('savePrescriptions(updated)') &&
    update.indexOf('allowsFinalizedPrescriptionUpdate(') < update.indexOf('allowsStockLinkedPrescriptionUpdate('),
    'The central hook must lock recorded stock before persisting stale draft edits.');
}
console.log('PASS QW-104: documented stock locks stale draft/validated prescription content.');

// QW-105: creation via the central hook cannot create a synthetic terminal
// prescription, even when the selected patient is valid.
{
  const iso = '2026-11-12T10:00:00.000Z';
  assert.equal(isCreatablePrescriptionStatus({ status: 'draft' }), true);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated' }), false); // QW-109: must be dated
  assert.equal(isCreatablePrescriptionStatus({ status: 'dispensed' }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'cancelled' }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: undefined }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'draft', dispensedAt: iso }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated', cancelledAt: iso }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'draft', cancelledAt: '' }), false);
  assert.equal(isCreatablePrescriptionStatus(null), false);
  assert.equal(isCreatablePrescriptionStatus(undefined), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const add = hook.split('const addPrescription = useCallback(')[1]
    ?.split('const updatePrescription = useCallback(')[0] ?? '';
  assert.ok(add.includes('isCreatablePrescriptionStatus(prescription)') &&
    add.includes('hasConfirmedPatientSelection(prescription.patientId, currentData.patients)') &&
    add.indexOf('isCreatablePrescriptionStatus(') < add.indexOf('createId()') &&
    add.indexOf('isCreatablePrescriptionStatus(') < add.indexOf('savePrescriptions('),
    'All new prescription records must be checked before assigning an ID or writing storage.');
}
console.log('PASS QW-105: direct creation refuses terminal status and misleading timestamps.');

// QW-106: preserve original audit time and require the lifecycle date to
// accompany an explicit, valid status transition before any storage write.
{
  const nowIso = '2026-11-13T09:30:00.000Z';
  const draft = { status: 'draft' as const };
  const validated = { status: 'validated' as const };
  const dispensed = { status: 'dispensed' as const };
  const cancelled = { status: 'cancelled' as const };

  assert.equal(preservesPrescriptionAuditTimestamps(draft, { advice: 'Fictif' }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { date: '2026-11-13' }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { savedAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(validated, { savedAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { validatedAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'validated', validatedAt: nowIso }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(validated, { status: 'validated', validatedAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { dispensedAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'dispensed' }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'dispensed', dispensedAt: 'illégal' }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'dispensed', dispensedAt: nowIso }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(validated, { status: 'dispensed', dispensedAt: nowIso }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { cancelledAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'cancelled' }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'cancelled', cancelledAt: nowIso }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(dispensed, { status: 'cancelled', cancelledAt: nowIso }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(cancelled, { status: 'cancelled', cancelledAt: nowIso }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(dispensed, { cancelledAt: nowIso }), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('preservesPrescriptionAuditTimestamps(currentPrescription, changes)') &&
    update.indexOf('preservesPrescriptionAuditTimestamps(') < update.indexOf('savePrescriptions(updated)') &&
    update.indexOf('preservesPrescriptionAuditTimestamps(') < update.indexOf('allowsFinalizedPrescriptionUpdate('),
    'The central prescription hook must reject audit timestamp rewrites before persistence.');
}
console.log('PASS QW-106: creation timestamp immutable; finalized status changes require dated audit fields.');

// QW-107: prescription status cannot regress from validated to draft or be
// silently repaired from an unknown imported value through a normal update.
{
  const draft = { status: 'draft' as const };
  const validated = { status: 'validated' as const };
  const dispensed = { status: 'dispensed' as const };
  const cancelled = { status: 'cancelled' as const };
  const unknown = { status: undefined };
  assert.equal(allowsPrescriptionStatusTransition(draft, { advice: 'Fictif' }), true);
  assert.equal(allowsPrescriptionStatusTransition(draft, { status: 'draft' }), true);
  assert.equal(allowsPrescriptionStatusTransition(draft, { status: 'validated' }), true);
  assert.equal(allowsPrescriptionStatusTransition(draft, { status: 'dispensed' }), true);
  assert.equal(allowsPrescriptionStatusTransition(draft, { status: 'cancelled' }), true);
  assert.equal(allowsPrescriptionStatusTransition(validated, { advice: 'Fictif' }), true);
  assert.equal(allowsPrescriptionStatusTransition(validated, { status: 'validated' }), true);
  assert.equal(allowsPrescriptionStatusTransition(validated, { status: 'draft' }), false);
  assert.equal(allowsPrescriptionStatusTransition(validated, { status: 'dispensed' }), true);
  assert.equal(allowsPrescriptionStatusTransition(validated, { status: 'cancelled' }), true);
  assert.equal(allowsPrescriptionStatusTransition(dispensed, { status: 'draft' }), false);
  assert.equal(allowsPrescriptionStatusTransition(dispensed, { status: 'cancelled' }), true);
  assert.equal(allowsPrescriptionStatusTransition(cancelled, { status: 'validated' }), false);
  assert.equal(allowsPrescriptionStatusTransition(unknown, { status: 'draft' }), false);
  assert.equal(allowsPrescriptionStatusTransition({ status: 'inconnu' as 'draft' }, { status: 'validated' }), false);
  assert.equal(allowsPrescriptionStatusTransition(validated, { status: undefined }), false);
  assert.equal(allowsPrescriptionStatusTransition(validated, { status: 'invalid' as 'draft' }), false);
  assert.equal(allowsPrescriptionStatusTransition(validated, {}), true);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('allowsPrescriptionStatusTransition(currentPrescription, changes)') &&
    update.indexOf('allowsPrescriptionStatusTransition(') < update.indexOf('preservesPrescriptionAuditTimestamps(') &&
    update.indexOf('allowsPrescriptionStatusTransition(') < update.indexOf('savePrescriptions(updated)'),
    'Validate the status transition centrally before any prescription write.');
}
console.log('PASS QW-107: forward-only status transitions and no silent coercion of imported states.');

// QW-108: a draft may only become "validated" when its validation time
// is explicitly recorded; unrelated edits and later finalisation are intact.
{
  const draft = { status: 'draft' as const };
  const validated = { status: 'validated' as const };
  const timestamp = '2026-11-13T15:00:00.000Z';

  assert.equal(preservesPrescriptionAuditTimestamps(draft, { advice: 'Donnée fictive' }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(draft, { status: 'validated' }), false,
    'Status-only draft validation would lose the audit timestamp.');
  assert.equal(preservesPrescriptionAuditTimestamps(draft,
    { status: 'validated', validatedAt: timestamp }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(draft,
    { status: 'validated', validatedAt: '' }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(draft,
    { status: 'validated', validatedAt: 'non valide' }), false);
  assert.equal(preservesPrescriptionAuditTimestamps(validated, { advice: 'Donnée fictive' }), true);
  assert.equal(preservesPrescriptionAuditTimestamps(validated,
    { status: 'dispensed', dispensedAt: timestamp }), true);

  const helper = readFileSync(new URL('../src/services/prescriptionFinality.ts', import.meta.url), 'utf8');
  const audit = helper.split('export function preservesPrescriptionAuditTimestamps(')[1]
    ?.split('// QW-107')[0] ?? '';
  assert.ok(audit.includes("current.status === 'draft' && changes.status === 'validated'") &&
    audit.includes("!has('validatedAt')") &&
    audit.indexOf("!has('validatedAt')") < audit.indexOf("if (has('validatedAt')"),
    'Validation without validatedAt must be rejected before persistence.');

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('preservesPrescriptionAuditTimestamps(currentPrescription, changes)') &&
    update.indexOf('preservesPrescriptionAuditTimestamps(') < update.indexOf('savePrescriptions(updated)'),
    'Central validation path must apply the timestamp requirement.');
}
console.log('PASS QW-108: a draft cannot become validated without its audit timestamp.');


// QW-109 — creation of a validated prescription must contain an ISO audit
// date; a draft must not claim that it was already validated.
{
  const iso = '2026-11-13T15:00:00.000Z';
  assert.equal(isCreatablePrescriptionStatus({ status: 'draft' }), true);
  assert.equal(isCreatablePrescriptionStatus({ status: 'draft', validatedAt: iso }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'draft', validatedAt: null as unknown as string }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated' }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated', validatedAt: '' }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated', validatedAt: 'hier' }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated', validatedAt: iso }), true);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated', validatedAt: iso,
    dispensedAt: iso }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'validated', validatedAt: iso,
    cancelledAt: iso }), false);
  assert.equal(isCreatablePrescriptionStatus({ status: 'cancelled', validatedAt: iso }), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const add = hook.split('const addPrescription = useCallback(')[1]
    ?.split('const updatePrescription = useCallback(')[0] ?? '';
  assert.ok(add.includes('isCreatablePrescriptionStatus(prescription)') &&
    add.indexOf('isCreatablePrescriptionStatus(') < add.indexOf('savePrescriptions('),
    'The central creation path must use the enhanced validation-date guard.');

  const helper = readFileSync(new URL('../src/services/prescriptionFinality.ts', import.meta.url), 'utf8');
  const create = helper.split('export function isCreatablePrescriptionStatus(')[1]
    ?.split('// QW-106')[0] ?? '';
  assert.ok(create.includes("prescription.status === 'draft'") &&
    create.includes('prescription.validatedAt === undefined') &&
    create.includes('Date.parse(validatedAt)'),
    'A new validated prescription must have a dated validation audit trail.');
}
console.log('PASS QW-109: validated creation requires dated evidence; drafts remain undated.');

// QW-110: a draft/validated-looking prescription may already have real
// inventory movements after a failed post-dispense status write. Before any
// new stock action the UI must explicitly stop and request reconciliation.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const dispense = source.split('function dispenseSavedPrescription()')[1]
    ?.split('function handlePartialReturn(')[0] ?? '';
  const traceGuard = dispense.indexOf(
    'prescriptionHasRecordedStockMovement(savedPrescription.id, getInventoryData().movements)');
  assert.ok(traceGuard >= 0 &&
    dispense.includes('Délivrance suspendue : des mouvements de stock existent déjà') &&
    dispense.includes('réconciliez le statut avant toute nouvelle action') &&
    dispense.indexOf('isDispensablePrescriptionStatus(savedPrescription.status)') < traceGuard &&
    traceGuard < dispense.indexOf('updatePrescription(') &&
    traceGuard < dispense.indexOf('dispenseInventoryItems('),
    'Already-recorded stock must trigger a clear reconciliation warning before persistence or dispensing.');
  const events = [
    { prescriptionId: 'rx-fictive' },
    { prescriptionId: 'autre-ordonnance' },
  ];
  assert.equal(prescriptionHasRecordedStockMovement('rx-fictive', events), true);
  assert.equal(prescriptionHasRecordedStockMovement('rx-sans-stock', events), false);
  assert.equal(prescriptionHasRecordedStockMovement('', events), false);
}
console.log('PASS QW-110: pre-dispense reconciliation warning on stock history mismatch.');

// QW-111: cancellation UI must fail closed on absent/unknown status, without
// confirmation, stock returns or saving a misleading 'cancelled' state.
{
  for (const status of ['draft', 'validated']) {
    assert.equal(isDispensablePrescriptionStatus(status), true);
  }
  for (const status of [undefined, null, 'legacy', 'annulée', 42]) {
    assert.equal(isDispensablePrescriptionStatus(status), false);
  }
  const page = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const cancel = page.split('function cancelPrescription(')[1]
    ?.split('function openPrescription(')[0] ?? '';
  const statusGuard = cancel.indexOf('!isDispensablePrescriptionStatus(current.status)');
  assert.ok(statusGuard > 0 &&
    cancel.includes("current.status !== 'dispensed'") &&
    cancel.includes('Annulation refusée : statut de l’ordonnance absent ou non reconnu.') &&
    statusGuard < cancel.indexOf('window.confirm(') &&
    statusGuard < cancel.indexOf('cancelDispensedPrescriptionStock(') &&
    statusGuard < cancel.indexOf('updatePrescription('),
    'Imported unknown status must be rejected before confirming or updating inventory.');
}
console.log('PASS QW-111: cancelling unknown-status prescriptions fails closed before inventory work.');

// QW-112: missing legacy status is not the same as explicitly invalid JSON
// content. Both views share the same non-prescriptive, read-only helper.
{
  const legacy = documentedPrescriptionStatus(undefined);
  const invalid = documentedPrescriptionStatus('invalid-imported-status');
  assert.equal(legacy, 'Statut non renseigné (ancien dossier)');
  assert.equal(invalid, 'Statut inconnu ou invalide — vérification nécessaire');
  assert.equal(documentedPrescriptionStatus(null), invalid);
  assert.equal(documentedPrescriptionStatus(''), invalid);
  assert.equal(documentedPrescriptionStatus(42), invalid);
  assert.equal(documentedPrescriptionStatus({ status: 'draft' }), invalid);
  assert.notEqual(invalid, documentedPrescriptionStatus('draft'));
  assert.notEqual(invalid, documentedPrescriptionStatus('validated'));
  const source = readFileSync(new URL('../src/clinical/prescriptionTimeline.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('status === undefined') &&
    source.includes('Statut inconnu ou invalide — vérification nécessaire'),
    'An explicitly invalid imported status must be flagged, not presented as missing legacy data.');
  const history = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  assert.ok(history.includes('Statut documentaire : {documentedPrescriptionStatus(item.status)}'),
    'The history must reuse the updated timeline label without a parallel classification.');
}
console.log('PASS QW-112: missing legacy and invalid imported statuses remain distinguishable.');


// QW-113 — a newly allocated prescription ID must not collide with an
// imported document OR an orphaned historical stock movement.
{
  const prescriptions = [{ id: 'ordonnance-ancienne' }, { id: 'ordonnance-dupliquée' },
    { id: 'ordonnance-dupliquée' }];
  const moves = [{ prescriptionId: 'ordonnance-stock-seul' },
    { prescriptionId: 'autre-ordonnance' }];
  assert.equal(isUnusedPrescriptionId('nouvelle-ordonnance', prescriptions, moves), true);
  assert.equal(isUnusedPrescriptionId('ordonnance-ancienne', prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('ordonnance-dupliquée', prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('ordonnance-stock-seul', prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('autre-ordonnance', prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('', prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('  ', prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId(null, prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId(undefined, prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId(42, prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('id-isolé', [], []), true);
  assert.equal(isUnusedPrescriptionId('id-isolé', null as unknown as typeof prescriptions, moves), false);
  assert.equal(isUnusedPrescriptionId('id-isolé', prescriptions, null as unknown as typeof moves), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const add = hook.split('const addPrescription = useCallback(')[1]
    ?.split('const updatePrescription = useCallback(')[0] ?? '';
  const createAt = add.indexOf('const newId = createId()');
  const checkAt = add.indexOf(
    'isUnusedPrescriptionId(newId, currentData.prescriptions, getInventoryData().movements)');
  assert.ok(createAt >= 0 && checkAt > createAt &&
    checkAt < add.indexOf('const newPrescription: Prescription') &&
    checkAt < add.indexOf('savePrescriptions(') &&
    add.includes('...currentData.prescriptions'),
    'New generated ID must be checked against current documents and stock trace before saving.');
}
console.log('PASS QW-113: new prescription IDs cannot reuse clinical or stock-trace identifiers.');

// QW-114: direct content edits must fail closed when the imported document has
// no recognized status, even without a request to change that status.
{
  for (const status of ['draft', 'validated']) {
    assert.equal(isDispensablePrescriptionStatus(status), true);
  }
  for (const status of [undefined, null, '', 'legacy', 'unknown', 42]) {
    assert.equal(isDispensablePrescriptionStatus(status), false);
  }

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  const storedStatusGuard = update.indexOf(
    "!isDispensablePrescriptionStatus(currentPrescription.status)");
  assert.ok(storedStatusGuard > 0 &&
    update.includes("currentPrescription.status !== 'dispensed'") &&
    storedStatusGuard > update.indexOf('allowsFinalizedPrescriptionUpdate(') &&
    storedStatusGuard < update.indexOf('savePrescriptions(updated)'),
    'Unknown-status imported prescriptions must not allow content-only central updates.');

  const page = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const save = page.split('function savePrescription()')[1]
    ?.split('function updateDispensedQuantity(')[0] ?? '';
  const uiGuard = save.indexOf('!isDispensablePrescriptionStatus(current.status)');
  assert.ok(uiGuard > 0 &&
    save.includes('Modification refusée : statut de l’ordonnance absent ou non reconnu.') &&
    uiGuard < save.indexOf('updatePrescription('),
    'The editor must explain missing/unknown status before attempting storage writes.');

  // QW-097's normal dispensed cancellation remains deliberately permitted
  // through its own strictly documented exception.
  assert.equal(allowsFinalizedPrescriptionUpdate(
    { status: 'dispensed' }, {
      status: 'cancelled', cancelledAt: '2026-11-13T15:00:00.000Z',
    }), true);
}
console.log('PASS QW-114: missing/invalid imported statuses are readonly until reviewed.');

// QW-115: editing a stale draft/validated form must not submit changes if
// actual inventory movements already exist for its saved prescription ID.
{
  const source = readFileSync(new URL('../src/pages/Prescriptions.tsx', import.meta.url), 'utf8');
  const save = source.split('function savePrescription()')[1]
    ?.split('function updateDispensedQuantity(')[0] ?? '';
  const linkedGuard = save.indexOf(
    'prescriptionHasRecordedStockMovement(current.id, getInventoryData().movements)');
  const statusGuard = save.indexOf('!isDispensablePrescriptionStatus(current.status)');
  const formUpdate = save.indexOf('updatePrescription(');
  assert.ok(linkedGuard > 0 && statusGuard > 0 &&
    linkedGuard > statusGuard &&
    linkedGuard < formUpdate &&
    save.includes('Modification suspendue : des mouvements de stock sont déjà liés à cette ordonnance.') &&
    save.includes('réconciliez le statut avant toute correction.'),
    'The form must warn about stock already recorded before rewriting prescription content.');

  const movements = [{ prescriptionId: 'ordonnance-fictive' },
    { prescriptionId: 'ordonnance-distincte' }];
  assert.equal(prescriptionHasRecordedStockMovement('ordonnance-fictive', movements), true);
  assert.equal(prescriptionHasRecordedStockMovement('ordonnance-absente', movements), false);
  assert.equal(prescriptionHasRecordedStockMovement('', movements), false);
  assert.equal(prescriptionHasRecordedStockMovement('ordonnance-fictive', []), false);
  assert.equal(isDispensablePrescriptionStatus('draft'), true);
  assert.equal(isDispensablePrescriptionStatus('validated'), true);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updatePrescription = useCallback(')[1]
    ?.split('const deletePrescription = useCallback(')[0] ?? '';
  assert.ok(update.includes('allowsStockLinkedPrescriptionUpdate(currentPrescription, changes,') &&
    update.indexOf('allowsStockLinkedPrescriptionUpdate(') < update.indexOf('savePrescriptions(updated)'),
    'The QW-104 central storage guard remains in place independently of the new UI warning.');
}
console.log('PASS QW-115: stale editor warns before stock-linked prescription edits.');

// QW-118 — a saved consultation belongs to one confirmed patient. Updating
// a note, follow-up or diagnosis may not move it to a different patient file.
{
  const original = { patientId: 'patient-clinique-fictif' };
  assert.equal(preservesConsultationPatientLink(original, {}), true);
  assert.equal(preservesConsultationPatientLink(original, { patientId: 'patient-clinique-fictif' }), true);
  assert.equal(preservesConsultationPatientLink(original, { patientId: 'autre-patient' }), false);
  assert.equal(preservesConsultationPatientLink(original, { patientId: '' }), false);
  assert.equal(preservesConsultationPatientLink(original, { patientId: '  ' }), false);
  assert.equal(preservesConsultationPatientLink(original, { patientId: undefined }), false);
  assert.equal(preservesConsultationPatientLink(original, { patientId: null as unknown as string }), false);
  assert.equal(preservesConsultationPatientLink({ patientId: '' }, {}), false);
  assert.equal(preservesConsultationPatientLink(null, {}), false);
  assert.equal(preservesConsultationPatientLink(original, null), false);
  assert.equal(preservesConsultationPatientLink(original, [] as unknown as { patientId?: string }), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  const patientConfirm = update.indexOf(
    'hasConfirmedPatientSelection(currentConsultation.patientId, getMedicalData().patients)');
  const linkCheck = update.indexOf('preservesConsultationPatientLink(currentConsultation, changes)');
  const save = update.indexOf('saveConsultations(updated)');
  assert.ok(update.includes('hasUniqueConsultationId(id, currentConsultations)') &&
    patientConfirm > update.indexOf('hasUniqueConsultationId(') &&
    linkCheck > patientConfirm && linkCheck < save &&
    update.includes('updatedAt: new Date().toISOString()'),
    'Central clinical updates must preserve the patient link and update timestamp.');
}
console.log('PASS QW-118: saved consultations cannot be moved between patient records.');

// QW-119: direct clinical update callers may not fabricate or rewrite audit
// timestamps. updatedAt is generated by the hook; the clinical visit date
// stays independently editable in the regular consultation form.
{
  const iso = '2026-11-13T10:00:00.000Z';
  assert.equal(preservesConsultationAuditTimestamps({}), true);
  assert.equal(preservesConsultationAuditTimestamps({ createdAt: iso }), false);
  assert.equal(preservesConsultationAuditTimestamps({ updatedAt: iso }), false);
  assert.equal(preservesConsultationAuditTimestamps({ createdAt: undefined }), false);
  assert.equal(preservesConsultationAuditTimestamps({ updatedAt: undefined }), false);
  assert.equal(preservesConsultationAuditTimestamps(null), false);
  assert.equal(preservesConsultationAuditTimestamps(undefined), false);
  assert.equal(preservesConsultationAuditTimestamps(
    [] as unknown as { createdAt?: string; updatedAt?: string }), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  const guardAt = update.indexOf('preservesConsultationAuditTimestamps(changes)');
  assert.ok(guardAt > update.indexOf('preservesConsultationPatientLink(currentConsultation, changes)') &&
    guardAt < update.indexOf('saveConsultations(updated)') &&
    update.includes('updatedAt: new Date().toISOString()') &&
    update.includes('...changes,'),
    'The hook must refuse caller-supplied audit dates and assign its own update date.');

  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const save = page.split('function saveConsultation()')[1]
    ?.split('const vitalFields:')[0] ?? '';
  assert.ok(save.includes('const changes = {') &&
    save.includes('updateConsultation(editingId, changes)') &&
    !save.includes('createdAt:') && !save.includes('updatedAt:'),
    'Ordinary consultation editing must not send audit timestamps.');
}
console.log('PASS QW-119: clinical audit timestamps are immutable across direct updates.');

// QW-121 — consultation creation must refuse generated IDs already used by
// past encounters. Imported duplicates remain untouched (no auto-repair).
{
  const imported = [
    { id: 'consultation-existante' },
    { id: 'consultation-dupliquée' },
    { id: 'consultation-dupliquée' },
  ];
  const previous = JSON.stringify(imported);
  assert.equal(isUnusedConsultationId('consultation-nouvelle', imported), true);
  assert.equal(isUnusedConsultationId('consultation-existante', imported), false);
  assert.equal(isUnusedConsultationId('consultation-dupliquée', imported), false);
  assert.equal(isUnusedConsultationId('', imported), false);
  assert.equal(isUnusedConsultationId('   ', imported), false);
  assert.equal(isUnusedConsultationId(null, imported), false);
  assert.equal(isUnusedConsultationId(undefined, imported), false);
  assert.equal(isUnusedConsultationId(123, imported), false);
  assert.equal(isUnusedConsultationId('consultation-nouvelle', []), true);
  assert.equal(isUnusedConsultationId('consultation-nouvelle',
    null as unknown as typeof imported), false);
  assert.equal(JSON.stringify(imported), previous,
    'Collision checking must not modify imported consultation records.');

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const create = hook.split('const addConsultation = useCallback(')[1]
    ?.split('const updateConsultation = useCallback(')[0] ?? '';
  const patientCheck = create.indexOf(
    'hasConfirmedPatientSelection(consultation.patientId, currentData.patients)');
  const followUpCheck = create.indexOf('isWritableFollowUpPlan(consultation.followUp)');
  const createIdAt = create.indexOf('const newId = createId()');
  const collisionCheck = create.indexOf(
    'isUnusedConsultationId(newId, currentData.consultations)');
  const writeAt = create.indexOf('saveConsultations(');
  assert.ok(patientCheck >= 0 && followUpCheck > patientCheck &&
    createIdAt > followUpCheck && collisionCheck > createIdAt &&
    collisionCheck < writeAt && create.includes('...currentData.consultations'),
    'The central creation path must check uniqueness after ID generation and before storage.');
}
console.log('PASS QW-121: creating consultations refuses already-used clinical IDs.');

// QW-122 — new consultations require a documented clinical reason and
// specialty at the central creation boundary, not just in the React form.
{
  const valid = { motif: 'Contrôle tensionnel fictif', specialty: 'Médecine de famille' };
  assert.equal(hasRequiredConsultationDetails(valid), true);
  assert.equal(hasRequiredConsultationDetails(
    { motif: '  Contrôle fictif  ', specialty: '  Pédiatrie  ' }), true);
  assert.equal(hasRequiredConsultationDetails({ motif: '', specialty: valid.specialty }), false);
  assert.equal(hasRequiredConsultationDetails({ motif: '   ', specialty: valid.specialty }), false);
  assert.equal(hasRequiredConsultationDetails({ motif: valid.motif, specialty: '' }), false);
  assert.equal(hasRequiredConsultationDetails({ motif: valid.motif, specialty: '   ' }), false);
  assert.equal(hasRequiredConsultationDetails({ motif: valid.motif }), false);
  assert.equal(hasRequiredConsultationDetails({ motif: null as unknown as string,
    specialty: valid.specialty }), false);
  assert.equal(hasRequiredConsultationDetails({ motif: valid.motif,
    specialty: 123 as unknown as string }), false);
  assert.equal(hasRequiredConsultationDetails(null), false);
  assert.equal(hasRequiredConsultationDetails(undefined), false);

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const add = hook.split('const addConsultation = useCallback(')[1]
    ?.split('const updateConsultation = useCallback(')[0] ?? '';
  const patientAt = add.indexOf('hasConfirmedPatientSelection(consultation.patientId, currentData.patients)');
  const clinicalAt = add.indexOf('hasRequiredConsultationDetails(consultation)');
  const followAt = add.indexOf('isWritableFollowUpPlan(consultation.followUp)');
  const createAt = add.indexOf('const newId = createId()');
  const saveAt = add.indexOf('saveConsultations(');
  assert.ok(patientAt >= 0 && clinicalAt > patientAt &&
    clinicalAt < followAt && followAt < createAt && createAt < saveAt,
    'The central creation path must reject missing clinical fields before allocating IDs or writing data.');

  const source = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const saveForm = source.split('function saveConsultation()')[1]
    ?.split('const vitalFields:')[0] ?? '';
  assert.ok(saveForm.includes('!motif.trim() || (!editingId && !specialty)') &&
    saveForm.includes('addConsultation({ ...changes, date: new Date().toISOString() })'),
    'The existing consultation form must continue enforcing mandatory fields.');
  const update = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  assert.ok(!update.includes('hasRequiredConsultationDetails('),
    'Imported older consultations without specialty must remain editable.');
}
console.log('PASS QW-122: new consultations require motif and specialty without rewriting legacy visits.');

// QW-123 — new/explicitly corrected visit dates must be usable by the
// patient timeline; older imported records with missing dates stay editable
// when callers only correct other clinical fields.
{
  for (const date of [
    '2026-11-13', '2024-02-29',
    '2026-11-13T09:00:00.000Z', '2026-11-13T10:00:00+01:00',
  ]) {
    assert.notEqual(recordedDateTimestamp(date), null, 'Expected valid visit date: ' + date);
  }
  for (const date of [
    '', '  ', '2026-02-30', '2025-02-29', '2026-13-01',
    '13/11/2026', '2026-11-13T10:00:00', 'non renseignée',
    null, undefined, 20261113,
  ]) {
    assert.equal(recordedDateTimestamp(date), null, 'Invalid visit date: ' + String(date));
  }

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const creation = hook.split('const addConsultation = useCallback(')[1]
    ?.split('const updateConsultation = useCallback(')[0] ?? '';
  const updating = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  const creationDateGuard = creation.indexOf('recordedDateTimestamp(consultation.date) === null');
  const updatedDateGuard = updating.indexOf('recordedDateTimestamp(changes.date) === null');
  assert.ok(creationDateGuard > creation.indexOf('hasRequiredConsultationDetails(consultation)') &&
    creationDateGuard < creation.indexOf('const newId = createId()') &&
    creationDateGuard < creation.indexOf('saveConsultations('),
    'The creation hook must validate the encounter date before allocating or writing a record.');
  assert.ok(updating.includes("Object.prototype.hasOwnProperty.call(changes, 'date')") &&
    updatedDateGuard > updating.indexOf('preservesConsultationAuditTimestamps(changes)') &&
    updatedDateGuard < updating.indexOf('saveConsultations(updated)'),
    'Only explicitly edited encounter dates must be checked; legacy date gaps remain editable.');
  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('addConsultation({ ...changes, date: new Date().toISOString() })'),
    'The normal consultation form continues to supply an unambiguous timestamp.');
}
console.log('PASS QW-123: malformed visit dates blocked at central clinical writes.');
