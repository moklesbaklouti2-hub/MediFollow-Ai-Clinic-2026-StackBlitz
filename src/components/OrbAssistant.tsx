import { useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import type { Patient, Consultation } from '../types/medical';
import OrbVisual from './OrbVisual';
import type { ClinicalReasoningAnalysis } from '../hooks/useClinicalReasoning';
import './OrbAssistant.css';

type OrbAssistantProps = {
  isThinking?: boolean;
  currentPage: string;
  onOpenCopilot: () => void;
  patients: Patient[];
  consultations: Consultation[];
  clinicalPrompt?: string;
  onClinicalPromptConsumed?: () => void;
  clinicalInsight?: {
    enabled: boolean;
    status: 'idle' | 'analyzing' | 'ready' | 'error';
    analysis: ClinicalReasoningAnalysis | null;
    error: string;
    updatedAt: string;
  };
};

type OrbMessage = { role: 'user' | 'assistant'; content: string };

const suggestionsByPage: Record<string, string[]> = {
  'Tableau de bord': ['Aide-moi à organiser ma journée.', 'Quels points dois-je surveiller dans mon activité ?'],
  'Patients': ['Aide-moi à structurer l’évaluation d’un patient.', 'Quelles informations importantes vérifier dans un dossier ?'],
  'Consultations': ['Guide-moi dans cette consultation étape par étape.', 'Quelles informations cliniques me manquent ?'],
  'Copilote IA': ['Aide-moi à approfondir mon raisonnement clinique.', 'Recherche les recommandations récentes sur :'],
  'Protocoles médicaux': ['Aide-moi à vérifier ce protocole.', 'Quelles recommandations récentes consulter ?'],
  'Ordonnances': ['Aide-moi à vérifier la sécurité de cette prescription.', 'Quels points contrôler avant validation ?'],
  'Paramètres': ['Aide-moi à configurer MediFollow.', 'Quelles fonctions puis-je personnaliser ?'],
};

export default function OrbAssistant({
  isThinking = false,
  currentPage,
  onOpenCopilot,
  patients,
  consultations,
  clinicalPrompt,
  onClinicalPromptConsumed,
  clinicalInsight,
}: OrbAssistantProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<OrbMessage[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedConsultationId, setSelectedConsultationId] = useState('');
  const [shareClinicalContext, setShareClinicalContext] = useState(false);

  useEffect(() => {
    if (!clinicalPrompt) return;
    setPanelOpen(true);
    setInput(clinicalPrompt);
    onClinicalPromptConsumed?.();
  }, [clinicalPrompt, onClinicalPromptConsumed]);
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = suggestionsByPage[currentPage] || suggestionsByPage['Tableau de bord'];

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const patientConsultations = selectedPatient
    ? consultations
        .filter((item) => item.patientId === selectedPatient.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  const selectedConsultation = patientConsultations.find(
    (item) => item.id === selectedConsultationId
  );

  useEffect(() => {
    if (panelOpen) inputRef.current?.focus();
  }, [panelOpen]);

  useEffect(() => {
    const area = conversationRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [messages, sending, panelOpen]);

  async function sendMessage(value = input) {
    const message = value.trim();
    if (!message || sending) return;
    const history = messages.slice(-12);
    setMessages(previous => [...previous, { role: 'user', content: message }]);
    setInput('');
    setSending(true);

    const context: Record<string, unknown> = {
      currentPage,
      assistantMode: 'assistant permanent de navigation et de réflexion clinique',
      clinicalContextSharing: shareClinicalContext,
    };

    if (shareClinicalContext && selectedPatient) {
      context.patient = {
        age: selectedPatient.age,
        sex: selectedPatient.sex,
        clinicalHistory: selectedPatient.clinicalHistory,
        currentMedications: selectedPatient.currentMedications,
      };
      if (selectedConsultation) {
        context.consultation = {
          date: selectedConsultation.date,
          specialty: selectedConsultation.specialty,
          motif: selectedConsultation.motif,
          symptoms: selectedConsultation.symptoms,
          history: selectedConsultation.history,
          vitals: selectedConsultation.vitals,
          physicalExamination: selectedConsultation.physicalExamination,
          examination: selectedConsultation.examination,
          diagnosis: selectedConsultation.diagnosis,
          plan: selectedConsultation.plan,
        };
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, history }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const unexpected = await response.text();
        throw new Error('Réponse inattendue du serveur : ' + unexpected.slice(0, 120));
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur du moteur IA.');
      setMessages(previous => [...previous, { role: 'assistant', content: data.reply || 'Je n’ai pas reçu de réponse.' }]);
    } catch (error) {
      setMessages(previous => [...previous, {
        role: 'assistant',
        content: error instanceof Error ? 'Je rencontre un problème : ' + error.message : 'Impossible de contacter le moteur IA.',
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  const selectStyle: CSSProperties = {
    width: '100%',
    minHeight: 38,
    padding: '8px 10px',
    border: '1px solid var(--border, #dce4e8)',
    borderRadius: 9,
    background: 'var(--surface, #fff)',
    color: 'var(--text-primary, #20334b)',
    font: 'inherit',
    fontSize: 12,
  };

  return (
    <div className={`mf-orb-assistant${isThinking || sending ? ' is-thinking' : ''}`}>
      {clinicalInsight?.enabled && clinicalInsight.status !== 'idle' && !panelOpen && (
        <aside className={`mf-orb-insight-bubble ${clinicalInsight.analysis?.priority === 'urgent' ? 'is-urgent' : ''}`} aria-live="polite" aria-label="Analyse clinique de l’Orb">
          <div className="mf-orb-insight-top">
            <span className={`mf-orb-status-dot${clinicalInsight.status === 'analyzing' ? ' is-thinking' : ''}`} />
            <strong>{clinicalInsight.status === 'analyzing' ? 'MediFollow analyse…' : clinicalInsight.status === 'error' ? 'Analyse à relancer' : 'Réflexion clinique'}</strong>
          </div>
          {clinicalInsight.status === 'ready' && clinicalInsight.analysis ? (
            <>
              <span className={`mf-orb-priority priority-${clinicalInsight.analysis.priority}`}>
                {clinicalInsight.analysis.priority === 'urgent' ? 'Priorité urgente' : clinicalInsight.analysis.priority === 'attention' ? 'Attention' : 'Analyse'}
              </span>
              <p>{clinicalInsight.analysis.situationSummary}</p>
              {clinicalInsight.analysis.nextQuestion && (
                <div className="mf-orb-insight-question">
                  <small>QUESTION SUIVANTE</small>
                  <strong>{clinicalInsight.analysis.nextQuestion}</strong>
                </div>
              )}
              <button type="button" onClick={() => {
                const prompt = clinicalInsight.analysis?.nextQuestion
                  ? `Poursuivons le raisonnement clinique de cette consultation. Résumé de l'analyse : ${clinicalInsight.analysis.situationSummary} Question à approfondir : ${clinicalInsight.analysis.nextQuestion}`
                  : `Aide-moi à approfondir cette analyse clinique : ${clinicalInsight.analysis?.situationSummary || ''}`;
                setInput(prompt);
                setPanelOpen(true);
              }}>Approfondir avec l’Orb ↗</button>
            </>
          ) : clinicalInsight.status === 'error' ? (
            <p>{clinicalInsight.error || 'Le moteur IA n’a pas pu terminer l’analyse.'}</p>
          ) : (
            <p>Je prends en compte les nouvelles informations de la consultation.</p>
          )}
        </aside>
      )}

      {panelOpen && (
        <section className="mf-orb-panel" aria-label="Discussion avec MediFollow AI">
          <div className="mf-orb-panel-header">
            <div className="mf-orb-panel-identity">
              <span className={`mf-orb-status-dot${sending || isThinking ? ' is-thinking' : ''}`} />
              <div><strong>MediFollow AI</strong><small>ASSISTANT CLINIQUE PERMANENT</small></div>
            </div>
            <button type="button" className="mf-orb-close" onClick={() => setPanelOpen(false)} aria-label="Fermer l'assistant">×</button>
          </div>

          <div className="mf-orb-context"><span>Vous êtes dans</span><strong>{currentPage}</strong><span>Je peux vous accompagner sur cette étape.</span></div>

          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border, #e5ebef)', display: 'grid', gap: 8 }}>
            <strong style={{ fontSize: 12 }}>Contexte médical (facultatif)</strong>
            <select
              aria-label="Choisir un patient pour le contexte médical"
              style={selectStyle}
              value={selectedPatientId}
              disabled={sending}
              onChange={(event) => {
                setSelectedPatientId(event.target.value);
                setSelectedConsultationId('');
                setShareClinicalContext(false);
              }}
            >
              <option value="">Ne partager aucun dossier patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name} · {patient.age} ans</option>
              ))}
            </select>
            {selectedPatient && (
              <select
                aria-label="Choisir une consultation enregistrée"
                style={selectStyle}
                value={selectedConsultationId}
                disabled={sending}
                onChange={(event) => {
                  setSelectedConsultationId(event.target.value);
                  setShareClinicalContext(false);
                }}
              >
                <option value="">Sans consultation associée</option>
                {patientConsultations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {new Date(item.date).toLocaleDateString('fr-FR')} · {item.motif || 'Sans motif'}
                  </option>
                ))}
              </select>
            )}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, lineHeight: 1.4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={shareClinicalContext && Boolean(selectedPatient)}
                disabled={!selectedPatient || sending}
                onChange={(event) => setShareClinicalContext(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>J’autorise l’envoi du contexte clinique sélectionné avec mes prochains messages.</span>
            </label>
            <span style={{ color: 'var(--text-secondary, #81909c)', fontSize: 10 }}>
              Le nom et le téléphone du patient ne sont pas transmis. Aucun dossier n’est envoyé sans votre autorisation.
            </span>
          </div>

          <div className="mf-orb-conversation" ref={conversationRef} aria-live="polite">
            {clinicalInsight?.enabled && clinicalInsight.status === 'ready' && clinicalInsight.analysis && (
              <div className="mf-orb-message assistant mf-orb-live-analysis">
                <span>RAISONNEMENT CLINIQUE · {clinicalInsight.updatedAt}</span>
                <p><strong>{clinicalInsight.analysis.priority === 'urgent' ? 'Priorité urgente — évaluation immédiate' : clinicalInsight.analysis.priority === 'attention' ? 'Point d’attention' : 'Analyse clinique'}</strong></p>
                <p>{clinicalInsight.analysis.situationSummary}</p>
                {clinicalInsight.analysis.nextQuestion && (
                  <p><strong>Question à explorer :</strong> {clinicalInsight.analysis.nextQuestion}</p>
                )}
                {clinicalInsight.analysis.whyThisQuestion && <p>{clinicalInsight.analysis.whyThisQuestion}</p>}
                <button type="button" onClick={() => setInput(clinicalInsight.analysis?.nextQuestion || 'Approfondissons cette analyse clinique.')}>
                  Reprendre la question dans le chat
                </button>
              </div>
            )}
            {clinicalInsight?.enabled && clinicalInsight.status === 'error' && (
              <div className="mf-orb-message assistant"><span>ANALYSE CLINIQUE</span><p>{clinicalInsight.error || 'Analyse indisponible. Réessayez après quelques secondes.'}</p></div>
            )}
            {messages.length === 0 ? (
              <div className="mf-orb-welcome">
                <div className="mf-orb-mini"><span className="mf-orb-mini-core" /></div>
                <strong>Je suis à vos côtés.</strong>
                <p>Posez-moi une question à tout moment. Je tiens compte de la section ouverte et je vous aide à avancer, sans remplacer votre jugement médical.</p>
                <div className="mf-orb-suggestions">
                  {suggestions.map(item => <button type="button" key={item} onClick={() => void sendMessage(item)} disabled={sending}>{item}</button>)}
                </div>
              </div>
            ) : messages.map((message, index) => (
              <div className={`mf-orb-message ${message.role}`} key={index}>
                <span>{message.role === 'user' ? 'Vous' : 'MediFollow'}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {sending && <div className="mf-orb-typing">MediFollow réfléchit…</div>}
          </div>

          <form className="mf-orb-chat-form" onSubmit={handleSubmit}>
            <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Écrivez à votre assistant…" rows={2} disabled={sending} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
            <button type="submit" disabled={!input.trim() || sending} aria-label="Envoyer">↑</button>
          </form>
          <div className="mf-orb-panel-footer">
            <span>Entrée pour envoyer · Maj + Entrée pour une ligne</span>
            <button type="button" onClick={() => { setPanelOpen(false); onOpenCopilot(); }}>Ouvrir le copilote complet ↗</button>
          </div>
          <p className="mf-orb-privacy">Les données d’un patient ne sont jointes que si vous les sélectionnez et cochez l’autorisation.</p>
        </section>
      )}

      <button type="button" className={`mf-orb-launcher${panelOpen ? ' is-open' : ''}`} onClick={() => setPanelOpen(open => !open)} aria-label={panelOpen ? 'Fermer MediFollow AI' : 'Discuter avec MediFollow AI'} aria-expanded={panelOpen} title="Discuter avec MediFollow AI">
        <span className="mf-orb-canvas"><OrbVisual isThinking={isThinking || sending} /></span>
      </button>
      <span className="mf-orb-caption">{sending || isThinking ? 'JE RÉFLÉCHIS' : 'À VOTRE ÉCOUTE'}</span>
    </div>
  );
}
