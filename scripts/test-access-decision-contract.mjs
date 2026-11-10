// Proposed access decisions only. NOT connected to Express middleware.
// All subjects, roles and patient IDs in this file are fictional.
import assert from 'node:assert/strict';

export function proposedAccessDecision({ authenticated = false, role = 'visitor', action, patientId, assignedPatientIds = [] }) {
  if (action === 'public-health' || action === 'public-education') return 200;
  if (!authenticated) return 401;
  if (!['doctor', 'staff', 'patient'].includes(role)) return 403;
  if (action === 'clinical-ai' || action === 'clinical-chat' || action === 'prescription-sign') {
    return role === 'doctor' ? 200 : 403;
  }
  if (action === 'patient-record') {
    return role === 'doctor' && typeof patientId === 'string' && patientId.trim().length > 0 &&
      Array.isArray(assignedPatientIds) && assignedPatientIds.includes(patientId) ? 200 : 403;
  }
  return 403; // Unknown actions are denied by default.
}

const cases = [
  [{ action: 'public-health' }, 200],
  [{ action: 'public-education' }, 200],
  [{ action: 'clinical-ai' }, 401],
  [{ authenticated: true, role: 'patient', action: 'clinical-ai' }, 403],
  [{ authenticated: true, role: 'staff', action: 'clinical-chat' }, 403],
  [{ authenticated: true, role: 'staff', action: 'prescription-sign' }, 403],
  [{ authenticated: true, role: 'doctor', action: 'prescription-sign' }, 200],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: ['fictional-A'] }, 200],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-B', assignedPatientIds: ['fictional-A'] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: [] }, 403],
  [{ authenticated: true, role: 'staff', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: ['fictional-A'] }, 403],
  [{ authenticated: false, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: ['fictional-A'] }, 401],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-a', assignedPatientIds: ['fictional-A'] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: ['fictional-B', 'fictional-A'] }, 200],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: [null, 'fictional-B'] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A ', assignedPatientIds: ['fictional-A'] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: ['fictional-A '] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: {} }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: [123, 'fictional-A'] }, 200],
  [{ authenticated: true, role: 'patient', action: 'prescription-sign' }, 403],
  [{ authenticated: true, role: 'doctor', action: 'unexpected-clinical-operation' }, 403],
  [{ authenticated: true, role: 'patient', action: 'patient-record', patientId: 'fictional-A' }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: null }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 'fictional-A', assignedPatientIds: 'fictional-A' }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: '', assignedPatientIds: [''] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: '   ', assignedPatientIds: ['   '] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'patient-record', patientId: 123, assignedPatientIds: [123] }, 403],
  [{ authenticated: true, role: 'doctor', action: 'unknown-action' }, 403],
  [{ authenticated: true, role: 'visitor', action: 'clinical-ai' }, 403],
];
for (const [request, expected] of cases) assert.equal(proposedAccessDecision(request), expected, JSON.stringify(request));
console.log('Proposed access decision contract: 29/29 assertions PASS (offline simulation only, no runtime authentication).');
