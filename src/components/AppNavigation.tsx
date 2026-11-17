import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';

// Keep the CSS navigation breakpoint aligned with this presentation-only query.
export const compactNavigationQuery = '(max-width:700px), (orientation:portrait), (max-height:500px)';

type Props = { active: string; onNavigate: (page: string) => void };

export default function AppNavigation({ active, onNavigate }: Props) {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(compactNavigationQuery).matches
      : false,
  );
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(compactNavigationQuery);
    const update = () => { setCompact(query.matches); setExpanded(false); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Navigation changes the view, never the draft or clinical values within it.
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [active]);

  function close() { dialog.current?.close(); }

  function navigate(page: string) {
    close();
    onNavigate(page);
  }

  return <div id="cabinet-navigation" data-mode={compact ? 'drawer' : 'sidebar'}>
    {compact ? <>
      <button type="button" className="cabinet-menu-toggle" ref={trigger}
        aria-haspopup="dialog" aria-controls="cabinet-navigation-dialog" aria-expanded={expanded}
        onClick={() => { dialog.current?.showModal(); setExpanded(true); }}>
        <span aria-hidden="true">☰</span> Menu
      </button>
      <span className="cabinet-mobile-brand">MediFollow AI</span>
      <dialog id="cabinet-navigation-dialog" className="cabinet-drawer" aria-label="Navigation MediFollow"
        ref={dialog} onCancel={() => setExpanded(false)}
        onClose={() => { setExpanded(false); trigger.current?.focus(); }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
        }}>
        <div className="cabinet-drawer-heading"><strong>Navigation</strong><button type="button" className="cabinet-menu-toggle" onClick={close}>Fermer le menu</button></div>
        <Sidebar active={active} onNavigate={navigate} />
      </dialog>
    </> : <Sidebar active={active} onNavigate={onNavigate} />}
  </div>;
}
