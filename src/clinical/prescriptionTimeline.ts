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
// Read-only status; never infer that a draft is valid or a dispense covers
// every item of a recorded prescription.
export function documentedPrescriptionStatus(status: unknown): string {
  switch (status) {
    case 'draft': return 'Brouillon — non validée';
    case 'validated': return 'Validée (statut enregistré)';
    case 'dispensed': return 'Délivrance enregistrée (statut)';
    case 'cancelled': return 'Annulée — ne pas considérer comme active';
    default: return 'Statut non renseigné (ancien dossier)';
  }
}

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
