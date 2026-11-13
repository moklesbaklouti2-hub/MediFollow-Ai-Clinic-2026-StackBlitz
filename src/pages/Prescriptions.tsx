import { useEffect, useState } from 'react';
import { useMedicalData } from '../hooks/useMedicalData';
import { hasConfirmedPatientSelection } from '../services/patientSelectionGuard';
import { isDispensablePrescriptionStatus } from '../services/prescriptionFinality';
import { prescriptionHasRecordedStockMovement } from '../services/prescriptionIdentity';
import { documentedPrescriptionStatus } from '../clinical/prescriptionTimeline';
import type { InventoryData, Medication } from '../types/medical';
import { cancelDispensedPrescriptionStock, dispenseInventoryItems, getInventoryData, getMedicalData, returnDispensedStock, subscribeToMedicalData } from '../services/storage';

const emptyMedication: Medication = {
  id: '',
  name: '',
  dosage: '',
  route: 'Voie orale',
  frequency: '',
  duration: '',
  instructions: '',
};

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const currentDate = new Date();
  const today = [
    currentDate.getFullYear(),
    String(currentDate.getMonth() + 1).padStart(2, '0'),
    String(currentDate.getDate()).padStart(2, '0'),
  ].join('-');
  return expiryDate < today;
}

export default function Prescriptions() {
  const { patients, prescriptions, addPrescription, updatePrescription, deletePrescription } = useMedicalData();
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [medications, setMedications] = useState<Medication[]>([]);
  const [advice, setAdvice] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [medication, setMedication] =
    useState<Medication>({ ...emptyMedication });
  const [inventory, setInventory] = useState<InventoryData>(() => getInventoryData());

  useEffect(() => subscribeToMedicalData(() => setInventory(getInventoryData())), []);
  // Présenter d'abord les lots encore valides, par date de péremption croissante (FEFO).
  const dispensableInventoryItems = inventory.items
    .filter((item) => item.category !== 'equipment')
    .sort((a, b) => {
      const aExpired = isExpired(a.expiryDate);
      const bExpired = isExpired(b.expiryDate);
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });

  function updateMedication(field: 'name' | 'dosage' | 'route' | 'frequency' | 'duration' | 'instructions' | 'inventoryItemId', value: string) {
    setMedication((previous) => ({ ...previous, [field]: value }));
  }

  function addMedication() {
    if (!medication.name.trim() || !medication.dosage.trim()) {
      alert('Veuillez saisir le nom et le dosage du médicament.');
      return;
    }

    setMedications((previous) => [
      ...previous,
      { ...medication, id: crypto.randomUUID() },
    ]);

    setMedication({ ...emptyMedication });
    setShowPreview(false);
    setSavedMessage('');
  }

  function removeMedication(id: string) {
    setMedications((previous) =>
      previous.filter((item) => item.id !== id)
    );
    setShowPreview(false);
    setSavedMessage('');
  }

  function validatePrescription() {
    if (!hasConfirmedPatientSelection(patientId, patients)) {
      alert('Veuillez sélectionner un patient enregistré et non ambigu.');
      return false;
    }

    if (medications.length === 0) {
      alert('Veuillez ajouter au moins un médicament.');
      return false;
    }

    return true;
  }

  function previewPrescription() {
    if (!validatePrescription()) return;
    setShowPreview(true);
    setSavedMessage('');
  }

  function savePrescription() {
    if (!validatePrescription()) return;
    // QW-096 — a stale editor must never rewrite a cancelled or dispensed
    // prescription, even when an older UI snapshot still enables Save.
    if (editingId) {
      const currentData = getMedicalData();
      const matches = currentData.prescriptions.filter((row) => row.id === editingId);
      const current = matches.length === 1 ? matches[0] : undefined;
      if (!current || current.patientId !== patientId ||
          !hasConfirmedPatientSelection(patientId, currentData.patients) ||
          current.status === 'cancelled' || current.status === 'dispensed') {
        setSavedMessage('Modification refusée : ordonnance absente, annulée, délivrée ou dossier patient ambigu. Aucun document modifié.');
        return;
      }
    }

    const prescriptionData = {
      patientId,
      date,
      medications: medications.map((item) => ({ ...item })),
      advice,
    };

    const saved = editingId
      ? updatePrescription(editingId, prescriptionData)
      : addPrescription({ ...prescriptionData, status: 'draft' });

    if (!saved) {
      setSavedMessage('Échec de sauvegarde : le navigateur n’a pas confirmé l’enregistrement. Vérifiez le stockage puis réessayez.');
      return;
    }

    if (!editingId && typeof saved === 'object' && saved !== null) {
      setEditingId(saved.id);
    }

    setSavedMessage(editingId
      ? 'Modifications de l’ordonnance enregistrées.'
      : 'Ordonnance enregistrée et reliée au dossier du patient.');
  }

  function updateDispensedQuantity(medicationId: string, rawValue: string) {
    const parsed = rawValue.trim() === '' ? undefined : Number(rawValue);
    setMedications((previous) => previous.map((item) =>
      item.id === medicationId
        ? { ...item, dispensedQuantity: parsed }
        : item
    ));
    setSavedMessage('Quantité réelle modifiée : enregistrez les modifications avant la délivrance.');
  }

  function dispenseSavedPrescription() {
    if (!editingId) return;
    const latestData = getMedicalData();
    const matchingPrescriptions = latestData.prescriptions.filter((item) => item.id === editingId);
    const savedPrescription = matchingPrescriptions.length === 1 ? matchingPrescriptions[0] : undefined;
    if (!savedPrescription) {
      setSavedMessage('Ordonnance introuvable ou identifiant dupliqué : aucune délivrance possible.');
      return;
    }
    if (savedPrescription.patientId !== patientId ||
        !hasConfirmedPatientSelection(patientId, latestData.patients)) {
      setSavedMessage('Dossier patient différent ou ambigu : aucune délivrance ni déduction de stock.');
      return;
    }
    if (savedPrescription.status === 'dispensed') {
      setSavedMessage('Cette ordonnance a déjà été délivrée. Aucune nouvelle déduction ne sera effectuée.');
      return;
    }
    // QW-095 — an annulled order must never be dispensed, even if an old
    // editing tab still offers the action.
    if (savedPrescription.status === 'cancelled') {
      setSavedMessage('Délivrance refusée : cette ordonnance est annulée. Aucun stock déduit.');
      return;
    }
    // QW-100 — a missing or unknown imported status cannot authorize a
    // stock withdrawal, even when the user opens an old editing session.
    if (!isDispensablePrescriptionStatus(savedPrescription.status)) {
      setSavedMessage('Délivrance refusée : statut de l’ordonnance absent ou non reconnu. Vérification nécessaire ; aucun stock déduit.');
      return;
    }
    // QW-110: a prior dispense may already have changed inventory even if
    // its final prescription status write failed. Refuse before trying to
    // save quantities again; reconcile the documentary state first.
    if (prescriptionHasRecordedStockMovement(savedPrescription.id, getInventoryData().movements)) {
      setSavedMessage('Délivrance suspendue : des mouvements de stock existent déjà pour cette ordonnance encore non délivrée. Vérifiez le journal et réconciliez le statut avant toute nouvelle action.');
      return;
    }

    const linkedMedications = medications.filter((item) => item.inventoryItemId);
    if (linkedMedications.length === 0) {
      setSavedMessage('Associez au moins un médicament à un article de stock avant la délivrance.');
      return;
    }
    if (linkedMedications.some((item) => !Number.isFinite(item.dispensedQuantity) || (item.dispensedQuantity ?? 0) <= 0)) {
      setSavedMessage('Saisissez la quantité réellement délivrée pour chaque médicament associé au stock.');
      return;
    }

    // Sauvegarder les quantités réelles saisies avant toute déduction.
    const latestPrescriptionSaved = updatePrescription(savedPrescription.id, {
      patientId,
      date,
      medications: medications.map((item) => ({ ...item })),
      advice,
    });
    if (!latestPrescriptionSaved) {
      setSavedMessage('Impossible de sauvegarder les quantités réellement délivrées. Aucun stock n’a été déduit.');
      return;
    }

    const result = dispenseInventoryItems({
      prescriptionId: savedPrescription.id,
      patientId,
      items: linkedMedications.map((item) => ({
        inventoryItemId: item.inventoryItemId!,
        quantity: item.dispensedQuantity!,
      })),
    });

    if (!result.success) {
      setSavedMessage(result.error || 'La délivrance n’a pas été enregistrée.');
      return;
    }

    const statusSaved = updatePrescription(savedPrescription.id, {
      status: 'dispensed',
      dispensedAt: new Date().toISOString(),
    });
    setSavedMessage(statusSaved
      ? 'Délivrance enregistrée : le stock a été déduit et le mouvement tracé.'
      : 'Stock déduit et mouvement enregistré, mais le statut de l’ordonnance n’a pas été actualisé. Ne relancez pas la délivrance.');
  }

  function handlePartialReturn(prescriptionId: string, expectedPatientId: string, movementId: string, itemName: string, remaining: number) {
    const raw = window.prompt(`Quantité réellement retournée pour ${itemName} (maximum : ${remaining}) :`);
    if (raw === null) return;
    const quantity = Number(raw.replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert('Saisissez une quantité valide.');
      return;
    }
    if (!window.confirm('Confirmez-vous que cette quantité a été physiquement récupérée, est intacte et peut être réintégrée au stock ?')) return;

    // QW-092 — re-read ownership *after* confirmation, just before changing
    // stock. Never trust a stale history card or an imported duplicate ID.
    const latestData = getMedicalData();
    const matchingPrescriptions = latestData.prescriptions.filter((row) => row.id === prescriptionId);
    const currentPrescription = matchingPrescriptions.length === 1 ? matchingPrescriptions[0] : undefined;
    const inventoryBeforeReturn = getInventoryData();
    const matchingMovements = inventoryBeforeReturn.movements.filter((row) => row.id === movementId);
    const currentMovement = matchingMovements.length === 1 ? matchingMovements[0] : undefined;
    if (!currentPrescription || currentPrescription.patientId !== expectedPatientId ||
        currentPrescription.status !== 'dispensed' ||
        !hasConfirmedPatientSelection(currentPrescription.patientId, latestData.patients) ||
        !currentMovement || currentMovement.type !== 'dispense' ||
        currentMovement.prescriptionId !== currentPrescription.id ||
        currentMovement.patientId !== currentPrescription.patientId) {
      setSavedMessage('Retour refusé : ordonnance, dossier ou mouvement ambigu ou modifié. Aucun stock réintégré.');
      return;
    }

    const result = returnDispensedStock({
      dispenseMovementId: movementId,
      quantity,
      reason: 'Retour partiel contrôlé — produit récupéré et réintégrable',
    });
    if (!result.success) {
      alert(result.error || 'Retour non enregistré.');
      return;
    }
    setInventory(getInventoryData());
    setSavedMessage('Retour partiel enregistré dans le lot d’origine.');
  }

  function cancelPrescription(item: (typeof prescriptions)[number]) {
    const currentData = getMedicalData();
    const matchingPrescriptions = currentData.prescriptions.filter(row => row.id === item.id);
    const current = matchingPrescriptions.length === 1 ? matchingPrescriptions[0] : undefined;
    if (!current || current.patientId !== item.patientId ||
        !hasConfirmedPatientSelection(current.patientId, currentData.patients)) {
      setSavedMessage('Annulation refusée : ordonnance ambiguë, modifiée ou dossier patient non confirmé. Aucun stock modifié.');
      return;
    }
    if (current.status === 'cancelled') return;
    // QW-111: unrecognized imported states must not reach an ordinary
    // cancellation confirmation. Keep the record for manual reconciliation.
    if (current.status !== 'dispensed' &&
        !isDispensablePrescriptionStatus(current.status)) {
      setSavedMessage('Annulation refusée : statut de l’ordonnance absent ou non reconnu. Vérifiez le dossier avant toute action ; aucun stock modifié.');
      return;
    }
    // QW-103: an unfinalized-looking order may still have actual stock
    // movements (for example after a failed post-dispense status update).
    // Do not claim there is no stock to return in this inconsistent state.
    if (current.status !== 'dispensed' &&
        prescriptionHasRecordedStockMovement(current.id, getInventoryData().movements)) {
      setSavedMessage('Annulation refusée : un mouvement de stock existe malgré le statut non délivré. Vérifiez et réconciliez le dossier avant toute action.');
      return;
    }
    if (current.status === 'dispensed') {
      if (!window.confirm('Confirmez-vous l’annulation de cette délivrance ET la récupération physique de tous les produits restants, intacts et réintégrables ? Le reliquat de chaque lot d’origine sera réintégré.')) return;
      const stockResult = cancelDispensedPrescriptionStock({ prescriptionId: current.id });
      if (!stockResult.success) {
        alert(stockResult.error || 'Impossible de réintégrer le stock.');
        return;
      }
      setInventory(getInventoryData());
    } else if (!window.confirm('Annuler cette ordonnance non délivrée ? Aucun mouvement de stock ne sera effectué.')) {
      return;
    }

    const saved = updatePrescription(current.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    });
    setSavedMessage(saved
      ? 'Ordonnance annulée. La traçabilité des mouvements est conservée.'
      : 'Le stock a été traité, mais le statut n’a pas été actualisé. Actualisez la page avant toute nouvelle action.');
  }

  function openPrescription(item: (typeof prescriptions)[number]) {
    // QW-093 — re-open the single, current document rather than trusting a
    // potentially stale or duplicated history-card entry after JSON import.
    const latestData = getMedicalData();
    const matches = latestData.prescriptions.filter((row) => row.id === item.id);
    const current = matches.length === 1 ? matches[0] : undefined;
    if (!current || current.patientId !== item.patientId ||
        !hasConfirmedPatientSelection(current.patientId, latestData.patients) ||
        !Array.isArray(current.medications)) {
      window.alert('Ouverture refusée : ordonnance absente, ambiguë ou dossier patient non confirmé. Aucun formulaire modifié.');
      return;
    }
    setPatientId(current.patientId);
    setDate(current.date);
    setMedications(current.medications.map((med) => ({ ...med })));
    setAdvice(current.advice);
    setEditingId(current.id);
    setShowPreview(true);
    setSavedMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function confirmDeletePrescription(id: string) {
    const target = prescriptions.find((item) => item.id === id);
    if (target?.status === 'dispensed' || target?.status === 'cancelled') {
      alert('Suppression bloquée : une ordonnance délivrée ou annulée doit rester conservée pour assurer la traçabilité.');
      return;
    }
    if (!window.confirm('Supprimer définitivement cette ordonnance ?')) return;
    if (!deletePrescription(id)) {
      window.alert('Suppression non effectuée : identifiant ambigu, historique de stock lié ou erreur d’enregistrement. Aucune suppression confirmée.');
    }
  }

  function resetForm() {
    setPatientId('');
    setDate(new Date().toISOString().slice(0, 10));
    setMedications([]);
    setAdvice('');
    setMedication({ ...emptyMedication });
    setEditingId(null);
    setShowPreview(false);
    setSavedMessage('');
  }

  function printPrescription() {
    window.print();
  }

  return (
    <section className="prescription-page">
      <style>{`
        .prescription-page { display:grid; gap:22px; color:var(--text-primary,#20334b); }
        .prescription-header h2 { margin:0 0 6px; font-size:25px; }
        .prescription-header p { margin:0; color:#81909c; }
        .prescription-section { display:grid; gap:15px; padding:20px; border:1px solid var(--border,#e5ebef); border-radius:16px; background:var(--surface,#fff); }
        .prescription-section h3 { margin:0; font-size:17px; }
        .prescription-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .prescription-field { display:grid; gap:7px; min-width:0; }
        .prescription-field label { font-size:13px; font-weight:600; color:#718096; }
        .prescription-field input,.prescription-field select,.prescription-field textarea { width:100%; box-sizing:border-box; padding:12px; border:1px solid var(--border,#dce4e8); border-radius:10px; background:var(--surface,#fff); color:inherit; font:inherit; }
        .prescription-field textarea { min-height:80px; resize:vertical; }
        .prescription-add,.prescription-primary { border:0; border-radius:10px; padding:14px 18px; background:#42d5b4; color:#12332f; font-weight:700; cursor:pointer; }
        .prescription-add { background:#172b36; color:white; }
        .prescription-list { display:grid; gap:10px; }
        .prescription-item { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px; border:1px solid var(--border,#e5ebef); border-radius:12px; }
        .prescription-item strong { display:block; margin-bottom:5px; }
        .prescription-item p { margin:3px 0; color:#81909c; font-size:12px; }
        .prescription-remove { border:0; background:#fff0f0; color:#c44b4b; border-radius:8px; padding:9px 11px; cursor:pointer; }
        .prescription-actions { display:flex; flex-wrap:wrap; gap:10px; }
        .prescription-secondary { border:1px solid var(--border,#dce4e8); background:var(--surface,#fff); color:inherit; border-radius:10px; padding:14px 19px; font-weight:700; cursor:pointer; }
        .prescription-empty { color:#81909c; font-size:13px; }
        .prescription-preview { display:grid; gap:15px; background:#fff; color:#243746; border:2px solid #42b99d; border-radius:14px; padding:24px; scroll-margin-top:20px; }
        .prescription-preview h3 { margin:0; font-size:23px; text-align:center; }
        .prescription-preview table { width:100%; border-collapse:collapse; font-size:13px; }
        .prescription-preview th,.prescription-preview td { border:1px solid #dce4e8; padding:10px; text-align:left; }
        .prescription-preview th { background:#f2f6f7; }
        .prescription-warning { background:#fff5df; color:#85631d; padding:12px; border-radius:10px; font-size:12px; line-height:1.6; }
        .preview-label { color:#21866e; font-size:12px; font-weight:800; letter-spacing:1px; }
        .prescription-success { background:#e2f8f1; color:#21866e; padding:13px; border-radius:10px; }
        .history-card { border:1px solid var(--border,#e5ebef); border-radius:12px; padding:15px; display:grid; gap:8px; }
        .history-card strong { font-size:15px; }
        .history-card span { font-size:12px; color:#81909c; }
        .history-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .return-lot-list { display:grid; gap:8px; margin-top:8px; padding:10px; border-radius:10px; background:var(--surface-muted,rgba(120,130,140,.08)); }
        .return-lot-row { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px; }
        .return-lot-row button { border:1px solid var(--border,#dce4e8); background:var(--surface,#fff); color:inherit; border-radius:8px; padding:7px 10px; cursor:pointer; }
        .history-open { border:0; background:#e2f8f1; color:#21866e; border-radius:8px; padding:9px 12px; font-weight:700; cursor:pointer; }
        @media(max-width:600px) {
          .prescription-grid { grid-template-columns:1fr; }
          .prescription-section { padding:15px; }
          .prescription-item { align-items:flex-start; }
          .prescription-preview { padding:14px; overflow-x:auto; }
        }
        @media print {
          body * { visibility:hidden !important; }
          .prescription-preview,.prescription-preview * { visibility:visible !important; }
          .prescription-preview { position:absolute; left:0; top:0; width:100%; border:0; }
          .prescription-preview button,.prescription-warning { display:none !important; }
        }
      `}</style>

      <header className="prescription-header">
        <h2>Ordonnances</h2>
        <p>Création, sauvegarde et prévisualisation des prescriptions.</p>
      </header>

      <div className="prescription-section">
        <h3>01 · Informations du patient</h3>
        {editingId && (
          <div className="prescription-success">
            Modification d’une ordonnance existante — aucun nouvel enregistrement ne sera créé.
          </div>
        )}
        <div className="prescription-grid">
          <div className="prescription-field">
            <label>Nom et prénom du patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Choisir un patient enregistré</option>
              {patients.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {item.age} ans</option>
              ))}
            </select>
            {patients.length === 0 && <p className="prescription-empty">Créez d'abord un dossier dans la rubrique Patients.</p>}
          </div>
          <div className="prescription-field">
            <label>Date de prescription</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="prescription-section">
        <h3>02 · Ajouter un médicament</h3>

        <div className="prescription-field">
          <label>Nom du médicament</label>
          <input
            value={medication.name}
            onChange={(e) => updateMedication('name', e.target.value)}
            placeholder="Nom du médicament"
          />
        </div>

        <div className="prescription-grid">
          <div className="prescription-field">
            <label>Dosage / concentration</label>
            <input
              value={medication.dosage}
              onChange={(e) => updateMedication('dosage', e.target.value)}
              placeholder="Ex. : 500 mg"
            />
          </div>

          <div className="prescription-field">
            <label>Voie d'administration</label>
            <select
              value={medication.route}
              onChange={(e) => updateMedication('route', e.target.value)}
            >
              <option>Voie orale</option>
              <option>Voie intraveineuse</option>
              <option>Voie intramusculaire</option>
              <option>Voie sous-cutanée</option>
              <option>Voie cutanée</option>
              <option>Voie inhalée</option>
              <option>Voie rectale</option>
              <option>Voie ophtalmique</option>
              <option>Autre</option>
            </select>
          </div>

          <div className="prescription-field">
            <label>Fréquence / posologie</label>
            <input
              value={medication.frequency}
              onChange={(e) => updateMedication('frequency', e.target.value)}
              placeholder="À préciser"
            />
          </div>

          <div className="prescription-field">
            <label>Durée du traitement</label>
            <input
              value={medication.duration}
              onChange={(e) => updateMedication('duration', e.target.value)}
              placeholder="À préciser"
            />
          </div>
        </div>

        <div className="prescription-field">
          <label>Instructions particulières</label>
          <input
            value={medication.instructions}
            onChange={(e) => updateMedication('instructions', e.target.value)}
            placeholder="Ex. : pendant le repas..."
          />
        </div>

        <div className="prescription-field">
          <label>Article de stock associé (facultatif)</label>
          <select
            value={medication.inventoryItemId || ''}
            onChange={(e) => updateMedication('inventoryItemId', e.target.value)}
          >
            <option value="">Aucun lien avec le stock</option>
            {dispensableInventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · Lot : {item.batchNumber || 'non renseigné'} · Péremption : {item.expiryDate ? new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'non renseignée'} · Stock : {item.quantity} {item.unit}{isExpired(item.expiryDate) ? ' · PÉRIMÉ — délivrance bloquée' : ''}
              </option>
            ))}
          </select>
          <p className="prescription-empty">Le stock ne sera pas modifié à la prescription. À la délivrance, la quantité réelle sera répartie automatiquement entre les lots valides du même produit, en utilisant d’abord celui dont la péremption est la plus proche (FEFO). Chaque lot utilisé sera enregistré séparément.</p>
        </div>

        <button className="prescription-add" onClick={addMedication}>
          + Ajouter ce médicament
        </button>
      </div>

      <div className="prescription-section">
        <h3>03 · Médicaments prescrits ({medications.length})</h3>

        {medications.length === 0 ? (
          <div className="prescription-empty">Aucun médicament ajouté.</div>
        ) : (
          <div className="prescription-list">
            {medications.map((item) => (
              <div className="prescription-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.dosage} · {item.route}</p>
                  <p>
                    {item.frequency || 'Posologie non précisée'} ·{' '}
                    {item.duration || 'Durée non précisée'}
                  </p>
                  {item.instructions && <p>{item.instructions}</p>}
                  {item.inventoryItemId && (() => {
                    const stockItem = inventory.items.find((stock) => stock.id === item.inventoryItemId);
                    return (
                      <div className="prescription-field prescription-dispensed-quantity">
                        <label>Quantité réellement délivrée {stockItem ? `(${stockItem.unit})` : ''}</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.dispensedQuantity ?? ''}
                          onChange={(e) => updateDispensedQuantity(item.id, e.target.value)}
                          placeholder="À saisir au moment de la délivrance"
                        />
                        <p className="prescription-empty">Article lié : {stockItem?.name || 'Article introuvable'} · Stock actuel : {stockItem ? `${stockItem.quantity} ${stockItem.unit}` : 'indisponible'}</p>
                        {stockItem && isExpired(stockItem.expiryDate) && (
                          <p role="alert" style={{ color: '#c43d3d', fontWeight: 700, fontSize: 12 }}>
                            DÉLIVRANCE INTERDITE : cet article est périmé depuis le {new Date(stockItem.expiryDate! + 'T00:00:00').toLocaleDateString('fr-FR')}. Associez un lot valide avant de poursuivre.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <button
                  className="prescription-remove"
                  onClick={() => removeMedication(item.id)}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="prescription-section">
        <h3>04 · Conseils et recommandations</h3>
        <div className="prescription-field">
          <label>Instructions complémentaires</label>
          <textarea
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            placeholder="Conseils, surveillance et rendez-vous de contrôle..."
          />
        </div>
      </div>

      <div className="prescription-actions">
        <button className="prescription-primary" onClick={previewPrescription}>
          Prévisualiser l'ordonnance
        </button>

        <button className="prescription-primary" onClick={savePrescription} disabled={patients.length === 0 || prescriptions.some((item) => item.id === editingId && item.status === 'dispensed')}>
          {editingId ? 'Enregistrer les modifications' : "Enregistrer l'ordonnance"}
        </button>

        {editingId && prescriptions.some((item) => item.id === editingId) && (
          <button
            className="prescription-primary"
            onClick={dispenseSavedPrescription}
            disabled={prescriptions.some((item) => item.id === editingId && item.status === 'dispensed')}
          >
            {prescriptions.some((item) => item.id === editingId && item.status === 'dispensed') ? 'Délivrance déjà enregistrée' : 'Enregistrer la délivrance et déduire le stock'}
          </button>
        )}

        {editingId && (
          <button className="prescription-secondary" onClick={resetForm}>
            Annuler la modification
          </button>
        )}

        <button className="prescription-secondary" onClick={resetForm}>
          {editingId ? 'Nouvelle ordonnance' : 'Réinitialiser'}
        </button>
      </div>

      {savedMessage && (
        <div className="prescription-success">{savedMessage}</div>
      )}

      {showPreview && (
        <div className="prescription-preview">
          <span className="preview-label">APERÇU DE L'ORDONNANCE</span>
          <h3>ORDONNANCE MÉDICALE</h3>
          <p><strong>Patient :</strong> {patients.find((item) => item.id === patientId)?.name || 'Patient non identifié'}</p>
          <p><strong>Date :</strong> {date}</p>

          <table>
            <thead>
              <tr>
                <th>Médicament</th>
                <th>Posologie et voie</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((item) => (
                <tr key={item.id}>
                  <td>{item.name} — {item.dosage}</td>
                  <td>
                    {item.frequency}<br />
                    {item.route}<br />
                    {item.instructions}
                  </td>
                  <td>{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {advice && <p><strong>Conseils :</strong> {advice}</p>}
          <p style={{ marginTop: 35 }}>Signature et cachet du médecin :</p>

          <div className="prescription-warning">
            Modèle de démonstration. Vérifier toutes les prescriptions avant utilisation réelle.
          </div>

          <button className="prescription-primary" onClick={printPrescription}>
            Imprimer l'ordonnance
          </button>
        </div>
      )}

      <div className="prescription-section">
        <h3>05 · Historique des ordonnances ({prescriptions.length})</h3>

        {prescriptions.length === 0 ? (
          <p className="prescription-empty">
            Aucune ordonnance enregistrée pour le moment.
          </p>
        ) : (
          <div className="prescription-list">
            {prescriptions.map((item) => (
              <div className="history-card" key={item.id}>
                <strong>{patients.find((patient) => patient.id === item.patientId)?.name || 'Patient non identifié'}</strong>
                <span>
                  Date de prescription : {item.date}
                </span>
                <span>
                  {item.medications.length} médicament(s)
                </span>
                <span>
                  Statut documentaire : {documentedPrescriptionStatus(item.status)}
                </span>

                {item.status === 'dispensed' && (
                  <div className="return-lot-list">
                    <strong>Retours et traçabilité par lot</strong>
                    {(() => {
                      const dispenseMovements = inventory.movements.filter((movement) =>
                        movement.type === 'dispense' && movement.prescriptionId === item.id
                      );
                      if (dispenseMovements.length === 0) {
                        return <span>Aucun mouvement de stock retrouvé pour cette délivrance.</span>;
                      }
                      return dispenseMovements.map((movement) => {
                        const returned = inventory.movements
                          .filter((entry) => entry.type === 'return' && entry.reversesMovementId === movement.id)
                          .reduce((sum, entry) => sum + entry.quantity, 0);
                        const remaining = Math.max(0, movement.quantity - returned);
                        const lot = inventory.items.find((entry) => entry.id === movement.itemId);
                        return (
                          <div className="return-lot-row" key={movement.id}>
                            <span>{movement.itemName} · {movement.reason || 'Lot'} — délivré : {movement.quantity} · retourné : {returned} · reste : {remaining} {lot?.unit || ''}</span>
                            {remaining > 0 && (
                              <button onClick={() => handlePartialReturn(item.id, item.patientId, movement.id, movement.itemName, remaining)}>
                                Enregistrer un retour partiel
                              </button>
                            )}
                          </div>
                        );
                      });
                    })()}
                    <span>Ne réintégrez que les produits physiquement récupérés, intacts et dont les conditions de conservation sont garanties.</span>
                  </div>
                )}

                <div className="history-actions">
                  <button
                    className="history-open"
                    onClick={() => openPrescription(item)}
                  >
                    Modifier
                  </button>

                  {item.status !== 'cancelled' && (
                    <button
                      className="prescription-remove"
                      onClick={() => cancelPrescription(item)}
                    >
                      Annuler l’ordonnance
                    </button>
                  )}
                  <button
                    className="prescription-remove"
                    onClick={() => confirmDeletePrescription(item.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
