type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <header className="topbar premium-topbar">
      <div className="header-title-group">
        <span className="top-label">
          <span className="header-label-line"></span>
          PLATEFORME MÉDICALE INTELLIGENTE
        </span>

        <h1>{title}</h1>

        <p className="header-subtitle">
          Votre environnement de pratique médicale.
        </p>
      </div>

      <div className="header-right">
        <div className="header-date">
          <span className="header-date-icon">◷</span>
          <div>
            <strong>Espace clinique</strong>
            <small>Stockage local du navigateur</small>
          </div>
        </div>

        <div className="status premium-status">
          <span className="status-dot"></span>
          <span>MediFollow AI</span>
        </div>
      </div>
    </header>
  );
}