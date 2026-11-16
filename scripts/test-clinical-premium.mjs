// MediFollow AI — Premium UI static non-regression contract.
// No browser, network, patients, secrets or medical decision. Visual/manual review still required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const header = read('src/components/Header.tsx');
const css = read('src/clinical-premium.css');

for (const fragment of [
  "import './clinical-premium.css';",
  'className="app premium-clinical-app"',
  'className="premium-skip-link"',
  'id="contenu-principal"',
  'onOpenCopilot={() => setActive(\'Copilote IA\')}',
  'className="clinical-storage-alert"',
]) {
  assert.ok(app.includes(fragment), 'Application shell contract missing: ' + fragment);
}
assert.ok(sidebar.includes('sidebar-helios-action'), 'HELIOS shortcut is missing from sidebar.');
assert.ok(sidebar.includes("onNavigate('Copilote IA')"), 'Sidebar shortcut must navigate.');
assert.ok(header.includes('onClick={onOpenCopilot}'), 'Header HELIOS shortcut must navigate.');
assert.ok(header.includes('Mode prototype'), 'Do not claim a production-ready/live status.');
assert.ok(header.includes('Stockage dans le navigateur'), 'Local storage must be labeled honestly.');

for (const selector of [
  ":root[data-theme='dark']", ":root[data-theme='light']",
  '.app.premium-clinical-app .sidebar.premium-sidebar',
  '.app.premium-clinical-app .main > .premium-topbar',
  '.app.premium-clinical-app .main :is(.section-card',
  '.app.premium-clinical-app .main .mf-hero',
  '.app.premium-clinical-app .main .patient-timeline-entry',
  '.app.premium-clinical-app .premium-copilot',
  '.app.premium-clinical-app .mf-orb-panel',
  '.app.premium-clinical-app .clinical-storage-alert',
  '@media (max-width: 700px)',
  '@media (prefers-reduced-motion: reduce)',
  '@media print',
]) {
  assert.ok(css.includes(selector), 'Premium stylesheet missing selector: ' + selector);
}
assert.ok(!css.includes('display: none !important;\n  .app.premium-clinical-app .main'),
  'The main clinical page must never be hidden by the design layer.');
console.log('PASS UI-PREMIUM-001: shell, modules, themes, responsiveness and safe prototype labels.');
