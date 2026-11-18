import { MAX_LOCAL_DOCUMENT_CHARS, previewLocalDocument } from '../clinical/documentReader';

export const MAX_DOCUMENTS = 3;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 30;

export type DocumentSource = { location: string; text: string };
export type JarvisDocument = {
  id: string;
  name: string;
  sources: DocumentSource[];
  warnings: string[];
  selected: boolean;
};

export function textSources(input: string): DocumentSource[] {
  const preview = previewLocalDocument(input);
  if (!preview.hasContent || /[\u0000\ufffd]/.test(input)) {
    throw new Error('Le fichier ne contient pas de texte UTF-8 lisible.');
  }
  if (preview.truncated) throw new Error(`Le texte dépasse ${MAX_LOCAL_DOCUMENT_CHARS} caractères.`);
  const lines = preview.text.split(/\r\n|\n|\r/);
  const sources: DocumentSource[] = [];
  let start = 0;
  let characters = 0;
  for (const [index, line] of lines.entries()) {
    characters += line.length + 1;
    if (characters < 450 && index < lines.length - 1) continue;
    const text = lines.slice(start, index + 1).join('\n');
    if (text.trim()) sources.push({
      location: start === index ? `Ligne ${index + 1}` : `Lignes ${start + 1}–${index + 1}`,
      text,
    });
    start = index + 1;
    characters = 0;
  }
  return sources;
}

export async function readDocument(
  file: File, signal: AbortSignal, onProgress: (message: string) => void,
): Promise<JarvisDocument> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('Fichier vide ou supérieur à 5 Mio.');
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  if (extension && ['png', 'jpg', 'jpeg'].includes(extension)) {
    throw new Error('OCR indisponible. Fournissez le texte ou un PDF disposant d’une couche texte.');
  }
  if (extension !== 'pdf' && extension !== 'txt') throw new Error('Format non pris en charge.');
  onProgress('Lecture du fichier…');
  const bytes = await file.arrayBuffer();
  signal.throwIfAborted();
  const warnings: string[] = [];
  let sources: DocumentSource[];
  if (extension === 'txt') {
    let content: string;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new Error('Le fichier ne contient pas de texte UTF-8 lisible.'); }
    sources = textSources(content);
  } else {
    if (!new TextDecoder().decode(bytes.slice(0, 5)).startsWith('%PDF-')) {
      throw new Error('Signature PDF invalide.');
    }
    const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
      import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    signal.throwIfAborted();
    GlobalWorkerOptions.workerSrc = workerUrl;
    const task = getDocument({
      data: bytes, isEvalSupported: false, useSystemFonts: false, stopAtErrors: true,
    });
    const destroy = () => { void task.destroy().catch(() => {}); };
    signal.addEventListener('abort', destroy, { once: true });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > MAX_PDF_PAGES) throw new Error(`Le PDF dépasse ${MAX_PDF_PAGES} pages.`);
      sources = [];
      let characters = 0;
      for (let number = 1; number <= pdf.numPages; number += 1) {
        signal.throwIfAborted();
        onProgress(`Extraction de la page ${number}/${pdf.numPages}…`);
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const text = content.items.flatMap(item => 'str' in item ? [item.str + (item.hasEOL ? '\n' : ' ')] : [])
          .join('').trim();
        page.cleanup();
        if (!text || /\ufffd/.test(text)) warnings.push(`Page ${number} : texte absent ou partiellement illisible.`);
        if (!text) continue;
        characters += text.length;
        if (characters > MAX_LOCAL_DOCUMENT_CHARS) {
          throw new Error(`Le texte extrait dépasse ${MAX_LOCAL_DOCUMENT_CHARS} caractères.`);
        }
        sources.push({ location: `Page ${number}`, text });
      }
      if (!sources.length) throw new Error('Aucune couche texte lisible. Ce PDF peut nécessiter un OCR.');
      warnings.unshift('Contrôlez le texte et l’ordre des colonnes dans le PDF original.');
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof Error) {
        if (error.name === 'PasswordException') throw new Error('PDF protégé par mot de passe.');
        if (error.name !== 'Error') throw new Error('PDF corrompu ou impossible à lire.');
      }
      throw error;
    } finally {
      signal.removeEventListener('abort', destroy);
      destroy();
    }
  }
  signal.throwIfAborted();
  return { id: crypto.randomUUID(), name: file.name, sources, warnings, selected: false };
}
