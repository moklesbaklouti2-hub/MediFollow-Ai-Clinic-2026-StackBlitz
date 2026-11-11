import type { Prescription, PrescriptionCategory } from '../types/medical';

// Non-prescriptive, read-only view of *recorded orders*, never results.
// Legacy medication rows remain displayed separately by the patient page.
type SourceOrder = Pick<Prescription, 'items'>;
export type DocumentedOrder = {
  id: string;
  category: 'laboratory' | 'radiology' | 'other';
  label: string;
  name: string;
  details: string | null;
};
const LABELS: Readonly<Partial<Record<PrescriptionCategory, string>>> = {
  laboratory: 'Analyse biologique prescrite',
  radiology: 'Imagerie prescrite',
  other: 'Autre élément prescrit',
};
export function documentedSupplementalOrders(prescription: SourceOrder): DocumentedOrder[] {
  const raw: unknown = prescription?.items;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row: unknown, index: number): DocumentedOrder[] => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    if (item.category !== 'laboratory' && item.category !== 'radiology' && item.category !== 'other') return [];
    if (typeof item.name !== 'string' || !item.name.trim()) return [];
    return [{
      id: typeof item.id === 'string' && item.id.trim() ? item.id : 'élément-' + index,
      category: item.category,
      label: LABELS[item.category]!,
      name: item.name.trim(),
      details: typeof item.details === 'string' && item.details.trim() ? item.details.trim() : null,
    }];
  });
}
