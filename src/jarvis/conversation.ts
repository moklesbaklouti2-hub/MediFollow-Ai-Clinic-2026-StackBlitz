import { useEffect, useRef, useState } from 'react';
import { sendClinicalRequest } from '../services/doctorClinicalTransport';
import { parseModelAction, type JarvisAction } from './actionSchema';

export type Turn = { role: 'user' | 'assistant'; content: string };
type Reply = { text: string; action?: JarvisAction };
const timeoutMs = 35_000;
const maxBytes = 58 * 1024;

export function useJarvisConversation(isCurrent: () => boolean) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const history = useRef<Turn[]>([]);
  const current = useRef(isCurrent);
  current.current = isCurrent;

  function cancel() {
    const previous = request.current;
    request.current = null;
    previous?.abort();
    setBusy(false);
  }

  function clear() {
    cancel();
    history.current = [];
    setTurns([]);
    setError('');
  }

  useEffect(() => () => {
    const previous = request.current;
    request.current = null;
    previous?.abort();
  }, []);

  async function send(message: string, context: unknown, allowProposal: boolean): Promise<Reply | undefined> {
    const content = message.trim();
    if (!content || request.current || !current.current()) return;
    const recentTurns = history.current.map(turn => ({ ...turn, content: turn.content.slice(0, 5000) }));
    const body = { mode: 'jarvis', message: content, context, allowProposal, history: recentTurns };
    const encoder = new TextEncoder();
    const exceedsLimit = () => encoder.encode(JSON.stringify(body)).length > maxBytes;
    while (recentTurns.length && exceedsLimit()) recentTurns.splice(0, 2);
    if (exceedsLimit()) {
      setError('La demande dépasse la limite de transmission. Réduisez le contexte ou effacez l’historique.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    const question: Turn = { role: 'user', content };
    setTurns([...history.current, question]);
    setBusy(true);
    setError('');
    setUnavailable(false);
    const timeout = window.setTimeout(() => controller.abort('timeout'), timeoutMs);
    try {
      const response = await sendClinicalRequest('/api/chat', body, { signal: controller.signal });
      const data = await response.json();
      controller.signal.throwIfAborted();
      if (request.current !== controller || !current.current()) return;
      if (!response.ok) {
        if (data.code === 'AI_NOT_CONFIGURED') setUnavailable(true);
        throw new Error(typeof data.error === 'string' ? data.error : 'Service IA indisponible.');
      }
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Réponse IA vide ou incompatible.');
      history.current = [...history.current, question, { role: 'assistant', content: data.reply } as Turn].slice(-12);
      setTurns(history.current);
      return { text: data.reply, action: allowProposal ? parseModelAction(data.action) : undefined };
    } catch (failure) {
      if (request.current !== controller || !current.current()) return;
      if (controller.signal.reason === 'timeout') setError('Délai dépassé. Réessayez.');
      else if (!controller.signal.aborted) {
        setError(failure instanceof TypeError || failure instanceof SyntaxError
          ? 'Impossible de joindre le moteur IA de MediFollow.'
          : failure instanceof Error ? failure.message : 'Erreur de conversation.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
        setTurns(history.current);
      }
    }
  }

  return { turns, error, busy, unavailable, cancel: () => { cancel(); setTurns(history.current); }, clear, send };
}
