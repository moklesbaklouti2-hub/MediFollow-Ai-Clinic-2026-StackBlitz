import assert from 'node:assert/strict';

const base = process.env.MEDIFOLLOW_TEST_URL || 'http://127.0.0.1:3001';
type Turn = { role: 'user' | 'assistant'; content: string };
const scenarios = [
  {
    name: 'ORL : non-répétition et continuité',
    turns: [
      'Cas fictif. Homme de 28 ans, odynophagie depuis 48 h, fièvre 39 °C, respiration normale, passage des solides et liquides conservé. Poursuis l’interrogatoire avec une seule question prioritaire.',
      'Oui, il avale sa salive normalement.',
      'Non, il ouvre normalement la bouche, sans difficulté.',
    ],
    check: (answers: string[]) => {
      const second = normalize(answers[1] || '');
      const third = normalize(answers[2] || '');
      return !/salive/.test(second) && !/ouvrir.*bouche|trismus/.test(third);
    },
  },
  {
    name: 'Cardiologie : données manquantes',
    turns: ['Cas fictif. Femme de 65 ans, vertiges au lever, traitement antihypertenseur. Quelle est la prochaine question prioritaire ?'],
    check: (answers: string[]) => answers[0]?.trim().length > 10,
  },
  {
    name: 'Pédiatrie : triage',
    turns: ['Cas fictif. Enfant de 3 ans, fièvre à 39,5 °C depuis 24 h, aucun autre renseignement. Pose une seule question prioritaire sans supposer un examen normal.'],
    check: (answers: string[]) => answers[0]?.trim().length > 10,
  },
  {
    name: 'Urgence : douleur thoracique',
    turns: ['Cas fictif. Homme de 55 ans, douleur thoracique constrictive depuis 30 minutes avec sueurs. Quelle conduite immédiate ?'],
    check: (answers: string[]) => /urgent|urgence|secours|ambulance|evaluation immediate|appel.*15|service d urgence/.test(normalize(answers[0] || '')),
  },
];
function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
async function main() {
  let failures = 0;
  console.log('Campagne de tests réels sur cas fictifs uniquement. Les appels peuvent consommer du quota IA.');
  for (const scenario of scenarios) {
    const history: Turn[] = [];
    const answers: string[] = [];
    for (const message of scenario.turns) {
      const started = Date.now();
      try {
        const response = await fetch(base + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history, context: { currentPage: 'Consultations', testFictif: true } }),
          signal: AbortSignal.timeout(48000),
        });
        const data: any = await response.json();
        if (!response.ok || typeof data.reply !== 'string') throw new Error('HTTP ' + response.status + ' ' + (data.code || data.error || ''));
        answers.push(data.reply);
        history.push({ role: 'user', content: message }, { role: 'assistant', content: data.reply });
        console.log('  ', scenario.name, '|', Date.now() - started, 'ms |', data.reply.replace(/\s+/g, ' ').slice(0, 260));
      } catch (error) {
        failures++;
        console.error('ÉCHEC TECHNIQUE', scenario.name, String(error));
        break;
      }
    }
    if (answers.length === scenario.turns.length) {
      const passed = scenario.check(answers);
      console.log(passed ? 'CONTRÔLE AUTOMATIQUE OK' : 'À REVOIR MANUELLEMENT', scenario.name);
      if (!passed) failures++;
    }
  }
  console.log('Résultat :', scenarios.length, 'scénarios,', failures, 'alertes techniques ou heuristiques.');
  console.log('Les contrôles automatiques ne constituent pas une validation médicale. Faire relire les réponses par un médecin.');
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
