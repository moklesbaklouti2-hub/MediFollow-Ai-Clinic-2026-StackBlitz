import React, { useState } from 'react';

export const workspacePages = [
  'Tableau de bord', 'Patients', 'Consultations', 'Copilote IA',
  'Ordonnances', 'Protocoles médicaux', 'Inventaire', 'Paramètres',
] as const;

export default function WorkspaceNavigation({ active, onNavigate }: {
  active: string;
  onNavigate: (page: string) => void;
}): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="n3-workspace-header" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        document.querySelector<HTMLButtonElement>('.n3-menu-toggle')?.focus();
      }
    }}>
      <div className="n3-brand">MediFollow <span>AI</span><small>Dossier essentiel</small></div>
      <button type="button" className="n3-menu-toggle" aria-expanded={menuOpen}
        aria-controls="n3-main-navigation" onClick={() => setMenuOpen(open => !open)}>Pages</button>
      <nav id="n3-main-navigation" className={`n3-navigation${menuOpen ? ' is-open' : ''}`}
        aria-label="Navigation principale">
        {workspacePages.map(page => (
          <button type="button" key={page} aria-current={active === page ? 'page' : undefined}
            onClick={() => {
              onNavigate(page);
              setMenuOpen(false);
              // A collapsed mobile menu must not leave focus in hidden content.
              document.querySelector<HTMLButtonElement>('.n3-menu-toggle')?.focus();
            }}>{page}</button>
        ))}
      </nav>
    </header>
  );
}
