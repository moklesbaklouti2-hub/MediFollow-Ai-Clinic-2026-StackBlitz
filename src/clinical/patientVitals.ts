import type { Consultation, Vitals } from '../types/medical';

export type LatestVitalReading = { value: string; date: string };

const VITAL_KEYS: ReadonlyArray<keyof Vitals> = [
  'systolic', 'diastolic', 'heartRate', 'spo2', 'temperature',
  'respiratoryRate', 'weight', 'height', 'glycemia',
];

// Consultations are supplied newest-first. A reading retains its own source
// date; no two different visits are represented as one set of measurements.
// No unit conversion, interpretation, or automatic medical decision.
export function latestVitalReadings(
  consultations: readonly Pick<Consultation, 'date' | 'vitals'>[],
): Partial<Record<keyof Vitals, LatestVitalReading>> {
  const readings: Partial<Record<keyof Vitals, LatestVitalReading>> = {};
  for (const consultation of consultations) {
    for (const key of VITAL_KEYS) {
      if (readings[key]) continue;
      const raw = consultation.vitals?.[key];
      if (typeof raw !== 'string' || !raw.trim()) continue;
      readings[key] = {
        value: raw.trim(),
        date: typeof consultation.date === 'string' && consultation.date.trim()
          ? consultation.date : 'Date non renseignée',
      };
    }
  }
  return readings;
}
