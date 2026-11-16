import assert from 'node:assert/strict';
import test from 'node:test';
import { readInitialThemePreference, persistThemePreference } from '../src/services/themeStorage.ts';
import { getPatients, savePatients } from '../src/services/storage.ts';

test('B1: denied storage reports one error only when a save is attempted', () => {
  const events: Event[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event); return true; } },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, get: () => { throw new DOMException('Fictional denial', 'SecurityError'); },
  });
  assert.deepEqual(getPatients(), []);
  assert.equal(events.length, 0, 'Reads must not emit save warnings.');
  assert.equal(savePatients([]), false);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'medifollow:storage-error');
  assert.equal((events[0] as CustomEvent).detail.key, 'medifollow-patients');
});

test('M1: corrupt stored theme falls back to dark', () => {
  for (const value of ['', 'corrupt-theme', 'DARK', 'null', ' light ', null]) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true, value: { getItem: (key: string) => key === 'medifollow-theme' ? value : 'true' },
    });
    assert.equal(readInitialThemePreference(), 'dark');
  }
});

test('writes: normal, read-only, ignored and unverifiable saves report exact events', () => {
  for (const mode of ['normal', 'read-only', 'ignored', 'unverifiable']) {
    const events: Event[] = [];
    const records = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event); return true; } },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true, value: {
        getItem: (key: string) => {
          if (mode === 'unverifiable') throw new DOMException('Fictional read denial', 'SecurityError');
          return records.get(key) ?? null;
        },
        setItem: (key: string, value: string) => {
          if (mode === 'read-only') throw new DOMException('Fictional quota', 'QuotaExceededError');
          if (mode !== 'ignored') records.set(key, value);
        },
      },
    });
    assert.equal(savePatients([]), mode === 'normal', mode);
    assert.equal(events.length, 1, mode);
    assert.equal(events[0].type, mode === 'normal' ? 'medifollow:data-updated' : 'medifollow:storage-error');
    assert.equal((events[0] as CustomEvent).detail.key, 'medifollow-patients');
    assert.equal(persistThemePreference('light'), mode === 'normal', mode);
    assert.equal(events.length, 1, 'Theme persistence has its own status, not a second global alert.');
  }
});

test('SSR does not touch storage or notify; failed notification cannot throw again', () => {
  let reads = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, get: () => { reads++; throw new DOMException('Fictional denial', 'SecurityError'); },
  });
  Reflect.deleteProperty(globalThis, 'window');
  assert.equal(savePatients([]), false);
  assert.equal(reads, 0);

  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { dispatchEvent: () => { throw new Error('Fictional dispatch failure'); } },
  });
  assert.equal(savePatients([]), false);
  const originalCustomEvent = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent');
  try {
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true, value: class { constructor() { throw new Error('Fictional event failure'); } },
    });
    assert.equal(savePatients([]), false);
  } finally {
    if (originalCustomEvent) Object.defineProperty(globalThis, 'CustomEvent', originalCustomEvent);
    else Reflect.deleteProperty(globalThis, 'CustomEvent');
  }
});
