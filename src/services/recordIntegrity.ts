// Non-destructive integrity indicator: a document only counts as linked if
// its explicit/restored patientId exists in the current patient list.
// Never infer an identity from a shared name here.
type Identity = { id: string };
type LinkedDocument = { patientId: string };

export function countUnlinkedClinicalRecords(
  patients: readonly Identity[],
  consultations: readonly LinkedDocument[],
  prescriptions: readonly LinkedDocument[],
): { consultations: number; prescriptions: number } {
  const knownIds = new Set(patients
    .map(patient => patient.id)
    .filter(id => typeof id === 'string' && id.trim().length > 0));
  const count = (records: readonly LinkedDocument[]) =>
    records.filter(record => typeof record.patientId !== 'string' ||
      !record.patientId.trim() || !knownIds.has(record.patientId)).length;
  return { consultations: count(consultations), prescriptions: count(prescriptions) };
}
