// Pure state machine for the opt-in doctor's UI. No credentials or tokens.
// It keeps the clinical application unmounted while logout is unresolved.
export type DoctorGatePhase = 'verifying' | 'login' | 'authenticated' | 'locked' | 'logout-pending';
export type DoctorGateEvent =
  | 'verify-success' | 'verify-failure'
  | 'login-success' | 'login-failure'
  | 'session-rejected'
  | 'background' | 'foreground'
  | 'logout-start' | 'logout-success' | 'logout-failure';

export function nextDoctorGatePhase(phase: DoctorGatePhase, event: DoctorGateEvent): DoctorGatePhase {
  switch (event) {
    case 'verify-success': return phase === 'verifying' ? 'authenticated' : phase;
    case 'verify-failure': return phase === 'verifying' ? 'login' : phase;
    case 'login-success': return phase === 'login' ? 'authenticated' : phase;
    case 'login-failure': return phase === 'login' ? 'login' : phase;
    case 'session-rejected': return phase === 'logout-pending' ? phase : 'login';
    case 'background': return phase === 'authenticated' ? 'locked' : phase;
    case 'foreground': return phase === 'locked' ? 'verifying' : phase;
    case 'logout-start': return phase === 'authenticated' ? 'logout-pending' : phase;
    case 'logout-success': return phase === 'logout-pending' ? 'login' : phase;
    case 'logout-failure': return phase === 'logout-pending' ? 'logout-pending' : phase;
  }
}
