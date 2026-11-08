
import type {
    Patient,
    Consultation,
    Prescription,
    DoctorSettings,
    MedicalData,
  } from '../types/medical';
  
  // ============================================
  // MEDIFOLLOW AI — SERVICE CENTRAL DE STOCKAGE
  // ============================================
  
  const STORAGE_KEYS = {
    patients: 'medifollow-patients',
    consultations: 'medifollow-consultations',
    prescriptions: 'medifollow-prescriptions',
    settings: 'medifollow-settings',
  };
  
  const UPDATE_EVENT = 'medifollow:data-updated';
  
  // ---------- PARAMÈTRES PAR DÉFAUT ----------
  
  export const DEFAULT_SETTINGS: DoctorSettings = {
    doctorName: 'Dr Mokhles Baklouti',
    specialty: 'Médecine de famille',
    cabinetName: 'Cabinet médical',
    address: '',
    phone: '',
    email: '',
    copilotEnabled: true,
    confirmBeforePrescription: true,
    themePreference: 'auto',
  };
  
  // ---------- OUTILS INTERNES ----------
  
  function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
  
  function readArray(key: string): Record<string, any>[] {
    if (!isBrowser()) return [];
  
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
  
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is Record<string, any> =>
              typeof item === 'object' && item !== null
          )
        : [];
    } catch {
      console.error(`MediFollow : données illisibles pour ${key}`);
      return [];
    }
  }
  
  function readObject<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
  
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
  
      const parsed: unknown = JSON.parse(raw);
  
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return fallback;
      }
  
      return { ...fallback, ...parsed };
    } catch {
      console.error(`MediFollow : paramètres illisibles pour ${key}`);
      return fallback;
    }
  }
  
  function writeData(key: string, value: unknown): boolean {
    if (!isBrowser()) return false;
  
    try {
      localStorage.setItem(key, JSON.stringify(value));
  
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
        detail: { key },
      }));
  
      return true;
    } catch (error) {
      console.error(`MediFollow : erreur d'enregistrement (${key})`, error);
      return false;
    }
  }
  
  function createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  
  function now(): string {
    return new Date().toISOString();
  }
  
  // ---------- PATIENTS ----------
  
  export function getPatients(): Patient[] {
    return readArray(STORAGE_KEYS.patients).map((item) => ({
      ...item,
      id: String(item.id ?? createId()),
      name: String(item.name ?? ''),
      age: Number(item.age ?? 0),
      sex: String(item.sex ?? 'Non renseigné'),
      phone: String(item.phone ?? ''),
      lastVisit: String(item.lastVisit ?? 'Aucune visite'),
      status: String(item.status ?? 'Nouveau'),
      createdAt: String(item.createdAt ?? now()),
      updatedAt: String(item.updatedAt ?? now()),
    })) as Patient[];
  }
  
  export function savePatients(patients: Patient[]): boolean {
    return writeData(STORAGE_KEYS.patients, patients);
  }
  
  // ---------- SIGNES VITAUX PAR DÉFAUT ----------
  
  const EMPTY_VITALS = {
    systolic: '',
    diastolic: '',
    heartRate: '',
    spo2: '',
    temperature: '',
    respiratoryRate: '',
    weight: '',
    height: '',
    glycemia: '',
  };
  
  // ---------- CONSULTATIONS ----------
  
  export function getConsultations(): Consultation[] {
    const patients = getPatients();
  
    return readArray(STORAGE_KEYS.consultations).map((item) => {
      const patientName = String(item.patient ?? '');
      const matchingPatient = patients.find(
        (patient) =>
          patient.name.trim().toLowerCase() ===
          patientName.trim().toLowerCase()
      );
  
      return {
        ...item,
        id: String(item.id ?? createId()),
        patientId: String(
          item.patientId ?? matchingPatient?.id ?? ''
        ),
        date: String(item.date ?? now()),
        motif: String(item.motif ?? ''),
        symptoms: String(item.symptoms ?? ''),
        history: String(item.history ?? ''),
        vitals: {
          ...EMPTY_VITALS,
          ...(typeof item.vitals === 'object' && item.vitals !== null
            ? item.vitals
            : {}),
        },
        examination: String(item.examination ?? ''),
        diagnosis: String(item.diagnosis ?? ''),
        plan: String(item.plan ?? ''),
        createdAt: String(item.createdAt ?? item.date ?? now()),
        updatedAt: String(item.updatedAt ?? item.date ?? now()),
      };
    }) as Consultation[];
  }
  
  export function saveConsultations(
    consultations: Consultation[]
  ): boolean {
    return writeData(STORAGE_KEYS.consultations, consultations);
  }
  
  // ---------- ORDONNANCES ----------
  
  export function getPrescriptions(): Prescription[] {
    const patients = getPatients();
  
    return readArray(STORAGE_KEYS.prescriptions).map((item) => {
      const patientName = String(item.patient ?? '');
      const matchingPatient = patients.find(
        (patient) =>
          patient.name.trim().toLowerCase() ===
          patientName.trim().toLowerCase()
      );
  
      const medications = Array.isArray(item.medications)
        ? item.medications.map((medication: Record<string, any>) => ({
            id: String(medication.id ?? createId()),
            name: String(medication.name ?? ''),
            dosage: String(medication.dosage ?? ''),
            route: String(medication.route ?? ''),
            frequency: String(medication.frequency ?? ''),
            duration: String(medication.duration ?? ''),
            instructions: String(medication.instructions ?? ''),
          }))
        : [];
  
      return {
        ...item,
        id: String(item.id ?? createId()),
        patientId: String(
          item.patientId ?? matchingPatient?.id ?? ''
        ),
        date: String(item.date ?? now()),
        medications,
        advice: String(item.advice ?? ''),
        savedAt: String(item.savedAt ?? now()),
      };
    }) as Prescription[];
  }
  
  export function savePrescriptions(
    prescriptions: Prescription[]
  ): boolean {
    return writeData(STORAGE_KEYS.prescriptions, prescriptions);
  }
  
  // ---------- PARAMÈTRES ----------
  
  export function getSettings(): DoctorSettings {
    const settings = readObject(
      STORAGE_KEYS.settings,
      DEFAULT_SETTINGS
    );
  
    const themePreference = ['auto', 'light', 'dark'].includes(
      settings.themePreference
    )
      ? settings.themePreference
      : 'auto';
  
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      themePreference: themePreference as DoctorSettings['themePreference'],
    };
  }
  
  export function saveSettings(settings: DoctorSettings): boolean {
    return writeData(STORAGE_KEYS.settings, settings);
  }
  
  // ---------- DONNÉES GLOBALES ----------
  
  export function getMedicalData(): MedicalData {
    return {
      patients: getPatients(),
      consultations: getConsultations(),
      prescriptions: getPrescriptions(),
      settings: getSettings(),
    };
  }
  
  // ---------- SYNCHRONISATION ----------
  
  export function subscribeToMedicalData(
    callback: () => void
  ): () => void {
    if (!isBrowser()) return () => {};
  
    const handleUpdate = () => callback();
  
    window.addEventListener(UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
  
    return () => {
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }
  
  // ---------- IDENTIFIANTS ----------
  
  export { createId };
  