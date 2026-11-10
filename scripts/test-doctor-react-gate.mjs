import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}
const main = source('src/main.tsx');
const gate = source('src/components/DoctorAppGate.tsx');
const mode = source('src/services/doctorAuthMode.ts');
const transport = source('src/services/doctorClinicalTransport.ts');
const clinical = source('src/hooks/useClinicalReasoning.ts');
const orb = source('src/components/OrbAssistant.tsx');
const server = source('server/index.ts');

assert.match(main, /doctorAuthRequested \? <DoctorAppGate \/> : <App \/>/,
  'Normal local app must remain the default render path');
assert.match(mode, /configuredMode === 'integration-test'/);
assert.match(mode, /configuredMode !== ''/);
assert.match(gate, /window\.location\.protocol === 'https:'/);
assert.match(gate, /!doctorAuthPreviewEnabled \|\| !secure/);
assert.match(gate, /getDoctorCsrfToken\(\)/);
assert.match(gate, /loginDoctor\(username, password\)/);
assert.match(gate, /await logoutDoctor\(\)/);
assert.match(gate, /nextDoctorGatePhase\(previous, 'logout-start'\)/);
assert.match(gate, /nextDoctorGatePhase\(previous, 'logout-success'\)/);
assert.match(gate, /nextDoctorGatePhase\(previous, 'logout-failure'\)/);
assert.match(gate, /nextDoctorGatePhase\(previous, 'background'\)/);
assert.match(gate, /nextDoctorGatePhase\(previous, 'foreground'\)/);
assert.match(gate, /phase === 'logout-pending'/);
assert.match(gate, /Réessayer la déconnexion/);
assert.match(gate, /session-rejected/);
assert.match(gate, /subscribeDoctorCrossTab/);
assert.match(gate, /broadcastDoctorSessionEvent\('logout-start'\)/);
assert.match(gate, /broadcastDoctorSessionEvent\('logout-success'\)/);
assert.match(gate, /event === 'logout-start'/);
assert.match(gate, /event === 'logout-success'/);
assert.match(gate, /<DoctorLogin /);
assert.match(gate, /<App \/>/);

assert.match(transport, /if \(doctorAuthRequested\)/);
assert.match(transport, /!doctorAuthPreviewEnabled/);
assert.match(transport, /return postDoctorClinical\(path, body, options\)/);
assert.match(transport, /getDoctorCsrfToken\(options.signal\)/);
assert.match(transport, /'x-medifollow-csrf': csrfToken/);
assert.match(transport, /notifyDoctorSessionInvalid\(\)/);

assert.match(clinical, /sendClinicalRequest\('\/api\/clinical\/analyze'/);
assert.match(orb, /sendClinicalRequest\('\/api\/commands\/interpret'/);
assert.match(orb, /sendClinicalRequest\('\/api\/chat'/);
for (const [name, content] of [['clinical reasoning', clinical], ['HELIOS orb', orb]]) {
  assert.doesNotMatch(content, /fetch\('\/api\/(?:clinical\/analyze|commands\/interpret|chat)'/,
    name + ' must not bypass the opt-in transport');
}
// Remote deployments must still refuse all clinical API requests by default.
assert.match(server, /res\.status\(503\)\.json\(\{ error: 'Accès clinique distant indisponible/);
assert.match(server, /cookieIntegrationMode === 'integration-test'/);
console.log('PASS: opt-in React doctor gate locks on cross-tab logout, clinical calls preserve local mode and remote 503.');
console.log('WARNING: no real HTTPS browser login or patient-data deployment has been certified.');
