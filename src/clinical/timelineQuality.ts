import { recordedDateTimestamp } from './medicalTimeline';

type QualityEvent =
  | { type: 'consultation'; date: unknown; consultation: { specialty?: unknown } }
  | { type: 'prescription'; date: unknown; prescription: { status?: unknown } };

const KNOWN_STATUSES: readonly string[] = ['draft', 'validated', 'dispensed', 'cancelled'];

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
    if (recordedDateTimestamp(event.date) === null) summary.datesUnspecified++;
    if (event.type === 'consultation') {
      const specialty: unknown = event.consultation?.specialty;
      if (typeof specialty !== 'string' || !specialty.trim()) summary.specialtiesUnspecified++;
    } else {
      const status: unknown = event.prescription?.status;
      if (!KNOWN_STATUSES.includes(typeof status === 'string' ? status : '')) {
        summary.prescriptionStatusesUnspecified++;
      }
    }
  }
  return summary;
}
