import type { Consultation, Vitals } from '../types/medical';
import { recordedDateTimestamp } from './medicalTimeline';

// HELIOS Trends: compare the two most recent recorded numeric values for a
// single unit. This is descriptive only; no thresholds, alerts or AI inference.
const COMPARED_VITALS: ReadonlyArray<{ key: keyof Vitals; label: string; unit: string }> = [
  { key: 'weight', label: 'Poids', unit: 'kg' },
  { key: 'systolic', label: 'Pression systolique', unit: 'mmHg' },
  { key: 'diastolic', label: 'Pression diastolique', unit: 'mmHg' },
  { key: 'glycemia', label: 'Glycémie', unit: 'g/L' },
  { key: 'heartRate', label: 'Fréquence cardiaque', unit: 'bpm' },
  { key: 'spo2', label: 'Saturation SpO₂', unit: '%' },
];

type RecordedPoint = { consultationId: string; date: string; timestamp: number; value: number };
// QW-180..182: only reliably documented numeric values and unique dated
// consultations may appear as chronological chart points. Source is untouched.
export type VitalChartPoint = { id: string; date: string; value: number };
export type VitalComparison = {
  key: keyof Vitals;
  label: string;
  unit: string;
  recent: Omit<RecordedPoint, 'timestamp'>;
  previous: Omit<RecordedPoint, 'timestamp'>;
  difference: number;
};

function numericReading(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(',', '.');
  // Do not silently accept values with unrecognized units or partial numbers.
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Clinical chart coordinates are source-only. Reject partial numeric strings
 * (e.g. "70 kg", "120/80"), imported duplicate IDs, and impossible dates.
 * Never infer physiological significance or normalize imported source text.
 */
export function buildRecordedVitalChartPoints(
  consultations: readonly Pick<Consultation, 'id' | 'date' | 'vitals'>[],
  key: keyof Vitals,
): VitalChartPoint[] {
  const ids = new Map<string, number>();
  for (const visit of consultations) {
    if (!visit || typeof visit.id !== 'string' || !visit.id.trim()) continue;
    ids.set(visit.id, (ids.get(visit.id) ?? 0) + 1);
  }
  const points: Array<VitalChartPoint & { timestamp: number }> = [];
  for (const visit of consultations) {
    if (!visit || typeof visit.id !== 'string' || ids.get(visit.id) !== 1) continue;
    const timestamp = recordedDateTimestamp(visit.date);
    if (timestamp === null) continue;
    const value = numericReading(visit.vitals?.[key]);
    if (value === null) continue;
    points.push({ id: visit.id, date: visit.date, value, timestamp });
  }
  points.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  return points.map(({ id, date, value }) => ({ id, date, value }));
}

export function compareRecentVitals(
  consultations: readonly Pick<Consultation, 'id' | 'date' | 'vitals'>[],
): VitalComparison[] {
  // QW-162/163: imported encounters with missing or duplicate identifiers
  // cannot count as two distinct clinical observations.
  const idCounts = new Map<string, number>();
  for (const consultation of consultations) {
    if (!consultation || typeof consultation.id !== 'string' || !consultation.id.trim()) continue;
    idCounts.set(consultation.id, (idCounts.get(consultation.id) ?? 0) + 1);
  }
  return COMPARED_VITALS.flatMap(({ key, label, unit }) => {
    const points: RecordedPoint[] = [];
    for (const consultation of consultations) {
      if (!consultation || typeof consultation.id !== 'string' ||
          idCounts.get(consultation.id) !== 1) continue;
      const date = consultation.date;
      // QW-161: same calendar rules as the longitudinal consultation timeline.
      const timestamp = recordedDateTimestamp(date);
      if (timestamp === null) continue;
      const value = numericReading(consultation.vitals?.[key]);
      if (value === null) continue;
      points.push({ consultationId: consultation.id, date, timestamp, value });
    }
    points.sort((a, b) => b.timestamp - a.timestamp ||
      a.consultationId.localeCompare(b.consultationId));
    if (points.length < 2) return [];
    const [recent, previous] = points;
    return [{
      key, label, unit,
      recent: { consultationId: recent.consultationId, date: recent.date, value: recent.value },
      previous: { consultationId: previous.consultationId, date: previous.date, value: previous.value },
      difference: Number((recent.value - previous.value).toFixed(2)),
    }];
  });
}
