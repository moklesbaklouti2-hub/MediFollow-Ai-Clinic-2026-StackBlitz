import { useMemo, useState } from 'react';
import { useMedicalData } from '../hooks/useMedicalData';
import type { Patient } from '../types/medical';

export default function Patients() {
  const { patients, consultations, prescriptions, addPatient } = useMedicalData();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = patients.find((patient) => patient.id === selectedId) ?? null;

  const filtered = useMemo(
    () => patients.filter((patient) =>
      `${patient.name} ${patient.phone}`.toLowerCase().includes(search.toLowerCase())
    ),
    [patients, search]
  );

  const patientConsultations = selected
    ? consultations
        .filter((item) => item.patientId === selected.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const patientPrescriptions = selected
    ? prescriptions
        .filter((item) => item.patientId === selected.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const latestVitals = patientConsultations.find((item) =>
    Object.values(item.vitals).some((value) => String(value ?? '').trim() !== '')
  )?.vitals;

  function addNewPatient() {
    if (!name.trim() || !age.trim()) {
      alert('Veuillez renseigner le nom et l’âge du patient.');
      return;
    }

    const numericAge = Number(age);
    if (!Number.isFinite(numericAge) || numericAge < 0) {
      alert('Veuillez saisir un âge valide.');
      return;
    }

    const newPatient = addPatient({
      name: name.trim(),
      age: numericAge,
      sex: 'Non renseigné',
      phone: phone.trim() || 'Non renseigné',
      lastVisit: 'Aucune visite',
      status: 'Nouveau',
    });

    setName('');
    setAge('');
    setPhone('');
    setShowForm(false);
    setSelectedId(newPatient.id);
  }

  function displayDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
  }

  const vitalLabels: { key: keyof NonNullable<typeof latestVitals>; label: string; unit: string }[] = [
    { key: 'systolic', label: 'Pression systolique', unit: 'mmHg' },
    { key: 'diastolic', label: 'Pression diastolique', unit: 'mmHg' },
    { key: 'heartRate', label: 'Fréquence cardiaque', unit: 'bpm' },
    { key: 'spo2', label: 'SpO₂', unit: '%' },
    { key: 'temperature', label: 'Température', unit: '°C' },
    { key: 'respiratoryRate', label: 'Fréquence respiratoire', unit: '/min' },
    { key: 'weight', label: 'Poids', unit: 'kg' },
    { key: 'height', label: 'Taille', unit: 'cm' },
    { key: 'glycemia', label: 'Glycémie', unit: 'g/L' },
  ];

  return (
    <section className="patients-page">
      <style>{`
        .patients-page { display:grid; gap:22px; color:var(--text-primary,#20334b); }
        .patients-heading { display:flex; justify-content:space-between; align-items:center; gap:15px; flex-wrap:wrap; }
        .patients-heading h2 { margin:0 0 6px; font-size:25px; }
        .patients-heading p { margin:0; color:#81909c; }
        .patients-action { background:#42d5b4; color:#12332f; border:0; border-radius:11px; padding:12px 18px; font-weight:700; cursor:pointer; }
        .patients-toolbar { display:flex; gap:12px; flex-wrap:wrap; }
        .patients-search { flex:1; min-width:200px; padding:13px 15px; border:1px solid var(--border,#e5ebef); border-radius:12px; background:var(--surface,#fff); color:inherit; font:inherit; }
        .patients-count { padding:18px; border-radius:15px; background:var(--surface,#fff); border:1px solid var(--border,#e5ebef); }
        .patients-count strong { font-size:25px; display:block; }
        .patients-count span { color:#81909c; font-size:13px; }
        .patients-list { display:grid; gap:12px; }
        .patient-card { background:var(--surface,#fff); border:1px solid var(--border,#e5ebef); border-radius:16px; padding:17px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .patient-name { font-weight:700; margin-bottom:5px; }
        .patient-meta { color:#81909c; font-size:13px; }
        .patient-status { background:#e2f8f1; color:#21866e; border-radius:20px; padding:6px 11px; font-size:12px; font-weight:600; }
        .patient-view { border:1px solid #42d5b4; background:transparent; color:inherit; border-radius:9px; padding:8px 12px; cursor:pointer; }
        .patient-form,.patient-detail { display:grid; gap:14px; padding:20px; background:var(--surface,#fff); border:1px solid var(--border,#e5ebef); border-radius:16px; }
        .patient-form input { width:100%; box-sizing:border-box; padding:12px; border:1px solid var(--border,#dce4e8); border-radius:10px; background:var(--surface,#fff); color:inherit; font:inherit; }
        .patient-detail h3 { margin:0; }
        .patient-detail p { margin:0; }
        .patient-detail-heading { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
        .patient-section-title { margin:8px 0 0; padding-top:15px; border-top:1px solid var(--border,#e5ebef); }
        .patient-summary-grid,.patient-vitals-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .patient-summary-item,.patient-vital { padding:12px; border:1px solid var(--border,#e5ebef); border-radius:11px; min-width:0; }
        .patient-summary-item span,.patient-vital span { display:block; color:#81909c; font-size:12px; margin-bottom:5px; }
        .patient-summary-item strong,.patient-vital strong { overflow-wrap:anywhere; }
        .patient-vital strong { font-size:18px; }
        .patient-consultation,.patient-prescription { padding:14px; border:1px solid var(--border,#e5ebef); border-radius:12px; display:grid; gap:7px; }
        .patient-consultation strong,.patient-prescription strong { font-size:14px; }
        .patient-consultation span,.patient-prescription span { font-size:12px; color:#81909c; }
        .patient-consultation p,.patient-prescription p { font-size:13px; line-height:1.5; }
        .patient-empty-history { color:#81909c; font-size:13px; }
        .patient-medication-list { margin:0; padding-left:18px; font-size:13px; line-height:1.6; }
        @media(max-width:550px) {
          .patient-card { align-items:flex-start; }
          .patient-summary-grid,.patient-vitals-grid { grid-template-columns:1fr 1fr; }
          .patient-detail { padding:15px; }
        }
      `}</style>

      <header className="patients-heading">
        <div>
          <h2>Gestion des patients</h2>
          <p>Consultez et gérez les dossiers médicaux centralisés.</p>
        </div>
        <button className="patients-action" onClick={() => setShowForm(!showForm)}>
          + Nouveau patient
        </button>
      </header>

      <div className="patients-count">
        <strong>{patients.length}</strong>
        <span>Patients enregistrés sur cet appareil</span>
      </div>

      <div className="patients-toolbar">
        <input
          className="patients-search"
          placeholder="Rechercher par nom ou téléphone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {showForm && (
        <div className="patient-form">
          <h3>Nouveau dossier patient</h3>
          <input placeholder="Nom et prénom" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Âge" type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} />
          <input placeholder="Téléphone (facultatif)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="patients-action" onClick={addNewPatient}>Enregistrer le patient</button>
        </div>
      )}

      <div className="patients-list">
        {filtered.map((patient: Patient) => (
          <article className="patient-card" key={patient.id}>
            <div>
              <div className="patient-name">{patient.name}</div>
              <div className="patient-meta">{patient.age} ans · {patient.sex} · {patient.phone}</div>
              <div className="patient-meta">Dernière visite : {patient.lastVisit}</div>
            </div>
            <span className="patient-status">{patient.status}</span>
            <button className="patient-view" onClick={() => setSelectedId(patient.id)}>Ouvrir le dossier</button>
          </article>
        ))}
        {filtered.length === 0 && <p>Aucun patient trouvé.</p>}
      </div>

      {selected && (
        <div className="patient-detail">
          <div className="patient-detail-heading">
            <h3>Dossier médical · {selected.name}</h3>
            <button className="patient-view" onClick={() => setSelectedId(null)}>Fermer</button>
          </div>

          <h3 className="patient-section-title">Identité et informations</h3>
          <div className="patient-summary-grid">
            <div className="patient-summary-item"><span>Âge</span><strong>{selected.age} ans</strong></div>
            <div className="patient-summary-item"><span>Sexe</span><strong>{selected.sex}</strong></div>
            <div className="patient-summary-item"><span>Téléphone</span><strong>{selected.phone}</strong></div>
            <div className="patient-summary-item"><span>Statut</span><strong>{selected.status}</strong></div>
          </div>

          <h3 className="patient-section-title">Résumé du suivi</h3>
          <div className="patient-summary-grid">
            <div className="patient-summary-item"><span>Consultations</span><strong>{patientConsultations.length}</strong></div>
            <div className="patient-summary-item"><span>Ordonnances</span><strong>{patientPrescriptions.length}</strong></div>
            <div className="patient-summary-item"><span>Dernière consultation</span><strong>{patientConsultations[0] ? displayDate(patientConsultations[0].date) : 'Aucune'}</strong></div>
            <div className="patient-summary-item"><span>Dernière ordonnance</span><strong>{patientPrescriptions[0] ? displayDate(patientPrescriptions[0].date) : 'Aucune'}</strong></div>
          </div>

          <h3 className="patient-section-title">Dernières constantes disponibles</h3>
          {!latestVitals ? (
            <p className="patient-empty-history">Aucune constante vitale enregistrée.</p>
          ) : (
            <div className="patient-vitals-grid">
              {vitalLabels.filter((field) => String(latestVitals[field.key] ?? '').trim() !== '').map((field) => (
                <div className="patient-vital" key={field.key}>
                  <span>{field.label}</span>
                  <strong>{latestVitals[field.key]} {field.unit}</strong>
                </div>
              ))}
            </div>
          )}

          <h3 className="patient-section-title">Historique des consultations ({patientConsultations.length})</h3>
          {patientConsultations.length === 0 ? (
            <p className="patient-empty-history">Aucune consultation enregistrée pour ce patient.</p>
          ) : (
            patientConsultations.map((consultation) => (
              <article className="patient-consultation" key={consultation.id}>
                <strong>{consultation.motif || 'Consultation'}</strong>
                <span>{displayDate(consultation.date)}</span>
                {consultation.symptoms && <p><b>Symptômes :</b> {consultation.symptoms}</p>}
                {consultation.history && <p><b>Antécédents / traitements :</b> {consultation.history}</p>}
                {consultation.examination && <p><b>Examen clinique :</b> {consultation.examination}</p>}
                {consultation.diagnosis && <p><b>Diagnostic :</b> {consultation.diagnosis}</p>}
                {consultation.plan && <p><b>Conduite à tenir :</b> {consultation.plan}</p>}
              </article>
            ))
          )}

          <h3 className="patient-section-title">Historique des ordonnances ({patientPrescriptions.length})</h3>
          {patientPrescriptions.length === 0 ? (
            <p className="patient-empty-history">Aucune ordonnance enregistrée pour ce patient.</p>
          ) : (
            patientPrescriptions.map((prescription) => (
              <article className="patient-prescription" key={prescription.id}>
                <strong>Ordonnance du {displayDate(prescription.date)}</strong>
                <span>{prescription.medications.length} médicament(s)</span>
                {prescription.medications.length > 0 && (
                  <ul className="patient-medication-list">
                    {prescription.medications.map((medication) => (
                      <li key={medication.id}>
                        {medication.name} — {medication.dosage}; {medication.frequency}; durée : {medication.duration}
                      </li>
                    ))}
                  </ul>
                )}
                {prescription.advice && <p><b>Conseils :</b> {prescription.advice}</p>}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
