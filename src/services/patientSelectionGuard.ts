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
