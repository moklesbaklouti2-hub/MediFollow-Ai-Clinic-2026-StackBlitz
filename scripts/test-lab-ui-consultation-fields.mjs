// LAB-UI-001 — Static contract only. Not a browser/visual accessibility audit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

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

// Freeze the clinical bindings present at the supplied ChatGPT HEAD. Adding
// layout wrappers, accessible names or CSS must not change values or handlers.
const bindings = new Set(['value', 'onChange', 'onClick', 'onSubmit', 'checked', 'disabled', 'inputMode', 'type', 'maxLength', 'onKeyDown']);
for (const [path, source, expected] of [
  ['Consultations.tsx', consultation, 'b62162c6b3ff8a9d315ab08a7857a9a6ce76abf78e7760ce84dc1981bf89ea9d'],
  ['PhysicalExaminationEditor.tsx', physicalExam, '6d1a1064e804231c48cfad900d0bda74cc7260a9bba2f9a065499f8e866a00d9'],
]) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const attributes = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && bindings.has(node.name.getText(ast))) attributes.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(createHash('sha256').update(JSON.stringify(attributes)).digest('hex'), expected, path + ': clinical bindings changed');
}
const formCss = readFileSync(new URL('../src/consultation-form.css', import.meta.url), 'utf8');
assert.ok(consultation.includes("import '../consultation-form.css'"));
assert.ok(consultation.includes('aria-describedby={"consultation-unit-" + field.key}'));
assert.ok(physicalExam.includes('htmlFor={"pex-observations-" + section.key + "-" + finding.key}'));
assert.match(formCss, /:root\[data-theme='dark'\]/);
assert.match(formCss, /#root \.lab-consultation-form/);
console.log('PASS Codex pilot: 89 original clinical bindings unchanged, visible observation labels, unit descriptions, scoped theme CSS.');
