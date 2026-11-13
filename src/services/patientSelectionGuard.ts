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
