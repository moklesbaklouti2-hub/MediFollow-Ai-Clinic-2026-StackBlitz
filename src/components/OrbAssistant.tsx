import { useState } from 'react';
import './OrbAssistant.css';

type OrbAssistantProps = {
  isThinking?: boolean;
  onOpenCopilot: () => void;
};

export default function OrbAssistant({ isThinking = false, onOpenCopilot }: OrbAssistantProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className={`mf-orb-assistant${isThinking ? ' is-thinking' : ''}`}>
      {panelOpen && (
        <section className="mf-orb-panel" aria-label="Assistant MediFollow AI" aria-live="polite">
          <div className="mf-orb-panel-header">
            <div className="mf-orb-panel-identity">
              <span className={`mf-orb-status-dot${isThinking ? ' is-thinking' : ''}`} />
              <div>
                <strong>MediFollow AI</strong>
                <small>ASSISTANT MÉDICAL</small>
              </div>
            </div>
            <button type="button" className="mf-orb-close" onClick={() => setPanelOpen(false)} aria-label="Fermer le panneau de l'assistant">×</button>
          </div>
          <div className="mf-orb-panel-body">
            <div className="mf-orb-mini"><span className="mf-orb-mini-core" /></div>
            <strong>{isThinking ? 'Analyse en cours…' : 'Votre assistant est disponible'}</strong>
            <p>
              {isThinking
                ? 'Le copilote traite votre demande. La sphère évolue pendant cette analyse.'
                : 'Je reste accessible pendant votre navigation. Ouvrez le copilote pour poser une question ou analyser une consultation.'}
            </p>
            <button type="button" className="mf-orb-open-copilot" onClick={() => { setPanelOpen(false); onOpenCopilot(); }}>
              Ouvrir le copilote médical <span aria-hidden="true">→</span>
            </button>
            <small className="mf-orb-privacy">Aucune écoute du microphone n'est active.</small>
          </div>
        </section>
      )}

      <button
        type="button"
        className={`mf-orb-launcher${isThinking ? ' is-thinking' : ''}${panelOpen ? ' is-open' : ''}`}
        onClick={() => setPanelOpen((open) => !open)}
        aria-label={panelOpen ? "Fermer l'assistant MediFollow" : "Ouvrir l'assistant MediFollow"}
        aria-expanded={panelOpen}
        title="Assistant MediFollow AI"
      >
        <span className="mf-orb-aura" />
        <span className="mf-orb-halo mf-orb-halo-one" />
        <span className="mf-orb-halo mf-orb-halo-two" />
        <span className="mf-orb-ring mf-orb-ring-one" />
        <span className="mf-orb-ring mf-orb-ring-two" />
        <span className="mf-orb-ring mf-orb-ring-three" />
        <span className="mf-orb-sphere">
          <span className="mf-orb-continent" />
          <span className="mf-orb-shine" />
          <span className="mf-orb-energy" />
        </span>
        <span className="mf-orb-particle mf-orb-particle-one" />
        <span className="mf-orb-particle mf-orb-particle-two" />
        <span className="mf-orb-particle mf-orb-particle-three" />
        <span className="mf-orb-particle mf-orb-particle-four" />
      </button>
      <span className="mf-orb-caption">{isThinking ? 'ANALYSE EN COURS' : 'MEDIFOLLOW AI'}</span>
    </div>
  );
}
