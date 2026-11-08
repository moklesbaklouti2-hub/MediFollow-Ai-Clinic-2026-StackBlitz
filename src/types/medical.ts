// ============================================
// MEDIFOLLOW AI — MODÈLES DE DONNÉES MÉDICALES
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
  
  // ---------- CONSULTATION ----------
  
  export type Consultation = {
    id: string;
    patientId: string;
    date: string;
    motif: string;
    symptoms: string;
    history: string;
    vitals: Vitals;
    examination: string;
    diagnosis: string;
    plan: string;
    createdAt: string;
    updatedAt: string;
  };
  
  // ---------- MÉDICAMENT ----------
  
  export type Medication = {
    id: string;
    name: string;
    dosage: string;
    route: string;
    frequency: string;
    duration: string;
    instructions: string;
  };
  
  // ---------- ORDONNANCE ----------
  
  export type Prescription = {
    id: string;
    patientId: string;
    date: string;
    medications: Medication[];
    advice: string;
    savedAt: string;
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