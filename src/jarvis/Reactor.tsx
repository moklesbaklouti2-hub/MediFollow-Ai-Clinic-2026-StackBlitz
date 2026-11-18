export default function Reactor() {
  return <svg className="jarvis-reactor" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="jarvis-core">
        <stop stopColor="#eafaff" />
        <stop offset=".18" stopColor="#77e9ff" />
        <stop offset=".5" stopColor="#28b6eb" stopOpacity=".38" />
        <stop offset="1" stopColor="#28b6eb" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="76" fill="url(#jarvis-core)" />
    <g fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="88" opacity=".38" />
      <circle cx="100" cy="100" r="80" strokeWidth="3" strokeDasharray="1 5" opacity=".66" />
      <circle className="jarvis-ring" cx="100" cy="100" r="69" strokeWidth="4" strokeDasharray="77 14 35 18" />
      <circle cx="100" cy="100" r="54" opacity=".56" />
      <circle cx="100" cy="100" r="46" strokeWidth="3" strokeDasharray="48 24" transform="rotate(24 100 100)" />
      <circle cx="100" cy="100" r="29" opacity=".65" />
      <path d="M100 8v12m0 160v12M8 100h12m160 0h12M100 78l19 11v22l-19 11-19-11V89z" />
    </g>
  </svg>;
}
