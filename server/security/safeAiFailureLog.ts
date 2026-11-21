// Provider failures can contain raw prompts, response bodies or credentials.
// Only fixed operation labels and validated HTTP status numbers may be logged.
export type AiFailureOperation = 'commands' | 'chat' | 'interview-quality';

export function safeAiFailureStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  try {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' && Number.isInteger(status) &&
      status >= 400 && status <= 599 ? status : null;
  } catch {
    // Do not allow an untrusted accessor to throw while handling an error.
    return null;
  }
}

export function logSafeAiFailure(
  operation: AiFailureOperation,
  error: unknown,
  write: (message: string) => void = console.warn,
): void {
  const status = safeAiFailureStatus(error);
  write(`MediFollow AI: ${operation} indisponible (statut HTTP ${status ?? 'inconnu'}).`);
}
