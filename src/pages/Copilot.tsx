
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Consultation, Patient } from '../types/medical';
import Orb3D from '../components/Orb3D';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type CopilotProps = {
  messages: Message[];
  consultations: Consultation[];
  patients: Patient[];
  question: string;
  onQuestionChange: (value: string) => void;
  loading: boolean;
  onSend: (consultationId?: string) => void;
};

const suggestions = [
  'Aide-moi à analyser un cas clinique.',
  'Quelles sont les dernières recommandations médicales ?',
  'Aide-moi à établir un diagnostic différentiel.',
];

export default function Copilot({
  messages,
  consultations,
  patients,
  question,
  onQuestionChange,
  loading,
  onSend,
}: CopilotProps) {
  const latestConsultation = consultations.length
    ? [...consultations].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
    : undefined;
  const [chosenConsultationId, setChosenConsultationId] = useState<string | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: loading ? 'smooth' : 'auto',
    });
  }, [messages, loading]);
  const selectedConsultationId = chosenConsultationId !== null
    ? chosenConsultationId
    : latestConsultation?.id ?? '';
  const selectedConsultation = consultations.find(
    (item) => item.id === selectedConsultationId
  );
  const selectedPatient = selectedConsultation
    ? patients.find((item) => item.id === selectedConsultation.patientId)
    : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (question.trim() && !loading) {
        onSend(selectedConsultationId || undefined);
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

        <div className={`copilot-status${loading ? ' is-thinking' : ''}`}>
          <span className="copilot-status-indicator"></span>
          {loading ? 'Analyse en cours...' : 'Assistant disponible'}
        </div>
      </div>


      <section className="copilot-context-panel" aria-label="Contexte clinique">
        <div className="copilot-context-heading">
          <div className="copilot-context-title">
            <span className="copilot-context-icon" aria-hidden="true">⌘</span>
            <div>
              <strong>Contexte clinique</strong>
              <small>Choisissez les données enregistrées à associer à votre demande</small>
            </div>
          </div>
          <span className="copilot-context-secure">Données enregistrées</span>
        </div>
        <label className="copilot-context-label" htmlFor="copilot-consultation-context">
          Consultation de référence
        </label>
        <select
          id="copilot-consultation-context"
          className="copilot-context-select"
          value={selectedConsultationId}
          onChange={(event) => setChosenConsultationId(event.target.value)}
          disabled={loading || consultations.length === 0}
        >
          {consultations.length === 0 && (
            <option value="">Aucune consultation enregistrée</option>
          )}
          {consultations.length > 0 && (
            <option value="">Aucun contexte — question générale</option>
          )}
          {consultations
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((item) => {
              const linkedPatient = patients.find((patient) => patient.id === item.patientId);
              const dateLabel = new Date(item.date).toLocaleDateString('fr-FR');
              return (
                <option key={item.id} value={item.id}>
                  {dateLabel} · {item.specialty || 'Spécialité non précisée'} · {item.motif} · {linkedPatient?.name || 'Patient'}
                </option>
              );
            })}
        </select>
        <div className="copilot-context-summary" aria-live="polite">
          <span className="context-summary-dot" />
          <p>
            {selectedConsultation
              ? `Contexte actif : ${selectedConsultation.specialty || 'Spécialité non précisée'} — ${selectedConsultation.motif}${selectedPatient ? ` · ${selectedPatient.age} ans` : ''}. Seules les données enregistrées sont transmises.`
              : 'Aucun dossier associé : le copilote répondra en mode question générale.'}
          </p>
        </div>
      </section>

      <div className="copilot-conversation" ref={conversationRef}>
        {messages.length === 0 && (
          <div className="copilot-welcome">
            <div className="welcome-neural-visual">
              <svg
                className="neural-network-svg"
                viewBox="0 0 360 240"
                role="img"
                aria-label="Animation d'un réseau neuronal médical"
              >
                <defs>
                  <radialGradient id="neural-center">
                    <stop offset="0%" stopColor="#a9fff0" />
                    <stop offset="45%" stopColor="#42d5b4" />
                    <stop offset="100%" stopColor="#087e70" stopOpacity="0.15" />
                  </radialGradient>
                  <filter id="neural-glow">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g className="neural-lines" fill="none" stroke="#62e8ce" strokeWidth="1.4" opacity="0.68">
                  <path d="M180 120 L95 55 L42 91 M180 120 L78 166 L35 205 M180 120 L130 25 L205 34 M180 120 L270 48 L322 83 M180 120 L282 158 L330 207 M180 120 L208 213 L130 215 M95 55 L130 25 L205 34 L270 48 L322 83 M42 91 L78 166 L35 205 M78 166 L130 215 L208 213 L282 158 L330 207 M95 55 L42 91 M270 48 L282 158" />
                  <path d="M42 91 L130 25 L180 120 L270 48 M78 166 L205 34 L282 158" strokeDasharray="4 7" opacity="0.55" />
                </g>
                <g className="neural-particles" fill="#9bffe8" filter="url(#neural-glow)">
                  <circle cx="95" cy="55" r="4" />
                  <circle cx="42" cy="91" r="3" />
                  <circle cx="78" cy="166" r="4" />
                  <circle cx="35" cy="205" r="2.8" />
                  <circle cx="130" cy="25" r="3.5" />
                  <circle cx="205" cy="34" r="4" />
                  <circle cx="270" cy="48" r="3.5" />
                  <circle cx="322" cy="83" r="3" />
                  <circle cx="282" cy="158" r="4" />
                  <circle cx="330" cy="207" r="3" />
                  <circle cx="208" cy="213" r="3.5" />
                  <circle cx="130" cy="215" r="3" />
                </g>
                <circle className="neural-center-halo" cx="180" cy="120" r="56" fill="url(#neural-center)" />
                <circle className="neural-center-ring" cx="180" cy="120" r="39" fill="none" stroke="#9bffe8" strokeWidth="1.5" />
                <circle cx="180" cy="120" r="22" fill="#42d5b4" opacity="0.2" />
                <path d="M180 99 C166 99 158 111 161 123 C163 133 171 139 180 143 C189 139 197 133 199 123 C202 111 194 99 180 99Z" fill="#a9fff0" opacity="0.92" />
                <path d="M172 119 L178 125 L190 111" fill="none" stroke="#126b63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
          <div className="copilot-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`premium-message ${message.role}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? 'MB' : '✧'}
                </div>

                <div className="message-content">
                  <div className="message-author">
                    {message.role === 'user' ? 'Vous' : 'MediFollow AI'}
                  </div>

                  <div className="message-bubble">
                    <p>{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="premium-message assistant">
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

      <div className="premium-input-area">
        <div className="premium-chat-input">
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Décrivez votre question clinique..."
            rows={2}
            disabled={loading}
          />

          <button
            type="button"
            className="copilot-send-button"
            onClick={() => onSend(selectedConsultationId || undefined)}
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

        <div className="input-footer">
          <span>↵ Envoyer</span>
          <span>⇧ + ↵ Nouvelle ligne</span>

          <span className="input-security">
            L'IA assiste le médecin. La décision clinique reste médicale.
          </span>
        </div>
      </div>
    </section>
  );
}

