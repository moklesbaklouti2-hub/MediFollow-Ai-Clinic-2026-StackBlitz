// QW-156..160: local, fictitious documentary HELIOS regressions.
// No patient data, network, credentials, storage or remote AI access.
import assert from 'node:assert/strict';
import { buildClinicalMemory } from '../src/clinical/clinicalMemory.ts';
import { buildPreventionReview } from '../src/clinical/prevention.ts';
import type { Consultation, Patient } from '../src/types/medical.ts';

type MemoryPatient = Pick<Patient, 'id' | 'age' | 'clinicalHistory' | 'currentMedications'>;
type MemoryVisit = Pick<Consultation, 'id' | 'patientId' | 'date' | 'diagnosis'>;
const patient: MemoryPatient = {
  id: 'patient-fictif-a', age: 42,
  clinicalHistory: {
    allergies: [{ id: 'a1', label: 'Allergie fictive', details: 'Source déclarée' }],
    medical: [{ id: 'h1', label: 'Antécédent fictif', date: 'date non vérifiée' }],
  },
  currentMedications: [{ id: 'm1', name: 'Traitement fictif', dosage: 'dose fictive' }],
};
const visits: MemoryVisit[] = [
  { id: 'c-valid-old', patientId: patient.id, date: '2026-01-05', diagnosis: 'Diagnostic ancien fictif' },
  { id: 'c-impossible', patientId: patient.id, date: '2026-02-30', diagnosis: 'Diagnostic daté impossible fictif' },
  { id: 'c-new', patientId: patient.id, date: '2026-11-11', diagnosis: 'Diagnostic récent fictif' },
  { id: 'c-ambiguous', patientId: patient.id, date: '11/12/2026', diagnosis: 'Diagnostic à date ambiguë fictif' },
  { id: 'c-other', patientId: 'patient-fictif-b', date: '2026-11-14', diagnosis: 'Diagnostic AUTRE patient' },
  { id: '', patientId: patient.id, date: '2026-11-13', diagnosis: 'Origine sans ID' },
  { id: 7 as unknown as string, patientId: patient.id, date: '2026-11-13', diagnosis: 'Origine non textuelle' },
];
const before = JSON.stringify({ patient, visits });
const memory = buildClinicalMemory(patient, visits);
assert.deepEqual(memory.documentedDiagnoses.map(row => row.consultationId),
  ['c-new', 'c-valid-old', 'c-ambiguous']);
assert.equal(memory.documentedDiagnoses[2].date, 'Date non renseignée');
assert.equal(memory.documentedDiagnoses.some(row => row.label.includes('AUTRE patient')), false);
assert.deepEqual(memory.allergies, ['Allergie fictive — Source déclarée']);
assert.deepEqual(memory.declaredTreatments, ['Traitement fictif — dose fictive']);
assert.deepEqual(memory.documentedHistory.medical, ['Antécédent fictif · Date déclarée : date non vérifiée']);
assert.deepEqual(buildClinicalMemory({ ...patient, id: '' }, visits).documentedDiagnoses, []);
assert.deepEqual(buildClinicalMemory({ ...patient, id: '' }, visits).allergies, []);
assert.equal(JSON.stringify({ patient, visits }), before, 'Read-only HELIOS must not mutate records.');
const review = buildPreventionReview(patient, visits);
assert.equal(review.recordedAge, 42);
assert.equal(review.lastDatedConsultation, '2026-11-11');
assert.equal(review.discussionTopics.length, 4);
for (const age of [-1, 42.5, 151, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(buildPreventionReview({ ...patient, age }, visits).recordedAge, null);
}
assert.equal(buildPreventionReview({ ...patient, id: '' }, visits).lastDatedConsultation, null);
assert.equal(buildPreventionReview({ ...patient, id: '' }, visits).recordedAge, null);
assert.equal(JSON.stringify({ patient, visits }), before, 'Prevention must not mutate documentary inputs.');
console.log('PASS QW-156..160: patient isolation, verified chronology, deterministic memory and prevention.');

// QW-174..176: ambiguous IDs are excluded globally, even across patients.
const collisions: MemoryVisit[] = [
  ...visits,
  { id: 'duplicate-local', patientId: patient.id, date: '2026-11-12', diagnosis: 'Ambiguous local A' },
  { id: 'duplicate-local', patientId: patient.id, date: '2026-11-13', diagnosis: 'Ambiguous local B' },
  { id: 'duplicate-cross', patientId: patient.id, date: '2026-11-14', diagnosis: 'Ambiguous cross-patient' },
  { id: 'duplicate-cross', patientId: 'patient-fictif-b', date: '2026-11-14', diagnosis: '' },
];
const collisionSnapshot = JSON.stringify(collisions);
assert.deepEqual(buildClinicalMemory(patient, collisions), memory);
assert.deepEqual(buildPreventionReview(patient, collisions), review);
assert.equal(JSON.stringify(collisions), collisionSnapshot);
console.log('PASS QW-174..176: duplicate consultation provenance excluded without mutation.');
