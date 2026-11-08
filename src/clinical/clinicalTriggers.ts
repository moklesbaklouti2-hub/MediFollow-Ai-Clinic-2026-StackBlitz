import type { Patient, Vitals } from '../types/medical';

export type ClinicalSuggestion = {
  id: string;
  priority: 'high' | 'routine';
  title: string;
  reason: string;
  checks: string[];
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
}

export function detectClinicalSuggestions(input: {
  patient?: Patient;
  specialty: string;
  motif: string;
  symptoms: string;
  history: string;
  vitals: Vitals;
}): ClinicalSuggestion[] {
  const text = normalize([
    input.specialty,
    input.motif,
    input.symptoms,
    input.history,
  ].join(' '));
  const suggestions: ClinicalSuggestion[] = [];

  if (/\b(douleur thoracique|douleur precordiale|oppression thoracique|angor|thoracalgie)\b/.test(text)) {
    suggestions.push({
      id: 'chest-pain',
      priority: 'high',
      title: 'Évaluation d’une douleur thoracique',
      reason: 'Le motif ou les symptômes évoquent une douleur thoracique. Vérifiez d’abord la stabilité clinique et les signes de gravité.',
      checks: [
        'Évaluer immédiatement l’état général et rechercher une instabilité ou des signes de gravité.',
        'Préciser le début, la durée, le caractère, l’intensité et l’évolution de la douleur.',
        'Rechercher irradiation, dyspnée, sueurs, nausées, malaise ou syncope.',
        'Préciser le lien avec l’effort, le repos, la respiration ou la palpation.',
        'Documenter les constantes et réaliser/interpréter un ECG selon le contexte et les protocoles locaux.',
      ],
    });
  }

  if (/\b(grossesse|enceinte|gestation|prenatal|obstetrique|suivi de grossesse)\b/.test(text)) {
    suggestions.push({
      id: 'pregnancy',
      priority: 'routine',
      title: 'Repères du suivi de grossesse',
      reason: 'Un contexte de grossesse semble être mentionné. Confirmez le contexte et le terme avant d’appliquer un calendrier de suivi.',
      checks: [
        'Confirmer la grossesse et préciser le terme ou la date des dernières règles si connue.',
        'Rechercher les antécédents obstétricaux et les facteurs de risque maternels.',
        'Vérifier la pression artérielle et rechercher les signes d’alerte adaptés au terme.',
        'Vérifier les examens, dépistages et supplémentations recommandés selon le protocole local.',
        'Planifier la prochaine consultation et les examens à échéance.',
      ],
    });
  }

  if (input.patient && Number.isFinite(input.patient.age) && input.patient.age >= 65) {
    suggestions.push({
      id: 'older-adult',
      priority: 'routine',
      title: 'Points de vigilance chez la personne âgée',
      reason: 'L’âge enregistré est de 65 ans ou plus. Une évaluation adaptée au patient peut être utile selon le motif, l’autonomie et les comorbidités.',
      checks: [
        'Autonomie : activités de base et instrumentales (ADL/IADL).',
        'Cognition, humeur et éventuels troubles du comportement.',
        'Chutes, marche, équilibre et fragilité.',
        'Nutrition, poids et risque de dénutrition.',
        'Revue des traitements, interactions et risque iatrogène.',
      ],
    });
  }

  const systolic = Number(String(input.vitals.systolic).replace(',', '.'));
  const diastolic = Number(String(input.vitals.diastolic).replace(',', '.'));
  if ((Number.isFinite(systolic) && systolic >= 140) ||
      (Number.isFinite(diastolic) && diastolic >= 90)) {
    suggestions.push({
      id: 'elevated-bp',
      priority: 'routine',
      title: 'Pression artérielle à recontrôler',
      reason: 'Une valeur saisie atteint ou dépasse 140 mmHg systolique ou 90 mmHg diastolique. Une mesure isolée ne suffit pas à établir un diagnostic.',
      checks: [
        'Vérifier la technique, le brassard adapté et les conditions de mesure.',
        'Répéter les mesures après repos et documenter les valeurs.',
        'Rechercher les symptômes ou signes de gravité et adapter la conduite à tenir au contexte.',
        'Confirmer l’évaluation tensionnelle selon les recommandations et le protocole local.',
      ],
    });
  }

  return suggestions;
}
