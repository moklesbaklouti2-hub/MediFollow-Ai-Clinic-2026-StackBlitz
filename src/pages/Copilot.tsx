import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Consultation, Patient, Prescription } from '../types/medical';
import { getMedicalData, getInventoryData } from '../services/storage';
import { verifyJarvisToolsAccess } from '../jarvis/toolsAccess';
import { confirmedPatientNameLabel } from '../services/patientSelectionGuard';
import ContextPanel from '../jarvis/ContextPanel';
import DocumentsPanel from '../jarvis/DocumentsPanel';
import ToolsPanel from '../jarvis/ToolsPanel';
import ActionPreview from '../jarvis/ActionPreview';
import Reactor from '../jarvis/Reactor';
import { resolveContext } from '../jarvis/context';
import { useJarvisConversation } from '../jarvis/conversation';
import { useJarvisVoice } from '../jarvis/voice';
import type { JarvisDocument } from '../jarvis/documents';
import type { JarvisAction } from '../jarvis/actionSchema';
import { authorizeAction, receiptTarget, type ConsultationPrefill, type PendingAction, type PrescriptionPrefill, type ReceiptPrefill } from '../jarvis/tools';
import '../jarvis/jarvis.css';

type Props = {
  patients: Patient[];
  consultations: Consultation[];
  prescriptions: Prescription[];
  onNavigate: (page: string) => void;
  onDraft: (draft: ConsultationPrefill) => void;
  onPrescription: (draft: PrescriptionPrefill) => void;
  onReceipt: (draft: ReceiptPrefill) => void;
};

const phaseLabels = {
  off: 'Prêt', starting: 'Activation du microphone', listening: 'Écoute', transcribing: 'Transcription',
  waiting: 'Transcription à relire', processing: 'Traitement', speaking: 'Lecture vocale',
  paused: 'Voix en pause',
};

export default function Copilot({ patients, consultations, prescriptions, onNavigate, onDraft, onPrescription, onReceipt }: Props) {
  const [patientId, setPatientId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [documents, setDocuments] = useState<JarvisDocument[]>([]);
  const [question, setQuestion] = useState('');
  const [autoVoice, setAutoVoice] = useState(false);
  const [toolsAllowed, setToolsAllowed] = useState(false);
  const [checkingAction, setCheckingAction] = useState(false);
  const [proposalEnabled, setProposalEnabled] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const actionRef = useRef<PendingAction | null>(null);
  const epoch = useRef(0);
  const submitting = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  const context = resolveContext(patients, consultations, patientId, visitId);
  const selected = documents.filter(doc => doc.selected);
  const checking = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void verifyJarvisToolsAccess(controller.signal).then(allowed => {
      if (!controller.signal.aborted) setToolsAllowed(allowed);
    });
    return () => controller.abort();
  }, []);
  const freshContext = () => {
    const data = getMedicalData();
    const latest = resolveContext(data.patients, data.consultations, patientId, visitId);
    return { data, latest };
  };
  const conversation = useJarvisConversation(() => {
    const { latest } = freshContext();
    return latest.valid && latest.version === context.version;
  });
  const voice = useJarvisVoice(text => {
    const transcript = text.slice(0, 5000);
    setQuestion(transcript);
    if (autoVoice) void submit(transcript);
    else composer.current?.focus();
  }, conversation.cancel);

  function setAction(next: PendingAction | null) {
    checking.current?.abort();
    checking.current = null;
    setCheckingAction(false);
    actionRef.current = next;
    setPending(next);
  }

  function resetConversation() {
    epoch.current += 1;
    submitting.current = false;
    voice.stop();
    conversation.clear();
    setAction(null);
    setActionMessage('');
    setProposalEnabled(false);
    setQuestion('');
  }

  const lastContextVersion = useRef(context.version);
  const docScope = useRef(0);
  useLayoutEffect(() => {
    if (lastContextVersion.current !== context.version) {
      lastContextVersion.current = context.version;
      docScope.current += 1;
      setDocuments([]);
      resetConversation();
    }
  }, [context.version]);

  useLayoutEffect(() => () => {
    epoch.current += 1;
    actionRef.current = null;
    checking.current?.abort();
  }, []);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [conversation.turns]);

  function selectPatient(id: string) {
    resetConversation();
    setDocuments([]);
    setPatientId(id);
    setVisitId('');
  }

  function propose(action: JarvisAction) {
    const { latest } = freshContext();
    if (!toolsAllowed || !latest.valid || latest.version !== context.version ||
        (action.tool === 'prepare_consultation' && (!latest.patient || visitId)) ||
        (action.tool === 'prepare_prescription' && !latest.patient)) {
      setActionMessage('Outil indisponible pour ce contexte. Vérifiez l’accès et la sélection.');
      return false;
    }
    const stock = action.tool === 'prepare_receipt'
      ? receiptTarget(getInventoryData().items, action.itemId, action.quantity) : undefined;
    if (action.tool === 'prepare_receipt' && !stock) {
      setActionMessage('Le lot ou la quantité est invalide.');
      return false;
    }
    setActionMessage('');
    setAction({ action, version: JSON.stringify([epoch.current, latest.version]), stock });
    return true;
  }

  async function confirm() {
    const proposal = actionRef.current;
    if (!proposal || checking.current) return;
    const controller = new AbortController();
    checking.current = controller;
    setCheckingAction(true);
    const allowed = await verifyJarvisToolsAccess(controller.signal);
    if (controller.signal.aborted || actionRef.current !== proposal) return;
    setAction(null);
    if (!allowed) setToolsAllowed(false);
    const { data, latest } = freshContext();
    const result = authorizeAction(proposal, allowed, data, patientId, visitId,
      JSON.stringify([epoch.current, latest.version]),
      proposal.action.tool === 'prepare_receipt' ? getInventoryData().items : []);
    if (result.ok === false) { setActionMessage(result.message); return; }
    if ('draft' in result) onDraft(result.draft);
    else if ('prescription' in result) onPrescription(result.prescription);
    else if ('receipt' in result) onReceipt(result.receipt);
    else onNavigate(result.action.page);
  }

  async function submit(text = question) {
    if (!text.trim() || submitting.current || actionRef.current) return;
    const { latest } = freshContext();
    if (!latest.valid || latest.version !== context.version) {
      resetConversation();
      setActionMessage('Contexte modifié. Vérifiez la sélection avant de renvoyer la demande.');
      return;
    }
    const mine = epoch.current;
    submitting.current = true;
    setActionMessage('');
    const voiceTurn = voice.beginTurn();
    // Only a text turn with explicit opt-in and no document context can propose a tool.
    const allowProposal = toolsAllowed && selected.length === 0 && proposalEnabled && !voiceTurn;
    setProposalEnabled(false);
    const result = await conversation.send(text, {
      ...context.payload,
      documents: selected.map(doc => ({ name: doc.name, sources: doc.sources, warnings: doc.warnings })),
    }, allowProposal);
    if (mine !== epoch.current) return;
    submitting.current = false;
    if (result) setQuestion('');
    const awaitingAction = result?.action ? propose(result.action) : false;
    if (voiceTurn) voice.finish(result?.text, awaitingAction);
  }

  const voiceActive = voice.phase !== 'off';
  const voiceSessionBusy = !['off', 'paused', 'waiting'].includes(voice.phase);
  const problem = conversation.error || voice.error || actionMessage;
  const status = pending ? 'Action en attente de confirmation' : conversation.unavailable ? 'Moteur IA indisponible'
    : problem ? 'Erreur' : conversation.busy ? 'Traitement' : phaseLabels[voice.phase];
  const canSend = Boolean(question.trim()) && context.valid && !conversation.busy && !pending && !voiceSessionBusy;

  return <section className="jarvis" aria-labelledby="jarvis-title">
    <div className="jarvis-hero">
      <Reactor />
      <div><h2 id="jarvis-title">JARVIS</h2><p>Assistant clinique MediFollow AI</p></div>
      <div className="jarvis-status" role="status" data-alert={Boolean(problem)}>{status}</div>
    </div>
    <div className="jarvis-layout">
      <div className="jarvis-sidebar">
        <section className="jarvis-panel" aria-labelledby="jarvis-conversation">
          <div className="jarvis-row jarvis-heading">
            <h3 id="jarvis-conversation">Conversation</h3>
            <button type="button" onClick={resetConversation}>Effacer la conversation</button>
          </div>
          <div className="jarvis-log" role="log" aria-label="Historique de session" ref={log} tabIndex={0}>
            {conversation.turns.length === 0 && <p className="jarvis-muted">Posez une question ou choisissez le contexte à analyser.</p>}
            {conversation.turns.map((turn, index) => <article key={index} className="jarvis-message" data-role={turn.role}>
              <strong>{turn.role === 'assistant' ? 'JARVIS' : 'Vous'}</strong>
              <p>{turn.content}</p>
            </article>)}
          </div>
          {problem && <p className="jarvis-error" role="alert">{problem}</p>}
          <div className="jarvis-row jarvis-chips" aria-label="Suggestions">
            <button type="button" disabled={conversation.busy || voiceSessionBusy} onClick={() => setQuestion('Explique-moi comment utiliser MediFollow.')}>Découvrir MediFollow</button>
            <button type="button" disabled={!context.patient || conversation.busy || voiceSessionBusy} onClick={() => setQuestion('Résume les faits documentés dans le contexte choisi.')}>Résumer le dossier</button>
            <button type="button" disabled={!selected.length || conversation.busy || voiceSessionBusy} onClick={() => setQuestion('Résume les documents joints et cite les passages par page ou ligne.')}>Résumer les documents</button>
          </div>
          <form onSubmit={event => { event.preventDefault(); if (canSend) void submit(); }}>
            <label htmlFor="jarvis-question">{voice.phase === 'waiting' ? 'Transcription à corriger avant envoi' : 'Votre message'}</label>
            <textarea id="jarvis-question" ref={composer} value={question} rows={3} maxLength={5000}
              onChange={event => setQuestion(event.target.value)} disabled={conversation.busy || voiceSessionBusy}
              onKeyDown={event => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing && canSend) {
                  event.preventDefault();
                  void submit();
                }
              }} />
            {toolsAllowed && !selected.length && !voiceActive && <label className="jarvis-check">
              <input type="checkbox" checked={proposalEnabled} disabled={conversation.busy || Boolean(pending)}
                onChange={event => setProposalEnabled(event.target.checked)} />Autoriser une proposition d’action pour ce message
            </label>}
            <p className="jarvis-muted">L’envoi transmet le message et les éléments sélectionnés au fournisseur IA configuré.</p>
            <div className="jarvis-row">
              <button type="submit" className="jarvis-primary" disabled={!canSend}>Envoyer</button>
              {conversation.busy && <button type="button" onClick={() => { conversation.cancel(); voice.stop(); }}>Annuler la demande</button>}
            </div>
          </form>
          <p className="jarvis-muted jarvis-source">L’IA assiste le médecin. La décision clinique reste médicale.</p>
        </section>
        {pending && <ActionPreview pending={pending}
          patient={context.patient ? `${confirmedPatientNameLabel(context.patient)} (${context.patient.id})` : 'Aucun'}
          busy={checkingAction} onConfirm={() => { void confirm(); }} onCancel={() => setAction(null)} />}
        <section className="jarvis-panel" aria-labelledby="jarvis-voice">
          <h3 id="jarvis-voice">Conversation vocale</h3>
          <p className="jarvis-muted">Le navigateur peut transmettre l’audio à son service de reconnaissance. Les messages vocaux ne proposent aucune action.</p>
          {voice.micActive && <p role="status"><strong>Microphone actif</strong></p>}
          {!voice.available && <p>Reconnaissance vocale indisponible dans ce navigateur.</p>}
          {!voice.speechAvailable && <p>Lecture vocale indisponible dans ce navigateur.</p>}
          <div className="jarvis-row">
            {(!voiceActive || voice.phase === 'paused') && <button type="button"
              disabled={!voice.available || conversation.busy || Boolean(pending)} onClick={() => {
                setProposalEnabled(false);
                voice.listen();
              }}>{voiceActive ? 'Reprendre l’écoute' : 'Démarrer la conversation vocale'}</button>}
            {voiceActive && <>
              {voice.phase !== 'paused' && <button type="button" onClick={() => voice.stop('paused')}>Mettre en pause</button>}
              <button type="button" onClick={() => voice.stop()}>Arrêter la voix</button>
              {voice.phase === 'speaking' && <button type="button" onClick={voice.interrupt}>Interrompre la lecture</button>}
            </>}
          </div>
          <label className="jarvis-check"><input type="checkbox" checked={autoVoice}
            onChange={event => setAutoVoice(event.target.checked)} />Envoyer automatiquement les transcriptions vocales</label>
          <label className="jarvis-check"><input type="checkbox" checked={voice.read && voice.speechAvailable}
            disabled={!voice.speechAvailable || voice.phase === 'processing'}
            onChange={event => voice.setRead(event.target.checked)} />Lire les réponses à voix haute</label>
        </section>
      </div>
      <aside className="jarvis-sidebar" aria-label="Contexte, documents et outils">
        <ContextPanel patients={patients} consultations={consultations} context={context}
          patientId={patientId} visitId={visitId} documents={selected.map(doc => doc.name)}
          onPatient={selectPatient} onVisit={id => { resetConversation(); setVisitId(id); }} />
        <DocumentsPanel key={`${patientId}:${docScope.current}`} documents={documents}
          onPrepareExcerpt={toolsAllowed && context.patient && !visitId ? excerpt => {
            if (propose({ tool: 'prepare_consultation', field: 'history', value: excerpt })) {
              voice.stop();
              conversation.cancel();
            }
          } : undefined}
          onChange={(next, changed) => {
          if (changed) resetConversation();
          else setAction(null);
          setDocuments(next);
        }} />
        <ToolsPanel key={JSON.stringify([patientId, visitId])} patient={context.patient} visitId={visitId}
          prescriptions={prescriptions} allowed={toolsAllowed} onPropose={action => {
            if (propose(action)) { voice.stop(); conversation.cancel(); }
          }} onEdit={() => setAction(null)} />
      </aside>
    </div>
  </section>;
}
