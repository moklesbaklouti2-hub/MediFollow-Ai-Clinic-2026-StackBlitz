// Legacy patient linkage must never choose the first homonym.
// Existing explicit patient IDs remain authoritative. Old records without an ID
// are associated by name only when exactly one patient matches. Otherwise,
// leave the record unlinked for explicit reconciliation by a clinician.
type PatientIdentity = { id: string; name: string };

export function resolveLegacyPatientId(
  explicitId: unknown,
  legacyName: unknown,
  patients: readonly PatientIdentity[],
): string {
  if (explicitId !== undefined && explicitId !== null) {
    return typeof explicitId === 'string' ? explicitId : '';
  }
  if (typeof legacyName !== 'string' || !legacyName.trim()) return '';
  const normalized = legacyName.trim().toLocaleLowerCase('fr');
  let uniqueId: string | null = null;
  for (const patient of patients) {
    if (!patient.name.trim() || patient.name.trim().toLocaleLowerCase('fr') !== normalized) continue;
    if (uniqueId !== null) return '';
    uniqueId = patient.id;
  }
  return uniqueId ?? '';
}
