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


      <div className="copilot-workspace">
        <main className="copilot-main-column">
      <div className="copilot-conversation" ref={conversationRef}>
        {messages.length === 0 && (
          <div className="copilot-welcome">
            <div className="welcome-neural-visual">
              <svg
                className="neural-network-svg mf-medical-neural-network"
                viewBox="0 0 420 270"
                role="img"
                aria-label="Réseau neuronal médical inspiré de l’anatomie cérébrale et des connexions synaptiques"
              >
                <defs>
                  <radialGradient id="mfNeuralCore">
                    <stop offset="0" stopColor="#bffff5" stopOpacity=".85" />
                    <stop offset=".48" stopColor="#31d9d5" stopOpacity=".34" />
                    <stop offset="1" stopColor="#1686bd" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="mfNeuralStroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#a9fff2" />
                    <stop offset=".55" stopColor="#45d9df" />
                    <stop offset="1" stopColor="#398fd0" />
                  </linearGradient>
                  <filter id="mfNeuralGlow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <ellipse cx="210" cy="132" rx="168" ry="112" fill="url(#mfNeuralCore)" opacity=".5" />
                <g className="mf-neuron-branches" fill="none" stroke="url(#mfNeuralStroke)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M207 54C185 30 151 34 139 58C110 49 86 70 91 96C65 113 72 148 96 159C91 187 119 205 143 190C159 216 190 204 199 184" />
                  <path d="M213 54C235 30 269 34 281 58C310 49 334 70 329 96C355 113 348 148 324 159C329 187 301 205 277 190C261 216 230 204 221 184" />
                  <path d="M210 47v155M210 73c-24-17-44-13-58 3M210 73c24-17 44-13 58 3M210 104c-30-12-55-3-69 19M210 104c30-12 55-3 69 19M210 137c-24 5-43 20-53 42M210 137c24 5 43 20 53 42" />
                  <path d="M152 76l-24-19-20 5M152 76l-5-27-16-12M141 123l-32-4-18 17M141 123l-17 26-25 3M157 179l-22 18-20-2M157 179l-3 26-13 13" />
                  <path d="M268 76l24-19 20 5M268 76l5-27 16-12M279 123l32-4 18 17M279 123l17 26 25 3M263 179l22 18 20-2M263 179l3 26 13 13" />
                  <path d="M177 93l-18-13M243 93l18-13M171 151l-20 8M249 151l20 8" strokeDasharray="3 6" opacity=".65" />
                </g>

                <g className="mf-neuron-cell-bodies" fill="#bafff5" stroke="#1d8cae" strokeWidth="1.5" filter="url(#mfNeuralGlow)">
                  <circle cx="128" cy="57" r="5" /><circle cx="108" cy="62" r="4" />
                  <circle cx="147" cy="49" r="4" /><circle cx="109" cy="136" r="5" />
                  <circle cx="124" cy="149" r="4" /><circle cx="135" cy="197" r="4" />
                  <circle cx="292" cy="57" r="5" /><circle cx="312" cy="62" r="4" />
                  <circle cx="273" cy="49" r="4" /><circle cx="311" cy="136" r="5" />
                  <circle cx="296" cy="149" r="4" /><circle cx="285" cy="197" r="4" />
                  <circle cx="159" cy="80" r="4" /><circle cx="261" cy="80" r="4" />
                  <circle cx="141" cy="123" r="4.5" /><circle cx="279" cy="123" r="4.5" />
                  <circle cx="157" cy="179" r="4" /><circle cx="263" cy="179" r="4" />
                </g>

                <g className="mf-neural-synapses" fill="#e2fffb">
                  <circle cx="210" cy="47" r="4" /><circle cx="210" cy="73" r="3.5" />
                  <circle cx="210" cy="104" r="4" /><circle cx="210" cy="137" r="4" />
                  <circle cx="210" cy="184" r="4" />
                  <circle cx="91" cy="96" r="3" /><circle cx="329" cy="96" r="3" />
                  <circle cx="96" cy="159" r="3" /><circle cx="324" cy="159" r="3" />
                </g>

                <g className="mf-neural-medical-mark" transform="translate(210 132)">
                  <circle r="25" fill="#082a49" fillOpacity=".88" stroke="#9bfff2" strokeOpacity=".8" strokeWidth="1.5" />
                  <circle r="19" fill="none" stroke="#55e2df" strokeOpacity=".35" />
                  <path d="M-3-12h6v9h9v6H3v9h-6V3h-9v-6h9z" fill="#d7fffa" />
                </g>
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
        </main>

        <aside className="copilot-side-column" aria-label="Outils du copilote">
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
          <section className="copilot-side-card">
            <div className="copilot-side-card-heading">
              <span aria-hidden="true">✧</span>
              <div><strong>Suggestions rapides</strong><small>Accès direct à vos demandes fréquentes</small></div>
            </div>
            <div className="copilot-side-actions">
              <button type="button" onClick={() => onQuestionChange('Aide-moi à analyser ce cas clinique étape par étape.')} disabled={loading}>Analyse d’un cas clinique <span>→</span></button>
              <button type="button" onClick={() => onQuestionChange('Établis un diagnostic différentiel argumenté à partir des données disponibles.')} disabled={loading}>Diagnostic différentiel <span>→</span></button>
              <button type="button" onClick={() => onQuestionChange('Recherche les recommandations récentes et les sources fiables concernant : ')} disabled={loading}>Recommandations récentes <span>→</span></button>
              <button type="button" onClick={() => onQuestionChange('Aide-moi à préparer un plan de prise en charge adapté à ce contexte : ')} disabled={loading}>Plan de prise en charge <span>→</span></button>
            </div>
          </section>
          <section className="copilot-side-note">
            <span aria-hidden="true">ⓘ</span>
            <p>L’IA soutient la réflexion médicale. Vérifiez les informations et les sources avant toute décision clinique.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
