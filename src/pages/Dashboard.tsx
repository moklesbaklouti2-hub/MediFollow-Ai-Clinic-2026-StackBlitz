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
    <svg className="mf-brain-art mf-brain-neon" viewBox="0 0 520 340" role="img" aria-label="Illustration anatomique tridimensionnelle du cerveau humain, relief cortical détaillé et lumière turquoise">
      <defs>
        <radialGradient id="mfBrainVolume" cx="38%" cy="28%" r="78%">
          <stop offset="0" stopColor="#eaffff"/>
          <stop offset=".16" stopColor="#a2fff8"/>
          <stop offset=".38" stopColor="#42e8e1"/>
          <stop offset=".68" stopColor="#119bb9"/>
          <stop offset=".9" stopColor="#07517e"/>
          <stop offset="1" stopColor="#032b50"/>
        </radialGradient>
        <linearGradient id="mfBrainRim" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e4ffff"/><stop offset=".35" stopColor="#6afff1"/>
          <stop offset=".72" stopColor="#0ba9c4"/><stop offset="1" stopColor="#06345f"/>
        </linearGradient>
        <radialGradient id="mfBrainCerebellum" cx="35%" cy="25%" r="85%">
          <stop stopColor="#aafff6"/><stop offset=".42" stopColor="#24c8d1"/>
          <stop offset="1" stopColor="#06416c"/>
        </radialGradient>
        <filter id="mfBrainBloom" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="11" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.02 0 0 0 0 0.86 0 0 0 0 0.88 0 0 0 .82 0" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="mfBrainShadow"><feGaussianBlur stdDeviation="17"/></filter>
        <clipPath id="mfBrainSideClip">
          <path d="M104 189 C83 168 88 136 111 119 C107 91 133 68 163 73 C181 44 219 38 249 52 C277 27 319 39 334 66 C369 56 399 79 401 108 C434 122 445 157 427 182 C443 210 425 239 397 245 C383 274 348 281 321 267 C294 291 258 280 244 261 C216 276 182 262 177 238 C143 248 112 224 104 189 Z"/>
        </clipPath>
      </defs>

      <ellipse cx="264" cy="190" rx="190" ry="125" fill="#00e8e1" opacity=".16" filter="url(#mfBrainShadow)"/>
      <ellipse cx="265" cy="300" rx="142" ry="13" fill="#00d9ed" opacity=".15" filter="url(#mfBrainShadow)"/>

      <g filter="url(#mfBrainBloom)">
        <path d="M104 189 C83 168 88 136 111 119 C107 91 133 68 163 73 C181 44 219 38 249 52 C277 27 319 39 334 66 C369 56 399 79 401 108 C434 122 445 157 427 182 C443 210 425 239 397 245 C383 274 348 281 321 267 C294 291 258 280 244 261 C216 276 182 262 177 238 C143 248 112 224 104 189 Z"
          fill="url(#mfBrainVolume)" stroke="#c9fffb" strokeWidth="3.4"/>
        <path d="M155 91 C177 57 221 57 246 76 C270 48 311 51 326 82 C355 73 385 91 385 119 C414 135 418 164 399 185 C411 211 391 235 365 235 C349 261 317 260 297 243 C273 265 245 249 235 229 C209 245 180 225 183 202 C151 203 136 177 151 155 C131 133 137 108 155 91 Z"
          fill="none" stroke="#e2fffc" strokeWidth="2.1" opacity=".42"/>

        <g clipPath="url(#mfBrainSideClip)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#e4fffc" strokeWidth="5.2" opacity=".76">
            <path d="M101 126 C123 94 158 93 169 119 C180 145 148 163 130 145 C111 126 128 94 151 82"/>
            <path d="M158 76 C183 86 196 108 181 129 C166 151 143 138 148 116"/>
            <path d="M205 49 C231 66 235 91 214 108 C192 126 174 106 186 84"/>
            <path d="M257 48 C281 64 286 91 266 107 C244 125 225 107 237 85"/>
            <path d="M306 54 C328 73 326 98 304 111 C283 124 269 105 282 85"/>
            <path d="M354 72 C373 92 366 116 345 125 C323 135 311 115 325 97"/>
            <path d="M402 113 C423 139 409 163 385 166 C361 169 355 145 373 132"/>
            <path d="M112 169 C138 147 169 157 168 184 C167 211 134 220 117 198"/>
            <path d="M164 145 C189 127 215 141 210 168 C205 194 176 202 159 183"/>
            <path d="M218 126 C242 108 270 122 263 150 C256 177 226 184 211 165"/>
            <path d="M276 122 C301 104 329 119 321 146 C313 172 285 181 270 161"/>
            <path d="M333 137 C357 120 382 135 375 160 C368 185 342 190 327 173"/>
            <path d="M127 218 C151 195 181 203 184 228 C187 250 161 265 142 248"/>
            <path d="M190 202 C214 183 241 194 238 219 C235 244 209 253 191 235"/>
            <path d="M250 190 C275 171 302 185 296 211 C290 237 263 243 247 225"/>
            <path d="M309 194 C332 176 360 189 354 215 C348 239 322 247 305 228"/>
            <path d="M370 194 C391 180 412 193 406 215 C400 235 380 240 367 225"/>
          </g>
          <g stroke="#034c77" strokeWidth="7" opacity=".47">
            <path d="M112 111 C132 125 147 116 151 97"/>
            <path d="M175 72 C164 96 181 111 201 108"/>
            <path d="M224 58 C211 81 226 96 246 96"/>
            <path d="M280 58 C267 81 282 98 301 96"/>
            <path d="M335 75 C321 94 335 111 354 109"/>
            <path d="M397 127 C377 119 363 135 369 153"/>
            <path d="M116 183 C139 169 153 181 150 202"/>
            <path d="M174 159 C194 171 189 191 170 198"/>
            <path d="M232 139 C251 151 247 172 229 180"/>
            <path d="M290 137 C309 150 304 171 286 179"/>
            <path d="M347 151 C365 164 358 184 341 190"/>
            <path d="M151 235 C168 220 182 229 179 247"/>
            <path d="M211 218 C230 230 224 248 206 255"/>
            <path d="M270 207 C288 219 283 238 265 245"/>
            <path d="M329 210 C346 222 341 241 324 249"/>
          </g>
          <g stroke="#f0ffff" strokeWidth="2.4" opacity=".7">
            <path d="M126 101q15-17 31-8M192 64q20-10 34 5M253 62q18-10 31 4M318 72q17-5 27 10"/>
            <path d="M108 151q13-14 27-9M183 132q14-12 26-3M244 112q15-11 27 0M303 119q15-11 28 0M363 128q14-6 21 7"/>
            <path d="M139 207q15-12 29-2M202 190q16-12 28-1M262 179q15-11 28 0M321 181q15-10 27 2"/>
          </g>
        </g>

        <path d="M365 224 C390 215 417 226 419 247 C421 270 394 288 367 278 C344 270 341 244 365 224 Z"
          fill="url(#mfBrainCerebellum)" stroke="#9dfff5" strokeWidth="2.6"/>
        <g fill="none" stroke="#cafff8" strokeWidth="3" opacity=".76" strokeLinecap="round">
          <path d="M355 239q27-17 52 0M350 249q34-17 62 2M352 261q28-13 54 5M365 273q19-8 34 1"/>
          <path d="M369 232q-8 17 1 35M384 229q-7 23 5 46M399 237q-5 18 5 31"/>
        </g>
        <path d="M340 259 C336 280 330 291 338 310 C347 294 351 281 347 261Z" fill="url(#mfBrainRim)" stroke="#9bfff6" strokeWidth="2.2"/>
        <path d="M344 277q-10 10-6 24" fill="none" stroke="#e0fffc" strokeWidth="2" opacity=".8"/>
      </g>

      <g fill="#cffffa">
        <circle cx="92" cy="132" r="2.8"/><circle cx="430" cy="155" r="2.4"/>
        <circle cx="122" cy="254" r="2.2"/><circle cx="318" cy="39" r="2.1"/>
      </g>
      <path d="M74 286 C159 309 345 309 447 274" fill="none" stroke="#20dce8" strokeWidth="1.2" opacity=".22"/>
    </svg>
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
