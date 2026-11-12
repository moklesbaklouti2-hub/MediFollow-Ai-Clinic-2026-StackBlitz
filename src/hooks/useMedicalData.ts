
import { useCallback, useEffect, useState } from 'react';
import { hasUniqueConsultationId } from '../services/consultationIdentity';
import { hasUniquePrescriptionId } from '../services/prescriptionIdentity';

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
    const updated = getMedicalData().patients.map((patient) =>
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
    const timestamp = new Date().toISOString();

    const newConsultation: Consultation = {
      ...consultation,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const saved = saveConsultations([
      ...getMedicalData().consultations,
      newConsultation,
    ]);

    return saved ? newConsultation : null;
  }, []);

  const updateConsultation = useCallback((
    id: string,
    changes: Partial<Consultation>
  ) => {
    const currentConsultations = getMedicalData().consultations;
    if (!hasUniqueConsultationId(id, currentConsultations)) return false;
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
    const newPrescription: Prescription = {
      ...prescription,
      id: createId(),
      savedAt: new Date().toISOString(),
    };

    const saved = savePrescriptions([
      ...getMedicalData().prescriptions,
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
    const updated = getMedicalData().prescriptions.filter(
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

