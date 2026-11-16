type HeaderProps = {
  title: string;
  onOpenCopilot: () => void;
};

const pageDescriptions: Record<string, string> = {
  'Tableau de bord': 'Votre activité clinique, vos dossiers et vos priorités en un regard.',
  'Patients': 'Dossiers, antécédents et parcours de soins réunis.',
  'Consultations': 'Un espace structuré pour documenter chaque consultation.',
  'Copilote IA': 'HELIOS vous accompagne dans la réflexion clinique.',
  'Protocoles médicaux': 'Références et supports cliniques à portée de main.',
  'Ordonnances': 'Traitements, examens et documents médicaux.',
  'Inventaire': 'Consommables et équipements de votre cabinet.',
  'Paramètres': 'Personnalisation et sauvegardes de votre espace.',
};

export default function Header({ title, onOpenCopilot }: HeaderProps) {
  return (
    <header className="topbar premium-topbar">
      <div className="header-title-group">
        <span className="top-label">
          <span className="header-label-line" aria-hidden="true" />
          MEDIFOLLOW AI / ESPACE CLINIQUE
        </span>
        <h1>{title}</h1>
        <p className="header-subtitle">
          {pageDescriptions[title] ?? 'Votre espace de travail médical intelligent.'}
        </p>
      </div>

      <div className="header-right">
        <div className="header-date" title="Aucune donnée patient réelle ne doit être utilisée dans ce prototype">
          <span className="header-date-icon" aria-hidden="true">◈</span>
          <div>
            <strong>Environnement de test</strong>
            <small>Stockage dans le navigateur</small>
          </div>
        </div>
        <div className="status premium-status">
          <span className="status-dot" aria-hidden="true" />
          <span>Mode prototype</span>
        </div>
        <button
          type="button"
          className="header-helios-button"
          onClick={onOpenCopilot}
          disabled={title === 'Copilote IA'}
          aria-label="Ouvrir le copilote HELIOS"
        >
          ✦ HELIOS
        </button>
      </div>
    </header>
  );
}
