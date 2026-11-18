import { useLayoutEffect, useRef, useState } from 'react';
import { type JarvisDocument, MAX_DOCUMENTS, readDocument } from './documents';

type Props = {
  documents: JarvisDocument[];
  onPrepareExcerpt?: (excerpt: string) => void;
  onChange: (next: JarvisDocument[], selectionChanged: boolean) => void;
};

export default function DocumentsPanel({ documents, onChange, onPrepareExcerpt }: Props) {
  const task = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  useLayoutEffect(() => () => { task.current?.abort(); task.current = null; }, []);

  async function upload(file: File) {
    if (task.current || documents.length >= MAX_DOCUMENTS) return;
    const controller = new AbortController();
    task.current = controller;
    setError('');
    try {
      const doc = await readDocument(file, controller.signal, setProgress);
      if (task.current === controller) onChange([...documents, doc], false);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Lecture impossible.');
    } finally {
      if (task.current === controller) {
        task.current = null;
        setProgress('');
      }
    }
  }

  return <section className="jarvis-panel" aria-labelledby="jarvis-documents">
    <h3 id="jarvis-documents">Documents de la session</h3>
    <p className="jarvis-muted">Extraction sur cet appareil. PDF texte (30 pages) et TXT UTF-8. Limites de 3 fichiers, 5 Mio et 5 000 caractères par fichier. OCR PNG/JPEG indisponible.</p>
    <label htmlFor="jarvis-upload">Ajouter un fichier</label>
    <input id="jarvis-upload" type="file" accept=".pdf,.txt,.png,.jpg,.jpeg"
      disabled={Boolean(progress) || documents.length >= MAX_DOCUMENTS} onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void upload(file);
      }} />
    {progress && <div className="jarvis-row"><span role="status">{progress}</span>
      <button type="button" onClick={() => { task.current?.abort(); task.current = null; setProgress(''); }}>Annuler la lecture</button></div>}
    {error && <p role="alert" className="jarvis-error">{error}</p>}
    {documents.length === 0 && !progress && <p className="jarvis-muted">Aucun document chargé.</p>}
    {documents.map(doc => <div key={doc.id} className="jarvis-source">
      <strong>{doc.name}</strong>
      <label className="jarvis-check"><input type="checkbox" checked={doc.selected} disabled={Boolean(progress)}
        onChange={event => onChange(documents.map(item => item.id === doc.id
          ? { ...item, selected: event.target.checked } : item), true)} />Joindre à la conversation</label>
      {doc.warnings.map(warning => <p className="jarvis-error" key={warning}>{warning}</p>)}
      <details><summary>Voir le texte et ses références</summary>
        {doc.sources.map(source => {
          const excerpt = `${doc.name} · ${source.location}\n${source.text}`;
          return <div key={source.location}><strong>{source.location}</strong><pre>{source.text}</pre>
            {onPrepareExcerpt && excerpt.length <= 2000 && <button type="button"
              onClick={() => onPrepareExcerpt(excerpt)}>Préparer cet extrait pour la consultation</button>}
          </div>;
        })}
      </details>
      <button type="button" disabled={Boolean(progress)} onClick={() =>
        onChange(documents.filter(item => item.id !== doc.id), doc.selected)}>Retirer {doc.name}</button>
    </div>)}
  </section>;
}
