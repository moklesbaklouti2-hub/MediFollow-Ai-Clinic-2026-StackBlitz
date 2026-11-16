// LAB-UI-001 — Static contract only. Not a browser/visual accessibility audit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const consultation = readFileSync(new URL('../src/pages/Consultations.tsx', import.meta.url), 'utf8');
const physicalExam = readFileSync(new URL('../src/components/PhysicalExaminationEditor.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/clinical-premium.css', import.meta.url), 'utf8');

const inputIds = [
  'consultation-patient',
  'consultation-specialty',
  'consultation-reason',
  'consultation-symptoms',
  'consultation-history',
  'consultation-interview',
  'consultation-examination-notes',
  'consultation-diagnosis',
  'consultation-plan',
];
for (const id of inputIds) {
  assert.equal(consultation.split('htmlFor="' + id + '"').length - 1, 1, 'Label unique : ' + id);
  assert.equal(consultation.split('id="' + id + '"').length - 1, 1, 'Control ID unique : ' + id);
}
assert.match(consultation, /htmlFor=\{"consultation-vital-" \+ field\.key\}/);
assert.match(consultation, /id=\{"consultation-vital-" \+ field\.key\}/);
assert.match(consultation, /value=\{vitals\[field\.key\]\}/);
assert.match(physicalExam, /htmlFor=\{"pex-status-" \+ section\.key \+ "-" \+ finding\.key\}/);
assert.match(physicalExam, /id=\{"pex-status-" \+ section\.key \+ "-" \+ finding\.key\}/);
assert.match(physicalExam, /id=\{"pex-observations-" \+ section\.key \+ "-" \+ finding\.key\}/);
assert.match(physicalExam, /value=\{current\?\.status \?\? 'not_recorded'\}/);
for (const status of ['normal', 'abnormal', 'not_examined', 'not_recorded']) {
  assert.ok(physicalExam.includes(status + ': '), 'Exam status is preserved : ' + status);
}
assert.match(css, /LAB-UI-001 — Consultation field polish/);
assert.match(css, /\.consultation-page \.vitals-grid/);
assert.match(css, /\.consultation-page \.pex-row/);
assert.match(css, /@media \(max-width: 740px\)/);
assert.match(css, /@media \(max-width: 420px\)/);
console.log('PASS LAB-UI-001: 9 labels, vital/exam IDs, clinical statuses and scoped responsive CSS.');
