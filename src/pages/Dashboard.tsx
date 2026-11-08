import { useEffect, useMemo, useState } from 'react';

type DashboardProps = {
  patientCount: number;
  consultationCount: number;
  onStartConsultation: () => void;
  onOpenCopilot: () => void;
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
  monthlyActivity: { label: string; count: number }[];
  last30Days: number;
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

function loadDashboardData(patientFallback: number, consultationFallback: number): DashboardData {
  const patients = readArray('medifollow-patients');
  const consultations = readArray('medifollow-consultations');
  const prescriptions = readArray('medifollow-prescriptions');
  const valid = ((consultations || []) as ConsultationRecord[])
    .filter((item) => item && item.date && item.patient)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const now = new Date();
  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const count = valid.filter((item) => {
      const date = new Date(item.date);
      return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
    }).length;
    return {
      label: monthDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      count,
    };
  });

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  return {
    patients: patients === null ? patientFallback : patients.length,
    consultations: consultations === null ? consultationFallback : consultations.length,
    prescriptions: prescriptions === null ? 0 : prescriptions.length,
    recentConsultations: valid.slice(0, 5),
    monthlyActivity,
    last30Days: valid.filter((item) => new Date(item.date) >= thirtyDaysAgo && new Date(item.date) <= now).length,
  };
}

export default function Dashboard({
  patientCount,
  consultationCount,
  onStartConsultation,
  onOpenCopilot,
}: DashboardProps) {
  const [data, setData] = useState<DashboardData>(() => loadDashboardData(patientCount, consultationCount));

  useEffect(() => {
    const refreshData = () => setData(loadDashboardData(patientCount, consultationCount));
    refreshData();
    window.addEventListener('storage', refreshData);
    window.addEventListener('focus', refreshData);
    window.addEventListener('medifollow:data-updated', refreshData);
    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('medifollow:data-updated', refreshData);
    };
  }, [patientCount, consultationCount]);

  const chartPoints = useMemo(() => {
    const max = Math.max(1, ...data.monthlyActivity.map((item) => item.count));
    return data.monthlyActivity.map((item, index) => ({
      ...item,
      x: 24 + index * 92,
      y: 132 - (item.count / max) * 104,
    }));
  }, [data.monthlyActivity]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <section className="dashboard">
      <div className="mf-dashboard">
        <section className="mf-hero">
          <div className="mf-hero-copy">
            <span className="mf-eyebrow">PLATEFORME D'INTELLIGENCE MÉDICALE</span>
            <h2>MediFollow <em>AI</em></h2>
            <p>Une médecine plus intelligente,<br />pour une meilleure santé.</p>
            <div className="mf-hero-meta"><span className="mf-live-dot" /> Votre espace clinique · {today}</div>
          </div>
          <div className="mf-hero-art" aria-hidden="true">
            <div className="mf-hero-orbit mf-hero-orbit-one" />
            <div className="mf-hero-orbit mf-hero-orbit-two" />
            <svg viewBox="0 0 540 190" role="img">
              <defs>
                <linearGradient id="mfEcg" x1="0" x2="1">
                  <stop offset="0" stopColor="#12c9e8" stopOpacity=".15" />
                  <stop offset=".5" stopColor="#31f1df" />
                  <stop offset="1" stopColor="#21a9ff" stopOpacity=".35" />
                </linearGradient>
              </defs>
              <path d="M0 108 H90 L111 108 L128 88 L145 130 L164 24 L184 151 L204 108 H244 L260 96 L274 117 L290 108 H540" fill="none" stroke="url(#mfEcg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0 108 H540" stroke="#4bd8ed" strokeOpacity=".12" strokeWidth="1" />
            </svg>
            <div className="mf-stethoscope-glow"><span>✚</span></div>
          </div>
          <div className="mf-hero-badge">✦ &nbsp; CLINICAL AI WORKSPACE</div>
        </section>

        <section className="mf-stats" aria-label="Statistiques du cabinet">
          <article className="mf-stat mf-stat-blue">
            <div className="mf-stat-top"><span className="mf-stat-icon">♙</span><span className="mf-stat-kicker">BASE PATIENTS</span></div>
            <strong>{data.patients.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Patients enregistrés</span>
            <div className="mf-stat-foot"><span>Dossiers disponibles</span><i>●</i></div>
          </article>
          <article className="mf-stat mf-stat-teal">
            <div className="mf-stat-top"><span className="mf-stat-icon">✚</span><span className="mf-stat-kicker">ACTIVITÉ CLINIQUE</span></div>
            <strong>{data.consultations.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Consultations enregistrées</span>
            <div className="mf-stat-foot"><span>{data.last30Days} sur les 30 derniers jours</span><i>●</i></div>
          </article>
          <article className="mf-stat mf-stat-violet">
            <div className="mf-stat-top"><span className="mf-stat-icon">▤</span><span className="mf-stat-kicker">PRESCRIPTIONS</span></div>
            <strong>{data.prescriptions.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Ordonnances enregistrées</span>
            <div className="mf-stat-foot"><span>Historique des prescriptions</span><i>●</i></div>
          </article>
          <article className="mf-stat mf-stat-amber">
            <div className="mf-stat-top"><span className="mf-stat-icon">◷</span><span className="mf-stat-kicker">SUIVI RÉCENT</span></div>
            <strong>{data.last30Days.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Consultations · 30 jours</span>
            <div className="mf-stat-foot"><span>Activité calculée sur vos dossiers</span><i>●</i></div>
          </article>
        </section>

        <section className="mf-dashboard-grid">
          <article className="mf-panel mf-chart-panel">
            <div className="mf-panel-heading">
              <div><span className="mf-panel-overline">VUE D'ENSEMBLE</span><h3>Évolution de l'activité</h3></div>
              <span className="mf-panel-chip">6 derniers mois</span>
            </div>
            <div className="mf-chart-legend"><span><i className="legend-cyan" /> Consultations</span><span className="mf-chart-note">Données réelles enregistrées</span></div>
            <div className="mf-chart-wrap">
              <svg viewBox="0 0 520 170" preserveAspectRatio="none" aria-label="Consultations mensuelles">
                <defs><linearGradient id="mfChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#13c9ff" stopOpacity=".42" /><stop offset="1" stopColor="#13c9ff" stopOpacity="0" /></linearGradient></defs>
                {[30, 70, 110, 150].map((y) => <line key={y} x1="20" x2="510" y1={y} y2={y} className="mf-chart-gridline" />)}
                <polygon points={`20,150 ${chartPoints.map((p) => `${p.x},${p.y}`).join(' ')} 480,150`} className="mf-chart-area" />
                <polyline points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')} className="mf-chart-line" />
                {chartPoints.map((p) => <circle key={p.label} cx={p.x} cy={p.y} r="4.5" className="mf-chart-point" />)}
              </svg>
            </div>
            <div className="mf-chart-labels">{chartPoints.map((point) => <span key={point.label}>{point.label}<b>{point.count}</b></span>)}</div>
          </article>

          <article className="mf-panel mf-recent-panel">
            <div className="mf-panel-heading">
              <div><span className="mf-panel-overline">DOSSIERS RÉCENTS</span><h3>Dernières consultations</h3></div>
              <span className="mf-panel-count">{data.recentConsultations.length}</span>
            </div>
            {data.recentConsultations.length === 0 ? (
              <div className="mf-empty-state"><span>◷</span><strong>Aucune activité pour le moment</strong><p>Vos consultations enregistrées apparaîtront ici.</p></div>
            ) : (
              <div className="mf-activity-list">
                {data.recentConsultations.map((item, index) => (
                  <div className="mf-activity-item" key={item.id}>
                    <span className={`mf-activity-avatar mf-avatar-${index % 4}`}>{(item.patient || '?').trim().charAt(0).toUpperCase()}</span>
                    <div className="mf-activity-copy"><strong>{item.patient}</strong><span>{item.motif || 'Motif non renseigné'}</span><small>{new Date(item.date).toLocaleDateString('fr-FR')}</small></div>
                    <span className="mf-activity-arrow">↗</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="mf-panel mf-quick-panel">
            <div className="mf-panel-heading"><div><span className="mf-panel-overline">VOTRE ESPACE DE TRAVAIL</span><h3>Accès rapides</h3></div></div>
            <button className="mf-quick-action mf-quick-primary" onClick={onStartConsultation}><span>✚</span><div><strong>Nouvelle consultation</strong><small>Ouvrir le dossier clinique</small></div><b>→</b></button>
            <button className="mf-quick-action" onClick={onOpenCopilot}><span>✧</span><div><strong>Copilote IA</strong><small>Assistance clinique intelligente</small></div><b>→</b></button>
          </article>

          <article className="mf-copilot-card">
            <div className="mf-copilot-orb"><span>✧</span></div>
            <span className="mf-panel-overline">INTELLIGENCE MÉDICALE</span>
            <h3>Votre Copilote IA</h3>
            <p>Un assistant clinique à chaque étape de votre pratique.</p>
            <ul><li>Analyser un dossier clinique</li><li>Explorer un diagnostic différentiel</li><li>Structurer une prise en charge</li></ul>
            <button onClick={onOpenCopilot}>Discuter maintenant <span>→</span></button>
          </article>
        </section>

        <footer className="mf-dashboard-footer">
          <span>◈ &nbsp; Sécurité & confidentialité</span>
          <i />
          <strong>MediFollow AI</strong>
          <span>Ensemble pour votre santé <b>♡</b></span>
        </footer>
      </div>
    </section>
  );
}
