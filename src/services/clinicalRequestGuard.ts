/**
 * N'appliquer une réponse d'analyse que si la requête et le contexte
 * clinique consulté sont encore actifs. Une annulation réseau seule ne
 * suffit pas si le transport renvoie malgré tout une ancienne réponse.
 */
export function isCurrentClinicalRequest(
  candidate: AbortController,
  active: AbortController | null,
  requestSnapshot: string,
  currentSnapshot: string,
  enabled: boolean,
): boolean {
  return enabled
    && active === candidate
    && !candidate.signal.aborted
    && requestSnapshot === currentSnapshot;
}
