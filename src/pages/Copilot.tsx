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
                aria-label="Illustration anatomique du cerveau avec un réseau de connexions neuronales"
              >
                <defs>
                  <radialGradient id="mfNeuralCore" cx="50%" cy="45%" r="60%">
                    <stop offset="0" stopColor="#d8fff8" stopOpacity=".42" />
                    <stop offset=".62" stopColor="#42c9d0" stopOpacity=".15" />
                    <stop offset="1" stopColor="#1686bd" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="mfBrainSurface" x1="0" y1="0" x2="0.9" y2="1">
                    <stop offset="0" stopColor="#d9fff8" />
                    <stop offset=".42" stopColor="#72dcd9" />
                    <stop offset="1" stopColor="#278db8" />
                  </linearGradient>
                  <linearGradient id="mfBrainFold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#effffb" stopOpacity=".92" />
                    <stop offset="1" stopColor="#1688ad" stopOpacity=".72" />
                  </linearGradient>
                  <filter id="mfBrainSoftGlow" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="5" />
                  </filter>
                </defs>
                <ellipse cx="210" cy="137" rx="157" ry="104" fill="url(#mfNeuralCore)" />
                <ellipse cx="210" cy="137" rx="112" ry="77" fill="#53d6d4" opacity=".10" filter="url(#mfBrainSoftGlow)" />
                <g className="mf-brain-anatomy">
                  <path d="M205 66C193 43 165 38 147 53C126 45 104 58 101 79C78 86 72 109 84 127C69 148 81 174 104 180C109 204 135 214 154 201C170 220 195 210 205 193Z" fill="url(#mfBrainSurface)" fillOpacity=".83" stroke="#bafff4" strokeWidth="2.2" />
                  <path d="M215 66C227 43 255 38 273 53C294 45 316 58 319 79C342 86 348 109 336 127C351 148 339 174 316 180C311 204 285 214 266 201C250 220 225 210 215 193Z" fill="url(#mfBrainSurface)" fillOpacity=".83" stroke="#bafff4" strokeWidth="2.2" />
                  <path d="M210 57C205 84 215 102 210 127C205 153 215 176 210 204" fill="none" stroke="#e3fffa" strokeWidth="2.4" opacity=".9" />
                  <g fill="none" stroke="url(#mfBrainFold)" strokeWidth="3" strokeLinecap="round" opacity=".9">
                    <path d="M108 91C126 72 145 76 151 93C157 108 139 115 126 107C112 99 99 111 105 126" />
                    <path d="M91 139C108 124 128 129 132 145C136 161 119 169 105 160" />
                    <path d="M137 58C153 63 162 77 158 91M164 52C178 64 180 79 170 91" />
                    <path d="M119 181C136 169 153 175 157 190M169 121C185 110 195 119 195 133C195 146 182 151 171 145" />
                    <path d="M312 91C294 72 275 76 269 93C263 108 281 115 294 107C308 99 321 111 315 126" />
                    <path d="M329 139C312 124 292 129 288 145C284 161 301 169 315 160" />
                    <path d="M283 58C267 63 258 77 262 91M256 52C242 64 240 79 250 91" />
                    <path d="M301 181C284 169 267 175 263 190M249 121C235 110 225 119 225 133C225 146 238 151 249 145" />
                  </g>
                </g>
                <g className="mf-neuron-branches" fill="none" stroke="#b8fff2" strokeWidth="1.35" strokeLinecap="round" opacity=".72">
                  <path d="M118 105L88 88L70 91M118 105L96 126L75 132M143 83L130 60L112 48M143 83L165 69L178 48M128 151L103 171L88 192M128 151L145 174L143 198" />
                  <path d="M302 105L332 88L350 91M302 105L324 126L345 132M277 83L290 60L308 48M277 83L255 69L242 48M292 151L317 171L332 192M292 151L275 174L277 198" />
                  <path d="M178 103L193 115L210 111L227 115L242 103M164 153L184 164L210 157L236 164L256 153" opacity=".65" />
                </g>
                <g className="mf-neuron-cell-bodies" fill="#e5fffa" stroke="#36aeb9" strokeWidth="1.2">
                  <circle cx="88" cy="88" r="3.6"/><circle cx="70" cy="91" r="2.8"/><circle cx="96" cy="126" r="3.2"/>
                  <circle cx="130" cy="60" r="3"/><circle cx="178" cy="48" r="3.2"/><circle cx="103" cy="171" r="3.1"/>
                  <circle cx="145" cy="174" r="3.4"/><circle cx="332" cy="88" r="3.6"/><circle cx="350" cy="91" r="2.8"/>
                  <circle cx="324" cy="126" r="3.2"/><circle cx="290" cy="60" r="3"/><circle cx="242" cy="48" r="3.2"/>
                  <circle cx="317" cy="171" r="3.1"/><circle cx="275" cy="174" r="3.4"/>
                </g>
                <g className="mf-neural-synapses" fill="#f0fffc" opacity=".9">
                  <circle cx="210" cy="111" r="3.2"/><circle cx="210" cy="157" r="3.2"/>
                  <circle cx="193" cy="115" r="2.5"/><circle cx="227" cy="115" r="2.5"/>
                </g>
                <g className="mf-neural-medical-mark" transform="translate(210 137)">
                  <circle r="15" fill="#103d5c" fillOpacity=".88" stroke="#c5fff5" strokeOpacity=".8" strokeWidth="1.2" />
                  <path d="M-2.2-8h4.4v5.8H8v4.4H2.2V8h-4.4V2.2H-8v-4.4h5.8z" fill="#e4fffa" />
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
