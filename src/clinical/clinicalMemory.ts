import type { Consultation, Patient } from '../types/medical';
import { recordedDateTimestamp } from './medicalTimeline';

// HELIOS Clinical Memory — an on-device, read-only view of fields documented
// by a clinician. No clinical inference, AI requests, writes or prescriptions.
type ClinicalMemoryPatient = Pick<Patient, 'id' | 'clinicalHistory' | 'currentMedications'>;
type ClinicalMemoryVisit = Pick<Consultation, 'id' | 'patientId' | 'date' | 'diagnosis'>;

export type DocumentedDiagnosis = { consultationId: string; date: string; label: string };
export type ClinicalMemoryPreview = {
  allergies: string[];
  declaredTreatments: string[];
  documentedDiagnoses: DocumentedDiagnosis[];
  documentedHistory: {
    medical: string[];
    surgical: string[];
    family: string[];
  };
};

// Source-only formatting: unverified free-text dates are labelled as declared
// rather than silently interpreted as verified chronology or medical facts.
function describedHistoryEntries(value: unknown): string[] {
  const entries: unknown[] = Array.isArray(value) ? value : [];
  return entries.flatMap(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.label !== 'string' || !item.label.trim()) return [];
    const label = item.label.trim();
    const date = typeof item.date === 'string' ? item.date.trim() : '';
    const details = typeof item.details === 'string' ? item.details.trim() : '';
    return [[
      label,
      date ? 'Date déclarée : ' + date : '',
      details ? 'Précision : ' + details : '',
    ].filter(Boolean).join(' · ')];
  });
}

export function buildClinicalMemory(
  patient: ClinicalMemoryPatient,
  consultations: readonly ClinicalMemoryVisit[],
): ClinicalMemoryPreview {
  // QW-156: imported/missing IDs must not make unrelated records share a memory.
  if (typeof patient.id !== 'string' || !patient.id.trim()) {
    return { allergies: [], declaredTreatments: [], documentedDiagnoses: [],
      documentedHistory: { medical: [], surgical: [], family: [] } };
  }
  const rawAllergies = patient.clinicalHistory?.allergies;
  const allergies = (Array.isArray(rawAllergies) ? rawAllergies : [])
    .filter(item => item && typeof item.label === 'string' && item.label.trim())
    .map(item => {
      const label = item.label.trim();
      const detail = typeof item.details === 'string' ? item.details.trim() : '';
      return detail ? label + ' — ' + detail : label;
    });

  const rawMedications = patient.currentMedications;
  const declaredTreatments = (Array.isArray(rawMedications) ? rawMedications : [])
    .filter(item => item && typeof item.name === 'string' && item.name.trim())
    .map(item => {
      const name = item.name.trim();
      const dose = typeof item.dosage === 'string' ? item.dosage.trim() : '';
      return dose ? name + ' — ' + dose : name;
    });

  // QW-157/158: accept only attributable clinical records and valid timeline
  // dates. An invalid date is unknown, never silently normalized by Date.parse.
  const idCounts = new Map<string, number>();
  for (const visit of consultations) {
    if (visit && typeof visit.id === 'string' && visit.id.trim()) {
      idCounts.set(visit.id, (idCounts.get(visit.id) ?? 0) + 1);
    }
  }
  const documentedDiagnoses = consultations
    .filter(visit => visit && visit.patientId === patient.id &&
      typeof visit.id === 'string' && idCounts.get(visit.id) === 1 &&
      typeof visit.diagnosis === 'string' && visit.diagnosis.trim().length > 0)
    .map(visit => ({
      consultationId: visit.id,
      date: recordedDateTimestamp(visit.date) !== null ? visit.date : 'Date non renseignée',
      label: visit.diagnosis.trim(),
    }))
    .sort((a, b) => {
      const aTime = recordedDateTimestamp(a.date);
      const bTime = recordedDateTimestamp(b.date);
      // Unknown dates follow verified dates; the ID makes ties deterministic.
      const byDate = aTime === null ? (bTime === null ? 0 : 1)
        : bTime === null ? -1 : bTime - aTime;
      return byDate || a.consultationId.localeCompare(b.consultationId);
    })
    .slice(0, 3);

  const documentedHistory = {
    medical: describedHistoryEntries(patient.clinicalHistory?.medical),
    surgical: describedHistoryEntries(patient.clinicalHistory?.surgical),
    family: describedHistoryEntries(patient.clinicalHistory?.family),
  };

  return { allergies, declaredTreatments, documentedDiagnoses, documentedHistory };
}
