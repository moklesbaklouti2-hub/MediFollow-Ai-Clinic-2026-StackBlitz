// HELIOS Consultation Express — strict, local transcription of labelled text.
// No diagnosis, interpretation, patient lookup, automatic save or network call.
export const MAX_EXPRESS_DRAFT_CHARS = 2500;
const MAX_FIELD_CHARS = 700;

export type ExpressField = 'motif' | 'symptoms' | 'history' | 'diagnosis' | 'plan';
export type ExpressFields = Partial<Record<ExpressField, string>>;
export type ExpressDraftResult =
  | { valid: true; fields: ExpressFields }
  | { valid: false; reason: string };

const LABELS: Readonly<Record<string, ExpressField>> = {
  motif: 'motif',
  symptomes: 'symptoms',
  histoire: 'history',
  diagnostic: 'diagnosis',
  plan: 'plan',
};

function normalizeLabel(value: string): string {
  return value.toLocaleLowerCase('fr').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

export function parseExpressDraft(input: unknown): ExpressDraftResult {
  if (typeof input !== 'string' || !input.trim()) {
    return { valid: false, reason: 'Saisissez une note fictive avec des libellés reconnus.' };
  }
  if (input.length > MAX_EXPRESS_DRAFT_CHARS) {
    return { valid: false, reason: 'Note trop longue : réduisez le texte avant de continuer.' };
  }
  const lines = input.split(/\r\n|\n|\r/).map(s => s.trim()).filter(Boolean);
  const fields: ExpressFields = {};
  for (const line of lines) {
    const pair = line.match(/^([^:]+):\s*(.*)$/);
    if (!pair) {
      return { valid: false, reason: 'Chaque ligne doit commencer par un libellé suivi de deux-points.' };
    }
    const label = normalizeLabel(pair[1]);
    // Only explicitly declared labels are accepted, never inherited properties.
    if (!Object.prototype.hasOwnProperty.call(LABELS, label)) {
      return { valid: false, reason: 'Libellé inconnu : utilisez Motif, Symptômes, Histoire, Diagnostic ou Plan.' };
    }
    const field = LABELS[label];
    const value = pair[2].trim();
    if (!value || value.length > MAX_FIELD_CHARS) {
      return { valid: false, reason: 'Un champ est vide ou dépasse 700 caractères.' };
    }
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      return { valid: false, reason: 'Libellé répété : vérifiez votre note avant de continuer.' };
    }
    fields[field] = value;
  }
  // A reason is mandatory for a new consultation; we never invent it.
  if (!fields.motif) {
    return { valid: false, reason: 'La note doit contenir une ligne Motif : ...' };
  }
  return { valid: true, fields };
}

export function expressWouldOverwrite(incoming: ExpressFields, existing: ExpressFields): boolean {
  return (Object.keys(incoming) as ExpressField[]).some(field =>
    typeof existing[field] === 'string' && existing[field]!.trim().length > 0
  );
}

// Bind a note to its first confirmed patient, before any transfer to the form.
export function expressDraftPatientBinding(boundPatientId: string | null, selectedPatientId: string, confirmed: boolean): string | null {
  if (!confirmed || !selectedPatientId.trim() || (boundPatientId !== null && boundPatientId !== selectedPatientId)) return null;
  return boundPatientId ?? selectedPatientId;
}
