
import { useCallback, useEffect, useState } from 'react';
import { consultationClinicalSnapshot, hasRequiredConsultationDetails, hasUniqueConsultationId, isUnusedConsultationId, preservesConsultationAuditTimestamps, preservesConsultationPatientLink } from '../services/consultationIdentity';
import { hasUniquePrescriptionId, isUnusedPrescriptionId, prescriptionHasRecordedStockMovement, preservesPrescriptionPatientId } from '../services/prescriptionIdentity';
import { allowsFinalizedPrescriptionUpdate, allowsPrescriptionStatusTransition, allowsStockLinkedPrescriptionUpdate, hasDocumentedPrescriptionDispense, hasFullyDocumentedPrescriptionReturn, isCreatablePrescriptionStatus, isDeletablePrescriptionStatus, isDispensablePrescriptionStatus, preservesPrescriptionAuditTimestamps } from '../services/prescriptionFinality';
import { hasConfirmedPatientSelection } from '../services/patientSelectionGuard';
import { hasRequiredCompletionVersion, isWritableFollowUpPlan } from '../clinical/followUp';
import { recordedDateTimestamp } from '../clinical/medicalTimeline';

import type {
  Patient,
  Consultation,
  Prescription,
  DoctorSettings,
  MedicalData,
  DeletedPatient,
} from '../types/medical';

import {
  getMedicalData,
  savePatients,
  saveConsultations,
  savePrescriptions,
  saveSettings,
  getDeletedPatients,
  saveDeletedPatients,
  getInventoryData,
  subscribeToMedicalData,
  createId,
} from '../services/storage';

export function useMedicalData() {
  const [data, setData] = useState<MedicalData>(() => getMedicalData());

  const refresh = useCallback(() => {
    setData(getMedicalData());
  }, []);

  useEffect(() => {
    return subscribeToMedicalData(refresh);
  }, [refresh]);

  // PATIENTS

  const addPatient = useCallback((
    patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const timestamp = new Date().toISOString();

    const newPatient: Patient = {
      ...patient,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const saved = savePatients([...getMedicalData().patients, newPatient]);
    return saved ? newPatient : null;
  }, []);

  const updatePatient = useCallback((
    id: string,
    changes: Partial<Patient>
  ) => {
    const currentPatients = getMedicalData().patients;
    if (!hasConfirmedPatientSelection(id, currentPatients)) return false;
    const updated = currentPatients.map((patient) =>
      patient.id === id
        ? {
            ...patient,
            ...changes,
            id: patient.id,
            updatedAt: new Date().toISOString(),
          }
        : patient
    );

    return savePatients(updated);
  }, []);

  const deletePatient = useCallback((id: string) => {
    const current = getMedicalData();
    if (!hasConfirmedPatientSelection(id, current.patients)) return false;

    const hasConsultations = current.consultations.some(
      (item) => item.patientId === id
    );

    const hasPrescriptions = current.prescriptions.some(
      (item) => item.patientId === id
    );

    if (hasConsultations || hasPrescriptions) {
      return false;
    }

    const patient = current.patients.find((item) => item.id === id);
    if (!patient) return false;

    const deletedPatients = getDeletedPatients();
    const deletedRecord: DeletedPatient = {
      patient,
      deletedAt: new Date().toISOString(),
    };

    // Écrire d'abord dans la corbeille pour éviter toute perte en cas d'échec.
    if (!saveDeletedPatients([...deletedPatients, deletedRecord])) return false;
    if (!savePatients(current.patients.filter((item) => item.id !== id))) return false;
    return true;
  }, []);

  const restoreDeletedPatient = useCallback((id: string) => {
    const deletedPatients = getDeletedPatients();
    // A corrupted/imported trash may contain duplicate deleted IDs.
    // Never restore one while removing all copies with the same ID.
    if (!hasConfirmedPatientSelection(id, deletedPatients.map(item => item.patient))) return false;
    const record = deletedPatients.find((item) => item.patient.id === id);
    if (!record) return false;

    const currentPatients = getMedicalData().patients;
    if (currentPatients.some((item) => item.id === id)) return false;
    if (!savePatients([...currentPatients, record.patient])) return false;
    if (!saveDeletedPatients(deletedPatients.filter((item) => item.patient.id !== id))) return false;
    return true;
  }, []);

  // CONSULTATIONS

  const addConsultation = useCallback((
    consultation: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    // The central write path must enforce the same identity rule as the UI.
    const currentData = getMedicalData();
    if (!hasConfirmedPatientSelection(consultation.patientId, currentData.patients)) return null;
    // QW-122: enforce mandatory clinical description at the persistence
    // boundary; older consultations are not modified by this creation guard.
    if (!hasRequiredConsultationDetails(consultation)) return null;
    // QW-120: a direct creation caller must not write an invalid HELIOS plan.
    if (!isWritableFollowUpPlan(consultation.followUp)) return null;
    // QW-124: reject a missing, ambiguous or impossible consultation date
    // before it can enter the patient timeline.
    if (recordedDateTimestamp(consultation.date) === null) return null;

    // QW-121: a generated consultation ID may not collide with an existing
    // clinical encounter, including one restored from an imported backup.
    const newId = createId();
    if (!isUnusedConsultationId(newId, currentData.consultations)) return null;
    const timestamp = new Date().toISOString();
    const newConsultation: Consultation = {
      ...consultation,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const saved = saveConsultations([
      ...currentData.consultations,
      newConsultation,
    ]);

    return saved ? newConsultation : null;
  }, []);

  const updateConsultation = useCallback((
    id: string,
    changes: Partial<Consultation>,
    expectedClinicalSnapshot?: string,
  ) => {
    const currentConsultations = getMedicalData().consultations;
    if (!hasUniqueConsultationId(id, currentConsultations)) return false;
    // QW-118: an existing consultation must remain in its confirmed patient
    // file even when a caller bypasses the consultation form.
    const currentConsultation = currentConsultations.find((item) => item.id === id);
    if (!currentConsultation ||
        !hasConfirmedPatientSelection(currentConsultation.patientId, getMedicalData().patients) ||
        !preservesConsultationPatientLink(currentConsultation, changes)) return false;
    // QW-130: even a caller outside the HELIOS quick-completion button
    // must supply the expected consultation version to mark follow-up done.
    if (!hasRequiredCompletionVersion(changes.followUp, expectedClinicalSnapshot)) return false;
    // QW-127: compare an explicitly supplied source version against the
    // latest record before persistence. Other legacy two-argument updates
    // remain compatible; completed follow-up writes cannot omit the version.
    if (expectedClinicalSnapshot !== undefined &&
        consultationClinicalSnapshot(currentConsultation) !== expectedClinicalSnapshot) return false;
    // QW-119: creation date is immutable, and updatedAt is assigned only by
    // the hook after validating a real clinical change.
    if (!preservesConsultationAuditTimestamps(changes)) return false;
    // QW-120: only the newly supplied plan is checked. Legacy plans remain
    // unchanged when an unrelated part of the consultation is corrected.
    if (!isWritableFollowUpPlan(changes.followUp)) return false;
    // QW-124: only a date explicitly supplied by the caller needs to pass
    // timeline validation; legacy undated visits remain otherwise editable.
    if (Object.prototype.hasOwnProperty.call(changes, 'date') &&
        recordedDateTimestamp(changes.date) === null) return false;
    const updated = currentConsultations.map((item) =>
      item.id === id
        ? {
            ...item,
            ...changes,
            id: item.id,
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    return saveConsultations(updated);
  }, []);

  const deleteConsultation = useCallback((id: string) => {
    const currentConsultations = getMedicalData().consultations;
    if (!hasUniqueConsultationId(id, currentConsultations)) return false;
    const updated = currentConsultations.filter(
      (item) => item.id !== id
    );

    return saveConsultations(updated);
  }, []);

  // ORDONNANCES

  const addPrescription = useCallback((
    prescription: Omit<Prescription, 'id' | 'savedAt'>
  ) => {
    // QW-105: direct hook callers may only create drafts/validated records,
    // never fabricate a dispensed/cancelled prescription or terminal date.
    if (!isCreatablePrescriptionStatus(prescription)) return null;
    // Reject an unlinked or ambiguous patient even for direct hook callers.
    const currentData = getMedicalData();
    if (!hasConfirmedPatientSelection(prescription.patientId, currentData.patients)) return null;

    // QW-113: a generated ID must not identify any current prescription or
    // an orphaned inventory movement from an imported backup.
    const newId = createId();
    if (!isUnusedPrescriptionId(newId, currentData.prescriptions, getInventoryData().movements)) return null;
    const newPrescription: Prescription = {
      ...prescription,
      id: newId,
      savedAt: new Date().toISOString(),
    };

    const saved = savePrescriptions([
      ...currentData.prescriptions,
      newPrescription,
    ]);

    return saved ? newPrescription : null;
  }, []);

  const updatePrescription = useCallback((
    id: string,
    changes: Partial<Prescription>
  ) => {
    const currentPrescriptions = getMedicalData().prescriptions;
    if (!hasUniquePrescriptionId(id, currentPrescriptions)) return false;
    const currentPrescription = currentPrescriptions.find(item => item.id === id);
    if (!currentPrescription || !preservesPrescriptionPatientId(currentPrescription, changes)) return false;
    // QW-107: forbid backwards status changes and unknown-state coercion.
    if (!allowsPrescriptionStatusTransition(currentPrescription, changes)) return false;
    // QW-106: protect creation time and lifecycle timestamps for every caller.
    if (!preservesPrescriptionAuditTimestamps(currentPrescription, changes)) return false;
    // QW-097: enforce finality at the storage boundary, not only in the form.
    if (!allowsFinalizedPrescriptionUpdate(currentPrescription, changes)) return false;
    // QW-114: even a content-only write must fail closed for an imported
    // missing/unknown status. Only draft/validated may be edited normally;
    // dispensed follows the tightly scoped QW-097 cancellation exception.
    if (currentPrescription.status !== 'dispensed' &&
        !isDispensablePrescriptionStatus(currentPrescription.status)) return false;
    // QW-104: stock trace locks prescription content even if the old status
    // remains draft/validated. Only a documented finalisation may proceed.
    if (!allowsStockLinkedPrescriptionUpdate(currentPrescription, changes,
        prescriptionHasRecordedStockMovement(id, getInventoryData().movements))) return false;
    // QW-102: do not allow a status-only claim of dispensing when no matching
    // positive, uniquely identified inventory movement has been recorded.
    if (changes.status === 'dispensed' &&
        !hasDocumentedPrescriptionDispense(id, currentPrescription.patientId, getInventoryData().movements)) {
      return false;
    }
    // QW-103: if the stock was dispensed but an earlier status update failed,
    // refuse to cancel a draft/validated/legacy record as "non dispensed".
    // Requires explicit reconciliation instead of silently losing the return.
    if (changes.status === 'cancelled' &&
        currentPrescription.status !== 'dispensed' &&
        prescriptionHasRecordedStockMovement(id, getInventoryData().movements)) {
      return false;
    }
    // QW-098: status may become cancelled only after every dispense movement
    // has a consistent, complete return trace in the inventory journal.
    if (currentPrescription.status === 'dispensed' &&
        !hasFullyDocumentedPrescriptionReturn(id, currentPrescription.patientId, getInventoryData().movements)) {
      return false;
    }
    const updated = currentPrescriptions.map((item) =>
      item.id === id
        ? {
            ...item,
            ...changes,
            id: item.id,
          }
        : item
    );

    return savePrescriptions(updated);
  }, []);

  const deletePrescription = useCallback((id: string) => {
    const currentPrescriptions = getMedicalData().prescriptions;
    if (!hasUniquePrescriptionId(id, currentPrescriptions)) return false;
    // QW-094 — a direct caller must not delete a cancelled or dispensed
    // document even if the inventory movement log is missing or incomplete.
    const currentPrescription = currentPrescriptions.find((item) => item.id === id);
    if (!currentPrescription || currentPrescription.status === 'cancelled' ||
        currentPrescription.status === 'dispensed') return false;
    // QW-099: an explicit unknown/null imported status cannot be deleted.
    if (!isDeletablePrescriptionStatus(currentPrescription.status)) return false;
    if (prescriptionHasRecordedStockMovement(id, getInventoryData().movements)) return false;
    const updated = currentPrescriptions.filter(
      (item) => item.id !== id
    );

    return savePrescriptions(updated);
  }, []);

  // PARAMÈTRES

  const updateSettings = useCallback((
    changes: Partial<DoctorSettings>
  ) => {
    const updated: DoctorSettings = {
      ...getMedicalData().settings,
      ...changes,
    };

    return saveSettings(updated);
  }, []);

  return {
    data,
    patients: data.patients,
    consultations: data.consultations,
    prescriptions: data.prescriptions,
    settings: data.settings,
    refresh,
    addPatient,
    updatePatient,
    deletePatient,
    restoreDeletedPatient,
    deletedPatients: data.deletedPatients ?? [],
    addConsultation,
    updateConsultation,
    deleteConsultation,
    addPrescription,
    updatePrescription,
    deletePrescription,
    updateSettings,
  };
}

