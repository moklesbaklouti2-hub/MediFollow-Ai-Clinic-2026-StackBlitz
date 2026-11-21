import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('docs/AGENT_COORDINATION.json', 'utf8'));
if (manifest.mode !== 'planning-only') {
  throw new Error('Mode non autorisé : le coordinateur ne peut pas exécuter un agent IA.');
}
const ready = manifest.modules.filter(module => module.status === 'ready' && module.owner === 'unassigned');
const occupied = new Set();
const plan = [];
for (const module of ready) {
  if (module.paths.some(path => occupied.has(path))) continue;
  module.paths.forEach(path => occupied.add(path));
  plan.push({
    module: module.id,
    task: module.nextTask,
    files: module.paths,
    validation: module.validation,
    mode: 'proposition uniquement',
  });
}
if (plan.length === 0) {
  console.log('Aucune tâche indépendante disponible.');
} else {
  console.log('Plan de tâches indépendantes (aucun agent exécuté) :');
  console.log(JSON.stringify(plan, null, 2));
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    '## Coordination — propositions de tâches',
    '',
    '> Planification seulement : aucun agent IA lancé, aucun fichier modifié.',
    '',
    ...plan.map(item => '- **' + item.module + '** : ' + item.task + ' — tests : ' + item.validation.join(', ')),
    '',
  ].join('\n'));
}
