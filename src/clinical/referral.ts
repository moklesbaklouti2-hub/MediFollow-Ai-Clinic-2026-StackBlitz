import type { Consultation } from '../types/medical';

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
  let latest: ReferralSource | null = null;
  let latestTime = -Infinity;
  for (const consultation of consultations) {
    if (!consultation || consultation.patientId !== patientId ||
      typeof consultation.id !== 'string' ||
      typeof consultation.date !== 'string') continue;
    const time = Date.parse(consultation.date);
    if (!Number.isFinite(time)) continue;
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
