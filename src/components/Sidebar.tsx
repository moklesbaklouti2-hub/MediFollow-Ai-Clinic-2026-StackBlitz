type SidebarProps = {
  active: string;
  onNavigate: (page: string) => void;
};

const menu = [
  { label: 'Tableau de bord', icon: '▦', section: 'PRINCIPAL' },
  { label: 'Patients', icon: '♙', section: 'PRINCIPAL' },
  { label: 'Consultations', icon: '✚', section: 'PRINCIPAL' },
  { label: 'Copilote IA', icon: '✧', section: 'INTELLIGENCE' },
  { label: 'Protocoles médicaux', icon: '▤', section: 'GESTION CLINIQUE' },
  { label: 'Ordonnances', icon: '▧', section: 'GESTION CLINIQUE' },
  { label: 'Paramètres', icon: '⚙', section: 'CONFIGURATION' },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  let currentSection = '';

  return (
    <aside className="sidebar premium-sidebar">

      <div className="brand sidebar-brand">
        <div className="brand-mark" aria-label="MediFollow AI">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 40S7 29 7 17.5C7 9.5 17 5.5 24 14c7-8.5 17-4.5 17 3.5C41 29 24 40 24 40Z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round"/>
            <path d="M8 24h9l4-8 6 17 4-9h9" fill="none" stroke="#00e6c3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="brand-copy">
          <h2>MediFollow<span> AI</span></h2>
          <small>CLINICAL INTELLIGENCE</small>
        </div>
      </div>

      <div className="sidebar-workspace">
        <span className="workspace-indicator"></span>
        ESPACE CLINIQUE
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
          const showSection = item.section !== currentSection;
          currentSection = item.section;

          return (
            <div key={item.label}>
              {showSection && (
                <div className="sidebar-section-label">
                  {item.section}
                </div>
              )}

              <button
                className={
                  active === item.label
                    ? 'nav-item premium-nav-item active'
                    : 'nav-item premium-nav-item'
                }
                onClick={() => onNavigate(item.label)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {active === item.label && (
                  <span className="nav-active-indicator"></span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-motto-card">
        <div className="sidebar-motto-art" aria-hidden="true">
          <span className="motto-cross">✚</span>
          <span className="motto-pulse">⌁</span>
        </div>
        <p>Ensemble<br />pour votre santé</p>
        <span className="sidebar-motto-line"></span>
      </div>

      <div className="sidebar-security-note">
        <span>◈</span>
        <div><strong>Sécurité & confidentialité</strong><small>Vos données restent sous votre contrôle</small></div>
      </div>

      <div className="sidebar-bottom premium-sidebar-bottom">
        <div className="doctor-avatar premium-doctor-avatar">MB</div>

        <div className="doctor-info">
          <strong>Espace médecin</strong>
          <small>Médecine de famille</small>
        </div>

        <span className="doctor-menu-dots">•••</span>
      </div>

      <div className="sidebar-version">
        <span className="version-dot"></span>
        MEDIFOLLOW AI · VERSION CLINIQUE
      </div>

    </aside>
  );
}
