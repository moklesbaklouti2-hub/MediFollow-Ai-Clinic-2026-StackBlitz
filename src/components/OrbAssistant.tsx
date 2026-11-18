import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import type { HeliosVoice } from '../hooks/useHeliosVoice';
import OrbVisual from './OrbVisual';
import type { ClinicalReasoningAnalysis } from '../hooks/useClinicalReasoning';
import type { VoiceCommandAction } from '../types/medical';
import { normalizeSpeechCandidate, findMedicalSpeechCorrections, applyMedicalSpeechCorrection, chooseMedicalSpeechAlternative, hasDictatedClinicalNumber, type SpeechResultLike, type MedicalSpeechCorrection } from '../services/medicalSpeech';
import { sendClinicalRequest } from '../services/doctorClinicalTransport';
import './OrbAssistant.css';

type OrbAssistantProps = {
  voice: HeliosVoice;
  contextKey: string;
  isThinking?: boolean;
  currentPage: string;
  onOpenCopilot: () => void;
  onNavigate: (page: string) => void;
  onCommandActions: (actions: VoiceCommandAction[]) => void;
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
type SpeechEventLike = { resultIndex: number; results: ArrayLike<SpeechResultLike> };
type SpeechErrorLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  maxAlternatives: number;
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
  voice,
  contextKey,
  isThinking = false,
  currentPage,
  onOpenCopilot,
  onNavigate,
  onCommandActions,
  clinicalPrompt,
  onClinicalPromptConsumed,
  clinicalInsight,
}: OrbAssistantProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  // Ref synchronisée à l'ouverture/fermeture : une réponse IA tardive
  // ne doit pas recommencer à parler dans un panneau désormais fermé.
  const panelOpenRef = useRef(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'command'>('chat');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<OrbMessage[]>([]);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechMessage, setSpeechMessage] = useState('');
  const [speechCorrections, setSpeechCorrections] = useState<MedicalSpeechCorrection[]>([]);
  const [dictatedNumberPending, setDictatedNumberPending] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const commandListeningEnabledRef = useRef(false);
  const speechBaseInputRef = useRef('');
  const speechFinalSegmentsRef = useRef<Map<number, string>>(new Map());
  const speechCurrentTextRef = useRef('');
  const speechRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStart = useRef<() => void>(() => {});
  const requestContext = useRef(0);
  const { stop, beforePlayback } = voice;

  function suspendRecognition(disarm: boolean) {
    if (disarm) commandListeningEnabledRef.current = false;
    if (speechRestartTimerRef.current !== null) {
      clearTimeout(speechRestartTimerRef.current);
      speechRestartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.abort();
    if (recognition && mode === 'command') setInput('');
    setIsListening(false);
    setInterimTranscript('');
  }

  useLayoutEffect(() => {
    beforePlayback.current = suspendRecognition;
    return () => { beforePlayback.current = null; };
  });

  useLayoutEffect(() => {
    requestContext.current += 1;
    suspendRecognition(true);
  }, [contextKey, currentPage]);

  function scheduleCommandRestart() {
    if (!panelOpenRef.current || !commandListeningEnabledRef.current || voice.isActive() ||
        recognitionRef.current || speechRestartTimerRef.current !== null) return;
    speechRestartTimerRef.current = setTimeout(() => {
      speechRestartTimerRef.current = null;
      if (panelOpenRef.current && commandListeningEnabledRef.current && !voice.isActive() &&
          !recognitionRef.current) latestStart.current();
    }, 500);
  }

  useEffect(() => {
    if (!voice.active && !sending) scheduleCommandRestart();
  }, [voice.active, sending]);

  function openPanel() {
    panelOpenRef.current = true;
    setPanelOpen(true);
  }

  function closePanel() {
    panelOpenRef.current = false;
    requestContext.current += 1;
    suspendRecognition(true);
    stop();
    setPanelOpen(false);
  }

  function changeMode(next: typeof mode) {
    if (next === mode) return;
    requestContext.current += 1;
    suspendRecognition(true);
    stop();
    setMode(next);
  }

  function speakReply(reply: string, expectedGeneration: number) {
    if (panelOpenRef.current) voice.play(reply, expectedGeneration);
  }

  useEffect(() => {
    if (clinicalInsight?.updatedAt) setInsightDismissed(false);
  }, [clinicalInsight?.updatedAt]);

  useEffect(() => {
    if (!clinicalPrompt) return;
    openPanel();
    setInput(clinicalPrompt);
    onClinicalPromptConsumed?.();
  }, [clinicalPrompt, onClinicalPromptConsumed]);

  useEffect(() => {
    return () => {
      panelOpenRef.current = false;
      commandListeningEnabledRef.current = false;
      if (speechRestartTimerRef.current !== null) clearTimeout(speechRestartTimerRef.current);
      speechRestartTimerRef.current = null;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();
    };
  }, []);

  function toggleVoiceInput() {
    const interruptingVoice = voice.isActive();
    stop();
    if (!interruptingVoice && (recognitionRef.current || commandListeningEnabledRef.current)) {
      commandListeningEnabledRef.current = false;
      recognitionRef.current?.stop();
      return;
    }
    startRecognition();
  }

  function startRecognition() {
    if (mode === 'command') commandListeningEnabledRef.current = true;

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      commandListeningEnabledRef.current = false;
      setSpeechMessage('La dictée vocale n’est pas prise en charge par ce navigateur. Vous pouvez continuer à écrire.');
      return;
    }

    try {
      // Android Chrome peut renvoyer plusieurs fois les résultats d'une session
      // continue. Une session correspond donc à une seule prise de parole.
      const recognition = new Recognition();
      let sessionEnded = false;
      speechBaseInputRef.current = mode === 'command' ? '' : input;
      speechCurrentTextRef.current = '';
      speechFinalSegmentsRef.current.clear();
      setSpeechCorrections([]);

      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 5;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        if (sessionEnded || recognitionRef.current !== recognition) return;

        const finalParts: string[] = [];
        const interimParts: string[] = [];

        // Relire la liste complète à chaque événement : ne jamais concaténer
        // un résultat déjà reçu avec sa nouvelle version.
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = chooseMedicalSpeechAlternative(result);
          if (!transcript) continue;

          if (result.isFinal) {
            finalParts.push(transcript);
          } else {
            interimParts.push(transcript);
          }
        }

        // Éliminer uniquement les répétitions consécutives strictement identiques.
        const uniqueFinalParts = finalParts.filter((part, index) =>
          index === 0 || part.toLocaleLowerCase() !== finalParts[index - 1].toLocaleLowerCase()
        );
        const dictatedText = uniqueFinalParts.join(' ').trim();
        speechCurrentTextRef.current = dictatedText;
        setSpeechCorrections(findMedicalSpeechCorrections(dictatedText));
        if (mode !== 'command') setDictatedNumberPending(hasDictatedClinicalNumber(dictatedText));

        const base = speechBaseInputRef.current.trimEnd();
        setInput(`${base}${base && dictatedText ? ' ' : ''}${dictatedText}`);
        setInterimTranscript(interimParts.join(' ').trim());
      };

      recognition.onerror = (event) => {
        if (sessionEnded || recognitionRef.current !== recognition) return;
        // Une erreur (refus d'accès, réseau, absence de parole ou autre)
        // invalide immédiatement la session, même si une transcription
        // finale avait été reçue juste avant. Aucun ordre ne sera exécuté.
        sessionEnded = true;
        commandListeningEnabledRef.current = false;
        recognitionRef.current = null;
        speechCurrentTextRef.current = '';
        speechFinalSegmentsRef.current.clear();
        setSpeechCorrections([]);
        setInterimTranscript('');
        setIsListening(false);
        if (mode === 'command') setInput('');
        // Ne dépendre ni du délai ni de la présence d'un événement "end"
        // envoyé après l'erreur par le navigateur Android.
        try { recognition.abort(); } catch { /* reconnaissance déjà arrêtée */ }
        const messages: Record<string, string> = {
          'not-allowed': 'Autorisez l’accès au microphone dans votre navigateur pour utiliser la dictée.',
          'service-not-allowed': 'Le service de reconnaissance vocale est indisponible.',
          'no-speech': 'Aucune parole détectée. Vous pouvez relancer la dictée.',
          'audio-capture': 'Aucun microphone accessible n’a été détecté.',
          network: 'La reconnaissance vocale nécessite une connexion réseau.',
        };
        // Toute erreur bloque le redémarrage automatique, y compris
        // celles que ce navigateur ne répertorie pas encore.
        if (event.error !== 'aborted') {
          setSpeechMessage(messages[event.error] || 'La dictée vocale a rencontré un problème. Vous pouvez saisir votre texte manuellement.');
        }
      };

      recognition.onend = () => {
        if (sessionEnded || recognitionRef.current !== recognition) return;
        sessionEnded = true;

        const base = speechBaseInputRef.current.trimEnd();
        const dictatedText = speechCurrentTextRef.current.trim();
        const finalInput = `${base}${base && dictatedText ? ' ' : ''}${dictatedText}`;
        setSpeechCorrections(findMedicalSpeechCorrections(dictatedText));

        speechBaseInputRef.current = finalInput;
        speechCurrentTextRef.current = '';
        speechFinalSegmentsRef.current.clear();
        recognitionRef.current = null;
        setInput(mode === 'command' ? '' : finalInput);
        setInterimTranscript('');
        setIsListening(false);
        if (mode === 'command' && commandListeningEnabledRef.current) {
          const normalizedVoiceCommand = dictatedText.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (/^(?:stop|arrete|arret)(?:[\s,;:.!?-]+(?:l['’]?)?ecoute)?[\s,;:.!?-]*$/.test(normalizedVoiceCommand)) {
            commandListeningEnabledRef.current = false;
            setSpeechMessage('Écoute vocale arrêtée.');
          } else if (dictatedText && hasDictatedClinicalNumber(dictatedText)) {
            commandListeningEnabledRef.current = false;
            setSpeechMessage('Valeur numérique dictée : commande suspendue. Vérifiez et confirmez les chiffres manuellement avant toute action.');
          } else if (dictatedText) {
            void sendMessage(dictatedText).finally(scheduleCommandRestart);
          } else {
            scheduleCommandRestart();
          }
        }
      };

      setSpeechMessage('');
      setInterimTranscript('');
      setIsListening(true);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      // Un échec de démarrage ne doit pas conserver une écoute automatique armée.
      commandListeningEnabledRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript('');
      setSpeechMessage('Impossible de démarrer le microphone. Vérifiez les autorisations du navigateur.');
    }
  }

  useLayoutEffect(() => { latestStart.current = startRecognition; });

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
    if (mode !== 'command' && dictatedNumberPending) {
      setSpeechMessage('Confirmez les valeurs numériques dictées après relecture avant l’envoi.');
      return;
    }
    const responseSpeechGeneration = stop();
    const contextAtRequest = requestContext.current;
    suspendRecognition(false);
    const history = messages.slice(-12);
    if (mode !== 'command') setMessages(previous => [...previous, { role: 'user', content: message }]);
    setInput('');
    setDictatedNumberPending(false);
    setSending(true);

    const context = {
      currentPage,
      assistantMode: 'assistant permanent de navigation et de réflexion clinique',
    };

    try {
      if (mode === 'command') {
        const normalized = message.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const quickRoutes: Array<{ page: string; patterns: RegExp[] }> = [
          { page: 'Tableau de bord', patterns: [/\b(tableau de bord|accueil|page d accueil)\b/] },
          { page: 'Patients', patterns: [/\b(patient|patients|dossier patient|liste des patients)\b/] },
          { page: 'Consultations', patterns: [/\b(consultation|consultations)\b/] },
          { page: 'Copilote IA', patterns: [/\b(copilote|assistant ia|jarvis)\b/] },
          { page: 'Protocoles médicaux', patterns: [/\b(protocole|protocoles|protocoles medicaux)\b/] },
          { page: 'Ordonnances', patterns: [/\b(ordonnance|ordonnances|prescription|prescriptions)\b/] },
          { page: 'Inventaire', patterns: [/\b(inventaire|stock|stocks)\b/] },
          { page: 'Paramètres', patterns: [/\b(parametre|parametres|reglages)\b/] },
        ];
        const quickMatch = quickRoutes.find(route =>
          route.patterns.some(pattern => pattern.test(normalized)) &&
          /\b(ouvre|ouvrir|affiche|afficher|va|aller|retourne|accede|acceder|montre|montre moi)\b/.test(normalized) &&
          !/\b(choisis|choisir|selectionne|selectionner|ecris|ecrire|remplis|remplir|ajoute|ajouter|enregistre|enregistrer|cree|creer|modifie|modifier|prescris|prescrire)\b/.test(normalized)
        );
        if (quickMatch) {
          onNavigate(quickMatch.page);
          setMessages(previous => [...previous, { role: 'assistant', content: quickMatch.page + ' ouvert.' }]);
          speakReply(quickMatch.page + ' ouvert.', responseSpeechGeneration);
          return;
        }

        const response = await sendClinicalRequest('/api/commands/interpret', {
          instruction: message,
          currentPage,
        });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) throw new Error('Réponse inattendue du moteur de commandes.');
        const data = await response.json();
        if (!response.ok) throw new Error([data.error || 'Erreur du moteur de commandes.', data.detail].filter(Boolean).join(' — '));

        if (contextAtRequest !== requestContext.current || !panelOpenRef.current) return;
        const safeActions: VoiceCommandAction[] = [];
        if (Array.isArray(data.actions)) {
          for (const action of data.actions) {
            if (!action || typeof action !== 'object') continue;
            if (action.type === 'navigate' && typeof action.page === 'string') {
              safeActions.push({ type: 'navigate', page: action.page });
            } else if (action.type === 'select_patient' && typeof action.patientName === 'string') {
              safeActions.push({ type: 'select_patient', patientName: action.patientName });
            } else if (
              action.type === 'set_consultation_field' &&
              typeof action.field === 'string' &&
              typeof action.value === 'string'
            ) {
              safeActions.push({
                type: 'set_consultation_field',
                field: action.field as Extract<VoiceCommandAction, { type: 'set_consultation_field' }>['field'],
                value: action.value,
              });
            } else if (
              action.type === 'set_vital' &&
              typeof action.field === 'string' &&
              typeof action.value === 'string'
            ) {
              safeActions.push({
                type: 'set_vital',
                field: action.field as Extract<VoiceCommandAction, { type: 'set_vital' }>['field'],
                value: action.value,
              });
            }
          }
        }
        if (safeActions.length) onCommandActions(safeActions);
        const executedPages = safeActions
          .filter((action): action is Extract<VoiceCommandAction, { type: 'navigate' }> => action.type === 'navigate')
          .map(action => action.page);
        const resultParts: string[] = [];
        if (data.message) resultParts.push(String(data.message));
        if (executedPages.length) resultParts.push('Navigation demandée : ' + [...new Set(executedPages)].join(' → ') + '.');
        if (Array.isArray(data.unsupportedInstructions) && data.unsupportedInstructions.length) {
          resultParts.push('Actions non encore connectées : ' + data.unsupportedInstructions.join(' ; ') + '. Les actions non encore prises en charge n’ont pas été effectuées.');
        }
        setMessages(previous => [...previous, {
          role: 'assistant',
          content: resultParts.join('\n\n') || 'Je n’ai identifié aucune action sûre à effectuer. Pouvez-vous reformuler la commande ?',
        }]);
        speakReply(safeActions.length ? 'Commande traitée. Vérifiez les modifications affichées.' : 'Je n’ai identifié aucune action sûre. Pouvez-vous reformuler ?', responseSpeechGeneration);
        return;
      }

      const response = await sendClinicalRequest('/api/chat', {
        message, context, history,
      }, { signal: AbortSignal.timeout(45000) });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const unexpected = await response.text();
        throw new Error('Réponse inattendue du serveur : ' + unexpected.slice(0, 120));
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur du moteur IA.');
      setMessages(previous => [...previous, { role: 'assistant', content: data.reply || 'Je n’ai pas reçu de réponse.' }]);
      speakReply(data.reply || 'Je n’ai pas reçu de réponse.', responseSpeechGeneration);
    } catch (error) {
      setMessages(previous => [...previous, {
        role: 'assistant',
        content: error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
          ? 'Le moteur IA met trop de temps à répondre (45 s). Réessayez ; les autres fonctions restent disponibles.'
          : error instanceof Error ? 'Je rencontre un problème : ' + error.message : 'Impossible de contacter le moteur IA.',
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
        <aside className={`mf-orb-insight-bubble ${clinicalInsight.analysis?.priority === 'urgent' ? 'is-urgent' : ''}`} aria-live="polite" aria-label="Analyse clinique de JARVIS">
          <div className="mf-orb-insight-top">
            <div className="mf-orb-insight-heading">
              <span className={`mf-orb-status-dot${clinicalInsight.status === 'analyzing' ? ' is-thinking' : ''}`} />
              <strong>{clinicalInsight.status === 'analyzing' ? 'JARVIS analyse…' : clinicalInsight.status === 'error' ? 'Analyse à relancer' : 'Réflexion clinique'}</strong>
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
                openPanel();
              }}>Approfondir avec JARVIS ↗</button>
            </>
          ) : clinicalInsight.status === 'error' ? (
            <p>{clinicalInsight.error || 'Le moteur IA n’a pas pu terminer l’analyse.'}</p>
          ) : (
            <p>Je prends en compte les nouvelles informations de la consultation.</p>
          )}
        </aside>
      )}

      {panelOpen && (
        <section className="mf-orb-panel" aria-label="Discussion avec JARVIS">
          <div className="mf-orb-panel-header">
            <div className="mf-orb-panel-identity">
              <span className={`mf-orb-status-dot${sending || isThinking ? ' is-thinking' : ''}`} />
              <div><strong>JARVIS</strong><small>ASSISTANT CLINIQUE PERMANENT</small></div>
            </div>
            <button type="button" className="mf-orb-close" onClick={closePanel} aria-label="Fermer l'assistant">×</button>
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
                <span>{message.role === 'user' ? 'Vous' : 'JARVIS'}</span>
                <p>{message.content}</p>
                {message.role === 'assistant' && (
                  <button
                    type="button"
                    className="mf-orb-read-reply"
                    onClick={() => voice.listen(message.content)}
                    disabled={!voice.voices.length}
                    aria-label={`Écouter la réponse ${index + 1} de JARVIS`}
                    title="Lecture ponctuelle avec confirmation de confidentialité"
                  >
                    Écouter
                  </button>
                )}
              </div>
            ))}
            {sending && <div className="mf-orb-typing">JARVIS réfléchit…</div>}
          </div>

          <div className="mf-orb-mode-switch" role="group" aria-label="Mode de l’assistant">
            <button type="button" onClick={() => changeMode('chat')} aria-pressed={mode === 'chat'}>
              Discussion / Dictée
            </button>
            <button type="button" onClick={() => changeMode('command')} aria-pressed={mode === 'command'}>
              Commandes vocales
            </button>
          </div>
          {mode === 'command' && (
            <p className="mf-orb-command-help">
              Parlez naturellement : chaque commande est exécutée automatiquement après votre phrase. L’écoute reprend ensuite. Dites « stop écoute » ou appuyez sur le microphone pour arrêter. Vous pouvez naviguer et remplir les champs de consultation. L’enregistrement et les prescriptions restent à confirmer séparément.
            </p>
          )}
          <form className="mf-orb-chat-form" onSubmit={handleSubmit}>
            {mode !== 'command' && <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Écrivez ou dictez à votre assistant…" rows={2} disabled={sending} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />}
            <button
              type="button"
              className={`mf-orb-mic-button${isListening ? ' is-listening' : ''}`}
              onClick={toggleVoiceInput}
              disabled={sending && !voice.active && !commandListeningEnabledRef.current}
              aria-label={isListening ? 'Arrêter l’écoute' : (mode === 'command' ? 'Démarrer les commandes vocales' : 'Dicter un message')}
              title={isListening ? 'Arrêter l’écoute' : (mode === 'command' ? 'Démarrer les commandes vocales' : 'Dicter un message')}
            >{isListening ? '■' : '🎙'}</button>
            {mode !== 'command' && <button type="submit" disabled={!input.trim() || sending} aria-label="Envoyer">↑</button>}
          </form>
          {(isListening || interimTranscript || speechMessage) && (
            <div className={`mf-orb-speech-status${speechMessage ? ' has-error' : ''}`} aria-live="polite">
              {speechMessage || (isListening ? (mode === 'command' ? 'Écoute active : dictez vos commandes. Dites « stop écoute » pour arrêter.' : 'Écoute en cours… Parlez clairement en français.') : (mode === 'command' ? 'Appuyez sur le microphone pour démarrer les commandes vocales.' : interimTranscript))}
              {mode !== 'command' && interimTranscript && isListening ? ` ${interimTranscript}` : ''}
            </div>
          )}
          {mode !== 'command' && dictatedNumberPending && (
            <div className="mf-orb-speech-status has-error" role="alert">
              <strong>Valeur clinique dictée à vérifier.</strong> La reconnaissance vocale peut confondre 87 et 97 %. Relisez et corrigez les chiffres dans le texte avant de poursuivre.
              <button type="button" onClick={() => { setDictatedNumberPending(false); setSpeechMessage('Valeurs numériques confirmées par le médecin.'); }}>J’ai vérifié les chiffres</button>
            </div>
          )}
          {mode !== 'command' && speechCorrections.length > 0 && (
            <div className="mf-orb-speech-corrections" aria-live="polite">
              <strong>Vérification de termes médicaux — confirmez avant correction :</strong>
              {speechCorrections.map(correction => (
                <button
                  type="button"
                  key={normalizeSpeechCandidate(correction.original)}
                  onClick={() => {
                    setInput(current => applyMedicalSpeechCorrection(current, correction));
                    setSpeechCorrections(current => current.filter(item => normalizeSpeechCandidate(item.original) !== normalizeSpeechCandidate(correction.original)));
                  }}
                >
                  « {correction.original} » → « {correction.replacement} » · Corriger
                </button>
              ))}
            </div>
          )}
          <div className="mf-orb-panel-footer">
            <span>Entrée pour envoyer · Maj + Entrée pour une ligne</span>
            <button type="button" onClick={() => { closePanel(); onOpenCopilot(); }}>Ouvrir le copilote complet ↗</button>
          </div>
        </section>
      )}

      {(voice.active || voice.error) && (
        <div className="mf-helios-playback">
          {voice.active && <button type="button" onClick={stop}>Arrêter</button>}
          {voice.error && <span role="status">{voice.error}</span>}
        </div>
      )}
      <button type="button" className={`mf-orb-launcher${voice.speaking ? ' is-speaking' : ''}${panelOpen ? ' is-open' : ''}${isThinking || sending || clinicalInsight?.status === 'analyzing' ? ' is-thinking' : ''}`} onClick={() => panelOpen ? closePanel() : openPanel()} aria-label={panelOpen ? 'Fermer JARVIS' : 'Discuter avec JARVIS'} aria-expanded={panelOpen} title="Discuter avec JARVIS">
        <span className="mf-orb-canvas"><OrbVisual isThinking={isThinking || sending} /></span>
      </button>
      <span className="mf-orb-caption">{sending || isThinking ? 'JE RÉFLÉCHIS' : 'À VOTRE ÉCOUTE'}</span>
    </div>
  );
}
