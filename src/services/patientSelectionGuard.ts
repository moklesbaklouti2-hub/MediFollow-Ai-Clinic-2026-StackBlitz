// A clinical document may be saved only against a single confirmed patient
// record ID. Imported identifiers that no longer exist or are duplicated must
// never be silently accepted or resolved by patient name.
export function hasConfirmedPatientSelection(
  patientId: unknown,
  patients: readonly { id: string }[],
): boolean {
  if (typeof patientId !== 'string' || !patientId.trim()) return false;
  return patients.filter(patient => patient.id === patientId).length === 1;
}


/**
 * QW-151 — a uniquely linked imported patient can still have a non-textual
 * name. Keep the confirmation of linkage separate from its readable label.
 */
export function confirmedPatientNameLabel(patient: unknown): string {
  if (!patient || typeof patient !== 'object' || Array.isArray(patient)) {
    return 'Dossier patient non relié — identité à confirmer';
  }
  const name = (patient as { name?: unknown }).name;
  if (typeof name !== 'string' || name.trim().length === 0) return 'Nom du patient à vérifier';
  return name;
}


// Voice identity must not discard letters from non-Latin names or collapse
// distinct accents/punctuation. NFC only reconciles canonical equivalents.
export function normalizeVoicePatientName(value: unknown): string {
  if (typeof value !== 'string' || /[\p{C}\p{Default_Ignorable_Code_Point}]/u.test(value)) return '';
  const name = value.normalize('NFC').toLocaleLowerCase('fr').normalize('NFC')
    .replace(/ +/g, ' ').trim();
  return /^[\p{L}\p{M}\p{N} '\u2019-]+$/u.test(name) && /\p{L}/u.test(name) ? name : '';
}
