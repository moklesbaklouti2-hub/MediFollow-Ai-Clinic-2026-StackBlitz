import { doctorAuthRequested } from '../services/doctorAuthMode';
import { sendClinicalRequest } from '../services/doctorClinicalTransport';

export async function verifyJarvisToolsAccess(signal?: AbortSignal): Promise<boolean> {
  if (doctorAuthRequested || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return false;
  try {
    const deadline = AbortSignal.timeout(5000);
    const response = await sendClinicalRequest('/api/chat', { mode: 'jarvis-tools-access' }, {
      signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    });
    return response.ok && (await response.json())?.localToolsAllowed === true;
  } catch {
    return false;
  }
}
