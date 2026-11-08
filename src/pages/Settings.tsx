
import { useState, type ChangeEvent } from 'react';
import { useMedicalData } from '../hooks/useMedicalData';
import {
  getMedicalData,
  savePatients,
  saveConsultations,
  savePrescriptions,
  saveSettings as saveStoredSettings,
  saveDeletedPatients,
} from '../services/storage';

type SettingsProps = {
  themePreference: string;
  onThemeChange: (value: string) => void;
};

export default function Settings({
  themePreference,
  onThemeChange,
}: SettingsProps) {
  const { settings, updateSettings } = useMedicalData();
  const [doctorName, setDoctorName] = useState(settings.doctorName);
  const [specialty, setSpecialty] = useState(settings.specialty);
  const [cabinetName, setCabinetName] = useState(settings.cabinetName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [copilotEnabled, setCopilotEnabled] = useState(settings.copilotEnabled);
  const [confirmBeforePrescription, setConfirmBeforePrescription] =
    useState(settings.confirmBeforePrescription);
  const [message, setMessage] = useState('');

  function exportBackup() {
    const backup = {
      application: 'MediFollow AI',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      data: getMedicalData(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `medifollow-sauvegarde-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('Sauvegarde téléchargée. Conservez ce fichier dans un endroit sûr.');
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const backupData = parsed?.data;

      const isRecord = (value: unknown) =>
        typeof value === 'object' && value !== null && !Array.isArray(value);

      if (
        parsed?.application !== 'MediFollow AI' ||
        parsed?.formatVersion !== 1 ||
        !isRecord(backupData) ||
        !Array.isArray(backupData.patients) ||
        !Array.isArray(backupData.consultations) ||
        !Array.isArray(backupData.prescriptions) ||
        (backupData.deletedPatients !== undefined && !Array.isArray(backupData.deletedPatients)) ||
        !isRecord(backupData.settings)
      ) {
        setMessage('Fichier refusé : sauvegarde MediFollow AI invalide ou incompatible.');
        return;
      }

      if (!window.confirm(
        'La restauration va remplacer les patients, consultations, ordonnances et paramètres actuellement enregistrés sur cet appareil. Voulez-vous continuer ?'
      )) {
        setMessage('Restauration annulée. Aucune donnée n’a été modifiée.');
        return;
      }

      const previous = getMedicalData();
      const restored =
        savePatients(backupData.patients) &&
        saveConsultations(backupData.consultations) &&
        savePrescriptions(backupData.prescriptions) &&
        saveDeletedPatients(backupData.deletedPatients ?? []) &&
        saveStoredSettings(backupData.settings);

      if (!restored) {
        savePatients(previous.patients);
        saveConsultations(previous.consultations);
        savePrescriptions(previous.prescriptions);
        saveDeletedPatients(previous.deletedPatients ?? []);
        saveStoredSettings(previous.settings);
        setMessage('Échec de la restauration. Les données précédentes ont été rétablies si le navigateur l’a permis.');
        return;
      }

      const restoredSettings = backupData.settings;
      setDoctorName(String(restoredSettings.doctorName ?? ''));
      setSpecialty(String(restoredSettings.specialty ?? ''));
      setCabinetName(String(restoredSettings.cabinetName ?? ''));
      setAddress(String(restoredSettings.address ?? ''));
      setPhone(String(restoredSettings.phone ?? ''));
      setEmail(String(restoredSettings.email ?? ''));
      setCopilotEnabled(restoredSettings.copilotEnabled !== false);
      setConfirmBeforePrescription(restoredSettings.confirmBeforePrescription !== false);
      if (['auto', 'light', 'dark'].includes(restoredSettings.themePreference)) {
        onThemeChange(restoredSettings.themePreference);
      }
      setMessage(
        `Restauration réussie : ${backupData.patients.length} patient(s), ${backupData.consultations.length} consultation(s) et ${backupData.prescriptions.length} ordonnance(s).`
      );
    } catch {
      setMessage('Impossible de lire ce fichier. Vérifiez qu’il s’agit d’une sauvegarde JSON valide.');
    }
  }

  function saveSettings() {
    updateSettings({
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
      cabinetName: cabinetName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      copilotEnabled,
      confirmBeforePrescription,
      themePreference: themePreference as 'auto' | 'light' | 'dark',
    });
    setMessage('Paramètres enregistrés sur cet appareil.');
  }

  return (
    <section className="settings-page">
      <style>{`
        .settings-page {
          display:grid;
          gap:22px;
          color:var(--text-primary,#20334b);
        }
        .settings-header h2 {
          margin:0 0 6px;
          font-size:25px;
        }
        .settings-header p {
          margin:0;
          color:#81909c;
        }
        .settings-section {
          display:grid;
          gap:17px;
          padding:21px;
          border:1px solid var(--border,#e5ebef);
          border-radius:16px;
          background:var(--surface,#fff);
        }
        .settings-section h3 {
          margin:0;
          font-size:17px;
        }
        .settings-description {
          margin:-9px 0 0;
          color:#81909c;
          font-size:13px;
          line-height:1.5;
        }
        .settings-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:14px;
        }
        .settings-field {
          display:grid;
          gap:7px;
          min-width:0;
        }
        .settings-field label {
          font-size:13px;
          font-weight:600;
          color:#718096;
        }
        .settings-field input,
        .settings-field select {
          width:100%;
          box-sizing:border-box;
          padding:12px;
          border:1px solid var(--border,#dce4e8);
          border-radius:10px;
          background:var(--surface,#fff);
          color:inherit;
          font:inherit;
        }
        .settings-theme-options {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
        }
        .settings-theme {
          border:1px solid var(--border,#dce4e8);
          border-radius:12px;
          padding:14px 8px;
          background:var(--surface,#fff);
          color:inherit;
          cursor:pointer;
          font-weight:600;
        }
        .settings-theme.active {
          border:2px solid #42d5b4;
          background:#e9faf5;
          color:#176b59;
        }
        .settings-toggle {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          padding:13px 0;
          border-bottom:1px solid var(--border,#e5ebef);
        }
        .settings-toggle:last-child {
          border-bottom:0;
        }
        .settings-toggle strong {
          display:block;
          font-size:14px;
          margin-bottom:4px;
        }
        .settings-toggle span {
          color:#81909c;
          font-size:12px;
          line-height:1.5;
        }
        .settings-toggle input {
          width:20px;
          height:20px;
          accent-color:#28b99b;
          flex-shrink:0;
        }
        .settings-save {
          border:0;
          border-radius:11px;
          padding:14px 20px;
          background:#42d5b4;
          color:#12332f;
          font-weight:700;
          cursor:pointer;
        }
        .settings-message {
          padding:13px;
          border-radius:10px;
          background:#e2f8f1;
          color:#21866e;
          font-size:13px;
          line-height:1.5;
        }
        .settings-backup-actions {
          display:flex;
          flex-wrap:wrap;
          gap:10px;
        }
        .settings-backup-button {
          border:1px solid #42bfa4;
          border-radius:11px;
          padding:13px 18px;
          background:var(--surface,#fff);
          color:var(--text-primary,#20334b);
          font-weight:700;
          cursor:pointer;
        }
        .settings-note {
          color:#81909c;
          font-size:12px;
          line-height:1.6;
        }
        @media(max-width:600px) {
          .settings-grid { grid-template-columns:1fr; }
          .settings-section { padding:16px; }
          .settings-theme-options { gap:6px; }
          .settings-theme { font-size:12px; padding:12px 5px; }
        }
      `}</style>

      <header className="settings-header">
        <h2>Paramètres</h2>
        <p>Configuration de votre espace MediFollow AI.</p>
      </header>

      <div className="settings-section">
        <h3>01 · Profil du médecin</h3>
        <p className="settings-description">
          Informations professionnelles du praticien.
        </p>

        <div className="settings-grid">
          <div className="settings-field">
            <label>Nom du médecin</label>
            <input
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          <div className="settings-field">
            <label>Spécialité</label>
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>02 · Informations du cabinet</h3>
        <p className="settings-description">
          Coordonnées professionnelles à utiliser dans les futurs documents.
        </p>

        <div className="settings-grid">
          <div className="settings-field">
            <label>Nom du cabinet</label>
            <input
              value={cabinetName}
              onChange={(e) => setCabinetName(e.target.value)}
            />
          </div>

          <div className="settings-field">
            <label>Adresse</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse du cabinet"
            />
          </div>

          <div className="settings-field">
            <label>Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Numéro professionnel"
            />
          </div>

          <div className="settings-field">
            <label>Email professionnel</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>03 · Apparence de l'interface</h3>
        <p className="settings-description">
          Choisissez le thème de MediFollow AI.
        </p>

        <div className="settings-theme-options">
          {[
            { value: 'auto', label: 'Automatique' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ].map((theme) => (
            <button
              key={theme.value}
              className={`settings-theme ${
                themePreference === theme.value ? 'active' : ''
              }`}
              onClick={() => onThemeChange(theme.value)}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>04 · Préférences du copilote IA</h3>
        <p className="settings-description">
          Contrôlez les fonctionnalités d'assistance médicale.
        </p>

        <div className="settings-toggle">
          <div>
            <strong>Activer le copilote IA</strong>
            <span>Autoriser l'accès à l'assistant depuis l'interface.</span>
          </div>
          <input
            type="checkbox"
            checked={copilotEnabled}
            onChange={(e) => setCopilotEnabled(e.target.checked)}
          />
        </div>

        <div className="settings-toggle">
          <div>
            <strong>Confirmation avant prescription</strong>
            <span>Maintenir une validation médicale avant toute prescription.</span>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforePrescription}
            onChange={(e) =>
              setConfirmBeforePrescription(e.target.checked)
            }
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>05 · Sauvegarde des données</h3>
        <p className="settings-description">
          Exportez les patients actifs, la corbeille, les consultations, ordonnances et paramètres dans un fichier de sauvegarde JSON.
        </p>
        <div className="settings-backup-actions">
          <button className="settings-backup-button" onClick={exportBackup}>
            Télécharger une sauvegarde complète
          </button>
          <label className="settings-backup-button">
            Restaurer une sauvegarde
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => void importBackup(event)}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        <p className="settings-note">
          Faites régulièrement une sauvegarde et conservez-la dans un emplacement sûr. Ce fichier contient des données potentiellement sensibles.
        </p>
      </div>

      <button className="settings-save" onClick={saveSettings}>
        Enregistrer les paramètres
      </button>

      {message && <div className="settings-message">{message}</div>}

      <p className="settings-note">
        Les paramètres du profil, du cabinet et du copilote sont enregistrés dans le stockage local de ce navigateur.
      </p>
    </section>
  );
}

