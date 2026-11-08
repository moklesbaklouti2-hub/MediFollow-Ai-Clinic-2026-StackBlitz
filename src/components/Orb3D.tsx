export default function Orb3D() {
  return (
    <div className="mf-clinical-orb-shell" role="img" aria-label="Sphère animée d’intelligence médicale et de connexions neuronales">
      <svg className="mf-clinical-orb" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mfOrbGlass" cx="32%" cy="24%" r="78%">
            <stop offset="0" stopColor="#8ffff0" stopOpacity=".95" />
            <stop offset=".24" stopColor="#27cbd1" stopOpacity=".72" />
            <stop offset=".62" stopColor="#126da0" stopOpacity=".92" />
            <stop offset="1" stopColor="#061b38" />
          </radialGradient>
          <linearGradient id="mfOrbRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e1fffc" />
            <stop offset=".42" stopColor="#55e9e5" />
            <stop offset="1" stopColor="#247fc0" />
          </linearGradient>
          <radialGradient id="mfOrbAura">
            <stop offset="0" stopColor="#31eee0" stopOpacity=".34" />
            <stop offset="1" stopColor="#149ed0" stopOpacity="0" />
          </radialGradient>
          <filter id="mfOrbGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <clipPath id="mfOrbClip"><circle cx="100" cy="100" r="70" /></clipPath>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#mfOrbAura)" />
        <g className="mf-orb-orbit" fill="none" stroke="url(#mfOrbRim)" strokeWidth="1.7" opacity=".72">
          <ellipse cx="100" cy="100" rx="91" ry="34" transform="rotate(-28 100 100)" />
          <ellipse cx="100" cy="100" rx="88" ry="31" transform="rotate(54 100 100)" opacity=".58" />
        </g>
        <circle cx="100" cy="100" r="72" fill="#2ee7e2" opacity=".26" filter="url(#mfOrbGlow)" />
        <circle cx="100" cy="100" r="70" fill="url(#mfOrbGlass)" stroke="url(#mfOrbRim)" strokeWidth="2.4" />
        <g clipPath="url(#mfOrbClip)">
          <circle cx="100" cy="100" r="62" fill="none" stroke="#c2fffa" strokeOpacity=".2" />
          <path d="M100 39c-14-13-35-5-37 12-17 2-24 20-15 34-12 15-4 34 10 38-2 19 15 30 29 22 5 17 25 18 33 4 17 6 31-8 27-24 15-11 12-31-1-39 8-17-4-33-20-32-3-18-19-24-26-15Z" fill="none" stroke="#bafff6" strokeOpacity=".72" strokeWidth="1.6" />
          <g className="mf-orb-neural-lines" fill="none" stroke="#c8fff8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9">
            <path d="M96 97L76 76l-15-2M76 76l-3-17M76 76l-17 8M96 97L81 112l-18 5M81 112l-2 17M81 112l-17-8M96 97l-2-24 12-15M94 73l-10-13M94 73l14 3M96 97l20-20 17-4M116 77l4-18M116 77l18 13M96 97l-2 25 13 16M94 122l-14 13M94 122l15 3M96 97l22 20 17 2M118 117l4 17M118 117l16-12" />
            <path d="M76 76L94 73L116 77L118 117L94 122L81 112Z" stroke="#68eee9" strokeOpacity=".65" />
          </g>
          <g className="mf-orb-neural-nodes" fill="#dffffb" stroke="#39d9dc" strokeWidth="1.2">
            <circle cx="96" cy="97" r="5" />
            <circle cx="76" cy="76" r="3.2" />
            <circle cx="61" cy="74" r="2.5" />
            <circle cx="73" cy="59" r="2.5" />
            <circle cx="59" cy="84" r="2.5" />
            <circle cx="81" cy="112" r="3" />
            <circle cx="63" cy="117" r="2.5" />
            <circle cx="79" cy="129" r="2.5" />
            <circle cx="94" cy="73" r="3" />
            <circle cx="84" cy="60" r="2.4" />
            <circle cx="108" cy="58" r="2.4" />
            <circle cx="116" cy="77" r="3.2" />
            <circle cx="133" cy="73" r="2.5" />
            <circle cx="134" cy="90" r="2.5" />
            <circle cx="94" cy="122" r="3.2" />
            <circle cx="80" cy="135" r="2.4" />
            <circle cx="109" cy="125" r="2.5" />
            <circle cx="118" cy="117" r="3.2" />
            <circle cx="135" cy="119" r="2.5" />
            <circle cx="122" cy="134" r="2.5" />
          </g>
          <path d="M100 85v30M85 100h30" stroke="#f2fffd" strokeWidth="3.2" strokeLinecap="round" opacity=".88" />
          <circle cx="100" cy="100" r="2.4" fill="#ffffff" />
        </g>
        <path d="M55 63a62 62 0 0 1 58-31" fill="none" stroke="#ffffff" strokeOpacity=".56" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#c8fffb" strokeOpacity=".18" />
        <circle cx="24" cy="76" r="3.5" fill="#bafff8" />
        <circle cx="174" cy="135" r="3.5" fill="#bafff8" />
      </svg>
    </div>
  );
}
