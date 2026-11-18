import { consultationClinicalSnapshot, hasUniqueConsultationId } from '../services/consultationIdentity';
import { selectUniquePatient } from '../services/uniquePatientSelection';
import type { Consultation, Patient } from '../types/medical';

export function patientSnapshot(patient: Patient | null) {
  if (!patient) return null;
  const { createdAt: _created, updatedAt: _updated, ...record } = patient;
  return JSON.stringify(record);
}

export function resolveContext(
  patients: readonly Patient[], consultations: readonly Consultation[],
  patientId: string, consultationId: string,
) {
  const patient = selectUniquePatient(patients, patientId);
  const visit = patient && hasUniqueConsultationId(consultationId, consultations)
    ? consultations.find(item => item.id === consultationId && item.patientId === patient.id)
    : undefined;
  const valid = (!patientId || Boolean(patient)) && (!consultationId || Boolean(visit));
  const payload = {
    patient: patient ? {
      age: patient.age, sex: patient.sex, clinicalHistory: patient.clinicalHistory,
      currentMedications: patient.currentMedications,
    } : undefined,
    consultation: visit ? {
      date: visit.date, specialty: visit.specialty, motif: visit.motif, symptoms: visit.symptoms,
      history: visit.history, targetedInterview: visit.targetedInterview, vitals: visit.vitals,
      physicalExamination: visit.physicalExamination, examination: visit.examination,
      diagnosis: visit.diagnosis, plan: visit.plan, followUp: visit.followUp,
    } : undefined,
  };
  return { patient, visit, valid, payload, version: JSON.stringify([patientSnapshot(patient), consultationClinicalSnapshot(visit)]) };
}
