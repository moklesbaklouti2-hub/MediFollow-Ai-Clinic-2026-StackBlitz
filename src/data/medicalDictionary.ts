/**
 * Référentiel lexical médical MediFollow AI — socle initial.
 *
 * Les termes sont organisés par domaine clinique pour la reconnaissance vocale.
 * Ce fichier est un lexique de travail, pas une édition officielle de SNOMED CT
 * ni une reproduction de la CIM-11. Les imports de terminologies officielles
 * devront respecter leurs licences, versions et conditions de redistribution.
 *
 * Références de cadrage :
 * - SNOMED CT (terminologie clinique structurée)
 * - CIM-11 / OMS (classification et descriptions cliniques)
 *
 * Les recommandations cliniques (HAS, NICE, sociétés savantes, OMS, etc.)
 * seront reliées séparément aux concepts concernés, avec organisme, version,
 * date et URL. Une recommandation ne certifie pas à elle seule l'orthographe
 * d'un terme.
 */

export type MedicalTermDomain =
  | 'anatomie'
  | 'semiologie'
  | 'cardiologie'
  | 'pneumologie'
  | 'orl'
  | 'digestif'
  | 'neurologie'
  | 'infectiologie'
  | 'dermatologie'
  | 'gynecologie'
  | 'pediatrie'
  | 'biologie'
  | 'imagerie'
  | 'therapeutique'
  | 'urgences'
  | 'examen';

export type MedicalDictionaryEntry = {
  term: string;
  domain: MedicalTermDomain;
  synonyms?: string[];
};

export const MEDICAL_DICTIONARY: MedicalDictionaryEntry[] = [
  // Sémiologie générale et examen clinique
  { term: 'adénopathie', domain: 'semiologie', synonyms: ['ganglion', 'ganglion lymphatique'] },
  { term: 'asthénie', domain: 'semiologie' },
  { term: 'anorexie', domain: 'semiologie' },
  { term: 'amaigrissement', domain: 'semiologie' },
  { term: 'altération de l’état général', domain: 'semiologie' },
  { term: 'fièvre', domain: 'semiologie' },
  { term: 'frissons', domain: 'semiologie' },
  { term: 'douleur', domain: 'semiologie' },
  { term: 'céphalée', domain: 'semiologie', synonyms: ['céphalées'] },
  { term: 'vertige', domain: 'semiologie' },
  { term: 'lipothymie', domain: 'semiologie' },
  { term: 'syncope', domain: 'semiologie' },
  { term: 'asthénie', domain: 'semiologie' },
  { term: 'paresthésie', domain: 'semiologie' },
  { term: 'dysesthésie', domain: 'semiologie' },
  { term: 'hypoesthésie', domain: 'semiologie' },
  { term: 'anesthésie', domain: 'semiologie' },
  { term: 'œdème', domain: 'semiologie' },
  { term: 'érythème', domain: 'semiologie' },
  { term: 'cyanose', domain: 'semiologie' },
  { term: 'pâleur', domain: 'semiologie' },
  { term: 'ictère', domain: 'semiologie' },
  { term: 'purpura', domain: 'semiologie' },
  { term: 'pétéchies', domain: 'semiologie' },
  { term: 'ecchymose', domain: 'semiologie' },
  { term: 'déshydratation', domain: 'semiologie' },
  { term: 'confusion', domain: 'semiologie' },
  { term: 'désorientation', domain: 'semiologie' },
  { term: 'altération de la conscience', domain: 'semiologie' },
  { term: 'raideur méningée', domain: 'semiologie' },
  { term: 'contracture', domain: 'semiologie' },
  { term: 'défense abdominale', domain: 'semiologie' },
  { term: 'météorisme', domain: 'semiologie' },
  { term: 'recoloration cutanée', domain: 'semiologie' },
  { term: 'temps de recoloration cutanée', domain: 'semiologie' },
  { term: 'anamnèse', domain: 'examen' },
  { term: 'inspection', domain: 'examen' },
  { term: 'palpation', domain: 'examen' },
  { term: 'percussion', domain: 'examen' },
  { term: 'auscultation', domain: 'examen' },
  { term: 'examen clinique', domain: 'examen' },

  // Appareil respiratoire
  { term: 'dyspnée', domain: 'pneumologie' },
  { term: 'polypnée', domain: 'pneumologie' },
  { term: 'tachypnée', domain: 'pneumologie' },
  { term: 'bradypnée', domain: 'pneumologie' },
  { term: 'orthopnée', domain: 'pneumologie' },
  { term: 'platypnée', domain: 'pneumologie' },
  { term: 'apnée', domain: 'pneumologie' },
  { term: 'pause respiratoire', domain: 'pneumologie' },
  { term: 'toux', domain: 'pneumologie' },
  { term: 'expectoration', domain: 'pneumologie' },
  { term: 'expectorations', domain: 'pneumologie' },
  { term: 'hémoptysie', domain: 'pneumologie' },
  { term: 'sibilants', domain: 'pneumologie' },
  { term: 'crépitants', domain: 'pneumologie' },
  { term: 'ronchi', domain: 'pneumologie' },
  { term: 'stridor', domain: 'pneumologie' },
  { term: 'murmure vésiculaire', domain: 'pneumologie' },
  { term: 'matité', domain: 'pneumologie' },
  { term: 'tympanisme', domain: 'pneumologie' },
  { term: 'hypoxémie', domain: 'pneumologie' },
  { term: 'hypoxie', domain: 'pneumologie' },
  { term: 'saturation en oxygène', domain: 'pneumologie' },
  { term: 'insuffisance respiratoire', domain: 'pneumologie' },

  // ORL et stomatologie
  { term: 'exsudat', domain: 'orl' },
  { term: 'odynophagie', domain: 'orl' },
  { term: 'dysphagie', domain: 'orl' },
  { term: 'odynodysphagie', domain: 'orl' },
  { term: 'pharyngite', domain: 'orl' },
  { term: 'amygdalite', domain: 'orl' },
  { term: 'angine', domain: 'orl' },
  { term: 'amygdales', domain: 'orl' },
  { term: 'érythème pharyngé', domain: 'orl' },
  { term: 'rhinorrhée', domain: 'orl' },
  { term: 'épistaxis', domain: 'orl' },
  { term: 'otalgie', domain: 'orl' },
  { term: 'otorrhée', domain: 'orl' },
  { term: 'acouphènes', domain: 'orl' },
  { term: 'vertige positionnel', domain: 'orl' },
  { term: 'dysphonie', domain: 'orl' },
  { term: 'aphonie', domain: 'orl' },
  { term: 'stomatite', domain: 'orl' },
  { term: 'gingivite', domain: 'orl' },

  // Cardiologie et vasculaire
  { term: 'tachycardie', domain: 'cardiologie' },
  { term: 'bradycardie', domain: 'cardiologie' },
  { term: 'palpitations', domain: 'cardiologie' },
  { term: 'extrasystole', domain: 'cardiologie' },
  { term: 'fibrillation atriale', domain: 'cardiologie' },
  { term: 'souffle cardiaque', domain: 'cardiologie' },
  { term: 'galop', domain: 'cardiologie' },
  { term: 'insuffisance cardiaque', domain: 'cardiologie' },
  { term: 'œdèmes des membres inférieurs', domain: 'cardiologie' },
  { term: 'reflux hépato-jugulaire', domain: 'cardiologie' },
  { term: 'turgescence jugulaire', domain: 'cardiologie' },
  { term: 'claudication intermittente', domain: 'cardiologie' },
  { term: 'pouls périphériques', domain: 'cardiologie' },
  { term: 'hypotension artérielle', domain: 'cardiologie' },
  { term: 'hypertension artérielle', domain: 'cardiologie' },
  { term: 'pression artérielle', domain: 'cardiologie' },
  { term: 'douleur thoracique', domain: 'cardiologie' },
  { term: 'précordialgie', domain: 'cardiologie' },

  // Digestif et hépatologie
  { term: 'nausées', domain: 'digestif' },
  { term: 'vomissements', domain: 'digestif' },
  { term: 'hématémèse', domain: 'digestif' },
  { term: 'méléna', domain: 'digestif' },
  { term: 'rectorragie', domain: 'digestif' },
  { term: 'diarrhée', domain: 'digestif' },
  { term: 'constipation', domain: 'digestif' },
  { term: 'dyspepsie', domain: 'digestif' },
  { term: 'pyrosis', domain: 'digestif' },
  { term: 'reflux gastro-œsophagien', domain: 'digestif' },
  { term: 'dyspepsie', domain: 'digestif' },
  { term: 'hépatomégalie', domain: 'digestif' },
  { term: 'splénomégalie', domain: 'digestif' },
  { term: 'ascite', domain: 'digestif' },
  { term: 'cholestase', domain: 'digestif' },
  { term: 'ictère cholestatique', domain: 'digestif' },
  { term: 'défense abdominale', domain: 'digestif' },
  { term: 'contracture abdominale', domain: 'digestif' },
  { term: 'appendicite', domain: 'digestif' },
  { term: 'cholécystite', domain: 'digestif' },
  { term: 'pancréatite', domain: 'digestif' },

  // Neurologie
  { term: 'aphasie', domain: 'neurologie' },
  { term: 'dysarthrie', domain: 'neurologie' },
  { term: 'hémiparésie', domain: 'neurologie' },
  { term: 'hémiplégie', domain: 'neurologie' },
  { term: 'paraplégie', domain: 'neurologie' },
  { term: 'tétraplégie', domain: 'neurologie' },
  { term: 'convulsions', domain: 'neurologie' },
  { term: 'crise épileptique', domain: 'neurologie' },
  { term: 'ataxie', domain: 'neurologie' },
  { term: 'tremblement', domain: 'neurologie' },
  { term: 'syndrome cérébelleux', domain: 'neurologie' },
  { term: 'déficit neurologique focal', domain: 'neurologie' },
  { term: 'paralysie faciale', domain: 'neurologie' },
  { term: 'Glasgow', domain: 'neurologie' },

  // Infectiologie et microbiologie
  { term: 'infection bactérienne', domain: 'infectiologie' },
  { term: 'infection virale', domain: 'infectiologie' },
  { term: 'infection fongique', domain: 'infectiologie' },
  { term: 'septicémie', domain: 'infectiologie' },
  { term: 'sepsis', domain: 'infectiologie' },
  { term: 'bactériémie', domain: 'infectiologie' },
  { term: 'streptocoque', domain: 'infectiologie' },
  { term: 'Streptococcus pyogenes', domain: 'infectiologie' },
  { term: 'pneumocoque', domain: 'infectiologie' },
  { term: 'staphylocoque', domain: 'infectiologie' },
  { term: 'antibiogramme', domain: 'infectiologie' },
  { term: 'antibiothérapie', domain: 'infectiologie' },
  { term: 'vaccination', domain: 'infectiologie' },
  { term: 'contagiosité', domain: 'infectiologie' },
  { term: 'incubation', domain: 'infectiologie' },

  // Dermatologie
  { term: 'lésion maculeuse', domain: 'dermatologie' },
  { term: 'papule', domain: 'dermatologie' },
  { term: 'vésicule', domain: 'dermatologie' },
  { term: 'bulle', domain: 'dermatologie' },
  { term: 'pustule', domain: 'dermatologie' },
  { term: 'squame', domain: 'dermatologie' },
  { term: 'desquamation', domain: 'dermatologie' },
  { term: 'urticaire', domain: 'dermatologie' },
  { term: 'eczéma', domain: 'dermatologie' },
  { term: 'cellulite infectieuse', domain: 'dermatologie' },
  { term: 'érysipèle', domain: 'dermatologie' },
  { term: 'prurit', domain: 'dermatologie' },

  // Gynécologie, obstétrique et pédiatrie
  { term: 'aménorrhée', domain: 'gynecologie' },
  { term: 'dysménorrhée', domain: 'gynecologie' },
  { term: 'ménorragies', domain: 'gynecologie' },
  { term: 'métrorragies', domain: 'gynecologie' },
  { term: 'leucorrhées', domain: 'gynecologie' },
  { term: 'grossesse', domain: 'gynecologie' },
  { term: 'grossesse extra-utérine', domain: 'gynecologie' },
  { term: 'prééclampsie', domain: 'gynecologie' },
  { term: 'éclampsie', domain: 'gynecologie' },
  { term: 'contractions utérines', domain: 'gynecologie' },
  { term: 'allaitement', domain: 'gynecologie' },
  { term: 'nouveau-né', domain: 'pediatrie' },
  { term: 'prématurité', domain: 'pediatrie' },
  { term: 'ictère néonatal', domain: 'pediatrie' },
  { term: 'détresse respiratoire néonatale', domain: 'pediatrie' },
  { term: 'courbe de croissance', domain: 'pediatrie' },
  { term: 'développement psychomoteur', domain: 'pediatrie' },

  // Biologie et examens complémentaires
  { term: 'numération formule sanguine', domain: 'biologie', synonyms: ['NFS', 'hémogramme'] },
  { term: 'hémoglobine', domain: 'biologie' },
  { term: 'hématocrite', domain: 'biologie' },
  { term: 'leucocytes', domain: 'biologie' },
  { term: 'neutrophiles', domain: 'biologie' },
  { term: 'lymphocytes', domain: 'biologie' },
  { term: 'plaquettes', domain: 'biologie' },
  { term: 'protéine C-réactive', domain: 'biologie', synonyms: ['CRP'] },
  { term: 'vitesse de sédimentation', domain: 'biologie', synonyms: ['VS'] },
  { term: 'créatinine', domain: 'biologie' },
  { term: 'urée', domain: 'biologie' },
  { term: 'glycémie', domain: 'biologie' },
  { term: 'hémoglobine glyquée', domain: 'biologie', synonyms: ['HbA1c'] },
  { term: 'ionogramme sanguin', domain: 'biologie' },
  { term: 'kaliémie', domain: 'biologie' },
  { term: 'natrémie', domain: 'biologie' },
  { term: 'troponine', domain: 'biologie' },
  { term: 'transaminases', domain: 'biologie' },
  { term: 'bilirubine', domain: 'biologie' },
  { term: 'protéinurie', domain: 'biologie' },
  { term: 'hématurie', domain: 'biologie' },
  { term: 'leucocyturie', domain: 'biologie' },
  { term: 'nitrites urinaires', domain: 'biologie' },
  { term: 'ECBU', domain: 'biologie' },
  { term: 'hémoculture', domain: 'biologie' },
  { term: 'prélèvement nasopharyngé', domain: 'biologie' },

  // Imagerie et explorations
  { term: 'radiographie', domain: 'imagerie' },
  { term: 'échographie', domain: 'imagerie' },
  { term: 'échocardiographie', domain: 'imagerie' },
  { term: 'tomodensitométrie', domain: 'imagerie', synonyms: ['scanner', 'TDM'] },
  { term: 'imagerie par résonance magnétique', domain: 'imagerie', synonyms: ['IRM'] },
  { term: 'électrocardiogramme', domain: 'imagerie', synonyms: ['ECG'] },
  { term: 'spirométrie', domain: 'imagerie' },
  { term: 'oxymétrie de pouls', domain: 'imagerie' },

  // Thérapeutique et pharmacologie
  { term: 'amoxicilline', domain: 'therapeutique' },
  { term: 'acide clavulanique', domain: 'therapeutique' },
  { term: 'paracétamol', domain: 'therapeutique' },
  { term: 'ibuprofène', domain: 'therapeutique' },
  { term: 'corticoïde', domain: 'therapeutique' },
  { term: 'bronchodilatateur', domain: 'therapeutique' },
  { term: 'anticoagulant', domain: 'therapeutique' },
  { term: 'antiagrégant plaquettaire', domain: 'therapeutique' },
  { term: 'posologie', domain: 'therapeutique' },
  { term: 'contre-indication', domain: 'therapeutique' },
  { term: 'interaction médicamenteuse', domain: 'therapeutique' },
  { term: 'effet indésirable', domain: 'therapeutique' },
  { term: 'voie orale', domain: 'therapeutique' },
  { term: 'voie intraveineuse', domain: 'therapeutique' },
  { term: 'voie intramusculaire', domain: 'therapeutique' },

  // Urgences
  { term: 'arrêt cardio-respiratoire', domain: 'urgences' },
  { term: 'réanimation cardio-pulmonaire', domain: 'urgences' },
  { term: 'défibrillation', domain: 'urgences' },
  { term: 'choc anaphylactique', domain: 'urgences' },
  { term: 'état de choc', domain: 'urgences' },
  { term: 'hypoglycémie', domain: 'urgences' },
  { term: 'hyperglycémie', domain: 'urgences' },
  { term: 'acidocétose diabétique', domain: 'urgences' },
  { term: 'accident vasculaire cérébral', domain: 'urgences', synonyms: ['AVC'] },
  { term: 'syndrome coronarien aigu', domain: 'urgences', synonyms: ['SCA'] },
  { term: 'embolie pulmonaire', domain: 'urgences' },
  { term: 'thrombose veineuse profonde', domain: 'urgences', synonyms: ['TVP'] },
];
