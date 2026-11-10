// Static, read-only pre-deployment security inventory. Does not certify API security.
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const routes = [...source.matchAll(/app\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g)].map((m) => ({ method: m[1].toUpperCase(), path: m[2] }));
const clinical = routes.filter((r) => r.path.startsWith('/api/') && r.path !== '/api/health');
const hasAuthMiddleware = /app\.use\(['"]\/api['"]\s*,\s*(?:requireAuth|authenticate|authMiddleware|verifyToken)\b/.test(source);
const bindsAllInterfaces = /app\.listen\(PORT\s*,\s*['"]0\.0\.0\.0['"]/.test(source);
const findings = [
  ...(!hasAuthMiddleware && clinical.length ? ['No recognizable global /api authentication middleware; manual route-level review required.'] : []),
  ...(bindsAllInterfaces ? ['Server binds to 0.0.0.0; restrict network exposure before deployment.'] : []),
];
console.log('API inventory (static):');
for (const r of routes) console.log(' -', r.method, r.path);
console.log('Security findings (review required):');
for (const f of findings) console.log(' - WARNING:', f);
console.log('This check is informational and does not prove absence or presence of route-level protections.');
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## API security inventory (informational)\\n' + routes.map(r => '- '+r.method+' `'+r.path+'`').join('\\n') + '\\n\\n' + findings.map(f => '- ⚠️ '+f).join('\\n') + '\\n\\n**Not a security certification. Do not deploy publicly based on this check.**\\n');
}
