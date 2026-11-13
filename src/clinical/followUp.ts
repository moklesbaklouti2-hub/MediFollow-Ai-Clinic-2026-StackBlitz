import type { Consultation, ConsultationFollowUp } from '../types/medical';

// Dates without time zones. Plans are entered by a clinician; no patient
// notification or automatic clinical decision is performed.
export function isValidFollowUpDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

// QW-120: a direct consultation writer may not save malformed follow-up
// plans that disappear from the clinician's worklist. Existing legacy records
// are left untouched unless a caller explicitly supplies a new plan.
// undefined is an intentional absence/clearing of a follow-up.
export function isWritableFollowUpPlan(plan: unknown): boolean {
  if (plan === undefined) return true;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return false;
  const item = plan as Record<string, unknown>;
  return isValidFollowUpDate(item.dueDate) &&
    typeof item.objective === 'string' && item.objective.length <= 500 &&
    (item.status === 'planned' || item.status === 'completed');
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

/**
 * Upcoming and overdue consultations awaiting clinician review.
 * Only the coming seven calendar days are included; older overdue plans
 * remain visible until a clinician explicitly marks them completed.
 */
export function selectDueFollowUps(
  consultations: readonly Consultation[],
  today: string,
): Consultation[] {
  if (!isValidFollowUpDate(today)) return [];
  const cutoff = new Date(Date.parse(today + 'T00:00:00Z') +
    7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return consultations
    .filter(item => item.followUp?.status === 'planned' &&
      isValidFollowUpDate(item.followUp.dueDate) &&
      item.followUp.dueDate <= cutoff)
    .sort((a, b) => {
      const aDate = a.followUp?.dueDate ?? '';
      const bDate = b.followUp?.dueDate ?? '';
      return aDate.localeCompare(bDate) || a.id.localeCompare(b.id);
    });
}

/** Explicit clinician completion, never called automatically by a date change. */
export function completedFollowUpPlan(
  plan: ConsultationFollowUp | undefined,
): ConsultationFollowUp | null {
  if (!plan || plan.status !== 'planned' || !isValidFollowUpDate(plan.dueDate) ||
      typeof plan.objective !== 'string') return null;
  return { ...plan, status: 'completed' };
}

/** QW-070: imported plans with invalid or absent dates are review-only. */
export function countUndatedPlannedFollowUps(
  consultations: readonly Pick<Consultation, 'followUp'>[],
): number {
  return consultations.filter(item => {
    const followUp = item.followUp;
    return !!followUp && followUp.status === 'planned' &&
      !isValidFollowUpDate(followUp.dueDate);
  }).length;
}

/** QW-071: visible long-horizon plans, without clinical priority inference. */
export function countLaterPlannedFollowUps(
  consultations: readonly Pick<Consultation, 'followUp'>[], today: string,
): number {
  if (!isValidFollowUpDate(today)) return 0;
  const cutoff = Date.parse(today + 'T00:00:00Z') + 7 * 24 * 60 * 60 * 1000;
  return consultations.filter(item => {
    const plan = item.followUp;
    return !!plan && plan.status === 'planned' &&
      isValidFollowUpDate(plan.dueDate) &&
      Date.parse(plan.dueDate + 'T00:00:00Z') > cutoff;
  }).length;
}

/** QW-072: list imported invalid-date plans separately, without modifying them. */
export function selectUndatedPlannedFollowUps(
  consultations: readonly Consultation[],
): Consultation[] {
  return consultations
    .filter(item => !!item.followUp && item.followUp.status === 'planned' &&
      !isValidFollowUpDate(item.followUp.dueDate))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** QW-073: future follow-up worklist, chronological, without changing plans. */
export function selectLaterPlannedFollowUps(
  consultations: readonly Consultation[], today: string,
): Consultation[] {
  if (!isValidFollowUpDate(today)) return [];
  const cutoff = Date.parse(today + 'T00:00:00Z') + 7 * 24 * 60 * 60 * 1000;
  return consultations
    .filter(item => {
      const plan = item.followUp;
      return !!plan && plan.status === 'planned' &&
        isValidFollowUpDate(plan.dueDate) &&
        Date.parse(plan.dueDate + 'T00:00:00Z') > cutoff;
    })
    .sort((a, b) => (a.followUp?.dueDate ?? '').localeCompare(b.followUp?.dueDate ?? '') ||
      a.id.localeCompare(b.id));
}

// QW-075: local, read-only search in explicitly documented follow-up objectives.
// No patient identifier, decision, medical synonym, or remote AI search is used.
function normalizeFollowUpObjectiveSearch(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR').trim()
    : '';
}

export function filterFollowUpsByObjective<T extends Pick<Consultation, 'followUp'>>(
  rows: readonly T[], query: string,
): T[] {
  const needle = normalizeFollowUpObjectiveSearch(query);
  if (!needle) return [...rows];
  return rows.filter(item =>
    normalizeFollowUpObjectiveSearch(item.followUp?.objective).includes(needle));
}
