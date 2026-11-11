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
    .replace(/[\u0300-\u036f]/g, '');
}


// Une mention explicitement niée (« pas de douleur thoracique ») ne doit
// pas déclencher à elle seule une alerte de douleur présente. Une mention
// positive indépendante conserve toujours l'alerte prioritaire.
// Détection volontairement prudente : une formulation ambiguë reste signalée.
const chestPainTerm = /\b(?:douleur thoracique|douleur precordiale|oppression thoracique|angor|thoracalgie)\b/gu;
const explicitChestPainNegation = /\b(?:pas|sans|aucun|aucune|absence|ni|nie|nient)\s+(?:(?:de|d|du|des|la|le|les|une?|toute?)\s+){0,2}$/u;

function hasReportedChestPain(value: string): boolean {
  const normalized = normalize(value);
  return Array.from(normalized.matchAll(chestPainTerm)).some(match => {
    // Ne pas interpréter une négation d'une phrase antérieure comme
    // s'appliquant à une nouvelle mention après ponctuation.
    const precedingClause = normalized
      .slice(Math.max(0, (match.index ?? 0) - 70), match.index ?? 0)
      .split(/[.,;:!?\n]/)
      .pop()?.replace(/['’]/gu, ' ') ?? '';
    return !explicitChestPainNegation.test(precedingClause);
  });
}

export function detectClinicalSuggestions(input: {
  patient?: Patient;
  specialty: string;
  motif: string;
  symptoms: string;
  history: string;
  targetedInterview?: string;
  vitals: Vitals;
}): ClinicalSuggestion[] {
  const text = normalize([
    input.specialty,
    input.motif,
    input.symptoms,
    input.history,
    input.targetedInterview ?? '',
  ].join(' '));
  const suggestions: ClinicalSuggestion[] = [];
  const reportedChestPain = [input.specialty, input.motif, input.symptoms, input.history, input.targetedInterview ?? '']
    .some(hasReportedChestPain);

  // Détection simple des données manquantes : un champ vide n'est jamais considéré comme normal.
  const hasPatientHistory = Boolean(
    input.patient?.clinicalHistory?.medical?.length ||
    input.patient?.clinicalHistory?.surgical?.length ||
    input.patient?.clinicalHistory?.allergies?.length ||
    input.patient?.clinicalHistory?.family?.length ||
    input.patient?.clinicalHistory?.other?.trim() ||
    input.patient?.currentMedications?.length
  );

  // Les réponses consignées dans l'interrogatoire ciblé constituent déjà
  // une histoire de la maladie : éviter de réclamer une deuxième saisie.
  // Une réponse vide/blanche ne remplace pas les symptômes à documenter.
  const hasSymptomNarrative = Boolean(input.symptoms.trim() || input.targetedInterview?.trim());
  if (input.motif.trim().length >= 4 && !hasSymptomNarrative) {
    suggestions.push({
      id: 'missing-symptom-history',
      priority: 'routine',
      title: 'Histoire de la maladie non renseignée',
      reason: 'Un motif est saisi, mais le champ des symptômes et de leur évolution est encore vide.',
      checks: [
        'Préciser le début, la durée et le mode d’installation.',
        'Décrire l’évolution, l’intensité et les facteurs aggravants ou soulageants.',
        'Rechercher les symptômes associés et les signes d’alarme pertinents pour le motif.',
      ],
    });
  }

  if (input.patient && !input.history.trim() && !hasPatientHistory) {
    suggestions.push({
      id: 'missing-medical-history',
      priority: 'routine',
      title: 'Antécédents et traitements à vérifier',
      reason: 'Aucun antécédent ni traitement n’est renseigné dans cette consultation ou dans les rubriques structurées du dossier patient.',
      checks: [
        'Vérifier les antécédents médicaux et chirurgicaux.',
        'Vérifier les allergies et intolérances.',
        'Faire le point sur les traitements en cours et l’automédication.',
      ],
    });
  }


  if (reportedChestPain) {
    // Les réponses déjà consignées par le copilote complètent l'histoire
    // des symptômes sans se substituer aux antécédents médicaux.
    const historyText = normalize([input.symptoms, input.targetedInterview ?? ''].join(' '));
    const missingChestPainDetails: string[] = [];

    if (!/\b(depuis|debut|apparition|duree|minutes|heures|jours)\b/.test(historyText)) {
      missingChestPainDetails.push('Préciser le début et la durée de la douleur.');
    }
    if (!/\b(?:irradi[\p{L}]*|bras|machoire|dos|epaule)\b/u.test(historyText)) {
      missingChestPainDetails.push('Préciser si la douleur irradie (bras, mâchoire, dos ou épaule).');
    }
    if (!/\b(dyspnee|essoufflement|sueurs|sueurs|nausees|vomissements|malaise|syncope)\b/.test(historyText)) {
      missingChestPainDetails.push('Rechercher et documenter les symptômes associés.');
    }
    if (!/\b(effort|repos|respiration|inspiration|palpation)\b/.test(historyText)) {
      missingChestPainDetails.push('Préciser les facteurs déclenchants, aggravants ou soulageants.');
    }

    if (missingChestPainDetails.length > 0) {
      suggestions.push({
        id: 'missing-chest-pain-details',
        priority: 'routine',
        title: 'Compléter les caractéristiques de la douleur thoracique',
        reason: 'Certains éléments clés de l’interrogatoire ne sont pas retrouvés dans le texte saisi. Vérifiez-les avec le patient et consignez les réponses.',
        checks: missingChestPainDetails,
      });
    }
  }

  if (reportedChestPain) {
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

  // Les constantes peuvent être dictées ou collées avec l'unité mmHg.
  // Ne retenir que la forme numérique complète (pas « 140/90 » ni « 140 ? »).
  const parseBloodPressure = (value: string): number | null => {
    const parsed = String(value ?? '').trim().match(/^(\\d+(?:[,.]\\d+)?)\\s*(?:mm\\s*hg)?$/iu);
    if (!parsed) return null;
    const number = Number(parsed[1].replace(',', '.'));
    return Number.isFinite(number) ? number : null;
  };
  const systolic = parseBloodPressure(input.vitals.systolic);
  const diastolic = parseBloodPressure(input.vitals.diastolic);
  if ((systolic !== null && systolic >= 140) ||
      (diastolic !== null && diastolic >= 90)) {
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
