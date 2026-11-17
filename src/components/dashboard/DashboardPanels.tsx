import { useRef } from 'react';
import type { DashboardData, ConsultationRecord } from '../../pages/Dashboard';
import type { InventoryData } from '../../types/medical';

export const dashboardPages = ['Tableau de bord', 'Patients', 'Consultations', 'Copilote IA', 'Ordonnances', 'Protocoles médicaux', 'Inventaire', 'Paramètres'] as const;
export type DashboardPage = typeof dashboardPages[number];

export function MobileDashboardNavigation({ onNavigate }: { onNavigate: (page: DashboardPage) => void }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details className="wd-mobile-pages" ref={menu} onKeyDown={event => {
    if (event.key === 'Escape' && menu.current) {
      menu.current.open = false;
      menu.current.querySelector('summary')?.focus();
    }
  }}>
    <summary>Toutes les pages</summary>
    <nav aria-label="Navigation du Dashboard">
      {dashboardPages.map(page => <button type="button" key={page} aria-current={page === 'Tableau de bord' ? 'page' : undefined} onClick={() => {
        if (menu.current) menu.current.open = false;
        onNavigate(page);
      }}>{page}</button>)}
    </nav>
  </details>;
}

type DashboardIconName = 'patients' | 'consultation' | 'prescription' | 'follow-up' | 'overdue' | 'calendar' | 'helios';

function DashboardIcon({ name }: { name: DashboardIconName }) {
  const paths: Record<DashboardIconName, string> = {
    patients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    consultation: 'M8 5H5v16h14V5h-3M9 3h6v4H9zM8 13h8M12 10v6',
    prescription: 'M14 3H5v18h14V8zM14 3v5h5M8 12h7M8 16h5',
    'follow-up': 'M20 11a8 8 0 1 1-4-6.93M8 11l3 3 9-9',
    overdue: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
    calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h3M8 17h7',
    helios: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  };
  return <svg className="wd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

function WelcomeArtwork() {
  return <svg className="wd-welcome-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="47" fill="var(--wd-sage-tile)" />
    <circle cx="83" cy="20" r="12" fill="var(--wd-paper)" stroke="var(--wd-line)" />
    <path d="M78 20h10m-5-5v10" fill="none" stroke="var(--mf-blue)" strokeWidth="2" strokeLinecap="round" />
    <path d="M22 91V77c0-16 12-24 28-24s28 8 28 24v14Z" fill="var(--wd-paper)" stroke="var(--wd-line)" strokeWidth="1.5" />
    <path d="M42 57l8 12 8-12v34H42Z" fill="var(--wd-peach-tile)" />
    <path d="M39 59l-4 13 10 6-4 13m20-32 4 13-10 6 4 13" fill="none" stroke="var(--color-mint)" strokeWidth="1.5" />
    <ellipse cx="50" cy="36" rx="19" ry="23" fill="var(--wd-peach-tile)" stroke="var(--wd-line)" strokeWidth="1.5" />
    <path d="M31 37c-4-20 6-28 19-28s23 8 19 28l-5-11c-8 1-12-3-14-6-2 5-8 7-14 6Z" fill="var(--color-text-secondary)" />
    <path d="M34 40c1 16 9 20 16 20s15-4 16-20l-7 9-9-3-9 3Z" fill="var(--wd-paper)" />
    <g fill="none" stroke="var(--wd-ink)" strokeWidth="1.6" strokeLinecap="round"><rect x="35" y="33" width="11" height="9" rx="3" /><rect x="54" y="33" width="11" height="9" rx="3" /><path d="M46 36h8M46 50q4 3 8 0" /></g>
    <path d="M34 64v11a9 9 0 0 0 18 0V64m0 11h12v8" fill="none" stroke="var(--color-mint)" strokeWidth="2.3" strokeLinecap="round" />
    <circle cx="64" cy="86" r="4" fill="var(--color-mint)" stroke="var(--wd-paper)" strokeWidth="1.5" />
  </svg>;
}

export function WelcomeBanner({ date, onStartConsultation, onOpenPatients }: { date: Date; onStartConsultation: () => void; onOpenPatients: () => void }) {
  return <header className="wd-welcome">
    <WelcomeArtwork />
    <div className="wd-welcome-copy"><h2>Bienvenue dans votre cabinet</h2><time dateTime={date.toLocaleDateString('sv-SE')}>{date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></div>
    <div className="wd-welcome-actions"><button type="button" className="wd-button wd-primary" onClick={onStartConsultation}>Nouvelle consultation</button><button type="button" className="wd-button" onClick={onOpenPatients}>Patients</button></div>
  </header>;
}

export function OverviewKpi({ label, value, note, tone, icon, href }: { label: string; value: number; note: string; tone: 'sage' | 'peach' | 'rose' | 'cream'; icon: DashboardIconName; href?: string }) {
  const content = <><span className="wd-kpi-label">{label}</span><div className="wd-kpi-value"><strong>{value.toLocaleString('fr-FR')}</strong><span className="wd-kpi-icon"><DashboardIcon name={icon} /></span></div><span className="wd-kpi-note">{note}</span></>;
  return href ? <a className={'wd-kpi wd-kpi-' + tone} href={href}>{content}</a> : <article className={'wd-kpi wd-kpi-' + tone}>{content}</article>;
}

export function AgendaPanel() {
  return <section className="wd-panel wd-agenda" aria-label="Agenda — calendrier non activé">
    <div className="wd-panel-heading"><div><span className="wd-panel-overline">AGENDA CLINIQUE</span><h3>Agenda du jour</h3></div></div>
    <div className="wd-empty-state"><span className="wd-calendar-mark"><DashboardIcon name="calendar" /></span><strong>Calendrier non activé</strong><p>Les rendez-vous apparaîtront ici lorsque le calendrier sera activé.</p><small>Aucune donnée de rendez-vous disponible.</small></div>
  </section>;
}

export function HeliosPanel({ onOpenCopilot }: { onOpenCopilot: () => void }) {
  return <section className="wd-panel wd-helios" aria-label="HELIOS, copilote clinique">
    <div className="wd-helios-heading"><div><span className="wd-panel-overline">VOTRE COPILOTE IA</span><h3>HELIOS</h3></div><span className="wd-helios-icon"><DashboardIcon name="helios" /></span></div><p>Votre assistant médical intelligent, à vos côtés à chaque étape de la consultation.</p>
    <ul><li>Analyse d’un cas clinique</li><li>Diagnostic différentiel</li><li>Plan de prise en charge</li></ul>
    <button type="button" className="wd-button" onClick={onOpenCopilot}>Ouvrir HELIOS</button>
  </section>;
}

export function QuickPathways({ onStartConsultation, onOpenPatients, onOpenCopilot, onNavigate }: { onStartConsultation: () => void; onOpenPatients: () => void; onOpenCopilot: () => void; onNavigate: (page: DashboardPage) => void }) {
  const shortcuts = [
    { label: 'Nouvelle consultation', action: onStartConsultation },
    { label: 'Patients', action: onOpenPatients },
    { label: 'HELIOS', action: onOpenCopilot },
    { label: 'Ordonnances', action: () => onNavigate('Ordonnances') },
    { label: 'Protocoles', action: () => onNavigate('Protocoles médicaux') },
    { label: 'Inventaire', action: () => onNavigate('Inventaire') },
  ];
  return <section className="wd-quick-pathways" aria-label="Accès rapides aux pages existantes"><h2>Accès rapides</h2><div>{shortcuts.map(item => <button type="button" key={item.label} onClick={item.action}>{item.label}<span aria-hidden="true">→</span></button>)}</div></section>;
}

export function FollowUpPanel({ data, onStartConsultation }: { data: DashboardData; onStartConsultation: () => void }) {
  return (
    <section className="wd-panel wd-follow-up" id="dashboard-follow-up" style={{ padding: 18 }} aria-label="HELIOS Follow-up : échéances de suivi">
      <div className="wd-panel-heading">
        <div><span className="wd-panel-overline">HELIOS FOLLOW-UP</span><h3>Contrôles de suivi programmés</h3></div>
      </div>
      <p style={{ margin: 0 }}>
        <strong>{data.followUpConsultations.overdue}</strong> en retard ·{' '}
        <strong>{data.followUpConsultations.today}</strong> aujourd’hui ·{' '}
        <strong>{data.followUpConsultations.nextSevenDays}</strong> dans les 7 jours
      </p>
      <p style={{ fontSize: 12, margin: '8px 0 0' }}>
        <strong>{data.laterPlannedFollowUps}</strong> contrôle(s) planifié(s) à plus de 7 jours, non inclus dans les échéances ci-dessus.
      </p>
      <p style={{ fontSize: 12, margin: '8px 0 0' }}>
        Contrôles effectués exclus des échéances. Aucun message automatique aux patients.
      </p>
      {data.undatedPlannedFollowUps > 0 && (
        <p role="status" style={{ fontSize: 12, margin: '8px 0 0' }}>
          {data.undatedPlannedFollowUps} contrôle(s) planifié(s) sans date valide, exclus des échéances ci-dessus. Date à vérifier dans le dossier.
        </p>
      )}
      <button type="button" className="wd-button" onClick={onStartConsultation} style={{ marginTop: 10 }}>
        Ouvrir les consultations
      </button>
    </section>
  );
}

export function DataIntegrityNotice({ data }: { data: DashboardData }) {
  return (
    <>{(data.unlinkedConsultations + data.unlinkedPrescriptions > 0) && (
      <section className="wd-panel wd-integrity-notice" role="alert" aria-label="Documents sans dossier patient confirmé"
        style={{ padding: 18, borderColor: 'var(--a-warning, #bd7c13)' }}>
        <strong style={{ color: 'var(--a-warning, #bd7c13)', display: 'block', marginBottom: 6 }}>
          Attention — documents cliniques sans dossier patient confirmé
        </strong>
        <p style={{ margin: 0 }}>
          {data.unlinkedConsultations} consultation(s) et {data.unlinkedPrescriptions} ordonnance(s)
          nécessitent une vérification de l’identité du patient.
        </p>
        <p style={{ fontSize: 13, margin: '8px 0 0' }}>
          Aucun rapprochement automatique n’est effectué pour les homonymes.
          Vérifiez les documents dans Consultations et Ordonnances avant toute décision clinique.
        </p>
      </section>
    )}</>
  );
}

export function ClinicalActivityPanel({ data }: { data: DashboardData }) {
  return (
    <section className="wd-panel" style={{ padding: 18, display: 'grid', gap: 12 }}
      aria-label="HELIOS Activité — statistiques descriptives">
      <div className="wd-panel-heading">
        <div>
          <span className="wd-panel-overline">HELIOS ACTIVITÉ</span>
          <h3>Consultations par spécialité et motif</h3>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12 }}>
        Statistiques descriptives des informations saisies :
        {data.clinicalActivity.included} consultation(s) avec dossier patient confirmé.
        {data.clinicalActivity.excluded > 0 && (
          <> {data.clinicalActivity.excluded} document(s) avec identité patient ou identifiant de consultation non confirmé(s), exclu(s) des calculs.</>
        )}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        {([
          { title: 'Par spécialité', items: data.clinicalActivity.specialties },
          { title: 'Par motif enregistré', items: data.clinicalActivity.motifs },
        ] as const).map((group) => (
          <div key={group.title} style={{ padding: 12, borderRadius: 10,
            border: '1px solid var(--color-border)' }}>
            <strong>{group.title}</strong>
            {group.items.length === 0 ? <p>Aucune consultation reliée.</p> : (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
                {group.items.slice(0, 5).map((item) => (
                  <li key={item.label}>
                    {item.label} : <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            )}
            {group.items.length > 5 && <small>Cinq catégories les plus fréquentes affichées.</small>}
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 12 }}>
        Ces chiffres représentent des saisies administratives, pas des diagnostics validés ni une prévalence médicale.
        Les données non renseignées restent visibles comme telles. Aucun envoi à une IA externe.
      </p>
    </section>
  );
}

export function InventoryPanel({ inventory, inventoryLow, inventoryExpired, inventoryExpiring, inventoryEstimatedValue, inventoryValueIncomplete, recentStockMovements }: {
  inventory: InventoryData; inventoryLow: InventoryData['items']; inventoryExpired: InventoryData['items']; inventoryExpiring: InventoryData['items']; inventoryEstimatedValue: number; inventoryValueIncomplete: boolean; recentStockMovements: InventoryData['movements'];
}) {
  return (
    <section className="wd-panel wd-inventory-panel" style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div className="wd-panel-heading">
        <div><span className="wd-panel-overline">GESTION DU CABINET</span><h3>État de l’inventaire</h3></div>
        <span className="wd-panel-chip">{inventory.items.length} article(s)</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10 }}>
        <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
          <small style={{ color: 'var(--color-text-secondary)' }}>Valeur estimée du stock</small>
          <strong style={{ display: 'block', fontSize: 22, marginTop: 6 }}>{inventoryEstimatedValue.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT</strong>
          <small style={{ color: 'var(--color-text-secondary)' }}>{inventoryValueIncomplete ? 'Estimation partielle : coûts manquants' : 'Calculée à partir des coûts unitaires saisis'}</small>
        </div>
        <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
          <small style={{ color: 'var(--color-text-secondary)' }}>Stocks bas</small>
          <strong style={{ display: 'block', fontSize: 22, marginTop: 6, color: inventoryLow.length ? 'var(--a-warning, #c45c36)' : 'inherit' }}>{inventoryLow.length}</strong>
          <small style={{ color: 'var(--color-text-secondary)' }}>Article(s) au seuil ou en dessous</small>
        </div>
        <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
          <small style={{ color: 'var(--color-text-secondary)' }}>Articles périmés</small>
          <strong style={{ display: 'block', fontSize: 22, marginTop: 6, color: inventoryExpired.length ? 'var(--a-danger, #d94b4b)' : 'inherit' }}>{inventoryExpired.length}</strong>
          <small style={{ color: 'var(--color-text-secondary)' }}>À isoler du stock disponible</small>
        </div>
        <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
          <small style={{ color: 'var(--color-text-secondary)' }}>Péremption ≤ 90 jours</small>
          <strong style={{ display: 'block', fontSize: 22, marginTop: 6, color: inventoryExpiring.length ? 'var(--a-warning, #bd7c13)' : 'inherit' }}>{inventoryExpiring.length}</strong>
          <small style={{ color: 'var(--color-text-secondary)' }}>Lots à surveiller</small>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        <div>
          <strong style={{ fontSize: 14 }}>Alertes prioritaires</strong>
          {inventoryLow.length + inventoryExpired.length + inventoryExpiring.length === 0
            ? <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucune alerte de stock actuellement.</p>
            : <div style={{ display: 'grid', gap: 7, marginTop: 9 }}>
                {[...inventoryExpired.map(item => ({ item, label: 'PÉRIMÉ', color: 'var(--a-danger, #d94b4b)' })), ...inventoryLow.map(item => ({ item, label: 'STOCK BAS', color: 'var(--a-warning, #c45c36)' })), ...inventoryExpiring.map(item => ({ item, label: 'PÉREMPTION PROCHE', color: 'var(--a-warning, #bd7c13)' }))].slice(0, 6).map(alert => (
                  <div className="wd-stock-row" key={alert.item.id + alert.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 7, fontSize: 12 }}>
                    <span>{alert.item.name} · {alert.item.batchNumber ? 'Lot ' + alert.item.batchNumber : 'Lot sans numéro'}</span>
                    <strong style={{ color: alert.color, whiteSpace: 'nowrap' }}>{alert.label}</strong>
                  </div>
                ))}
              </div>}
        </div>
        <div>
          <strong style={{ fontSize: 14 }}>Derniers mouvements</strong>
          {recentStockMovements.length === 0
            ? <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucun mouvement enregistré.</p>
            : <div style={{ display: 'grid', gap: 7, marginTop: 9 }}>
                {recentStockMovements.map(movement => (
                  <div className="wd-stock-row" key={movement.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 7, fontSize: 12 }}>
                    <span>{movement.itemName}<small style={{ display: 'block', color: 'var(--color-text-secondary)' }}>{movement.reason || movement.type} · {new Date(movement.date).toLocaleDateString('fr-FR')}</small></span>
                    <strong style={{ whiteSpace: 'nowrap', color: movement.type === 'dispense' || (movement.type === 'adjustment' && movement.quantity < 0) ? 'var(--a-warning, #d97757)' : 'var(--a-positive, #159b7b)' }}>{movement.type === 'dispense' || (movement.type === 'adjustment' && movement.quantity < 0) ? '−' : '+'}{Math.abs(movement.quantity)}</strong>
                  </div>
                ))}
              </div>}
        </div>
      </div>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>La valeur est indicative et ne comprend que les articles dont le coût d’achat unitaire est renseigné. Les alertes sont calculées lot par lot.</p>
    </section>
  );
}

export function ActivityChartPanel({ chartPoints }: { chartPoints: readonly { label: string; count: number; x: number; y: number }[] }) {
  return (
    <article className="wd-panel wd-chart-panel">
      <div className="wd-panel-heading"><div><span className="wd-panel-overline">ANALYSE DE L'ACTIVITÉ</span><h3>Graphique des consultations</h3></div><span className="wd-panel-chip">6 derniers mois</span></div>
      <div className="wd-chart-legend"><span><i className="legend-cyan" /> Consultations</span><span className="wd-chart-note">Historique réel</span></div>
      <div className="wd-chart-wrap">
        <svg viewBox="0 0 520 150" preserveAspectRatio="none" aria-label="Graphique des consultations mensuelles">
          <defs><linearGradient id="wdChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-mint)" stopOpacity=".42"/><stop offset="1" stopColor="var(--color-mint)" stopOpacity="0"/></linearGradient></defs>
          {[28, 58, 88, 118].map(y => <line key={y} x1="20" x2="510" y1={y} y2={y} className="wd-chart-gridline"/>)}
          <polygon points={`20,130 ${chartPoints.map(p => `${p.x},${p.y}`).join(' ')} 488,130`} className="wd-chart-area"/>
          <polyline points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')} className="wd-chart-line"/>
          {chartPoints.map(p => <circle key={p.label} cx={p.x} cy={p.y} r="5" className="wd-chart-point"/>)}
        </svg>
      </div>
      <div className="wd-chart-labels">{chartPoints.map(point => <span key={point.label}>{point.label}<b>{point.count}</b></span>)}</div>
    </article>
  );
}

export function LatestVitalsPanel({ indicators }: { indicators: readonly { label: string; value: string; unit: string; icon: string; tone: string }[] }) {
  return (
    <article className="wd-panel wd-indicators-panel">
      <div className="wd-panel-heading"><div><span className="wd-panel-overline">DONNÉES CLINIQUES</span><h3>Indicateurs cliniques clés</h3></div><span className="wd-panel-chip">Dernière consultation</span></div>
      <div className="wd-indicators-grid">
        {indicators.map(item => (
          <div className={`wd-indicator wd-indicator-${item.tone}`} key={item.label}>
            <span className="wd-indicator-icon">{item.icon}</span>
            <div><small>{item.label}</small><strong>{item.value}<em>{item.unit}</em></strong></div>
          </div>
        ))}
      </div>
      <p className="wd-indicator-note">Valeurs issues de la dernière consultation contenant des constantes renseignées. « — » signifie non renseigné.</p>
    </article>
  );
}

export function RecentConsultationsPanel({ recentConsultations }: { recentConsultations: readonly ConsultationRecord[] }) {
  return (
    <section className="wd-panel wd-recent-panel">
      <div className="wd-panel-heading"><div><span className="wd-panel-overline">HISTORIQUE CLINIQUE</span><h3>Consultations récentes</h3></div><span className="wd-panel-count">{recentConsultations.length}</span></div>
      {recentConsultations.length === 0 ? (
        <div className="wd-empty-state"><span>◷</span><strong>Aucune consultation enregistrée</strong><p>Vos consultations récentes apparaîtront ici.</p></div>
      ) : (
        <div className="wd-activity-list" role="list">
          {recentConsultations.map((item, index) => (
            <div className="wd-activity-item" role="listitem" key={item.id + ":" + index}>
              <span className={`wd-activity-avatar wd-avatar-${index % 4}`}>{(item.patient || '?').trim().charAt(0).toUpperCase()}</span>
              <div className="wd-recent-copy"><strong>{item.patient}</strong><span>{item.motif || 'Motif non renseigné'}</span><small>{new Date(item.date).toLocaleDateString('fr-FR')}</small></div>
          
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
