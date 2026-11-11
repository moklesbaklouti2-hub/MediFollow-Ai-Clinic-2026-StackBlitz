// Execute the actual workflow shell against a fake gh. No network or credentials.
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workflow = readFileSync(new URL('../.github/workflows/medifollow-audit.yml', import.meta.url), 'utf8');
const step = workflow.split('      - name: Publier la couleur reelle sur la PR relais (pour Work)')[1];
assert.ok(step, 'Relay step must exist');
const script = step.split('        run: |\n')[1].split('\n').map(line => line.replace(/^          /, '')).join('\n');
const dir = mkdtempSync(join(tmpdir(), 'medifollow-relay-'));
try {
  writeFileSync(join(dir, 'gh'), `#!/bin/bash
set -eu
case "$2" in
  */git/ref/heads/*) [ "$LOOKUP_FAIL" = 0 ] || exit 1; printf '%s' "$FAKE_HEAD" ;;
  */issues/2/comments) printf '%s' "$4" > "$CAPTURE" ;;
  *) exit 99 ;;
esac
`, { mode: 0o700 });
  const keys = ['BUILD_RESULT', 'TEST_RESULT', 'COORDINATION_RESULT', 'POLICY_RESULT', 'DECISION_RESULT', 'API_INVENTORY_RESULT', 'SECURITY_REGRESSION_RESULT'];
  function run(overrides = {}) {
    const capture = join(dir, 'message');
    rmSync(capture, { force: true });
    const result = spawnSync('bash', ['-c', script], { encoding: 'utf8', env: {
      PATH: `${dir}:/usr/bin:/bin`, GITHUB_REPOSITORY: 'fixture/repo', MEDIFOLLOW_RELAY_PR: '2',
      COMMIT_SHA: 'fixture-sha', FAKE_HEAD: 'fixture-sha', WORKFLOW_URL: 'https://example.invalid/run',
      CAPTURE: capture, LOOKUP_FAIL: '0', ...Object.fromEntries(keys.map(key => [key, 'success'])), ...overrides,
    } });
    let message = '';
    try { message = readFileSync(capture, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return { ...result, message };
  }
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.message, /MEDIFOLLOW_CI_RESULT_V1\nCouleur: VERT/);
  for (const key of keys) {
    result = run({ [key]: 'failure' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.message, /Couleur: ROUGE/);
    for (const state of ['cancelled', 'skipped', 'neutral', 'in_progress', 'unknown', '']) {
      result = run({ BUILD_RESULT: 'failure', [key]: state });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.message, '', `${key}=${state} must not publish`);
    }
  }
  for (const head of ['older-sha', '']) {
    result = run({ FAKE_HEAD: head });
    assert.equal(result.status, 0);
    assert.equal(result.message, '', 'Stale/unverified HEAD must not publish');
  }
  result = run({ LOOKUP_FAIL: '1' });
  assert.notEqual(result.status, 0, 'API error must fail closed');
  assert.equal(result.message, '');
  console.log('PASS: relay success/failure, incomplete states, stale HEAD and API failure (53 cases).');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
