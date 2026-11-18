export const HELIOS_TEST_PHRASE = 'Bonjour docteur. Je suis prêt. Quel dossier souhaitez-vous ouvrir ?';

export const NO_LOCAL_VOICE = 'Aucune voix française locale détectée. HELIOS reste disponible à l’écrit. Vérifiez les voix françaises installées dans les paramètres de synthèse vocale de votre appareil.';

export function frenchLocalVoices(voices: SpeechSynthesisVoice[]) {
  return voices.filter(voice => voice.localService === true && /^fr(?:[-_]|$)/i.test(voice.lang));
}

export function selectHeliosVoice(voices: SpeechSynthesisVoice[], uri: string) {
  const local = frenchLocalVoices(voices);
  return local.find(voice => voice.voiceURI === uri)
    ?? local.find(voice => /^fr[-_]fr$/i.test(voice.lang) && voice.default)
    ?? local.find(voice => /^fr[-_]fr$/i.test(voice.lang))
    ?? local.find(voice => voice.default)
    ?? local[0];
}

export function prepareHeliosSpeech(text: string) {
  const units: Record<string, string> = {
    mg: 'milligramme', g: 'gramme', kg: 'kilogramme',
    'µg': 'microgramme', 'μg': 'microgramme', mcg: 'microgramme',
    mL: 'millilitre', ml: 'millilitre', L: 'litre',
    'mmHg': 'millimètre de mercure', bpm: 'battements par minute',
    'mg/dL': 'milligrammes par décilitre', 'mmol/L': 'millimoles par litre',
    'L/min': 'litres par minute', 'mg/kg': 'milligrammes par kilogramme',
    '°C': 'degrés Celsius', '%': 'pour cent',
  };
  return text
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^)\s]+\)/gi, '$1')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*])\s+/gm, '')
    .replace(/^\s{0,3}(?:`{3,}|~{3,})[\w-]*\s*$/gm, '')
    .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, '$1$2')
    .replace(/(?<![\p{L}\d])([*_])([^*_\n]+)\1(?![\p{L}\d])/gu, '$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\bSpO[2₂](?![\p{L}\p{N}])/giu, 'saturation en oxygène,')
    .replace(/(\d+(?:[,.]\d+)?)[ \t\u00a0\u202f]*(mg\/dL|mmol\/L|L\/min|mg\/kg|mmHg|bpm|mcg|[µμ]g|mL|ml|mg|kg|g|L|°C|%)(?![\p{L}\d/])/gu,
      (_, number: string, unit: string) => {
        const label = units[unit];
        const plural = ['mg', 'g', 'kg', 'µg', 'μg', 'mcg', 'mL', 'ml', 'L'].includes(unit) &&
          Number(number.replace(',', '.')) >= 2;
        return `${number.replace('.', ',')} ${label}${plural ? 's' : ''}`;
      })
    .trim();
}

// Keep utterances short for browser engines that cut off long passages.
export function splitHeliosSpeech(text: string) {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  let current = '';
  for (const sentence of sentences) {
    const next = sentence.trim();
    if (!next) continue;
    if (current && current.length + next.length > 180) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current} ${next}` : next;
  }
  if (current) chunks.push(current);
  return chunks;
}
