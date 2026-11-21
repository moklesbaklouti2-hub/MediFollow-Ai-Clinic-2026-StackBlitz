import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canDeleteInventoryItem } from '../src/services/inventoryDeletionGuard.ts';
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

// Les identifiants de prescription et de patient ne doivent pas être vides
// ou de types inattendus. Une tentative invalide ne touche jamais le stock.
const invalidIdentities: Array<[string, Record<string, unknown>]> = [
  ['ordonnance vide', { prescriptionId: '' }],
  ['ordonnance espaces', { prescriptionId: '  ' }],
  ['ordonnance non textuelle', { prescriptionId: 42 }],
  ['patient vide', { patientId: '' }],
  ['patient espaces', { patientId: '  ' }],
  ['patient non textuel', { patientId: null }],
];
for (const [name, override] of invalidIdentities) {
  reset();
  const before = JSON.stringify(getInventoryData());
  const input = { ...issue([{ inventoryItemId: 'lot-a', quantity: 1 }]), ...override };
  assert.equal(dispenseInventoryItems(input as Parameters<typeof dispenseInventoryItems>[0]).success, false, name);
  unchanged(before, name);
  assertions += 3;
}

// Une ordonnance déjà délivrée à un patient ne doit pas réussir
// silencieusement lorsqu'elle est réutilisée pour un autre patient.
reset();
assert.equal(dispenseInventoryItems(issue([{ inventoryItemId: 'lot-a', quantity: 1 }])).success, true);
let snapshotConflict = JSON.stringify(getInventoryData());
writes = 0;
assert.equal(dispenseInventoryItems({ ...issue([{ inventoryItemId: 'lot-a', quantity: 1 }]), patientId: 'autre-patient' }).success, false);
unchanged(snapshotConflict, 'conflit patient-ordonnance');
assert.equal(dispenseInventoryItems(issue([{ inventoryItemId: '', quantity: 1 }])).success, false);
unchanged(snapshotConflict, 'rejeu avec ligne invalide');
assert.deepEqual(dispenseInventoryItems(issue([{ inventoryItemId: 'lot-a', quantity: 1 }])), { success: true, alreadyDispensed: true });
unchanged(snapshotConflict, 'rejeu normal autorisé');
assertions += 10;

// Une ancienne trace de retour falsifiée ou mal importée ne doit
// jamais être créditée au mauvais patient, ordonnance ou lot.
const traceCorruptions: Array<[string, (d: InventoryData) => void]> = [
  ['mauvais lot du retour', d => { d.movements[1].itemId = 'lot-c'; }],
  ['mauvaise ordonnance du retour', d => { d.movements[1].prescriptionId = 'autre-ordonnance'; }],
  ['mauvais patient du retour', d => { d.movements[1].patientId = 'autre-patient'; }],
  ['identifiant du retour dupliqué', d => {
    d.movements.push({ ...returned('ret-trace', 'autre-dispense', 1) });
  }],
  ['identifiant de délivrance dupliqué', d => {
    d.movements.push(issued('disp-trace', 'lot-c', 1));
  }],
  ['plusieurs patients pour une ordonnance', d => {
    d.movements.push({ ...issued('disp-other', 'lot-c', 1), patientId: 'autre-patient' });
  }],
  ['ordonnance manquante dans la délivrance', d => { d.movements[0].prescriptionId = ''; }],
  ['patient manquant dans la délivrance', d => { d.movements[0].patientId = ''; }],
];
for (const [name, corrupt] of traceCorruptions) {
  const d = fixture();
  d.movements = [issued('disp-trace', 'lot-a', 3), returned('ret-trace', 'disp-trace', 1)];
  corrupt(d);
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(returnDispensedStock({ dispenseMovementId: 'disp-trace', quantity: 1 }).success, false, name);
  unchanged(before, name + ' retour');
  assert.equal(cancelDispensedPrescriptionStock({ prescriptionId: 'ord-retour' }).success, false, name);
  unchanged(before, name + ' annulation');
  assertions += 6;
}
// Témoin positif : un retour cohérent au bon lot et à la bonne ordonnance.
{
  const d = fixture();
  d.movements = [issued('disp-ok', 'lot-a', 3), returned('ret-ok', 'disp-ok', 1)];
  seedLedger(d);
  assert.equal(returnDispensedStock({ dispenseMovementId: 'disp-ok', quantity: 1 }).success, true);
  assert.equal(getInventoryData().items.find(x => x.id === 'lot-a')?.quantity, 7);
  assertions += 2;
}


// Le replay doit vérifier les produits ET les quantités précédemment
// délivrés ; partager un identifiant d'ordonnance ne suffit pas.
{
  reset();
  const first = issue([{ inventoryItemId: 'lot-a', quantity: 8 }]);
  assert.equal(dispenseInventoryItems(first).success, true);
  const snapshot = JSON.stringify(getInventoryData());
  writes = 0;
  const replayCases: Array<[string, Array<{inventoryItemId: string; quantity: number}>]> = [
    ['quantité plus faible', [{ inventoryItemId: 'lot-a', quantity: 7 }]],
    ['quantité plus forte', [{ inventoryItemId: 'lot-a', quantity: 9 }]],
    ['autre produit', [{ inventoryItemId: 'lot-c', quantity: 8 }]],
    ['produit supplémentaire', [{ inventoryItemId: 'lot-a', quantity: 8 }, { inventoryItemId: 'lot-c', quantity: 1 }]],
    ['même total mais autre répartition produit', [{ inventoryItemId: 'lot-a', quantity: 4 }, { inventoryItemId: 'lot-c', quantity: 4 }]],
  ];
  for (const [name, lines] of replayCases) {
    assert.equal(dispenseInventoryItems(issue(lines)).success, false, name);
    unchanged(snapshot, name);
    assertions += 3;
  }
  // Le lot de départ peut changer tant que le produit et le total sont identiques.
  assert.deepEqual(dispenseInventoryItems(issue([{ inventoryItemId: 'lot-b', quantity: 8 }])), {
    success: true, alreadyDispensed: true,
  });
  unchanged(snapshot, 'rejeu FEFO identique');
  assertions += 3;
}

// Si l'historique a changé après import, ne jamais afficher un faux succès.
const alteredHistory: Array<[string, (d: InventoryData) => void]> = [
  ['quantité historique différente', d => { d.movements[0].quantity = 2; }],
  ['lot historique absent', d => { d.movements[0].itemId = 'lot-inconnu'; }],
  ['lot historique dupliqué', d => { d.items.push({ ...d.items[0] }); }],
  ['produit historique différent', d => { d.movements[0].itemId = 'lot-c'; }],
];
for (const [name, alter] of alteredHistory) {
  const d = fixture();
  d.movements = [issued('disp-replay', 'lot-a', 3)];
  alter(d);
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(dispenseInventoryItems({
    prescriptionId: 'ord-retour', patientId: 'patient-fictif',
    items: [{ inventoryItemId: 'lot-a', quantity: 3 }],
  }).success, false, name);
  unchanged(before, name);
  assertions += 3;
}

// Un nouvel enregistrement ne doit pas exploiter un identifiant de lot
// dupliqué ou une somme de lignes qui dépasse Number.MAX_VALUE.
{
  const d = fixture();
  d.items.push({ ...d.items[0] });
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(dispenseInventoryItems(issue([{ inventoryItemId: 'lot-a', quantity: 1 }])).success, false);
  unchanged(before, 'nouvelle délivrance sur lot dupliqué');
  assertions += 3;
}
{
  reset();
  const before = JSON.stringify(getInventoryData());
  assert.equal(dispenseInventoryItems(issue([
    { inventoryItemId: 'lot-a', quantity: Number.MAX_VALUE },
    { inventoryItemId: 'lot-b', quantity: Number.MAX_VALUE },
  ])).success, false);
  unchanged(before, 'somme des quantités non finie');
  assertions += 3;
}


// QW-011 — un historique importé avec deux lots partageant le même ID
// n'autorise ni retour partiel, ni annulation (aucune écriture de stock).
const duplicateLotLedgers: Array<[string, (data: InventoryData) => void, string]> = [
  ['doublon identique', data => {
    data.items.push({ ...data.items[0] });
  }, 'lot-a'],
  ['même ID, autre produit', data => {
    data.items.push({ ...data.items[0], name: 'Autre produit test' });
  }, 'lot-a'],
  ['même ID, autre catégorie', data => {
    data.items.push({ ...data.items[0], category: 'equipment' });
  }, 'lot-a'],
  ['annulation multi-lots, doublon sur second article', data => {
    data.items.push({ ...data.items[2], name: 'Produit ambigu' });
    data.movements.push(issued('disp-safe', 'lot-a', 2));
  }, 'lot-c'],
];
for (const [name, mutate, selectedLot] of duplicateLotLedgers) {
  const d = fixture();
  d.movements = [issued('disp-duplicate', selectedLot, 2)];
  mutate(d);
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  const returnedResult = returnDispensedStock({ dispenseMovementId: 'disp-duplicate', quantity: 1 });
  assert.equal(returnedResult.success, false, 'Retour accepté malgré lot dupliqué : ' + name);
  unchanged(before, name + ' retour');
  const cancelledResult = cancelDispensedPrescriptionStock({ prescriptionId: 'ord-retour' });
  assert.equal(cancelledResult.success, false, 'Annulation acceptée malgré lot dupliqué : ' + name);
  unchanged(before, name + ' annulation');
  assertions += 6;
}
// Une annulation déjà totalement retournée ne doit pas ignorer un ID de lot
// devenu ambigu après import. Refuser plutôt qu'afficher un faux succès.
{
  const d = fixture();
  d.movements = [issued('disp-fully-returned', 'lot-a', 2), returned('ret-fully', 'disp-fully-returned', 2)];
  d.items.push({ ...d.items[0] });
  seedLedger(d);
  const before = JSON.stringify(getInventoryData());
  assert.equal(cancelDispensedPrescriptionStock({ prescriptionId: 'ord-retour' }).success, false);
  unchanged(before, 'annulation déjà retournée avec ID dupliqué');
  assertions += 3;
}


// QW-012 — l'entrée d'une opération de retour ou d'annulation peut venir
// d'un import ancien ou d'un appel non typé : refuser sans exception et
// sans modifier le stock si l'identité/quantité est mal formée.
const invalidReturnRequests: Array<[string, unknown]> = [
  ['requête nulle', null],
  ['requête indéfinie', undefined],
  ['objet vide', {}],
  ['identifiant vide', { dispenseMovementId: '', quantity: 1 }],
  ['identifiant espaces', { dispenseMovementId: '   ', quantity: 1 }],
  ['identifiant numérique', { dispenseMovementId: 12, quantity: 1 }],
  ['quantité absente', { dispenseMovementId: 'disp-valid' }],
  ['quantité texte', { dispenseMovementId: 'disp-valid', quantity: '1' }],
];
for (const [name, invalidRequest] of invalidReturnRequests) {
  const data = fixture();
  data.movements = [issued('disp-valid', 'lot-a', 2)];
  seedLedger(data);
  const before = JSON.stringify(getInventoryData());
  const result = returnDispensedStock(invalidRequest as Parameters<typeof returnDispensedStock>[0]);
  assert.equal(result.success, false, 'Retour mal formé accepté : ' + name);
  unchanged(before, 'retour ' + name);
  assertions += 3;
}
const invalidCancellationRequests: Array<[string, unknown]> = [
  ['requête nulle', null],
  ['requête indéfinie', undefined],
  ['objet vide', {}],
  ['ordonnance vide', { prescriptionId: '' }],
  ['ordonnance espaces', { prescriptionId: '   ' }],
  ['ordonnance numérique', { prescriptionId: 42 }],
];
for (const [name, invalidRequest] of invalidCancellationRequests) {
  const data = fixture();
  data.movements = [issued('disp-valid', 'lot-a', 2)];
  seedLedger(data);
  const before = JSON.stringify(getInventoryData());
  const result = cancelDispensedPrescriptionStock(invalidRequest as Parameters<typeof cancelDispensedPrescriptionStock>[0]);
  assert.equal(result.success, false, 'Annulation mal formée acceptée : ' + name);
  unchanged(before, 'annulation ' + name);
  assertions += 3;
}


// QW-026 — jamais de suppression d'un lot déjà référencé par une ordonnance
// ou un mouvement de stock, même si l'ordonnance n'a pas été délivrée.
const inventoryDeletionCases: Array<{
  name: string;
  itemId: unknown;
  movements: Array<{ itemId: string }>;
  prescriptions: Array<{ medications?: Array<{ inventoryItemId?: string }>; items?: Array<{ inventoryItemId?: string }> }>;
  allowed: boolean;
}> = [
  { name: 'lot neuf', itemId: 'lot-a', movements: [], prescriptions: [], allowed: true },
  { name: 'autre lot seulement', itemId: 'lot-a', movements: [{ itemId: 'lot-b' }], prescriptions: [], allowed: true },
  { name: 'réception', itemId: 'lot-a', movements: [{ itemId: 'lot-a' }], prescriptions: [], allowed: false },
  { name: 'délivrance', itemId: 'lot-a', movements: [{ itemId: 'lot-a' }], prescriptions: [{ items: [] }], allowed: false },
  { name: 'traitement ancien', itemId: 'lot-a', movements: [], prescriptions: [{ medications: [{ inventoryItemId: 'lot-a' }] }], allowed: false },
  { name: 'nouvel item ordonnance', itemId: 'lot-a', movements: [], prescriptions: [{ items: [{ inventoryItemId: 'lot-a' }] }], allowed: false },
  { name: 'ordonnance autre lot', itemId: 'lot-a', movements: [], prescriptions: [{ items: [{ inventoryItemId: 'lot-b' }] }], allowed: true },
  { name: 'traitement non lié', itemId: 'lot-a', movements: [], prescriptions: [{ medications: [{ inventoryItemId: undefined }] }], allowed: true },
  { name: 'identifiant vide', itemId: '', movements: [], prescriptions: [], allowed: false },
  { name: 'identifiant numérique', itemId: 27, movements: [], prescriptions: [], allowed: false },
];
for (const scenario of inventoryDeletionCases) {
  assert.equal(canDeleteInventoryItem(scenario.itemId, scenario.movements, scenario.prescriptions),
    scenario.allowed, 'Traçabilité non protégée : ' + scenario.name);
}
const inventoryPage = readFileSync(new URL('../src/pages/Inventory.tsx', import.meta.url), 'utf8');
const deleteStart = inventoryPage.indexOf('function deleteItem(item: InventoryItem)');
const deleteEnd = inventoryPage.indexOf('function addItem(', deleteStart);
assert.ok(deleteStart >= 0 && deleteEnd > deleteStart, 'Fonction de suppression introuvable.');
const deleteCode = inventoryPage.slice(deleteStart, deleteEnd);
assert.ok(deleteCode.includes('canDeleteInventoryItem(item.id, data.movements, getPrescriptions())') &&
  deleteCode.indexOf('canDeleteInventoryItem(') < deleteCode.indexOf('window.confirm(') &&
  deleteCode.indexOf('canDeleteInventoryItem(') < deleteCode.indexOf('persist('),
  'Le refus de suppression doit précéder confirmation et persistance.');
console.log('OK — QW-026 : 10 cas fictifs de suppression et contrat UI de protection de traçabilité.');

console.log('OK — ' + assertions + ' assertions sur les replays et la délivrance atomique (données fictives).');
