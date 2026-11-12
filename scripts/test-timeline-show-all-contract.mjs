// QW-061: synthetic source contract; no network or patient records.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/pages/Patients.tsx', 'utf8');
const start = source.indexOf('{pagedMedicalTimeline.length < specialtyFilteredMedicalTimeline.length && (');
assert.ok(start >= 0, 'Show-all action must only appear when matching results are truncated');
const end = source.indexOf('{medicalTimeline.length === 0 ? (', start);
assert.ok(end > start);
const action = source.slice(start, end);
assert.ok(action.includes('type="button"'));
assert.ok(action.includes("onClick={() => setTimelineDisplayLimit('all')}"));
assert.ok(action.includes('Afficher tous les résultats correspondants'));
assert.ok(!action.includes('resetTimelineControls'), 'Show-all must preserve filters');
assert.ok(source.includes('limitTimelineEvents(specialtyFilteredMedicalTimeline, timelineDisplayLimit)'));
console.log('QW-061 synthetic show-all contract OK');
