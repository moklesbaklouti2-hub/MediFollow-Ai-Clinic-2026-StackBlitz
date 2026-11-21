// HELIOS Document Reader — local text preview only. Nothing is extracted,
// interpreted, sent to AI providers, saved, or linked to a patient record.
export const MAX_LOCAL_DOCUMENT_CHARS = 5000;

export type LocalDocumentPreview = {
  text: string;
  hasContent: boolean;
  characterCount: number;
  lineCount: number;
  wordCount: number;
  truncated: boolean;
};

export function previewLocalDocument(input: unknown): LocalDocumentPreview {
  const source = typeof input === 'string' ? input : '';
  const text = source.slice(0, MAX_LOCAL_DOCUMENT_CHARS);
  const hasContent = text.trim().length > 0;
  return {
    text,
    hasContent,
    characterCount: text.length,
    lineCount: hasContent ? text.split(/\r\n|\n|\r/).length : 0,
    wordCount: hasContent ? (text.match(/\S+/g) ?? []).length : 0,
    truncated: source.length > MAX_LOCAL_DOCUMENT_CHARS,
  };
}
