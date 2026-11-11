import assert from 'node:assert/strict';
import { dispenseInventoryItems, getInventoryData, returnDispensedStock, cancelDispensedPrescriptionStock } from '../src/services/storage.ts';
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

// Retours et annulations : refuser une comptabilité de lot incohérente,
// plutôt que créer des mouvements positifs sur des traces corrompues.
const issued = (id: string, itemId: string, quantity: number) => ({
  id, itemId, itemName: 'Produit test', type: 'dispense' as const,
  quantity, date: '2025-01-01', prescriptionId: 'ord-retour', patientId: 'patient-fictif',
});
const returned = (id: string, reversal: string, quantity: number) => ({
  id, itemId: 'lot-a', itemName: 'Compresses test', type: 'return' as const,
  quantity, date: '2025-01-02', reversesMovementId: reversal,
  prescriptionId: 'ord-retour', patientId: 'patient-fictif',
});
function seedLedger(d: InventoryData) {
  records.set('medifollow-inventory', JSON.stringify(d));
  writes = 0;
}
const corruptLedgers = [
  {name: 'délivrance de quantité nulle', original: 0, prior: undefined},
  {name: 'délivrance négative', original: -2, prior: undefined},
  {name: 'délivrance non finie', original: NaN, prior: undefined},
  {name: 'retour nul', original: 3, prior: 0},
  {name: 'retour négatif', original: 3, prior: -1},
  {name: 'retour non fini', original: 3, prior: Infinity},
  {name: 'retour supérieur à la quantité délivrée', original: 3, prior: 4},
];
for (const scenario of corruptLedgers) {
  const d = fixture();
  d.movements = [issued('disp-1', 'lot-a', scenario.original)];
  if (scenario.prior !== undefined) d.movements.unshift(returned('ret-1', 'disp-1', scenario.prior));
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(returnDispensedStock({dispenseMovementId: 'disp-1', quantity: 1}).success, false, scenario.name);
  unchanged(before, scenario.name + ' retour');
  assert.equal(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}).success, false, scenario.name);
  unchanged(before, scenario.name + ' annulation');
  assertions += 6;
}

// Une annulation ne doit pas accepter un équipement enregistré par erreur
// comme « délivré » dans un ancien journal importé.
{
  const d = fixture();
  d.movements = [issued('disp-equipment', 'lot-e', 1)];
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}).success, false);
  unchanged(before, 'équipement dans un journal de délivrance');
  assertions += 3;
}

// Plusieurs lots : détecter une anomalie avant toute réintégration, même
// si la première ligne pourrait à elle seule être retournée.
{
  const d = fixture();
  d.movements = [issued('disp-valid', 'lot-a', 2), issued('disp-invalid', 'lot-c', 0)];
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}).success, false);
  unchanged(before, 'annulation multilots incohérente');
  assertions += 3;
}

// Flux valide : retour partiel, annulation du reliquat puis seconde
// annulation idempotente sans mouvement ou écriture supplémentaire.
{
  const d = fixture();
  d.items.find(x => x.id === 'lot-a')!.quantity = 4;
  d.movements = [issued('disp-valid', 'lot-a', 3)];
  seedLedger(d);
  assert.equal(returnDispensedStock({dispenseMovementId: 'disp-valid', quantity: 1}).success, true);
  assert.equal(getInventoryData().items.find(x => x.id === 'lot-a')?.quantity, 5);
  assert.equal(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}).success, true);
  const afterCancel = getInventoryData();
  assert.equal(afterCancel.items.find(x => x.id === 'lot-a')?.quantity, 7);
  assert.equal(afterCancel.movements.filter(x => x.type === 'return').length, 2);
  const snapshot = JSON.stringify(afterCancel);
  writes = 0;
  assert.deepEqual(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}), {success: true, alreadyReturned: true});
  assert.equal(JSON.stringify(getInventoryData()), snapshot);
  assert.equal(writes, 0);
  assertions += 8;
}

// Bloquer toute écriture pour un solde de lot corrompu, même si un autre
// lot du même produit est disponible et utilisable.
const badBalances: Array<[string, unknown]> = [
  ['stock négatif', -2],
  ['stock textuel', '4'],
  ['stock nul', null],
  ['stock absent', undefined],
  ['stock NaN', NaN],
  ['stock infini', Infinity],
];
for (const [name, badQuantity] of badBalances) {
  const d = fixture();
  d.items.find(x => x.id === 'lot-b')!.quantity = badQuantity as number;
  seedLedger(d);
  const beforeDispense = JSON.stringify(getInventoryData());
  assert.equal(dispenseInventoryItems(issue([{inventoryItemId: 'lot-a', quantity: 1}])).success, false, name);
  unchanged(beforeDispense, name + ' délivrance');

  d.items.find(x => x.id === 'lot-a')!.quantity = badQuantity as number;
  d.movements = [issued('disp-bad-stock', 'lot-a', 2)];
  seedLedger(d);
  const beforeReturn = JSON.stringify(getInventoryData());
  assert.equal(returnDispensedStock({dispenseMovementId: 'disp-bad-stock', quantity: 1}).success, false, name);
  unchanged(beforeReturn, name + ' retour');
  assert.equal(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}).success, false, name);
  unchanged(beforeReturn, name + ' annulation');
  assertions += 9;
}
{
  const d = fixture();
  d.items.find(x => x.id === 'lot-a')!.quantity = Number.MAX_VALUE;
  d.movements = [issued('disp-overflow', 'lot-a', Number.MAX_VALUE)];
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(returnDispensedStock({dispenseMovementId: 'disp-overflow', quantity: Number.MAX_VALUE}).success, false);
  unchanged(before, 'dépassement numérique au retour');
  assert.equal(cancelDispensedPrescriptionStock({prescriptionId: 'ord-retour'}).success, false);
  unchanged(before, 'dépassement numérique à l’annulation');
  assertions += 6;
}

console.log('OK — ' + assertions + ' assertions sur le stock et la délivrance atomique (données fictives).');
