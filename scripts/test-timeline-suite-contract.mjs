// QW-060: ensure the grouped offline test command includes the prepared UI contracts.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
assert.ok(scripts['test:complete'].split(' && ').includes('npm run test:timeline-contracts'));
const commands = scripts['test:timeline-contracts'].split(' && ');
for (const path of [
  'scripts/test-timeline-active-filter-contract.mjs',
  'scripts/test-timeline-results-accessibility-contract.mjs',
  'scripts/test-timeline-date-help-contract.mjs',
  'scripts/test-timeline-show-all-contract.mjs',
  'scripts/test-timeline-search-help-contract.mjs',
  'scripts/test-timeline-suite-contract.mjs',
]) {
  assert.ok(existsSync(path), 'Missing contract: ' + path);
  assert.ok(commands.includes('node ' + path), 'Contract not wired: ' + path);
}
console.log('QW-060 synthetic grouped test wiring contract OK');
