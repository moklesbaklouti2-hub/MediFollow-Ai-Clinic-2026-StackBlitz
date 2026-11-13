// QW-161..165: only synthetic visits. No storage, network, or medical decisions.
import assert from 'node:assert/strict';
import { compareRecentVitals } from '../src/clinical/trends.ts';
import { buildReferralSource } from '../src/clinical/referral.ts';
import type { Consultation } from '../src/types/medical.ts';

type VitalVisit = Pick<Consultation, 'id' | 'date' | 'vitals'>;
type ReferralVisit = Pick<Consultation, 'id' | 'patientId' | 'date' | 'motif' | 'diagnosis' | 'plan'>;
const vitals = (weight: string) => ({
  systolic: '', diastolic: '', heartRate: '', spo2: '', temperature: '',
  respiratoryRate: '', weight, height: '', glycemia: '',
});
const visits: VitalVisit[] = [
  { id: 'valid-a', date: '2026-11-01', vitals: vitals('70') },
  { id: 'valid-b', date: '2026-11-11', vitals: vitals('72') },
  { id: 'impossible', date: '2026-02-30', vitals: vitals('130') },
  { id: 'ambiguous', date: '11/12/2026', vitals: vitals('140') },
  { id: '', date: '2026-11-13', vitals: vitals('150') },
  { id: 33 as unknown as string, date: '2026-11-13', vitals: vitals('160') },
  { id: 'duplicate', date: '2026-11-12', vitals: vitals('120') },
  { id: 'duplicate', date: '2026-11-13', vitals: vitals('125') },
];
const originalVitals = JSON.stringify(visits);
const weight = compareRecentVitals(visits).find(row => row.key === 'weight');
assert.equal(weight?.recent.consultationId, 'valid-b');
assert.equal(weight?.previous.consultationId, 'valid-a');
assert.equal(weight?.difference, 2);
assert.deepEqual(compareRecentVitals(visits.slice(2)), []);
assert.equal(JSON.stringify(visits), originalVitals);

const referralVisits: ReferralVisit[] = [
  { id: 'valid-old', patientId: 'fictif-a', date: '2026-11-01', motif: 'Ancien motif', diagnosis: '', plan: '' },
  { id: 'valid-new', patientId: 'fictif-a', date: '2026-11-11', motif: 'Dernier motif sûr', diagnosis: 'Note', plan: 'Revoir' },
  { id: 'other', patientId: 'fictif-b', date: '2026-11-14', motif: 'AUTRE PATIENT', diagnosis: '', plan: '' },
  { id: 'bad-calendar', patientId: 'fictif-a', date: '2026-02-30', motif: 'Date impossible', diagnosis: '', plan: '' },
  { id: 'bad-date-format', patientId: 'fictif-a', date: '11/12/2026', motif: 'Date ambiguë', diagnosis: '', plan: '' },
  { id: '', patientId: 'fictif-a', date: '2026-11-13', motif: 'Sans ID', diagnosis: '', plan: '' },
  { id: 4 as unknown as string, patientId: 'fictif-a', date: '2026-11-13', motif: 'ID malformé', diagnosis: '', plan: '' },
  { id: 'dup', patientId: 'fictif-a', date: '2026-11-12', motif: 'Doublon 1', diagnosis: '', plan: '' },
  { id: 'dup', patientId: 'fictif-a', date: '2026-11-13', motif: 'Doublon 2', diagnosis: '', plan: '' },
];
const originalReferral = JSON.stringify(referralVisits);
const chosen = buildReferralSource('fictif-a', referralVisits);
assert.equal(chosen?.consultationId, 'valid-new');
assert.equal(chosen?.recordedMotif, 'Dernier motif sûr');
assert.equal(chosen?.recordedDiagnosis, 'Note');
assert.equal(chosen?.recordedPlan, 'Revoir');
assert.equal(buildReferralSource('fictif-b', referralVisits)?.consultationId, 'other');
assert.equal(buildReferralSource('', referralVisits), null);
assert.equal(buildReferralSource('fictif-a', referralVisits.slice(3)), null);
assert.equal(JSON.stringify(referralVisits), originalReferral);
console.log('PASS QW-161..165: strict chronology, unique provenance, isolated HELIOS Trends/Referral.');

