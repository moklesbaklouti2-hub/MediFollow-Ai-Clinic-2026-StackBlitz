
import { useCallback, useEffect, useState } from 'react';

import type {
  Patient,
  Consultation,
  Prescription,
  DoctorSettings,
  MedicalData,
} from '../types/medical';

import {
  getMedicalData,
  savePatients,
  saveConsultations,
  savePrescriptions,
  saveSettings,
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

    savePatients([...getMedicalData().patients, newPatient]);
    return newPatient;
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

    savePatients(updated);
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

    savePatients(current.patients.filter((patient) => patient.id !== id));
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

    saveConsultations([
      ...getMedicalData().consultations,
      newConsultation,
    ]);

    return newConsultation;
  }, []);

  const updateConsultation = useCallback((
    id: string,
    changes: Partial<Consultation>
  ) => {
    const updated = getMedicalData().consultations.map((item) =>
      item.id === id
        ? {
            ...item,
            ...changes,
            id: item.id,
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    saveConsultations(updated);
  }, []);

  const deleteConsultation = useCallback((id: string) => {
    const updated = getMedicalData().consultations.filter(
      (item) => item.id !== id
    );

    saveConsultations(updated);
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

    savePrescriptions([
      ...getMedicalData().prescriptions,
      newPrescription,
    ]);

    return newPrescription;
  }, []);

  const updatePrescription = useCallback((
    id: string,
    changes: Partial<Prescription>
  ) => {
    const updated = getMedicalData().prescriptions.map((item) =>
      item.id === id
        ? {
            ...item,
            ...changes,
            id: item.id,
          }
        : item
    );

    savePrescriptions(updated);
  }, []);

  const deletePrescription = useCallback((id: string) => {
    const updated = getMedicalData().prescriptions.filter(
      (item) => item.id !== id
    );

    savePrescriptions(updated);
  }, []);

  // PARAMÈTRES

  const updateSettings = useCallback((
    changes: Partial<DoctorSettings>
  ) => {
    const updated: DoctorSettings = {
      ...getMedicalData().settings,
      ...changes,
    };

    saveSettings(updated);
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
    addConsultation,
    updateConsultation,
    deleteConsultation,
    addPrescription,
    updatePrescription,
    deletePrescription,
    updateSettings,
  };
}

