import type { ExamFinding, ExamFindingStatus, PhysicalExamination } from '../types/medical';

type SectionKey = Exclude<keyof PhysicalExamination, 'customSections' | 'detailedComment'>;

type FindingDefinition = { key: string; label: string };
type SectionDefinition = { key: SectionKey; title: string; findings: FindingDefinition[] };

const sections: SectionDefinition[] = [
  { key: 'general', title: 'Examen général', findings: [
    { key: 'generalAppearance', label: 'État général et apparence' },
    { key: 'consciousness', label: 'Conscience et vigilance' },
    { key: 'orientation', label: 'Orientation temporo-spatiale' },
    { key: 'hydration', label: 'État d’hydratation' },
    { key: 'nutrition', label: 'État nutritionnel' },
    { key: 'skinColor', label: 'Coloration cutanéo-muqueuse' },
  ]},
  { key: 'cardiovascular', title: 'Examen cardiovasculaire', findings: [
    { key: 'precordialInspection', label: 'Inspection précordiale' },
    { key: 'peripheralPulses', label: 'Pouls périphériques' },
    { key: 'heartRateRhythm', label: 'Fréquence et rythme cardiaques' },
    { key: 'heartSounds', label: 'Bruits du cœur' },
    { key: 'murmurs', label: 'Souffles cardiaques' },
    { key: 'additionalSounds', label: 'Bruits surajoutés' },
    { key: 'lowerLimbEdema', label: 'Œdèmes des membres inférieurs' },
    { key: 'jugularVenousDistension', label: 'Turgescence jugulaire' },
    { key: 'capillaryRefill', label: 'Temps de recoloration cutanée' },
  ]},
  { key: 'respiratory', title: 'Examen respiratoire', findings: [
    { key: 'respiratoryRate', label: 'Fréquence respiratoire' },
    { key: 'chestInspection', label: 'Inspection thoracique et symétrie' },
    { key: 'chestPalpation', label: 'Palpation thoracique' },
    { key: 'chestPercussion', label: 'Percussion thoracique' },
    { key: 'breathSounds', label: 'Auscultation et murmure vésiculaire' },
    { key: 'crackles', label: 'Crépitants' },
    { key: 'wheezing', label: 'Sibilants / wheezing' },
    { key: 'otherRespiratorySounds', label: 'Autres bruits respiratoires' },
    { key: 'respiratoryDistress', label: 'Signes de détresse respiratoire' },
  ]},
  { key: 'neurological', title: 'Examen neurologique', findings: [
    { key: 'mentalStatus', label: 'État de conscience et comportement' },
    { key: 'cognition', label: 'Fonctions cognitives (si indiqué)' },
    { key: 'cranialNerves', label: 'Paires crâniennes' },
    { key: 'motorStrength', label: 'Force musculaire' },
    { key: 'muscleTone', label: 'Tonus musculaire' },
    { key: 'superficialSensation', label: 'Sensibilité superficielle' },
    { key: 'deepSensation', label: 'Sensibilité profonde' },
    { key: 'tendonReflexes', label: 'Réflexes ostéo-tendineux' },
    { key: 'plantarReflex', label: 'Réflexe cutané plantaire' },
    { key: 'coordination', label: 'Coordination' },
    { key: 'balanceGait', label: 'Équilibre et marche' },
    { key: 'meningealSigns', label: 'Signes méningés (si indiqué)' },
  ]},
  { key: 'abdominal', title: 'Examen abdominal', findings: [
    { key: 'abdominalInspection', label: 'Inspection abdominale' },
    { key: 'abdominalAuscultation', label: 'Auscultation' },
    { key: 'abdominalPalpation', label: 'Palpation superficielle et profonde' },
    { key: 'abdominalPercussion', label: 'Percussion' },
    { key: 'organomegaly', label: 'Hépato-splénomégalie / masses' },
    { key: 'peritonealSigns', label: 'Signes d’irritation péritonéale' },
    { key: 'herniaOrifices', label: 'Orifices herniaires' },
  ]},
  { key: 'ent', title: 'Examen ORL', findings: [
    { key: 'externalEar', label: 'Pavillon et conduit auditif' },
    { key: 'otoscopy', label: 'Otoscopie et tympan' },
    { key: 'anteriorRhinoscopy', label: 'Rhinoscopie antérieure' },
    { key: 'nasalAirflow', label: 'Perméabilité nasale' },
    { key: 'oralCavity', label: 'Cavité buccale et oropharynx' },
    { key: 'tonsils', label: 'Amygdales' },
    { key: 'neck', label: 'Cou et aires cervicales' },
    { key: 'hearing', label: 'Audition (tests réalisés)' },
  ]},
  { key: 'ophthalmological', title: 'Examen ophtalmologique', findings: [
    { key: 'visualAcuity', label: 'Acuité visuelle' },
    { key: 'pupils', label: 'Pupilles et réflexes photomoteurs' },
    { key: 'ocularMotility', label: 'Motilité oculaire' },
    { key: 'conjunctiva', label: 'Conjonctives' },
    { key: 'cornea', label: 'Cornée et segment antérieur' },
    { key: 'visualFields', label: 'Champs visuels (si testés)' },
    { key: 'fundoscopy', label: 'Fond d’œil (si réalisé)' },
  ]},
  { key: 'dermatological', title: 'Examen dermatologique', findings: [
    { key: 'lesionMorphology', label: 'Morphologie des lésions' },
    { key: 'lesionDistribution', label: 'Topographie et distribution' },
    { key: 'skinColorTexture', label: 'Coloration et texture cutanées' },
    { key: 'mucosaNailsHair', label: 'Muqueuses, ongles et cheveux' },
    { key: 'itchingPain', label: 'Prurit ou douleur' },
  ]},
  { key: 'musculoskeletal', title: 'Examen locomoteur détaillé', findings: [
    { key: 'jointInspection', label: 'Inspection des articulations et membres' },
    { key: 'jointPalpation', label: 'Palpation : douleur, chaleur, tuméfaction' },
    { key: 'activeMobility', label: 'Mobilité active' },
    { key: 'passiveMobility', label: 'Mobilité passive' },
    { key: 'rangeOfMotion', label: 'Amplitudes articulaires' },
    { key: 'muscleStrength', label: 'Force musculaire segmentaire' },
    { key: 'deformities', label: 'Déformations et gonflements' },
    { key: 'spine', label: 'Rachis' },
    { key: 'gaitPosture', label: 'Marche, posture et équilibre' },
    { key: 'specificManeuvers', label: 'Manœuvres et tests ciblés' },
  ]},
  { key: 'lymphatic', title: 'Aires ganglionnaires', findings: [
    { key: 'cervicalNodes', label: 'Aires cervicales' },
    { key: 'axillaryNodes', label: 'Aires axillaires' },
    { key: 'inguinalNodes', label: 'Aires inguinales' },
  ]},
  { key: 'thyroid', title: 'Examen thyroïdien', findings: [
    { key: 'thyroidInspection', label: 'Inspection cervicale' },
    { key: 'thyroidPalpation', label: 'Palpation thyroïdienne' },
    { key: 'thyroidNodules', label: 'Nodules / goitre' },
  ]},
  { key: 'genitourinary', title: 'Examen génito-urinaire', findings: [
    { key: 'renalAngle', label: 'Fosses lombaires et points urétéraux' },
    { key: 'externalGenital', label: 'Examen génital externe (si indiqué)' },
    { key: 'urinarySymptoms', label: 'Éléments cliniques urinaires' },
  ]},
  { key: 'pediatric', title: 'Examen pédiatrique', findings: [
    { key: 'pediatricWeight', label: 'Poids et courbe de croissance' },
    { key: 'pediatricHeight', label: 'Taille et courbe staturale' },
    { key: 'headCircumference', label: 'Périmètre crânien (selon âge)' },
    { key: 'development', label: 'Développement psychomoteur' },
    { key: 'behavior', label: 'Comportement et interaction' },
    { key: 'fontanelles', label: 'Fontanelles (nourrisson)' },
    { key: 'primitiveReflexes', label: 'Réflexes archaïques (nourrisson)' },
    { key: 'pediatricHydration', label: 'Hydratation et signes de déshydratation' },
    { key: 'pediatricEntDental', label: 'ORL et état bucco-dentaire' },
    { key: 'pediatricCardiorespiratory', label: 'Examen cardiovasculaire et respiratoire' },
    { key: 'pediatricAbdominal', label: 'Examen abdominal' },
    { key: 'pediatricNeurological', label: 'Examen neurologique adapté à l’âge' },
    { key: 'pediatricSkinMsK', label: 'Peau et appareil locomoteur' },
    { key: 'pediatricRedFlags', label: 'Signes d’alerte recherchés' },
  ]},
  { key: 'gynecological', title: 'Examen gynécologique', findings: [
    { key: 'gynecoContext', label: 'Contexte et indication de l’examen' },
    { key: 'externalGenitalExam', label: 'Examen des organes génitaux externes' },
    { key: 'speculumExam', label: 'Examen au spéculum' },
    { key: 'vaginalExam', label: 'Toucher vaginal / examen bimanuel' },
    { key: 'cervixDischarge', label: 'Col utérin et sécrétions' },
    { key: 'pelvicPainMass', label: 'Douleur ou masse pelvienne' },
    { key: 'breastExam', label: 'Examen mammaire (si indiqué)' },
    { key: 'consentConfidentiality', label: 'Consentement et confidentialité' },
  ]},
];

const statusLabels: Record<ExamFindingStatus, string> = {
  normal: 'Normal',
  abnormal: 'Anormal',
  not_examined: 'Non examiné',
  not_recorded: 'Non renseigné',
};

type Props = {
  value?: PhysicalExamination;
  onChange: (value: PhysicalExamination) => void;
};

export default function PhysicalExaminationEditor({ value = {}, onChange }: Props) {
  function updateFinding(sectionKey: SectionKey, findingKey: string, changes: Partial<ExamFinding>) {
    const currentSection = value[sectionKey] ?? {};
    const currentFinding = currentSection[findingKey] ?? {};
    onChange({
      ...value,
      [sectionKey]: {
        ...currentSection,
        [findingKey]: { ...currentFinding, ...changes },
      },
    });
  }

  return (
    <div className="physical-exam-editor">
      <style>{`
        .physical-exam-editor { display:grid; gap:12px; }
        .pex-section { border:1px solid var(--border,#e5ebef); border-radius:12px; padding:14px; display:grid; gap:12px; }
        .pex-section h4 { margin:0; font-size:15px; }
        .pex-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(150px,.55fr); gap:8px; align-items:center; }
        .pex-row label { font-size:13px; font-weight:600; }
        .pex-row select,.pex-row textarea { min-width:0; width:100%; box-sizing:border-box; padding:9px; border:1px solid var(--border,#dce4e8); border-radius:8px; background:var(--surface,#fff); color:inherit; font:inherit; }
        .pex-row textarea { grid-column:1/-1; resize:vertical; }
        .pex-note { margin:0; font-size:12px; color:#81909c; }
        @media(max-width:480px) { .pex-row { grid-template-columns:1fr; } }
      `}</style>
      <p className="pex-note">Renseignez uniquement les éléments réellement examinés. Un champ vide ou « Non renseigné » ne signifie jamais « normal ».</p>
      {sections.map((section) => (
        <details className="pex-section" key={section.key}>
          <summary><strong>{section.title}</strong></summary>
          {section.findings.map((finding) => {
            const current = value[section.key]?.[finding.key];
            return (
              <div className="pex-row" key={finding.key}>
                <label>{finding.label}</label>
                <select
                  aria-label={`Statut : ${finding.label}`}
                  value={current?.status ?? 'not_recorded'}
                  onChange={(event) => updateFinding(section.key, finding.key, { status: event.target.value as ExamFindingStatus })}
                >
                  {(Object.keys(statusLabels) as ExamFindingStatus[]).map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </select>
                <textarea
                  aria-label={`Constatations et commentaires : ${finding.label}`}
                  rows={2}
                  placeholder="Valeur, constatations et commentaires…"
                  value={[current?.value, current?.comment].filter(Boolean).join(' — ')}
                  onChange={(event) => updateFinding(section.key, finding.key, { value: event.target.value, comment: '' })}
                />
              </div>
            );
          })}
        </details>
      ))}
    </div>
  );
}
