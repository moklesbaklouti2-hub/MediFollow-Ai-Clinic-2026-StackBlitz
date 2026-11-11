/**
 * N'appliquer une réponse d'analyse que si sa requête est encore active.
 * Le signal AbortController seul ne suffit pas : un transport peut
 * résoudre une promesse malgré une annulation (réponse tardive).
 */
export function isCurrentClinicalRequest(
  candidate: AbortController,
  active: AbortController | null,
): boolean {
  return active === candidate && !candidate.signal.aborted;
}
