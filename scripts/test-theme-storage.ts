import assert from 'node:assert/strict';
import { readInitialThemePreference, persistThemePreference } from '../src/services/themeStorage.ts';
import { getPatients, getSettings, getInventoryData } from '../src/services/storage.ts';

const themeKey = 'medifollow-theme';
const migrationKey = 'medifollow-theme-v2-initialized';
const records = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
function installStorage(getItem = (key: string) => records.get(key) ?? null,
  setItem = (key: string, value: string) => { records.set(key, value); }) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem, setItem },
  });
}

// Normal migration keeps the existing keys and first-run dark default.
installStorage();
assert.equal(readInitialThemePreference(), 'dark');
assert.equal(records.get(themeKey), 'dark');
assert.equal(records.get(migrationKey), 'true');
for (const preference of ['light', 'dark', 'auto']) {
  assert.equal(persistThemePreference(preference), true);
  assert.equal(readInitialThemePreference(), preference);
  assert.equal(records.get(themeKey), preference);
}
records.delete(themeKey);
assert.equal(readInitialThemePreference(), 'dark');
records.delete(migrationKey);
records.set(themeKey, 'light');
assert.equal(readInitialThemePreference(), 'dark', 'Preserve the v2 migration behavior.');

for (const name of ['SecurityError', 'QuotaExceededError', 'Error']) {
  const fail = () => { throw new DOMException('Fictional unavailable storage', name); };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: fail });
  assert.equal(readInitialThemePreference(), 'dark', name + ': storage getter');
  assert.equal(persistThemePreference('light'), false);
  // App reads these services before its theme initializer. Denied property
  // access must take the existing unavailable-storage path, without any writes.
  assert.deepEqual(getPatients(), []);
  assert.equal(getSettings().themePreference, 'dark');
  assert.deepEqual(getInventoryData().items, []);

  installStorage(fail);
  assert.equal(readInitialThemePreference(), 'dark', name + ': getItem');

  // Fail each migration write separately, including a partially completed migration.
  for (const failingKey of [themeKey, migrationKey]) {
    records.clear();
    installStorage(undefined, (key, value) => {
      if (key === failingKey) fail();
      records.set(key, value);
    });
    assert.equal(readInitialThemePreference(), 'dark', name + ': ' + failingKey);
    assert.notEqual(records.get(migrationKey), 'true');
  }

  records.set(migrationKey, 'true');
  records.set(themeKey, 'auto');
  installStorage(undefined, fail);
  assert.equal(readInitialThemePreference(), 'auto', 'Read remains usable if only writes fail.');
  for (const preference of ['light', 'dark', 'auto']) {
    assert.equal(persistThemePreference(preference), false);
    assert.equal(records.get(themeKey), 'auto', 'Do not claim a failed write was saved.');
  }
}

// Persistence can recover later without changing session choices or key formats.
installStorage();
assert.equal(persistThemePreference('light'), true);
assert.equal(readInitialThemePreference(), 'light');

// Compatibility: v2 migration is retried until its marker is saved. Even after
// a partial migration and a session choice, retry still sets dark as before.
records.clear();
installStorage(undefined, (key, value) => {
  if (key === migrationKey) throw new DOMException('Fictional quota', 'QuotaExceededError');
  records.set(key, value);
});
assert.equal(readInitialThemePreference(), 'dark');
assert.equal(persistThemePreference('light'), true);
installStorage();
assert.equal(readInitialThemePreference(), 'dark');
assert.equal(records.get(migrationKey), 'true');
console.log('PASS theme storage: migration, dark/light/auto, throwing getter/read/writes and recovery.');
