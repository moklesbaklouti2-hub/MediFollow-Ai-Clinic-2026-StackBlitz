import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isValidFollowUpDate, prepareFollowUp, summarizeFollowUps } from '../src/clinical/followUp.ts';
import { getConsultations } from '../src/services/storage.ts';

// All fixtures are fictional, without external calls.
for (const date of ['2026-11-11', '2024-02-29', '2027-01-01', '2000-02-29']) {
  assert.equal(isValidFollowUpDate(date), true, 'Valid date: ' + date);
}
for (const value of ['', '2025-02-29', '2026-02-30', '2026-13-01', '2026-00-01',
  '2026-01-00', '11/11/2026', '2026-1-1', null, 20261111, '2026-11-11T00:00:00Z']) {
  assert.equal(isValidFollowUpDate(value), false, 'Invalid date: ' + value);
}
assert.deepEqual(prepareFollowUp('', '', false), { valid: true });
assert.deepEqual(prepareFollowUp('2026-11-11', '  Revoir constantes fictives  ', false), {
  valid: true, followUp: { dueDate: '2026-11-11', objective: 'Revoir constantes fictives', status: 'planned' },
});
assert.deepEqual(prepareFollowUp('2026-11-11', '', true), {
  valid: true, followUp: { dueDate: '2026-11-11', objective: '', status: 'completed' },
});
assert.equal(prepareFollowUp('', 'Objectif sans date', false).valid, false);
assert.equal(prepareFollowUp('', '', true).valid, false);
assert.equal(prepareFollowUp('2026-02-30', 'Test fictif', false).valid, false);
assert.equal(prepareFollowUp('2026-11-11', 'x'.repeat(501), false).valid, false);
assert.equal(prepareFollowUp('2026-11-11', 'x'.repeat(500), false).valid, true);

const f = (date: string, status: 'planned' | 'completed' = 'planned') =>
  ({ followUp: { dueDate: date, objective: 'Contrôle fictif', status } });
const followUps = [
  f('2026-11-09'), f('2026-11-10'), f('2026-11-11'),
  f('2026-11-12'), f('2026-11-18'), f('2026-11-19'),
  f('2026-11-10', 'completed'), f('2026-02-30'), { followUp: undefined },
];
assert.deepEqual(summarizeFollowUps(followUps, '2026-11-11'),
  { overdue: 2, today: 1, nextSevenDays: 2 });
assert.deepEqual(summarizeFollowUps(followUps, 'invalid'),
  { overdue: 0, today: 0, nextSevenDays: 0 });
assert.deepEqual(summarizeFollowUps([f('2027-01-01')], '2026-12-28'),
  { overdue: 0, today: 0, nextSevenDays: 1 });
assert.deepEqual(summarizeFollowUps([f('2024-02-29')], '2024-03-01'),
  { overdue: 1, today: 0, nextSevenDays: 0 });

const records = new Map<string, string>();
let writes = 0;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, value: {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { writes++; records.set(key, value); },
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true, value: { dispatchEvent: () => true },
});
records.set('medifollow-consultations', JSON.stringify([
  { id: 'consultation-fictive-1', patientId: 'p1', motif: 'Suivi fictif', date: '2026-11-09', followUp: f('2026-11-10').followUp },
  { id: 'consultation-fictive-2', patientId: 'p1', motif: 'Contrôle fictif', date: '2026-11-10', followUp: f('2026-11-11', 'completed').followUp },
  { id: 'consultation-fictive-3', patientId: 'p2', motif: 'Ancien dossier fictif', date: '2026-11-01' },
]));
const restored = getConsultations();
assert.equal(restored.length, 3);
assert.equal(restored[0].followUp?.dueDate, '2026-11-10');
assert.equal(restored[1].followUp?.status, 'completed');
assert.deepEqual(summarizeFollowUps(restored, '2026-11-11'),
  { overdue: 1, today: 0, nextSevenDays: 0 });
assert.equal(writes, 0, 'Reading follow-up records must not rewrite data.');

const consultationUI = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
const dashboardUI = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
assert.ok(consultationUI.includes('prepareFollowUp(followUpDate, followUpObjective, followUpCompleted)') &&
  consultationUI.includes('followUp: followUpPlan.followUp') &&
  consultationUI.includes('setFollowUpDate(item.followUp?.dueDate') &&
  consultationUI.includes("setFollowUpCompleted(item.followUp?.status === 'completed')") &&
  consultationUI.includes('HELIOS Follow-up'),
  'The real consultation form must edit and persist follow-up plans.');
assert.ok(dashboardUI.includes('summarizeFollowUps(getConsultations()') &&
  dashboardUI.includes('data.followUpConsultations.overdue') &&
  dashboardUI.includes('onClick={onStartConsultation}'),
  'The dashboard must show follow-up counts and link to consultations.');
console.log('PASS HELIOS Follow-up: valid calendar dates, time windows, storage and UI, without data migration.');
