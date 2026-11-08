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
        <div className="brand-mark">
          <span>M</span>
          <i>+</i>
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
