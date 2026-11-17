import { useEffect, useMemo, useState } from 'react';
import { getInventoryData, getPatients, getConsultations, getPrescriptions } from '../services/storage';
import { countUnlinkedClinicalRecords } from '../services/recordIntegrity';
import { summarizeFollowUps, countUndatedPlannedFollowUps, countLaterPlannedFollowUps } from '../clinical/followUp';
import { summarizeRecordedActivity, type ClinicalActivitySummary } from '../clinical/activityStats';
import type { InventoryData } from '../types/medical';
import { WelcomeBanner, MobileDashboardNavigation, OverviewKpi, AgendaPanel, RecentConsultationsPanel, HeliosPanel, ActivityChartPanel, FollowUpPanel, DataIntegrityNotice, ClinicalActivityPanel, LatestVitalsPanel, InventoryPanel, QuickPathways, type DashboardPage } from '../components/dashboard/DashboardPanels';

type DashboardProps = {
  patientCount: number;
  consultationCount: number;
  onStartConsultation: () => void;
  onOpenCopilot: () => void;
  onOpenPatients: () => void;
  onNavigate: (page: DashboardPage) => void;
};

type PatientRecord = {
  id: string;
  name: string;
  status?: string;
};

export type ConsultationRecord = {
  id: string;
  date: string;
  patient: string;
  motif: string;
  diagnosis?: string;
  vitals?: {
    systolic?: string;
    diastolic?: string;
    heartRate?: string;
    spo2?: string;
    temperature?: string;
    respiratoryRate?: string;
    weight?: string;
    glycemia?: string;
  };
};

type PrescriptionRecord = { id: string; date?: string };

export type DashboardData = {
  patients: PatientRecord[];
  consultations: ConsultationRecord[];
  prescriptions: PrescriptionRecord[];
  unlinkedConsultations: number;
  unlinkedPrescriptions: number;
  followUpConsultations: ReturnType<typeof summarizeFollowUps>;
  undatedPlannedFollowUps: number;
  laterPlannedFollowUps: number;
  clinicalActivity: ClinicalActivitySummary;
};

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function loadDashboardData(patientFallback: number, consultationFallback: number): DashboardData {
  const patients = readArray<PatientRecord>('medifollow-patients');
  const consultations = readArray<ConsultationRecord>('medifollow-consultations');
  const prescriptions = readArray<PrescriptionRecord>('medifollow-prescriptions');
  // Use the same legacy-linkage rules as the patient services, not raw names.
  const clinicalPatients = getPatients();
  const clinicalConsultations = getConsultations();
  const unlinked = countUnlinkedClinicalRecords(clinicalPatients, clinicalConsultations, getPrescriptions());
  return {
    unlinkedConsultations: unlinked.consultations,
    unlinkedPrescriptions: unlinked.prescriptions,
    followUpConsultations: summarizeFollowUps(clinicalConsultations, new Date().toLocaleDateString('sv-SE')),
    undatedPlannedFollowUps: countUndatedPlannedFollowUps(clinicalConsultations),
    laterPlannedFollowUps: countLaterPlannedFollowUps(clinicalConsultations, new Date().toLocaleDateString('sv-SE')),
    clinicalActivity: summarizeRecordedActivity(clinicalPatients, clinicalConsultations),
    patients: patients.length ? patients : Array.from({ length: patientFallback }, (_, i) => ({ id: String(i), name: '' })),
    consultations: consultations.length ? consultations : Array.from({ length: consultationFallback }, (_, i) => ({ id: String(i), date: '', patient: '', motif: '' })),
    prescriptions,
  };
}

export default function Dashboard({ patientCount, consultationCount, onStartConsultation, onOpenCopilot, onOpenPatients, onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData>(() => loadDashboardData(patientCount, consultationCount));
  const [inventory, setInventory] = useState<InventoryData>(() => getInventoryData());

  useEffect(() => {
    const refresh = () => {
      setData(loadDashboardData(patientCount, consultationCount));
      setInventory(getInventoryData());
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('medifollow:data-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('medifollow:data-updated', refresh);
    };
  }, [patientCount, consultationCount]);

  const now = new Date();
  const todayKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const inventoryLow = inventory.items.filter(item => item.quantity <= item.minimumQuantity);
  const inventoryExpired = inventory.items.filter(item => Boolean(item.expiryDate && item.expiryDate < todayKey));
  const inventoryExpiring = inventory.items.filter(item => {
    if (!item.expiryDate || item.expiryDate < todayKey) return false;
    const days = Math.ceil((Date.UTC(Number(item.expiryDate.slice(0, 4)), Number(item.expiryDate.slice(5, 7)) - 1, Number(item.expiryDate.slice(8, 10))) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    return days <= 90;
  });
  const inventoryValuedItems = inventory.items.filter(item => typeof item.unitCost === 'number' && Number.isFinite(item.unitCost) && item.unitCost >= 0);
  const inventoryEstimatedValue = inventoryValuedItems.reduce((sum, item) => sum + item.quantity * (item.unitCost || 0), 0);
  const inventoryValueIncomplete = inventoryValuedItems.length < inventory.items.length;
  const recentStockMovements = inventory.movements.slice(0, 5);
  const currentMonth = data.consultations.filter(item => {
    if (!item.date) return false;
    const date = new Date(item.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const followUpCount = data.patients.filter(item => /suivi|actif|en cours/i.test(item.status || '')).length;
  const validConsultations = data.consultations.filter(item => item.date && item.patient)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentConsultations = validConsultations.slice(0, 4);
  const latestVitals = validConsultations.find(item => item.vitals)?.vitals || {};

  const monthlyActivity = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      label: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      count: data.consultations.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
      }).length,
    };
  }), [data.consultations]);

  const maxActivity = Math.max(1, ...monthlyActivity.map(item => item.count));
  const chartPoints = monthlyActivity.map((item, index) => ({
    ...item, x: 28 + index * 92, y: 122 - (item.count / maxActivity) * 88,
  }));
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const indicators = [
    { label: 'Tension artérielle', value: latestVitals.systolic && latestVitals.diastolic ? `${latestVitals.systolic}/${latestVitals.diastolic}` : '—', unit: 'mmHg', icon: '♥', tone: 'blue' },
    { label: 'Fréquence cardiaque', value: latestVitals.heartRate || '—', unit: 'bpm', icon: '⌁', tone: 'teal' },
    { label: 'Saturation SpO₂', value: latestVitals.spo2 || '—', unit: '%', icon: '◉', tone: 'violet' },
    { label: 'Température', value: latestVitals.temperature || '—', unit: '°C', icon: '♨', tone: 'amber' },
  ];

  return (
    <section className="warm-dashboard" data-dashboard-layout="warm-003" aria-label="Tableau de bord du cabinet">
      <MobileDashboardNavigation onNavigate={onNavigate} />
      <WelcomeBanner date={now} onStartConsultation={onStartConsultation} onOpenPatients={onOpenPatients} />
      <section className="wd-kpis" aria-label="Indicateurs du cabinet">
        <OverviewKpi label="Patients inscrits" value={data.patients.length} note="Dossiers patients" tone="sage" icon="patients" />
        <OverviewKpi label="Consultations ce mois" value={currentMonth} note={monthName} tone="peach" icon="consultation" />
        <OverviewKpi label="Ordonnances émises" value={data.prescriptions.length} note="Historique enregistré" tone="rose" icon="prescription" />
        <OverviewKpi label="Suivi des patients" value={followUpCount} note="Dossiers actifs ou en suivi" tone="cream" icon="follow-up" />
        <OverviewKpi label="Contrôles en retard" href="#dashboard-follow-up" value={data.followUpConsultations.overdue} note="Dates de contrôle valides" tone="rose" icon="overdue" />
      </section>
      <DataIntegrityNotice data={data} />
      <section className="wd-operational-grid" aria-label="Agenda, consultations récentes et HELIOS">
        <AgendaPanel />
        <RecentConsultationsPanel recentConsultations={recentConsultations} />
        <HeliosPanel onOpenCopilot={onOpenCopilot} />
      </section>
      <section className="wd-follow-grid" aria-label="Activité du cabinet et échéances de suivi">
        <ActivityChartPanel chartPoints={chartPoints} />
        <FollowUpPanel data={data} onStartConsultation={onStartConsultation} />
      </section>
      <section className="wd-detail-grid" aria-label="Informations cliniques et gestion du cabinet">
        <ClinicalActivityPanel data={data} />
        <LatestVitalsPanel indicators={indicators} />
        <InventoryPanel inventory={inventory} inventoryLow={inventoryLow} inventoryExpired={inventoryExpired} inventoryExpiring={inventoryExpiring} inventoryEstimatedValue={inventoryEstimatedValue} inventoryValueIncomplete={inventoryValueIncomplete} recentStockMovements={recentStockMovements} />
      </section>
      <QuickPathways onStartConsultation={onStartConsultation} onOpenPatients={onOpenPatients} onOpenCopilot={onOpenCopilot} onNavigate={onNavigate} />
      <footer className="wd-footer"><span>Sécurité &amp; confidentialité</span><strong>MediFollow AI</strong><span>Ensemble pour votre santé</span></footer>
    </section>
  );
}
