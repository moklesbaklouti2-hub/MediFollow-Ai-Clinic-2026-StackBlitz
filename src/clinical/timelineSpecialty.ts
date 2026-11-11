import type { Consultation } from '../types/medical';

// Derive options only from the confirmed patient's documented consultations.
// Ignore malformed imported values rather than inventing a specialty.
export function documentedSpecialtyOptions(
  consultations: readonly Pick<Consultation, 'specialty'>[],
): string[] {
  const result = new Set<string>();
  for (const consultation of consultations) {
    const value: unknown = consultation?.specialty;
    if (typeof value === 'string' && value.trim() && value.trim().length <= 120) {
      result.add(value.trim());
    }
  }
  return [...result].sort((a, b) => a.localeCompare(b, 'fr-FR'));
}

type TimelineSpecialtyEvent =
  | { type: 'consultation'; consultation: { specialty?: unknown } }
  | { type: 'prescription' };

export function filterTimelineBySpecialty<T extends TimelineSpecialtyEvent>(
  events: readonly T[], filter: string,
): T[] {
  if (filter === 'all') return [...events];
  return events.filter(event => {
    if (event.type !== 'consultation') return false;
    const value: unknown = event.consultation?.specialty;
    const specialty = typeof value === 'string' ? value.trim() : '';
    if (filter === 'missing') return !specialty;
    return filter.startsWith('specialty:') &&
      specialty === filter.slice('specialty:'.length);
  });
}
