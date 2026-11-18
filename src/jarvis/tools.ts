import { parseAction, type JarvisAction, type MedicationDraft } from './actionSchema';
import { patientSnapshot, resolveContext } from './context';
import type { InventoryItem, MedicalData } from '../types/medical';

export type PendingAction = { action: JarvisAction; version: string; stock?: InventoryItem };
type PatientBinding = { patientId: string; patientVersion: string };
export type ConsultationPrefill = PatientBinding & {
  field: Extract<JarvisAction, { tool: 'prepare_consultation' }>['field'];
  value: string;
};
export type PrescriptionPrefill = PatientBinding & { medication: MedicationDraft };
export type ReceiptPrefill = { itemId: string; itemVersion: string; quantity: number };

export type ActionResult =
  | { ok: false; message: string }
  | { ok: true; action: Extract<JarvisAction, { tool: 'open_page' }> }
  | { ok: true; draft: ConsultationPrefill }
  | { ok: true; prescription: PrescriptionPrefill }
  | { ok: true; receipt: ReceiptPrefill };

export function receiptTarget(items: readonly InventoryItem[], id: string, quantity: number) {
  const matches = items.filter(item => item.id === id);
  const item = matches.length === 1 ? matches[0] : undefined;
  return item && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(item.quantity) &&
    item.quantity >= 0 && Number.isFinite(item.quantity + quantity) &&
    item.quantity + quantity > item.quantity ? item : undefined;
}

export function authorizeAction(
  pending: PendingAction | null, allowed: boolean,
  data: Pick<MedicalData, 'patients' | 'consultations'>,
  patientId: string, visitId: string, sessionVersion: string,
  items: readonly InventoryItem[] = [],
): ActionResult {
  if (!allowed) return { ok: false, message: 'Outils locaux indisponibles avec ce mode d’accès.' };
  const action = parseAction(pending?.action);
  if (!pending || !action) return { ok: false, message: 'Confirmation absente ou action invalide.' };
  const latest = resolveContext(data.patients, data.consultations, patientId, visitId);
  if (!latest.valid || pending.version !== sessionVersion) {
    return { ok: false, message: 'Le contexte a changé. Préparez une nouvelle action.' };
  }
  if (action.tool === 'open_page') return { ok: true, action };
  if (action.tool === 'prepare_receipt') {
    const item = receiptTarget(items, action.itemId, action.quantity);
    if (!item || JSON.stringify(item) !== JSON.stringify(pending.stock)) {
      return { ok: false, message: 'Le lot ou sa quantité a changé. Préparez une nouvelle action.' };
    }
    return { ok: true, receipt: { itemId: item.id, itemVersion: JSON.stringify(item), quantity: action.quantity } };
  }
  if (!latest.patient) return { ok: false, message: 'Choisissez un patient.' };
  const binding = { patientId, patientVersion: patientSnapshot(latest.patient) ?? '' };
  if (action.tool === 'prepare_prescription') {
    return { ok: true, prescription: { ...binding, medication: action.medication } };
  }
  if (visitId) return { ok: false, message: 'Choisissez une nouvelle consultation.' };
  return { ok: true, draft: { ...binding, field: action.field, value: action.value } };
}
