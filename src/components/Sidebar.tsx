type SidebarProps = {
  active: string;
  onNavigate: (page: string) => void;
};

const sections = [
  {
    title: 'ESPACE MÉDICAL',
    items: [
      { label: 'Tableau de bord', icon: 'dashboard' },
      { label: 'Patients', icon: 'patients' },
      { label: 'Consultations', icon: 'consultations' },
    ],
  },
  {
    title: 'INTELLIGENCE CLINIQUE',
    items: [
      { label: 'Copilote IA', icon: 'copilot' },
      { label: 'Protocoles médicaux', icon: 'protocols' },
      { label: 'Ordonnances', icon: 'prescriptions' },
    ],
  },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'dashboard':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></svg>;
    case 'patients':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="9" cy="8" r="3.3" /><path d="M3.5 20c.4-3.5 2.3-5.3 5.5-5.3s5.1 1.8 5.5 5.3" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6.2M17 14.8c2.1.7 3.2 2.3 3.5 5.2" /></svg>;
    case 'consultations':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M8 3.5h8M9 3.5v4.2a3 3 0 0 0 6 0V3.5M12 10.8v2.1a4.7 4.7 0 0 0 9.4 0v-1.2" /><circle cx="21.4" cy="9.8" r="1.1" /><path d="M4 12.5v2.2a8 8 0 0 0 16 0" /><path d="M12 18.8v2" /></svg>;
    case 'copilot':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1m8.8 8.8 2.1 2.1m0-13-2.1 2.1m-8.8 8.8-2.1 2.1" /><circle cx="12" cy="12" r="5.1" /><circle cx="12" cy="12" r="1.5" /></svg>;
    case 'protocols':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.8V8h4M8.5 12h7M8.5 15.5h7M8.5 18.5h4" /></svg>;
    case 'prescriptions':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" /><path d="M9 8h6M12 5v6M8.5 15h7M8.5 18h4" /></svg>;
    case 'settings':
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1 1.8-1.7 2.9-2.1-.5a7.8 7.8 0 0 1-1.6.9l-.8 2h-3.3l-.8-2a7.8 7.8 0 0 1-1.6-.9l-2.1.5-1.7-2.9L6 15a7.6 7.6 0 0 1 0-1.9l-1.2-1.5 1.7-2.9 2.1.5a7.8 7.8 0 0 1 1.6-.9l.8-2h3.3l.8 2a7.8 7.8 0 0 1 1.6.9l2.1-.5 1.7 2.9-1.2 1.5a7.6 7.6 0 0 1 .1 1.9Z" /></svg>;
    default:
      return null;
  }
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar premium-sidebar">
      <div className="brand sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M24 40S7 29 7 17.5C7 9.5 17 5.5 24 14c7-8.5 17-4.5 17 3.5C41 29 24 40 24 40Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M8 24h9l4-8 6 17 4-9h9" fill="none" stroke="#00e6c3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="brand-copy">
          <h2>MediFollow<span> AI</span></h2>
          <small>CLINICAL INTELLIGENCE</small>
        </div>
      </div>

      <div className="sidebar-workspace">
        <span className="workspace-indicator" />
        <span>ESPACE MÉDECIN</span>
        <span className="workspace-chevron">⌄</span>
      </div>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        {sections.map((section) => (
          <div className="sidebar-nav-group" key={section.title}>
            <div className="sidebar-section-label">{section.title}</div>
            {section.items.map((item) => {
              const selected = active === item.label;
              return (
                <button
                  type="button"
                  key={item.label}
                  className={selected ? 'nav-item premium-nav-item active' : 'nav-item premium-nav-item'}
                  onClick={() => onNavigate(item.label)}
                  aria-current={selected ? 'page' : undefined}
                >
                  <span className="nav-icon"><NavIcon name={item.icon} /></span>
                  <span className="nav-label">{item.label}</span>
                  {selected && <span className="nav-active-indicator" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-lower">
        <div className="sidebar-motto-card">
          <div className="sidebar-motto-art" aria-hidden="true">
            <span className="motto-cross">✚</span>
            <span className="motto-pulse">⌁</span>
          </div>
          <p>Ensemble pour votre santé</p>
          <span className="sidebar-motto-line" />
        </div>

        <div className="sidebar-security-note">
          <span aria-hidden="true">◈</span>
          <div><strong>Confidentialité</strong><small>Vos données sous votre contrôle</small></div>
        </div>
      </div>

      <button type="button" className={active === 'Paramètres' ? 'nav-item premium-nav-item sidebar-settings active' : 'nav-item premium-nav-item sidebar-settings'} onClick={() => onNavigate('Paramètres')} aria-current={active === 'Paramètres' ? 'page' : undefined}>
        <span className="nav-icon"><NavIcon name="settings" /></span>
        <span className="nav-label">Paramètres</span>
        {active === 'Paramètres' && <span className="nav-active-indicator" aria-hidden="true" />}
      </button>

      <div className="sidebar-bottom premium-sidebar-bottom">
        <div className="doctor-avatar premium-doctor-avatar">MB</div>
        <div className="doctor-info">
          <strong>Espace médecin</strong>
          <small>Médecine de famille</small>
        </div>
        <span className="doctor-presence" title="Espace actif" />
      </div>
      <div className="sidebar-version"><span className="version-dot" /> MEDIFOLLOW AI <span className="version-separator">·</span> CLINICAL WORKSPACE</div>
    </aside>
  );
}
