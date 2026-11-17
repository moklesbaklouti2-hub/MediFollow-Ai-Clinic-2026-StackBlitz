// LAB-UI-003: data invariants and actual component output, without browser/API calls.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import ts from 'typescript';
import Dashboard, { type DashboardData } from '../src/pages/Dashboard';
import { AgendaPanel, DataIntegrityNotice, FollowUpPanel, RecentConsultationsPanel, InventoryPanel, QuickPathways, dashboardPages } from '../src/components/dashboard/DashboardPanels';
import { summarizeFollowUps } from '../src/clinical/followUp';
import { summarizeRecordedActivity } from '../src/clinical/activityStats';

// tsx uses its classic JSX fallback for test files outside the app include.
// Bootstrap that namespace only in this isolated Node SSR test process.
Object.assign(globalThis, { React });

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/pages/Dashboard.tsx');
const ast = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = (name: string) => ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name)!;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
assert.equal(hash(fn('readArray').getText(ast)), 'b5c2ba9001eda0d966611d55bd68a0c54e6c7dae561cfcaf7c7ba5dba7223acb');
assert.equal(hash(fn('loadDashboardData').getText(ast)), '7a2c6a0dd4dbbfe949a1751fb45ec5f23105cd8ad55399fb8380ce744d9fbbc3');
const dashboard = fn('Dashboard');
const render = dashboard.body!.statements.find(ts.isReturnStatement)!;
assert.equal(hash(source.slice(dashboard.body!.statements[0].getStart(ast), render.getStart(ast))),
  '12085d49add240e4e58a5430dfbc6b3b0aeb944d02b4995b4efe7b547b9e5c26',
  'Do not change aggregation, inventory, follow-up, dates, refresh or vital selection in a layout task.');
// Remove only the two Dashboard props; Sidebar/HELIOS already had this binding.
const app = read('src/App.tsx')
  .replace("import './cabinet-a.css';\n", '')
  .replace("import AppNavigation from './components/AppNavigation';", "import Sidebar from './components/Sidebar';")
  .replace('      <AppNavigation\n', '      <Sidebar\n')
  .replace(' id="cabinet-app" data-design="cabinet-a"', '')
  .replace("import './dashboard-warm-layout.css';\n", '').replace(/^ {12}onNavigate=\{setActive\}\n/gm, '');
assert.equal(hash(app), '7558e6518408127943ac6d7bd2ae06da31440e885ebe6c5a1c1dd792554e3031', 'Only the approved navigation wrapper, visual root attributes and stylesheet imports may change in App.');

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
let actions = 0;
const action = () => { actions++; };
const empty = renderToStaticMarkup(<Dashboard patientCount={0} consultationCount={0} onStartConsultation={action} onOpenCopilot={action} onOpenPatients={action} onNavigate={action} />);
assert.equal(actions, 0, 'Rendering must not call navigation or AI actions.');
assert.equal((empty.match(/class="wd-kpi(?:\s|")/g) || []).length, 5);
for (const label of ['Patients inscrits', 'Consultations ce mois', 'Ordonnances émises', 'Suivi des patients', 'Dossiers actifs ou en suivi', 'Contrôles en retard', 'Consultations récentes', 'Graphique des consultations', 'Contrôles de suivi programmés', 'Consultations par spécialité et motif', 'État de l’inventaire', 'Indicateurs cliniques clés', 'Accès rapides']) assert.ok(empty.includes(label), 'Lost existing data section: ' + label);
assert.ok(empty.includes('wd-operational-grid') && empty.includes('wd-follow-grid'));
assert.ok(empty.includes('Aucune consultation enregistrée'));
const agenda = renderToStaticMarkup(<AgendaPanel />);
assert.ok(agenda.includes('Calendrier non activé') && agenda.includes('Aucune donnée de rendez-vous disponible'));
assert.ok(!agenda.includes('<button') && !agenda.includes('<input'), 'Unavailable calendar cannot offer a dead activation/search control.');

const data: DashboardData = {
  patients: [], consultations: [], prescriptions: [], unlinkedConsultations: 0, unlinkedPrescriptions: 0,
  followUpConsultations: summarizeFollowUps([], '2026-11-17'),
  undatedPlannedFollowUps: 0, laterPlannedFollowUps: 0,
  clinicalActivity: summarizeRecordedActivity([], []),
};
assert.equal(renderToStaticMarkup(<DataIntegrityNotice data={data} />), '', 'No invented identity warning for empty data.');
const flagged = { ...data, unlinkedConsultations: 1, unlinkedPrescriptions: 2,
  followUpConsultations: { ...data.followUpConsultations, overdue: 2, today: 1, nextSevenDays: 3 },
  undatedPlannedFollowUps: 1, laterPlannedFollowUps: 4,
};
const identity = renderToStaticMarkup(<DataIntegrityNotice data={flagged} />);
assert.ok(identity.includes('role="alert"'));
assert.ok(text(identity).includes('1 consultation(s) et 2 ordonnance(s)'));
assert.ok(identity.includes('Aucun rapprochement automatique'));
const follow = renderToStaticMarkup(<FollowUpPanel data={flagged} onStartConsultation={action} />);
for (const label of ['2 en retard', '1 aujourd’hui', '3 dans les 7 jours', '4 contrôle(s) planifié(s) à plus de 7 jours', '1 contrôle(s) planifié(s) sans date valide']) assert.ok(text(follow).includes(label), label);
assert.ok(follow.includes('role="status"') && follow.includes('Aucun message automatique aux patients'));
assert.ok(!renderToStaticMarkup(<FollowUpPanel data={data} onStartConsultation={action} />).includes('role="status"'));
const recent = renderToStaticMarkup(<RecentConsultationsPanel recentConsultations={[
  { id: 'duplicate', patient: '<script>fictif</script>', date: '2026-11-17', motif: 'Exemple A' },
  { id: 'duplicate', patient: 'Dossier fictif B', date: '2026-11-16', motif: 'Exemple B' },
]} />);
assert.ok(recent.includes('&lt;script&gt;') && !recent.includes('<script>'));
assert.equal((recent.match(/role="listitem"/g) || []).length, 2);
assert.ok(!recent.includes('<button') && !recent.includes('href='), 'Recent rows are read-only; do not imply unsupported record opening.');
const inventory = renderToStaticMarkup(<InventoryPanel inventory={{ items: [], movements: [] }} inventoryLow={[]} inventoryExpired={[]} inventoryExpiring={[]} inventoryEstimatedValue={0} inventoryValueIncomplete={true} recentStockMovements={[]} />);
for (const label of ['Estimation partielle : coûts manquants', 'Stocks bas', 'Articles périmés', 'Péremption ≤ 90 jours', 'Aucune alerte de stock actuellement.', 'Aucun mouvement enregistré.', 'coût d’achat unitaire']) assert.ok(inventory.includes(label), label);
const shortcuts = renderToStaticMarkup(<QuickPathways onStartConsultation={action} onOpenCopilot={action} onOpenPatients={action} onNavigate={action} />);
assert.equal((shortcuts.match(/<button /g) || []).length, 6);
assert.deepEqual([...dashboardPages].sort(), ['Tableau de bord', 'Patients', 'Consultations', 'Copilote IA', 'Ordonnances', 'Protocoles médicaux', 'Inventaire', 'Paramètres'].sort());
assert.equal(actions, 0);

const css = read('src/dashboard-warm-layout.css').replace(/\/\*[\s\S]*?\*\//g, '');
for (const match of css.matchAll(/([^{}]+)\{/g)) {
  const selector = match[1].trim();
  if (!selector.startsWith('@')) assert.ok(selector.includes('.warm-dashboard'), 'Style leaks to another page: ' + selector);
}
assert.ok(!/@import|https?:\/\//.test(css), 'No network asset/dependency required for layout.');
console.log('PASS LAB-UI-003: original loaders/calculations and App behavior frozen; five real KPIs, honest empty states, identity/follow-up/stock warnings, escaped read-only recents, six real shortcuts and scoped CSS. Browser geometry remains a separate check.');
