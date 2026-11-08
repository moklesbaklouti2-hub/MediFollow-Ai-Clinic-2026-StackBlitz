
import { useMemo, useState } from 'react';
import { useMedicalData } from '../hooks/useMedicalData';
import type { Patient } from '../types/medical';

export default function Patients() {
  const {
    patients,
    consultations,
    addPatient,
  } = useMedicalData();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = patients.find(
    (patient) => patient.id === selectedId
  ) ?? null;

  const filtered = useMemo(
    () =>
      patients.filter((patient) =>
        `${patient.name} ${patient.phone}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [patients, search]
  );

  const patientConsultations = selected
    ? consultations
        .filter((item) => item.patientId === selected.id)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        )
    : [];

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

  return (
    <section className="patients-page">
      <style>{`
        .patients-page {
          display:grid;
          gap:22px;
          color:var(--text-primary,#20334b);
        }

        .patients-heading {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap;
        }

        .patients-heading h2 {
          margin:0 0 6px;
          font-size:25px;
        }

        .patients-heading p {
          margin:0;
          color:#81909c;
        }

        .patients-action {
          background:#42d5b4;
          color:#12332f;
          border:0;
          border-radius:11px;
          padding:12px 18px;
          font-weight:700;
          cursor:pointer;
        }

        .patients-toolbar {
          display:flex;
          gap:12px;
          flex-wrap:wrap;
        }

        .patients-search {
          flex:1;
          min-width:200px;
          padding:13px 15px;
          border:1px solid var(--border,#e5ebef);
          border-radius:12px;
          background:var(--surface,#fff);
          color:inherit;
          font:inherit;
        }

        .patients-count {
          padding:18px;
          border-radius:15px;
          background:var(--surface,#fff);
          border:1px solid var(--border,#e5ebef);
        }

        .patients-count strong {
          font-size:25px;
          display:block;
        }

        .patients-count span {
          color:#81909c;
          font-size:13px;
        }

        .patients-list {
          display:grid;
          gap:12px;
        }

        .patient-card {
          background:var(--surface,#fff);
          border:1px solid var(--border,#e5ebef);
          border-radius:16px;
          padding:17px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }

        .patient-name {
          font-weight:700;
          margin-bottom:5px;
        }

        .patient-meta {
          color:#81909c;
          font-size:13px;
        }

        .patient-status {
          background:#e2f8f1;
          color:#21866e;
          border-radius:20px;
          padding:6px 11px;
          font-size:12px;
          font-weight:600;
        }

        .patient-view {
          border:1px solid #42d5b4;
          background:transparent;
          color:inherit;
          border-radius:9px;
          padding:8px 12px;
          cursor:pointer;
        }

        .patient-form {
          display:grid;
          gap:12px;
          padding:20px;
          background:var(--surface,#fff);
          border:1px solid var(--border,#e5ebef);
          border-radius:16px;
        }

        .patient-form input {
          width:100%;
          box-sizing:border-box;
          padding:12px;
          border:1px solid var(--border,#dce4e8);
          border-radius:10px;
          background:var(--surface,#fff);
          color:inherit;
          font:inherit;
        }

        .patient-detail {
          padding:20px;
          border-radius:14px;
          background:var(--surface,#fff);
          border:1px solid var(--border,#e5ebef);
          display:grid;
          gap:12px;
        }

        .patient-detail h3 {
          margin:0;
        }

        .patient-detail p {
          margin:0;
        }

        .patient-history-title {
          margin:10px 0 0;
          padding-top:15px;
          border-top:1px solid var(--border,#e5ebef);
        }

        .patient-consultation {
          padding:14px;
          border:1px solid var(--border,#e5ebef);
          border-radius:12px;
          display:grid;
          gap:7px;
        }

        .patient-consultation strong {
          font-size:14px;
        }

        .patient-consultation span {
          font-size:12px;
          color:#81909c;
        }

        .patient-consultation p {
          font-size:13px;
          line-height:1.5;
        }

        .patient-empty-history {
          color:#81909c;
          font-size:13px;
        }

        @media(max-width:550px) {
          .patient-card {
            align-items:flex-start;
          }
        }
      `}</style>

      <header className="patients-heading">
        <div>
          <h2>Gestion des patients</h2>
          <p>Consultez et gérez vos dossiers patients.</p>
        </div>

        <button
          className="patients-action"
          onClick={() => setShowForm(!showForm)}
        >
          + Nouveau patient
        </button>
      </header>

      <div className="patients-count">
        <strong>{patients.length}</strong>
        <span>Patients enregistrés localement</span>
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

          <input
            placeholder="Nom et prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            placeholder="Âge"
            type="number"
            min="0"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <input
            placeholder="Téléphone (facultatif)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <button
            className="patients-action"
            onClick={addNewPatient}
          >
            Enregistrer le patient
          </button>
        </div>
      )}

      <div className="patients-list">
        {filtered.map((patient: Patient) => (
          <article className="patient-card" key={patient.id}>
            <div>
              <div className="patient-name">{patient.name}</div>

              <div className="patient-meta">
                {patient.age} ans · {patient.sex} · {patient.phone}
              </div>

              <div className="patient-meta">
                Dernière visite : {patient.lastVisit}
              </div>
            </div>

            <span className="patient-status">
              {patient.status}
            </span>

            <button
              className="patient-view"
              onClick={() => setSelectedId(patient.id)}
            >
              Voir le dossier
            </button>
          </article>
        ))}

        {filtered.length === 0 && (
          <p>Aucun patient trouvé.</p>
        )}
      </div>

      {selected && (
        <div className="patient-detail">
          <h3>Dossier de {selected.name}</h3>

          <p>Âge : {selected.age} ans</p>
          <p>Sexe : {selected.sex}</p>
          <p>Téléphone : {selected.phone}</p>
          <p>Statut : {selected.status}</p>

          <h3 className="patient-history-title">
            Historique médical ({patientConsultations.length})
          </h3>

          {patientConsultations.length === 0 ? (
            <p className="patient-empty-history">
              Aucune consultation enregistrée pour ce patient.
            </p>
          ) : (
            patientConsultations.map((consultation) => (
              <article
                className="patient-consultation"
                key={consultation.id}
              >
                <strong>{consultation.motif}</strong>

                <span>
                  {new Date(consultation.date).toLocaleString('fr-FR')}
                </span>

                {consultation.diagnosis && (
                  <p>
                    <b>Diagnostic :</b> {consultation.diagnosis}
                  </p>
                )}

                {consultation.plan && (
                  <p>
                    <b>Prise en charge :</b> {consultation.plan}
                  </p>
                )}
              </article>
            ))
          )}

          <button
            className="patient-view"
            onClick={() => setSelectedId(null)}
          >
            Fermer le dossier
          </button>
        </div>
      )}
    </section>
  );
}

