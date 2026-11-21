import { useEffect, useState, type FormEvent } from 'react';
import type { InventoryCategory, InventoryData, InventoryItem } from '../types/medical';
import { createId, getInventoryData, getPrescriptions, saveInventoryData, subscribeToMedicalData } from '../services/storage';
import { canDeleteInventoryItem } from '../services/inventoryDeletionGuard';

const emptyForm = {
  name: '',
  category: 'supply' as InventoryCategory,
  unit: 'unité',
  quantity: '0',
  minimumQuantity: '0',
  unitCost: '',
  batchNumber: '',
  expiryDate: '',
  location: '',
  notes: '',
};

export default function Inventory() {
  const [data, setData] = useState<InventoryData>(() => getInventoryData());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryDays = (date?: string) => {
    if (!date) return null;
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return null;
    return Math.ceil((Date.UTC(year, month - 1, day) - todayUtc) / 86400000);
  };

  useEffect(() => subscribeToMedicalData(() => setData(getInventoryData())), []);

  function persist(next: InventoryData) {
    if (!saveInventoryData(next)) {
      setMessage('Enregistrement non confirmé. Vérifiez l’espace de stockage avant de continuer.');
      return false;
    }
    setData(next);
    setMessage('Modification enregistrée.');
    return true;
  }

  function startEditing(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: String(item.quantity),
      minimumQuantity: String(item.minimumQuantity),
      unitCost: item.unitCost === undefined ? '' : String(item.unitCost),
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
      location: item.location || '',
      notes: item.notes || '',
    });
    setShowForm(true);
    setMessage('');
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    const quantity = Number(form.quantity);
    const minimumQuantity = Number(form.minimumQuantity);
    const unitCost = form.unitCost.trim() === '' ? undefined : Number(form.unitCost);
    if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0)) {
      setMessage('Le coût unitaire doit être un montant positif ou nul.');
      return;
    }
    if (!form.name.trim() || !form.unit.trim() || !Number.isFinite(quantity) || quantity < 0 ||
        !Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
      setMessage('Vérifiez le nom, l’unité et les quantités saisies.');
      return;
    }
    const current = data.items.find(item => item.id === editingId);
    if (!current) {
      setMessage('Article introuvable. Actualisez la page.');
      return;
    }
    const timestamp = new Date().toISOString();
    const delta = quantity - current.quantity;
    const updated: InventoryItem = {
      ...current,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim(),
      quantity,
      minimumQuantity,
      unitCost,
      batchNumber: form.batchNumber.trim() || undefined,
      expiryDate: form.expiryDate || undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      updatedAt: timestamp,
    };
    const movements = delta === 0 ? data.movements : [{
      id: createId(),
      itemId: current.id,
      itemName: updated.name,
      type: 'adjustment' as const,
      quantity: delta,
      date: timestamp,
      reason: delta > 0 ? 'Correction manuelle : augmentation du stock' : 'Correction manuelle : diminution du stock',
    }, ...data.movements];
    if (persist({
      items: data.items.map(item => item.id === editingId ? updated : item),
      movements,
    })) {
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    }
  }

  function deleteItem(item: InventoryItem) {
    if (!canDeleteInventoryItem(item.id, data.movements, getPrescriptions())) {
      setMessage('Suppression refusée : cet article est lié à une ordonnance ou à un mouvement de stock. Conservez-le pour garantir la traçabilité.');
      return;
    }
    if (!window.confirm(`Supprimer définitivement « ${item.name} » de l’inventaire ?`)) return;
    if (persist({ ...data, items: data.items.filter(entry => entry.id !== item.id) })) {
      if (editingId === item.id) {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(false);
      }
    }
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const minimumQuantity = Number(form.minimumQuantity);
    const unitCost = form.unitCost.trim() === '' ? undefined : Number(form.unitCost);
    if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0)) {
      setMessage('Le coût unitaire doit être un montant positif ou nul.');
      return;
    }
    if (!form.name.trim() || !form.unit.trim() || !Number.isFinite(quantity) || quantity < 0 ||
        !Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
      setMessage('Vérifiez le nom, l’unité et les quantités saisies.');
      return;
    }
    const timestamp = new Date().toISOString();
    const item: InventoryItem = {
      id: createId(),
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim(),
      quantity,
      minimumQuantity,
      unitCost,
      batchNumber: form.batchNumber.trim() || undefined,
      expiryDate: form.expiryDate || undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const movement = quantity > 0 ? [{
      id: createId(),
      itemId: item.id,
      itemName: item.name,
      type: 'receipt' as const,
      quantity,
      date: timestamp,
      reason: 'Stock initial',
    }] : [];
    if (persist({ items: [item, ...data.items], movements: [...movement, ...data.movements] })) {
      setForm(emptyForm);
      setShowForm(false);
    }
  }

  function clearMovementHistory() {
    if (data.movements.length === 0) {
      setMessage('L’historique est déjà vide.');
      return;
    }
    const confirmed = window.confirm(
      'Effacer définitivement tout l’historique des mouvements ? Les quantités actuelles de chaque article seront conservées. Cette action est irréversible.'
    );
    if (!confirmed) return;
    persist({ ...data, movements: [] });
  }

  function receiveStock(item: InventoryItem) {
    const raw = window.prompt(`Quantité à ajouter au stock de « ${item.name} » :`);
    if (raw === null) return;
    const quantity = Number(raw.replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage('Saisissez une quantité positive.');
      return;
    }
    const timestamp = new Date().toISOString();
    const next = {
      items: data.items.map((entry) => entry.id === item.id
        ? { ...entry, quantity: entry.quantity + quantity, updatedAt: timestamp }
        : entry),
      movements: [{
        id: createId(), itemId: item.id, itemName: item.name,
        type: 'receipt' as const, quantity, date: timestamp, reason: 'Réapprovisionnement',
      }, ...data.movements],
    };
    persist(next);
  }

  const lowStock = data.items.filter((item) => item.quantity <= item.minimumQuantity).length;
  const expiredCount = data.items.filter(item => {
    const days = expiryDays(item.expiryDate);
    return days !== null && days < 0;
  }).length;
  const expiringCount = data.items.filter(item => {
    const days = expiryDays(item.expiryDate);
    return days !== null && days >= 0 && days <= 90;
  }).length;
  const visibleItems = data.items.filter((item) => {
    const days = expiryDays(item.expiryDate);
    if (filter === 'low') return item.quantity <= item.minimumQuantity;
    if (filter === 'expired') return days !== null && days < 0;
    if (filter === 'expiring') return days !== null && days >= 0 && days <= 90;
    return filter === 'all' || item.category === filter;
  });
  const categoryLabel = (category: InventoryCategory) => ({
    supply: 'Consommable',
    equipment: 'Équipement',
    treatment: 'Traitement',
  })[category];

  // Regrouper visuellement les lots du même produit sans fusionner leurs stocks.
  const groupedLots = Array.from(data.items.reduce((groups, item) => {
    const key = `${item.name.trim().toLocaleLowerCase('fr') }|${item.category}|${item.unit.trim().toLocaleLowerCase('fr')}`;
    const group = groups.get(key) ?? {
      key,
      name: item.name,
      category: item.category,
      unit: item.unit,
      lots: [] as InventoryItem[],
    };
    group.lots.push(item);
    groups.set(key, group);
    return groups;
  }, new Map<string, { key: string; name: string; category: InventoryCategory; unit: string; lots: InventoryItem[] }>()).values())
    .map(group => ({
      ...group,
      totalQuantity: group.lots.reduce((sum, lot) => sum + lot.quantity, 0),
      sortedLots: [...group.lots].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <section className="inventory-page" style={{ display: 'grid', gap: 20, color: 'var(--text-primary,#20334b)' }}>
      <style>{`
        .inventory-page{color:var(--color-text)}
        .inventory-page h2,.inventory-page h3,.inventory-page strong{color:var(--color-text)}
        .inventory-page .inventory-panel{background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:grid;gap:14px}
        .inventory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .inventory-page .inventory-muted,.inventory-page .inventory-field label{font-size:13px;color:var(--color-text-secondary);font-weight:600}
        .inventory-field{display:grid;gap:6px}
        .inventory-field input,.inventory-field select,.inventory-field textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--color-border);border-radius:9px;background:var(--color-surface-secondary);color:var(--color-text);font:inherit}
        .inventory-field input::placeholder,.inventory-field textarea::placeholder{color:var(--color-text-secondary);opacity:.8}
        .inventory-button{border:0;border-radius:9px;padding:11px 15px;background:var(--color-mint);color:#12332f;font-weight:700;cursor:pointer}
        .inventory-secondary{border:1px solid var(--color-border);border-radius:9px;padding:10px 13px;background:var(--color-surface-secondary);color:var(--color-text);font-weight:600;cursor:pointer}
        .inventory-list{display:grid;gap:10px}
        .inventory-page .inventory-item{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid var(--color-border);border-radius:12px;padding:14px;background:var(--color-surface-secondary);color:var(--color-text)}
        .inventory-item p{margin:5px 0 0;color:var(--color-text-secondary);font-size:12px}
        .inventory-low{color:var(--color-warning);font-weight:700;font-size:12px}
        .inventory-page .inventory-panel h3{color:var(--color-text)}
        .inventory-page .inventory-panel > p{color:var(--color-text-secondary)}
        .inventory-page .inventory-history-meta{color:var(--color-text-secondary)}
        .inventory-page .inventory-stat-label{color:var(--color-text-secondary);font-size:13px}
        .inventory-alert{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:700;margin:6px 5px 0 0}
        .inventory-alert-expired{background:rgba(220,70,70,.14);color:#d94b4b}
        .inventory-alert-soon{background:rgba(220,155,35,.16);color:#bd7c13}
        .inventory-alert-low{background:rgba(220,155,35,.16);color:#bd7c13}
        .inventory-page .inventory-empty{color:var(--color-text-secondary);font-size:13px}
        .inventory-page .inventory-history-row{border-bottom:1px solid var(--color-border);padding:9px 0;font-size:13px}
        .inventory-page .inventory-filter-active{border-color:var(--color-mint-dark)!important;background:rgba(66,213,180,.12)}
        @media(max-width:650px){.inventory-grid{grid-template-columns:1fr}.inventory-item{align-items:flex-start;flex-direction:column}}
      `}</style>

      <header>
        <h2 style={{ margin: '0 0 6px', fontSize: 25, color: 'var(--color-text)' }}>Gestion de l’inventaire</h2>
        <p className="inventory-muted" style={{ margin: 0 }}>Suivi des consommables, équipements et traitements du cabinet.</p>
      </header>

      <div className="inventory-grid">
        <div className="inventory-panel"><span className="inventory-stat-label">Articles enregistrés</span><strong style={{ fontSize: 27 }}>{data.items.length}</strong></div>
        <div className="inventory-panel"><span className="inventory-stat-label">Stocks bas ou à réapprovisionner</span><strong style={{ fontSize: 27, color: lowStock ? '#c45c36' : 'inherit' }}>{lowStock}</strong></div>
        <div className="inventory-panel"><span className="inventory-stat-label">Articles périmés</span><strong style={{ fontSize: 27, color: expiredCount ? '#d94b4b' : 'inherit' }}>{expiredCount}</strong></div>
        <div className="inventory-panel"><span className="inventory-stat-label">Péremption dans les 90 jours</span><strong style={{ fontSize: 27, color: expiringCount ? '#bd7c13' : 'inherit' }}>{expiringCount}</strong></div>
      </div>

      <section className="inventory-panel">
        <div>
          <h3 style={{ margin: '0 0 5px' }}>Vue regroupée par produit</h3>
          <p className="inventory-muted" style={{ margin: 0 }}>Les quantités sont additionnées pour la vue d’ensemble, mais chaque lot reste indépendant pour la péremption et la délivrance.</p>
        </div>
        {groupedLots.length === 0 ? <p className="inventory-empty">Aucun produit enregistré.</p> : (
          <div className="inventory-list">
            {groupedLots.map(group => (
              <article className="inventory-item" key={group.key}>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <strong>{group.name}</strong>
                  <p>{categoryLabel(group.category)} · {group.lots.length} lot(s) · Stock total : {group.totalQuantity} {group.unit}</p>
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13 }}>Détail des lots</summary>
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {group.sortedLots.map((lot, index) => {
                        const days = expiryDays(lot.expiryDate);
                        return (
                          <div key={lot.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 7, fontSize: 12 }}>
                            <strong style={{ fontSize: 12 }}>Lot {lot.batchNumber || 'sans numéro'}</strong>
                            <span style={{ color: 'var(--color-text-secondary)' }}> · {lot.quantity} {lot.unit} · Péremption : {lot.expiryDate ? new Date(lot.expiryDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'non renseignée'}</span>
                            {days !== null && days < 0 && <span className="inventory-alert inventory-alert-expired">PÉRIMÉ</span>}
                            {days !== null && days >= 0 && days <= 90 && <span className="inventory-alert inventory-alert-soon">Expire dans {days} j</span>}
                            {index === 0 && lot.expiryDate && days !== null && days >= 0 && <span className="inventory-alert inventory-alert-low">Péremption la plus proche</span>}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="inventory-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Stock du cabinet</h3>
          <button className="inventory-button" type="button" onClick={() => { if (showForm) { setEditingId(null); setForm(emptyForm); } setShowForm(!showForm); setMessage(''); }}>{showForm ? 'Fermer' : '+ Ajouter un article'}</button>
        </div>

        {showForm && <form onSubmit={editingId ? saveEdit : addItem} style={{ display: 'grid', gap: 13 }}>
          <div className="inventory-grid">
            <div className="inventory-field"><label>Nom de l’article *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex. Gants nitrile, paracétamol..." /></div>
            <div className="inventory-field"><label>Catégorie</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as InventoryCategory })}><option value="supply">Consommable</option><option value="equipment">Équipement</option><option value="treatment">Traitement</option></select></div>
            <div className="inventory-field"><label>Unité</label><input required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="boîte, pièce, flacon..." /></div>
            <div className="inventory-field"><label>Quantité initiale</label><input type="number" min="0" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="inventory-field"><label>Seuil d’alerte</label><input type="number" min="0" step="any" value={form.minimumQuantity} onChange={e => setForm({ ...form, minimumQuantity: e.target.value })} /></div>
            <div className="inventory-field"><label>Coût d’achat unitaire (DT) · facultatif</label><input type="number" min="0" step="0.001" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} placeholder="Ex. 12,500" /></div>
            <div className="inventory-field"><label>Numéro de lot</label><input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} /></div>
            <div className="inventory-field"><label>Date de péremption</label><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
            <div className="inventory-field"><label>Emplacement</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Armoire, réserve..." /></div>
          </div>
          <div className="inventory-field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="inventory-button" type="submit">{editingId ? 'Enregistrer les modifications' : 'Enregistrer l’article'}</button>{editingId && <button className="inventory-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(false); }}>Annuler</button>}</div>
        </form>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'Tous'], ['supply', 'Consommables'], ['equipment', 'Équipements'], ['treatment', 'Traitements'], ['low', 'Stocks bas'], ['expired', 'Périmés'], ['expiring', 'Péremption ≤ 90 j']].map(([value, label]) =>
            <button key={value} type="button" className={`inventory-secondary ${filter === value ? 'inventory-filter-active' : ''}`} onClick={() => setFilter(value)}>{label}</button>
          )}
        </div>

        <div className="inventory-list">
          {visibleItems.length === 0 && <p className="inventory-empty">Aucun article dans cette catégorie pour le moment.</p>}
          {visibleItems.map(item => {
            const isLow = item.quantity <= item.minimumQuantity;
            const daysLeft = expiryDays(item.expiryDate);
            return <article className="inventory-item" key={item.id}>
              <div style={{ minWidth: 0 }}>
                <strong>{item.name}</strong>
                <p>{categoryLabel(item.category)} · {item.quantity} {item.unit} · Seuil : {item.minimumQuantity} {item.unit}</p>
                <p>{item.unitCost !== undefined ? `Coût unitaire : ${item.unitCost.toFixed(3)} DT · ` : ''}{item.batchNumber ? `Lot : ${item.batchNumber} · ` : ''}{item.expiryDate ? `Péremption : ${new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('fr-FR')}` : 'Péremption non renseignée'}{item.location ? ` · ${item.location}` : ''}</p>
                {isLow && <span className="inventory-alert inventory-alert-low">Stock bas · réapprovisionnement</span>}
                {daysLeft !== null && daysLeft < 0 && <span className="inventory-alert inventory-alert-expired">PÉRIMÉ depuis {Math.abs(daysLeft)} j · ne pas délivrer</span>}
                {daysLeft !== null && daysLeft >= 0 && daysLeft <= 90 && <span className="inventory-alert inventory-alert-soon">Péremption dans {daysLeft} j</span>}
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button className="inventory-secondary" type="button" onClick={() => receiveStock(item)}>+ Ajouter au stock</button>
                <button className="inventory-secondary" type="button" onClick={() => startEditing(item)}>Modifier</button>
                <button className="inventory-secondary" type="button" onClick={() => deleteItem(item)}>Supprimer</button>
              </div>
            </article>;
          })}
        </div>
      </section>

      <section className="inventory-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Historique des mouvements</h3>
          {data.movements.length > 0 && <button className="inventory-secondary" type="button" onClick={clearMovementHistory}>Effacer l’historique</button>}
        </div>
        {data.movements.length === 0 ? <p className="inventory-empty">Aucun mouvement enregistré.</p> : data.movements.slice(0, 30).map(movement =>
          <div key={movement.id} className="inventory-history-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span><strong>{movement.itemName}</strong><br /><span className="inventory-history-meta">{movement.reason || movement.type} · {new Date(movement.date).toLocaleString('fr-FR')}</span></span>
            <strong style={{ whiteSpace: 'nowrap' }}>{movement.type === 'dispense' || (movement.type === 'adjustment' && movement.quantity < 0) ? '−' : '+'}{Math.abs(movement.quantity)}</strong>
          </div>
        )}
      </section>
      {message && <p role="status" style={{ margin: 0, fontSize: 13 }}>{message}</p>}
      <p className="inventory-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>Les alertes de péremption sont calculées à partir de la date renseignée : périmé si la date est passée, bientôt périmé si elle arrive dans les 90 jours. En présence de lots différents, enregistrez un article distinct par lot ; la vue regroupée additionne les quantités sans mélanger les dates de péremption. Les données restent stockées localement dans ce navigateur. Ne pas y enregistrer de données patient réelles avant la mise en place d’un stockage sécurisé et conforme.</p>
    </section>
  );
}
