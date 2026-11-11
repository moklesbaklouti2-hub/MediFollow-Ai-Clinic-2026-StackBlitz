// Input hygiene only; does not authenticate users or validate clinical content.
// Never coerce objects or arrays into prompts sent to an AI provider.
export function readClinicalPromptText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Keep a single request bounded before assembling the larger clinical chat
// context and before invoking an external provider. This is a safety cap,
// not a medical text quality validator.
export const MAX_CHAT_MESSAGE_CHARS = 12_000;
export function isClinicalChatMessageTooLong(value: string): boolean {
  return value.length > MAX_CHAT_MESSAGE_CHARS;
}
