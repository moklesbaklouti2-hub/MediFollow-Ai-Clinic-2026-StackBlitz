import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const file = 'docs/AGENT_COORDINATION.json';
const manifest = JSON.parse(readFileSync(file, 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.branch, 'audit-stabilisation-2026-11-10');
assert.equal(manifest.rules.noAutomaticMerge, true);
assert.equal(manifest.rules.noProductionData, true);
assert.equal(manifest.rules.noPaidAgentWithoutApproval, true);
assert.equal(manifest.rules.requireTestsBeforeIntegration, true);

const ids = new Set();
const ownersByPath = new Map();
for (const module of manifest.modules) {
  assert.match(module.id, /^[a-z][a-z0-9-]*$/);
  assert.ok(!ids.has(module.id), 'Module en double: ' + module.id);
  ids.add(module.id);
  assert.ok(['ready', 'blocked', 'active', 'done'].includes(module.status));
  assert.equal(typeof module.nextTask, 'string');
  assert.ok(module.nextTask.trim().length > 0);
  assert.ok(Array.isArray(module.validation) && module.validation.length > 0);
  assert.ok(Array.isArray(module.paths));
  if (module.status === 'active') {
    assert.notEqual(module.owner, 'unassigned', 'Agent actif sans propriétaire');
    assert.ok(module.paths.length > 0, 'Agent actif sans périmètre de fichiers');
  }
  for (const path of module.paths) {
    assert.ok(!path.startsWith('/') && !path.includes('..'), 'Chemin non sûr: ' + path);
    assert.ok(!ownersByPath.has(path), 'Conflit entre modules sur ' + path);
    ownersByPath.set(path, module.id);
  }
}
assert.ok(ids.size >= 3, 'Modules manquants');
console.log('OK : coordination valide, ' + ids.size + ' modules, ' + ownersByPath.size + ' fichiers attribués, aucun chevauchement.');
