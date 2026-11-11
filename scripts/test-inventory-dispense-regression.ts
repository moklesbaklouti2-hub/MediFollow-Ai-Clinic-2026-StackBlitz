import assert from 'node:assert/strict';
import { dispenseInventoryItems, getInventoryData } from '../src/services/storage.ts';
import type { InventoryData, InventoryItem } from '../src/types/medical.ts';

// Exerce le vrai service, avec stockage local fictif et aucune API externe.
const records = new Map<string, string>();
let writes = 0;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { writes++; records.set(key, value); },
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true, value: { dispatchEvent: () => true },
});
Object.defineProperty(globalThis, 'CustomEvent', {
  configurable: true, value: class { constructor(_name: string, _options: unknown) {} },
});
const item = (id: string, name: string, quantity: number, category: InventoryItem['category']): InventoryItem => ({
  id, name, category, quantity, unit: 'unité', minimumQuantity: 0,
  batchNumber: id, createdAt: '2025-01-01', updatedAt: '2025-01-01',
});
const fixture = (): InventoryData => ({
  items: [
    item('lot-a', 'Compresses test', 6, 'supply'),
    item('lot-b', 'Compresses test', 4, 'supply'),
    item('lot-c', 'Seringues test', 5, 'supply'),
    item('lot-e', 'Équipement test', 1, 'equipment'),
  ],
  movements: [],
});
function reset() {
  records.set('medifollow-inventory', JSON.stringify(fixture()));
  writes = 0;
}
const issue = (items: Array<{ inventoryItemId: string; quantity: number }>) => ({
  prescriptionId: 'prescription-fictive', patientId: 'patient-fictif', items,
});
function unchanged(before: string, name: string) {
  assert.equal(JSON.stringify(getInventoryData()), before, 'Stock modifié : ' + name);
  assert.equal(writes, 0, 'Écriture inattendue : ' + name);
}
let assertions = 0;
const invalid: Array<[string, unknown]> = [
  ['quantité nulle', { inventoryItemId: 'lot-c', quantity: 0 }],
  ['quantité négative', { inventoryItemId: 'lot-c', quantity: -1 }],
  ['NaN', { inventoryItemId: 'lot-c', quantity: NaN }],
  ['infini', { inventoryItemId: 'lot-c', quantity: Infinity }],
  ['quantité absente', { inventoryItemId: 'lot-c' }],
  ['identifiant vide', { inventoryItemId: '', quantity: 1 }],
  ['identifiant espaces', { inventoryItemId: '   ', quantity: 1 }],
  ['quantité textuelle', { inventoryItemId: 'lot-c', quantity: '2' }],
  ['ligne nulle', null],
  ['identifiant inconnu', { inventoryItemId: 'missing-lot', quantity: 2 }],
  ['équipement durable', { inventoryItemId: 'lot-e', quantity: 1 }],
];
for (const [name, invalidLine] of invalid) {
  reset();
  const before = JSON.stringify(getInventoryData());
  const result = dispenseInventoryItems(issue([
    { inventoryItemId: 'lot-a', quantity: 2 },
    invalidLine as { inventoryItemId: string; quantity: number },
  ]));
  assert.equal(result.success, false, 'Délivrance partielle acceptée : ' + name);
  unchanged(before, name);
  assertions += 3;
}
for (const [name, lines] of [
  ['demande vide', []],
  ['stock insuffisant', [{ inventoryItemId: 'lot-a', quantity: 2 }, { inventoryItemId: 'lot-c', quantity: 99 }]],
] as const) {
  reset();
  const before = JSON.stringify(getInventoryData());
  assert.equal(dispenseInventoryItems(issue([...lines])).success, false);
  unchanged(before, name);
  assertions += 3;
}
// Succès nominal : deux lots déduits, traçabilité et idempotence préservées.
reset();
const valid = issue([{ inventoryItemId: 'lot-a', quantity: 8 }]);
assert.equal(dispenseInventoryItems(valid).success, true);
const actual = getInventoryData();
assert.equal(actual.items.find(x => x.id === 'lot-a')?.quantity, 0);
assert.equal(actual.items.find(x => x.id === 'lot-b')?.quantity, 2);
assert.equal(actual.movements.length, 2);
assert.ok(actual.movements.every(x => x.type === 'dispense' && x.prescriptionId === valid.prescriptionId));
const after = JSON.stringify(actual);
writes = 0;
assert.deepEqual(dispenseInventoryItems(valid), { success: true, alreadyDispensed: true });
assert.equal(JSON.stringify(getInventoryData()), after);
assert.equal(writes, 0);
assertions += 8;
console.log('OK — ' + assertions + ' assertions sur la délivrance atomique (données fictives).');
