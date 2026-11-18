import { useState } from 'react';
import { matchesProtocol, protocols } from '../clinical/protocolCatalog';
import { getInventoryData } from '../services/storage';
import { hasUniquePrescriptionId } from '../services/prescriptionIdentity';
import { confirmedPatientNameLabel } from '../services/patientSelectionGuard';
import type { Patient, Prescription } from '../types/medical';
import { draftFields, medicationFields, parseAction, toolPages, type DraftField, type JarvisAction, type MedicationDraft } from './actionSchema';

type Props = {
  patient: Patient | null;
  visitId: string;
  prescriptions: Prescription[];
  allowed: boolean;
  onPropose: (action: JarvisAction) => void;
  onEdit: () => void;
};

export default function ToolsPanel({ patient, visitId, prescriptions, allowed, onPropose, onEdit }: Props) {
  const [field, setField] = useState<DraftField>('motif');
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<string>('Patients');
  const [medication, setMedication] = useState<MedicationDraft>({ name: '', dosage: '', route: '', frequency: '', duration: '', instructions: '' });
  const [stockId, setStockId] = useState('');
  const [receiptQuantity, setReceiptQuantity] = useState('');
  const [stock, setStock] = useState<ReturnType<typeof getInventoryData>['items'] | null>(null);
  const patientPrescriptions = patient ? prescriptions.filter(item =>
    item.patientId === patient.id && hasUniquePrescriptionId(item.id, prescriptions)) : [];

  return <section className="jarvis-panel" aria-labelledby="jarvis-tools">
    <h3 id="jarvis-tools">Outils MediFollow</h3>
    {!allowed ? <p>Les outils locaux sont indisponibles avec ce mode d’accès.</p> : <>
      <details><summary>Consulter les données</summary>
        <label htmlFor="jarvis-protocol-query">Rechercher un protocole</label>
        <input id="jarvis-protocol-query" value={query} onChange={event => setQuery(event.target.value)} />
        {query.trim() && <ul>{protocols.filter(item => matchesProtocol(item, query.trim())).map(item =>
          <li key={item.title}><strong>{item.title}</strong> · {item.description}</li>)}
          {!protocols.some(item => matchesProtocol(item, query.trim())) && <li>Aucun protocole trouvé.</li>}
        </ul>}
        <p><strong>Ordonnances du dossier</strong></p>
        {!patient ? <p>Sélectionnez un patient.</p> : <ul>
          {patientPrescriptions.map(item => <li key={item.id}>
            <details><summary>{item.date} · {item.status ?? 'Statut non renseigné'}</summary>
              <pre>{JSON.stringify(item.items?.length ? item.items : item.medications, null, 2)}</pre>
              {typeof item.advice === 'string' && <p>{item.advice}</p>}
            </details>
          </li>)}
          {!patientPrescriptions.length && <li>Aucune ordonnance affichable.</li>}
        </ul>}
        <button type="button" onClick={() => setStock(getInventoryData().items)}>Consulter le stock actuel</button>
        {stock && <ul>{stock.slice(0, 20).map((item, index) =>
          <li key={index}>{item.name} · {item.quantity} {item.unit}{item.batchNumber ? ` · Lot ${item.batchNumber}` : ''}</li>)}
          {!stock.length && <li>Aucun article en stock.</li>}
          {stock.length > 20 && <li>Les 20 premiers articles sont affichés. Ouvrez Inventaire pour voir la liste complète.</li>}
        </ul>}
      </details>
      <details><summary>Ouvrir une page</summary>
        <label htmlFor="jarvis-page">Page à ouvrir</label>
        <select id="jarvis-page" value={page} onChange={event => { onEdit(); setPage(event.target.value); }}>
          {toolPages.map(item => <option key={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => {
          const action = parseAction({ tool: 'open_page', page });
          if (action) onPropose(action);
        }}>Prévisualiser l’ouverture</button>
      </details>
      <details><summary>Préparer un champ de consultation</summary>
        {patient && !visitId ? <div className="jarvis-fields">
          <p>Dossier choisi · {confirmedPatientNameLabel(patient)} ({patient.id})</p>
          <div><label htmlFor="jarvis-draft-field">Champ</label>
            <select id="jarvis-draft-field" value={field} onChange={event => { onEdit(); setField(event.target.value as DraftField); }}>
              {Object.entries(draftFields).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div><label htmlFor="jarvis-draft-value">Texte vérifié à préparer</label>
            <textarea id="jarvis-draft-value" value={value} rows={3} maxLength={2000} onChange={event => { onEdit(); setValue(event.target.value); }} />
          </div>
          <button type="button" disabled={!value.trim()} onClick={() => {
            const action = parseAction({ tool: 'prepare_consultation', field, value });
            if (action) onPropose(action);
          }}>Prévisualiser le champ</button>
        </div> : <p>Choisissez un patient et « Nouvelle consultation / aucune ».</p>}
      </details>
      <details><summary>Préparer une ordonnance</summary>
        {patient ? <div className="jarvis-fields">
          <p>Dossier choisi · {confirmedPatientNameLabel(patient)} ({patient.id})</p>
          {(Object.keys(medicationFields) as Array<keyof MedicationDraft>).map(key => <div key={key}>
            <label htmlFor={`jarvis-med-${key}`}>{medicationFields[key]}</label>
            <input id={`jarvis-med-${key}`} value={medication[key]} maxLength={500}
              onChange={event => { onEdit(); setMedication({ ...medication, [key]: event.target.value }); }} />
          </div>)}
          <button type="button" disabled={!medication.name.trim()} onClick={() => {
            const action = parseAction({ tool: 'prepare_prescription', medication });
            if (action) onPropose(action);
          }}>Prévisualiser la ligne d’ordonnance</button>
        </div> : <p>Sélectionnez un patient.</p>}
      </details>
      <details><summary>Préparer une entrée en stock</summary>
        <button type="button" onClick={() => {
          onEdit(); setStock(getInventoryData().items); setStockId('');
        }}>Charger les lots disponibles</button>
        {stock?.length === 0 && <p>Aucun lot disponible.</p>}
        {Boolean(stock?.length) && <div className="jarvis-fields">
          <div><label htmlFor="jarvis-stock-id">Lot</label>
            <select id="jarvis-stock-id" value={stockId} onChange={event => { onEdit(); setStockId(event.target.value); }}>
              <option value="">Choisir un lot</option>
              {stock?.filter(item => item.id && stock.filter(row => row.id === item.id).length === 1).map(item =>
                <option key={item.id} value={item.id}>{item.name} · {item.batchNumber || item.id} · {item.quantity} {item.unit}</option>)}
            </select>
          </div>
          <div><label htmlFor="jarvis-stock-quantity">Quantité à ajouter</label>
            <input id="jarvis-stock-quantity" type="number" min="0" step="any" value={receiptQuantity}
              onChange={event => { onEdit(); setReceiptQuantity(event.target.value); }} />
          </div>
          <button type="button" disabled={!stockId || !(Number(receiptQuantity) > 0)} onClick={() => {
            const action = parseAction({ tool: 'prepare_receipt', itemId: stockId, quantity: Number(receiptQuantity) });
            if (action) onPropose(action);
          }}>Prévisualiser l’entrée en stock</button>
        </div>}
      </details>
    </>}
  </section>;
}
