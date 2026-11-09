// ============================================
// MEDIFOLLOW AI — MODÈLES DE DONNÉES MÉDICALES
// Version évolutive : les nouveaux champs sont optionnels
// afin de préserver la compatibilité avec les dossiers existants.
// ============================================

// ---------- PATIENT ----------

export type Patient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  phone: string;
  lastVisit: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  // Informations cliniques permanentes (facultatives pour les anciens dossiers).
  clinicalHistory?: PatientClinicalHistory;
  currentMedications?: CurrentMedication[];
};

// ---------- ANTÉCÉDENTS ET TRAITEMENTS ----------

export type ClinicalHistoryItem = {
  id: string;
  label: string;
  details?: string;
  date?: string;
  status?: string;
};

export type GynecoObstetricHistory = {
  menarche?: string;
  cycle?: string;
  lastMenstrualPeriod?: string;
  menopause?: string;
  gravidity?: string;
  parity?: string;
  miscarriages?: string;
  abortions?: string;
  deliveries?: string;
  cesareanSections?: string;
  pregnanciesDetails?: string;
  contraception?: string;
  other?: string;
};

export type PatientClinicalHistory = {
  medical?: ClinicalHistoryItem[];
  surgical?: ClinicalHistoryItem[];
  allergies?: ClinicalHistoryItem[];
  family?: ClinicalHistoryItem[];
  gynecoObstetric?: GynecoObstetricHistory;
  other?: string;
};

export type CurrentMedication = {
  id: string;
  name: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  indication?: string;
  instructions?: string;
};

// Instantané facultatif du contexte patient au moment de la consultation.
export type ConsultationClinicalContext = {
  history?: PatientClinicalHistory;
  currentMedications?: CurrentMedication[];
};

// ---------- SIGNES VITAUX ----------

export type Vitals = {
  systolic: string;
  diastolic: string;
  heartRate: string;
  spo2: string;
  temperature: string;
  respiratoryRate: string;
  weight: string;
  height: string;
  glycemia: string;
};

// ---------- EXAMEN PHYSIQUE STRUCTURÉ ----------

export type ExamFindingStatus =
  | 'normal'
  | 'abnormal'
  | 'not_examined'
  | 'not_recorded';

export type ExamFinding = {
  status?: ExamFindingStatus;
  value?: string;
  comment?: string;
};

export type ExamSection = {
  // Les clés identifient les éléments de l'examen (ex. auscultation, œdèmes).
  // Une propriété absente ou vide ne doit jamais être interprétée comme normale.
  [findingKey: string]: ExamFinding | undefined;
};

export type PhysicalExamination = {
  general?: ExamSection;
  cardiovascular?: ExamSection;
  respiratory?: ExamSection;
  neurological?: ExamSection;
  abdominal?: ExamSection;
  ent?: ExamSection;
  ophthalmological?: ExamSection;
  dermatological?: ExamSection;
  musculoskeletal?: ExamSection;
  lymphatic?: ExamSection;
  thyroid?: ExamSection;
  genitourinary?: ExamSection;
  pediatric?: ExamSection;
  gynecological?: ExamSection;
  customSections?: Record<string, ExamSection>;
  detailedComment?: string;
};

// ---------- SYNTHÈSE CLINIQUE ----------

export type ClinicalSummary = {
  content: string;
  status: 'draft' | 'validated';
  generatedAt?: string;
  validatedAt?: string;
};

// ---------- CONSULTATION ----------

export type Consultation = {
  id: string;
  patientId: string;
  date: string;
  motif: string;
  symptoms: string;
  history: string;
  targetedInterview?: string;
  vitals: Vitals;
  examination: string;
  diagnosis: string;
  plan: string;
  createdAt: string;
  updatedAt: string;

  // Champs facultatifs pour la compatibilité avec les consultations antérieures.
  specialty?: string;
  clinicalContext?: ConsultationClinicalContext;
  physicalExamination?: PhysicalExamination;
  clinicalSummary?: ClinicalSummary;
};

// ---------- MÉDICAMENT D'ORDONNANCE ----------

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
};

// ---------- ORDONNANCE ET EXAMENS ----------

export type PrescriptionCategory =
  | 'treatment'
  | 'laboratory'
  | 'radiology'
  | 'other';

export type PrescriptionItem = {
  id: string;
  category: PrescriptionCategory;
  name: string;
  details?: string;
  instructions?: string;
  inventoryItemId?: string;
  quantity?: number;
};

export type PrescriptionStatus = 'draft' | 'validated' | 'dispensed' | 'cancelled';

export type Prescription = {
  id: string;
  patientId: string;
  date: string;
  medications: Medication[];
  advice: string;
  savedAt: string;
  // Nouveaux champs facultatifs : compatibilité avec les anciennes ordonnances.
  items?: PrescriptionItem[];
  status?: PrescriptionStatus;
  validatedAt?: string;
  dispensedAt?: string;
  cancelledAt?: string;
};

// ---------- INVENTAIRE DU CABINET ----------

export type InventoryCategory = 'supply' | 'equipment' | 'treatment';

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  minimumQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StockMovementType = 'receipt' | 'dispense' | 'return' | 'adjustment';

export type StockMovement = {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  date: string;
  reason?: string;
  prescriptionId?: string;
  patientId?: string;
  reversesMovementId?: string;
};

export type InventoryData = {
  items: InventoryItem[];
  movements: StockMovement[];
};

// ---------- PARAMÈTRES MÉDECIN ----------

export type DoctorSettings = {
  doctorName: string;
  specialty: string;
  cabinetName: string;
  address: string;
  phone: string;
  email: string;
  copilotEnabled: boolean;
  confirmBeforePrescription: boolean;
  themePreference: 'auto' | 'light' | 'dark';
};

// ---------- MESSAGE DU COPILOTE ----------

export type CopilotMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

// ---------- CORBEILLE PATIENTS ----------

export type DeletedPatient = {
  patient: Patient;
  deletedAt: string;
};

// ---------- ÉTAT GLOBAL DES DONNÉES ----------

export type MedicalData = {
  patients: Patient[];
  consultations: Consultation[];
  prescriptions: Prescription[];
  settings: DoctorSettings;
  deletedPatients?: DeletedPatient[];
};
