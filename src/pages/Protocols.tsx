
import { useMemo, useState } from 'react';

const protocols = [
  {
    title: 'Hypertension artérielle',
    category: 'Cardiologie',
    description: 'Évaluation initiale, mesure de la pression artérielle et suivi.',
    tags: ['HTA', 'Tension', 'Cardiovasculaire'],
  },
  {
    title: 'Diabète de type 2',
    category: 'Endocrinologie',
    description: 'Dépistage, bilan initial et suivi du patient diabétique.',
    tags: ['Diabète', 'Glycémie', 'HbA1c'],
  },
  {
    title: 'Infection respiratoire aiguë',
    category: 'Pneumologie',
    description: 'Évaluation clinique et recherche des signes de gravité.',
    tags: ['Respiratoire', 'Infection', 'Fièvre'],
  },
  {
    title: 'Suivi de grossesse',
    category: 'Gynécologie',
    description: 'Organisation du suivi prénatal et surveillance materno-fœtale.',
    tags: ['Grossesse', 'Prénatal', 'Obstétrique'],
  },
  {
    title: 'Évaluation de la personne âgée',
    category: 'Gériatrie',
    description: 'Évaluation globale, autonomie, nutrition et risque de chute.',
    tags: ['Gériatrie', 'Autonomie', 'Fragilité'],
  },
  {
    title: 'Douleur aiguë',
    category: 'Urgences',
    description: 'Évaluation de la douleur, recherche de signes d’alerte et réévaluation.',
    tags: ['Douleur', 'Évaluation', 'Urgences'],
  },
];

const categories = [
  'Toutes',
  'Cardiologie',
  'Endocrinologie',
  'Pneumologie',
  'Gynécologie',
  'Gériatrie',
  'Urgences',
];

export default function Protocols() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return protocols.filter((protocol) => {
      const matchesCategory =
        category === 'Toutes' || protocol.category === category;

      const text = (
        protocol.title +
        protocol.description +
        protocol.category +
        protocol.tags.join(' ')
      ).toLowerCase();

      return matchesCategory && text.includes(search.toLowerCase());
    });
  }, [search, category]);

  const selectedProtocol = protocols.find(
    (protocol) => protocol.title === selected
  );

  return (
    <section className="protocols-page">
      <style>{`
        .protocols-page {
          display:grid;
          gap:22px;
          color:var(--text-primary,#20334b);
        }
        .protocols-header {
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:12px;
        }
        .protocols-header h2 {
          margin:0 0 6px;
          font-size:25px;
        }
        .protocols-header p {
          margin:0;
          color:#81909c;
        }
        .protocols-count {
          background:#e2f8f1;
          color:#21866e;
          border-radius:20px;
          padding:8px 13px;
          font-size:12px;
          font-weight:700;
        }
        .protocols-search input {
          width:100%;
          box-sizing:border-box;
          padding:14px 16px;
          border:1px solid var(--border,#e5ebef);
          border-radius:12px;
          background:var(--surface,#fff);
          color:inherit;
          font:inherit;
        }
        .protocols-filters {
          display:flex;
          gap:9px;
          flex-wrap:wrap;
        }
        .protocol-filter {
          border:1px solid var(--border,#e5ebef);
          background:var(--surface,#fff);
          color:inherit;
          padding:9px 13px;
          border-radius:20px;
          cursor:pointer;
          font-size:12px;
        }
        .protocol-filter.active {
          background:#172b36;
          color:white;
          border-color:#172b36;
        }
        .protocols-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:15px;
        }
        .protocol-card {
          border:1px solid var(--border,#e5ebef);
          border-radius:16px;
          padding:19px;
          background:var(--surface,#fff);
          display:grid;
          gap:12px;
        }
        .protocol-card-top {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
        }
        .protocol-category {
          color:#21866e;
          background:#e2f8f1;
          padding:6px 10px;
          border-radius:20px;
          font-size:11px;
          font-weight:700;
        }
        .protocol-card h3 {
          margin:0;
          font-size:17px;
        }
        .protocol-card p {
          margin:0;
          color:#81909c;
          font-size:13px;
          line-height:1.6;
        }
        .protocol-tags {
          display:flex;
          gap:6px;
          flex-wrap:wrap;
        }
        .protocol-tag {
          background:var(--background,#f4f7f8);
          padding:5px 8px;
          border-radius:7px;
          font-size:11px;
          color:#718096;
        }
        .protocol-open {
          border:0;
          background:transparent;
          color:#21866e;
          font-weight:700;
          text-align:left;
          padding:5px 0;
          cursor:pointer;
        }
        .protocol-detail {
          background:var(--surface,#fff);
          border:1px solid var(--border,#e5ebef);
          border-radius:16px;
          padding:20px;
          display:grid;
          gap:12px;
        }
        .protocol-detail h3 { margin:0; }
        .protocol-detail p {
          color:#718096;
          line-height:1.6;
          margin:0;
        }
        .protocol-note {
          padding:13px;
          background:#fff5df;
          color:#85631d;
          border-radius:10px;
          font-size:12px;
          line-height:1.6;
        }
        .protocol-empty {
          padding:30px;
          text-align:center;
          color:#81909c;
          background:var(--surface,#fff);
          border-radius:14px;
        }
        @media(max-width:600px) {
          .protocols-grid { grid-template-columns:1fr; }
          .protocol-card { padding:16px; }
        }
      `}</style>

      <header className="protocols-header">
        <div>
          <h2>Protocoles médicaux</h2>
          <p>Votre bibliothèque de référence clinique.</p>
        </div>
        <span className="protocols-count">
          {protocols.length} fiches de démonstration
        </span>
      </header>

      <div className="protocols-search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un protocole, une pathologie..."
        />
      </div>

      <div className="protocols-filters">
        {categories.map((item) => (
          <button
            key={item}
            className={`protocol-filter ${category === item ? 'active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {selectedProtocol && (
        <div className="protocol-detail">
          <h3>{selectedProtocol.title}</h3>
          <p>{selectedProtocol.description}</p>
          <div className="protocol-note">
            Fiche de démonstration uniquement. Le contenu clinique détaillé,
            les recommandations et leurs références devront être intégrés
            à partir de sources médicales vérifiées et actualisées.
          </div>
          <button
            className="protocol-open"
            onClick={() => setSelected(null)}
          >
            Fermer la fiche
          </button>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="protocols-grid">
          {filtered.map((protocol) => (
            <article className="protocol-card" key={protocol.title}>
              <div className="protocol-card-top">
                <span className="protocol-category">
                  {protocol.category}
                </span>
              </div>

              <h3>{protocol.title}</h3>
              <p>{protocol.description}</p>

              <div className="protocol-tags">
                {protocol.tags.map((tag) => (
                  <span className="protocol-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <button
                className="protocol-open"
                onClick={() => setSelected(protocol.title)}
              >
                Consulter la fiche →
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="protocol-empty">
          Aucun protocole ne correspond à votre recherche.
        </div>
      )}
    </section>
  );
}

