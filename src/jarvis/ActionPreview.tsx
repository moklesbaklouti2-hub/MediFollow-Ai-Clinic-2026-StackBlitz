import { draftFields, medicationFields, type MedicationDraft } from './actionSchema';
import type { PendingAction } from './tools';

export default function ActionPreview({ pending, patient, busy, onConfirm, onCancel }: {
  pending: PendingAction;
  patient: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { action, stock } = pending;
  return <section className="jarvis-panel" aria-labelledby="jarvis-action-preview">
    <h3 id="jarvis-action-preview">Action à confirmer</h3>
    {action.tool === 'open_page' && <>
      <p>Actuel · JARVIS</p>
      <p>Proposé · Ouvrir {action.page}</p>
    </>}
    {action.tool === 'prepare_consultation' && <>
      <p>Dossier · {patient}</p>
      <p>Actuel · Champ vide dans une nouvelle consultation</p>
      <p>Proposé · {draftFields[action.field]}</p>
      <pre>{action.value}</pre>
      <p>Le formulaire s’ouvrira pour vérification. L’enregistrement se fait dans Consultations.</p>
    </>}
    {action.tool === 'prepare_prescription' && <>
      <p>Dossier · {patient}</p>
      <p>Actuel · Formulaire de nouvelle ordonnance vide</p>
      <p>Proposé · Ligne à vérifier dans le formulaire</p>
      <ul>{(Object.keys(medicationFields) as Array<keyof MedicationDraft>).map(field =>
        <li key={field}><strong>{medicationFields[field]}</strong> · {action.medication[field] || 'À renseigner'}</li>)}</ul>
    </>}
    {action.tool === 'prepare_receipt' && stock && <>
      <p>Article · {stock.name} · Lot {stock.batchNumber || stock.id}</p>
      <p>Actuel · {stock.quantity} {stock.unit}</p>
      <p>Proposé · {stock.quantity + action.quantity} {stock.unit} (+{action.quantity})</p>
      <p>Confirmez la réception physique dans Inventaire pour enregistrer le mouvement.</p>
    </>}
    <div className="jarvis-row">
      <button type="button" className="jarvis-primary" disabled={busy} onClick={onConfirm}>{busy ? 'Vérification de l’accès…' : 'Confirmer cette action'}</button>
      <button type="button" onClick={onCancel}>Refuser</button>
    </div>
  </section>;
}
