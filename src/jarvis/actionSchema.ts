export const toolPages = ['Tableau de bord', 'Patients', 'Consultations', 'Ordonnances', 'Protocoles médicaux', 'Inventaire', 'Paramètres'] as const;
export type ToolPage = typeof toolPages[number];

export const draftFields = {
  motif: 'Motif', symptoms: 'Symptômes', history: 'Histoire clinique',
  targetedInterview: 'Interrogatoire ciblé', examination: 'Notes d’examen',
  plan: 'Conduite à tenir proposée', followUpObjective: 'Objectif de suivi',
} as const;
export type DraftField = keyof typeof draftFields;

export const medicationFields = {
  name: 'Médicament', dosage: 'Posologie', route: 'Voie',
  frequency: 'Fréquence', duration: 'Durée', instructions: 'Instructions',
} as const;
export type MedicationDraft = Record<keyof typeof medicationFields, string>;

export type JarvisAction =
  | { tool: 'open_page'; page: ToolPage }
  | { tool: 'prepare_consultation'; field: DraftField; value: string }
  | { tool: 'prepare_prescription'; medication: MedicationDraft }
  | { tool: 'prepare_receipt'; itemId: string; quantity: number };

export const proposedTools = {
  open_page: { description: 'Ouvrir une page MediFollow', scope: 'application', confirmation: 'explicit' },
  prepare_consultation: { description: 'Préparer un champ dans une nouvelle consultation', scope: 'patient', confirmation: 'explicit' },
  prepare_prescription: { description: 'Préparer une ligne d’ordonnance', scope: 'patient', confirmation: 'explicit' },
  prepare_receipt: { description: 'Préparer une entrée en stock', scope: 'application', confirmation: 'explicit' },
} as const;

export function parseAction(data: unknown): JarvisAction | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  const entry = data as Record<string, unknown>;
  if (entry.tool === 'open_page' && Object.keys(entry).length === 2 &&
      typeof entry.page === 'string' && toolPages.some(page => page === entry.page)) {
    return { tool: entry.tool, page: entry.page as ToolPage };
  }
  if (entry.tool === 'prepare_consultation' && Object.keys(entry).length === 3 &&
      typeof entry.field === 'string' && Object.hasOwn(draftFields, entry.field) &&
      typeof entry.value === 'string' && entry.value.trim() && entry.value.length <= 2000) {
    return { tool: entry.tool, field: entry.field as DraftField, value: entry.value.trim() };
  }
  if (entry.tool === 'prepare_prescription' && Object.keys(entry).length === 2 &&
      entry.medication && typeof entry.medication === 'object' && !Array.isArray(entry.medication)) {
    const raw = entry.medication as Record<string, unknown>;
    const fields = Object.keys(medicationFields) as Array<keyof MedicationDraft>;
    if (Object.keys(raw).length !== fields.length ||
        !fields.every(field => typeof raw[field] === 'string' && raw[field].length <= 500) ||
        typeof raw.name !== 'string' || !raw.name.trim()) return;
    const medication = Object.fromEntries(fields.map(field => [field, (raw[field] as string).trim()])) as MedicationDraft;
    return { tool: entry.tool, medication };
  }
  if (entry.tool === 'prepare_receipt' && Object.keys(entry).length === 3 &&
      typeof entry.itemId === 'string' && entry.itemId.trim() &&
      typeof entry.quantity === 'number' && Number.isFinite(entry.quantity) && entry.quantity > 0) {
    return { tool: entry.tool, itemId: entry.itemId, quantity: entry.quantity };
  }
}

export function parseModelAction(data: unknown) {
  const action = parseAction(data);
  // Stock receipts require an explicitly selected lot and manual quantity.
  return action?.tool === 'prepare_receipt' ? undefined : action;
}
