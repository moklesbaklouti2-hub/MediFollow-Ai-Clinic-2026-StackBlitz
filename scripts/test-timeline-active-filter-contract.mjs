// QW-057 synthetic contract: the view-only filter indicator must not inspect or mutate patient data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/pages/Patients.tsx', 'utf8');
const start = source.indexOf('  const activeTimelineFilterCount = [');
const end = source.indexOf('  ].filter(Boolean).length;', start);
assert.ok(start >= 0 && end > start, 'indicator must be present');
const block = source.slice(start, end);
for (const expression of [
  "timelineFilter !== 'all'",
  "timelineSearch.trim().length > 0",
  "timelineFromDate !== ''",
  "timelineToDate !== ''",
  "timelineFilter === 'consultation' && timelineSpecialtyFilter !== 'all'",
  "timelineFilter === 'prescription' && prescriptionStatusFilter !== 'all'",
]) assert.ok(block.includes(expression), 'missing view restriction: ' + expression);
assert.ok(source.includes('aria-label="Filtres actifs de la chronologie"'));
assert.ok(source.includes("Aucun filtre de recherche actif."));
assert.ok(!block.includes('setState') && !block.includes('fetch('));
console.log('QW-057 synthetic UI contract OK');
