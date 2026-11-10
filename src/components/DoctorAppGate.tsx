import { useEffect, useState } from 'react';
import App from '../App';
import DoctorLogin from './DoctorLogin';
import { DoctorAuthError, getDoctorCsrfToken, loginDoctor, logoutDoctor } from '../services/doctorAuthClient';
import { broadcastDoctorSessionEvent, doctorAuthPreviewEnabled, subscribeDoctorCrossTab, subscribeDoctorSessionInvalid } from '../services/doctorAuthMode';
import { nextDoctorGatePhase, type DoctorGatePhase } from '../services/doctorGateTransitions';
import './DoctorAppGate.css';

// Opt-in HTTPS-only synthetic browser preview. No medical deployment is approved.
export default function DoctorAppGate() {
  const [phase, setPhase] = useState<DoctorGatePhase>('verifying');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  useEffect(() => {
    if (!doctorAuthPreviewEnabled || !secure) return;
    const onSessionRejected = () => {
      setError('Session expirée ou accès refusé. Reconnectez-vous.');
      setPhase(previous => nextDoctorGatePhase(previous, 'session-rejected'));
    };
    const unsubscribeLocal = subscribeDoctorSessionInvalid(onSessionRejected);
    const unsubscribeCrossTab = subscribeDoctorCrossTab(event => {
      if (event === 'logout-start') {
        setError('Déconnexion lancée dans un autre onglet. Vérifiez la révocation.');
        setPhase(previous => nextDoctorGatePhase(previous, 'logout-start'));
      } else if (event === 'logout-success') {
        setError('');
        setPhase(previous => previous === 'logout-pending'
          ? nextDoctorGatePhase(previous, 'logout-success')
          : nextDoctorGatePhase(previous, 'session-rejected'));
      } else {
        onSessionRejected();
      }
    });
    return () => { unsubscribeLocal(); unsubscribeCrossTab(); };
  }, [secure]);

  useEffect(() => {
    if (phase !== 'verifying' || !doctorAuthPreviewEnabled || !secure) return;
    let active = true;
    getDoctorCsrfToken()
      .then(() => {
        if (!active) return;
        setError('');
        setPhase(previous => document.visibilityState === 'hidden'
          ? 'locked' : nextDoctorGatePhase(previous, 'verify-success'));
      })
      .catch(() => {
        if (active) setPhase(previous => nextDoctorGatePhase(previous, 'verify-failure'));
      });
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
          setPhase(previous => nextDoctorGatePhase(previous, 'session-rejected'));
        }
      }
    };
    const lockOnBackground = () => {
      if (document.visibilityState === 'hidden') {
        setPhase(previous => nextDoctorGatePhase(previous, 'background'));
      }
    };
    const timer = window.setInterval(() => { void recheck(); }, 30_000);
    document.addEventListener('visibilitychange', lockOnBackground);
    lockOnBackground();
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', lockOnBackground);
    };
  }, [phase, secure]);

  useEffect(() => {
    if (phase !== 'locked') return;
    const checkOnReturn = () => {
      if (document.visibilityState === 'visible') {
        setPhase(previous => nextDoctorGatePhase(previous, 'foreground'));
      }
    };
    checkOnReturn();
    document.addEventListener('visibilitychange', checkOnReturn);
    return () => document.removeEventListener('visibilitychange', checkOnReturn);
  }, [phase]);

  async function submit(username: string, password: string) {
    if (busy || phase !== 'login') return;
    setBusy(true);
    setError('');
    try {
      await loginDoctor(username, password);
      await getDoctorCsrfToken();
      setPhase(previous => document.visibilityState === 'hidden'
        ? 'locked' : nextDoctorGatePhase(previous, 'login-success'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion sécurisée indisponible.');
      setPhase(previous => nextDoctorGatePhase(previous, 'login-failure'));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (busy || (phase !== 'authenticated' && phase !== 'logout-pending')) return;
    // Unmount App first; a network failure must never restore the clinical UI.
    setPhase(previous => nextDoctorGatePhase(previous, 'logout-start'));
    broadcastDoctorSessionEvent('logout-start');
    setBusy(true);
    setError('');
    try {
      await logoutDoctor();
      setPhase(previous => nextDoctorGatePhase(previous, 'logout-success'));
      broadcastDoctorSessionEvent('logout-success');
    } catch (reason) {
      if (reason instanceof DoctorAuthError && reason.status === 401) {
        // A missing/expired server session is already effectively logged out.
        setPhase(previous => nextDoctorGatePhase(previous, 'logout-success'));
        broadcastDoctorSessionEvent('logout-success');
      } else {
        setError('La révocation distante n’est pas confirmée. Réessayez la déconnexion.');
        setPhase(previous => nextDoctorGatePhase(previous, 'logout-failure'));
      }
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

  if (phase === 'logout-pending') {
    return (
      <main className="doctor-preview-blocked" role="alert">
        <h1>Accès clinique verrouillé</h1>
        <p>{error || 'Déconnexion en cours : les consultations sont masquées.'}</p>
        <button type="button" disabled={busy} onClick={() => { void signOut(); }}>
          {busy ? 'Déconnexion en cours…' : 'Réessayer la déconnexion'}
        </button>
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
