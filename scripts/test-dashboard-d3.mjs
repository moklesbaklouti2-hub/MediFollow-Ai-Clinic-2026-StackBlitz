// Presentation experiment: prevent accidental changes to the original clinical
// calculations and navigation while reorganizing the dashboard.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const dashboard = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'Dashboard');
assert.ok(dashboard?.body);
const render = dashboard.body.statements.find(ts.isReturnStatement);
const logic = source.slice(dashboard.getStart(file), render.getStart(file));
assert.equal(createHash('sha256').update(logic).digest('hex'),
  'b7b979b66c69b944c9782245b40dc3e803437900583a849803e6fee18d575bce',
  'D3 must not change counters, inventory calculations, data refresh, dates or follow-up definitions.');
const bindings = [];
function visit(node) {
  if (ts.isJsxAttribute(node) && ['onClick', 'onChange', 'value', 'checked', 'disabled'].includes(node.name.getText(file))) {
    bindings.push(node.getText(file));
  }
  ts.forEachChild(node, visit);
}
visit(dashboard);
assert.deepEqual(bindings.sort(), [
  'onClick={onOpenCopilot}', 'onClick={onOpenCopilot}', 'onClick={onOpenPatients}',
  'onClick={onStartConsultation}', 'onClick={onStartConsultation}',
]);
for (const title of [
  'Patients inscrits', 'Consultations ce mois', 'Ordonnances émises', 'Suivi des patients',
  'Dossiers actifs ou en suivi', 'Contrôles de suivi programmés',
  'Documents sans dossier patient confirmé', 'Consultations par spécialité et motif',
  'État de l’inventaire', 'Graphique des consultations', 'Prochains rendez-vous',
  'Accès rapides', 'Votre Copilote IA', 'Indicateurs cliniques clés', 'Consultations récentes',
]) assert.ok(source.includes(title), 'Existing panel or indicator removed: ' + title);
assert.ok(source.includes('role="alert"'));
assert.ok(source.includes('role="list"') && source.includes('role="listitem"'));
console.log('PASS D3: original calculations and five action bindings unchanged; all panels and KPI labels retained; readable activity list.');
