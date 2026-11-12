// QW-058 synthetic accessibility contract; no patient records or network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/pages/Patients.tsx', 'utf8');
const start = source.indexOf('Chronologie médicale</h3>');
const end = source.indexOf('aria-label="Filtres actifs de la chronologie"', start);
assert.ok(start >= 0 && end > start);
const section = source.slice(start, end);
for (const marker of ['role="status"', 'aria-live="polite"', 'aria-atomic="true"', 'aria-label="Résultats de la chronologie"', 'pagedMedicalTimeline.length', 'specialtyFilteredMedicalTimeline.length', 'medicalTimeline.length']) assert.ok(section.includes(marker), 'missing '+marker);
assert.ok(!section.includes('fetch(') && !section.includes('setState('));
console.log('QW-058 synthetic accessibility contract OK');
