import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isValidFollowUpDate, isWritableFollowUpPlan, prepareFollowUp, summarizeFollowUps, selectDueFollowUps, selectUndatedPlannedFollowUps, selectLaterPlannedFollowUps, completedFollowUpPlan, matchesDisplayedFollowUpPlan, hasRequiredCompletionVersion, followUpStatusLabel, followUpDateLabel, countUndatedPlannedFollowUps, countLaterPlannedFollowUps, filterFollowUpsByObjective } from '../src/clinical/followUp.ts';
import { getConsultations } from '../src/services/storage.ts';
import { consultationClinicalSnapshot } from '../src/services/consultationIdentity.ts';
import { orderRecordedNewest, displayRecordedDate, recordedDateTimestamp } from '../src/clinical/medicalTimeline.ts';
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

// QW-071: plans beyond the 7-day window remain counted, but never inferred as urgent.
const longHorizonFixtures = [f('2026-11-18'), f('2026-11-19'), f('2027-01-01'), f('2026-02-30'), f('2027-01-01', 'completed')];
const longHorizonBefore = JSON.stringify(longHorizonFixtures);
assert.equal(countLaterPlannedFollowUps(longHorizonFixtures, '2026-11-11'), 2);
assert.equal(countLaterPlannedFollowUps(longHorizonFixtures, 'bad date'), 0);
assert.equal(countLaterPlannedFollowUps([], '2026-11-11'), 0);
assert.equal(JSON.stringify(longHorizonFixtures), longHorizonBefore);
assert.ok(dashboardUI.includes('countLaterPlannedFollowUps(clinicalConsultations,') &&
  dashboardUI.includes('planifié(s) à plus de 7 jours'));
console.log('PASS QW-071: future follow-up horizon is displayed without status mutation.');

// QW-072: invalid imported follow-up dates must be reviewable, never auto-completed.
const undatedRows = [
  { id: 'z', followUp: f('invalid').followUp },
  { id: 'a', followUp: f('').followUp },
  { id: 'x', followUp: f('2026-11-10').followUp },
  { id: 'y', followUp: f('invalid', 'completed').followUp },
];
const undatedRowsBefore = JSON.stringify(undatedRows);
assert.deepEqual(selectUndatedPlannedFollowUps(
  undatedRows as Parameters<typeof selectUndatedPlannedFollowUps>[0],
).map(item => item.id), ['a', 'z']);
assert.equal(JSON.stringify(undatedRows), undatedRowsBefore);
const invalidDateSection = consultationUI.split('HELIOS Follow-up · dates à corriger (')[1]
  ?.split('Historique des consultations')[0] ?? '';
assert.ok(invalidDateSection.includes('hasConfirmedPatientSelection(item.patientId, patients)') &&
  invalidDateSection.includes('onClick={() => startEditing(item)}') &&
  !invalidDateSection.includes('completeFollowUp(item)'),
  'Invalid dates may be opened only for a uniquely linked patient, never auto-completed.');
console.log('PASS QW-072: read-only invalid-date worklist and confirmed-identity edit action.');

// QW-073: valid plans beyond seven days can be reviewed without being closed.
const laterRows = [
  { id: 'end', followUp: f('2026-11-20').followUp },
  { id: 'early', followUp: f('2026-11-19').followUp },
  { id: 'edge', followUp: f('2026-11-18').followUp },
  { id: 'invalid', followUp: f('not-a-date').followUp },
  { id: 'completed', followUp: f('2026-11-20', 'completed').followUp },
];
const laterRowsBefore = JSON.stringify(laterRows);
assert.deepEqual(selectLaterPlannedFollowUps(
  laterRows as Parameters<typeof selectLaterPlannedFollowUps>[0], '2026-11-11',
).map(item => item.id), ['early', 'end']);
assert.deepEqual(selectLaterPlannedFollowUps(
  laterRows as Parameters<typeof selectLaterPlannedFollowUps>[0], 'invalid',
), []);
assert.equal(JSON.stringify(laterRows), laterRowsBefore);
const futureWorklistUI = consultationUI.split('HELIOS Follow-up · au-delà de 7 jours (')[1]
  ?.split('Historique des consultations')[0] ?? '';
assert.ok(futureWorklistUI.includes('hasConfirmedPatientSelection(item.patientId, patients)') &&
  futureWorklistUI.includes('onClick={() => startEditing(item)}') &&
  !futureWorklistUI.includes('completeFollowUp(item)'),
  'Future plans may be opened only for confirmed identities and not closed directly.');
console.log('PASS QW-073: reviewable future plans sorted by recorded date, with identity safeguards.');

// QW-074: each planned fictional follow-up belongs to exactly one horizon.
{
  const fixtures = [
    { id: 'past', followUp: f('2026-12-27').followUp },
    { id: 'today', followUp: f('2026-12-28').followUp },
    { id: 'boundary', followUp: f('2027-01-04').followUp },
    { id: 'later', followUp: f('2027-01-05').followUp },
    { id: 'invalid', followUp: f('2027-02-30').followUp },
    { id: 'done', followUp: f('2027-01-05', 'completed').followUp },
    { id: 'absent' },
  ] as Parameters<typeof selectDueFollowUps>[0];
  const before = JSON.stringify(fixtures);
  const today = '2026-12-28';
  const due = selectDueFollowUps(fixtures, today);
  const later = selectLaterPlannedFollowUps(fixtures, today);
  const undated = selectUndatedPlannedFollowUps(fixtures);
  const summary = summarizeFollowUps(fixtures, today);
  assert.equal(due.length, summary.overdue + summary.today + summary.nextSevenDays);
  assert.equal(later.length, countLaterPlannedFollowUps(fixtures, today));
  assert.equal(undated.length, countUndatedPlannedFollowUps(fixtures));
  const ids = [...due, ...later, ...undated].map(item => item.id);
  assert.deepEqual(ids.sort(), ['boundary', 'invalid', 'later', 'past', 'today']);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(JSON.stringify(fixtures), before);
}
console.log('PASS QW-074: follow-up horizons partition and dashboard/list agreement.');

// QW-075: objective search remains local, accent-insensitive, and non-mutating.
{
  const rows = [
    { id: 'a', followUp: { dueDate: '2026-11-20', objective: 'Réévaluer la dyspnée', status: 'planned' as const } },
    { id: 'b', followUp: { dueDate: '2026-11-21', objective: 'Contrôle des constantes', status: 'planned' as const } },
    { id: 'c', followUp: { dueDate: '2026-11-22', objective: '', status: 'planned' as const } },
    { id: 'd', followUp: undefined },
  ];
  const initial = JSON.stringify(rows);
  assert.deepEqual(filterFollowUpsByObjective(rows, '  DYSPNEE ').map(item => item.id), ['a']);
  assert.deepEqual(filterFollowUpsByObjective(rows, 'controle').map(item => item.id), ['b']);
  assert.deepEqual(filterFollowUpsByObjective(rows, 'aucune correspondance'), []);
  assert.deepEqual(filterFollowUpsByObjective(rows, '').map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(filterFollowUpsByObjective(rows, '   ').map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.equal(JSON.stringify(rows), initial);
  assert.ok(consultationUI.includes('id="follow-up-search-objective"') &&
    consultationUI.includes('setFollowUpSearch(e.target.value)') &&
    consultationUI.includes('filterFollowUpsByObjective(selectDueFollowUps(') &&
    consultationUI.includes('filterFollowUpsByObjective(selectUndatedPlannedFollowUps(') &&
    consultationUI.includes('filterFollowUpsByObjective(selectLaterPlannedFollowUps('));
}
console.log('PASS QW-075: local objective search, three worklists and non-mutation.');

// QW-078: follow-up actions must fail closed before entering the edit form or
// requesting confirmation if an imported consultation ID is ambiguous.
{
  const consultationSource = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const editing = consultationSource.split('function startEditing(')[1]
    ?.split('function cancelEditing(')[0] ?? '';
  const completion = consultationSource.split('function completeFollowUp(')[1]
    ?.split('function saveConsultation()')[0] ?? '';
  assert.ok(editing.includes('hasUniqueConsultationId(item.id, currentConsultations)') &&
    editing.includes('hasConfirmedPatientSelection(item.patientId, patients)') &&
    editing.indexOf('hasUniqueConsultationId(') < editing.indexOf('setEditingId(item.id)'));
  assert.ok(completion.includes('hasUniqueConsultationId(item.id, getConsultations())') &&
    completion.indexOf('hasUniqueConsultationId(') < completion.indexOf('window.confirm('));
}
console.log('PASS QW-078: imported ID ambiguity blocks follow-up edit and completion actions.');

// QW-079: editing may not silently reassign an imported or changed patient ID.
{
  const source = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const saving = source.split('function saveConsultation()')[1]
    ?.split('const vitalFields:')[0] ?? '';
  assert.ok(saving.includes('const currentRecords = getConsultations().filter(record => record.id === editingId);') &&
    saving.includes('currentRecords.length !== 1 || currentRecords[0].patientId !== patientId') &&
    // QW-131: the QW-127 revision argument is mandatory for clinician form edits.
    // The old two-argument literal caused a false regression failure.
    saving.indexOf('currentRecords.length !== 1') <
      saving.indexOf('updateConsultation(editingId, changes, editingClinicalSnapshot ?? undefined)') &&
    !saving.includes('updateConsultation(editingId, changes)'),
    'Consultation update must refuse missing, duplicate or patient-reassigned records.');
}
console.log('PASS QW-079: stale patient reassignment cannot be silently persisted.');

// QW-120: direct clinical writes cannot introduce invalid or invisible
// HELIOS follow-ups even when the React consultation form is bypassed.
{
  const planned = { dueDate: '2026-11-16', objective: 'Contrôle tensionnel fictif', status: 'planned' };
  const completed = { ...planned, status: 'completed' };
  assert.equal(isWritableFollowUpPlan(undefined), true);
  assert.equal(isWritableFollowUpPlan(planned), true);
  assert.equal(isWritableFollowUpPlan(completed), true);
  assert.equal(isWritableFollowUpPlan({ ...planned, objective: '' }), true);
  assert.equal(isWritableFollowUpPlan({ ...planned, objective: 'x'.repeat(500) }), true);

  for (const malformed of [
    null, [], '', 0, {},
    { ...planned, dueDate: '' },
    { ...planned, dueDate: '2026-02-30' },
    { ...planned, dueDate: '2026-11-16T00:00:00Z' },
    { ...planned, objective: 'x'.repeat(501) },
    { ...planned, objective: null },
    { ...planned, status: 'unknown' },
    { ...planned, status: undefined },
  ]) {
    assert.equal(isWritableFollowUpPlan(malformed), false,
      'Invalid follow-up should be rejected: ' + JSON.stringify(malformed)?.slice(0, 80));
  }

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const creation = hook.split('const addConsultation = useCallback(')[1]
    ?.split('const updateConsultation = useCallback(')[0] ?? '';
  const update = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  assert.ok(creation.includes('isWritableFollowUpPlan(consultation.followUp)') &&
    creation.indexOf('isWritableFollowUpPlan(') < creation.indexOf('createId()') &&
    creation.indexOf('isWritableFollowUpPlan(') < creation.indexOf('saveConsultations('),
    'Creation must reject malformed follow-ups before assigning an ID or saving.');
  assert.ok(update.includes('isWritableFollowUpPlan(changes.followUp)') &&
    update.indexOf('isWritableFollowUpPlan(') < update.indexOf('saveConsultations(updated)'),
    'Updates must reject a malformed supplied plan before changing stored clinical records.');

  const form = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes('prepareFollowUp(followUpDate, followUpObjective, followUpCompleted)'),
    'The existing clinician form must continue to normalize and validate follow-ups.');
}
console.log('PASS QW-120: HELIOS follow-up plans validated before central clinical writes.');

// QW-123: imported malformed plans cannot be marked completed.
{
  const plan = { dueDate: '2026-11-16', objective: 'x'.repeat(500), status: 'planned' as const };
  assert.equal(completedFollowUpPlan(plan)?.status, 'completed');
  assert.equal(completedFollowUpPlan({ ...plan, objective: 'x'.repeat(501) }), null);
  assert.equal(plan.status, 'planned');
}
console.log('PASS QW-123: completion respects central follow-up validation.');

// QW-125: an old HELIOS worklist row must never silently close a newer plan.
// All examples are fictional and this comparison is read-only.
{
  const shown = { dueDate: '2026-11-16', objective: 'Contrôle fictif', status: 'planned' as const };
  const persisted = { ...shown };
  const beforeShown = JSON.stringify(shown);
  const beforePersisted = JSON.stringify(persisted);
  assert.equal(matchesDisplayedFollowUpPlan(shown, persisted), true);
  assert.equal(matchesDisplayedFollowUpPlan(shown, shown), true);
  assert.equal(matchesDisplayedFollowUpPlan(shown,
    { ...shown, dueDate: '2026-11-17' }), false);
  assert.equal(matchesDisplayedFollowUpPlan(shown,
    { ...shown, objective: 'Contrôle biologique fictif' }), false);
  assert.equal(matchesDisplayedFollowUpPlan(shown,
    { ...shown, status: 'completed' }), false);
  assert.equal(matchesDisplayedFollowUpPlan(
    { ...shown, status: 'completed' }, shown), false);
  assert.equal(matchesDisplayedFollowUpPlan(undefined, shown), false);
  assert.equal(matchesDisplayedFollowUpPlan(shown, undefined), false);
  assert.equal(matchesDisplayedFollowUpPlan(
    { ...shown, dueDate: '2026-02-30' }, shown), false);
  assert.equal(matchesDisplayedFollowUpPlan(shown,
    { ...shown, objective: 'x'.repeat(501) }), false);
  assert.equal(JSON.stringify(shown), beforeShown);
  assert.equal(JSON.stringify(persisted), beforePersisted);

  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const completion = page.split('function completeFollowUp(')[1]
    ?.split('function saveConsultation()')[0] ?? '';
  const firstCheck = completion.indexOf(
    'matchesDisplayedFollowUpPlan(item.followUp, current.followUp)');
  const confirmation = completion.indexOf('window.confirm(');
  const secondCheck = completion.indexOf(
    'matchesDisplayedFollowUpPlan(item.followUp, latest[0].followUp)');
  const update = completion.indexOf('updateConsultation(current.id, { followUp: completedPlan }, latestClinicalSnapshot)');
  assert.ok(firstCheck > completion.indexOf('hasConfirmedPatientSelection(') &&
    firstCheck < confirmation &&
    completion.includes('const latest = getConsultations().filter(') &&
    secondCheck > confirmation && secondCheck < update &&
    completion.includes('latest.length !== 1 || latest[0].patientId !== item.patientId'),
    'A stale follow-up must be refused both before and after confirmation, before update.');
}
console.log('PASS QW-125: stale HELIOS worklist rows cannot silently complete changed plans.');

// QW-128 — follow-up completion must also check the latest entire clinical
// record at the central storage boundary, not only the displayed follow-up.
{
  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const completion = page.split('function completeFollowUp(')[1]
    ?.split('function saveConsultation()')[0] ?? '';
  const confirmAt = completion.indexOf('window.confirm(');
  const latestAt = completion.indexOf('const latest = getConsultations().filter(');
  const followUpGuardAt = completion.indexOf(
    'matchesDisplayedFollowUpPlan(item.followUp, latest[0].followUp)');
  const snapshotAt = completion.indexOf(
    'const latestClinicalSnapshot = consultationClinicalSnapshot(latest[0])');
  const validSnapshotAt = completion.indexOf('if (!latestClinicalSnapshot)');
  const updateAt = completion.indexOf(
    'updateConsultation(current.id, { followUp: completedPlan }, latestClinicalSnapshot)');
  assert.ok(confirmAt >= 0 &&
    latestAt > confirmAt &&
    followUpGuardAt > latestAt &&
    snapshotAt > followUpGuardAt &&
    validSnapshotAt > snapshotAt &&
    updateAt > validSnapshotAt &&
    completion.includes('latest.length !== 1 || latest[0].patientId !== item.patientId'),
    'HELIOS must forward the freshly checked clinical record version to the hook before completion.');

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const updateHook = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  const hookGuardAt = updateHook.indexOf(
    'consultationClinicalSnapshot(currentConsultation) !== expectedClinicalSnapshot');
  assert.ok(updateHook.includes('expectedClinicalSnapshot?: string') &&
    hookGuardAt >= 0 && hookGuardAt < updateHook.indexOf('saveConsultations(updated)'),
    'QW-127 central version checking must remain available for HELIOS completion.');

  // A clinical note can change while the follow-up itself stays identical.
  // The follow-up-only QW-125 check would pass, but the full snapshot differs.
  const shownPlan = { dueDate: '2026-11-16', objective: 'Contrôle fictif', status: 'planned' as const };
  const initiallyShown = { id: 'consultation-fictive-128', patientId: 'patient-fictif',
    date: '2026-11-13T10:00:00.000Z', motif: 'Contrôle clinique',
    symptoms: 'Symptômes fictifs', history: '',
    vitals: { systolic: '', diastolic: '', heartRate: '', spo2: '', temperature: '',
      respiratoryRate: '', weight: '', height: '', glycemia: '' }, examination: '',
    diagnosis: '', plan: '', createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z', followUp: shownPlan };
  const updatedInAnotherTab = { ...initiallyShown, diagnosis: 'Autre hypothèse fictive' };
  assert.equal(matchesDisplayedFollowUpPlan(initiallyShown.followUp, updatedInAnotherTab.followUp), true);
  // Use the existing snapshot helper (read-only) rather than a new clinical date rule.
  assert.notEqual(consultationClinicalSnapshot(initiallyShown),
    consultationClinicalSnapshot(updatedInAnotherTab));
}
console.log('PASS QW-128: HELIOS completion carries a full clinical revision guard.');


// QW-129 — a worklist row is unsafe when any clinical field changes, even if
// its follow-up plan is unchanged. Audit timestamps alone are not clinical edits.
{
  type ClinicalFixture = NonNullable<Parameters<typeof consultationClinicalSnapshot>[0]>;
  const plan = { dueDate: '2026-11-20', objective: 'Suivi fictif', status: 'planned' as const };
  const displayed = {
    id: 'consultation-fictive-129', patientId: 'patient-fictif',
    date: '2026-11-13T10:00:00.000Z', motif: 'Contrôle fictif',
    diagnosis: 'Hypothèse fictive initiale', plan: 'Réévaluer',
    followUp: plan, createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
  } as ClinicalFixture;
  const clinicalUpdate = { ...displayed, diagnosis: 'Hypothèse fictive modifiée' };
  const planUpdate = { ...displayed, followUp: { ...plan, objective: 'Autre contrôle fictif' } };
  const auditOnly = { ...displayed, updatedAt: '2026-11-14T10:00:00.000Z' };
  const before = JSON.stringify(displayed);
  assert.equal(matchesDisplayedFollowUpPlan(displayed.followUp, clinicalUpdate.followUp), true);
  assert.notEqual(consultationClinicalSnapshot(displayed), consultationClinicalSnapshot(clinicalUpdate));
  assert.notEqual(consultationClinicalSnapshot(displayed), consultationClinicalSnapshot(planUpdate));
  assert.equal(consultationClinicalSnapshot(displayed), consultationClinicalSnapshot(auditOnly));
  assert.equal(JSON.stringify(displayed), before, 'Snapshot comparisons must be read-only');

  const ui = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const completion = ui.split('function completeFollowUp(')[1]
    ?.split('function saveConsultation()')[0] ?? '';
  const sourceAt = completion.indexOf('const displayedClinicalSnapshot = consultationClinicalSnapshot(item)');
  const beforeConfirmAt = completion.indexOf('consultationClinicalSnapshot(current) !== displayedClinicalSnapshot');
  const confirmAt = completion.indexOf('window.confirm(');
  const afterConfirmAt = completion.indexOf('latestClinicalSnapshot !== displayedClinicalSnapshot');
  const finalUpdateAt = completion.indexOf(
    'updateConsultation(current.id, { followUp: completedPlan }, latestClinicalSnapshot)');
  assert.ok(sourceAt >= 0 &&
    beforeConfirmAt > sourceAt && beforeConfirmAt < confirmAt &&
    afterConfirmAt > confirmAt && afterConfirmAt < finalUpdateAt,
    'QW-129 requires full clinical version checks before and after confirmation');
}
console.log('PASS QW-129: stale HELIOS worklist clinical versions are rejected.');


// QW-130: central HELIOS completion writes require the expected clinical
// version even if they bypass the visible follow-up action.
{
  const planned = { dueDate: '2026-11-20', objective: 'Contrôle fictif', status: 'planned' as const };
  const completed = { ...planned, status: 'completed' as const };
  const before = JSON.stringify({ planned, completed });
  for (const missingVersion of [undefined, null, '', 0, {}, false]) {
    assert.equal(hasRequiredCompletionVersion(completed, missingVersion), false,
      'A completed follow-up cannot be persisted without a source version.');
  }
  assert.equal(hasRequiredCompletionVersion(completed, 'verified-fictitious-clinical-snapshot'), true);
  assert.equal(hasRequiredCompletionVersion(planned, undefined), true);
  assert.equal(hasRequiredCompletionVersion(undefined, undefined), true);
  assert.equal(hasRequiredCompletionVersion(null, undefined), true);
  assert.equal(hasRequiredCompletionVersion({ ...planned, status: 'unexpected' }, undefined), true);
  assert.equal(JSON.stringify({ planned, completed }), before,
    'A guard must never modify its input documents.');

  const hook = readFileSync(new URL('../src/hooks/useMedicalData.ts', import.meta.url), 'utf8');
  const update = hook.split('const updateConsultation = useCallback(')[1]
    ?.split('const deleteConsultation = useCallback(')[0] ?? '';
  const versionRequiredAt = update.indexOf(
    '!hasRequiredCompletionVersion(changes.followUp, expectedClinicalSnapshot)');
  const snapshotComparedAt = update.indexOf(
    'consultationClinicalSnapshot(currentConsultation) !== expectedClinicalSnapshot');
  const writeAt = update.indexOf('saveConsultations(updated)');
  assert.ok(versionRequiredAt >= 0 && snapshotComparedAt > versionRequiredAt &&
    writeAt > snapshotComparedAt &&
    hook.includes('hasRequiredCompletionVersion, isWritableFollowUpPlan'),
    'The central hook must require and compare a clinical version before completed follow-up writes.');

  const consultPage = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  assert.ok(consultPage.includes(
    'updateConsultation(current.id, { followUp: completedPlan }, latestClinicalSnapshot)') &&
    consultPage.includes('updateConsultation(editingId, changes, editingClinicalSnapshot ?? undefined)'),
    'Existing clinician completion and editing flows must forward clinical versions.');
}
console.log('PASS QW-130: HELIOS completed follow-up cannot bypass the central revision requirement.');


// QW-132: imported/legacy follow-up status is never silently presented as
// planned when its status field is absent, invalid, or malformed.
{
  const planned = { dueDate: '2026-11-20', objective: 'Contrôle fictif', status: 'planned' };
  const completed = { ...planned, status: 'completed' };
  const malformedCases: unknown[] = [
    undefined, null, [], '', 0, {},
    { dueDate: '2026-11-20', objective: 'Contrôle fictif' },
    { ...planned, status: 'unexpected' },
    { ...planned, status: '' },
    { ...planned, status: null },
    { ...planned, status: 1 },
  ];
  const before = JSON.stringify({ planned, completed, malformedCases });
  assert.equal(followUpStatusLabel(planned), 'Contrôle prévu');
  assert.equal(followUpStatusLabel(completed), 'Contrôle effectué');
  for (const oldPlan of malformedCases) {
    assert.equal(followUpStatusLabel(oldPlan), 'Statut de suivi à vérifier',
      'Unrecognized imported status must not masquerade as planned.');
  }
  assert.equal(JSON.stringify({ planned, completed, malformedCases }), before,
    'The read-only status label must not modify clinical records.');
  const formSource = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const historySection = formSource.split('Historique des consultations (')[1] ?? '';
  assert.ok(historySection.includes('followUpStatusLabel(item.followUp)') &&
    !historySection.includes("item.followUp.status === 'completed' ? 'Contrôle effectué' : 'Contrôle prévu'"),
    'The real consultation history must use the explicit three-state label.');
}
console.log('PASS QW-132: imported unknown HELIOS statuses shown as requiring review.');


// QW-133: the clinical history must not render absent, impossible, or
// malformed imported dates as though a real follow-up appointment existed.
{
  const planned = { dueDate: '2026-11-20', objective: 'Contrôle fictif', status: 'planned' };
  const missingDate = { objective: 'Contrôle fictif', status: 'planned' };
  const before = JSON.stringify({ planned, missingDate });
  assert.equal(followUpDateLabel(planned), '2026-11-20');
  assert.equal(followUpDateLabel({ ...planned, dueDate: '2024-02-29' }), '2024-02-29');
  for (const bad of [undefined, null, [], '', {}, missingDate,
    { ...planned, dueDate: '' },
    { ...planned, dueDate: '2026-02-30' },
    { ...planned, dueDate: '2026-13-01' },
    { ...planned, dueDate: '20/11/2026' },
    { ...planned, dueDate: '2026-11-20T00:00:00Z' },
    { ...planned, dueDate: 20261120 },
  ]) {
    assert.equal(followUpDateLabel(bad), 'Date de suivi à vérifier',
      'Invalid imported follow-up date must be visibly flagged');
  }
  assert.equal(JSON.stringify({ planned, missingDate }), before,
    'Follow-up display helpers must not mutate clinical records.');

  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const history = page.split('Historique des consultations (')[1] ?? '';
  assert.ok(history.includes('followUpDateLabel(item.followUp)') &&
    history.includes('followUpStatusLabel(item.followUp)') &&
    !history.includes('{item.followUp.dueDate} · {followUpStatusLabel(item.followUp)}'),
    'The real clinical history must distinguish invalid dates from documented appointments.');
}
console.log('PASS QW-133: HELIOS invalid imported follow-up dates flagged, never inferred.');


// QW-134 — historical consultations may be edited only when both the patient
// linkage and consultation ID are unique. An imported name is not identity proof.
{
  const patients = [{ id: 'patient-fictif' }, { id: 'autre-patient-fictif' }];
  const duplicatePatients = [{ id: 'patient-fictif' }, { id: 'patient-fictif' }];
  const before = JSON.stringify({ patients, duplicatePatients });
  assert.equal(hasConfirmedPatientSelection('patient-fictif', patients), true);
  assert.equal(hasConfirmedPatientSelection('patient-fictif', duplicatePatients), false);
  assert.equal(hasConfirmedPatientSelection('patient-absent', patients), false);
  assert.equal(hasConfirmedPatientSelection('', patients), false);
  assert.equal(JSON.stringify({ patients, duplicatePatients }), before);

  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const history = page.split('Historique des consultations (')[1] ?? '';
  const identityAt = history.indexOf('hasConfirmedPatientSelection(item.patientId, patients)');
  const editEligibilityAt = history.indexOf('hasUniqueConsultationId(item.id, consultations)');
  const showButtonAt = history.indexOf('{canEditHistoricalConsultation ? (');
  const editCallAt = history.indexOf('onClick={() => startEditing(item)}');
  assert.ok(identityAt >= 0 && editEligibilityAt > identityAt &&
    showButtonAt > editEligibilityAt && editCallAt > showButtonAt &&
    history.includes("Dossier patient non relié — identité à confirmer") &&
    history.includes('Identifiant de patient ou de consultation absent, dupliqué ou non confirmé') &&
    !history.includes("linkedPatient?.name || legacyPatientName"),
    'History must not infer an identity from the first duplicate or a legacy name.');
  const editor = page.split('function startEditing(')[1]
    ?.split('function cancelEditing(')[0] ?? '';
  assert.ok(editor.includes('hasUniqueConsultationId(item.id, currentConsultations)') &&
    editor.includes('hasConfirmedPatientSelection(item.patientId, patients)'),
    'The historical edit handler must still independently recheck identity.');
}
console.log('PASS QW-134: imported historical identity ambiguity cannot offer unsafe editing.');


// QW-135: reuse the validated clinical-timeline date order and display in
// consultation history. Unknown/imported invalid dates are retained but placed
// after dated visits; the source records must not be modified.
{
  const imported = [
    { id: 'unknown-b', date: '2026-02-30', motif: 'Ancienne note fictive B' },
    { id: 'valid-early', date: '2026-11-01T09:00:00Z', motif: 'Contrôle fictif' },
    { id: 'unknown-a', date: 'date ancienne invalide', motif: 'Ancienne note fictive A' },
    { id: 'valid-later', date: '2026-11-13T08:00:00Z', motif: 'Autre contrôle fictif' },
    { id: 'valid-tie', date: '2026-11-13T08:00:00Z', motif: 'Date égale fictive' },
  ];
  const original = JSON.stringify(imported);
  const ordered = orderRecordedNewest(imported);
  assert.deepEqual(ordered.map(item => item.id), [
    'valid-later', 'valid-tie', 'valid-early', 'unknown-a', 'unknown-b',
  ]);
  assert.equal(JSON.stringify(imported), original, 'Sorting must not mutate historical records.');
  assert.equal(recordedDateTimestamp(imported[0].date), null);
  assert.equal(displayRecordedDate(imported[0].date), 'Date non renseignée');
  assert.equal(displayRecordedDate(imported[2].date), 'Date non renseignée');
  assert.notEqual(displayRecordedDate(imported[1].date), 'Date non renseignée');
  assert.notEqual(displayRecordedDate(imported[3].date), 'Date non renseignée');

  const page = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
  const history = page.split('Historique des consultations (')[1] ?? '';
  assert.ok(page.includes('const sortedConsultations = orderRecordedNewest(consultations);') &&
    history.includes('displayRecordedDate(item.date)') &&
    page.includes("from '../clinical/medicalTimeline'") &&
    !history.includes("new Date(item.date).toLocaleString('fr-FR')") &&
    !page.includes('new Date(b.date).getTime() - new Date(a.date).getTime()'),
    'The consultation history must reuse the validated safe clinical date helpers.');
}
console.log('PASS QW-135: consultation history safely sorts and displays recorded dates.');
