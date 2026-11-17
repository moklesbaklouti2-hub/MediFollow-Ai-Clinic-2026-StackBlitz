// Approved global visual charter: protect clinical behavior while allowing labels/CSS.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import AppNavigation from '../src/components/AppNavigation';

Object.assign(globalThis, { React });
const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
const baseline = JSON.parse(read('scripts/fixtures/cabinet-a-clinical-contract.json')) as {
  reference: string;
  appHash: string;
  dashboardPanelHash: string;
  protectedFiles: Record<string, string>;
  pageContracts: Record<string, { prefix: string; bindings: string; texts: string[]; ids: string[] }>;
};

for (const [path, expected] of Object.entries(baseline.protectedFiles)) {
  const source = path === 'src/components/OrbAssistant.tsx'
    ? read(path).replace('<label className="cabinet-orb-message-field"><span>Votre message</span>', '').replace(' /></label>}', ' />}')
    : read(path);
  assert.equal(hash(source), expected, 'Clinical/storage/voice source changed beyond its approved visual label: ' + path);
}
let panels = read('src/components/dashboard/DashboardPanels.tsx');
for (const [hex, token] of [['#bd7c13', '--a-warning'], ['#c45c36', '--a-warning'], ['#d94b4b', '--a-danger'], ['#d97757', '--a-warning'], ['#159b7b', '--a-positive']]) panels = panels.replaceAll(`'var(${token}, ${hex})'`, `'${hex}'`);
assert.equal(hash(panels), baseline.dashboardPanelHash, 'Only semantic color tokens may change in the Dashboard panels.');
function subsequence(expected: string[], actual: string[], message: string) {
  let i = 0;
  for (const value of actual) if (value === expected[i]) i++;
  assert.equal(i, expected.length, message);
}
for (const [path, expected] of Object.entries(baseline.pageContracts)) {
  const source = read(path);
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && Boolean(node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)))!;
  const render = component.body!.statements.find(ts.isReturnStatement)!;
  assert.equal(hash(source.slice(0, render.getStart(ast))), expected.prefix, 'Imports/hooks/calculations/save functions changed: ' + path);
  const bindings: string[] = [], texts: string[] = [], ids: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(ast);
      if (/^on[A-Z]/.test(name) || ['value', 'checked', 'disabled', 'required', 'readOnly', 'type', 'inputMode', 'placeholder', 'min', 'max', 'step', 'maxLength', 'name'].includes(name)) bindings.push(node.getText(ast).replace(/\s+/g, ' '));
      if (name === 'id') ids.push(node.getText(ast));
    }
    if (ts.isJsxText(node)) { const text = node.getText(ast).replace(/\s+/g, ' ').trim(); if (text) texts.push(text); }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(hash(JSON.stringify(bindings)), expected.bindings, 'Clinical values, handlers, validation or input options changed: ' + path);
  subsequence(expected.texts, texts, 'Original clinical text was removed or reordered: ' + path);
  subsequence(expected.ids, ids, 'An existing target ID was removed or changed: ' + path);
}
const app = read('src/App.tsx')
  .replace("import './cabinet-a.css';\n", '')
  .replace("import AppNavigation from './components/AppNavigation';", "import Sidebar from './components/Sidebar';")
  .replace('      <AppNavigation\n', '      <Sidebar\n')
  .replace(' id="cabinet-app" data-design="cabinet-a"', '');
assert.equal(hash(app), baseline.appHash, 'Only the approved visual shell wiring can change in App.');

let actions = 0;
const nav = renderToStaticMarkup(<AppNavigation active="Patients" onNavigate={() => { actions++; }} />);
for (const label of ['Tableau de bord', 'Patients', 'Consultations', 'Copilote IA', 'Ordonnances', 'Protocoles médicaux', 'Inventaire', 'Paramètres']) assert.ok(nav.includes(label), 'Missing real navigation destination: ' + label);
assert.equal(actions, 0, 'Rendering navigation cannot perform a clinical or AI action.');
assert.ok(nav.includes('aria-current="page"'));

const css = read('src/cabinet-a.css');
assert.ok(!/@import|https?:\/\//.test(css), 'The charter must not add a font/asset network dependency.');
assert.ok(!/@import|https?:\/\//.test(read('src/index.css')), 'The global entry stylesheet must not fetch a remote font.');
const luminance = (hex: string) => {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(pair => parseInt(pair, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
};
for (const theme of ['light', 'dark']) {
  const block = css.match(new RegExp(":root\\[data-theme='" + theme + "'\\] \\{([\\s\\S]*?)\\}"))![1];
  const token = (name: string) => {
    const hex = block.match(new RegExp('--a-' + name + ':(#[0-9a-f]+)'))![1];
    return hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
  };
  const ratio = (a: string, b: string) => (Math.max(luminance(token(a)), luminance(token(b))) + .05) / (Math.min(luminance(token(a)), luminance(token(b))) + .05);
  for (const [a, b] of [['ink', 'paper'], ['muted', 'paper'], ['on-primary', 'primary'], ['sidebar-ink', 'sidebar']]) assert.ok(ratio(a, b) >= 4.5, `${theme}: low text contrast ${a}/${b}`);
  assert.ok(ratio('field-line', 'paper') >= 3, theme + ': field boundary contrast');
}
console.log(`PASS CABINET-A: ${Object.keys(baseline.protectedFiles).length} protected clinical/voice/storage source contracts, voice label and Dashboard colors normalized, nine render/binding contracts, App logic preserved, real navigation and both palette contrasts. Browser behavior is checked separately.`);
