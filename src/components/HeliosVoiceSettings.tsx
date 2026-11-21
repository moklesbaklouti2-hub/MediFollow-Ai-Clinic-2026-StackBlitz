import type { HeliosVoice } from '../hooks/useHeliosVoice';
import { HELIOS_TEST_PHRASE, NO_LOCAL_VOICE, selectHeliosVoice } from '../services/heliosSpeech';

export default function HeliosVoiceSettings({ voice }: { voice: HeliosVoice }) {
  const { preferences, voices, supported, update } = voice;
  const selected = selectHeliosVoice(voices, preferences.voiceURI);
  return (
    <section className="settings-section" aria-labelledby="helios-voice-title">
      <h3 id="helios-voice-title">Voix JARVIS</h3>
      <p className="settings-description" role="status">
        {!supported ? 'Synthèse vocale indisponible dans ce navigateur. JARVIS reste disponible à l’écrit.'
          : !selected ? NO_LOCAL_VOICE
          : 'La lecture utilise une voix française locale. Écoutez les voix proposées pour choisir votre timbre.'}
      </p>
      <div className="settings-grid">
        <label className="settings-field">
          Voix française locale
          <select value={selected?.voiceURI ?? ''} disabled={!selected}
            onChange={event => update({ voiceURI: event.target.value })}>
            {!selected && <option value="">Aucune voix disponible</option>}
            {voices.map(item => (
              <option key={item.voiceURI} value={item.voiceURI}>{item.name} ({item.lang})</option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          Débit · {preferences.rate.toLocaleString('fr')}
          <input type="range" min="0.75" max="1.15" step="0.01" value={preferences.rate}
            onChange={event => update({ rate: event.target.valueAsNumber })} />
        </label>
        <label className="settings-field">
          Hauteur · {preferences.pitch.toLocaleString('fr')}
          <input type="range" min="0.8" max="1.2" step="0.01" value={preferences.pitch}
            onChange={event => update({ pitch: event.target.valueAsNumber })} />
        </label>
      </div>
      <label className="settings-toggle">
        Lire automatiquement les réponses de JARVIS
        <input type="checkbox" checked={preferences.autoRead}
          onChange={event => update({ autoRead: event.target.checked })} />
      </label>
      <button type="button" className="settings-save" disabled={!selected}
        onClick={() => voice.play(HELIOS_TEST_PHRASE)}>Tester la voix</button>
    </section>
  );
}
