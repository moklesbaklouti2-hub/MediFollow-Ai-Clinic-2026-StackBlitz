import type { Consultation } from '../types/medical';
import { recordedDateTimestamp } from './medicalTimeline';

// HELIOS Referral: source-only summary for clinician review. It neither
// decides whether referral is appropriate nor generates or sends a letter.
type ReferralSource = Pick<Consultation, 'id' | 'patientId' | 'date' | 'motif' | 'diagnosis' | 'plan'>;
export type ReferralSourceSummary = {
  consultationId: string;
  date: string;
  recordedMotif: string | null;
  recordedDiagnosis: string | null;
  recordedPlan: string | null;
};

function recordedText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function buildReferralSource(
  patientId: string,
  consultations: readonly ReferralSource[],
): ReferralSourceSummary | null {
  if (typeof patientId !== 'string' || !patientId.trim()) return null;
  // QW-165: an imported duplicate consultation ID is an ambiguous source.
  // Review-only; never select one arbitrarily for a referral preview.
  const idCounts = new Map<string, number>();
  for (const consultation of consultations) {
    if (!consultation || typeof consultation.id !== 'string' || !consultation.id.trim()) continue;
    idCounts.set(consultation.id, (idCounts.get(consultation.id) ?? 0) + 1);
  }
  let latest: ReferralSource | null = null;
  let latestTime = -Infinity;
  for (const consultation of consultations) {
    if (!consultation || consultation.patientId !== patientId ||
        typeof consultation.id !== 'string' ||
        idCounts.get(consultation.id) !== 1) continue;
    // QW-164: only a documented and valid chronology may determine recency.
    const time = recordedDateTimestamp(consultation.date);
    if (time === null) continue;
    if (time < latestTime || (time === latestTime && latest &&
        consultation.id.localeCompare(latest.id) >= 0)) continue;
    latest = consultation;
    latestTime = time;
  }
  if (!latest) return null;
  return {
    consultationId: latest.id,
    date: latest.date,
    recordedMotif: recordedText(latest.motif),
    recordedDiagnosis: recordedText(latest.diagnosis),
    recordedPlan: recordedText(latest.plan),
  };
}
