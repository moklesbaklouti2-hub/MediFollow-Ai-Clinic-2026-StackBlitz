import { useEffect, useRef, useState } from 'react';

type Result = { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: Result) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
};

function recognitionFactory() {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

const voiceErrors: Record<string, string> = {
  'not-allowed': 'Permission du microphone refusée.',
  'service-not-allowed': 'Service de reconnaissance vocale refusé par le navigateur.',
  'audio-capture': 'Microphone absent ou indisponible.',
  'no-speech': 'Aucune parole détectée. Relancez l’écoute.',
  network: 'Connexion au service de reconnaissance interrompue.',
  aborted: 'Écoute interrompue.',
};

type Phase = 'off' | 'starting' | 'listening' | 'transcribing' | 'waiting' | 'processing' | 'speaking' | 'paused';

export function useJarvisVoice(onTranscript: (text: string) => void, cancelRequest: () => void) {
  const [phase, setPhase] = useState<Phase>('off');
  const [error, setError] = useState('');
  const [read, setRead] = useState(true);
  const current = useRef<Phase>('off');
  const recognition = useRef<Recognition | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const speechTimer = useRef<number | undefined>(undefined);
  const callbacks = useRef({ onTranscript, cancelRequest });
  callbacks.current = { onTranscript, cancelRequest };
  const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  function transition(next: Phase) {
    current.current = next;
    setPhase(next);
  }

  function release() {
    window.clearTimeout(timer.current);
    window.clearTimeout(speechTimer.current);
    if (recognition.current) {
      const instance = recognition.current;
      recognition.current = null;
      instance.onstart = instance.onerror = instance.onresult = instance.onend = null;
      try { instance.abort(); } catch { /* Le moteur peut être déjà arrêté. */ }
    }
    if (speech.current) {
      speech.current = null;
      window.speechSynthesis.cancel();
    }
  }

  useEffect(() => () => {
    current.current = 'off';
    release();
  }, []);

  function stop(next: 'off' | 'paused' = 'off') {
    const processing = current.current === 'processing';
    release();
    setError('');
    transition(next);
    if (processing) callbacks.current.cancelRequest();
  }

  useEffect(() => {
    const suspend = () => {
      if (document.hidden && current.current !== 'off') stop('paused');
    };
    document.addEventListener('visibilitychange', suspend);
    return () => document.removeEventListener('visibilitychange', suspend);
  }, []);

  function listen() {
    release();
    setError('');
    const Factory = recognitionFactory();
    if (!Factory) { transition('off'); setError('Reconnaissance vocale indisponible dans ce navigateur.'); return; }
    transition('starting');
    const instance = new Factory();
    recognition.current = instance;
    instance.lang = 'fr-FR';
    instance.continuous = false;
    instance.interimResults = true;
    let transcript = '';
    instance.onstart = () => {
      if (recognition.current === instance) transition('listening');
    };
    instance.onresult = event => {
      if (recognition.current !== instance || transcript) return;
      transition('transcribing');
      const final = Array.from(event.results).find(result => result.isFinal);
      transcript = final?.[0].transcript?.trim() ?? '';
    };
    instance.onerror = event => {
      if (recognition.current !== instance) return;
      stop('paused');
      setError(voiceErrors[event.error] ?? 'La reconnaissance vocale a été interrompue.');
    };
    instance.onend = () => {
      if (recognition.current !== instance) return;
      recognition.current = null;
      window.clearTimeout(timer.current);
      if (transcript) {
        transition('waiting');
        callbacks.current.onTranscript(transcript);
      } else {
        transition('paused');
        setError(voiceErrors['no-speech']);
      }
    };
    try {
      instance.start();
      timer.current = window.setTimeout(() => {
        if (recognition.current !== instance) return;
        stop('paused');
        setError('Délai d’écoute dépassé. Relancez le microphone.');
      }, 60_000);
    } catch {
      stop('paused');
      setError('Impossible de démarrer le microphone.');
    }
  }

  function resumeAfterSpeech() {
    release();
    transition('paused');
    timer.current = window.setTimeout(listen, 350);
  }

  function finish(reply: string | undefined, awaitingAction: boolean) {
    if (current.current !== 'processing') return;
    if (!reply || awaitingAction) { transition('paused'); return; }
    if (!read) { resumeAfterSpeech(); return; }
    if (!speechAvailable) {
      transition('paused');
      setError('Lecture vocale indisponible dans ce navigateur.');
      return;
    }
    transition('speaking');
    const utterance = new SpeechSynthesisUtterance(reply);
    speech.current = utterance;
    utterance.lang = 'fr-FR';
    utterance.onend = () => { if (speech.current === utterance) resumeAfterSpeech(); };
    const failed = () => {
      if (speech.current !== utterance) return;
      stop('paused');
      setError('La lecture vocale a été interrompue ou a dépassé le délai.');
    };
    utterance.onerror = failed;
    speechTimer.current = window.setTimeout(failed, 90_000);
    try { window.speechSynthesis.speak(utterance); } catch { failed(); }
  }

  return {
    phase, error, read, speechAvailable,
    available: typeof window !== 'undefined' && Boolean(recognitionFactory()),
    micActive: phase === 'listening' || phase === 'transcribing',
    listen,
    stop,
    interrupt: () => { if (current.current === 'speaking') resumeAfterSpeech(); },
    setRead: (value: boolean) => {
      setRead(value);
      if (!value && current.current === 'speaking') resumeAfterSpeech();
    },
    beginTurn: () => {
      if (current.current !== 'waiting') return false;
      transition('processing');
      return true;
    },
    finish,
  };
}
