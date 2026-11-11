import assert from 'node:assert/strict';
import { resolveLegacyPatientId } from '../src/services/patientLinkage.ts';
import { countUnlinkedClinicalRecords } from '../src/services/recordIntegrity.ts';
import { hasConfirmedPatientSelection } from '../src/services/patientSelectionGuard.ts';
import { selectUniquePatient } from '../src/services/uniquePatientSelection.ts';
import { latestVitalReadings } from '../src/clinical/patientVitals.ts';
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

console.log('PASS: legacy document linkage, 10 orphan records detected, visible dashboard warning and zero storage mutations.');
