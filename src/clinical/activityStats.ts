import type { Consultation } from '../types/medical';
import { hasConfirmedPatientSelection } from '../services/patientSelectionGuard';

// HELIOS activity: administrative counts of explicitly recorded fields only.
// Orphan or ambiguous patient IDs must not enter these statistics.
type ActivityConsultation = Pick<Consultation, 'patientId' | 'specialty' | 'motif'>;
type ActivityPatient = { id: string };
export type ActivityCount = { label: string; count: number };
export type ClinicalActivitySummary = {
  included: number;
  excluded: number;
  specialties: ActivityCount[];
  motifs: ActivityCount[];
};

function safeLabel(value: unknown): string {
  if (typeof value !== 'string') return 'Non renseigné';
  const clean = value.trim();
  return clean && clean.length <= 120 ? clean : 'Non renseigné';
}

function orderedCounts(values: Map<string, number>): ActivityCount[] {
  return [...values.entries()].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
}

export function summarizeRecordedActivity(
  patients: readonly ActivityPatient[],
  consultations: readonly ActivityConsultation[],
): ClinicalActivitySummary {
  const specialties = new Map<string, number>();
  const motifs = new Map<string, number>();
  let included = 0;
  let excluded = 0;
  for (const visit of consultations) {
    if (!visit || !hasConfirmedPatientSelection(visit.patientId, patients)) {
      excluded++;
      continue;
    }
    included++;
    const specialty = safeLabel(visit.specialty);
    const motif = safeLabel(visit.motif);
    specialties.set(specialty, (specialties.get(specialty) ?? 0) + 1);
    motifs.set(motif, (motifs.get(motif) ?? 0) + 1);
  }
  return {
    included,
    excluded,
    specialties: orderedCounts(specialties),
    motifs: orderedCounts(motifs),
  };
}
