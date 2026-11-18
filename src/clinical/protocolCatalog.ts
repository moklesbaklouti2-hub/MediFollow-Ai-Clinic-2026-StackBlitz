export const protocols = [
  {
    title: 'Hypertension artérielle',
    category: 'Cardiologie',
    description: 'Évaluation initiale, mesure de la pression artérielle et suivi.',
    tags: ['HTA', 'Tension', 'Cardiovasculaire'],
  },
  {
    title: 'Diabète de type 2',
    category: 'Endocrinologie',
    description: 'Dépistage, bilan initial et suivi du patient diabétique.',
    tags: ['Diabète', 'Glycémie', 'HbA1c'],
  },
  {
    title: 'Infection respiratoire aiguë',
    category: 'Pneumologie',
    description: 'Évaluation clinique et recherche des signes de gravité.',
    tags: ['Respiratoire', 'Infection', 'Fièvre'],
  },
  {
    title: 'Suivi de grossesse',
    category: 'Gynécologie',
    description: 'Organisation du suivi prénatal et surveillance materno-fœtale.',
    tags: ['Grossesse', 'Prénatal', 'Obstétrique'],
  },
  {
    title: 'Évaluation de la personne âgée',
    category: 'Gériatrie',
    description: 'Évaluation globale, autonomie, nutrition et risque de chute.',
    tags: ['Gériatrie', 'Autonomie', 'Fragilité'],
  },
  {
    title: 'Douleur aiguë',
    category: 'Urgences',
    description: 'Évaluation de la douleur, recherche de signes d’alerte et réévaluation.',
    tags: ['Douleur', 'Évaluation', 'Urgences'],
  },
];

export function matchesProtocol(protocol: typeof protocols[number], query: string) {
  return (protocol.title + protocol.description + protocol.category + protocol.tags.join(' '))
    .toLowerCase().includes(query.toLowerCase());
}
