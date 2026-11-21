import type { Consultation, Vitals } from '../types/medical';

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

export function compareRecentVitals(
  consultations: readonly Pick<Consultation, 'id' | 'date' | 'vitals'>[],
): VitalComparison[] {
  return COMPARED_VITALS.flatMap(({ key, label, unit }) => {
    const points: RecordedPoint[] = [];
    for (const consultation of consultations) {
      const date = consultation.date;
      const timestamp = typeof date === 'string' ? Date.parse(date) : NaN;
      if (!Number.isFinite(timestamp)) continue;
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
