import React from 'react';
import { selectUniquePatient } from '../services/uniquePatientSelection';
import { confirmedPatientNameLabel } from '../services/patientSelectionGuard';

type ContextLink = { label: string; target: string };

export default function PatientContextBar({ patients, patientId, links, onClose }: {
  patients: readonly { id: string; name?: unknown }[];
  patientId: string | null;
  links: readonly ContextLink[];
  onClose?: () => void;
}): React.JSX.Element {
  // Display-only projection of the existing selection. No independent patient
  // state, fallback to first record, data transfer, or persistence is introduced.
  const patient = selectUniquePatient(patients, patientId);
  return (
    <section className="n3-patient-context" aria-label="Contexte patient">
      <div className="n3-context-identity" role="status" aria-live="polite" aria-atomic="true">
        <small>Dossier courant</small>
        <strong>{patient ? confirmedPatientNameLabel(patient)
          : patientId ? 'Dossier à vérifier — identité non confirmée' : 'Aucun dossier sélectionné'}</strong>
      </div>
      {patient && (
        <nav aria-label="Rubriques du dossier">
          {links.map(link => <a key={link.target} href={`#${link.target}`}>{link.label}</a>)}
        </nav>
      )}
      {onClose && patientId && <button type="button" onClick={onClose}>Fermer le dossier</button>}
    </section>
  );
}
