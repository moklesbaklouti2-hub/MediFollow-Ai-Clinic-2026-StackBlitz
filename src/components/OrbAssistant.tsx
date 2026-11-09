import { useEffect, useRef, useState, type FormEvent } from 'react';
import OrbVisual from './OrbVisual';
import type { ClinicalReasoningAnalysis } from '../hooks/useClinicalReasoning';
import './OrbAssistant.css';

type OrbAssistantProps = {
  isThinking?: boolean;
  currentPage: string;
  onOpenCopilot: () => void;
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
type SpeechAlternativeLike = { transcript: string };
type SpeechResultLike = { isFinal: boolean; [index: number]: SpeechAlternativeLike };
type SpeechEventLike = { resultIndex: number; results: ArrayLike<SpeechResultLike> };
type SpeechErrorLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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
  clinicalPrompt,
  onClinicalPromptConsumed,
  clinicalInsight,
}: OrbAssistantProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<OrbMessage[]>([]);
  const [insightDismissed, setInsightDismissed] = useState(false);
const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechMessage, setSpeechMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseInputRef = useRef('');
  const speechFinalSegmentsRef = useRef<Map<number, string>>(new Map());
  const speechCurrentTextRef = useRef('');
  const shouldContinueListeningRef = useRef(false);
  const speechRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clinicalInsight?.updatedAt) setInsightDismissed(false);
  }, [clinicalInsight?.updatedAt]);

  useEffect(() => {
    if (!clinicalPrompt) return;
    setPanelOpen(true);
    setInput(clinicalPrompt);
    onClinicalPromptConsumed?.();
  }, [clinicalPrompt, onClinicalPromptConsumed]);

  useEffect(() => {
    return () => {
      shouldContinueListeningRef.current = false;
      if (speechRestartTimerRef.current) clearTimeout(speechRestartTimerRef.current);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggleVoiceInput() {
    if (isListening) {
      shouldContinueListeningRef.current = false;
      if (speechRestartTimerRef.current) clearTimeout(speechRestartTimerRef.current);
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSpeechMessage('La dictée vocale n’est pas prise en charge par ce navigateur. Vous pouvez continuer à écrire.');
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      speechBaseInputRef.current = input;
      speechFinalSegmentsRef.current.clear();
      speechCurrentTextRef.current = '';
      shouldContinueListeningRef.current = true;
      recognition.onresult = (event) => {
        let interimText = '';
        // Update only the segments changed by this event. Final segments are
        // retained by their stable index instead of being appended repeatedly.
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = (result[0]?.transcript || '').trim();
          if (result.isFinal) {
            if (transcript) speechFinalSegmentsRef.current.set(index, transcript);
          } else {
            interimText += `${transcript} `;
          }
        }
        const finalParts = Array.from(speechFinalSegmentsRef.current.entries())
          .sort(([a], [b]) => a - b)
          .map(([, value]) => value);

        // Speech services may return overlapping phrases in adjacent results.
        // Merge each segment by removing the longest suffix/prefix word overlap.
        const normalizeWord = (value: string) =>
          value.toLocaleLowerCase('fr-FR').replace(/^[.,;:!?¿¡]+|[.,;:!?¿¡]+$/g, '');
        const mergedWords: string[] = [];
        for (const part of finalParts) {
          const partWords = part.split(/\s+/).filter(Boolean);
          let overlap = 0;
          const maxOverlap = Math.min(mergedWords.length, partWords.length, 12);
          for (let size = maxOverlap; size > 0; size -= 1) {
            const left = mergedWords.slice(-size).map(normalizeWord);
            const right = partWords.slice(0, size).map(normalizeWord);
            if (left.every((word, index) => word === right[index])) {
              overlap = size;
              break;
            }
          }
          mergedWords.push(...partWords.slice(overlap));
        }
        const dictatedText = mergedWords.join(' ').trim();
        speechCurrentTextRef.current = dictatedText;
        const base = speechBaseInputRef.current.trimEnd();
        setInput(`${base}${base && dictatedText ? ' ' : ''}${dictatedText}`);
        setInterimTranscript(interimText.trim());
      };
      recognition.onerror = (event) => {
        const messages: Record<string, string> = {
          'not-allowed': 'Autorisez l’accès au microphone dans votre navigateur pour utiliser la dictée.',
          'service-not-allowed': 'Le service de reconnaissance vocale est indisponible.',
          'no-speech': 'Aucune parole détectée. Réessayez.',
          'audio-capture': 'Aucun microphone accessible n’a été détecté.',
          network: 'La reconnaissance vocale nécessite une connexion réseau.',
        };
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setSpeechMessage(messages[event.error] || 'La dictée vocale a rencontré un problème. Vous pouvez saisir votre texte manuellement.');
          shouldContinueListeningRef.current = false;
          setIsListening(false);
          setInterimTranscript('');
        }
      };
      recognition.onend = () => {
        if (shouldContinueListeningRef.current) {
          // Mobile Chrome may end recognition after a short silence even with
          // continuous=true. Keep dictation active and transparently restart it.
          const previousBase = speechBaseInputRef.current.trimEnd();
          const previousText = speechCurrentTextRef.current.trim();
          speechBaseInputRef.current = `${previousBase}${previousBase && previousText ? ' ' : ''}${previousText}`;
          speechCurrentTextRef.current = '';
          speechFinalSegmentsRef.current.clear();
          speechRestartTimerRef.current = setTimeout(() => {
            if (!shouldContinueListeningRef.current) return;
            try {
              recognition.start();
            } catch {
              shouldContinueListeningRef.current = false;
              setIsListening(false);
              setSpeechMessage('La dictée s’est interrompue. Appuyez sur le microphone pour reprendre.');
              recognitionRef.current = null;
            }
          }, 300);
          return;
        }
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      setSpeechMessage('');
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechMessage('Impossible de démarrer le microphone. Vérifiez les autorisations du navigateur.');
    }
  }

  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = suggestionsByPage[currentPage] || suggestionsByPage['Tableau de bord'];

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

    const context = {
      currentPage,
      assistantMode: 'assistant permanent de navigation et de réflexion clinique',
    };

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

  return (
    <div className={`mf-orb-assistant${isThinking || sending ? ' is-thinking' : ''}`}>
      {clinicalInsight?.enabled && clinicalInsight.status !== 'idle' && !panelOpen && !insightDismissed && (
        <aside className={`mf-orb-insight-bubble ${clinicalInsight.analysis?.priority === 'urgent' ? 'is-urgent' : ''}`} aria-live="polite" aria-label="Analyse clinique de l’Orb">
          <div className="mf-orb-insight-top">
            <div className="mf-orb-insight-heading">
              <span className={`mf-orb-status-dot${clinicalInsight.status === 'analyzing' ? ' is-thinking' : ''}`} />
              <strong>{clinicalInsight.status === 'analyzing' ? 'MediFollow analyse…' : clinicalInsight.status === 'error' ? 'Analyse à relancer' : 'Réflexion clinique'}</strong>
            </div>
            <button type="button" className="mf-orb-insight-close" onClick={() => setInsightDismissed(true)} aria-label="Fermer la réflexion clinique" title="Fermer">×</button>
          </div>
          {clinicalInsight.status === 'ready' && clinicalInsight.analysis ? (
            <>
              <span className={`mf-orb-priority priority-${clinicalInsight.analysis.priority}`}>
                {clinicalInsight.analysis.priority === 'urgent' ? 'Priorité urgente' : clinicalInsight.analysis.priority === 'attention' ? 'Attention' : 'Analyse'}
              </span>
              <p>{clinicalInsight.analysis.situationSummary}</p>
              {clinicalInsight.analysis.evolutionNote && <p><strong>Évolution :</strong> {clinicalInsight.analysis.evolutionNote}</p>}
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

          <div className="mf-orb-conversation" ref={conversationRef} aria-live="polite">
            {clinicalInsight?.enabled && clinicalInsight.status === 'ready' && clinicalInsight.analysis && (
              <div className="mf-orb-message assistant mf-orb-live-analysis">
                <span>RAISONNEMENT CLINIQUE · {clinicalInsight.updatedAt}</span>
                <p><strong>{clinicalInsight.analysis.priority === 'urgent' ? 'Priorité urgente — évaluation immédiate' : clinicalInsight.analysis.priority === 'attention' ? 'Point d’attention' : 'Analyse clinique'}</strong></p>
                <p>{clinicalInsight.analysis.situationSummary}</p>
                {clinicalInsight.analysis.evolutionNote && <p><strong>Évolution :</strong> {clinicalInsight.analysis.evolutionNote}</p>}
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
            <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Écrivez ou dictez à votre assistant…" rows={2} disabled={sending} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
            <button
              type="button"
              className={`mf-orb-mic-button${isListening ? ' is-listening' : ''}`}
              onClick={toggleVoiceInput}
              disabled={sending}
              aria-label={isListening ? 'Arrêter la dictée vocale' : 'Dicter un message'}
              title={isListening ? 'Arrêter la dictée' : 'Dicter un message'}
            >{isListening ? '■' : '🎙'}</button>
            <button type="submit" disabled={!input.trim() || sending} aria-label="Envoyer">↑</button>
          </form>
          {(isListening || interimTranscript || speechMessage) && (
            <div className={`mf-orb-speech-status${speechMessage ? ' has-error' : ''}`} aria-live="polite">
              {speechMessage || (isListening ? 'Écoute en cours… Parlez clairement en français.' : interimTranscript)}
              {interimTranscript && isListening ? ` ${interimTranscript}` : ''}
            </div>
          )}
          <div className="mf-orb-panel-footer">
            <span>Entrée pour envoyer · Maj + Entrée pour une ligne</span>
            <button type="button" onClick={() => { setPanelOpen(false); onOpenCopilot(); }}>Ouvrir le copilote complet ↗</button>
          </div>
        </section>
      )}

      <button type="button" className={`mf-orb-launcher${panelOpen ? ' is-open' : ''}${isThinking || sending || clinicalInsight?.status === 'analyzing' ? ' is-thinking' : ''}`} onClick={() => setPanelOpen(open => !open)} aria-label={panelOpen ? 'Fermer MediFollow AI' : 'Discuter avec MediFollow AI'} aria-expanded={panelOpen} title="Discuter avec MediFollow AI">
        <span className="mf-orb-canvas"><OrbVisual isThinking={isThinking || sending} /></span>
      </button>
      <span className="mf-orb-caption">{sending || isThinking ? 'JE RÉFLÉCHIS' : 'À VOTRE ÉCOUTE'}</span>
    </div>
  );
}
