import { useCallback, useEffect, useState } from 'react';
import './App.css';
import './mobile-navigation.css';
import './clinical-premium.css';
import './warm-clinical.css';
import './dashboard-warm-layout.css';
import './cabinet-a.css';

import AppNavigation from './components/AppNavigation';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Consultations from './pages/Consultations';
import Copilot from './pages/Copilot';
import type { ConsultationPrefill, PrescriptionPrefill, ReceiptPrefill } from './jarvis/tools';
import Protocols from './pages/Protocols';
import Prescriptions from './pages/Prescriptions';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import { useMedicalData } from './hooks/useMedicalData';
import { readInitialThemePreference, persistThemePreference, normalizeThemePreference } from './services/themeStorage';
import OrbAssistant from './components/OrbAssistant';
import type { ClinicalReasoningAnalysis } from './hooks/useClinicalReasoning';
import type { VoiceCommandAction } from './types/medical';

// ============================================
// MEDIFOLLOW AI — APPLICATION PRINCIPALE
// ============================================

function getStoredCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;

    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

function App() {
  const { consultations, patients, prescriptions } = useMedicalData();
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      const label: Record<string, string> = {
        'medifollow-patients': 'patients',
        'medifollow-consultations': 'consultations',
        'medifollow-prescriptions': 'ordonnances',
        'medifollow-settings': 'paramètres',
        'medifollow-deleted-patients': 'corbeille',
        'medifollow-inventory': 'inventaire',
      };
      const section = detail?.key ? label[detail.key] : undefined;
      setStorageWarning(
        section
          ? `Échec de l'enregistrement des ${section}. Vos modifications ne sont peut-être pas sauvegardées. Libérez de l'espace ou téléchargez une sauvegarde, puis réessayez.`
          : `Échec de l'enregistrement. Vos modifications ne sont peut-être pas sauvegardées. Téléchargez une sauvegarde et réessayez.`
      );
    };

    window.addEventListener('medifollow:storage-error', handleStorageError);
    return () => window.removeEventListener('medifollow:storage-error', handleStorageError);
  }, []);

  // ---------- THÈME ----------

  const [themePreference, setThemePreference] = useState(readInitialThemePreference);
  const [themePersistenceFailed, setThemePersistenceFailed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const theme =
        themePreference === 'auto'
          ? mediaQuery.matches
            ? 'dark'
            : 'light'
          : themePreference;

      document.documentElement.setAttribute('data-theme', theme);
    };

    applyTheme();

    if (themePreference === 'auto') {
      mediaQuery.addEventListener('change', applyTheme);
    }

    setThemePersistenceFailed(!persistThemePreference(themePreference));

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
    };
  }, [themePreference]);

  // ---------- NAVIGATION ----------

  const [active, setActive] = useState('Tableau de bord');
  const [pendingConsultationActions, setPendingConsultationActions] = useState<VoiceCommandAction[]>([]);
  const handleVoiceCommandActions = useCallback((actions: VoiceCommandAction[]) => {
    const navigationActions = actions.filter(
      (action): action is Extract<VoiceCommandAction, { type: 'navigate' }> => action.type === 'navigate'
    );
    navigationActions.forEach((action) => setActive(action.page));

    const consultationActions = actions.filter((action) => action.type !== 'navigate');
    if (consultationActions.length > 0) {
      setActive('Consultations');
      setPendingConsultationActions((previous) => [...previous, ...consultationActions]);
    }
  }, []);
  const clearPendingConsultationActions = useCallback(() => setPendingConsultationActions([]), []);
  const [orbPrompt, setOrbPrompt] = useState('');
  const [clinicalInsight, setClinicalInsight] = useState<{
    enabled: boolean;
    status: 'idle' | 'analyzing' | 'ready' | 'error';
    analysis: ClinicalReasoningAnalysis | null;
    error: string;
    updatedAt: string;
  }>({ enabled: true, status: 'idle', analysis: null, error: '', updatedAt: '' });
  const handleClinicalReasoningChange = useCallback((insight: typeof clinicalInsight) => {
    setClinicalInsight(insight);
  }, []);

  const [jarvisDraft, setJarvisDraft] = useState<ConsultationPrefill | null>(null);
  const clearJarvisDraft = useCallback(() => setJarvisDraft(null), []);
  const openJarvisDraft = useCallback((draft: ConsultationPrefill) => {
    setJarvisDraft(draft);
    setActive('Consultations');
  }, []);

  const [jarvisPrescription, setJarvisPrescription] = useState<PrescriptionPrefill | null>(null);
  const clearJarvisPrescription = useCallback(() => setJarvisPrescription(null), []);
  const [jarvisReceipt, setJarvisReceipt] = useState<ReceiptPrefill | null>(null);
  const clearJarvisReceipt = useCallback(() => setJarvisReceipt(null), []);

  // ---------- AFFICHAGE DES PAGES ----------

  function renderContent() {
    switch (active) {
      case 'Tableau de bord':
        return (
          <Dashboard
            patientCount={getStoredCount('medifollow-patients')}
            consultationCount={getStoredCount('medifollow-consultations')}
            onStartConsultation={() => setActive('Consultations')}
            onOpenCopilot={() => setActive('Copilote IA')}
            onOpenPatients={() => setActive('Patients')}
            onNavigate={setActive}
          />
        );

      case 'Patients':
        return <Patients />;

      case 'Consultations':
        return (
          <Consultations
            onAskCopilot={(prompt) => setOrbPrompt(prompt)}
            onClinicalReasoningChange={handleClinicalReasoningChange}
            jarvisDraft={jarvisDraft}
            onJarvisDraftConsumed={clearJarvisDraft}
            commandActions={pendingConsultationActions}
            onCommandActionsConsumed={clearPendingConsultationActions}
          />
        );

      case 'Copilote IA':
        return (
          <Copilot
            consultations={consultations}
            patients={patients}
            prescriptions={prescriptions}
            onNavigate={setActive}
            onDraft={openJarvisDraft}
            onPrescription={draft => { setJarvisPrescription(draft); setActive('Ordonnances'); }}
            onReceipt={draft => { setJarvisReceipt(draft); setActive('Inventaire'); }}
          />
        );

      case 'Protocoles médicaux':
        return <Protocols />;

      case 'Ordonnances':
        return <Prescriptions jarvisDraft={jarvisPrescription} onJarvisDraftConsumed={clearJarvisPrescription} />;

      case 'Inventaire':
        return <Inventory jarvisReceipt={jarvisReceipt} onJarvisReceiptConsumed={clearJarvisReceipt} />;

      case 'Paramètres':
        return (
          <Settings
            themePreference={themePreference}
            onThemeChange={(value) => setThemePreference(normalizeThemePreference(value))}
          />
        );

      default:
        return (
          <Dashboard
            patientCount={getStoredCount('medifollow-patients')}
            consultationCount={getStoredCount('medifollow-consultations')}
            onStartConsultation={() => setActive('Consultations')}
            onOpenCopilot={() => setActive('Copilote IA')}
            onOpenPatients={() => setActive('Patients')}
            onNavigate={setActive}
          />
        );
    }
  }

  // ---------- RENDU PRINCIPAL ----------

  return (
    <div className="app premium-clinical-app" id="cabinet-app" data-design="cabinet-a">
      <a className="premium-skip-link" href="#contenu-principal">Aller au contenu principal</a>
      <AppNavigation
        active={active}
        onNavigate={setActive}
      />

      <main className="main" id="contenu-principal">
        <Header title={active} onOpenCopilot={() => setActive('Copilote IA')} />
        {themePersistenceFailed && (
          <p className="clinical-storage-alert" role="status">Le thème reste modifiable pour cette session, mais sa préférence n’a pas pu être enregistrée dans le navigateur.</p>
        )}
        {storageWarning && (
          <div className="clinical-storage-alert" role="alert">
            <strong>Attention — stockage non confirmé</strong>
            <p>{storageWarning}</p>
            <button type="button" onClick={() => setStorageWarning('')}>
              Fermer
            </button>
          </div>
        )}
        {renderContent()}
      </main>

      {active !== 'Copilote IA' && <OrbAssistant
        isThinking={false}
        currentPage={active}
        clinicalPrompt={orbPrompt}
        clinicalInsight={active === 'Consultations' ? clinicalInsight : undefined}
        onClinicalPromptConsumed={() => setOrbPrompt('')}
        onOpenCopilot={() => setActive('Copilote IA')}
        onNavigate={setActive}
        onCommandActions={handleVoiceCommandActions}
      />}
    </div>
  );
}

export default App;
