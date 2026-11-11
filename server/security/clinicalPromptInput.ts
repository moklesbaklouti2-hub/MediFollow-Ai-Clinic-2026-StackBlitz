// Input hygiene only; does not authenticate users or validate clinical content.
// Never coerce objects or arrays into prompts sent to an AI provider.
export function readClinicalPromptText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
