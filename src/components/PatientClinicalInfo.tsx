import { useEffect, useState } from 'react';
import type {
  Patient,
  PatientClinicalHistory,
  ClinicalHistoryItem,
  CurrentMedication,
} from '../types/medical';

type Props = {
  patient: Patient;
  onSave: (changes: Partial<Patient>) => boolean;
};

const historyGroups: { key: 'medical' | 'surgical' | 'allergies' | 'family'; label: string }[] = [
  { key: 'medical', label: 'Antécédents médicaux' },
  { key: 'surgical', label: 'Antécédents chirurgicaux' },
  { key: 'allergies', label: 'Allergies et intolérances' },
  { key: 'family', label: 'Antécédents familiaux' },
];

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PatientClinicalInfo({ patient, onSave }: Props) {
  const [history, setHistory] = useState<PatientClinicalHistory>(patient.clinicalHistory ?? {});
  const [medications, setMedications] = useState<CurrentMedication[]>(patient.currentMedications ?? []);

  useEffect(() => {
    setHistory(patient.clinicalHistory ?? {});
    setMedications(patient.currentMedications ?? []);
  }, [patient.id]);

  function updateHistoryItem(
    group: 'medical' | 'surgical' | 'allergies' | 'family',
    id: string,
    changes: Partial<ClinicalHistoryItem>
  ) {
    setHistory((current) => ({
      ...current,
      [group]: (current[group] ?? []).map((item) =>
        item.id === id ? { ...item, ...changes } : item
      ),
    }));
  }

  function addHistoryItem(group: 'medical' | 'surgical' | 'allergies' | 'family') {
    setHistory((current) => ({
      ...current,
      [group]: [...(current[group] ?? []), { id: newId(), label: '' }],
    }));
  }

  function removeHistoryItem(group: 'medical' | 'surgical' | 'allergies' | 'family', id: string) {
    setHistory((current) => ({
      ...current,
      [group]: (current[group] ?? []).filter((item) => item.id !== id),
    }));
  }

  function updateMedication(id: string, changes: Partial<CurrentMedication>) {
    setMedications((current) =>
      current.map((item) => item.id === id ? { ...item, ...changes } : item)
    );
  }

  function addMedication() {
    setMedications((current) => [...current, { id: newId(), name: '' }]);
  }

  function save() {
    const cleanHistory: PatientClinicalHistory = {
      ...history,
      medical: (history.medical ?? []).filter((item) => item.label.trim()),
      surgical: (history.surgical ?? []).filter((item) => item.label.trim()),
      allergies: (history.allergies ?? []).filter((item) => item.label.trim()),
      family: (history.family ?? []).filter((item) => item.label.trim()),
    };
    const cleanMedications = medications.filter((item) => item.name.trim());
    const saved = onSave({ clinicalHistory: cleanHistory, currentMedications: cleanMedications });
    if (!saved) {
      window.alert("Enregistrement non confirmé. Vos modifications restent affichées : réessayez.");
      return;
    }
    window.alert('Antécédents et traitements enregistrés.');
  }

  const gyn = history.gynecoObstetric ?? {};

  return (
    <section className="patient-clinical-info">
      <style>{`
        .patient-clinical-info { display:grid; gap:15px; }
        .pci-group { border:1px solid var(--border,#e5ebef); border-radius:12px; padding:14px; display:grid; gap:10px; }
        .pci-group h4 { margin:0; font-size:15px; }
        .pci-entry { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:10px; border:1px solid var(--border,#e5ebef); border-radius:10px; }
        .pci-entry input,.pci-entry textarea,.pci-fields input,.pci-fields textarea { width:100%; min-width:0; box-sizing:border-box; padding:10px; border:1px solid var(--border,#dce4e8); border-radius:8px; background:var(--surface,#fff); color:inherit; font:inherit; }
        .pci-entry textarea,.pci-fields textarea { grid-column:1/-1; min-height:58px; resize:vertical; }
        .pci-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .pci-wide { grid-column:1/-1; }
        .pci-small-btn { border:1px solid var(--border,#dce4e8); border-radius:8px; padding:8px 10px; background:transparent; color:inherit; cursor:pointer; justify-self:start; }
        .pci-remove { border-color:#d97777; color:#b54747; }
        .pci-group p { margin:0; color:#81909c; font-size:12px; }
        @media(max-width:550px) { .pci-entry,.pci-fields { grid-template-columns:1fr; } .pci-entry textarea,.pci-wide { grid-column:auto; } }
      `}</style>

      <h3 className="patient-section-title">Antécédents médicaux et traitements en cours</h3>
      {historyGroups.map((group) => (
        <div className="pci-group" key={group.key}>
          <h4>{group.label}</h4>
          {(history[group.key] ?? []).map((item) => (
            <div className="pci-entry" key={item.id}>
              <input aria-label={`${group.label} : intitulé`} placeholder="Pathologie, intervention, allergène…" value={item.label} onChange={(e) => updateHistoryItem(group.key, item.id, { label: e.target.value })} />
              <input aria-label="Date" placeholder="Date (facultative)" value={item.date ?? ''} onChange={(e) => updateHistoryItem(group.key, item.id, { date: e.target.value })} />
              <textarea aria-label="Détails" placeholder="Détails, réaction allergique, précision…" value={item.details ?? ''} onChange={(e) => updateHistoryItem(group.key, item.id, { details: e.target.value })} />
              <button type="button" className="pci-small-btn pci-remove" onClick={() => removeHistoryItem(group.key, item.id)}>Retirer</button>
            </div>
          ))}
          <button type="button" className="pci-small-btn" onClick={() => addHistoryItem(group.key)}>+ Ajouter</button>
        </div>
      ))}

      <div className="pci-group">
        <h4>Antécédents gynéco-obstétricaux</h4>
        <p>À renseigner selon le contexte clinique et la pertinence pour la patiente.</p>
        <div className="pci-fields">
          <input placeholder="Ménarche" value={gyn.menarche ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, menarche: e.target.value } }))} />
          <input placeholder="Cycles menstruels" value={gyn.cycle ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, cycle: e.target.value } }))} />
          <input placeholder="Date des dernières règles" value={gyn.lastMenstrualPeriod ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, lastMenstrualPeriod: e.target.value } }))} />
          <input placeholder="Ménopause" value={gyn.menopause ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, menopause: e.target.value } }))} />
          <input placeholder="Gestité (G)" value={gyn.gravidity ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, gravidity: e.target.value } }))} />
          <input placeholder="Parité (P)" value={gyn.parity ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, parity: e.target.value } }))} />
          <input placeholder="Fausses couches" value={gyn.miscarriages ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, miscarriages: e.target.value } }))} />
          <input placeholder="IVG / interruptions" value={gyn.abortions ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, abortions: e.target.value } }))} />
          <input placeholder="Accouchements" value={gyn.deliveries ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, deliveries: e.target.value } }))} />
          <input placeholder="Césariennes" value={gyn.cesareanSections ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, cesareanSections: e.target.value } }))} />
          <input placeholder="Contraception" value={gyn.contraception ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, contraception: e.target.value } }))} />
          <textarea className="pci-wide" placeholder="Détails des grossesses et autres informations" value={gyn.pregnanciesDetails ?? gyn.other ?? ''} onChange={(e) => setHistory((h) => ({ ...h, gynecoObstetric: { ...h.gynecoObstetric, pregnanciesDetails: e.target.value } }))} />
        </div>
      </div>

      <div className="pci-group">
        <h4>Traitements en cours</h4>
        <p>Les traitements sont distincts des médicaments prescrits lors d'une consultation donnée.</p>
        {medications.map((medication) => (
          <div className="pci-entry" key={medication.id}>
            <input placeholder="Nom du médicament" value={medication.name} onChange={(e) => updateMedication(medication.id, { name: e.target.value })} />
            <input placeholder="Dosage (ex. 500 mg)" value={medication.dosage ?? ''} onChange={(e) => updateMedication(medication.id, { dosage: e.target.value })} />
            <input placeholder="Voie d'administration" value={medication.route ?? ''} onChange={(e) => updateMedication(medication.id, { route: e.target.value })} />
            <input placeholder="Fréquence / posologie" value={medication.frequency ?? ''} onChange={(e) => updateMedication(medication.id, { frequency: e.target.value })} />
            <input placeholder="Date de début" value={medication.startDate ?? ''} onChange={(e) => updateMedication(medication.id, { startDate: e.target.value })} />
            <input placeholder="Date de fin (si connue)" value={medication.endDate ?? ''} onChange={(e) => updateMedication(medication.id, { endDate: e.target.value })} />
            <input placeholder="Indication" value={medication.indication ?? ''} onChange={(e) => updateMedication(medication.id, { indication: e.target.value })} />
            <textarea placeholder="Instructions particulières" value={medication.instructions ?? ''} onChange={(e) => updateMedication(medication.id, { instructions: e.target.value })} />
            <button type="button" className="pci-small-btn pci-remove" onClick={() => setMedications((current) => current.filter((item) => item.id !== medication.id))}>Retirer ce traitement</button>
          </div>
        ))}
        <button type="button" className="pci-small-btn" onClick={addMedication}>+ Ajouter un traitement</button>
      </div>

      <button type="button" className="patients-action" onClick={save}>Enregistrer les antécédents et traitements</button>
    </section>
  );
}
