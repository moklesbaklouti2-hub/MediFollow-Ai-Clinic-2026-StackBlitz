// Contract tests for the proposed access policy. No runtime authentication is implemented here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const policy = readFileSync(new URL('../docs/ACCESS_CONTROL_MATRIX.md', import.meta.url), 'utf8');
const api = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const required = [
  'Médecin authentifié', 'Personnel autorisé', 'Patient authentifié', 'Visiteur',
  'Analyse clinique IA', 'Commandes vocales', 'Chat clinique', 'Ordonnance',
  '401', '403', 'dossier tiers', 'données fictives',
];
for (const item of required) assert.ok(policy.includes(item), 'Access policy missing: '+item);
const endpoints = ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat'];
for (const path of endpoints) assert.ok(api.includes("app.post('"+path+"'"), 'Review API endpoint changes: '+path);
assert.ok(policy.includes('non implémentée'), 'Policy must clearly state it is not enforced');
console.log('Access-control policy contract: PASS (documentation only; API remains unprotected until implemented).');
