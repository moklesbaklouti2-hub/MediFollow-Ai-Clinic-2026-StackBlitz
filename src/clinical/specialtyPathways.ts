import type { Consultation } from '../types/medical';
import { recordedDateTimestamp } from './medicalTimeline';

// HELIOS Parcours spécialisés: a read-only index of explicitly recorded
// consultation specialties. It does not infer care pathways or clinical status.
type SpecialtyVisit = Pick<Consultation, 'patientId' | 'id' | 'specialty' | 'date'>;
export type DocumentedSpecialtyPath = {
  specialty: string;
  count: number;
  lastConsultationDate: string | null;
};

function documentedSpecialty(value: unknown): string {
  if (typeof value !== 'string') return 'Spécialité non renseignée';
  const label = value.trim();
  return label && label.length <= 120 ? label : 'Spécialité non renseignée';
}

export function summarizeDocumentedSpecialties(
  patientId: unknown,
  consultations: readonly SpecialtyVisit[],
): DocumentedSpecialtyPath[] {
  if (typeof patientId !== 'string' || !patientId.trim()) return [];
  // QW-166: never count imported visits with missing or colliding IDs.
  const ids = new Map<string, number>();
  for (const visit of consultations) {
    if (!visit || typeof visit.id !== 'string' || !visit.id.trim()) continue;
    ids.set(visit.id, (ids.get(visit.id) ?? 0) + 1);
  }
  const groups = new Map<string, { count: number; lastConsultationDate: string | null; lastTimestamp: number }>();
  for (const visit of consultations) {
    if (!visit || visit.patientId !== patientId ||
        typeof visit.id !== 'string' || ids.get(visit.id) !== 1) continue;
    const specialty = documentedSpecialty(visit.specialty);
    const group = groups.get(specialty) ?? { count: 0, lastConsultationDate: null, lastTimestamp: -Infinity };
    group.count++;
    // QW-167: ambiguous/impossible dates cannot establish a clinical last visit.
    const time = recordedDateTimestamp(visit.date);
    if (time !== null && time > group.lastTimestamp) {
      group.lastTimestamp = time;
      group.lastConsultationDate = visit.date;
    }
    groups.set(specialty, group);
  }
  return [...groups.entries()]
    .map(([specialty, item]) => ({
      specialty,
      count: item.count,
      lastConsultationDate: item.lastConsultationDate,
    }))
    .sort((a, b) => b.count - a.count || a.specialty.localeCompare(b.specialty, 'fr'));
}
