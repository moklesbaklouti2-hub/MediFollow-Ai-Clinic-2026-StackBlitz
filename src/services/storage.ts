import type {
  Patient,
  Consultation,
  Prescription,
  DoctorSettings,
  MedicalData,
  InventoryData,
  InventoryItem,
  StockMovement,
} from '../types/medical';

// ============================================
// MEDIFOLLOW AI — SERVICE CENTRAL DE STOCKAGE
// ============================================

const STORAGE_KEYS = {
  patients: 'medifollow-patients',
  consultations: 'medifollow-consultations',
  prescriptions: 'medifollow-prescriptions',
  settings: 'medifollow-settings',
  deletedPatients: 'medifollow-deleted-patients',
  inventory: 'medifollow-inventory',
};

const UPDATE_EVENT = 'medifollow:data-updated';
export const STORAGE_ERROR_EVENT = 'medifollow:storage-error';

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
  themePreference: 'dark',
};

// ---------- OUTILS INTERNES ----------

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function reportStorageError(key: string, error: unknown): void {
  console.error(`MediFollow : erreur d'enregistrement (${key})`, error);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, {
      detail: { key },
    }));
  }
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
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);

    // Vérifier que le navigateur a bien conservé exactement la valeur écrite.
    if (localStorage.getItem(key) !== serialized) {
      reportStorageError(key, new Error('Vérification après écriture échouée.'));
      return false;
    }

    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
      detail: { key },
    }));

    return true;
  } catch (error) {
    reportStorageError(key, error);
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

export function getDeletedPatients(): import('../types/medical').DeletedPatient[] {
  return readArray(STORAGE_KEYS.deletedPatients)
    .filter((item) => typeof item.patient === 'object' && item.patient !== null)
    .map((item) => ({
      patient: item.patient as Patient,
      deletedAt: String(item.deletedAt ?? now()),
    }));
}

export function saveDeletedPatients(
  deletedPatients: import('../types/medical').DeletedPatient[]
): boolean {
  return writeData(STORAGE_KEYS.deletedPatients, deletedPatients);
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

/* ---------- INVENTAIRE ET TRAÇABILITÉ DU STOCK ---------- */

const EMPTY_INVENTORY: InventoryData = { items: [], movements: [] };

export function getInventoryData(): InventoryData {
  if (!isBrowser()) return EMPTY_INVENTORY;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.inventory);
    if (!raw) return EMPTY_INVENTORY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return EMPTY_INVENTORY;
    }

    const data = parsed as Partial<InventoryData>;
    const items = Array.isArray(data.items) ? data.items : [];
    const movements = Array.isArray(data.movements) ? data.movements : [];

    return {
      items: items.filter((item): item is InventoryItem =>
        Boolean(item && typeof item.id === 'string')
      ),
      movements: movements.filter((movement): movement is StockMovement =>
        Boolean(movement && typeof movement.id === 'string')
      ),
    };
  } catch {
    console.error('MediFollow : inventaire illisible.');
    return EMPTY_INVENTORY;
  }
}

/** Enregistre ensemble les articles et leur journal de mouvements. */
export function saveInventoryData(data: InventoryData): boolean {
  return writeData(STORAGE_KEYS.inventory, data);
}

/**
 * Déduit le stock uniquement lors d'une délivrance effective.
 * Toutes les lignes sont vérifiées avant la moindre modification.
 */
export function dispenseInventoryItems(input: {
  prescriptionId: string;
  patientId: string;
  items: Array<{ inventoryItemId: string; quantity: number }>;
}): { success: boolean; error?: string } {
  const data = getInventoryData();

  // Idempotence : empêcher une seconde déduction pour la même ordonnance.
  // Le journal des mouvements reste la référence, même si l'interface est rechargée.
  const existingDispense = data.movements.some(
    (movement) =>
      movement.type === 'dispense' &&
      movement.prescriptionId === input.prescriptionId
  );
  if (existingDispense) {
    return { success: true, alreadyDispensed: true };
  }

  const requested = input.items.filter(
    (line) => line.inventoryItemId && Number.isFinite(line.quantity) && line.quantity > 0
  );

  if (requested.length === 0) {
    return { success: false, error: 'Aucun article de stock valide à délivrer.' };
  }

  const totals = new Map<string, number>();
  for (const line of requested) {
    totals.set(
      line.inventoryItemId,
      (totals.get(line.inventoryItemId) ?? 0) + line.quantity
    );
  }

  for (const [itemId, quantity] of totals) {
    const item = data.items.find((entry) => entry.id === itemId);
    if (!item) return { success: false, error: 'Un article lié à cette ordonnance est introuvable.' };
    if (item.category === 'equipment') {
      return { success: false, error: 'Un équipement durable ne peut pas être déduit comme un médicament délivré.' };
    }
    if (item.quantity < quantity) {
      return { success: false, error: `Stock insuffisant pour « ${item.name} » (disponible : ${item.quantity} ${item.unit}).` };
    }
  }

  const timestamp = now();
  for (const [itemId, quantity] of totals) {
    const item = data.items.find((entry) => entry.id === itemId)!;
    item.quantity -= quantity;
    item.updatedAt = timestamp;
    data.movements.unshift({
      id: createId(),
      itemId,
      itemName: item.name,
      type: 'dispense',
      quantity,
      date: timestamp,
      reason: 'Délivrance au patient',
      prescriptionId: input.prescriptionId,
      patientId: input.patientId,
    });
  }

  return saveInventoryData(data)
    ? { success: true }
    : { success: false, error: 'Échec d’enregistrement : le stock n’a pas été confirmé.' };
}

/** Enregistre un retour réel et réintègre les quantités retournées au stock. */
export function returnDispensedStock(input: {
  itemId: string;
  quantity: number;
  prescriptionId?: string;
  patientId?: string;
  reason?: string;
}): { success: boolean; error?: string } {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { success: false, error: 'Quantité de retour invalide.' };
  }

  const data = getInventoryData();
  const item = data.items.find((entry) => entry.id === input.itemId);
  if (!item) return { success: false, error: 'Article introuvable.' };
  if (item.category === 'equipment') {
    return { success: false, error: 'Un équipement durable ne relève pas d’un retour de délivrance.' };
  }

  const timestamp = now();
  item.quantity += input.quantity;
  item.updatedAt = timestamp;
  data.movements.unshift({
    id: createId(),
    itemId: item.id,
    itemName: item.name,
    type: 'return',
    quantity: input.quantity,
    date: timestamp,
    reason: input.reason || 'Retour de produit non utilisé et réintégrable',
    prescriptionId: input.prescriptionId,
    patientId: input.patientId,
  });

  return saveInventoryData(data)
    ? { success: true }
    : { success: false, error: 'Échec d’enregistrement du retour.' };
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
    deletedPatients: getDeletedPatients(),
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
