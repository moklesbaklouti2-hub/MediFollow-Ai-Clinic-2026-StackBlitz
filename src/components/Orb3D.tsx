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
          <path d="M98 56C89 43 72 45 67 57 53 56 47 69 52 80 43 91 49 104 58 108 53 121 64 132 76 129 83 141 96 137 100 126 105 138 119 139 126 128 140 131 150 119 143 107 154 97 149 83 140 78 144 64 132 54 120 58 114 47 103 48 98 56Z" fill="none" stroke="#c5fff8" strokeOpacity=".82" strokeWidth="1.7" />
          <g fill="none" stroke="#a8fff4" strokeOpacity=".52" strokeWidth="1.35" strokeLinecap="round">
            <path d="M89 59C78 54 69 61 72 70C74 75 83 74 85 82C87 89 77 91 68 87M58 80C66 77 72 83 69 91C66 97 61 97 61 103M65 111C74 104 84 109 82 118C81 123 77 125 76 129M91 91C83 86 78 93 82 100C86 106 91 104 93 111"/>
            <path d="M111 60C122 54 132 61 128 70C125 76 117 74 115 82C113 89 123 91 132 87M142 80C134 77 128 83 131 91C134 97 139 97 139 103M135 111C126 104 116 109 118 118C119 123 123 125 124 129M109 91C117 86 122 93 118 100C114 106 109 104 107 111"/>
          </g>
          <g className="mf-orb-neural-lines" fill="none" stroke="#c8fff8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9">
            <path d="M96 97L76 76l-15-2M76 76l-3-17M76 76l-17 8M96 97L81 112l-18 5M81 112l-2 17M81 112l-17-8M96 97l-2-24 12-15M94 73l-10-13M94 73l14 3M96 97l20-20 17-4M116 77l4-18M116 77l18 13M96 97l-2 25 13 16M94 122l-14 13M94 122l15 3M96 97l22 20 17 2M118 117l4 17M118 117l16-12" />
            <path d="M76 76L94 73L116 77L118 117L94 122L81 112Z" stroke="#68eee9" strokeOpacity=".65" />
          </g>
          <g className="mf-orb-electric-arcs" fill="none" stroke="#8ffdf4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M62 68L67 65L65 72L72 69M137 66L132 63L134 70L127 68M63 122L68 119L66 126L73 123M137 122L132 119L134 126L127 123"/>
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
