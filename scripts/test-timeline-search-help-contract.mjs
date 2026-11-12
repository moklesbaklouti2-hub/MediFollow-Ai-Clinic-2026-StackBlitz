// QW-062: synthetic source contract, no patient records or network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ui = readFileSync('src/pages/Patients.tsx', 'utf8');
const search = readFileSync('src/clinical/timelineSearch.ts', 'utf8');
const start = ui.indexOf('<input id="patient-timeline-search"');
const end = ui.indexOf('</div>', start);
assert.ok(start >= 0 && end > start);
const block = ui.slice(start, end);
assert.ok(block.includes('aria-describedby="patient-timeline-search-help"'));
assert.ok(block.includes('id="patient-timeline-search-help"'));
for (const label of ['motif', 'spécialité', 'diagnostic', 'symptômes', 'médicaments', 'examens', 'conseils', 'Aucun appel IA']) assert.ok(block.includes(label), label);
for (const field of ['c.motif', 'c.specialty', 'c.diagnosis', 'c.symptoms', 'p.advice', 'p.medications', 'p.items', 'i.details']) assert.ok(search.includes(field), field);
assert.ok(search.includes("normalize('NFD')") && search.includes("toLocaleLowerCase('fr-FR')"));
console.log('QW-062 synthetic search help contract OK');
