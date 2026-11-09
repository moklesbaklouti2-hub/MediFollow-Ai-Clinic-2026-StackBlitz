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
        .inventory-panel{background:var(--surface,#fff);border:1px solid var(--border,#e5ebef);border-radius:16px;padding:18px;display:grid;gap:14px}
        .inventory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .inventory-field{display:grid;gap:6px}.inventory-field label{font-size:13px;color:#81909c;font-weight:600}
        .inventory-field input,.inventory-field select,.inventory-field textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--border,#dce4e8);border-radius:9px;background:var(--surface,#fff);color:inherit;font:inherit}
        .inventory-button{border:0;border-radius:9px;padding:11px 15px;background:#42d5b4;color:#12332f;font-weight:700;cursor:pointer}
        .inventory-secondary{border:1px solid var(--border,#dce4e8);border-radius:9px;padding:10px 13px;background:transparent;color:inherit;font-weight:600;cursor:pointer}
        .inventory-list{display:grid;gap:10px}.inventory-item{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid var(--border,#e5ebef);border-radius:12px;padding:14px}
        .inventory-item p{margin:5px 0 0;color:#81909c;font-size:12px}.inventory-low{color:#c45c36;font-weight:700;font-size:12px}
        @media(max-width:650px){.inventory-grid{grid-template-columns:1fr}.inventory-item{align-items:flex-start;flex-direction:column}}
      `}</style>

      <header>
        <h2 style={{ margin: '0 0 6px', fontSize: 25 }}>Gestion de l’inventaire</h2>
        <p style={{ margin: 0, color: '#81909c' }}>Suivi des consommables, équipements et traitements du cabinet.</p>
      </header>

      <div className="inventory-grid">
        <div className="inventory-panel"><span style={{ color: '#81909c', fontSize: 13 }}>Articles enregistrés</span><strong style={{ fontSize: 27 }}>{data.items.length}</strong></div>
        <div className="inventory-panel"><span style={{ color: '#81909c', fontSize: 13 }}>Stocks bas ou à réapprovisionner</span><strong style={{ fontSize: 27, color: lowStock ? '#c45c36' : 'inherit' }}>{lowStock}</strong></div>
      </div>

      <section className="inventory-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Stock du cabinet</h3>
          <button className="inventory-button" type="button" onClick={() => { setShowForm(!showForm); setMessage(''); }}>{showForm ? 'Fermer' : '+ Ajouter un article'}</button>
        </div>

        {showForm && <form onSubmit={addItem} style={{ display: 'grid', gap: 13 }}>
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
          <div><button className="inventory-button" type="submit">Enregistrer l’article</button></div>
        </form>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'Tous'], ['supply', 'Consommables'], ['equipment', 'Équipements'], ['treatment', 'Traitements']].map(([value, label]) =>
            <button key={value} type="button" className="inventory-secondary" onClick={() => setFilter(value)} style={{ borderColor: filter === value ? '#42b99d' : undefined }}>{label}</button>
          )}
        </div>

        <div className="inventory-list">
          {visibleItems.length === 0 && <p style={{ color: '#81909c', fontSize: 13 }}>Aucun article dans cette catégorie pour le moment.</p>}
          {visibleItems.map(item => {
            const isLow = item.quantity <= item.minimumQuantity;
            return <article className="inventory-item" key={item.id}>
              <div style={{ minWidth: 0 }}>
                <strong>{item.name}</strong>
                <p>{categoryLabel(item.category)} · {item.quantity} {item.unit} · Seuil : {item.minimumQuantity} {item.unit}</p>
                <p>{item.batchNumber ? `Lot : ${item.batchNumber} · ` : ''}{item.expiryDate ? `Péremption : ${new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('fr-FR')}` : 'Péremption non renseignée'}{item.location ? ` · ${item.location}` : ''}</p>
                {isLow && <span className="inventory-low">Stock bas</span>}
              </div>
              <button className="inventory-secondary" type="button" onClick={() => receiveStock(item)}>+ Ajouter au stock</button>
            </article>;
          })}
        </div>
      </section>

      <section className="inventory-panel">
        <h3 style={{ margin: 0 }}>Historique des mouvements</h3>
        {data.movements.length === 0 ? <p style={{ color: '#81909c', fontSize: 13 }}>Aucun mouvement enregistré.</p> : data.movements.slice(0, 30).map(movement =>
          <div key={movement.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border,#e5ebef)', padding: '9px 0', fontSize: 13 }}>
            <span><strong>{movement.itemName}</strong><br /><span style={{ color: '#81909c' }}>{movement.reason || movement.type} · {new Date(movement.date).toLocaleString('fr-FR')}</span></span>
            <strong style={{ whiteSpace: 'nowrap' }}>{movement.type === 'dispense' ? '−' : '+'}{movement.quantity}</strong>
          </div>
        )}
      </section>
      {message && <p role="status" style={{ margin: 0, fontSize: 13 }}>{message}</p>}
      <p style={{ margin: 0, color: '#81909c', fontSize: 12, lineHeight: 1.5 }}>Version initiale : les données restent stockées localement dans ce navigateur. Ne pas y enregistrer de données patient réelles avant la mise en place d’un stockage sécurisé et conforme.</p>
    </section>
  );
}
