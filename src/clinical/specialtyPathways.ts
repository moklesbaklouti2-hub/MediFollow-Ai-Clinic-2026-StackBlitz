import type { Consultation } from '../types/medical';

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
  const groups = new Map<string, { count: number; lastConsultationDate: string | null; lastTimestamp: number }>();
  for (const visit of consultations) {
    if (!visit || visit.patientId !== patientId) continue;
    const specialty = documentedSpecialty(visit.specialty);
    const group = groups.get(specialty) ?? { count: 0, lastConsultationDate: null, lastTimestamp: -Infinity };
    group.count++;
    const date = typeof visit.date === 'string' ? visit.date : '';
    const time = date ? Date.parse(date) : NaN;
    if (Number.isFinite(time) && time > group.lastTimestamp) {
      group.lastTimestamp = time;
      group.lastConsultationDate = date;
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
