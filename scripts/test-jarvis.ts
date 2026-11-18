import assert from 'node:assert/strict';
import { createCompletionWithProviders } from '../server/ai/router';
import { parseJarvisCompletion } from '../server/ai/jarvisChat';
import { parseAction, parseModelAction } from '../src/jarvis/actionSchema';
import { resolveContext } from '../src/jarvis/context';
import { textSources } from '../src/jarvis/documents';
import { authorizeAction, receiptTarget } from '../src/jarvis/tools';
import type { Consultation, InventoryItem, Patient } from '../src/types/medical';

const patient = { id: 'A', name: 'Dossier fictif', age: 38, sex: 'F' } as Patient;
const other = { ...patient, id: 'B' };
const consultation = { id: 'C', patientId: 'A', motif: 'Exemple fictif' } as Consultation;
const patients = [patient, other];
const data = { patients, consultations: [consultation] };
assert.equal(resolveContext(patients, [consultation], '', '').patient, null);
assert.equal(resolveContext(patients, [consultation], 'B', 'C').valid, false);
assert.equal(resolveContext([patient, patient], [consultation], 'A', '').valid, false);
assert.equal(resolveContext(patients, [consultation, consultation], 'A', 'C').valid, false);
const scope = resolveContext(patients, [consultation], 'A', 'C');
assert.equal(scope.payload.consultation?.motif, 'Exemple fictif');
assert.equal('name' in scope.payload.patient!, false);
assert.equal(resolveContext([{ ...patient, updatedAt: 'later' }], [consultation], 'A', 'C').version, scope.version);

assert.deepEqual(textSources('5 mg/dL\r\n\r\n2026-11-18'), [
  { location: 'Lignes 1–3', text: '5 mg/dL\n\n2026-11-18' },
]);
assert.throws(() => textSources('a\u0000b'), /UTF-8/);
assert.throws(() => textSources('x'.repeat(5001)), /dépasse/);
assert.equal(parseAction({ tool: 'open_page', page: 'https://example.invalid' }), undefined);
assert.equal(parseAction({ tool: 'prepare_consultation', field: 'vitals', value: '10' }), undefined);
assert.equal(parseAction({ tool: 'prepare_consultation', field: 'motif', value: 'test', patientId: 'B' }), undefined);
assert.equal(parseAction({ tool: 'prepare_receipt', itemId: 'lot', quantity: Infinity }), undefined);
assert.equal(parseModelAction({ tool: 'prepare_receipt', itemId: 'lot', quantity: 1 }), undefined);

const action = parseAction({ tool: 'prepare_consultation', field: 'motif', value: 'Champ fictif' })!;
const modelOutput = JSON.stringify({ reply: 'Texte fictif', action });
assert.deepEqual(parseJarvisCompletion(modelOutput, true), { reply: 'Texte fictif', action });
assert.equal('action' in parseJarvisCompletion(modelOutput, false), false);
assert.equal('action' in parseJarvisCompletion('Réponse texte', true), false);
assert.equal(authorizeAction(null, true, data, 'A', '', 'v1').ok, false);
assert.equal(authorizeAction({ action, version: 'v1' }, false, data, 'A', '', 'v1').ok, false);
assert.equal(authorizeAction({ action, version: 'v1' }, true, data, 'B', '', 'v2').ok, false);
assert.equal(authorizeAction({ action, version: 'v1' }, true, data, 'A', 'C', 'v1').ok, false);
assert.equal(authorizeAction({ action, version: 'v1' }, true, data, 'A', '', 'v1').ok, true);

const item = { id: 'lot', name: 'Lot fictif', quantity: 1 } as InventoryItem;
const receipt = parseAction({ tool: 'prepare_receipt', itemId: 'lot', quantity: 2 })!;
assert.equal(receiptTarget([item, item], 'lot', 2), undefined);
assert.equal(authorizeAction({ action: receipt, version: 'v1', stock: item }, true, data, '', '', 'v1', [item]).ok, true);
assert.equal(authorizeAction({ action: receipt, version: 'v1', stock: item }, true, data, '', '', 'v1',
  [{ ...item, quantity: 4 }]).ok, false);

const controller = new AbortController();
let fallbackCalls = 0;
await assert.rejects(createCompletionWithProviders({}, 'chat', {
  groq: { id: 'groq', isConfigured: () => true, complete: async (_request, signal) => {
    assert.equal(signal, controller.signal);
    controller.abort();
    throw new Error('Interruption simulée');
  } },
  cloudflare: { id: 'cloudflare', isConfigured: () => true, complete: async () => { fallbackCalls++; } },
  openrouter: { id: 'openrouter', isConfigured: () => false, complete: async () => {} },
}, controller.signal), { name: 'AbortError' });
assert.equal(fallbackCalls, 0);
console.log('PASS JARVIS: contexte, validation et scope des outils, sources texte et annulation du routage IA.');
