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
