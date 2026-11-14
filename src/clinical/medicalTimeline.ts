import { isValidFollowUpDate } from './followUp';

// Timeline dates must be explicit calendar dates or time-zone-qualified ISO
// timestamps. Ambiguous, impossible and malformed imported values are unknown.
export function recordedDateTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  // The validator is a TypeScript type guard: do not narrow the already-string
  // `text` to `never` when checking timestamp formats below.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return isValidFollowUpDate(text) ? Date.parse(text + 'T00:00:00Z') : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return null;
  if (!isValidFollowUpDate(text.slice(0, 10))) return null;
  // Reject rollover at 24:00 and out-of-range clock components explicitly.
  if (Number(text.slice(11, 13)) > 23 || Number(text.slice(14, 16)) > 59 ||
      Number(text.slice(17, 19)) > 59) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : null;
}

// Never mutate stored clinical records; dates that cannot be established
// appear after documented dates, then IDs provide a stable tie-break.
export function orderRecordedNewest<T extends { id: string; date: string }>(records: readonly T[]): T[] {
  return [...records].sort((left, right) => {
    const a = recordedDateTimestamp(left.date);
    const b = recordedDateTimestamp(right.date);
    const tie = () => String(left.id ?? '').localeCompare(String(right.id ?? ''));
    if (a === null) return b === null ? tie() : 1;
    if (b === null) return -1;
    return b - a || tie();
  });
}

export function displayRecordedDate(value: unknown): string {
  const timestamp = recordedDateTimestamp(value);
  if (timestamp === null) return 'Date non renseignée';
  if (typeof value === 'string' && isValidFollowUpDate(value.trim())) {
    return new Date(timestamp).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  }
  return new Date(timestamp).toLocaleString('fr-FR');
}
