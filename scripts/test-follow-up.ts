import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isValidFollowUpDate, prepareFollowUp, summarizeFollowUps, selectDueFollowUps, completedFollowUpPlan, countUndatedPlannedFollowUps } from '../src/clinical/followUp.ts';
import { getConsultations } from '../src/services/storage.ts';
import { hasConfirmedPatientSelection } from '../src/services/patientSelectionGuard.ts';
import { parseExpressDraft, expressWouldOverwrite, MAX_EXPRESS_DRAFT_CHARS } from '../src/clinical/consultationExpress.ts';

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

const dueConsultations = [
  { id: 'd5', followUp: f('2026-11-20').followUp },
  { id: 'd4', followUp: f('2026-11-18').followUp },
  { id: 'd3', followUp: f('2026-11-10', 'completed').followUp },
  { id: 'd2', followUp: f('2026-11-11').followUp },
  { id: 'd1', followUp: f('2026-11-09').followUp },
  { id: 'd6', followUp: f('2026-02-30').followUp },
  { id: 'd7' },
  { id: 'd0', followUp: f('2026-11-11').followUp },
];
const originalOrder = dueConsultations.map(item => item.id).join(',');
const selectedDue = selectDueFollowUps(
  dueConsultations as Parameters<typeof selectDueFollowUps>[0], '2026-11-11'
);
assert.deepEqual(selectedDue.map(item => item.id), ['d1', 'd0', 'd2', 'd4']);
assert.equal(dueConsultations.map(item => item.id).join(','), originalOrder,
  'Le tri des échéances ne doit pas muter l’historique.');
assert.deepEqual(selectDueFollowUps(
  dueConsultations as Parameters<typeof selectDueFollowUps>[0], 'date invalide'),
  [], 'Aucune échéance ne doit être classée sur une date de référence invalide.');
assert.deepEqual(selectDueFollowUps(
  [{ id: 'nouvel-an', followUp: f('2027-01-01').followUp }] as Parameters<typeof selectDueFollowUps>[0],
  '2026-12-28',
).map(item => item.id), ['nouvel-an']);
assert.deepEqual(selectDueFollowUps(restored, '2026-11-11').map(item => item.id),
  ['consultation-fictive-1']);

const originalPlan = f('2026-11-11').followUp;
const complete = completedFollowUpPlan(originalPlan);
assert.deepEqual(complete, {
  dueDate: '2026-11-11', objective: 'Contrôle fictif', status: 'completed',
});
assert.equal(originalPlan.status, 'planned', 'La validation ne doit pas modifier l’objet original.');
assert.equal(completedFollowUpPlan(f('2026-11-11', 'completed').followUp), null);
assert.equal(completedFollowUpPlan(f('2026-02-30').followUp), null);
assert.equal(completedFollowUpPlan(undefined), null);
assert.equal(completedFollowUpPlan({
  dueDate: '2026-11-11', objective: 99 as unknown as string, status: 'planned',
}), null);

const consultationUI = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
const dashboardUI = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
assert.ok(consultationUI.includes('prepareFollowUp(followUpDate, followUpObjective, followUpCompleted)') &&
  consultationUI.includes('followUp: followUpPlan.followUp') &&
  consultationUI.includes('setFollowUpDate(item.followUp?.dueDate') &&
  consultationUI.includes("setFollowUpCompleted(item.followUp?.status === 'completed')") &&
  consultationUI.includes('HELIOS Follow-up'),
  'The real consultation form must edit and persist follow-up plans.');
assert.ok(dashboardUI.includes('summarizeFollowUps(clinicalConsultations,') &&
  dashboardUI.includes('const clinicalConsultations = getConsultations();') &&
  dashboardUI.includes('data.followUpConsultations.overdue') &&
  dashboardUI.includes('onClick={onStartConsultation}'),
  'The dashboard must show follow-up counts and link to consultations.');
assert.ok(consultationUI.includes('selectDueFollowUps(consultations, followUpToday)') &&
  consultationUI.includes('dueFollowUps.map((item)') &&
  consultationUI.includes('linkedPatient ? (') &&
  consultationUI.includes('onClick={() => startEditing(item)}') &&
  consultationUI.includes('Dossier patient non relié — identité à confirmer'),
  'The worklist must order follow-ups, open confirmed records and flag unlinked identities.');
const completionCode = consultationUI.split('function completeFollowUp(')[1]?.split('function saveConsultation()')[0] ?? '';
assert.ok(completionCode.includes('getConsultations().find(') &&
  completionCode.includes('current.patientId !== item.patientId') &&
  completionCode.includes('hasConfirmedPatientSelection(current.patientId, patients)') &&
  completionCode.includes('completedFollowUpPlan(current.followUp)') &&
  completionCode.includes('window.confirm(') &&
  completionCode.includes('if (!updateConsultation('),
  'La clôture rapide doit revérifier le patient, confirmer explicitement et vérifier l’enregistrement.');
assert.ok(consultationUI.includes('onClick={() => completeFollowUp(item)}') &&
  consultationUI.includes('Marquer le contrôle effectué') &&
  consultationUI.includes('linkedPatient ? ('),
  'L’action de clôture n’est offerte qu’aux dossiers patients confirmés.');

// QW-032 — all rapid follow-up actions must refuse duplicate imported IDs.
// This uses the same pure patient-selection guard as consultation save.
const followUpSelectionCases: Array<{
  patientId: unknown;
  patients: Array<{ id: string }>;
  allowed: boolean;
}> = [
  { patientId: 'alpha', patients: [{ id: 'alpha' }], allowed: true },
  { patientId: 'alpha', patients: [{ id: 'alpha' }, { id: 'beta' }], allowed: true },
  { patientId: 'alpha', patients: [{ id: 'alpha' }, { id: 'alpha' }], allowed: false },
  { patientId: 'missing', patients: [{ id: 'alpha' }], allowed: false },
  { patientId: '', patients: [{ id: '' }], allowed: false },
  { patientId: null, patients: [{ id: 'alpha' }], allowed: false },
  { patientId: 9, patients: [{ id: '9' }], allowed: false },
  { patientId: 'alpha', patients: [], allowed: false },
];
for (const scenario of followUpSelectionCases) {
  assert.equal(hasConfirmedPatientSelection(scenario.patientId, scenario.patients),
    scenario.allowed, 'Unsafe follow-up patient identity.');
}
const followUpListCode = consultationUI.split('dueFollowUps.map((item) => {')[1]
  ?.split("key={'follow-up-' + item.id}")[0] ?? '';
assert.ok(followUpListCode.includes('hasConfirmedPatientSelection(item.patientId, patients)') &&
  followUpListCode.includes('patients.find(patient => patient.id === item.patientId)'),
  'A follow-up action must be hidden unless the patient ID is unique.');
assert.ok(completionCode.includes('hasConfirmedPatientSelection(current.patientId, patients)') &&
  completionCode.indexOf('hasConfirmedPatientSelection(') <
    completionCode.indexOf('window.confirm(') &&
  completionCode.indexOf('hasConfirmedPatientSelection(') <
    completionCode.indexOf('updateConsultation('),
  'The real follow-up completion must reject ambiguous patient IDs before confirming or saving.');
console.log('PASS HELIOS Follow-up QW-032: 8 synthetic identities and 2 actual UI contracts.');


// QW-042 — HELIOS Consultation Express: strict documentary mapping, no
// inference, no accidental overwrite, no patient selection by name and no save.
const expressGood = parseExpressDraft([
  'Motif: Vertiges fictifs', 'Symptômes: Depuis 2 jours',
  'Histoire: Traitement fictif', 'Diagnostic: À confirmer',
  'Plan: Contrôle à discuter',
].join('\n'));
assert.deepEqual(expressGood, { valid: true, fields: {
  motif: 'Vertiges fictifs', symptoms: 'Depuis 2 jours',
  history: 'Traitement fictif', diagnosis: 'À confirmer',
  plan: 'Contrôle à discuter',
} });
assert.deepEqual(parseExpressDraft('Motif: Douleur fictive'), { valid: true, fields: { motif: 'Douleur fictive' } });
assert.deepEqual(parseExpressDraft('MOTIF: Douleur fictive\r\nSYMPTOMES: Depuis hier'),
  { valid: true, fields: { motif: 'Douleur fictive', symptoms: 'Depuis hier' } });
for (const invalid of [
  '', null, 42, 'Symptômes: Fièvre', 'Patient: Nom fictif\nMotif: Fatigue',
  'Motif: a\nMotif: b', 'Motif:', 'Motif: a\nligne sans étiquette',
  'Motif: a\nSpécialité: ORL', 'Motif: ' + 'a'.repeat(701),
  'Motif: ' + 'a'.repeat(MAX_EXPRESS_DRAFT_CHARS),
]) assert.equal(parseExpressDraft(invalid).valid, false, 'Unsafe express input');
assert.equal(expressWouldOverwrite({ motif: 'B' }, { motif: 'A' }), true);
assert.equal(expressWouldOverwrite({ motif: 'B' }, { symptoms: 'A' }), false);
assert.equal(expressWouldOverwrite({ diagnosis: 'X' }, { diagnosis: '   ' }), false);
assert.equal(expressWouldOverwrite({ plan: 'B' }, { plan: 'A' }), true);
assert.ok(consultationUI.includes('parseExpressDraft(expressDraft)') &&
  consultationUI.includes('expressWouldOverwrite(result.fields, { motif, symptoms, history, diagnosis, plan })') &&
  consultationUI.includes('hasConfirmedPatientSelection(patientId, patients) || !specialty') &&
  consultationUI.includes('if (expressPatientId && expressPatientId !== patientId)') &&
  consultationUI.includes('onClick={applyExpressDraft}') &&
  consultationUI.includes('Préremplir les champs — sans enregistrer') &&
  consultationUI.includes('function saveConsultation()') &&
  consultationUI.includes('HELIOS Consultation Express · saisie rapide'),
  'Express UI must verify identity, avoid overwrite, and use existing manual save.');
console.log('PASS QW-042: fictional labelled-note parsing, conflict and UI guard checks.');


// QW-043 — a changed patient must not receive Express data through a save
// or an automatic clinical-analysis call; an explicit confirmed full reset
// restores the original blank-consultation workflow.
const resetSource = consultationUI.split('function resetExpressConsultation()')[1]
  ?.split('function startEditing(')[0] ?? '';
assert.ok(resetSource.includes('window.confirm(') &&
  resetSource.includes('cancelEditing();') &&
  resetSource.indexOf('window.confirm(') < resetSource.indexOf('cancelEditing();'),
  'Reset must explicitly confirm before clearing the unsaved consultation.');
const safeExpressUi = consultationUI.split('HELIOS Consultation Express · saisie rapide')[1]
  ?.split('Copilote clinique intelligent')[0] ?? '';
assert.ok(safeExpressUi.includes('onClick={resetExpressConsultation}') &&
  safeExpressUi.includes('Réinitialiser la consultation non enregistrée') &&
  safeExpressUi.includes('expressPatientMismatch &&') &&
  safeExpressUi.includes('role="alert"'),
  'The reset and mismatch notice must be visible even when Express input is collapsed.');
assert.ok(consultationUI.includes('enabled: smartCopilotEnabled && !expressPatientMismatch') &&
  consultationUI.includes('expressPatientMismatch ? null : clinicalReasoning.analysis') &&
  consultationUI.includes('expressPatientMismatch ? [] : detectClinicalSuggestions(') &&
  consultationUI.includes('const selectedPatient = !expressPatientMismatch') &&
  consultationUI.includes("if (expressPatientId && expressPatientId !== patientId)"),
  'A patient mismatch must suppress both clinical suggestions and AI analysis, and block saving.');
console.log('PASS QW-043: confirmed reset plus fail-closed AI, UI and save contracts.');

console.log('PASS HELIOS Follow-up: échéances, liste, clôture confirmée, sauvegarde fictive et contrats UI.');

// QW-070: imported invalid dates must not silently disappear from dashboard.
const undatedFixtures = [f('2026-02-30'), f(''), f('2026-11-11'), f('', 'completed'), { followUp: undefined }];
const undatedBefore = JSON.stringify(undatedFixtures);
assert.equal(countUndatedPlannedFollowUps(undatedFixtures), 2);
assert.equal(countUndatedPlannedFollowUps([]), 0);
assert.equal(JSON.stringify(undatedFixtures), undatedBefore);
assert.ok(dashboardUI.includes('countUndatedPlannedFollowUps(clinicalConsultations)') &&
  dashboardUI.includes('sans date valide, exclus des échéances'));
console.log('PASS QW-070: documentary count of undated planned follow-ups.');
