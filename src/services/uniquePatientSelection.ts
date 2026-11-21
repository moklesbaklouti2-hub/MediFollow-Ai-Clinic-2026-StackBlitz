// A patient detail page must never pool medical records for two patients
// whose IDs collide after a malformed import. Fail closed until corrected.
export function selectUniquePatient<T extends { id: string }>(
  patients: readonly T[],
  requestedId: unknown,
): T | null {
  if (typeof requestedId !== 'string' || !requestedId.trim()) return null;
  let found: T | null = null;
  for (const patient of patients) {
    if (patient.id !== requestedId) continue;
    if (found !== null) return null;
    found = patient;
  }
  return found;
}
