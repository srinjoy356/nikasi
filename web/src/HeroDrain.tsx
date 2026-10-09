/** The product in one drawing: rain, a choked drain, a photo, a clear drain, a stamp. Pure SVG + CSS, loops every 11 s. */
export function HeroDrain() {
  const rain = Array.from({ length: 18 }, (_, i) => 30 + i * 33 + (i % 3) * 7);
  return (
    <svg className="drw" viewBox="0 0 640 450" role="img"
      aria-label="A cross-section of a street drain. Rain fills a puddle above a grate blocked by plastic. A photo is taken, the blockage clears, water drains, and a verified stamp appears.">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#13211f" strokeOpacity=".07" /></pattern>
        <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="9" stroke="#13211f" strokeOpacity=".22" strokeWidth="1" /></pattern>
      </defs>
      <rect width="640" height="450" fill="url(#grid)" />

      {/* rain */}
      <g className="rain">
        {rain.map((x, i) => <line key={i} x1={x} y1={20 + (i % 5) * 14} x2={x - 7} y2={44 + (i % 5) * 14} />)}
      </g>

      {/* ground */}
      <rect x="14" y="196" width="612" height="200" fill="url(#hatch)" />
      <rect x="290" y="196" width="60" height="104" fill="#f3eee3" />
      <rect x="350" y="300" width="276" height="50" fill="#f3eee3" />
      <rect x="290" y="300" width="60" height="50" fill="#f3eee3" />

      {/* puddle above the grate */}
      <g className="pond"><path d="M226 190 Q246 146 320 146 Q394 146 414 190 Z" fill="#d3e3ee" stroke="#2a6890" strokeWidth="1.6" /></g>

      {/* road surface, with the gap for the grate */}
      <path d="M14 190H290M350 190H626" stroke="#13211f" strokeWidth="3.5" strokeLinecap="square" />
      {/* shaft and pipe walls */}
      <path d="M290 190V350H626M350 190V300H626" fill="none" stroke="#13211f" strokeWidth="3" strokeLinejoin="miter" />
      {/* grate */}
      <g stroke="#13211f" strokeWidth="3" strokeLinecap="square">
        <path d="M290 190H350" />
        {[300, 310, 320, 330, 340].map((x) => <path key={x} d={`M${x} 190V206`} />)}
      </g>

      {/* the blockage */}
      <g className="junk">
        <path d="M296 270 q10 -22 26 -14 q14 -10 24 8 q8 18 -8 30 q-18 8 -34 -2 q-12 -8 -8 -22Z" fill="#cfc4a6" stroke="#13211f" strokeWidth="1.8" />
        <path d="M304 262 l12 10 M322 258 l-6 18 M336 268 l-14 4" stroke="#13211f" strokeWidth="1.2" fill="none" />
        <rect x="300" y="222" width="14" height="34" rx="4" transform="rotate(-18 307 239)" fill="#e9e2d1" stroke="#13211f" strokeWidth="1.8" />
        <rect x="302" y="217" width="8" height="8" transform="rotate(-18 306 221)" fill="#13211f" />
        <path d="M326 236 q14 -6 20 6 q-4 12 -18 8Z" fill="#a8680a" fillOpacity=".55" stroke="#13211f" strokeWidth="1.6" />
        <circle cx="352" cy="318" r="9" fill="#cfc4a6" stroke="#13211f" strokeWidth="1.6" />
        <path d="M356 304 q22 -2 34 14 q-6 22 -30 20 q-12 -14 -4 -34Z" fill="#cfc4a6" stroke="#13211f" strokeWidth="1.8" />
      </g>

      {/* water running away once clear */}
      <g className="flow"><path d="M320 200V322H614" fill="none" stroke="#2a6890" strokeWidth="3" strokeLinecap="round" /></g>

      {/* the photo */}
      <g className="shot">
        <g stroke="#13211f" strokeWidth="3" fill="none"><path d="M214 118h-22v22M426 118h22v22M214 236h-22v-22M426 236h22v-22" transform="translate(0 -4)" /></g>
        <text x="320" y="106" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" letterSpacing="2.4" fill="#13211f">AFTER-PHOTO</text>
      </g>
      <rect className="flash" x="14" y="14" width="612" height="422" fill="#fff" />

      {/* survey-sheet annotations */}
      <g fontFamily="IBM Plex Mono, monospace" fontSize="11" letterSpacing="1.6" fill="#6a7873">
        <text x="14" y="418">GRATE &#8594; SHAFT &#8594; OUTFALL</text>
        <text x="600" y="342" textAnchor="end">OUTFALL &#8594;</text>
        <g className="lbl-a"><text x="14" y="434" fill="#d4451a">STATE: BLOCKED. TICKET OPEN.</text></g>
        <g className="lbl-b"><text x="14" y="434" fill="#0e5a56">STATE: CLEAR. TICKET CLOSED.</text></g>
      </g>

      {/* the stamp */}
      <g className="okstamp">
        <rect x="430" y="64" width="176" height="62" fill="none" stroke="#0e5a56" strokeWidth="3" />
        <rect x="436" y="70" width="164" height="50" fill="none" stroke="#0e5a56" strokeWidth="1.2" />
        <text x="518" y="97" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="21" fontWeight="500" letterSpacing="5" fill="#0e5a56">VERIFIED</text>
        <text x="518" y="113" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="2.4" fill="#0e5a56">3 OF 3 CHECKS</text>
      </g>
    </svg>
  );
}
