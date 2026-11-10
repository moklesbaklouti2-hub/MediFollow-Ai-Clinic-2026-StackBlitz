import { useEffect, useState } from 'react';
import App from '../App';
import DoctorLogin from './DoctorLogin';
import { getDoctorCsrfToken, loginDoctor, logoutDoctor } from '../services/doctorAuthClient';
import { doctorAuthPreviewEnabled, subscribeDoctorSessionInvalid } from '../services/doctorAuthMode';
import './DoctorAppGate.css';

type Phase = 'checking' | 'login' | 'authenticated';

// Strictly opt-in synthetic preview. The normal Vite application still loads
// App directly. DO NOT use this mode with real patient data or public hosting.
export default function DoctorAppGate() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  useEffect(() => {
    if (!doctorAuthPreviewEnabled || !secure) return;
    let active = true;
    getDoctorCsrfToken()
      .then(() => { if (active) setPhase('authenticated'); })
      .catch(() => { if (active) setPhase('login'); });
    const unsubscribe = subscribeDoctorSessionInvalid(() => {
      if (!active) return;
      setError('Session expirée ou accès refusé. Reconnectez-vous.');
      setPhase('login');
    });
    return () => { active = false; unsubscribe(); };
  }, [secure]);

  useEffect(() => {
    if (phase !== 'authenticated' || !secure) return;
    let active = true;
    const recheck = async () => {
      try {
        await getDoctorCsrfToken();
      } catch {
        if (active) {
          setError('La session ne peut plus être vérifiée. Reconnectez-vous.');
          setPhase('login');
        }
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPhase('checking');
      } else {
        void recheck().then(() => {
          // This check only restores the app after a verified session;
          // the dedicated checking effect below handles foreground return.
        });
      }
    };
    const timer = window.setInterval(() => { void recheck(); }, 30_000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase, secure]);

  useEffect(() => {
    if (phase !== 'checking' || !secure || !doctorAuthPreviewEnabled) return;
    let active = true;
    getDoctorCsrfToken()
      .then(() => { if (active) setPhase('authenticated'); })
      .catch(() => { if (active) setPhase('login'); });
    return () => { active = false; };
  }, [phase, secure]);

  async function submit(username: string, password: string) {
    setBusy(true);
    setError('');
    try {
      await loginDoctor(username, password);
      await getDoctorCsrfToken();
      setPhase('authenticated');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion sécurisée indisponible.');
      setPhase('login');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    // Lock the screen first, even if the remote logout cannot complete.
    setPhase('checking');
    try {
      await logoutDoctor();
      setError('');
    } catch {
      setError('Écran verrouillé, mais la révocation distante n’a pas été confirmée.');
    } finally {
      setPhase('login');
    }
  }

  if (!doctorAuthPreviewEnabled || !secure) {
    return (
      <main className="doctor-preview-blocked">
        <h1>Accès médecin indisponible</h1>
        <p>Ce mode d’essai exige HTTPS et une configuration d’authentification explicite et valide.</p>
        <p>Aucune donnée clinique n’a été chargée.</p>
      </main>
    );
  }

  if (phase === 'checking') {
    return (
      <main className="doctor-preview-blocked" role="status">
        Vérification de la session médecin…
      </main>
    );
  }

  if (phase === 'login') {
    return <DoctorLogin onLogin={submit} busy={busy} error={error} />;
  }

  return (
    <>
      <div className="doctor-preview-toolbar">
        <span>Essai sécurisé — données fictives uniquement</span>
        <button type="button" onClick={() => { void signOut(); }}>Se déconnecter</button>
      </div>
      <App />
    </>
  );
}
