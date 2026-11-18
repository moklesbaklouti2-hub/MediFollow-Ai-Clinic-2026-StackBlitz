import { useState } from 'react';
import { hasUniqueConsultationId, consultationMotifLabel } from '../services/consultationIdentity';
import { selectUniquePatient } from '../services/uniquePatientSelection';
import { confirmedPatientNameLabel } from '../services/patientSelectionGuard';
import type { Patient, Consultation } from '../types/medical';
import type { resolveContext } from './context';

type Props = {
  patients: Patient[];
  consultations: Consultation[];
  patientId: string;
  visitId: string;
  context: ReturnType<typeof resolveContext>;
  documents: string[];
  onPatient: (id: string) => void;
  onVisit: (id: string) => void;
};

export default function ContextPanel({ patients, consultations, patientId, visitId, context, documents, onPatient, onVisit }: Props) {
  const [query, setQuery] = useState('');
  const available = patients.filter(item => selectUniquePatient(patients, item.id));
  const matching = available.filter(item => item.id === patientId ||
    confirmedPatientNameLabel(item).toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')));
  const visits = consultations.filter(item => item.patientId === patientId &&
    hasUniqueConsultationId(item.id, consultations));

  return <section className="jarvis-panel" aria-labelledby="jarvis-context">
    <h3 id="jarvis-context">Contexte clinique</h3>
    <div className="jarvis-fields">
      <div><label htmlFor="jarvis-patient-search">Rechercher un patient</label>
        <input id="jarvis-patient-search" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      </div>
      <div><label htmlFor="jarvis-patient">Dossier patient</label>
        <select id="jarvis-patient" value={context.patient ? patientId : ''} onChange={event => onPatient(event.target.value)}>
          <option value="">Aucun patient</option>
          {matching.map(item => <option key={item.id} value={item.id}>{confirmedPatientNameLabel(item)} · {item.id}</option>)}
        </select>
        {patientId && !context.patient && <button type="button" onClick={() => onPatient('')}>Effacer la sélection invalide</button>}
      </div>
      <div><label htmlFor="jarvis-visit">Consultation de référence</label>
        <select id="jarvis-visit" value={visitId} disabled={!context.patient} onChange={event => onVisit(event.target.value)}>
          <option value="">Nouvelle consultation / aucune</option>
          {visitId && !context.visit && <option value={visitId}>Consultation à resélectionner</option>}
          {visits.map(item => <option key={item.id} value={item.id}>{item.date} · {consultationMotifLabel(item.motif)}</option>)}
        </select>
      </div>
      {!context.valid && <p role="alert" className="jarvis-error">Le dossier ou la consultation a changé. Revérifiez la sélection.</p>}
      <details><summary>Éléments transmis au fournisseur IA</summary>
        <p>Message saisi et jusqu’aux 12 derniers messages de cette session.</p>
        {context.patient ? <pre>{JSON.stringify(context.payload, null, 2)}</pre> : <p>Aucun dossier patient associé.</p>}
        <p>{documents.length ? `Texte joint · ${documents.join(', ')}` : 'Aucun document joint.'}</p>
      </details>
    </div>
  </section>;
}
