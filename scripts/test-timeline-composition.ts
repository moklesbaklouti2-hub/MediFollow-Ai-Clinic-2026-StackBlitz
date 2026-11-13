// QW-068 — Fictitious multi-filter composition and patient-isolation regression.
// No browser storage, network, AI call, or actual patient information.
import assert from 'node:assert/strict';
import type { Consultation, Prescription } from '../src/types/medical.ts';
import { orderRecordedNewest } from '../src/clinical/medicalTimeline.ts';
import { filterRecordedEvents } from '../src/clinical/timelineFilter.ts';
import { searchRecordedEvents } from '../src/clinical/timelineSearch.ts';
import { filterDocumentedPrescriptionStatus } from '../src/clinical/timelineStatusFilter.ts';
import { filterTimelineByDateRange } from '../src/clinical/timelineDateRange.ts';
import { filterTimelineUndated } from '../src/clinical/timelineUndated.ts';
import { documentedSpecialtyOptions, filterTimelineBySpecialty } from '../src/clinical/timelineSpecialty.ts';
import { filterTimelineByRecordedOrderKind } from '../src/clinical/timelineOrderKinds.ts';
import { filterTimelineDocumentationGaps, summarizeTimelineDocumentation } from '../src/clinical/timelineQuality.ts';
import { sortTimelineByRecordedDate } from '../src/clinical/timelineSort.ts';
import { limitTimelineEvents } from '../src/clinical/timelineLimit.ts';

type Event = { id: string; patientId: string; date: string } & (
  | { type: 'consultation'; consultation: Pick<Consultation, 'motif' | 'symptoms' | 'diagnosis' | 'specialty'> }
  | { type: 'prescription'; prescription: Pick<Prescription, 'medications' | 'items' | 'advice' | 'status'> }
);

const exampleMedication = {
  id: 'med-example', name: 'Paracétamol fictif', dosage: '500 mg',
  route: 'orale', frequency: '1 fois', duration: '1 jour', instructions: 'Test uniquement',
};
const fixtures: Event[] = [
  { id: 'a-c1', patientId: 'alpha', date: '2026-11-11', type: 'consultation',
    consultation: { motif: 'Dyspnée fictive', symptoms: 'Début récent', diagnosis: '', specialty: 'ORL' } },
  { id: 'a-c2', patientId: 'alpha', date: '2026-01-03', type: 'consultation',
    consultation: { motif: 'Contrôle fictif', symptoms: '', diagnosis: '', specialty: 'Cardiologie' } },
  { id: 'a-c3', patientId: 'alpha', date: '2026-02-30', type: 'consultation',
    consultation: { motif: 'Document ancien', symptoms: '', diagnosis: '', specialty: '' } },
  { id: 'a-p1', patientId: 'alpha', date: '2026-11-09', type: 'prescription',
    prescription: { medications: [], status: 'cancelled', advice: 'Suivi fictif',
      items: [{ id: 'lab1', category: 'laboratory', name: 'NFS fictive' }] } },
  { id: 'a-p2', patientId: 'alpha', date: '2026-10-15', type: 'prescription',
    prescription: { medications: [exampleMedication], status: 'draft', advice: 'Simulation' } },
  { id: 'a-p3', patientId: 'alpha', date: '', type: 'prescription',
    prescription: { medications: [], advice: '',
      items: [{ id: 'im1', category: 'radiology', name: 'Échographie fictive' }] } },
  { id: 'b-c1', patientId: 'beta', date: '2026-11-12', type: 'consultation',
    consultation: { motif: 'Document autre patient', symptoms: '', diagnosis: '', specialty: 'ORL' } },
  { id: 'b-p1', patientId: 'beta', date: '2026-11-13', type: 'prescription',
    prescription: { medications: [exampleMedication], status: 'cancelled', advice: '' } },
];

const before = JSON.stringify(fixtures);
const alpha = orderRecordedNewest(fixtures.filter(item => item.patientId === 'alpha'));
assert.equal(alpha.length, 6, "Current patient's initial selection must exclude other patients.");
const checkSamePatient = (events: readonly Event[]) => {
  assert.ok(events.every(event => event.patientId === 'alpha'), 'No event may be taken from another patient.');
};

// Combination: type -> local text -> recorded status -> order category ->
// period -> documentary quality -> sorting -> display limit.
const p = filterRecordedEvents(alpha, 'prescription');
const laboratory = filterTimelineByRecordedOrderKind(p, 'laboratory');
const cancelled = filterDocumentedPrescriptionStatus(laboratory, 'cancelled');
const november = filterTimelineByDateRange(cancelled, '2026-11-01', '2026-11-30');
const oldestFirst = sortTimelineByRecordedDate(november, 'oldest');
const visible = limitTimelineEvents(oldestFirst, '10');
assert.deepEqual(visible.map(event => event.id), ['a-p1']);
checkSamePatient(visible);

// Prescriptions not performed: presence of a radiology item is documentary
// even when a date/status is absent; it never creates a result or movement.
assert.deepEqual(filterTimelineByRecordedOrderKind(p, 'radiology').map(event => event.id), ['a-p3']);
assert.deepEqual(filterTimelineByRecordedOrderKind(p, 'treatment').map(event => event.id), ['a-p2']);
assert.deepEqual(filterDocumentedPrescriptionStatus(p, 'unknown').map(event => event.id), ['a-p3']);

// Accents, specialty, missing dates and invalid dates are independent filters.
assert.deepEqual(searchRecordedEvents(alpha, 'dyspnee').map(event => event.id), ['a-c1']);
const consultation = filterRecordedEvents(alpha, 'consultation');
const consultationDocuments = consultation.flatMap(event =>
  event.type === 'consultation' ? [event.consultation] : []);
assert.deepEqual(documentedSpecialtyOptions(consultationDocuments), ['Cardiologie', 'ORL']);
assert.deepEqual(filterTimelineBySpecialty(consultation, 'missing').map(event => event.id), ['a-c3']);
assert.deepEqual(filterTimelineUndated(alpha).map(event => event.id), ['a-c3', 'a-p3']);
assert.deepEqual(filterTimelineByDateRange(alpha, '2026-11-01', '2026-11-30').map(event => event.id),
  ['a-c1', 'a-p1']);

// Chronological direction never promotes an unknown date into an assumed date.
assert.deepEqual(sortTimelineByRecordedDate(alpha, 'oldest').map(event => event.id),
  ['a-c2', 'a-p2', 'a-p1', 'a-c1', 'a-c3', 'a-p3']);
assert.deepEqual(sortTimelineByRecordedDate(alpha, 'newest').map(event => event.id),
  ['a-c1', 'a-p1', 'a-p2', 'a-c2', 'a-c3', 'a-p3']);
checkSamePatient(limitTimelineEvents(alpha, '25'));

assert.deepEqual(filterTimelineDocumentationGaps(alpha).map(event => event.id), ['a-c3', 'a-p3']);
assert.deepEqual(summarizeTimelineDocumentation(alpha), {
  total: 6, datesUnspecified: 2, specialtiesUnspecified: 1, prescriptionStatusesUnspecified: 1,
});
assert.equal(JSON.stringify(fixtures), before, 'Any composition must preserve original patient records.');

console.log('QW-068 PASS: synthetic patient-isolated chronology, category/status/date/search/specialty/sort/limit composition.');
