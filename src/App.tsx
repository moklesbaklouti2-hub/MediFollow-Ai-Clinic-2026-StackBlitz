
import { useEffect, useState } from 'react';
import './App.css';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Consultations from './pages/Consultations';
import Copilot, { type Message } from './pages/Copilot';
import Protocols from './pages/Protocols';
import Prescriptions from './pages/Prescriptions';
import Settings from './pages/Settings';

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
  // ---------- THÈME ----------

  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('medifollow-theme') || 'auto';
  });

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

    localStorage.setItem('medifollow-theme', themePreference);

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
    };
  }, [themePreference]);

  // ---------- NAVIGATION ----------

  const [active, setActive] = useState('Tableau de bord');

  // ---------- COPILOTE IA ----------

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const message = question.trim();

    if (!message || loading) return;

    setMessages(previous => [
      ...previous,
      { role: 'user', content: message },
    ]);

    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const text = await response.text();

        throw new Error(
          `Réponse inattendue du serveur : ${text.slice(0, 150)}`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur du serveur IA.');
      }

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content: data.reply || 'Aucune réponse reçue.',
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Impossible de contacter le moteur IA.';

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content: `Erreur : ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- AFFICHAGE DES PAGES ----------

  function renderContent() {
    switch (active) {
      case 'Tableau de bord':
        return (
          <Dashboard
            patientCount={getStoredCount('medifollow-patients')}
            consultationCount={getStoredCount('medifollow-consultations')}
            onStartConsultation={() => setActive('Consultations')}
          />
        );

      case 'Patients':
        return <Patients />;

      case 'Consultations':
        return <Consultations />;

      case 'Copilote IA':
        return (
          <Copilot
            messages={messages}
            question={question}
            onQuestionChange={setQuestion}
            loading={loading}
            onSend={sendMessage}
          />
        );

      case 'Protocoles médicaux':
        return <Protocols />;

      case 'Ordonnances':
        return <Prescriptions />;

      case 'Paramètres':
        return (
          <Settings
            themePreference={themePreference}
            onThemeChange={setThemePreference}
          />
        );

      default:
        return (
          <Dashboard
            patientCount={getStoredCount('medifollow-patients')}
            consultationCount={getStoredCount('medifollow-consultations')}
            onStartConsultation={() => setActive('Consultations')}
          />
        );
    }
  }

  // ---------- RENDU PRINCIPAL ----------

  return (
    <div className="app">
      <Sidebar
        active={active}
        onNavigate={setActive}
      />

      <main className="main">
        <Header title={active} />
        {renderContent()}
      </main>
    </div>
  );
}

export default App;

