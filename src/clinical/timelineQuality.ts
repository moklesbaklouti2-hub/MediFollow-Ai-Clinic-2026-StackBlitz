import { recordedDateTimestamp } from './medicalTimeline';

type QualityEvent =
  | { type: 'consultation'; date: unknown; consultation: { specialty?: unknown } }
  | { type: 'prescription'; date: unknown; prescription: { status?: unknown } };

const KNOWN_STATUSES: readonly string[] = ['draft', 'validated', 'dispensed', 'cancelled'];

function documentaryGaps(event: QualityEvent): {
  date: boolean; specialty: boolean; prescriptionStatus: boolean;
} {
  const missingDate = recordedDateTimestamp(event.date) === null;
  if (event.type === 'consultation') {
    const specialty: unknown = event.consultation?.specialty;
    return {
      date: missingDate,
      specialty: typeof specialty !== 'string' || !specialty.trim(),
      prescriptionStatus: false,
    };
  }
  const status: unknown = event.prescription?.status;
  return {
    date: missingDate,
    specialty: false,
    prescriptionStatus: !KNOWN_STATUSES.includes(typeof status === 'string' ? status : ''),
  };
}

// Presentation-only quality review: a missing field is NOT a clinical finding,
// diagnosis, obligation to alter historical data, or evidence of an active drug.
export function filterTimelineDocumentationGaps<T extends QualityEvent>(events: readonly T[]): T[] {
  return events.filter(event => {
    const gaps = documentaryGaps(event);
    return gaps.date || gaps.specialty || gaps.prescriptionStatus;
  });
}

export type TimelineDocumentationSummary = {
  total: number;
  datesUnspecified: number;
  specialtiesUnspecified: number;
  prescriptionStatusesUnspecified: number;
};

// Pure, document-quality counters only. Never infer medical outcomes or
// validity from the absence of data and never alter stored events.
export function summarizeTimelineDocumentation(
  events: readonly QualityEvent[],
): TimelineDocumentationSummary {
  const summary: TimelineDocumentationSummary = {
    total: events.length,
    datesUnspecified: 0,
    specialtiesUnspecified: 0,
    prescriptionStatusesUnspecified: 0,
  };
  for (const event of events) {
    const gaps = documentaryGaps(event);
    if (gaps.date) summary.datesUnspecified++;
    if (gaps.specialty) summary.specialtiesUnspecified++;
    if (gaps.prescriptionStatus) summary.prescriptionStatusesUnspecified++;
  }
  return summary;
}
