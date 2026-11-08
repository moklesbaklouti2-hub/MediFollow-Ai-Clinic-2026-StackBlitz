import { useEffect, useMemo, useState } from 'react';

type DashboardProps = {
  patientCount: number;
  consultationCount: number;
  onStartConsultation: () => void;
  onOpenCopilot: () => void;
  onOpenPatients: () => void;
};

type PatientRecord = {
  id: string;
  name: string;
  status?: string;
};

type ConsultationRecord = {
  id: string;
  date: string;
  patient: string;
  motif: string;
  diagnosis?: string;
  vitals?: {
    systolic?: string;
    diastolic?: string;
    heartRate?: string;
    spo2?: string;
    temperature?: string;
    respiratoryRate?: string;
    weight?: string;
    glycemia?: string;
  };
};

type PrescriptionRecord = { id: string; date?: string };

type DashboardData = {
  patients: PatientRecord[];
  consultations: ConsultationRecord[];
  prescriptions: PrescriptionRecord[];
};

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function loadDashboardData(patientFallback: number, consultationFallback: number): DashboardData {
  const patients = readArray<PatientRecord>('medifollow-patients');
  const consultations = readArray<ConsultationRecord>('medifollow-consultations');
  const prescriptions = readArray<PrescriptionRecord>('medifollow-prescriptions');
  return {
    patients: patients.length ? patients : Array.from({ length: patientFallback }, (_, i) => ({ id: String(i), name: '' })),
    consultations: consultations.length ? consultations : Array.from({ length: consultationFallback }, (_, i) => ({ id: String(i), date: '', patient: '', motif: '' })),
    prescriptions,
  };
}

function BrainArtwork() {
  return (
    <img
      className="mf-brain-art mf-stethoscope-art mf-stethoscope-photo"
      src="https://images.unsplash.com/photo-1655913197692-012897652d13?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=75&w=700"
      alt="Photographie d'un stéthoscope médical noir avec pavillon chromé"
      loading="eager"
      decoding="async"
    />
  );
}
function DoctorRobotArtwork() {
  return (
    <svg className="mf-doctor-robot" viewBox="0 0 260 290" role="img" aria-label="Robot assistant médical en blouse blanche avec stéthoscope">
      <defs>
        <linearGradient id="mfRobotCoat" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffffff"/><stop offset=".55" stopColor="#d9f2ff"/><stop offset="1" stopColor="#8ec9e8"/></linearGradient>
        <linearGradient id="mfRobotMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b9fbff"/><stop offset=".5" stopColor="#24c8f2"/><stop offset="1" stopColor="#1472bf"/></linearGradient>
        <radialGradient id="mfRobotAura"><stop stopColor="#00dfff" stopOpacity=".34"/><stop offset="1" stopColor="#00dfff" stopOpacity="0"/></radialGradient>
        <filter id="mfRobotGlow"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <ellipse cx="130" cy="152" rx="119" ry="132" fill="url(#mfRobotAura)"/>
      <ellipse cx="130" cy="271" rx="75" ry="10" fill="#00b9ed" opacity=".24" filter="url(#mfRobotGlow)"/>
      <path d="M104 66V48M156 66V48" stroke="#7beaff" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="104" cy="43" r="7" fill="#0d5e93" stroke="#a8f6ff" strokeWidth="3"/>
      <circle cx="156" cy="43" r="7" fill="#0d5e93" stroke="#a8f6ff" strokeWidth="3"/>
      <rect x="77" y="58" width="106" height="94" rx="35" fill="url(#mfRobotMetal)" stroke="#9af5ff" strokeWidth="3"/>
      <rect x="87" y="70" width="86" height="66" rx="25" fill="#082b50" stroke="#4fdcf8" strokeWidth="2"/>
      <ellipse cx="111" cy="101" rx="8" ry="11" fill="#b5fbff"/>
      <ellipse cx="149" cy="101" rx="8" ry="11" fill="#b5fbff"/>
      <path d="M113 120q17 13 34 0" fill="none" stroke="#4ce7e0" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="92" cy="112" r="4" fill="#00e6c3"/><circle cx="168" cy="112" r="4" fill="#00e6c3"/>
      <path d="M64 177q7-25 34-29h64q27 4 34 29l18 82H46Z" fill="url(#mfRobotCoat)" stroke="#bcecff" strokeWidth="3"/>
      <path d="M99 151l31 33 31-33-10 108h-42Z" fill="#f8fdff" stroke="#b5dff4" strokeWidth="2"/>
      <path d="M130 184v74" stroke="#8bbbd5" strokeWidth="2"/>
      <path d="M95 163q-23 28-25 74M165 163q23 28 25 74" fill="none" stroke="#9bcce5" strokeWidth="4" strokeLinecap="round"/>
      <path d="M103 169q-13 15-13 40t16 29q15 7 24-10" fill="none" stroke="#118fc4" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="130" cy="228" r="9" fill="#0c5684" stroke="#65eaff" strokeWidth="3"/>
      <path d="M130 219v-9q0-8 9-8h8" fill="none" stroke="#168fc7" strokeWidth="4" strokeLinecap="round"/>
      <path d="M115 188h10v13h-10z" fill="#168fc7" opacity=".75"/>
      <path d="M139 188h10v13h-10z" fill="#168fc7" opacity=".75"/>
      <circle cx="130" cy="17" r="3" fill="#b5fbff"/><circle cx="36" cy="115" r="3" fill="#6feaff"/><circle cx="218" cy="92" r="3" fill="#00e6c3"/>
    </svg>
  );
}

export default function Dashboard({ patientCount, consultationCount, onStartConsultation, onOpenCopilot, onOpenPatients }: DashboardProps) {
  const [data, setData] = useState<DashboardData>(() => loadDashboardData(patientCount, consultationCount));

  useEffect(() => {
    const refresh = () => setData(loadDashboardData(patientCount, consultationCount));
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('medifollow:data-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('medifollow:data-updated', refresh);
    };
  }, [patientCount, consultationCount]);

  const now = new Date();
  const currentMonth = data.consultations.filter(item => {
    if (!item.date) return false;
    const date = new Date(item.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const followUpCount = data.patients.filter(item => /suivi|actif|en cours/i.test(item.status || '')).length;
  const validConsultations = data.consultations.filter(item => item.date && item.patient)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentConsultations = validConsultations.slice(0, 4);
  const latestVitals = validConsultations.find(item => item.vitals)?.vitals || {};

  const monthlyActivity = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      label: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      count: data.consultations.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
      }).length,
    };
  }), [data.consultations]);

  const maxActivity = Math.max(1, ...monthlyActivity.map(item => item.count));
  const chartPoints = monthlyActivity.map((item, index) => ({
    ...item, x: 28 + index * 92, y: 122 - (item.count / maxActivity) * 88,
  }));
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const indicators = [
    { label: 'Tension artérielle', value: latestVitals.systolic && latestVitals.diastolic ? `${latestVitals.systolic}/${latestVitals.diastolic}` : '—', unit: 'mmHg', icon: '♥', tone: 'blue' },
    { label: 'Fréquence cardiaque', value: latestVitals.heartRate || '—', unit: 'bpm', icon: '⌁', tone: 'teal' },
    { label: 'Saturation SpO₂', value: latestVitals.spo2 || '—', unit: '%', icon: '◉', tone: 'violet' },
    { label: 'Température', value: latestVitals.temperature || '—', unit: '°C', icon: '♨', tone: 'amber' },
  ];

  return (
    <section className="dashboard mf-dashboard-page">
      <div className="mf-dashboard">
        <section className="mf-hero">
          <div className="mf-hero-copy">
            <span className="mf-eyebrow">PLATEFORME D'INTELLIGENCE MÉDICALE</span>
            <h2>MediFollow <em>AI</em></h2>
            <p>Ensemble pour votre santé.<br />L'intelligence au service du soin.</p>
            <div className="mf-hero-meta"><span className="mf-live-dot" /> Votre espace clinique · {monthName}</div>
          </div>
          <div className="mf-hero-art" aria-hidden="true">
            <div className="mf-hero-orbit mf-hero-orbit-one" />
            <div className="mf-hero-orbit mf-hero-orbit-two" />
            <div className="mf-hero-ecg">⌁</div>
            <BrainArtwork />
          </div>
          <div className="mf-hero-badge">✦ &nbsp; CLINICAL AI WORKSPACE</div>
        </section>

        <section className="mf-stats" aria-label="Indicateurs du cabinet">
          <article className="mf-stat mf-stat-blue">
            <div className="mf-stat-top"><span className="mf-stat-icon">♙</span><span className="mf-stat-kicker">BASE PATIENTS</span></div>
            <strong>{data.patients.length.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Patients inscrits</span>
            <div className="mf-stat-foot"><span>Dossiers patients</span><i>●</i></div>
          </article>
          <article className="mf-stat mf-stat-teal">
            <div className="mf-stat-top"><span className="mf-stat-icon">✚</span><span className="mf-stat-kicker">ACTIVITÉ DU MOIS</span></div>
            <strong>{currentMonth.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Consultations ce mois</span>
            <div className="mf-stat-foot"><span>{monthName}</span><i>●</i></div>
          </article>
          <article className="mf-stat mf-stat-violet">
            <div className="mf-stat-top"><span className="mf-stat-icon">▤</span><span className="mf-stat-kicker">PRESCRIPTIONS</span></div>
            <strong>{data.prescriptions.length.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Ordonnances émises</span>
            <div className="mf-stat-foot"><span>Historique enregistré</span><i>●</i></div>
          </article>
          <article className="mf-stat mf-stat-amber">
            <div className="mf-stat-top"><span className="mf-stat-icon">◷</span><span className="mf-stat-kicker">SUIVI CLINIQUE</span></div>
            <strong>{followUpCount.toLocaleString('fr-FR')}</strong>
            <span className="mf-stat-label">Suivi des patients</span>
            <div className="mf-stat-foot"><span>Dossiers actifs ou en suivi</span><i>●</i></div>
          </article>
        </section>

        <section className="mf-dashboard-grid">
          <article className="mf-panel mf-chart-panel">
            <div className="mf-panel-heading"><div><span className="mf-panel-overline">ANALYSE DE L'ACTIVITÉ</span><h3>Graphique des consultations</h3></div><span className="mf-panel-chip">6 derniers mois</span></div>
            <div className="mf-chart-legend"><span><i className="legend-cyan" /> Consultations</span><span className="mf-chart-note">Historique réel</span></div>
            <div className="mf-chart-wrap">
              <svg viewBox="0 0 520 150" preserveAspectRatio="none" aria-label="Graphique des consultations mensuelles">
                <defs><linearGradient id="mfChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#12dfff" stopOpacity=".42"/><stop offset="1" stopColor="#12dfff" stopOpacity="0"/></linearGradient></defs>
                {[28, 58, 88, 118].map(y => <line key={y} x1="20" x2="510" y1={y} y2={y} className="mf-chart-gridline"/>)}
                <polygon points={`20,130 ${chartPoints.map(p => `${p.x},${p.y}`).join(' ')} 488,130`} className="mf-chart-area"/>
                <polyline points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')} className="mf-chart-line"/>
                {chartPoints.map(p => <circle key={p.label} cx={p.x} cy={p.y} r="5" className="mf-chart-point"/>)}
              </svg>
            </div>
            <div className="mf-chart-labels">{chartPoints.map(point => <span key={point.label}>{point.label}<b>{point.count}</b></span>)}</div>
          </article>

          <article className="mf-panel mf-appointments-panel">
            <div className="mf-panel-heading"><div><span className="mf-panel-overline">AGENDA CLINIQUE</span><h3>Prochains rendez-vous</h3></div><span className="mf-panel-count">—</span></div>
            <div className="mf-empty-state mf-appointment-empty"><span>◷</span><strong>Aucun rendez-vous planifié</strong><p>Les rendez-vous apparaîtront ici lorsque le calendrier sera activé.</p></div>
          </article>

          <article className="mf-panel mf-quick-panel">
            <div className="mf-panel-heading"><div><span className="mf-panel-overline">VOTRE ESPACE DE TRAVAIL</span><h3>Accès rapides</h3></div></div>
            <button className="mf-quick-action mf-quick-primary" onClick={onStartConsultation}><span>✚</span><div><strong>Nouvelle consultation</strong><small>Ouvrir un dossier clinique</small></div><b>→</b></button>
            <button className="mf-quick-action" onClick={onOpenPatients}><span>♙</span><div><strong>Nouveau patient</strong><small>Accéder à la gestion des patients</small></div><b>→</b></button>
            <button className="mf-quick-action" onClick={onOpenCopilot}><span>✧</span><div><strong>Copilote IA</strong><small>Assistance clinique intelligente</small></div><b>→</b></button>
          </article>

          <article className="mf-copilot-card">
            <div className="mf-copilot-copy">
              <span className="mf-panel-overline">INTELLIGENCE MÉDICALE</span>
              <h3>Votre Copilote IA</h3>
              <p>Votre assistant médical intelligent, à vos côtés à chaque étape de la consultation.</p>
              <ul><li>Analyse d'un cas clinique</li><li>Diagnostic différentiel</li><li>Plan de prise en charge</li></ul>
              <button onClick={onOpenCopilot}>Ouvrir le Copilote <span>→</span></button>
            </div>
            <div className="mf-robot-stage"><div className="mf-robot-halo"/><DoctorRobotArtwork /></div>
          </article>

          <article className="mf-panel mf-indicators-panel">
            <div className="mf-panel-heading"><div><span className="mf-panel-overline">DONNÉES CLINIQUES</span><h3>Indicateurs cliniques clés</h3></div><span className="mf-panel-chip">Dernière consultation</span></div>
            <div className="mf-indicators-grid">
              {indicators.map(item => (
                <div className={`mf-indicator mf-indicator-${item.tone}`} key={item.label}>
                  <span className="mf-indicator-icon">{item.icon}</span>
                  <div><small>{item.label}</small><strong>{item.value}<em>{item.unit}</em></strong></div>
                </div>
              ))}
            </div>
            <p className="mf-indicator-note">Valeurs issues de la dernière consultation contenant des constantes renseignées. « — » signifie non renseigné.</p>
          </article>
        </section>

        <section className="mf-panel mf-recent-panel">
          <div className="mf-panel-heading"><div><span className="mf-panel-overline">HISTORIQUE CLINIQUE</span><h3>Consultations récentes</h3></div><span className="mf-panel-count">{recentConsultations.length}</span></div>
          {recentConsultations.length === 0 ? (
            <div className="mf-empty-state"><span>◷</span><strong>Aucune consultation enregistrée</strong><p>Vos consultations récentes apparaîtront ici.</p></div>
          ) : (
            <div className="mf-activity-list">
              {recentConsultations.map((item, index) => (
                <div className="mf-activity-item" key={item.id}>
                  <span className={`mf-activity-avatar mf-avatar-${index % 4}`}>{(item.patient || '?').trim().charAt(0).toUpperCase()}</span>
                  <div className="mf-activity-copy"><strong>{item.patient}</strong><span>{item.motif || 'Motif non renseigné'}</span><small>{new Date(item.date).toLocaleDateString('fr-FR')}</small></div>
                  <span className="mf-activity-arrow">↗</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mf-dashboard-footer"><span>◈ &nbsp; Sécurité & confidentialité</span><i/><strong>MediFollow AI</strong><span>Ensemble pour votre santé <b>♡</b></span></footer>
      </div>
    </section>
  );
}
