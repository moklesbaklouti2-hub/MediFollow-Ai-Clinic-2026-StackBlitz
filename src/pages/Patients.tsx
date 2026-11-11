import { useMemo, useState } from 'react';
import { useMedicalData } from '../hooks/useMedicalData';
import type { Patient } from '../types/medical';
import PatientClinicalInfo from '../components/PatientClinicalInfo';
import { selectUniquePatient } from '../services/uniquePatientSelection';
import { latestVitalReadings } from '../clinical/patientVitals';
import { buildClinicalMemory } from '../clinical/clinicalMemory';
import { compareRecentVitals } from '../clinical/trends';
import { buildPreventionReview } from '../clinical/prevention';
import { buildReferralSource } from '../clinical/referral';
import { summarizeDocumentedSpecialties } from '../clinical/specialtyPathways';
import { orderRecordedNewest, recordedDateTimestamp, displayRecordedDate } from '../clinical/medicalTimeline';
import { documentedSupplementalOrders, documentedPrescriptionStatus } from '../clinical/prescriptionTimeline';
import LocalDocumentReader from '../components/LocalDocumentReader';

export default function Patients() {
  const { patients, consultations, prescriptions, deletedPatients, addPatient, updatePatient, deletePatient, restoreDeletedPatient } = useMedicalData();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const selected = selectUniquePatient(patients, selectedId);

  const filtered = useMemo(
    () => patients.filter((patient) =>
      `${patient.name} ${patient.phone}`.toLowerCase().includes(search.toLowerCase())
    ),
    [patients, search]
  );

  const patientConsultations = selected
    ? orderRecordedNewest(consultations.filter((item) => item.patientId === selected.id))
    : [];

  const patientPrescriptions = selected
    ? orderRecordedNewest(prescriptions.filter((item) => item.patientId === selected.id))
    : [];

  const medicalTimeline = orderRecordedNewest([
    ...patientConsultations.map((consultation) => ({
      type: 'consultation' as const,
      id: consultation.id,
      date: consultation.date,
      consultation,
    })),
    ...patientPrescriptions.map((prescription) => ({
      type: 'prescription' as const,
      id: prescription.id,
      date: prescription.date,
      prescription,
    })),
  ]);

  const lastVisitByPatient = useMemo(() => {
    // Prototype-free map: imported patient IDs cannot shadow object keys.
    const result: Record<string, string> = Object.create(null);
    for (const consultation of orderRecordedNewest(consultations)) {
      if (typeof consultation.patientId !== 'string' || !consultation.patientId.trim() ||
          recordedDateTimestamp(consultation.date) === null) continue;
      if (!Object.prototype.hasOwnProperty.call(result, consultation.patientId)) {
        result[consultation.patientId] = consultation.date;
      }
    }
    return result;
  }, [consultations]);

  // Each latest reading keeps the date of its own consultation.
  const latestVitals = selected ? latestVitalReadings(patientConsultations) : null;
  const clinicalMemory = selected ? buildClinicalMemory(selected, patientConsultations) : null;
  const recordedVitalComparisons = selected ? compareRecentVitals(patientConsultations) : [];
  const preventionReview = selected ? buildPreventionReview(selected, patientConsultations) : null;
  const referralSource = selected ? buildReferralSource(selected.id, patientConsultations) : null;
  const documentedSpecialties = selected ? summarizeDocumentedSpecialties(selected.id, patientConsultations) : [];

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

    if (!newPatient) {
      window.alert("Enregistrement impossible : le navigateur n'a pas confirmé la sauvegarde. Vos données saisies sont conservées dans le formulaire.");
      return;
    }
    setName('');
    setAge('');
    setPhone('');
    setShowForm(false);
    setSelectedId(newPatient.id);
  }

  function beginEditPatient() {
    if (!selected) return;
    setEditName(selected.name);
    setEditAge(String(selected.age));
    setEditSex(selected.sex);
    setEditPhone(selected.phone);
    setEditStatus(selected.status);
    setShowEditForm(true);
  }

  function savePatientChanges() {
    if (!selected) return;
    if (!editName.trim() || !editAge.trim()) {
      alert('Veuillez renseigner le nom et l’âge du patient.');
      return;
    }
    const numericAge = Number(editAge);
    if (!Number.isFinite(numericAge) || numericAge < 0) {
      alert('Veuillez saisir un âge valide.');
      return;
    }
    const saved = updatePatient(selected.id, {
      name: editName.trim(),
      age: numericAge,
      sex: editSex.trim() || 'Non renseigné',
      phone: editPhone.trim() || 'Non renseigné',
      status: editStatus.trim() || 'Actif',
    });
    if (!saved) {
      window.alert("Modification non confirmée : le navigateur n'a pas confirmé l'enregistrement. Réessayez après avoir libéré de l'espace ou téléchargé une sauvegarde.");
      return;
    }
    setShowEditForm(false);
  }

  function handleDeletePatient() {
    if (!selected) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le dossier administratif de ${selected.name} ? Cette action est définitive. Les dossiers ayant des consultations ou des ordonnances ne peuvent pas être supprimés.`
    );

    if (!confirmed) return;

    const deleted = deletePatient(selected.id);
    if (!deleted) {
      window.alert(
        'Suppression impossible. Le patient possède peut-être un historique médical ou le navigateur a refusé l’enregistrement dans la corbeille. Aucune confirmation de suppression ne peut être donnée.'
      );
      return;
    }

    setSelectedId(null);
    setShowEditForm(false);
    window.alert('Le dossier patient a été supprimé.');
  }

  function handleRestorePatient(patientId: string) {
    const confirmed = window.confirm('Voulez-vous restaurer ce dossier patient dans la liste active ?');
    if (!confirmed) return;
    const restored = restoreDeletedPatient(patientId);
    window.alert(restored
      ? 'Le dossier patient a été restauré.'
      : 'La restauration a échoué : le navigateur n’a pas confirmé toutes les opérations. Vérifiez la liste active et la corbeille avant de réessayer.');
  }

  function displayDate(value: string) {
    return displayRecordedDate(value);
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

  function renderTrendChart(
    label: string,
    unit: string,
    key: 'weight' | 'systolic' | 'diastolic' | 'glycemia' | 'heartRate' | 'spo2'
  ) {
    const points = [...patientConsultations]
      .reverse()
      .map((consultation) => {
        const raw = String(consultation.vitals[key] ?? '').trim().replace(',', '.');
        const value = Number.parseFloat(raw);
        return {
          id: consultation.id,
          date: consultation.date,
          value,
        };
      })
      .filter((point) => Number.isFinite(point.value));

    if (points.length === 0) {
      return (
        <div className="patient-trend-card" key={key}>
          <strong>{label}</strong>
          <p className="patient-empty-history">Aucune mesure numérique enregistrée.</p>
        </div>
      );
    }

    const width = 560;
    const height = 180;
    const paddingLeft = 62;
    const paddingRight = 18;
    const paddingTop = 22;
    const paddingBottom = 28;
    const values = points.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const rawRange = maxValue - minValue;
    const range = rawRange || Math.max(Math.abs(maxValue) * 0.1, 1);
    const scaleMin = minValue - range * 0.1;
    const scaleMax = maxValue + range * 0.1;
    const scaleRange = scaleMax - scaleMin;
    const plotHeight = height - paddingTop - paddingBottom;
    const plotWidth = width - paddingLeft - paddingRight;
    const yTicks = [scaleMin, (scaleMin + scaleMax) / 2, scaleMax];
    const formatValue = (value: number) =>
      new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
    const coordinates = points.map((point, index) => ({
      ...point,
      x: points.length === 1
        ? paddingLeft + plotWidth / 2
        : paddingLeft + (index / (points.length - 1)) * plotWidth,
      y: paddingTop + ((scaleMax - point.value) / scaleRange) * plotHeight,
    }));
    const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ');

    return (
      <div className="patient-trend-card" key={key}>
        <strong>{label}</strong>
        <div className="patient-trend-chart">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Évolution de ${label} en ${unit}`}>
            {yTicks.map((tick, index) => {
              const y = paddingTop + ((scaleMax - tick) / scaleRange) * plotHeight;
              return (
                <g key={index}>
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border,#dce4e8)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={paddingLeft - 9} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor">
                    {formatValue(tick)}
                  </text>
                </g>
              );
            })}
            {points.length > 1 && (
              <polyline points={polyline} fill="none" stroke="#24a98e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {coordinates.map((point) => (
              <g key={point.id}>
                <circle cx={point.x} cy={point.y} r="5" fill="#24a98e" />
                <text x={point.x} y={Math.max(13, point.y - 10)} textAnchor="middle" fontSize="12" fill="currentColor">
                  {formatValue(point.value)} {unit}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="patient-trend-dates">
          {coordinates.map((point) => (
            <span key={point.id}>{new Date(point.date).toLocaleDateString('fr-FR')}</span>
          ))}
        </div>
        <p className="patient-trend-note">
          {points.length === 1
            ? 'Une seule mesure disponible : évolution non calculable.'
            : `${points.length} mesures enregistrées, de la plus ancienne à la plus récente.`}
        </p>
      </div>
    );
  }

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
        .patient-delete { border:1px solid #d97777; background:transparent; color:#b54747; border-radius:9px; padding:8px 12px; cursor:pointer; font-weight:600; }
        .patient-trash { display:grid; gap:12px; padding:18px; border:1px solid var(--border,#e5ebef); border-radius:16px; background:var(--surface,#fff); }\n        .patient-trash-item { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:12px; border:1px solid var(--border,#e5ebef); border-radius:11px; }\n        .patient-form,.patient-detail { display:grid; gap:14px; padding:20px; background:var(--surface,#fff); border:1px solid var(--border,#e5ebef); border-radius:16px; }
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
        .patient-timeline-entry { padding:15px; border:1px solid var(--border,#e5ebef); border-left:4px solid #42d5b4; border-radius:12px; display:grid; gap:8px; }
        .patient-trends-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        @media(max-width:700px) { .patient-trends-grid { grid-template-columns:1fr; } }
        .patient-trend-card { padding:15px; border:1px solid var(--border,#e5ebef); border-radius:12px; display:grid; gap:9px; min-width:0; }
        .patient-trend-chart { width:100%; overflow:hidden; }
        .patient-trend-chart svg { display:block; width:100%; height:auto; overflow:visible; }
        .patient-trend-dates { display:flex; justify-content:space-between; gap:6px; color:#81909c; font-size:11px; }
        .patient-trend-dates span { min-width:0; overflow-wrap:anywhere; }
        .patient-trend-note { color:#81909c; font-size:12px; }
        .patient-timeline-entry > span { font-size:12px; color:#81909c; }
        .patient-timeline-kind { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#21866e; }
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
              <div className="patient-meta">
                Dernière visite : {lastVisitByPatient[patient.id]
                  ? displayDate(lastVisitByPatient[patient.id])
                  : 'Aucune visite'}
              </div>
            </div>
            <span className="patient-status">{patient.status}</span>
            <button className="patient-view" onClick={() => setSelectedId(patient.id)}>Ouvrir le dossier</button>
          </article>
        ))}
        {filtered.length === 0 && <p>Aucun patient trouvé.</p>}
      </div>

      <section className="patient-trash">
        <div>
          <h3 style={{ margin: '0 0 5px' }}>Corbeille des patients ({deletedPatients.length})</h3>
          <p className="patient-empty-history">Les dossiers supprimés sans historique médical sont conservés ici et peuvent être restaurés.</p>
        </div>
        {deletedPatients.length === 0 ? (
          <p className="patient-empty-history">La corbeille est vide.</p>
        ) : (
          [...deletedPatients]
            .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
            .map((record) => (
              <div className="patient-trash-item" key={record.patient.id}>
                <div>
                  <strong>{record.patient.name}</strong>
                  <div className="patient-meta">Supprimé le {displayDate(record.deletedAt)}</div>
                </div>
                <button className="patient-view" onClick={() => handleRestorePatient(record.patient.id)}>
                  Restaurer le dossier
                </button>
              </div>
            ))
        )}
      </section>

      {selectedId !== null && !selected && (
        <p role="alert" className="patient-empty-history">
          Dossier patient introuvable ou identifiant dupliqué. Vérifiez les données importées
          avant d’accéder à l’historique médical.
          <button type="button" className="patient-view" onClick={() => setSelectedId(null)}>
            Fermer la sélection
          </button>
        </p>
      )}
      {selected && (
        <div className="patient-detail">
          <div className="patient-detail-heading">
            <h3>Dossier médical · {selected.name}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="patient-view" onClick={beginEditPatient}>Modifier le patient</button>
              <button className="patient-delete" onClick={handleDeletePatient}>Supprimer le dossier</button>
              <button className="patient-view" onClick={() => setSelectedId(null)}>Fermer</button>
            </div>
          </div>

          <h3 className="patient-section-title">Identité et informations</h3>
          <div className="patient-summary-grid">
            <div className="patient-summary-item"><span>Âge</span><strong>{selected.age} ans</strong></div>
            <div className="patient-summary-item"><span>Sexe</span><strong>{selected.sex}</strong></div>
            <div className="patient-summary-item"><span>Téléphone</span><strong>{selected.phone}</strong></div>
            <div className="patient-summary-item"><span>Statut</span><strong>{selected.status}</strong></div>
          </div>

          {showEditForm && (
            <div className="patient-form">
              <h3>Modifier les informations du patient</h3>
              <input placeholder="Nom et prénom" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input placeholder="Âge" type="number" min="0" value={editAge} onChange={(e) => setEditAge(e.target.value)} />
              <input placeholder="Sexe" value={editSex} onChange={(e) => setEditSex(e.target.value)} />
              <input placeholder="Téléphone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              <input placeholder="Statut" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="patients-action" onClick={savePatientChanges}>Enregistrer les modifications</button>
                <button className="patient-view" onClick={() => setShowEditForm(false)}>Annuler</button>
              </div>
              <p className="patient-empty-history">La modification des informations administratives ne supprime ni ne modifie les consultations et ordonnances.</p>
            </div>
          )}

          <PatientClinicalInfo
            patient={selected}
            onSave={(changes) => updatePatient(selected.id, changes)}
          />

          {clinicalMemory && (
            <section aria-label="HELIOS Clinical Memory — mémoire documentaire">
              <h3 className="patient-section-title">HELIOS Clinical Memory · aperçu documentaire</h3>
              <p className="patient-empty-history">
                Extraits des données enregistrées pour ce dossier. À vérifier lors de la consultation :
                aucune information manquante n'est interprétée comme une absence d'allergie, de traitement ou de diagnostic.
              </p>
              <div className="patient-summary-grid">
                <div className="patient-summary-item">
                  <span>Allergies déclarées</span>
                  {clinicalMemory.allergies.length ? (
                    <ul className="patient-medication-list">
                      {clinicalMemory.allergies.map((entry, index) => <li key={index}>{entry}</li>)}
                    </ul>
                  ) : <strong>Non renseigné</strong>}
                </div>
                <div className="patient-summary-item">
                  <span>Traitements déclarés dans le dossier (à confirmer)</span>
                  {clinicalMemory.declaredTreatments.length ? (
                    <ul className="patient-medication-list">
                      {clinicalMemory.declaredTreatments.map((entry, index) => <li key={index}>{entry}</li>)}
                    </ul>
                  ) : <strong>Non renseigné</strong>}
                </div>
              </div>
              <h4 className="patient-section-title">Antécédents documentés dans ce dossier</h4>
              <div className="patient-summary-grid">
                {([
                  { key: 'medical', label: 'Antécédents médicaux déclarés' },
                  { key: 'surgical', label: 'Antécédents chirurgicaux déclarés' },
                  { key: 'family', label: 'Antécédents familiaux déclarés' },
                ] as const).map(group => (
                  <div className="patient-summary-item" key={group.key}>
                    <span>{group.label}</span>
                    {clinicalMemory.documentedHistory[group.key].length ? (
                      <ul className="patient-medication-list">
                        {clinicalMemory.documentedHistory[group.key].map((entry, index) => (
                          <li key={index}>{entry}</li>
                        ))}
                      </ul>
                    ) : <strong>Non renseigné</strong>}
                  </div>
                ))}
              </div>
              <div className="patient-summary-item">
                <span>Trois derniers diagnostics consignés dans les consultations (non revalidés)</span>
                {clinicalMemory.documentedDiagnoses.length ? (
                  <ul className="patient-medication-list">
                    {clinicalMemory.documentedDiagnoses.map((entry) => (
                      <li key={entry.consultationId}>
                        {entry.label} · {displayDate(entry.date)}
                      </li>
                    ))}
                  </ul>
                ) : <strong>Non renseigné</strong>}
              </div>
            </section>
          )}

          {preventionReview && (
            <section aria-label="HELIOS Prevention — entretien documentaire">
              <h3 className="patient-section-title">HELIOS Prevention · préparation documentaire</h3>
              <p className="patient-empty-history">
                Repères de discussion non personnalisés. Les informations du dossier restent déclaratives :
                cette rubrique ne vérifie ni l'éligibilité ni la réalisation d'un acte préventif.
              </p>
              <div className="patient-summary-grid">
                <div className="patient-summary-item">
                  <span>Âge enregistré (à confirmer)</span>
                  <strong>{preventionReview.recordedAge === null ? 'Non renseigné' : `${preventionReview.recordedAge} ans`}</strong>
                </div>
                <div className="patient-summary-item">
                  <span>Dernière consultation datée dans ce dossier</span>
                  <strong>{preventionReview.lastDatedConsultation
                    ? displayDate(preventionReview.lastDatedConsultation) : 'Non renseignée'}</strong>
                </div>
              </div>
              <ul className="patient-medication-list">
                {preventionReview.discussionTopics.map((topic) => (
                  <li key={topic.id}><strong>{topic.label}</strong> — À vérifier avec le patient et à documenter par le médecin.</li>
                ))}
              </ul>
              <p className="patient-empty-history">
                Aucune vaccination, aucun dépistage ni autre acte n'est présumé effectué ou manquant.
                Aucune échéance, alerte, décision clinique ou transmission à une IA externe n'est générée.
              </p>
            </section>
          )}

          <section aria-label="HELIOS Referral — brouillon documentaire non transmis">
            <h3 className="patient-section-title">HELIOS Referral · préparation d'orientation</h3>
            <p className="patient-empty-history">
              Extraits de la dernière consultation datée de ce dossier, à relire par le médecin
              avant toute éventuelle lettre d'orientation. Ce panneau ne décide pas de l'indication d'adresser.
            </p>
            {referralSource ? (
              <div className="patient-summary-grid">
                <div className="patient-summary-item">
                  <span>Consultation source</span>
                  <strong>{displayDate(referralSource.date)}</strong>
                </div>
                <div className="patient-summary-item">
                  <span>Motif de consultation consigné</span>
                  <strong>{referralSource.recordedMotif ?? 'Non renseigné'}</strong>
                </div>
                <div className="patient-summary-item">
                  <span>Diagnostic consigné (non revalidé)</span>
                  <strong>{referralSource.recordedDiagnosis ?? 'Non renseigné'}</strong>
                </div>
                <div className="patient-summary-item">
                  <span>Conduite à tenir consignée (non revalidée)</span>
                  <strong>{referralSource.recordedPlan ?? 'Non renseigné'}</strong>
                </div>
              </div>
            ) : <p className="patient-empty-history">Aucune consultation datée exploitable pour cette préparation.</p>}
            <p className="patient-empty-history">
              Avant toute orientation, le médecin doit préciser le destinataire, l'objectif,
              le niveau d'urgence et les informations pertinentes à partager. Aucun document n'est
              créé, aucune donnée n'est transmise et aucune décision médicale n'est générée ici.
            </p>
          </section>

          <LocalDocumentReader key={selected.id} />

          <section aria-label="HELIOS Parcours spécialisés — consultations consignées">
            <h3 className="patient-section-title">HELIOS Parcours spécialisés · consultations documentées</h3>
            <p className="patient-empty-history">
              Regroupement des consultations enregistrées dans ce seul dossier par spécialité saisie.
              Le nombre de visites ne confirme ni une maladie, ni un suivi spécialisé actif, ni une prise en charge recommandée.
            </p>
            {documentedSpecialties.length === 0 ? (
              <p className="patient-empty-history">Aucune consultation à regrouper.</p>
            ) : (
              <div className="patient-summary-grid">
                {documentedSpecialties.map((path) => (
                  <div className="patient-summary-item" key={path.specialty}>
                    <span>Spécialité déclarée</span>
                    <strong>{path.specialty}</strong>
                    <p>{path.count} consultation(s) consignée(s)</p>
                    <small>Dernière date enregistrée : {path.lastConsultationDate
                      ? displayDate(path.lastConsultationDate) : 'Non renseignée'}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <h3 className="patient-section-title">Résumé du suivi</h3>
          <div className="patient-summary-grid">
            <div className="patient-summary-item"><span>Consultations</span><strong>{patientConsultations.length}</strong></div>
            <div className="patient-summary-item"><span>Ordonnances</span><strong>{patientPrescriptions.length}</strong></div>
            <div className="patient-summary-item"><span>Dernière consultation</span><strong>{lastVisitByPatient[selected.id] ? displayDate(lastVisitByPatient[selected.id]) : 'Aucune'}</strong></div>
            <div className="patient-summary-item"><span>Dernière ordonnance</span><strong>{patientPrescriptions[0] ? displayDate(patientPrescriptions[0].date) : 'Aucune'}</strong></div>
          </div>

          <h3 className="patient-section-title">Dernières constantes disponibles</h3>
          {!latestVitals || Object.keys(latestVitals).length === 0 ? (
            <p className="patient-empty-history">Aucune constante vitale enregistrée.</p>
          ) : (
            <div className="patient-vitals-grid">
              {vitalLabels.filter((field) => Boolean(latestVitals[field.key]?.value)).map((field) => (
                <div className="patient-vital" key={field.key}>
                  <span>{field.label}</span>
                  <strong>{latestVitals[field.key]?.value} {field.unit}</strong>
                  <small>Mesurée le {displayDate(latestVitals[field.key]?.date ?? 'Date non renseignée')}</small>
                </div>
              ))}
            </div>
          )}

          <h3 className="patient-section-title">Évolution des constantes</h3>
          <div className="patient-trends-grid">
            {renderTrendChart('Poids', 'kg', 'weight')}
            {renderTrendChart('Pression systolique', 'mmHg', 'systolic')}
            {renderTrendChart('Pression diastolique', 'mmHg', 'diastolic')}
            {patientConsultations.some((consultation) => String(consultation.vitals.glycemia ?? '').trim() !== '') &&
              renderTrendChart('Glycémie', 'g/L', 'glycemia')}
            {renderTrendChart('Fréquence cardiaque', 'bpm', 'heartRate')}
            {renderTrendChart('Saturation en oxygène (SpO₂)', '%', 'spo2')}
          </div>

          <section aria-label="HELIOS Trends — comparaison descriptive des mesures">
            <h3 className="patient-section-title">HELIOS Trends · comparaison des deux dernières mesures</h3>
            <p className="patient-empty-history">
              Différences numériques entre deux consultations enregistrées, avec dates et unités.
              Ces écarts ne constituent ni une tendance cliniquement validée, ni une alerte, ni une recommandation.
            </p>
            {recordedVitalComparisons.length === 0 ? (
              <p className="patient-empty-history">Deux mesures numériques datées sont nécessaires pour comparer chaque constante.</p>
            ) : (
              <div className="patient-trends-grid">
                {recordedVitalComparisons.map((comparison) => (
                  <div className="patient-trend-card" key={comparison.key}>
                    <strong>{comparison.label}</strong>
                    <span>Plus récente : {comparison.recent.value} {comparison.unit} · {displayDate(comparison.recent.date)}</span>
                    <span>Précédente : {comparison.previous.value} {comparison.unit} · {displayDate(comparison.previous.date)}</span>
                    <span>Écart brut : {comparison.difference > 0 ? '+' : ''}{comparison.difference} {comparison.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <h3 className="patient-section-title">Chronologie médicale ({medicalTimeline.length} événements)</h3>
          {medicalTimeline.length === 0 ? (
            <p className="patient-empty-history">Aucune consultation ni ordonnance enregistrée pour ce patient.</p>
          ) : (
            medicalTimeline.map((entry) => (
              <article className="patient-timeline-entry" key={`${entry.type}-${entry.id}`}>
                {entry.type === 'consultation' ? (
                  <>
                    <span className="patient-timeline-kind">Consultation</span>
                    <strong>{entry.consultation.motif || 'Consultation'}</strong>
                    <span>{displayRecordedDate(entry.date)}</span>
                    <span><b>Spécialité :</b> {entry.consultation.specialty?.trim() || 'Non renseignée'}</span>
                    {entry.consultation.symptoms && <p><b>Symptômes :</b> {entry.consultation.symptoms}</p>}
                    {entry.consultation.history && <p><b>Antécédents / traitements :</b> {entry.consultation.history}</p>}
                    {entry.consultation.examination && <p><b>Examen clinique :</b> {entry.consultation.examination}</p>}
                    {entry.consultation.diagnosis && <p><b>Diagnostic :</b> {entry.consultation.diagnosis}</p>}
                    {entry.consultation.plan && <p><b>Conduite à tenir :</b> {entry.consultation.plan}</p>}
                  </>
                ) : (
                  <>
                    <span className="patient-timeline-kind">Ordonnance</span>
                    <strong>Ordonnance médicale</strong>
                    <span>{displayRecordedDate(entry.date)}</span>
                    <span><b>Statut documentaire :</b> {documentedPrescriptionStatus(entry.prescription.status)}</span>
                    <span>{Array.isArray(entry.prescription.medications)
                      ? entry.prescription.medications.length : 0} médicament(s) consigné(s)</span>
                    {Array.isArray(entry.prescription.medications) && entry.prescription.medications.length > 0 && (
                      <ul className="patient-medication-list">
                        {entry.prescription.medications.map((medication) => (
                          <li key={medication.id}>
                            {medication.name} — {medication.dosage}; {medication.frequency}; durée : {medication.duration}
                          </li>
                        ))}
                      </ul>
                    )}
                    {documentedSupplementalOrders(entry.prescription).length > 0 && (
                      <div>
                        <strong>Examens et autres éléments prescrits (non présumés réalisés)</strong>
                        <ul className="patient-medication-list">
                          {documentedSupplementalOrders(entry.prescription).map((item, index) => (
                            <li key={item.id + '-' + index}>
                              <b>{item.label} :</b> {item.name}{item.details ? ' — ' + item.details : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.prescription.advice && <p><b>Conseils :</b> {entry.prescription.advice}</p>}
                  </>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
