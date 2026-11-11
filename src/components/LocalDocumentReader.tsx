import { useState } from 'react';
import { MAX_LOCAL_DOCUMENT_CHARS, previewLocalDocument } from '../clinical/documentReader';

// Mount with a patient-specific React key. The draft remains only in component
// state and disappears when the patient detail is closed or the key changes.
export default function LocalDocumentReader() {
  const [rawText, setRawText] = useState('');
  const preview = previewLocalDocument(rawText);

  return (
    <section aria-label="HELIOS Document Reader — aperçu texte local">
      <h3 className="patient-section-title">HELIOS Document Reader · aperçu texte local</h3>
      <p className="patient-empty-history">
        Collez exclusivement du texte fictif pour vérifier sa lisibilité.
        Aucune interprétation médicale, extraction PDF/OCR, sauvegarde,
        association au dossier ou transmission à une IA n'est effectuée.
      </p>
      <label htmlFor="helios-local-document-text" className="patient-empty-history">
        Texte du document fictif (limite {MAX_LOCAL_DOCUMENT_CHARS} caractères)
      </label>
      <textarea
        id="helios-local-document-text"
        value={rawText}
        onChange={(event) => setRawText(event.target.value.slice(0, MAX_LOCAL_DOCUMENT_CHARS))}
        maxLength={MAX_LOCAL_DOCUMENT_CHARS}
        rows={5}
        placeholder="Collez ici un document fictif, jamais des informations réelles de patient."
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 12,
          borderRadius: 11, border: '1px solid var(--border,#e5ebef)',
          background: 'var(--surface,#fff)', color: 'inherit', font: 'inherit' }}
      />
      <p className="patient-empty-history" role="status">
        {preview.characterCount} caractère(s) · {preview.lineCount} ligne(s) · {preview.wordCount} mot(s).
      </p>
      {preview.hasContent ? (
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          border: '1px solid var(--border,#e5ebef)', borderRadius: 11,
          padding: 12, margin: 0, font: 'inherit' }}>{preview.text}</pre>
      ) : <p className="patient-empty-history">Aucun texte fictif à prévisualiser.</p>}
      {rawText && (
        <button type="button" className="patient-view" onClick={() => setRawText('')}>
          Effacer le texte temporaire
        </button>
      )}
      <p className="patient-empty-history">
        L'aperçu est strictement temporaire et reste dans ce composant ;
        le médecin doit contrôler tout document avant usage clinique.
      </p>
    </section>
  );
}
