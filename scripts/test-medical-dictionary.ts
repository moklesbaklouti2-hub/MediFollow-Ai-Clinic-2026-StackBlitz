import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Offline structural regression checks only: no patient records, network, or AI calls.
const source = readFileSync(new URL('../src/data/medicalDictionary.ts', import.meta.url), 'utf8');
const terms = [...source.matchAll(/\{\s*term:\s*'([^']+)',\s*domain:\s*'([^']+)'/g)]
  .map(([, term, domain]) => ({ term, domain }));
assert.ok(terms.length >= 100, 'Lexique absent ou anormalement réduit');
const seen = new Set<string>();
for (const { term, domain } of terms) {
  const key = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  assert.ok(key.length > 1, 'Entrée vide ou invalide');
  assert.equal(term, term.trim(), `Espaces parasites dans le terme : ${term}`);
  assert.ok(!/[\u0000-\u001f\u007f]/u.test(term), `Caractère de contrôle dans le terme : ${term}`);
  assert.equal(term, term.normalize('NFC'), `Terme Unicode non normalisé : ${term}`);
  assert.ok(domain.trim().length > 0 && domain === domain.trim(), `Domaine vide ou mal formé : ${domain}`);
  assert.ok(!seen.has(key + ':' + domain), `Doublon lexical dans le même domaine : ${term} (${domain})`);
  seen.add(key + ':' + domain);
}
for (const term of ['exsudat', 'dyspnée', 'odynophagie', 'adénopathie']) {
  assert.ok(terms.some(entry => entry.term === term), `Terme médical attendu absent : ${term}`);
}
console.log(`OK — ${terms.length} entrées lexicales contrôlées, 4 termes essentiels présents.`);
console.log('NOTE — Contrôle structurel uniquement : ni exactitude clinique ni qualité de reconnaissance vocale validées.');
