import { useCallback, useEffect, useRef, useState } from 'react';
import { frenchLocalVoices, NO_LOCAL_VOICE, prepareHeliosSpeech, selectHeliosVoice, splitHeliosSpeech } from '../services/heliosSpeech';

const storageKey = 'medifollow-helios-voice';
const defaults = { voiceURI: '', rate: 0.93, pitch: 0.98, autoRead: false };
type Preferences = typeof defaults;

function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return {
      voiceURI: typeof saved.voiceURI === 'string' ? saved.voiceURI : '',
      rate: typeof saved.rate === 'number' && saved.rate >= 0.75 && saved.rate <= 1.15 ? saved.rate : defaults.rate,
      pitch: typeof saved.pitch === 'number' && saved.pitch >= 0.8 && saved.pitch <= 1.2 ? saved.pitch : defaults.pitch,
      autoRead: saved.autoRead === true,
    };
  } catch {
    return defaults;
  }
}

export function useHeliosVoice() {
  const supported = typeof window.speechSynthesis?.getVoices === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function';
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [active, setActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const beforePlayback = useRef<((manual: boolean) => void) | null>(null);

  const stop = useCallback(() => {
    generation.current += 1;
    if (utteranceRef.current) {
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
    }
    setActive(false);
    setSpeaking(false);
    setError('');
    return generation.current;
  }, []);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(frenchLocalVoices(synth.getVoices()));
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    return () => {
      synth.removeEventListener('voiceschanged', refresh);
      stop();
    };
  }, [supported, stop]);

  const update = (patch: Partial<Preferences>) => {
    if (patch.autoRead === false) stop();
    setPreferences(previous => ({ ...previous, ...patch }));
  };

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* conserver la session */ }
  }, [preferences]);

  // Lire la préférence actuelle même lorsque la réponse a démarré avant un changement de réglage.
  const currentPreferences = useRef(preferences);
  currentPreferences.current = preferences;

  function play(reply: string, expectedGeneration?: number) {
    if (expectedGeneration !== undefined &&
        (expectedGeneration !== generation.current || !currentPreferences.current.autoRead)) return;
    const text = prepareHeliosSpeech(reply);
    if (!supported || !text) return;
    const settings = currentPreferences.current;
    const synth = window.speechSynthesis;
    const voice = selectHeliosVoice(synth.getVoices(), settings.voiceURI);
    if (!voice) {
      setError(NO_LOCAL_VOICE);
      return;
    }

    const token = stop();
    beforePlayback.current?.(expectedGeneration === undefined);
    const chunks = splitHeliosSpeech(text);
    setActive(true);

    const speakChunk = (index: number) => {
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utteranceRef.current = utterance;
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      const isCurrent = () => token === generation.current && utteranceRef.current === utterance;
      utterance.onstart = () => {
        if (isCurrent()) setSpeaking(true);
      };
      function finish(failed: boolean) {
        if (!isCurrent()) return;
        if (!failed && index + 1 < chunks.length) {
          speakChunk(index + 1);
          return;
        }
        utteranceRef.current = null;
        setSpeaking(false);
        setActive(false);
        if (failed) setError('La voix locale n’a pas pu lire la réponse. Vous pouvez réessayer avec « Écouter ».');
      }
      utterance.onend = () => finish(false);
      utterance.onerror = () => finish(true);
      try { synth.speak(utterance); } catch { finish(true); }
    };

    speakChunk(0);
  }

  function listen(reply: string) {
    if (window.confirm('Lire cette réponse à voix haute ? Vérifiez que personne ne peut entendre des informations confidentielles.')) play(reply);
  }

  return { supported, voices, preferences, update, play, listen, stop, active, speaking, error,
    isActive: () => utteranceRef.current !== null, beforePlayback };
}

export type HeliosVoice = ReturnType<typeof useHeliosVoice>;
