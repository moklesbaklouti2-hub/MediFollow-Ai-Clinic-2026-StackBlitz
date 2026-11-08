import { useEffect, useState } from 'react';

type DashboardProps = {
  patientCount: number;
  consultationCount: number;
  onStartConsultation: () => void;
};

type ConsultationRecord = {
  id: string;
  date: string;
  patient: string;
  motif: string;
  diagnosis?: string;
};

type DashboardData = {
  patients: number;
  consultations: number;
  prescriptions: number;
  recentConsultations: ConsultationRecord[];
};

function readArray(key: string): unknown[] | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return null;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Erreur de lecture du tableau de bord :', error);
    return null;
  }
}

function loadDashboardData(
  patientFallback: number,
  consultationFallback: number
): DashboardData {
  const patients = readArray('medifollow-patients');
  const consultations = readArray('medifollow-consultations');
  const prescriptions = readArray('medifollow-prescriptions');

  const validConsultations = (consultations || []) as ConsultationRecord[];

  return {
    patients: patients === null ? patientFallback : patients.length,
    consultations:
      consultations === null
        ? consultationFallback
        : consultations.length,
    prescriptions: prescriptions === null ? 0 : prescriptions.length,
    recentConsultations: validConsultations
      .filter((item) => item && item.date && item.patient)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 5),
  };
}

export default function Dashboard({
  patientCount,
  consultationCount,
  onStartConsultation,
}: DashboardProps) {
  const [data, setData] = useState<DashboardData>(() =>
    loadDashboardData(patientCount, consultationCount)
  );

  useEffect(() => {
    function refreshData() {
      setData(
        loadDashboardData(patientCount, consultationCount)
      );
    }

    refreshData();

    window.addEventListener('storage', refreshData);
    window.addEventListener('focus', refreshData);

    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('focus', refreshData);
    };
  }, [patientCount, consultationCount]);

  return (
    <section className="dashboard">
      <style>{`
        .mf-dashboard {
          display: grid;
          gap: 22px;
          color: var(--text-primary, #20334b);
        }

        .mf-welcome {
          padding: 28px;
          border-radius: 20px;
          background: linear-gradient(120deg, #172b36, #245064);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .mf-welcome h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        .mf-welcome p {
          margin: 0;
          color: #c8e5e2;
        }

        .mf-button {
          border: 0;
          border-radius: 12px;
          background: #42d5b4;
          color: #12332f;
          padding: 13px 19px;
          font-weight: 700;
          cursor: pointer;
        }

        .mf-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .mf-stat, .mf-panel {
          background: var(--surface, white);
          border: 1px solid var(--border, #e5ebef);
          border-radius: 18px;
          padding: 21px;
          min-width: 0;
        }

        .mf-stat span {
          color: #718096;
          font-size: 13px;
        }

        .mf-stat strong {
          display: block;
          margin-top: 10px;
          font-size: 30px;
          color: var(--text-primary, #20334b);
        }

        .mf-panel h3 {
          margin: 0 0 5px;
          font-size: 18px;
        }

        .mf-panel-subtitle {
          margin: 0 0 17px;
          color: #81909c;
          font-size: 13px;
        }

        .mf-activity-list {
          display: grid;
          gap: 11px;
        }

        .mf-activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border: 1px solid var(--border, #e5ebef);
          border-radius: 11px;
        }

        .mf-activity-item strong {
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .mf-activity-item span {
          color: #81909c;
          font-size: 12px;
        }

        .mf-activity-badge {
          background: #e2f8f1;
          color: #21866e !important;
          padding: 7px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .mf-empty {
          color: #81909c;
          font-size: 13px;
          padding: 12px 0;
        }

        @media (max-width: 700px) {
          .mf-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .mf-stat, .mf-panel {
            padding: 15px;
          }

          .mf-welcome {
            padding: 21px;
          }

          .mf-welcome h2 {
            font-size: 21px;
          }
        }

        @media (max-width: 380px) {
          .mf-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="mf-dashboard">

        <div className="mf-welcome">
          <div>
            <h2>Bienvenue sur MediFollow AI</h2>
            <p>Votre espace intelligent de suivi médical.</p>
          </div>

          <button
            className="mf-button"
            onClick={onStartConsultation}
          >
            + Nouvelle consultation
          </button>
        </div>

        <div className="mf-stats">

          <div className="mf-stat">
            <span>Patients enregistrés</span>
            <strong>{data.patients}</strong>
          </div>

          <div className="mf-stat">
            <span>Consultations</span>
            <strong>{data.consultations}</strong>
          </div>

          <div className="mf-stat">
            <span>Ordonnances</span>
            <strong>{data.prescriptions}</strong>
          </div>

        </div>

        <div className="mf-panel">
          <h3>Dernières consultations</h3>

          <p className="mf-panel-subtitle">
            Historique réel des consultations enregistrées.
          </p>

          {data.recentConsultations.length === 0 ? (
            <div className="mf-empty">
              Aucune consultation enregistrée pour le moment.
            </div>
          ) : (
            <div className="mf-activity-list">
              {data.recentConsultations.map((item) => (
                <div className="mf-activity-item" key={item.id}>
                  <div>
                    <strong>{item.patient}</strong>

                    <span>
                      {item.motif}
                      {' · '}
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  <span className="mf-activity-badge">
                    Consultation
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
