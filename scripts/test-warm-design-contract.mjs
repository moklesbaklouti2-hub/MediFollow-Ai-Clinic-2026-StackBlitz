// Claude Console Council — LAB-UI-002 structural guard (not a browser screenshot).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const app = readFileSync(new URL('src/App.tsx', root), 'utf8');
const css = readFileSync(new URL('src/warm-clinical.css', root), 'utf8');

const premium = "import './clinical-premium.css';";
const warm = "import './warm-clinical.css';";
assert.equal(app.split(warm).length - 1, 1, 'Warm stylesheet imported exactly once');
assert.ok(app.indexOf(warm) > app.indexOf(premium), 'Warm stylesheet must load after Premium');
assert.ok(css.includes(":root[data-theme='light']"), 'Theme-scoped overrides required');
assert.ok(!css.includes(":root[data-theme='dark']"), 'Do not change dark theme in the pilot');
for (const selector of [
  '.sidebar.premium-sidebar', '.premium-nav-item.active', '.mf-dashboard-page',
  '.mf-copilot-card', '.mf-quick-action', '.mf-stat', '.consultation-field',
  '.prescription-field', '.settings-field', '.inventory-field', '.patient-card',
  '.mf-chart-line', ':focus-visible',
]) {
  assert.ok(css.includes(selector), 'Missing visual module: ' + selector);
}
for (const forbidden of ['.clinical-storage-alert', '.inventory-alert-expired', '.priority-urgent']) {
  assert.ok(!css.includes(forbidden + ' {'), 'Alert semantic styles must not be changed: ' + forbidden);
}
const count = (text, char) => [...text].filter(x => x === char).length;
assert.equal(count(css, '{'), count(css, '}'), 'Unbalanced CSS blocks');

const luminance = (hex) => {
  const values = hex.slice(1).match(/.{2}/g).map(part => parseInt(part, 16) / 255);
  const [r,g,b] = values.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126*r + 0.7152*g + 0.0722*b;
};
const contrast = (a,b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x,y) + .05) / (Math.min(x,y) + .05);
};
assert.ok(contrast('#ffffff','#b94031') >= 4.5, 'Coral action button contrast');
assert.ok(contrast('#243a30','#fff9f3') >= 4.5, 'Ivory body contrast');
assert.ok(contrast('#5e685c','#fff9f3') >= 4.5, 'Ivory secondary contrast');
console.log('PASS LAB-UI-002: light-only import, visual modules, preserved alert scope, contrast ratios.');
