// QW-059: synthetic source contract, no network or patient data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/pages/Patients.tsx', 'utf8');
assert.ok(source.includes("const timelineDateRangeReversed = timelineFromDate !== '' && timelineToDate !== '' && timelineFromDate > timelineToDate;"));
for (const id of ['patient-timeline-from', 'patient-timeline-to']) {
  const start = source.indexOf('<input id="' + id + '"');
  assert.ok(start >= 0);
  const field = source.slice(start, source.indexOf('/>', start));
  assert.ok(field.includes('aria-invalid={timelineDateRangeReversed}'));
  assert.ok(field.includes('aria-describedby="patient-timeline-date-help"'));
}
assert.ok(source.includes('id="patient-timeline-date-help"'));
assert.ok(source.includes('La date de début est postérieure à la date de fin.'));
assert.ok(source.includes('Les événements sans date valide ne figurent pas dans une période filtrée.'));
console.log('QW-059 synthetic date help contract OK');
