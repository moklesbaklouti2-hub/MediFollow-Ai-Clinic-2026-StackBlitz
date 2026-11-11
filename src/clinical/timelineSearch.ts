import type { Consultation, Prescription } from '../types/medical';

// Search only the already selected patient's documented events. Text stays in
// the browser; nothing is sent to external AI, storage, or an API.
type TimelineSearchEntry =
  | { type: 'consultation'; consultation: Pick<Consultation, 'motif' | 'specialty' | 'diagnosis' | 'symptoms'> }
  | { type: 'prescription'; prescription: Pick<Prescription, 'medications' | 'items' | 'advice'> };

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function searchableSource(entry: TimelineSearchEntry): string {
  if (entry.type === 'consultation') {
    const c = entry.consultation;
    return [text(c.motif), text(c.specialty), text(c.diagnosis), text(c.symptoms)].join(' ');
  }
  const p = entry.prescription;
  const medicationNames = Array.isArray(p.medications) ? p.medications.map(m => text(m?.name)) : [];
  const extraItems = Array.isArray(p.items)
    ? p.items.flatMap(i => i && typeof i === 'object' ? [text(i.name), text(i.details)] : [])
    : [];
  return [text(p.advice), ...medicationNames, ...extraItems].join(' ');
}

export function searchRecordedEvents<T extends TimelineSearchEntry>(
  records: readonly T[], term: string,
): T[] {
  const query = fold(typeof term === 'string' ? term.trim().slice(0, 100) : '');
  if (!query) return [...records];
  return records.filter(item => fold(searchableSource(item)).includes(query));
}
