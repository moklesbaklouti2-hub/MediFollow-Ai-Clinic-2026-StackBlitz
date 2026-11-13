import { resolveLegacyPatientId } from './patientLinkage';
import { hasUniquePrescriptionId } from './prescriptionIdentity';
import { hasConfirmedPatientSelection } from './patientSelectionGuard';
import { isDispensablePrescriptionStatus } from './prescriptionFinality';
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
    return {
      ...item,
      id: String(item.id ?? createId()),
      patientId: resolveLegacyPatientId(item.patientId, item.patient, patients),
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
    const medications = Array.isArray(item.medications)
      ? item.medications.map((medication: Record<string, any>) => ({
          id: String(medication.id ?? createId()),
          name: String(medication.name ?? ''),
          dosage: String(medication.dosage ?? ''),
          route: String(medication.route ?? ''),
          frequency: String(medication.frequency ?? ''),
          duration: String(medication.duration ?? ''),
          instructions: String(medication.instructions ?? ''),
          inventoryItemId: medication.inventoryItemId ? String(medication.inventoryItemId) : undefined,
          dispensedQuantity:
            medication.dispensedQuantity === undefined || medication.dispensedQuantity === null
              ? undefined
              : Number(medication.dispensedQuantity),
        }))
      : [];

    return {
      ...item,
      id: String(item.id ?? createId()),
      patientId: resolveLegacyPatientId(item.patientId, item.patient, patients),
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

/** Refuse tout calcul sur un stock importé ou enregistré avec une quantité invalide. */
function hasValidInventoryBalance(item: InventoryItem, incoming = 0): boolean {
  return typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    item.quantity >= 0 &&
    Number.isFinite(item.quantity + incoming) &&
    item.quantity + incoming >= 0;
}

/** Vérifie la provenance des retours avant tout mouvement compensatoire. */
function hasConsistentDispenseTrace(data: InventoryData, original: StockMovement): boolean {
  if (typeof original.id !== 'string' || !original.id.trim() ||
      typeof original.itemId !== 'string' || !original.itemId.trim() ||
      typeof original.prescriptionId !== 'string' || !original.prescriptionId.trim() ||
      typeof original.patientId !== 'string' || !original.patientId.trim()) {
    return false;
  }

  // Un identifiant de mouvement doit désigner une seule trace, sans ambiguïté.
  const counts = new Map<string, number>();
  for (const movement of data.movements) {
    counts.set(movement.id, (counts.get(movement.id) ?? 0) + 1);
  }
  if (counts.get(original.id) !== 1) return false;

  // Une même ordonnance ne doit jamais référencer deux patients différents.
  if (data.movements.some((movement) =>
    movement.type === 'dispense' &&
    movement.prescriptionId === original.prescriptionId &&
    movement.patientId !== original.patientId
  )) return false;

  return data.movements.every((movement) => {
    if (movement.type !== 'return' || movement.reversesMovementId !== original.id) return true;
    return typeof movement.id === 'string' &&
      movement.id.trim().length > 0 &&
      counts.get(movement.id) === 1 &&
      movement.itemId === original.itemId &&
      movement.prescriptionId === original.prescriptionId &&
      movement.patientId === original.patientId;
  });
}

/**
 * Déduit le stock lors d'une délivrance effective.
 * Répartition FEFO automatique entre les lots du même produit :
 * les lots valides les plus proches de leur péremption sont utilisés d'abord.
 * Toutes les lignes sont vérifiées avant la moindre modification.
 */
export function dispenseInventoryItems(input: {
  prescriptionId: string;
  patientId: string;
  items: Array<{ inventoryItemId: string; quantity: number }>;
}): { success: boolean; error?: string; alreadyDispensed?: boolean } {
  if (!input || typeof input.prescriptionId !== 'string' || !input.prescriptionId.trim() ||
      typeof input.patientId !== 'string' || !input.patientId.trim()) {
    return { success: false, error: 'Délivrance refusée : ordonnance ou patient non identifié.' };
  }
  const data = getInventoryData();

  // QW-116: protect the storage boundary, not just the React form. A direct
  // stock-dispense caller must target exactly one saved prescription and
  // exactly one confirmed patient, with a matching immutable patient link.
  const medical = getMedicalData();
  if (!hasUniquePrescriptionId(input.prescriptionId, medical.prescriptions) ||
      !hasConfirmedPatientSelection(input.patientId, medical.patients)) {
    return { success: false, error: 'Délivrance refusée : ordonnance ou patient absent, ambigu ou non confirmé.' };
  }
  const matchingPrescription = medical.prescriptions.find(row => row.id === input.prescriptionId);
  if (!matchingPrescription || matchingPrescription.patientId !== input.patientId) {
    return { success: false, error: 'Délivrance refusée : ordonnance liée à un autre patient.' };
  }
  // A finalized document may be checked for an idempotent replay only when
  // its dispense journal already exists; a replay never deducts stock again.
  const priorDispenseExists = data.movements.some(move =>
    move.type === 'dispense' && move.prescriptionId === input.prescriptionId);
  if (!isDispensablePrescriptionStatus(matchingPrescription.status) &&
      !(matchingPrescription.status === 'dispensed' && priorDispenseExists)) {
    return { success: false, error: 'Délivrance refusée : statut non autorisé pour une nouvelle sortie de stock.' };
  }

  // Une seule ligne invalide bloque toute la délivrance : ne jamais déduire
  // silencieusement les autres articles d'une demande partiellement erronée.
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { success: false, error: 'Aucun article de stock valide à délivrer.' };
  }
  if (input.items.some((line) =>
    !line || typeof line.inventoryItemId !== 'string' || !line.inventoryItemId.trim() ||
    typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0
  )) {
    return { success: false, error: 'Délivrance refusée : identifiant ou quantité invalide pour un article. Aucun stock modifié.' };
  }
  const requested = input.items;

  const currentDate = new Date();
  const today = [
    currentDate.getFullYear(),
    String(currentDate.getMonth() + 1).padStart(2, '0'),
    String(currentDate.getDate()).padStart(2, '0'),
  ].join('-');

  const productRequests = new Map<string, {
    name: string;
    category: InventoryItem['category'];
    quantity: number;
  }>();

  for (const line of requested) {
    const selected = data.items.find((entry) => entry.id === line.inventoryItemId);
    if (!selected) {
      return { success: false, error: 'Un article lié à cette ordonnance est introuvable.' };
    }
    if (selected.category === 'equipment') {
      return { success: false, error: 'Un équipement durable ne peut pas être déduit comme un médicament délivré.' };
    }

    if (typeof selected.name !== 'string' || !selected.name.trim() ||
        !['supply', 'treatment'].includes(selected.category)) {
      return { success: false, error: 'Délivrance refusée : produit ou catégorie incohérente.' };
    }
    if (data.items.filter((entry) => entry.id === selected.id).length !== 1) {
      return { success: false, error: 'Délivrance refusée : identifiant de lot dupliqué.' };
    }

    const key = selected.category + '::' + selected.name.trim().toLocaleLowerCase('fr');
    const previous = productRequests.get(key);
    const totalQuantity = (previous?.quantity ?? 0) + line.quantity;
    if (!Number.isFinite(totalQuantity)) {
      return { success: false, error: 'Délivrance refusée : somme des quantités invalide.' };
    }
    productRequests.set(key, {
      name: selected.name,
      category: selected.category,
      quantity: totalQuantity,
    });
  }

  // Un replay n'est idempotent que s'il correspond réellement aux produits
  // et quantités historiquement délivrés, même en cas de répartition FEFO.
  const existingDispenses = data.movements.filter((movement) =>
    movement.type === 'dispense' && movement.prescriptionId === input.prescriptionId
  );
  if (existingDispenses.length > 0) {
    const recordedQuantities = new Map<string, number>();
    for (const movement of existingDispenses) {
      if (movement.patientId !== input.patientId ||
          !hasConsistentDispenseTrace(data, movement) ||
          typeof movement.quantity !== 'number' ||
          !Number.isFinite(movement.quantity) || movement.quantity <= 0) {
        return { success: false, error: 'Délivrance refusée : conflit de patient ou trace incohérente.' };
      }
      const sourceLots = data.items.filter((lot) => lot.id === movement.itemId);
      if (sourceLots.length !== 1 || typeof sourceLots[0].name !== 'string' ||
          !sourceLots[0].name.trim() || !['supply', 'treatment'].includes(sourceLots[0].category)) {
        return { success: false, error: 'Délivrance refusée : lot historique introuvable ou ambigu.' };
      }
      const lot = sourceLots[0];
      const key = lot.category + '::' + lot.name.trim().toLocaleLowerCase('fr');
      const total = (recordedQuantities.get(key) ?? 0) + movement.quantity;
      if (!Number.isFinite(total)) {
        return { success: false, error: 'Délivrance refusée : historique des quantités invalide.' };
      }
      recordedQuantities.set(key, total);
    }
    if (recordedQuantities.size !== productRequests.size ||
        [...productRequests].some(([key, request]) => recordedQuantities.get(key) !== request.quantity)) {
      return { success: false, error: 'Ordonnance déjà délivrée avec des produits ou quantités différents. Vérification manuelle nécessaire.' };
    }
    return { success: true, alreadyDispensed: true };
  }

  // QW-117: a new dispensing operation cannot coexist with orphaned stock
  // movements already linked to this prescription (for example an imported
  // return with no original dispense). Such a journal requires reconciliation.
  // Keep the legitimate idempotent replay above unchanged.
  if (data.movements.some(movement => movement.prescriptionId === input.prescriptionId)) {
    return {
      success: false,
      error: 'Délivrance refusée : mouvements de stock orphelins liés à cette ordonnance. Vérifiez et réconciliez le journal avant toute nouvelle sortie.',
    };
  }

  // Calculer toutes les allocations avant de modifier le moindre stock.
  const plannedMovements: Array<{ item: InventoryItem; quantity: number }> = [];

  for (const request of productRequests.values()) {
    const productLots = data.items.filter((item) =>
      item.category === request.category &&
      item.name.trim().toLocaleLowerCase('fr') === request.name.trim().toLocaleLowerCase('fr')
    );
    // Ne pas ignorer un lot corrompu si un autre lot pourrait servir la demande.
    if (productLots.some((lot) => !hasValidInventoryBalance(lot))) {
      return { success: false, error: 'Délivrance refusée : quantité de stock incohérente pour un lot de ce produit.' };
    }
    const matchingLots = productLots
      .filter((item) =>
        item.quantity > 0 &&
        (!item.expiryDate || item.expiryDate >= today)
      )
      .sort((a, b) => {
        if (!a.expiryDate && b.expiryDate) return 1;
        if (a.expiryDate && !b.expiryDate) return -1;
        const expiryOrder = (a.expiryDate || '').localeCompare(b.expiryDate || '');
        if (expiryOrder !== 0) return expiryOrder;
        return (a.batchNumber || '').localeCompare(b.batchNumber || '');
      });

    const available = matchingLots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (available < request.quantity) {
      return {
        success: false,
        error: `Stock valide insuffisant pour « ${request.name} » : ${available} disponible(s), ${request.quantity} demandé(s). Les lots périmés sont exclus.`,
      };
    }

    let remaining = request.quantity;
    for (const lot of matchingLots) {
      if (remaining <= 0) break;
      const allocated = Math.min(lot.quantity, remaining);
      if (allocated > 0) {
        plannedMovements.push({ item: lot, quantity: allocated });
        remaining -= allocated;
      }
    }
  }

  const timestamp = now();
  for (const allocation of plannedMovements) {
    allocation.item.quantity -= allocation.quantity;
    allocation.item.updatedAt = timestamp;
    data.movements.unshift({
      id: createId(),
      itemId: allocation.item.id,
      itemName: allocation.item.name,
      type: 'dispense',
      quantity: allocation.quantity,
      date: timestamp,
      reason: `Délivrance au patient — lot ${allocation.item.batchNumber || 'sans numéro'}`,
      prescriptionId: input.prescriptionId,
      patientId: input.patientId,
    });
  }

  return saveInventoryData(data)
    ? { success: true }
    : { success: false, error: 'Échec d’enregistrement : le stock n’a pas été confirmé.' };
}

/** Enregistre un retour partiel lié à un mouvement précis de délivrance. */
export function returnDispensedStock(input: {
  dispenseMovementId: string;
  quantity: number;
  reason?: string;
}): { success: boolean; error?: string } {
  if (!input || typeof input.dispenseMovementId !== 'string' || !input.dispenseMovementId.trim()) {
    return { success: false, error: 'Retour refusé : mouvement de délivrance non identifié.' };
  }
  if (typeof input.quantity !== 'number' || !Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { success: false, error: 'Quantité de retour invalide.' };
  }

  const data = getInventoryData();
  const original = data.movements.find((movement) =>
    movement.id === input.dispenseMovementId && movement.type === 'dispense'
  );
  if (!original) return { success: false, error: 'Mouvement de délivrance introuvable.' };
  if (!hasConsistentDispenseTrace(data, original)) {
    return { success: false, error: 'Retour refusé : traçabilité du lot, du patient ou de l’ordonnance incohérente.' };
  }

  // Une trace incomplète ou corrompue ne doit jamais gonfler le stock.
  if (!Number.isFinite(original.quantity) || original.quantity <= 0) {
    return { success: false, error: 'Délivrance d’origine incohérente : vérifiez l’historique du lot.' };
  }
  const previousReturns = data.movements.filter((movement) =>
    movement.type === 'return' && movement.reversesMovementId === original.id
  );
  if (previousReturns.some((movement) => !Number.isFinite(movement.quantity) || movement.quantity <= 0)) {
    return { success: false, error: 'Historique des retours incohérent : correction manuelle nécessaire.' };
  }
  const alreadyReturned = previousReturns.reduce((sum, movement) => sum + movement.quantity, 0);
  if (!Number.isFinite(alreadyReturned) || alreadyReturned > original.quantity) {
    return { success: false, error: 'Retours enregistrés supérieurs à la délivrance d’origine.' };
  }
  const remaining = original.quantity - alreadyReturned;
  if (input.quantity > remaining) {
    return { success: false, error: `Retour supérieur au reliquat : ${remaining} unité(s) peuvent encore être réintégrées pour ce lot.` };
  }

  // Un identifiant de lot doit désigner exactement un article, y compris
  // dans les historiques importés. Ne jamais créditer le premier doublon.
  const sourceLots = data.items.filter((entry) => entry.id === original.itemId);
  if (sourceLots.length !== 1) {
    return { success: false, error: 'Retour refusé : lot d’origine absent ou identifiant dupliqué.' };
  }
  const item = sourceLots[0];
  if (item.category === 'equipment') {
    return { success: false, error: 'Un équipement durable ne relève pas d’un retour de délivrance.' };
  }
  if (!hasValidInventoryBalance(item, input.quantity)) {
    return { success: false, error: 'Retour refusé : quantité du lot incohérente ou dépassement numérique.' };
  }
  const returnDate = new Date();
  const today = [returnDate.getFullYear(), String(returnDate.getMonth() + 1).padStart(2, '0'), String(returnDate.getDate()).padStart(2, '0')].join('-');
  if (item.expiryDate && item.expiryDate < today) {
    return { success: false, error: 'Retour bloqué : le lot d’origine est désormais périmé. Isolez-le et ne le réintégrez pas au stock disponible.' };
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
    reason: input.reason || 'Retour partiel contrôlé — lot d’origine',
    prescriptionId: original.prescriptionId,
    patientId: original.patientId,
    reversesMovementId: original.id,
  });

  return saveInventoryData(data)
    ? { success: true }
    : { success: false, error: 'Échec d’enregistrement du retour.' };
}

/** Annule une délivrance en réintégrant le reliquat de chaque lot d’origine. */
export function cancelDispensedPrescriptionStock(input: {
  prescriptionId: string;
}): { success: boolean; error?: string; alreadyReturned?: boolean } {
  if (!input || typeof input.prescriptionId !== 'string' || !input.prescriptionId.trim()) {
    return { success: false, error: 'Annulation refusée : ordonnance non identifiée.' };
  }
  const data = getInventoryData();
  const originalMovements = data.movements.filter((movement) =>
    movement.type === 'dispense' && movement.prescriptionId === input.prescriptionId
  );
  if (originalMovements.length === 0) {
    return { success: false, error: 'Aucun mouvement de délivrance trouvé pour cette ordonnance.' };
  }

  const allocations: Array<{ movement: StockMovement; item: InventoryItem; quantity: number }> = [];
  for (const movement of originalMovements) {
    if (!hasConsistentDispenseTrace(data, movement)) {
      return { success: false, error: 'Annulation refusée : traçabilité du lot, du patient ou de l’ordonnance incohérente.' };
    }
    if (!Number.isFinite(movement.quantity) || movement.quantity <= 0) {
      return { success: false, error: 'Annulation refusée : quantité d’une délivrance incohérente.' };
    }
    const previousReturns = data.movements.filter((entry) =>
      entry.type === 'return' && entry.reversesMovementId === movement.id
    );
    if (previousReturns.some((entry) => !Number.isFinite(entry.quantity) || entry.quantity <= 0)) {
      return { success: false, error: 'Annulation refusée : historique des retours incohérent.' };
    }
    const returned = previousReturns.reduce((sum, entry) => sum + entry.quantity, 0);
    if (!Number.isFinite(returned) || returned > movement.quantity) {
      return { success: false, error: 'Annulation refusée : retours supérieurs à la délivrance d’origine.' };
    }
    const remaining = movement.quantity - returned;
    // Contrôler l'unicité avant le cas « déjà retourné » : un journal
    // ambigu ne doit jamais être confirmé comme une annulation valide.
    const sourceLots = data.items.filter((entry) => entry.id === movement.itemId);
    if (sourceLots.length !== 1) {
      return { success: false, error: 'Annulation refusée : lot d’origine absent ou identifiant dupliqué.' };
    }
    const item = sourceLots[0];
    if (remaining === 0) continue;
    if (item.category === 'equipment') {
      return { success: false, error: 'Annulation refusée : un équipement durable ne peut pas être réintégré comme une délivrance.' };
    }
    if (!hasValidInventoryBalance(item, remaining)) {
      return { success: false, error: 'Annulation refusée : quantité du lot incohérente ou dépassement numérique.' };
    }
    const returnDate = new Date();
    const today = [returnDate.getFullYear(), String(returnDate.getMonth() + 1).padStart(2, '0'), String(returnDate.getDate()).padStart(2, '0')].join('-');
    if (item.expiryDate && item.expiryDate < today) {
      return { success: false, error: `Annulation bloquée pour le lot périmé « ${item.name} ». Isolez-le : il ne peut pas être réintégré au stock disponible.` };
    }
    allocations.push({ movement, item, quantity: remaining });
  }

  // Les retours multiples vers un même lot sont cumulés avant toute écriture.
  const returnsByLot = new Map<string, number>();
  for (const allocation of allocations) {
    const total = (returnsByLot.get(allocation.item.id) ?? 0) + allocation.quantity;
    if (!Number.isFinite(total) || !hasValidInventoryBalance(allocation.item, total)) {
      return { success: false, error: 'Annulation refusée : cumul des retours incohérent pour un lot.' };
    }
    returnsByLot.set(allocation.item.id, total);
  }

  if (allocations.length === 0) return { success: true, alreadyReturned: true };

  const timestamp = now();
  for (const allocation of allocations) {
    allocation.item.quantity += allocation.quantity;
    allocation.item.updatedAt = timestamp;
    data.movements.unshift({
      id: createId(),
      itemId: allocation.item.id,
      itemName: allocation.item.name,
      type: 'return',
      quantity: allocation.quantity,
      date: timestamp,
      reason: 'Annulation de délivrance — retour intégral du reliquat au lot d’origine',
      prescriptionId: input.prescriptionId,
      patientId: allocation.movement.patientId,
      reversesMovementId: allocation.movement.id,
    });
  }

  return saveInventoryData(data)
    ? { success: true }
    : { success: false, error: 'Échec d’enregistrement de la réintégration des lots.' };
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
