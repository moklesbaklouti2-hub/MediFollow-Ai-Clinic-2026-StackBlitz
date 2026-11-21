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

// Page context is navigation metadata, not a user prompt. Keep it to the
// known application page labels before including it in a provider request.
export function allowedVoiceCommandPage(
  value: unknown,
  allowedPages: readonly string[],
  fallback = 'Tableau de bord',
): string {
  return typeof value === 'string' && allowedPages.includes(value) ? value : fallback;
}

// A supplied context must be an object. A missing/null value is intentionally
// context-free; arrays or primitives must not be silently dropped.
export function isOptionalChatContext(value: unknown): boolean {
  return value == null || (typeof value === 'object' && !Array.isArray(value));
}

// An absent history is a first turn. A supplied non-array must not be silently discarded.
export function isOptionalChatHistory(value: unknown): boolean {
  return value == null || Array.isArray(value);
}

// The chat history is clinical conversation context. Invalid entries must not
// be silently discarded, because doing so can alter follow-up reasoning.
// This checks shape only; it does not authenticate or trust the contents.
export function hasOnlyValidChatHistoryEntries(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const item = entry as { role?: unknown; content?: unknown };
    return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string';
  });
}
