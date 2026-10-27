/* Engage Companion — hardware renderings (inline SVG, theme tokens only).
   Engage MediaBoard 32W: color e-paper, thin black frame, always hung landscape (16:9 content, 2560×1440).
   Rear: dark steel back. Tall battery cover plate, one thumb screw at top center (v0.9; was Phillips), tab hooks a slot at the bottom.
   Bay: display lead (white band) exits a grommet top-left, ends in a male barrel plug.
   Pack: blue Li-ion, female barrel jack on a short lead, held by a side clip. */
(function () {
  "use strict";
  let uid = 0;
  const nid = (p) => p + (++uid);

  /* ---------- small parts ---------- */
  const screwHead = (x, y, r = 5) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="var(--hw-steel)"/>
    <path d="M${x - r * .55} ${y}h${r * 1.1}M${x} ${y - r * .55}v${r * 1.1}" stroke="var(--hw-back-2)" stroke-width="1.6" stroke-linecap="round"/>`;

  const ring = (x, y, r = 14) => `
    <circle class="focus-ring" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--tint)" stroke-width="3"/>
    <circle class="focus-pulse" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--tint)" stroke-width="2"/>`;

  const arrow = (d, head) => `
    <path d="${d}" stroke="var(--tint)" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${head}" stroke="var(--tint)" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

  function battery(x, y, kind = "old") {
    return `<g transform="translate(${x} ${y})">
      <rect width="62" height="70" rx="4" fill="var(--hw-battery)"/>
      <rect width="62" height="8" rx="4" fill="var(--hw-battery-hi)"/>
      <rect x="7" y="22" width="48" height="30" rx="2" fill="var(--hw-label)"/>
      <rect x="11" y="27" width="22" height="3" fill="var(--hw-back)" opacity=".55"/>
      <rect x="11" y="33" width="38" height="2" fill="var(--hw-back)" opacity=".35"/>
      <rect x="11" y="38" width="32" height="2" fill="var(--hw-back)" opacity=".35"/>
      <rect x="11" y="43" width="26" height="2" fill="var(--hw-back)" opacity=".35"/>
      ${kind === "new" ? `<g transform="translate(40 -8)"><rect width="28" height="16" rx="8" fill="var(--ok)"/><text x="14" y="11.5" text-anchor="middle" font-family="var(--f-mono)" font-size="8.5" font-weight="700" fill="var(--ok-ink)">NEW</text></g>` : ""}
      ${kind === "old" ? `<g transform="translate(40 -8)"><rect width="28" height="16" rx="8" fill="var(--surface)" stroke="var(--line)"/><text x="14" y="11.5" text-anchor="middle" font-family="var(--f-mono)" font-size="8.5" font-weight="700" fill="var(--fg-2)">OLD</text></g>` : ""}
    </g>`;
  }

  /* ---------- rear of display, step by step ----------
     opts: cover 'on'|'tilt'|'off' · screw 'in'|'out' · plug 'joined'|'apart'
           battery 'in'|'out'|'none' · kind 'old'|'new' · focus 'screw'|'cover'|'plug'|'battery'|'clip'|null
           motion  extra arrow overlay key */
  function rear(o = {}) {
    const opt = Object.assign({ cover: "on", screw: "in", plug: "joined", battery: "in", kind: "old", focus: null, motion: null }, o);
    const bx = 75, by = 40, bw = 80, bh = 220; // bay
    const jackY = opt.plug === "joined" ? 130 : 148;

    const bay = `
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="var(--hw-back-2)"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="7" rx="3" fill="var(--hw-steel)"/>
      <circle cx="96" cy="62" r="5" fill="var(--hw-frame)" stroke="var(--hw-steel)" stroke-width="1.5"/>
      <path d="M96 62 C98 80, 112 86, 112 104" stroke="var(--hw-frame)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M101.5 75 C104 79, 108 82, 109.5 86" stroke="var(--hw-label)" stroke-width="4.4" fill="none"/>
      <rect x="107" y="104" width="10" height="22" rx="2" fill="var(--hw-frame)"/>
      <rect x="110" y="126" width="4" height="6" fill="var(--hw-steel)"/>
      <rect x="106" y="${jackY}" width="12" height="24" rx="2" fill="var(--hw-frame)"/>
      <rect x="108" y="${jackY + 3}" width="8" height="6" rx="1" fill="var(--hw-back)" opacity=".7"/>
      ${opt.battery === "in"
        ? `<path d="M112 ${jackY + 24} C112 ${jackY + 40}, 138 ${jackY + 36}, 138 184" stroke="var(--hw-frame)" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
        : `<path d="M112 ${jackY + 24} C112 ${jackY + 34}, 116 ${jackY + 40}, 122 ${jackY + 44}" stroke="var(--hw-frame)" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="${opt.battery === "none" ? 0 : 1}"/>`}
      <rect x="79" y="198" width="6" height="40" rx="2" fill="var(--hw-frame)"/>
      <rect x="79" y="198" width="6" height="40" rx="2" fill="none" stroke="var(--hw-steel)" stroke-width=".8" opacity=".6"/>
      ${opt.battery === "in" ? battery(86, 184, opt.kind) : ""}`;

    // when the pack is out of the bay its jack travels with it
    const loosePack = opt.battery === "out" ? `
      <g>
        <path d="M262 186 C262 168, 250 160, 244 156" stroke="var(--hw-frame)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <rect x="236" y="134" width="12" height="24" rx="2" fill="var(--hw-frame)"/>
        ${battery(232, 186, opt.kind)}
      </g>` : "";

    const coverPlate = (extra = "") => `
      <g ${extra}>
        <rect x="71" y="36" width="88" height="228" rx="8" fill="var(--hw-back)" stroke="var(--hw-steel)" stroke-opacity=".35"/>
        <rect x="103" y="262" width="24" height="5" rx="1.5" fill="var(--hw-back)" stroke="var(--hw-steel)" stroke-opacity=".35"/>
        <circle cx="115" cy="50" r="5.5" fill="var(--hw-back-2)"/>
      </g>`;

    let cover = "";
    if (opt.cover === "on") cover = coverPlate();
    if (opt.cover === "tilt") cover = coverPlate('transform="rotate(-11 115 264)" opacity=".94"');
    if (opt.cover === "off") cover = coverPlate('transform="translate(160 18) rotate(5 115 150)"');

    let screw = "";
    if (opt.screw === "in" && opt.cover === "on") screw = screwHead(115, 50);
    if (opt.screw === "out") screw = `<g>${screwHead(115, 20, 5)}<rect x="113" y="25" width="4" height="9" fill="var(--hw-steel)"/></g>`;

    const focusAt = { screw: [115, 50, 13], cover: [115, 150, 0], plug: [112, 136, 20], battery: [117, 219, 0], clip: [82, 218, 16] }[opt.focus];
    let focus = "";
    if (focusAt && focusAt[2]) focus = ring(focusAt[0], focusAt[1], focusAt[2]);
    if (opt.focus === "cover") focus = `<rect class="focus-ring" x="67" y="32" width="96" height="236" rx="11" fill="none" stroke="var(--tint)" stroke-width="3"/>`;
    if (opt.focus === "battery") focus = `<rect class="focus-ring" x="80" y="176" width="74" height="84" rx="8" fill="none" stroke="var(--tint)" stroke-width="3"/>`;

    const motions = {
      unscrew: arrow("M134 54 C146 40, 140 24, 126 20", "M131 15 l-5 5 6 4"),
      tilt: arrow("M168 70 C186 74, 196 88, 198 104", "M191 100 l7 5 4 -8"),
      lift: arrow("M196 120 L232 92", "M222 91 h10 v10"),
      unplugDown: arrow("M132 136 L132 160", "M126 154 l6 7 6 -7"),
      slideOut: arrow("M160 216 L216 216", "M208 209 l8 7 -8 7"),
      slideIn: arrow("M226 230 L170 230", "M178 223 l-8 7 8 7"),
      plugUp: arrow("M132 160 L132 138", "M126 144 l6 -7 6 7"),
      hook: arrow("M220 238 C196 262, 168 270, 140 268", "M148 262 l-8 6 8 6"),
      screwIn: arrow("M126 20 C140 24, 146 40, 134 54", "M137 46 l-3 8 -8 -2"),
    };

    return `<svg viewBox="0 0 320 300" role="img" aria-label="Close-up of the left side of the display back, around the access panel">
      <rect x="10" y="10" width="330" height="280" rx="8" fill="var(--hw-back)"/>
      ${bay}
      ${cover}
      ${screw}
      ${loosePack}
      ${focus}
      ${opt.motion ? motions[opt.motion] || "" : ""}
    </svg>`;
  }

  /* ---------- whole back of the display ----------
     Seen from behind, landscape. Proportions from field photos: back plate ≈ 1.76:1; the access panel is a tall plate
     (≈ 2.5:1) on the LEFT edge, running most of the height, one screw at top center. Nothing else drawn (graphics rule). */
  function rearOverview() {
    const W = 300, H = 170, x0 = 10, y0 = 62;            // back plate
    const pw = 58, ph = 148, px = x0 + 20, py = y0 + (H - ph) / 2; // panel
    return `<svg viewBox="0 0 320 300" role="img" aria-label="Back of the display; the access panel is the tall plate on the left side">
      <rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="8" fill="var(--hw-back)"/>
      <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="5" fill="var(--hw-back-2)" stroke="var(--hw-steel)" stroke-opacity=".45"/>
      ${screwHead(px + pw / 2, py + 10, 4.5)}
      <rect class="focus-ring" x="${px - 5}" y="${py - 5}" width="${pw + 10}" height="${ph + 10}" rx="9" fill="none" stroke="var(--tint)" stroke-width="3"/>
      <text x="${px + pw / 2}" y="${y0 + H + 26}" text-anchor="middle" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--tint)">ACCESS PANEL</text>
      <text x="${x0 + W / 2 + 30}" y="${y0 - 16}" text-anchor="middle" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--fg-2)">BACK OF DISPLAY</text>
    </svg>`;
  }

  /* ---------- rear serial label ---------- */
  function bars(text, x, y, w, h) {
    // deterministic pseudo-barcode from the serial; it's an illustration, not a scannable code
    let out = "", cx = x, seed = 0;
    for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    while (cx < x + w - 2) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const bw = 0.8 + (seed % 3) * 0.8;
      const gap = 0.8 + ((seed >> 4) % 3) * 0.7;
      out += `<rect x="${cx.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${h}"/>`;
      cx += bw + gap;
    }
    return `<g fill="var(--hw-frame)">${out}</g>`;
  }

  function label(serial = "193205A4B0091", { focus = false } = {}) {
    return `<svg viewBox="0 0 300 180" role="img" aria-label="Rear product label with serial number ${serial}">
      <rect x="0" y="0" width="300" height="180" rx="10" fill="var(--hw-back)"/>
      <g transform="translate(26 18)">
        <rect width="248" height="144" rx="6" fill="var(--hw-label)"/>
        <rect x="12" y="12" width="14" height="14" rx="2" fill="none" stroke="var(--hw-frame)" stroke-width="1.6"/>
        <text x="19" y="23" text-anchor="middle" font-family="var(--f-body)" font-size="10" font-weight="700" fill="var(--hw-frame)">V</text>
        <text x="32" y="23" font-family="var(--f-body)" font-size="11" font-weight="700" fill="var(--hw-frame)">Engage</text>
        <text x="236" y="23" text-anchor="end" font-family="var(--f-body)" font-size="10" font-weight="700" fill="var(--hw-frame)">EPD Monitor</text>
        <text x="12" y="46" font-family="var(--f-body)" font-size="9" fill="var(--hw-frame)"><tspan font-weight="700">Model Name:</tspan> Engage MediaBoard 32W</text>
        <text x="12" y="60" font-family="var(--f-body)" font-size="9" fill="var(--hw-frame)"><tspan font-weight="700">DC input:</tspan> DC 14.8V 1A</text>
        <text x="12" y="80" font-family="var(--f-body)" font-size="9" font-weight="700" fill="var(--hw-frame)">Serial no.:</text>
        ${bars(serial, 68, 70, 150, 22)}
        <text x="143" y="104" text-anchor="middle" font-family="var(--f-mono)" font-size="10" fill="var(--hw-frame)" letter-spacing="1">${serial}</text>
        <rect x="12" y="116" width="224" height="2" fill="var(--hw-frame)" opacity=".15"/>
        <rect x="12" y="124" width="180" height="2" fill="var(--hw-frame)" opacity=".15"/>
        ${focus ? `<rect class="focus-ring" x="62" y="64" width="162" height="46" rx="6" fill="none" stroke="var(--tint)" stroke-width="3"/>` : ""}
      </g>
    </svg>`;
  }

  /* ---------- home + placeholder art ---------- */
  const home = {
    install() {
      return `<svg viewBox="0 0 170 150" role="img" aria-label="Landscape display on a wall bracket, phone scanning the ID barcode on its screen">
        <rect x="8" y="10" width="154" height="132" rx="14" fill="var(--wall)" opacity=".75"/>
        <rect x="34" y="96" width="6" height="34" rx="2" fill="var(--hw-steel)"/>
        <rect x="88" y="96" width="6" height="34" rx="2" fill="var(--hw-steel)"/>
        <rect x="12" y="40" width="104" height="62" rx="4" fill="var(--hw-frame)"/>
        <rect x="16" y="44" width="96" height="54" rx="1.5" fill="var(--hw-paper)"/>
        <g transform="translate(30 56)" fill="var(--hw-frame)">
          <rect x="0" width="2" height="20"/><rect x="4" width="1" height="20"/><rect x="7" width="3" height="20"/><rect x="12" width="1" height="20"/>
          <rect x="15" width="2" height="20"/><rect x="19" width="1" height="20"/><rect x="22" width="3" height="20"/><rect x="27" width="1" height="20"/>
          <rect x="30" width="2" height="20"/><rect x="34" width="1" height="20"/><rect x="37" width="3" height="20"/><rect x="42" width="2" height="20"/>
        </g>
        <rect x="80" y="60" width="22" height="4" rx="2" fill="var(--hw-frame)" opacity=".35"/>
        <rect x="80" y="68" width="16" height="3" rx="1.5" fill="var(--hw-frame)" opacity=".25"/>
        <path d="M122 72 L74 66 M122 88 L74 76" stroke="var(--tint)" stroke-width="1.6" stroke-dasharray="3 3" fill="none"/>
        <g transform="translate(120 50)">
          <rect width="40" height="72" rx="8" fill="var(--hw-frame)"/>
          <rect x="3" y="6" width="34" height="58" rx="4" fill="var(--surface)"/>
          <rect x="9" y="16" width="22" height="22" rx="3" fill="none" stroke="var(--tint)" stroke-width="2"/>
          <rect x="9" y="44" width="22" height="5" rx="2.5" fill="var(--tint)"/>
          <rect x="12" y="53" width="16" height="3" rx="1.5" fill="var(--fg-3)"/>
        </g>
      </svg>`;
    },
    content() {
      const id = nid("c");
      return `<svg viewBox="0 0 170 150" role="img" aria-label="Landscape display showing promotional content with new content arriving">
        <defs><clipPath id="${id}"><rect x="14" y="56" width="100" height="56" rx="1.5"/></clipPath></defs>
        <rect x="10" y="52" width="108" height="64" rx="4" fill="var(--hw-frame)"/>
        <image href="assets/content/pumpkin.jpg" x="14" y="56" width="100" height="56" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>
        <g transform="translate(112 14) rotate(6)">
          <rect width="48" height="30" rx="4" fill="var(--surface)" stroke="var(--line)"/>
          <image href="assets/content/tomato.jpg" x="3" y="3" width="42" height="24" preserveAspectRatio="xMidYMid slice"/>
        </g>
        <path d="M136 50 C136 64, 130 70, 122 72" stroke="var(--tint)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M125 65 L121 73 L129 75" stroke="var(--tint)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    },
    battery() {
      return `<svg viewBox="0 0 160 110" role="img" aria-label="Rear of display with battery bay open">
        <rect x="6" y="6" width="148" height="98" rx="6" fill="var(--hw-back)"/>
        <circle cx="16" cy="16" r="2.4" fill="var(--hw-back-2)"/><circle cx="144" cy="16" r="2.4" fill="var(--hw-back-2)"/>
        <circle cx="16" cy="94" r="2.4" fill="var(--hw-back-2)"/><circle cx="144" cy="94" r="2.4" fill="var(--hw-back-2)"/>
        <rect x="26" y="30" width="108" height="48" rx="4" fill="var(--hw-back-2)"/>
        <rect x="26" y="30" width="6" height="48" rx="1" fill="var(--hw-steel)"/>
        <rect x="84" y="35" width="44" height="38" rx="3" fill="var(--hw-battery)"/>
        <rect x="84" y="35" width="44" height="6" rx="3" fill="var(--hw-battery-hi)"/>
        <rect x="92" y="48" width="28" height="17" rx="1.5" fill="var(--hw-label)"/>
        <rect x="95" y="52" width="16" height="2" fill="var(--hw-back)" opacity=".5"/>
        <rect x="95" y="57" width="22" height="1.6" fill="var(--hw-back)" opacity=".35"/>
        <path d="M38 42 C52 44, 56 60, 70 66 S 82 70, 86 68" stroke="var(--hw-frame)" stroke-width="3" fill="none" stroke-linecap="round"/>
        <rect x="60" y="58" width="12" height="6" rx="2" transform="rotate(24 66 61)" fill="var(--hw-frame)"/>
        <circle cx="38" cy="42" r="3.4" fill="var(--hw-frame)" stroke="var(--hw-steel)"/>
      </svg>`;
    },
    replace() {
      return `<svg viewBox="0 0 160 110" role="img" aria-label="Old display out, new display in">
        <rect x="4" y="34" width="60" height="40" rx="4" fill="var(--hw-frame)" opacity=".35"/>
        <rect x="8" y="38" width="52" height="32" rx="1.5" fill="var(--hw-paper)" opacity=".55"/>
        <circle cx="34" cy="54" r="12" fill="var(--surface)"/>
        <path d="M28.5 48.5l11 11M39.5 48.5l-11 11" stroke="var(--bad)" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M70 54h18" stroke="var(--tint)" stroke-width="4" stroke-linecap="round"/>
        <path d="M81 46l9 8-9 8" stroke="var(--tint)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="96" y="30" width="62" height="48" rx="4" fill="var(--hw-frame)"/>
        <rect x="100" y="34" width="54" height="40" rx="1.5" fill="var(--hw-paper)"/>
        <rect x="100" y="34" width="54" height="10" fill="var(--tint)"/>
        <rect x="105" y="50" width="26" height="14" rx="2" fill="var(--hw-frame)" opacity=".75"/>
        <rect x="136" y="52" width="13" height="4" rx="2" fill="var(--hw-frame)" opacity=".3"/>
      </svg>`;
    },
    trouble() {
      return `<svg viewBox="0 0 160 110" role="img" aria-label="Display with a stale screen and a diagnostic badge">
        <rect x="8" y="24" width="96" height="62" rx="4" fill="var(--hw-frame)"/>
        <rect x="12" y="28" width="88" height="54" rx="1.5" fill="var(--hw-paper)"/>
        <rect x="12" y="28" width="88" height="14" fill="var(--hw-frame)" opacity=".18"/>
        <rect x="18" y="50" width="40" height="4" rx="2" fill="var(--hw-frame)" opacity=".25"/>
        <rect x="18" y="58" width="28" height="4" rx="2" fill="var(--hw-frame)" opacity=".18"/>
        <rect x="12" y="70" width="88" height="2" fill="var(--hw-frame)" opacity=".2"/>
        <rect x="12" y="76" width="88" height="1.5" fill="var(--hw-frame)" opacity=".14"/>
        <g transform="translate(108 18)">
          <circle cx="18" cy="18" r="17" fill="var(--surface)" stroke="var(--tint)" stroke-width="3"/>
          <path d="M18 9v11" stroke="var(--tint)" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="18" cy="26" r="2.2" fill="var(--tint)"/>
        </g>
        <path d="M112 64 h20 m-20 8 h14 m-14 8 h18" stroke="var(--tint)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
      </svg>`;
    },
    hero() {
      const id = nid("h");
      return `<svg viewBox="0 0 300 200" role="img" aria-label="Engage Displays showing in-store content">
        <defs>
          <clipPath id="${id}a"><rect x="7" y="73" width="96" height="54" rx="1.5"/></clipPath>
          <clipPath id="${id}b"><rect x="98" y="30" width="104" height="58" rx="1.5"/></clipPath>
          <clipPath id="${id}c"><rect x="197" y="73" width="96" height="54" rx="1.5"/></clipPath>
        </defs>
        <ellipse cx="150" cy="182" rx="140" ry="10" fill="var(--line)"/>
        <rect x="53" y="130" width="6" height="44" fill="var(--hw-steel)"/>
        <rect x="243" y="130" width="6" height="44" fill="var(--hw-steel)"/>
        <rect x="4" y="70" width="102" height="60" rx="4" fill="var(--hw-frame)"/>
        <image href="assets/content/pumpkin.jpg" x="7" y="73" width="96" height="54" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}a)"/>
        <rect x="194" y="70" width="102" height="60" rx="4" fill="var(--hw-frame)"/>
        <image href="assets/content/coke-santa.jpg" x="197" y="73" width="96" height="54" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)"/>
        <rect x="147" y="92" width="8" height="82" fill="var(--hw-steel)"/>
        <rect x="127" y="172" width="48" height="6" rx="3" fill="var(--hw-steel)"/>
        <rect x="94" y="26" width="112" height="66" rx="4" fill="var(--hw-frame)"/>
        <image href="assets/content/tomato.jpg" x="98" y="30" width="104" height="58" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}b)"/>
      </svg>`;
    },
  };


  /* ---------- safe access: display high on a wall, step ladder ---------- */
  function access() {
    const id = nid("ac");
    return `<svg viewBox="0 0 320 300" role="img" aria-label="Display mounted on a wall with a step ladder in front">
      <rect x="0" y="0" width="320" height="300" rx="12" fill="var(--wall)"/>
      <rect x="0" y="262" width="320" height="38" fill="var(--line)"/>
      <defs><clipPath id="${id}"><rect x="126" y="40" width="152" height="84" rx="1.5"/></clipPath></defs>
      <rect x="122" y="36" width="160" height="92" rx="4" fill="var(--hw-frame)"/>
      <image href="assets/content/tomato.jpg" x="126" y="40" width="152" height="84" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>
      <g stroke="var(--hw-steel)" stroke-width="7" stroke-linecap="round">
        <path d="M70 262 L104 120"/><path d="M138 262 L104 120"/>
      </g>
      <g stroke="var(--hw-steel)" stroke-width="5" stroke-linecap="round">
        <path d="M80 222 h50"/><path d="M90 182 h34"/><path d="M98 150 h18"/>
      </g>
      <rect x="92" y="112" width="26" height="12" rx="3" fill="var(--tool-handle)"/>
      <path d="M210 262 l18 -40 18 40z" fill="var(--warn)" opacity=".9"/>
      <rect x="226" y="236" width="4" height="12" rx="2" fill="var(--surface)"/>
      <circle cx="228" cy="254" r="2.2" fill="var(--surface)"/>
    </svg>`;
  }

  /* ---------- tools ---------- */
  function tools() {
    return `<svg viewBox="0 0 300 140" role="img" aria-label="Phillips screwdriver and replacement battery pack">
      <g transform="translate(18 34) rotate(-8)">
        <rect x="0" y="10" width="64" height="26" rx="10" fill="var(--tool-handle)"/>
        <rect x="8" y="10" width="4" height="26" fill="var(--hw-frame)" opacity=".2"/>
        <rect x="20" y="10" width="4" height="26" fill="var(--hw-frame)" opacity=".2"/>
        <rect x="32" y="10" width="4" height="26" fill="var(--hw-frame)" opacity=".2"/>
        <rect x="64" y="18" width="62" height="10" rx="2" fill="var(--hw-steel)"/>
        <path d="M126 18 l12 5 -12 5z" fill="var(--hw-steel)"/>
      </g>
      <text x="74" y="104" text-anchor="middle" font-family="var(--f-mono)" font-size="11" font-weight="700" fill="var(--fg-2)">IF STIFF: #2 PHILLIPS</text>
      ${battery(186, 28, "new")}
      <text x="217" y="126" text-anchor="middle" font-family="var(--f-mono)" font-size="11" font-weight="700" fill="var(--fg-2)">14.8V 2600mAh</text>
    </svg>`;
  }

  /* ---------- wake: the button pusher (v0.9.2, from Clay's photos and the CAD view) ----------
     The pocket is on the back, on the left side as you face the screen. A printed slide bolt is screwed into it and
     stays there. Everything is inside the pocket: nothing sticks out past the display's edge. The tab is the bolt's
     outer end (toward the display's edge); pushing it straight in slides the bolt onto the wake button at its inner
     end. The light sits beside the button.
     Rear views match Clay's annotated photo (2026-10-12): edge on the left, push right along the bolt, light just below the button.
     stage: 'where' | 'find' | 'hold' | 'green' | 'blink' | 'update' */
  function rearPocket(stage) {
    const led = stage === "blink" ? "#f06a1d" : stage === "green" ? "#22b14c" : "var(--hw-frame)";
    const glow = stage === "green" || stage === "blink";
    const bl = stage === "blink" ? "blink" : "";
    const push = stage === "hold";
    return `<svg viewBox="0 0 320 300" role="img" aria-label="${{
        find: "Back of the display at the pocket: the pusher tab is at the outer end by the edge, the button at the inner end",
        hold: "Push the pusher tab straight in toward the button and hold for 3 seconds",
        green: "The light just below the button turns green", blink: "The light blinks red or orange" }[stage]}">
      <rect x="0" y="0" width="320" height="300" rx="12" fill="var(--hw-back)"/>
      <rect x="0" y="0" width="22" height="300" fill="var(--hw-frame)"/>
      <path d="M34 46 H300 V254 H34 Z" fill="var(--hw-back-2)"/>
      <rect x="262" y="56" width="30" height="190" rx="3" fill="var(--hw-frame)"/>
      <circle cx="277" cy="150" r="7" fill="var(--hw-steel)" stroke="#22242a" stroke-width="2"/>
      ${glow ? `<circle class="${bl}" cx="277" cy="190" r="13" fill="${led}" opacity=".35"/>` : ""}
      <rect class="${bl}" x="271" y="184" width="12" height="12" rx="3" fill="${led}" stroke="var(--hw-steel)" stroke-opacity=".5"/>
      <g fill="#5b5f67" stroke="#22242a" stroke-width="2">
        <path d="M146 80 h24 v56 h50 v28 h-50 v58 h-24 v-58 h-50 v-28 h50 z"/>
      </g>
      ${screwHead(158, 96, 6)}${screwHead(158, 206, 6)}
      <g class="${push ? "push-bolt" : ""}">
        <rect x="58" y="142" width="204" height="16" rx="4" fill="#7a808a" stroke="#22242a" stroke-width="2"/>
        <rect x="42" y="128" width="30" height="44" rx="6" fill="#7a808a" stroke="${stage === "find" || push ? "var(--tint)" : "#22242a"}" stroke-width="${stage === "find" || push ? 3 : 2}"/>
      </g>
      ${stage === "find" ? ring(57, 150, 30) + `
        <text x="57" y="214" text-anchor="middle" font-family="var(--f-mono)" font-size="13" font-weight="700" fill="var(--hw-label)">TAB</text>
        <text x="256" y="128" text-anchor="end" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--hw-label)">BUTTON</text>
        <text x="258" y="194" text-anchor="end" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--hw-label)">LIGHT</text>` : ""}
      ${push ? `
        <g class="push-finger-r">
          <path d="M-12 168 L20 168 a17 17 0 0 0 0 -34 L-12 134 z" fill="var(--surface)" stroke="var(--fg-2)" stroke-width="3" stroke-linejoin="round"/>
        </g>
        <path d="M88 70 H200" stroke="var(--tint)" stroke-width="4" stroke-linecap="round"/>
        <path d="M188 60 l12 10 -12 10" stroke="var(--tint)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="236" y="76" font-family="var(--f-mono)" font-size="13" font-weight="700" fill="var(--hw-label)">PUSH IN</text>
        <g transform="translate(70 228)">
          <circle r="26" fill="var(--surface)"/>
          <circle r="20" fill="none" stroke="var(--line)" stroke-width="6"/>
          <circle class="hold-ring" r="20" fill="none" stroke="var(--tint)" stroke-width="6" stroke-linecap="round" stroke-dasharray="126" transform="rotate(-90)"/>
          <text y="6" text-anchor="middle" font-family="var(--f-mono)" font-size="15" font-weight="700" fill="var(--fg)">3s</text>
        </g>` : ""}
      ${glow ? `<text x="258" y="194" text-anchor="end" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--hw-label)">LIGHT</text>` : ""}
      <text x="296" y="30" text-anchor="end" font-family="var(--f-mono)" font-size="10" font-weight="700" fill="var(--hw-label)" opacity=".6">BACK OF DISPLAY · EDGE ON THE LEFT</text>
    </svg>`;
  }
  function wake(stage = "where") {
    if (stage === "where") {
      // facing the screen: the pocket is on the back, toward the left edge
      return `<svg viewBox="0 0 320 300" role="img" aria-label="Front of display; the pocket with the pusher is on the back, on the left side as you face the screen">
        <rect x="0" y="0" width="320" height="300" rx="12" fill="var(--wall)"/>
        <rect x="58" y="62" width="62" height="56" rx="6" fill="none" stroke="var(--tint)" stroke-width="3" stroke-dasharray="6 5"/>
        <rect x="70" y="40" width="220" height="128" rx="5" fill="var(--hw-frame)"/>
        <rect x="75" y="45" width="210" height="118" rx="2" fill="var(--hw-paper)"/>
        <rect x="75" y="45" width="210" height="30" fill="var(--hw-frame)" opacity=".15"/>
        <rect x="58" y="62" width="62" height="56" rx="6" fill="var(--tint)" opacity=".18"/>
        <path d="M30 150 C 20 120, 26 96, 50 90" stroke="var(--tint)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M42 84 l9 6 -7 9" stroke="var(--tint)" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="89" y="196" text-anchor="middle" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--tint)">POCKET · BACK LEFT</text>
        <text x="180" y="230" text-anchor="middle" font-family="var(--f-mono)" font-size="12" font-weight="700" fill="var(--fg-2)">YOU ARE FACING THE SCREEN</text>
        <path d="M168 262 l12 -16 12 16" stroke="var(--fg-2)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
    if (stage === "update") {
      return `<svg viewBox="0 0 320 300" role="img" aria-label="Front of display showing the new sign, updating within 3 to 5 minutes">
        <rect x="0" y="0" width="320" height="300" rx="12" fill="var(--wall)"/>
        <rect x="30" y="34" width="260" height="150" rx="5" fill="var(--hw-frame)"/>
        <rect x="35" y="39" width="250" height="140" rx="2" fill="#1a1b1e"/>
        <rect x="35" y="39" width="250" height="34" fill="var(--tint)"/>
        <rect x="45" y="51" width="90" height="10" rx="3" fill="#fff" opacity=".9"/>
        <rect x="241" y="43" width="40" height="26" fill="#fff"/>
        <text x="120" y="150" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="60" fill="#fff">$5<tspan font-size="28" dy="-24">97</tspan></text>
        <g transform="translate(262 190)">
          <circle r="28" fill="var(--surface)" stroke="var(--pending)" stroke-width="4"/>
          <path d="M0 -14v14l9 6" stroke="var(--pending)" stroke-width="4" fill="none" stroke-linecap="round"/>
        </g>
        <rect x="88" y="244" width="144" height="34" rx="17" fill="var(--surface)"/>
        <text x="160" y="266" text-anchor="middle" font-family="var(--f-mono)" font-size="14" font-weight="700" fill="var(--fg)">3–5 MIN</text>
      </svg>`;
    }
    return rearPocket(stage);
  }

  /* wake steps: one list for every task (Install, Update Content, Replace, Maintenance) */
  const WAKE_STEPS = [
    { art: "where", title: "Find the pocket", lines: ["Go to the back of the display.", "The pocket is on the left side as you face the screen."] },
    { art: "find", title: "Find the pusher tab", lines: ["Reach into the pocket.", "The tab is the outer end of the pusher, toward the edge. The button is at the other end."] },
    { art: "hold", title: "Push it in for 3 seconds", lines: ["Push the tab straight in, toward the button.", "Count to three, then let go."] },
    { art: "green", title: "The light turns green", lines: ["The light just below the button turns green."] },
    { art: "blink", title: "Then it blinks", lines: ["Then it blinks red or orange.", "That’s a good sign. The display is taking the sign."] },
    { art: "update", title: "The sign updates", lines: ["The screen changes in 3–5 minutes.", "You don’t need to wait."] },
  ];

  /* ---------- where to find the location (Install › Location) ----------
     Drawn from field photos. Blue strip reads top to bottom: Zone, Aisle, Section.
     White location label: Section large on the left; Zone over Aisle on the right.
     Each part carries data-part so the field being typed lights up its piece (CSS). */
  function locate(kind = "endcap") {
    const BLUE = "#1a5fd0", INKW = "#ffffff";
    const tile = (part, x, y, w, h, t, fs) => `<g data-part="${part}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${BLUE}"/>
      <text x="${x + w / 2}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" font-family="var(--f-body)" font-weight="800" font-size="${fs}" fill="${INKW}">${t}</text>
      <rect class="hl" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="5" fill="none" stroke="var(--tint)" stroke-width="3"/></g>`;
    // white label: big section left, zone over aisle right, barcode under
    const lab = (x, y, sec, zone, aisle, w = 74) => {
      const h = 40;
      let bc = ""; for (let i = 0; i < Math.floor((w - 12) / 2.3); i++) bc += `<rect x="${x + 6 + i * 2.3}" y="${y + 31}" width="${i % 3 ? 1 : 1.6}" height="6" fill="#222"/>`;
      return `<g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#f4f4f2" stroke="#c9ccd0"/>
        <g data-part="section"><text x="${x + 6}" y="${y + 26}" font-family="var(--f-body)" font-weight="800" font-size="${sec.length > 2 ? (w < 70 ? 17 : 20) : 24}" fill="#111">${sec}</text>
          <rect class="hl" x="${x + 2}" y="${y + 4}" width="${sec.length > 2 ? (w < 70 ? 33 : 40) : 22}" height="26" rx="3" fill="none" stroke="var(--tint)" stroke-width="2.5"/></g>
        <g data-part="zone"><text x="${x + w - 12}" y="${y + 14}" text-anchor="middle" font-family="var(--f-body)" font-weight="800" font-size="11" fill="#111">${zone}</text>
          <rect class="hl" x="${x + w - 24}" y="${y + 3}" width="24" height="14" rx="3" fill="none" stroke="var(--tint)" stroke-width="2.5"/></g>
        <g data-part="aisle"><text x="${x + w - 12}" y="${y + 27}" text-anchor="middle" font-family="var(--f-body)" font-weight="800" font-size="11" fill="#111">${aisle}</text>
          <rect class="hl" x="${x + w - 24}" y="${y + 17}" width="24" height="13" rx="3" fill="none" stroke="var(--tint)" stroke-width="2.5"/></g>
        ${bc}</g>`;
    };
    const call = (part, y, x0, x1, word) => `<g data-part="${part}">
      <path d="M${x0} ${y}H${x1}" stroke="var(--fg-3)" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text class="cl" x="${x1 + 6}" y="${y + 5}" font-family="var(--f-body)" font-weight="700" font-size="14">${word}</text></g>`;
    const code = (x, y, t) => `<text x="${x}" y="${y}" font-family="var(--f-mono)" font-weight="700" font-size="13" fill="var(--fg-2)">= ${t}</text>`;

    if (kind === "produce") {
      return `<svg viewBox="0 0 320 200" role="img" aria-label="Produce table corner: blue strip reads AP, 3, 2. White label reads 2, AP over 3. Location AP3-2.">
        <rect width="320" height="200" rx="12" fill="var(--wall)"/>
        ${[30, 52, 74, 96].map((cx, i) => `<circle cx="${cx}" cy="22" r="11" fill="${i % 2 ? "#e9a23b" : "#8cc152"}" opacity=".85"/>`).join("")}
        <rect x="12" y="30" width="196" height="40" rx="5" fill="var(--hw-back-2)"/>
        ${lab(118, 30 + 0, "2", "AP", "3")}
        <rect x="12" y="70" width="196" height="122" fill="#b8875a"/>
        <rect x="70" y="78" width="54" height="114" rx="4" fill="var(--hw-frame)"/>
        ${tile("zone", 76, 86, 42, 30, "AP", 15)}
        ${tile("aisle", 76, 119, 42, 30, "3", 15)}
        ${tile("section", 76, 152, 42, 30, "2", 15)}
        ${call("zone", 101, 122, 222, "Zone")}
        ${call("aisle", 134, 122, 222, "Aisle")}
        ${call("section", 167, 122, 222, "Section")}
        ${code(222, 60, "AP3-2")}
      </svg>`;
    }
    // endcap: aisle header sign with the big customer aisle number (not the location), strip in the upright, label under it
    return `<svg viewBox="0 0 320 200" role="img" aria-label="Endcap: blue strip reads A, 5, 100. White label reads 100, A over 5. Location A5-100. The big aisle number 62 is not the location.">
      <rect width="320" height="200" rx="12" fill="var(--wall)"/>
      <rect x="12" y="14" width="112" height="16" fill="${BLUE}"/>
      <rect x="12" y="30" width="112" height="118" fill="#3b3e44"/>
      <text x="68" y="112" text-anchor="middle" font-family="var(--f-body)" font-weight="700" font-size="64" fill="#8f949c">62</text>
      <text x="68" y="140" text-anchor="middle" font-family="var(--f-body)" font-weight="700" font-size="11" fill="#c9ced6">NOT THE LOCATION</text>
      <rect x="190" y="10" width="10" height="182" fill="var(--hw-frame)"/>
      <rect x="124" y="34" width="66" height="156" rx="4" fill="var(--hw-frame)"/>
      ${tile("zone", 133, 40, 48, 30, "A", 16)}
      ${tile("aisle", 133, 73, 48, 30, "5", 16)}
      ${tile("section", 133, 106, 48, 30, "100", 15)}
      ${lab(127, 144, "100", "A", "5", 60)}
      ${call("zone", 55, 204, 226, "Zone")}
      ${call("aisle", 88, 204, 226, "Aisle")}
      ${call("section", 121, 204, 226, "Section")}
      ${code(214, 172, "A5-100")}
    </svg>`;
  }

  /* ---------- where to scan (v0.9.6): the 5-digit ID label on the left edge of the frame, as you face the screen ----------
     Left: the whole display from the front with the left edge marked. Right: close-up of the label (from Clay's render). */
  function scanSpot() {
    return `<figure class="where-scan">
      <svg viewBox="0 0 160 110" role="img" aria-label="Front of a landscape display; the ID label is on the left edge of the frame">
        <rect x="18" y="14" width="134" height="80" rx="4" fill="var(--hw-frame)"/>
        <rect x="23" y="19" width="124" height="70" rx="1.5" fill="var(--hw-paper)"/>
        <rect x="12" y="11" width="12" height="86" rx="4" fill="none" stroke="var(--tint)" stroke-width="2.6"/>
        <rect x="14.5" y="40" width="7" height="28" rx="1.5" fill="#fff"/>
        <path d="M16 44h4M16 47h4M16 49.5h4M16 53h4M16 56h4M16 59h4M16 62h4M16 64.5h4" stroke="#111" stroke-width="1.1"/>
        <text x="85" y="104" text-anchor="middle" font-family="var(--f-mono)" font-size="8.5" font-weight="700" fill="var(--fg-2)">YOU ARE FACING THE SCREEN</text>
      </svg>
      <span class="ws-photo"><img src="assets/guide/scan-label.jpg" alt="Close-up: white barcode label with a 5-digit number on the left edge of the frame"/><i class="ws-ring" aria-hidden="true"></i></span>
      <figcaption>Scan the label on the <b>left edge</b> of the frame, as you face the screen.</figcaption>
    </figure>`;
  }

  /* after Push Content (v0.9.6): the display wakes by itself (ESL inside, Bluetooth); the button steps are the fallback */
  /* v0.9.7: the wake is the main event — a big "waking" picture with the light pulsing on the left edge;
     the button steps sit folded away under a small link, for when it doesn't wake. */
  const autoWake = (backup = "") => `<div class="auto-wake" role="status">
      <svg class="aw-art" viewBox="0 0 320 170" aria-hidden="true">
        <rect x="66" y="22" width="232" height="128" rx="6" fill="var(--hw-frame)"/>
        <rect x="72" y="28" width="220" height="116" rx="2" fill="var(--hw-paper)"/>
        <rect x="72" y="28" width="220" height="26" fill="var(--tint)" opacity=".85"/>
        <rect x="82" y="74" width="92" height="40" rx="4" fill="var(--hw-frame)" opacity=".18"/>
        <rect x="190" y="78" width="88" height="8" rx="4" fill="var(--hw-frame)" opacity=".14"/>
        <rect x="190" y="94" width="64" height="8" rx="4" fill="var(--hw-frame)" opacity=".1"/>
        <rect x="72" y="28" width="220" height="116" fill="url(#awSheen)" class="aw-sheen"/>
        <defs><linearGradient id="awSheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
        <rect x="112" y="156" width="140" height="6" rx="3" fill="var(--hw-frame)" opacity=".12"/>
        <rect class="aw-bar" x="112" y="156" width="46" height="6" rx="3" fill="var(--ok, #17865a)"/>
      </svg>
      <div class="aw-copy">
        <b>Display is updating</b>
        <span>The new sign is on its way.</span>
        <span class="aw-sub">The screen changes in 3–5 minutes. You don’t need to wait.</span>
      </div>
    </div>
    ${backup ? `<details class="aw-backup"><summary>Not updating? Wake it with the button</summary><div class="aw-backup-body">${backup}</div></details>` : ""}`;

  // the folded button steps: when opened, put the swipe guide back on its current slide (it had no width while folded)
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (!d.classList || !d.classList.contains("aw-backup") || !d.open) return;
    const track = d.querySelector(".carousel"); if (!track) return;
    const dots = [...d.querySelectorAll(".dot")];
    const i = Math.max(0, dots.findIndex((x) => x.getAttribute("aria-selected") === "true"));
    track.scrollTo({ left: i * track.clientWidth, behavior: "auto" });
  }, true);

  window.ECArt = { rear, rearOverview, label, tools, access, home, bars, wake, locate, WAKE_STEPS, scanSpot, autoWake };
})();
