import { useMemo, useState } from 'react';
import { useMedicalData } from '../hooks/useMedicalData';
import type { Patient } from '../types/medical';

export default function Patients() {
  const { patients, consultations, prescriptions, addPatient, updatePatient } = useMedicalData();

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

  const medicalTimeline = [
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
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastVisitByPatient = useMemo(() => {
    const result: Record<string, string> = {};
    const ordered = [...consultations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    ordered.forEach((consultation) => {
      if (consultation.patientId && !result[consultation.patientId]) {
        result[consultation.patientId] = consultation.date;
      }
    });

    return result;
  }, [consultations]);

  const latestVitals = selected
    ? patientConsultations.reduce(
        (latest, consultation) => {
          (Object.keys(latest) as (keyof typeof latest)[]).forEach((key) => {
            const currentValue = String(consultation.vitals[key] ?? '').trim();
            if (!String(latest[key] ?? '').trim() && currentValue) {
              latest[key] = currentValue;
            }
          });
          return latest;
        },
        {
          systolic: '',
          diastolic: '',
          heartRate: '',
          spo2: '',
          temperature: '',
          respiratoryRate: '',
          weight: '',
          height: '',
          glycemia: '',
        }
      )
    : null;

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
    updatePatient(selected.id, {
      name: editName.trim(),
      age: numericAge,
      sex: editSex.trim() || 'Non renseigné',
      phone: editPhone.trim() || 'Non renseigné',
      status: editStatus.trim() || 'Actif',
    });
    setShowEditForm(false);
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
                  ? new Date(lastVisitByPatient[patient.id]).toLocaleDateString('fr-FR')
                  : 'Aucune visite'}
              </div>
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="patient-view" onClick={beginEditPatient}>Modifier le patient</button>
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

          <h3 className="patient-section-title">Résumé du suivi</h3>
          <div className="patient-summary-grid">
            <div className="patient-summary-item"><span>Consultations</span><strong>{patientConsultations.length}</strong></div>
            <div className="patient-summary-item"><span>Ordonnances</span><strong>{patientPrescriptions.length}</strong></div>
            <div className="patient-summary-item"><span>Dernière consultation</span><strong>{lastVisitByPatient[selected.id] ? displayDate(lastVisitByPatient[selected.id]) : 'Aucune'}</strong></div>
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
                    <span>{displayDate(entry.date)}</span>
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
                    <span>{displayDate(entry.date)}</span>
                    <span>{entry.prescription.medications.length} médicament(s)</span>
                    {entry.prescription.medications.length > 0 && (
                      <ul className="patient-medication-list">
                        {entry.prescription.medications.map((medication) => (
                          <li key={medication.id}>
                            {medication.name} — {medication.dosage}; {medication.frequency}; durée : {medication.duration}
                          </li>
                        ))}
                      </ul>
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
