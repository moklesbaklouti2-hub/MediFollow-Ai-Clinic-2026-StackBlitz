import { useEffect, useState } from 'react';
import App from '../App';
import DoctorLogin from './DoctorLogin';
import { getDoctorCsrfToken, loginDoctor, logoutDoctor } from '../services/doctorAuthClient';
import { doctorAuthPreviewEnabled, subscribeDoctorSessionInvalid } from '../services/doctorAuthMode';
import './DoctorAppGate.css';

type Phase = 'verifying' | 'login' | 'authenticated' | 'locked';

// Opt-in, HTTPS-only browser integration preview with fictional data.
// NOT a medical deployment or an alternative to a security review.
export default function DoctorAppGate() {
  const [phase, setPhase] = useState<Phase>('verifying');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  useEffect(() => {
    if (!doctorAuthPreviewEnabled || !secure) return;
    return subscribeDoctorSessionInvalid(() => {
      setError('Session expirée ou accès refusé. Reconnectez-vous.');
      setPhase('login');
    });
  }, [secure]);

  useEffect(() => {
    if (phase !== 'verifying' || !doctorAuthPreviewEnabled || !secure) return;
    let active = true;
    getDoctorCsrfToken()
      .then(() => { if (active) { setError(''); setPhase('authenticated'); } })
      .catch(() => { if (active) setPhase('login'); });
    return () => { active = false; };
  }, [phase, secure]);

  useEffect(() => {
    if (phase !== 'authenticated' || !secure) return;
    let active = true;
    const recheck = async () => {
      try { await getDoctorCsrfToken(); }
      catch {
        if (active) {
          setError('La session ne peut plus être vérifiée. Reconnectez-vous.');
          setPhase('login');
        }
      }
    };
    const lockOnBackground = () => {
      if (document.visibilityState === 'hidden') setPhase('locked');
    };
    const timer = window.setInterval(() => { void recheck(); }, 30_000);
    document.addEventListener('visibilitychange', lockOnBackground);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', lockOnBackground);
    };
  }, [phase, secure]);

  useEffect(() => {
    if (phase !== 'locked') return;
    const checkOnReturn = () => {
      if (document.visibilityState === 'visible') setPhase('verifying');
    };
    if (document.visibilityState === 'visible') checkOnReturn();
    document.addEventListener('visibilitychange', checkOnReturn);
    return () => document.removeEventListener('visibilitychange', checkOnReturn);
  }, [phase]);

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
    // Immediately unmount clinical screens, before awaiting network logout.
    setPhase('login');
    setBusy(true);
    setError('');
    try {
      await logoutDoctor();
    } catch {
      setError('Écran verrouillé, mais la révocation distante n’a pas été confirmée.');
    } finally {
      setBusy(false);
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

  if (phase === 'verifying' || phase === 'locked') {
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
        <span>Mode d’essai — données fictives uniquement</span>
        <button type="button" onClick={() => { void signOut(); }}>Se déconnecter</button>
      </div>
      <App />
    </>
  );
}
