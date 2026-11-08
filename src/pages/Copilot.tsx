
import type { KeyboardEvent } from 'react';
import Orb3D from '../components/Orb3D';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type CopilotProps = {
  messages: Message[];
  question: string;
  onQuestionChange: (value: string) => void;
  loading: boolean;
  onSend: () => void;
};

const suggestions = [
  'Aide-moi à analyser un cas clinique.',
  'Quelles sont les dernières recommandations médicales ?',
  'Aide-moi à établir un diagnostic différentiel.',
];

export default function Copilot({
  messages,
  question,
  onQuestionChange,
  loading,
  onSend,
}: CopilotProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (question.trim() && !loading) {
        onSend();
      }
    }
  };

  return (
    <section className="copilot premium-copilot">
      <div className="premium-copilot-header">
        <div className="copilot-identity">
          <div className="holographic-orb">
            <Orb3D />
          </div>

          <div className="copilot-identity-text">
            <span className="copilot-eyebrow">
              MEDIFOLLOW INTELLIGENCE
            </span>
            <h2>Copilote médical</h2>
            <p>Votre partenaire de réflexion clinique</p>
          </div>
        </div>

        <div className="copilot-status">
          <span></span>
          {loading ? 'Analyse en cours...' : 'Assistant disponible'}
        </div>
      </div>

      <div className="copilot-conversation">
        {messages.length === 0 && (
          <div className="copilot-welcome">
            <div className="welcome-neural-visual">
              <img
                src="/neural-network.png"
                alt="Réseau neuronal médical"
                className="neural-network-image"
              />
            </div>

            <div className="welcome-text">
              <span className="welcome-eyebrow">
                INTELLIGENCE CLINIQUE
              </span>

              <h3>Comment puis-je vous aider aujourd'hui ?</h3>

              <p>
                Posez une question médicale, analysez une situation
                clinique ou explorez les recommandations scientifiques.
              </p>
            </div>

            <div className="copilot-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  className="suggestion-button"
                  onClick={() => onQuestionChange(suggestion)}
                  disabled={loading}
                >
                  <span className="suggestion-icon">✧</span>
                  {suggestion}
                  <span className="suggestion-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="copilot-messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`copilot-message ${
                  message.role === 'user'
                    ? 'user-message'
                    : 'assistant-message'
                }`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? 'MB' : '✧'}
                </div>

                <div className="message-content">
                  <div className="message-author">
                    {message.role === 'user' ? 'Vous' : 'MediFollow AI'}
                  </div>

                  <div className="message-bubble">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="copilot-message assistant-message">
                <div className="message-avatar">✧</div>

                <div className="message-content">
                  <div className="message-author">MediFollow AI</div>

                  <div className="message-bubble typing-bubble">
                    <span></span>
                    <span></span>
                    <span></span>
                    <small>Analyse clinique en cours...</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="copilot-input-area">
        <div className="copilot-input-wrapper">
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question médicale..."
            rows={2}
            disabled={loading}
          />

          <button
            type="button"
            className="copilot-send-button"
            onClick={onSend}
            disabled={!question.trim() || loading}
            aria-label="Envoyer le message"
          >
            {loading ? (
              <span className="send-loading">···</span>
            ) : (
              <span>↑</span>
            )}
          </button>
        </div>

        <div className="copilot-input-footer">
          <span>↵ Envoyer</span>
          <span>⇧ + ↵ Nouvelle ligne</span>

          <span className="copilot-disclaimer">
            L'IA assiste le médecin. La décision clinique reste médicale.
          </span>
        </div>
      </div>
    </section>
  );
}

