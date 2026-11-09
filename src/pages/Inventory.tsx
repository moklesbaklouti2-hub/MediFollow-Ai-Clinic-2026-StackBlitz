import { useEffect, useState, type FormEvent } from 'react';
import type { InventoryCategory, InventoryData, InventoryItem } from '../types/medical';
import { createId, getInventoryData, saveInventoryData, subscribeToMedicalData } from '../services/storage';

const emptyForm = {
  name: '',
  category: 'supply' as InventoryCategory,
  unit: 'unité',
  quantity: '0',
  minimumQuantity: '0',
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
    const hasHistory = data.movements.some(movement => movement.itemId === item.id);
    const warning = hasHistory
      ? `Supprimer « ${item.name} » de l’inventaire ? Son historique de mouvements sera conservé, mais l’article ne sera plus disponible pour les prochaines délivrances.`
      : `Supprimer définitivement « ${item.name} » de l’inventaire ?`;
    if (!window.confirm(warning)) return;
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

  const visibleItems = data.items.filter((item) =>
    filter === 'all' || item.category === filter
  );
  const lowStock = data.items.filter((item) => item.quantity <= item.minimumQuantity).length;
  const categoryLabel = (category: InventoryCategory) => ({
    supply: 'Consommable',
    equipment: 'Équipement',
    treatment: 'Traitement',
  })[category];

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
      </div>

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
            <div className="inventory-field"><label>Numéro de lot</label><input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} /></div>
            <div className="inventory-field"><label>Date de péremption</label><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
            <div className="inventory-field"><label>Emplacement</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Armoire, réserve..." /></div>
          </div>
          <div className="inventory-field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="inventory-button" type="submit">{editingId ? 'Enregistrer les modifications' : 'Enregistrer l’article'}</button>{editingId && <button className="inventory-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(false); }}>Annuler</button>}</div>
        </form>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'Tous'], ['supply', 'Consommables'], ['equipment', 'Équipements'], ['treatment', 'Traitements']].map(([value, label]) =>
            <button key={value} type="button" className={`inventory-secondary ${filter === value ? 'inventory-filter-active' : ''}`} onClick={() => setFilter(value)}>{label}</button>
          )}
        </div>

        <div className="inventory-list">
          {visibleItems.length === 0 && <p className="inventory-empty">Aucun article dans cette catégorie pour le moment.</p>}
          {visibleItems.map(item => {
            const isLow = item.quantity <= item.minimumQuantity;
            return <article className="inventory-item" key={item.id}>
              <div style={{ minWidth: 0 }}>
                <strong>{item.name}</strong>
                <p>{categoryLabel(item.category)} · {item.quantity} {item.unit} · Seuil : {item.minimumQuantity} {item.unit}</p>
                <p>{item.batchNumber ? `Lot : ${item.batchNumber} · ` : ''}{item.expiryDate ? `Péremption : ${new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('fr-FR')}` : 'Péremption non renseignée'}{item.location ? ` · ${item.location}` : ''}</p>
                {isLow && <span className="inventory-low">Stock bas</span>}
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
      <p className="inventory-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>Version initiale : les données restent stockées localement dans ce navigateur. Ne pas y enregistrer de données patient réelles avant la mise en place d’un stockage sécurisé et conforme.</p>
    </section>
  );
}
