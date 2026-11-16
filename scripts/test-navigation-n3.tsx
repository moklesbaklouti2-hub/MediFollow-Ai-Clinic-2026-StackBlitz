import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkspaceNavigation, { workspacePages } from '../src/components/WorkspaceNavigation';
import PatientContextBar from '../src/components/PatientContextBar';

// The navigation projection must not read/write storage or invoke actions.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true, get: () => { throw new Error('No storage access allowed in navigation'); },
});
let actions = 0;
const nav = renderToStaticMarkup(<WorkspaceNavigation active="Consultations" onNavigate={() => { actions++; }} />);
assert.equal(workspacePages.length, 8);
for (const page of workspacePages) assert.ok(nav.includes(`>${page}</button>`));
assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
assert.ok(nav.includes('aria-expanded="false"'));
assert.ok(nav.includes('aria-controls="n3-main-navigation"'));
assert.equal(actions, 0);

const patients = [{ id: 'fiction-a', name: 'Dossier fictif A' }, { id: 'fiction-b', name: 'Dossier fictif B' }];
const links = [{ label: 'Dossier', target: 'n3-patient-record' }];
const render = (patientId: string | null, records = patients) => renderToStaticMarkup(
  <PatientContextBar patients={records} patientId={patientId} links={links} onClose={() => { actions++; }} />
);
const selected = render('fiction-b');
assert.ok(selected.includes('Dossier fictif B'));
assert.ok(!selected.includes('Dossier fictif A'));
assert.ok(selected.includes('href="#n3-patient-record"'));
assert.ok(selected.includes('Fermer le dossier'));
for (const id of ['', null]) {
  const empty = render(id);
  assert.ok(empty.includes('Aucun dossier sélectionné'));
  assert.ok(!empty.includes('href=') && !empty.includes('Dossier fictif A'));
}
for (const records of [patients, [...patients, { id: 'fiction-b', name: 'Wrong duplicate' }]]) {
  const unknown = render(records.length === 2 ? 'missing' : 'fiction-b', records);
  assert.ok(unknown.includes('identité non confirmée'));
  assert.ok(!unknown.includes('href=') && !unknown.includes('Dossier fictif B'));
}
const malformed = render('fiction-a', [{ id: 'fiction-a', name: '' }]);
assert.ok(malformed.includes('Nom du patient à vérifier'));
const escaped = render('fiction-a', [{ id: 'fiction-a', name: '<script>fictitious</script>' }]);
assert.ok(!escaped.includes('<script>'));
assert.equal(actions, 0);
console.log('PASS N3: eight pages, active/mobile semantics, no storage or actions on render, exact unique context, empty/orphan/duplicate/invalid-name cases, escaped identity.');
