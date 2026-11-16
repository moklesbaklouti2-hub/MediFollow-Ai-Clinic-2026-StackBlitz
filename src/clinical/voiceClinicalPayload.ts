import { normalizeVoicePatientName } from '../services/patientSelectionGuard';

// Preflight only: reject malformed clinical payloads before any form mutation.
const textFields = new Set(['specialty', 'motif', 'symptoms', 'history', 'targetedInterview', 'examination', 'diagnosis', 'plan']);
const vitalFields = new Set(['systolic', 'diastolic', 'heartRate', 'spo2', 'temperature', 'respiratoryRate', 'weight', 'height', 'glycemia']);

export function hasValidVoiceClinicalPayload(action: unknown): boolean {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
  const own = (key: string) => Object.prototype.hasOwnProperty.call(action, key);
  if (!own('type')) return false;
  const { type, field, value, patientName } = action as Record<string, unknown>;
  if (type === 'select_patient') return own('patientName') && Boolean(normalizeVoicePatientName(patientName));
  if (!own('field') || !own('value')) return false;
  if (typeof field !== 'string' || typeof value !== 'string' || !value.trim()) return false;
  if (type === 'set_consultation_field') {
    // Match Express text integrity rules; preserve valid multilingual joiners.
    return textFields.has(field) && Boolean(value.replace(/[\u200C\u200D]/gu, '').trim()) &&
      !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u061C\u200B\u200E\u200F\u2028-\u202E\u2066-\u2069\uFEFF\uD800-\uDFFF\u00AD\u034F\u180E\u2060-\u2064\u206A-\u206F]/u.test(value);
  }
  if (type === 'set_vital') {
    // Do not silently strip control characters or invisible Unicode from a numeric value.
    if (!/^[ 0-9,.-]+$/.test(value)) return false;
    const numeric = value.trim().replace(',', '.');
    return vitalFields.has(field) && /^-?\d+(\.\d+)?$/.test(numeric) && Number.isFinite(Number(numeric));
  }
  return false;
}

 // Resolve only explicit specialty labels or the exact ORL alias.
export function resolveVoiceSpecialty(value: string, options: readonly string[]): string | undefined {
  const normalize = (text: string) => text.toLocaleLowerCase('fr').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const requested = normalize(value);
  if (!requested) return undefined;
  if (requested === 'orl' || requested === 'oto rhino laryngologie') {
    return options.find(option => option === 'Oto-rhino-laryngologie (ORL)');
  }
  const matches = options.filter(option => normalize(option) === requested);
  return matches.length === 1 ? matches[0] : undefined;
}

 // Reject sparse batches and repeated targets before dispatch: no implicit last-write-wins.
export function hasDistinctVoiceClinicalTargets(actions: readonly unknown[]): boolean {
  const targets = new Set<string>();
  for (const action of actions) {
    if (!hasValidVoiceClinicalPayload(action)) return false;
    const { type, field } = action as Record<string, unknown>;
    const target = type === 'select_patient' ? 'patient' : String(type) + ':' + String(field);
    if (targets.has(target)) return false;
    targets.add(target);
  }
  return true;
}
