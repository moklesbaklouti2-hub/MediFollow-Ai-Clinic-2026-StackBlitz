import { useEffect, useRef, useState, type FormEvent } from 'react';
import OrbVisual from './OrbVisual';
import type { ClinicalReasoningAnalysis } from '../hooks/useClinicalReasoning';
import type { VoiceCommandAction } from '../types/medical';
import { MEDICAL_DICTIONARY } from '../data/medicalDictionary';
import './OrbAssistant.css';

type OrbAssistantProps = {
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
type SpeechAlternativeLike = { transcript: string };
type SpeechResultLike = { isFinal: boolean; length: number; [index: number]: SpeechAlternativeLike };
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

// Vocabulaire médical utilisé pour départager les alternatives proposées
// par le moteur vocal du navigateur. Il ne remplace pas une validation humaine.
// Le vocabulaire de reconnaissance provient du référentiel médical structuré.
// Les synonymes sont également pris en compte pour départager les alternatives vocales.
const medicalSpeechTerms = MEDICAL_DICTIONARY.flatMap(entry => [entry.term, ...(entry.synonyms || [])]);

function normalizeSpeechCandidate(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

// Corrections proposées uniquement pour les erreurs réellement observées pendant les tests.
// Elles restent soumises à la confirmation du médecin : aucune substitution automatique.
const observedMedicalSpeechCorrections: Record<string, string> = {
  exuda: 'exsudat',
  exodat: 'exsudat',
  disney: 'dyspnée',
  inaudipnee: 'dyspnée',
  athenopathie: 'adénopathie',
};

type MedicalSpeechCorrection = { original: string; replacement: string };

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

// Clé phonétique française simplifiée : rapproche certaines graphies
// produites par la dictée sans prétendre remplacer un moteur médical spécialisé.
function frenchPhoneticKey(value: string): string {
  return normalizeSpeechCandidate(value)
    .replace(/œ/g, 'oe')
    .replace(/eaux?/g, 'o')
    .replace(/ph/g, 'f')
    .replace(/au/g, 'o')
    .replace(/ou/g, 'u')
    .replace(/oy/g, 'oi')
    .replace(/y/g, 'i')
    .replace(/qu/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c(?=[aou])/g, 'k')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/ch/g, 'sh')
    .replace(/tion/g, 'sion')
    .replace(/h/g, '')
    .replace(/(.)\\1+/g, '$1')
    .replace(/(e|es|s|x)$/g, '');
}

function findClosestMedicalTerm(word: string): string | null {
  const normalizedWord = normalizeSpeechCandidate(word);
  if (normalizedWord.length < 6) return null;

  let bestTerm = '';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const term of medicalSpeechTerms) {
    // Les expressions composées sont évaluées plus tard avec le contexte.
    if (term.includes(' ')) continue;
    const normalizedTerm = normalizeSpeechCandidate(term);
    if (normalizedTerm.length < 6 || normalizedTerm === normalizedWord) continue;
    const distance = levenshteinDistance(normalizedWord, normalizedTerm);
    const phoneticDistance = levenshteinDistance(
      frenchPhoneticKey(word),
      frenchPhoneticKey(term),
    );
    const allowedDistance = normalizedWord.length >= 10 ? 2 : 1;
    const phoneticLimit = normalizedWord.length >= 10 ? 2 : 1;
    // Une proximité phonétique peut rattraper une graphie très déformée,
    // mais la suggestion reste soumise à validation par le médecin.
    const isClose = distance <= allowedDistance || phoneticDistance <= phoneticLimit;
    const combinedScore = Math.min(distance, phoneticDistance + 0.25);
    if (isClose && combinedScore < bestDistance) {
      bestDistance = combinedScore;
      bestTerm = term;
    }
  }
  return bestTerm || null;
}

function findMedicalSpeechCorrections(value: string): MedicalSpeechCorrection[] {
  const found = new Map<string, MedicalSpeechCorrection>();
  for (const original of value.match(/[\p{L}]+/gu) || []) {
    const normalized = normalizeSpeechCandidate(original);
    const explicitReplacement = observedMedicalSpeechCorrections[normalized];
    const replacement = explicitReplacement || findClosestMedicalTerm(original);
    if (replacement && normalized !== normalizeSpeechCandidate(replacement)) {
      if (!found.has(normalized)) found.set(normalized, { original, replacement });
    }
  }
  return Array.from(found.values());
}

function applyMedicalSpeechCorrection(value: string, correction: MedicalSpeechCorrection): string {
  const target = normalizeSpeechCandidate(correction.original);
  return value.replace(/[\p{L}]+/gu, word => {
    if (normalizeSpeechCandidate(word) !== target) return word;
    return word[0] === word[0].toLocaleUpperCase('fr')
      ? correction.replacement.charAt(0).toLocaleUpperCase('fr') + correction.replacement.slice(1)
      : correction.replacement;
  });
}

function chooseMedicalSpeechAlternative(result: SpeechResultLike): string {
  const candidates = Array.from({ length: result.length }, (_, index) =>
    (result[index]?.transcript || '').trim()
  ).filter(Boolean);

  if (candidates.length <= 1) return candidates[0] || '';

  const scored = candidates.map((transcript, index) => {
    const normalized = normalizeSpeechCandidate(transcript);
    const score = medicalSpeechTerms.reduce((total, term) => {
      const normalizedTerm = normalizeSpeechCandidate(term);
      return total + (normalized.includes(normalizedTerm) ? 3 : 0);
    }, 0);
    return { transcript, score, index };
  });

  // Ne choisit une alternative que si elle contient un terme médical reconnu
  // que la première proposition ne contient pas. En cas d'égalité, garde l'original.
  const best = scored.reduce((current, candidate) =>
    candidate.score > current.score ? candidate : current
  );
  return best.score > scored[0].score ? best.transcript : candidates[0];
}

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
  onNavigate,
  onCommandActions,
  clinicalPrompt,
  onClinicalPromptConsumed,
  clinicalInsight,
}: OrbAssistantProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'command'>('chat');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<OrbMessage[]>([]);
  const [insightDismissed, setInsightDismissed] = useState(false);
const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechMessage, setSpeechMessage] = useState('');
  const [speechCorrections, setSpeechCorrections] = useState<MedicalSpeechCorrection[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const commandListeningEnabledRef = useRef(false);
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
      commandListeningEnabledRef.current = false;
      if (speechRestartTimerRef.current) clearTimeout(speechRestartTimerRef.current);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggleVoiceInput() {
    if (isListening) {
      commandListeningEnabledRef.current = false;
      recognitionRef.current?.stop();
      return;
    }
    if (mode === 'command') commandListeningEnabledRef.current = true;

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

        const base = speechBaseInputRef.current.trimEnd();
        setInput(`${base}${base && dictatedText ? ' ' : ''}${dictatedText}`);
        setInterimTranscript(interimParts.join(' ').trim());
      };

      recognition.onerror = (event) => {
        if (sessionEnded || recognitionRef.current !== recognition) return;
        const messages: Record<string, string> = {
          'not-allowed': 'Autorisez l’accès au microphone dans votre navigateur pour utiliser la dictée.',
          'service-not-allowed': 'Le service de reconnaissance vocale est indisponible.',
          'no-speech': 'Aucune parole détectée. Vous pouvez relancer la dictée.',
          'audio-capture': 'Aucun microphone accessible n’a été détecté.',
          network: 'La reconnaissance vocale nécessite une connexion réseau.',
        };
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
          if (/^(stop|arrete|arret|stop ecoute|arrete ecoute|arret ecoute)$/.test(normalizedVoiceCommand)) {
            commandListeningEnabledRef.current = false;
            setSpeechMessage('Écoute vocale arrêtée.');
          } else if (dictatedText) {
            void sendMessage(dictatedText).finally(() => {
              if (commandListeningEnabledRef.current) {
                window.setTimeout(() => {
                  if (commandListeningEnabledRef.current && !recognitionRef.current) toggleVoiceInput();
                }, 350);
              }
            });
          } else {
            window.setTimeout(() => {
              if (commandListeningEnabledRef.current && !recognitionRef.current) toggleVoiceInput();
            }, 350);
          }
        }
      };

      setSpeechMessage('');
      setInterimTranscript('');
      setIsListening(true);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript('');
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
    if (mode !== 'command') setMessages(previous => [...previous, { role: 'user', content: message }]);
    setInput('');
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
          { page: 'Copilote IA', patterns: [/\b(copilote|assistant ia)\b/] },
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
          return;
        }

        const response = await fetch('/api/commands/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: message, currentPage }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) throw new Error('Réponse inattendue du moteur de commandes.');
        const data = await response.json();
        if (!response.ok) throw new Error([data.error || 'Erreur du moteur de commandes.', data.detail].filter(Boolean).join(' — '));

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
        return;
      }

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

          <div className="mf-orb-mode-switch" role="group" aria-label="Mode de l’assistant" style={{ display: 'flex', gap: 8, padding: '10px 14px 0' }}>
            <button type="button" onClick={() => setMode('chat')} aria-pressed={mode === 'chat'} style={{ flex: 1, border: '1px solid var(--border,#dce4e8)', borderRadius: 8, padding: '8px 10px', background: mode === 'chat' ? 'var(--accent,#38d9bd)' : 'transparent', color: mode === 'chat' ? '#10243e' : 'inherit', fontWeight: 600 }}>
              Discussion / Dictée
            </button>
            <button type="button" onClick={() => setMode('command')} aria-pressed={mode === 'command'} style={{ flex: 1, border: '1px solid var(--border,#dce4e8)', borderRadius: 8, padding: '8px 10px', background: mode === 'command' ? 'var(--accent,#38d9bd)' : 'transparent', color: mode === 'command' ? '#10243e' : 'inherit', fontWeight: 600 }}>
              Commandes vocales
            </button>
          </div>
          {mode === 'command' && (
            <p style={{ margin: '7px 14px 0', fontSize: 11, color: 'var(--text-secondary,#81909c)' }}>
              Parlez naturellement : chaque commande est exécutée automatiquement après votre phrase. L’écoute reprend ensuite. Dites « stop écoute » ou appuyez sur le microphone pour arrêter. Vous pouvez naviguer et remplir les champs de consultation. L’enregistrement et les prescriptions restent à confirmer séparément.
            </p>
          )}
          <form className="mf-orb-chat-form" onSubmit={handleSubmit}>
            {mode !== 'command' && <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Écrivez ou dictez à votre assistant…" rows={2} disabled={sending} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />}
            <button
              type="button"
              className={`mf-orb-mic-button${isListening ? ' is-listening' : ''}`}
              onClick={toggleVoiceInput}
              disabled={sending}
              aria-label={isListening ? 'Arrêter les commandes vocales' : (mode === 'command' ? 'Démarrer les commandes vocales' : 'Dicter un message')}
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
