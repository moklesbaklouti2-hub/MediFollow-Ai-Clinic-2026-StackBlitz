import type { Consultation, ConsultationFollowUp } from '../types/medical';

// Dates without time zones. Plans are entered by a clinician; no patient
// notification or automatic clinical decision is performed.
export function isValidFollowUpDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

export function prepareFollowUp(
  dueDate: string, objective: string, completed: boolean,
): { valid: boolean; followUp?: ConsultationFollowUp } {
  const date = dueDate.trim();
  const note = objective.trim();
  if (!date && !note && !completed) return { valid: true };
  if (!isValidFollowUpDate(date) || note.length > 500) return { valid: false };
  return {
    valid: true,
    followUp: { dueDate: date, objective: note, status: completed ? 'completed' : 'planned' },
  };
}

export function summarizeFollowUps(
  consultations: readonly Pick<Consultation, 'followUp'>[],
  today: string,
): { overdue: number; today: number; nextSevenDays: number } {
  const summary = { overdue: 0, today: 0, nextSevenDays: 0 };
  if (!isValidFollowUpDate(today)) return summary;
  const midnight = Date.parse(today + 'T00:00:00Z');
  const nextWeek = midnight + 7 * 24 * 60 * 60 * 1000;
  for (const { followUp } of consultations) {
    if (!followUp || followUp.status !== 'planned' || !isValidFollowUpDate(followUp.dueDate)) continue;
    const due = Date.parse(followUp.dueDate + 'T00:00:00Z');
    if (due < midnight) summary.overdue++;
    else if (due === midnight) summary.today++;
    else if (due <= nextWeek) summary.nextSevenDays++;
  }
  return summary;
}
