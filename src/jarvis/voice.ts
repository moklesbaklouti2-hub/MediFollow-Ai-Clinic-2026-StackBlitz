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

type Phase = 'off' | 'starting' | 'listening' | 'transcribing' | 'waiting' | 'processing' | 'speaking' | 'preview' | 'paused';

export function useJarvisVoice(onTranscript: (text: string) => void, cancelRequest: () => void) {
  const [phase, setPhase] = useState<Phase>('off');
  const [error, setError] = useState('');
  const [read, setRead] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState('');
  const current = useRef<Phase>('off');
  const recognition = useRef<Recognition | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const speechTimer = useRef<number | undefined>(undefined);
  const callbacks = useRef({ onTranscript, cancelRequest });
  callbacks.current = { onTranscript, cancelRequest };
  const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!speechAvailable) return;
    const engine = window.speechSynthesis;
    const update = () => setVoices(engine.getVoices?.() ?? []);
    update();
    engine.addEventListener?.('voiceschanged', update);
    return () => engine.removeEventListener?.('voiceschanged', update);
  }, [speechAvailable]);

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
    speak(reply, true);
  }

  function speak(text: string, inConversation: boolean) {
    if (!speechAvailable) return;
    setError('');
    transition(inConversation ? 'speaking' : 'preview');
    const utterance = new SpeechSynthesisUtterance(text);
    speech.current = utterance;
    const available = window.speechSynthesis.getVoices?.() ?? [];
    const chosen = available.find(voice => voice.voiceURI === voiceURI) ??
      available.find(voice => voice.localService && /^fr(?:-|$)/i.test(voice.lang)) ??
      available.find(voice => /^fr(?:-|$)/i.test(voice.lang));
    if (chosen) utterance.voice = chosen;
    utterance.lang = chosen?.lang ?? 'fr-FR';
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    utterance.onend = () => {
      if (speech.current !== utterance) return;
      if (inConversation) resumeAfterSpeech();
      else stop();
    };
    const failed = () => {
      if (speech.current !== utterance) return;
      stop(inConversation ? 'paused' : 'off');
      setError('La lecture vocale a été interrompue ou a dépassé le délai.');
    };
    utterance.onerror = failed;
    speechTimer.current = window.setTimeout(failed, 90_000);
    try { window.speechSynthesis.speak(utterance); } catch { failed(); }
  }

  return {
    phase, error, read, speechAvailable, voices, voiceURI, setVoiceURI,
    preview: () => {
      if (current.current === 'off') speak('Bonjour. Je suis JARVIS, votre assistant MediFollow. Comment puis-je vous aider ?', false);
    },
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
