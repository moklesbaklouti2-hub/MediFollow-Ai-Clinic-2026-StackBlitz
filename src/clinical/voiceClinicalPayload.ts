// Preflight only: reject malformed clinical payloads before any form mutation.
const textFields = new Set(['specialty', 'motif', 'symptoms', 'history', 'targetedInterview', 'examination', 'diagnosis', 'plan']);
const vitalFields = new Set(['systolic', 'diastolic', 'heartRate', 'spo2', 'temperature', 'respiratoryRate', 'weight', 'height', 'glycemia']);

export function hasValidVoiceClinicalPayload(action: unknown): boolean {
  if (!action || typeof action !== 'object') return false;
  const { type, field, value, patientName } = action as Record<string, unknown>;
  if (type === 'select_patient') return typeof patientName === 'string' && Boolean(patientName.trim());
  if (typeof field !== 'string' || typeof value !== 'string' || !value.trim()) return false;
  if (type === 'set_consultation_field') return textFields.has(field);
  if (type === 'set_vital') {
    const numeric = value.trim().replace(',', '.');
    return vitalFields.has(field) && /^-?\d+(\.\d+)?$/.test(numeric) && Number.isFinite(Number(numeric));
  }
  return false;
}
