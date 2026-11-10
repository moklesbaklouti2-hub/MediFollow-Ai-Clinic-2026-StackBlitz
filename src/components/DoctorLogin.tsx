import { useState, type FormEvent } from 'react';
import './DoctorLogin.css';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
  busy?: boolean;
  error?: string;
};

// Preparatory UI component only: not mounted into App until secure backend
// sessions and real clinical route protection are available.
export default function DoctorLogin({ onLogin, busy = false, error = '' }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !username.trim() || !password) return;
    try {
      await onLogin(username.trim(), password);
    } finally {
      setPassword('');
    }
  }
  return (
    <main className="doctor-login-shell">
      <form className="doctor-login-panel" onSubmit={submit} autoComplete="on">
        <div className="doctor-login-brand">MediFollow AI</div>
        <h1>Connexion médecin</h1>
        <p>Accès réservé aux professionnels autorisés.</p>
        <label htmlFor="doctor-username">Identifiant</label>
        <input id="doctor-username" name="username" type="text" autoComplete="username"
          maxLength={128} required value={username} onChange={event => setUsername(event.target.value)}
          disabled={busy} />
        <label htmlFor="doctor-password">Mot de passe</label>
        <input id="doctor-password" name="password" type="password" autoComplete="current-password"
          required value={password} onChange={event => setPassword(event.target.value)}
          disabled={busy} />
        {error && <p className="doctor-login-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !username.trim() || !password}>
          {busy ? 'Connexion en cours…' : 'Se connecter'}
        </button>
        <small>Ne saisissez pas de données de patient sur cet écran.</small>
      </form>
    </main>
  );
}
