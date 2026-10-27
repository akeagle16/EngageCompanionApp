/* content.html — Update Content: change the sign on displays that are already installed.
   Find (scan, or Zone → Aisle list) → Current sign → Price type → Details → Preview + Push Content → Wake → Sent.
   No battery, orientation or location steps: those come from the display's record.
   v0.9.5: the app stores the sign image only, not the data behind it. Sign type, item and prices start empty every time;
   the tech picks the type, scans or types the item, and types the price (and Was price on a markdown).
   Status: Waiting for wake → Updated (Wi-Fi connection after the push) · Not confirmed after 7 min with none. */
(function () {
  "use strict";
  const { state, save, site, go, guard, esc, I, header, bindHeader, haptic, SERIAL_LEN, STATUS } = EC;
  if (!guard()) return;

  const FLOW_V = 4; // v0.9.5 nothing prefilled from the current sign
  const SPARK = '<svg class="spark" viewBox="-16 -16 32 32" aria-hidden="true"><g fill="currentColor">' +
    [0, 60, 120, 180, 240, 300].map((r) => `<rect x="-2.1" y="-15" width="4.2" height="10" rx="2.1" transform="rotate(${r})"/>`).join("") + "</g></svg>";
  const TYPES = [
    { id: "edlp", label: "Everyday Low Price", was: false, mark: SPARK },
    { id: "rollback", label: "Rollback", was: true, mark: SPARK },
    { id: "clearance", label: "Clearance", was: true, mark: SPARK },
    { id: "manager", label: "Manager’s Special", was: true, mark: "" },
  ];
  const UOM = ["ea", "lb", "ct", "oz", "fl oz", "gal", "pk"];
  const NO_SIZE = ["ea", "lb"];
  const PLU = Object.fromEntries((window.ECPLU || []).map(([plu, name, size, uom, img]) => [plu, { plu, name, size, uom, img }]));
  const RETAILER = new Set(window.ECPLU_RETAILER || []);
  const pluLookup = (code) => {
    if (/^\d{4}$/.test(code) && PLU[code]) return PLU[code];
    if (/^9\d{4}$/.test(code) && PLU[code.slice(1)]) { const p = PLU[code.slice(1)]; return Object.assign({}, p, { name: "Organic " + p.name }); }
    return null;
  };

  const STEPS = ["find", "current", "type", "details", "preview", "wake", "done"];
  const COPY = {
    find: ["Which display?", "Scan it, or pick it from the list."],
    current: ["This is on the display now", ""],
    type: ["Which sign is this?", ""],
    details: ["Enter the sign details", "Check the item and the price."],
    preview: ["Check the sign", "This is what the display will show."],
    wake: ["Sign pushed", ""],
    done: ["Sign sent", ""],
  };
  const WAKE = ECArt.WAKE_STEPS; // the pusher (v0.9): one list for every task

  const fresh = () => ({ v: FLOW_V, step: "find", sel: [], open: {}, type: null, desc: "", plu: "", img: "", priceC: "", wasC: "", uom: "", size: "",
    wakeIdx: 0, wakeSlide: 0, wakeOnly: false, wakeSel: [], reject: null, baseFor: "" });
  let f = state.flows.content;
  if (!f || f.v !== FLOW_V) f = fresh();
  f = state.flows.content = Object.assign(fresh(), f);

  const s = site();
  const $ = (id) => document.getElementById(id);

  /* ---------- data ---------- */
  const fleetNow = () => EC.fleet(s.id);
  const byId = (sn) => fleetNow().find((d) => d.serial === sn);
  const selected = () => f.sel.map(byId).filter(Boolean);
  const ORIENT_ALL = "landscape"; // v0.9.5: every display hangs landscape
  /* who gets woken: the whole selection, or (Just wake / Wake it again) a smaller list that leaves the selection alone */
  const wakeList = () => (f.wakeOnly ? f.wakeSel : f.sel);
  const loc = EC.locCode;
  const chip = (st) => `<span class="status ${STATUS[st].cls}">${st === "updated" ? I.ok : st === "waiting" ? I.clock : I.x}${STATUS[st].word}</span>`;
  const thumb = (d, cls = "thumb") => `<span class="${cls}" data-o="${d.orient}">${ECSign.render(Object.assign({ orient: d.orient }, d.sign))}</span>`;

  /* ---------- money ---------- */
  const normCents = (v) => String(v).replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 6);
  const centsToNum = (c) => (c ? Number(c) / 100 : null);
  const fmtMoney = (c) => { if (!c) return ""; const p = c.padStart(3, "0"); return `$${Number(p.slice(0, -2)).toLocaleString("en-US")}.${p.slice(-2)}`; };
  const typeOf = () => TYPES.find((t) => t.id === f.type);
  const sizeNeeded = () => !NO_SIZE.includes(f.uom);

  /* Was price is typed by the tech on every markdown (required). Going to Everyday Low Price clears it. */
  function applyType(id) {
    f.type = id;
    const t = TYPES.find((x) => x.id === id);
    if (!t.was) f.wasC = "";
  }

  /* ---------- validity ---------- */
  function valid() {
    switch (f.step) {
      case "find": return f.sel.length > 0;
      case "type": return !!f.type;
      case "details": { const t = typeOf(); return !!(f.itemCode && f.priceC && (!t || !t.was || f.wasC)); } // v0.9: item from the approved list
      case "preview": return pv.canPush(previewKey());
      default: return true;
    }
  }
  /* preview build (js/preview.js): Push Content stays locked until it's back; 30 s limit */
  const pv = ECPreview.controller(() => { if (f.step === "preview") render(); });
  const previewKey = () => JSON.stringify(signOpts());
  const nextLabel = () => ({
    find: f.sel.length > 1 ? `Update ${f.sel.length} displays` : "Continue",
    current: "Change the sign",
    details: "Preview sign",
    preview: "Push Content",
    wake: f.wakeIdx < wakeList().length - 1 ? "Next display" : "Done",
  }[f.step] || "Continue");

  function setStep(st) { scanner.stop(); f.step = st; f.reject = null; save(); render(); const b = $("body"); if (b) b.scrollTop = 0; }

  function startSign() {
    // v0.9.5: nothing comes from the current sign (only its image is stored). Fields start empty once per selection;
    // going Back to Current sign and forward again keeps what was typed.
    const key = f.sel.join(",");
    if (f.baseFor === key) return;
    f.baseFor = key;
    Object.assign(f, { type: null, desc: "", plu: "", img: "", uom: "", size: "", priceC: "", priceFrom: "", wasC: "", itemCode: "", codeTyped: "" });
  }

  function next() {
    if (!valid()) return;
    const n = wakeList().length;
    if (f.step === "current") { f.wakeOnly = false; f.wakeSel = []; startSign(); return setStep("type"); }
    if (f.step === "preview") {
      EC.recordPush(f.sel.slice(), signOpts());
      haptic(); f.wakeIdx = 0; f.wakeSlide = 0; return setStep("wake");
    }
    if (f.step === "wake") {
      EC.markWoken(wakeList()[f.wakeIdx]);
      if (f.wakeIdx < n - 1) { f.wakeIdx++; f.wakeSlide = 0; save(); render(); return; }
      return setStep("done");
    }
    setStep(STEPS[STEPS.indexOf(f.step) + 1]);
  }
  function back() {
    if (f.step === "find") { go("home"); return; }
    if (f.step === "wake" && f.wakeIdx > 0) { f.wakeIdx--; f.wakeSlide = 0; save(); render(); return; }
    if (f.step === "wake" && f.wakeOnly) return setStep("current");
    setStep(STEPS[STEPS.indexOf(f.step) - 1]);
  }
  function openBatteryGuide() { scanner.stop(); state.flows.battery = { step: 0, returnTo: "content" }; go("battery"); }

  /* ---------- selection ---------- */
  function trySelect(sn, { fromScan = false, quiet = false } = {}) {
    const d = byId(sn);
    if (!d) {
      const known = EC.DEVICES.find((x) => x.serial === sn);
      const other = known && known.siteId !== state.siteId && EC.site(known.siteId);
      f.reject = { serial: sn, why: other ? `Registered to ${other.name}.` : "Not installed at this site. Use Install first." };
      save(); paintFind(); return false;
    }
    f.reject = null;
    const added = !f.sel.includes(sn);
    if (added) { f.sel.push(sn); if (fromScan) haptic(40); }
    f.open[d.zone] = true; f.open[d.zone + d.aisle] = true; // reveal it in the list
    save(); paintFind();
    if (added && !quiet) askPartner(d);
    return added;
  }
  function toggle(sn) {
    if (f.sel.includes(sn)) { f.sel = f.sel.filter((x) => x !== sn); f.reject = null; save(); paintFind(); }
    else trySelect(sn, { quiet: true });
  }
  function toggleLoc(key) {
    const grp = fleetNow().filter((d) => loc(d) === key);
    if (grp.every((d) => f.sel.includes(d.serial))) { f.sel = f.sel.filter((sn) => !grp.some((d) => d.serial === sn)); f.reject = null; save(); paintFind(); }
    else askLocation(key);
  }

  /* ---------- scanner (same behavior as Install: tap to start, keeps scanning, wrong codes shake) ---------- */
  const norm = (v) => String(v).replace(/[^0-9]/g, "").slice(0, SERIAL_LEN);
  const isSerialShape = (v) => new RegExp(`^[0-9]{${SERIAL_LEN}}$`).test(v);
  const ZXING_URL = "lib/zxing.min.js"; // bundled (Apache-2.0) so iPhone scanning works offline
  const scanner = {
    state: "idle", stream: null, raf: 0, zx: null, lastShake: 0, seen: {}, torch: false,
    async start() {
      if (this.state === "starting" || this.state === "running") return;
      this.paint("starting");
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no-camera-api");
        const video = $("scan-video");
        if ("BarcodeDetector" in window) {
          const det = new window.BarcodeDetector({ formats: ["code_128", "code_39", "qr_code", "data_matrix", "ean_13"] });
          this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          if (this.state !== "starting") { this.release(); return; }
          video.srcObject = this.stream; await video.play(); this.paint("running");
          const tick = async () => {
            if (this.state !== "running") return;
            try { for (const c of await det.detect(video)) this.handle(c.rawValue); } catch { /* frame not ready */ }
            this.raf = requestAnimationFrame(tick);
          };
          tick();
        } else {
          if (!window.ZXing) await new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = ZXING_URL; sc.onload = ok; sc.onerror = () => bad(new Error("zxing-load")); document.head.appendChild(sc); });
          if (this.state !== "starting") return;
          this.zx = new window.ZXing.BrowserMultiFormatReader();
          await this.zx.decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video, (res) => { if (res && this.state === "running") this.handle(res.getText()); });
          this.stream = video.srcObject;
          if (this.state !== "starting") { this.release(); return; }
          this.paint("running");
        }
        this.offerTorch();
      } catch (e) {
        this.release();
        this.paint("failed", e && e.name === "NotAllowedError" ? "Camera permission was declined." : "The camera couldn’t start here.");
      }
    },
    handle(raw) {
      const v = String(raw || "").trim(), now = Date.now(); // a scan must be exactly 5 digits (a UPC is not cut down to 5)
      if (isSerialShape(v)) {
        // a code in view counts once: it must leave the frame for 2.5 s before it's read again
        if (now - (this.seen[v] || 0) < 2500) { this.seen[v] = now; return; } // still in view (each code tracked, so two in frame don't alternate)
        this.seen[v] = now;
        if (!trySelect(v, { fromScan: true })) return; // rejected or already selected: no green
        const c = document.querySelector(".scanner .cam");
        if (c) { c.classList.remove("got"); void c.offsetWidth; c.classList.add("got"); }
        return;
      }
      if (now - this.lastShake > 900) {
        this.lastShake = now;
        const fr = document.querySelector(".scanner .cam .vf-frame");
        if (fr) { fr.classList.remove("shake"); void fr.offsetWidth; fr.classList.add("shake"); }
      }
    },
    offerTorch() {
      const track = this.stream && this.stream.getVideoTracks && this.stream.getVideoTracks()[0];
      const caps = track && track.getCapabilities ? track.getCapabilities() : {};
      const b = $("torch");
      if (b && caps.torch) {
        b.hidden = false;
        b.onclick = async () => { this.torch = !this.torch; try { await track.applyConstraints({ advanced: [{ torch: this.torch }] }); } catch { /* ignore */ } b.setAttribute("aria-pressed", String(this.torch)); };
      }
    },
    release() {
      cancelAnimationFrame(this.raf);
      try { this.zx && this.zx.reset(); } catch { /* ignore */ }
      this.zx = null;
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      const v = $("scan-video"); if (v) v.srcObject = null;
      this.torch = false;
    },
    stop() { if (this.state === "idle") return; this.release(); this.paint("idle"); },
    paint(st, msg) {
      this.state = st;
      const el = $("scanner"); if (!el) return;
      el.dataset.state = st;
      $("cam-msg").textContent = { idle: "", starting: "Starting camera…", running: "Scan each display. Tap × when done.", failed: msg || "" }[st];
    },
  };
  addEventListener("visibilitychange", () => { if (document.hidden) scanner.stop(); });
  addEventListener("pagehide", () => scanner.release());

  /* ---------- find: Zone → Aisle → display ---------- */
  function treeHtml() {
    const all = fleetNow();
    if (!all.length) return `<div class="empty">No displays installed at this site yet.</div>`;
    const zones = {};
    all.forEach((d) => { ((zones[d.zone] = zones[d.zone] || {})[d.aisle] = zones[d.zone][d.aisle] || []).push(d); });
    const num = (a, b) => Number(a) - Number(b);
    return Object.keys(zones).sort().map((z) => {
      const aisles = zones[z];
      const count = Object.values(aisles).reduce((n, l) => n + l.length, 0);
      const zOpen = !!f.open[z];
      return `
        <div class="tree-zone">
          <button class="tree-row zone" data-open="${esc(z)}" aria-expanded="${zOpen}">
            <span class="caret">${I.next}</span><span class="tree-name">Zone ${esc(z)}</span>
            <span class="tree-meta">${Object.keys(aisles).length} aisle${Object.keys(aisles).length > 1 ? "s" : ""} · ${count}</span>
          </button>
          ${zOpen ? Object.keys(aisles).sort(num).map((a) => {
            const list = aisles[a].sort((x, y) => num(x.section, y.section));
            const key = z + a;
            const aOpen = !!f.open[key];
            const pickable = list;
            const allIn = pickable.length && pickable.every((d) => f.sel.includes(d.serial));
            return `
              <div class="tree-aisle">
                <div class="tree-row aisle">
                  <button class="tree-open" data-open="${esc(key)}" aria-expanded="${aOpen}"><span class="caret">${I.next}</span><span class="tree-name">Aisle ${esc(a)}</span><span class="tree-meta">${list.length}</span></button>
                  <button class="tree-all" data-all="${esc(key)}" aria-pressed="${!!allIn}" ${pickable.length ? "" : "disabled"}>${allIn ? "Clear" : "Select all"}</button>
                </div>
                ${aOpen ? groupsOf(list).map((grp) => grp.length === 1 ? devRow(grp[0]) : pairRow(grp)).join("") : ""}
              </div>`;
          }).join("") : ""}
        </div>`;
    }).join("");
  }
  /* displays in an aisle, grouped by location (a location holds up to two: produce corners) */
  function groupsOf(list) {
    const g = {};
    list.forEach((d) => (g[loc(d)] = g[loc(d)] || []).push(d));
    return Object.values(g).map((x) => x.sort((p, q) => p.serial.localeCompare(q.serial)));
  }
  function devRow(d) {
    const on = f.sel.includes(d.serial);
    return `
      <button class="tree-dev" data-pick="${d.serial}" aria-pressed="${on}">
        <span class="check" aria-hidden="true">${on ? I.ok : ""}</span>
        ${thumb(d)}
        <span class="dev-meta"><b class="mono">${esc(loc(d))}</b><span class="note mono">${esc(d.serial)}</span><span class="dev-line">${chip(d.status)}${EC.health(d)}</span></span>
      </button>`;
  }
  function pairRow(grp) {
    const key = loc(grp[0]);
    const ons = grp.filter((d) => f.sel.includes(d.serial)).length;
    const same = grp.every((d) => JSON.stringify(d.sign) === JSON.stringify(grp[0].sign));
    return `
      <button class="tree-dev pair" data-pickloc="${esc(key)}" aria-pressed="${ons === grp.length}">
        <span class="check" aria-hidden="true">${ons === grp.length ? I.ok : ons ? '<i class="part"></i>' : ""}</span>
        ${same ? thumb(grp[0]) : `<span class="thumb-pair${grp.length > 2 ? " many" : ""}">${grp.map((d) => thumb(d)).join("")}</span>`}
        <span class="dev-meta"><b class="mono">${esc(key)}<span class="pair-tag">${grp.length} displays</span></b>
          <span class="note">${same ? "Same sign" : "Different signs"}</span>
          ${grp.map((d) => `<span class="dev-line"><span class="note mono">${esc(d.serial)}${f.sel.includes(d.serial) ? " ✓" : ""}</span>${chip(d.status)}${EC.health(d)}</span>`).join("")}</span>
      </button>`;
  }
  /* tapping a shared location asks: same sign on both, or just one (pick it, or scan the one in front of you) */
  function askLocation(key) {
    const grp = fleetNow().filter((d) => loc(d) === key);
    const { el, close } = EC.sheet(`
      <h3>${esc(key)} has ${EC.numWord(grp.length)} displays</h3>
      <div class="opt-list">
        <button class="btn" data-both="1">${grp.length === 2 ? "Both" : `All ${EC.numWord(grp.length)}`} · same sign</button>
        ${grp.map((d) => `<button class="btn ghost" data-one="${d.serial}">Just <span class="mono">${esc(d.serial)}</span></button>`).join("")}
      </div>
      <p class="note" style="margin:0">Not sure which is which? Close this and scan the one you’re updating.</p>`, { label: `${key} has ${grp.length} displays` });
    el.querySelector("[data-both]").onclick = () => { close(); grp.forEach((d) => trySelect(d.serial, { quiet: true })); };
    el.querySelectorAll("[data-one]").forEach((b) => b.onclick = () => {
      close();
      f.sel = f.sel.filter((sn) => !grp.some((d) => d.serial === sn));
      trySelect(b.dataset.one, { quiet: true });
    });
  }
  /* scanning or typing one display at a shared location offers the others (up to four share a location) */
  function askPartner(d) {
    const mates = fleetNow().filter((x) => x.serial !== d.serial && loc(x) === loc(d) && !f.sel.includes(x.serial));
    if (!mates.length) return;
    const all = mates.length + 1;
    const { el, close } = EC.sheet(`
      <h3>${esc(d.serial)} shares ${esc(loc(d))} with ${esc(EC.andList(mates.map((x) => x.serial)))}</h3>
      <p class="note" style="margin:0">Update ${all === 2 ? "both" : `all ${EC.numWord(all)}`} with the same sign?</p>
      <div class="opt-list">
        <button class="btn" data-both="1">Update ${all === 2 ? "both" : `all ${EC.numWord(all)}`}</button>
        <button class="btn ghost" data-one="1">Just this one</button>
      </div>`, { label: "Shared location" });
    el.querySelector("[data-both]").onclick = () => { close(); mates.forEach((x) => trySelect(x.serial, { quiet: true })); };
    el.querySelector("[data-one]").onclick = () => close();
  }

  function paintFind() {
    if (f.step !== "find") return;
    const t = $("tree"); if (t) t.innerHTML = treeHtml();
    $("scan-reject").innerHTML = f.reject ? `<div class="result bad" role="alert"><strong class="mono">${esc(f.reject.serial)}</strong><p>${esc(f.reject.why)}</p></div>` : "";
    $("sel-bar").innerHTML = f.sel.length ? `<span><b>${f.sel.length}</b> selected</span><button class="link" id="sel-clear">Clear</button>` : `<span class="note">Nothing selected yet</span>`;
    bindFind();
    refreshNext();
  }
  function bindFind() {
    document.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => { const k = b.dataset.open; f.open[k] = !f.open[k]; save(); paintFind(); });
    document.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => toggle(b.dataset.pick));
    document.querySelectorAll("[data-pickloc]").forEach((b) => b.onclick = () => toggleLoc(b.dataset.pickloc));
    document.querySelectorAll("[data-all]").forEach((b) => b.onclick = () => {
      const key = b.dataset.all;
      const list = fleetNow().filter((d) => d.zone + d.aisle === key);
      const pickable = list; // v0.9.5: every display is landscape, so any can share a batch
      const allIn = pickable.every((d) => f.sel.includes(d.serial));
      if (allIn) f.sel = f.sel.filter((sn) => !pickable.some((d) => d.serial === sn));
      else pickable.forEach((d) => { if (!f.sel.includes(d.serial)) f.sel.push(d.serial); });
      f.reject = null; save(); paintFind();
    });
    const clr = $("sel-clear"); if (clr) clr.onclick = () => { f.sel = []; f.reject = null; save(); paintFind(); };
    const serial = $("serial");
    if (serial && !serial.dataset.bound) {
      serial.dataset.bound = "1";
      serial.addEventListener("focus", () => scanner.stop());
      serial.addEventListener("input", () => {
        const v = norm(serial.value); serial.value = v; $("len").textContent = `${v.length}/${SERIAL_LEN}`;
        if (v.length === SERIAL_LEN) { trySelect(v); serial.value = ""; $("len").textContent = `0/${SERIAL_LEN}`; }
      });
    }
  }

  /* ---------- pieces ---------- */
  const typeBand = (t) => `<span class="sign-band" data-type="${t.id}">${t.mark}<span class="sign-label">${esc(t.label)}</span>${t.was ? `<span class="sign-was">Was:<b>$—</b></span>` : ""}</span>`;
  const signOpts = () => ({ orient: ORIENT_ALL, type: f.type || "edlp", priceC: f.priceC, wasC: f.wasC, uom: f.uom,
    size: sizeNeeded() ? f.size : "", desc: f.desc, plu: f.plu, img: f.img });
  const eSign = () => `<div class="esign" data-o="${ORIENT_ALL}" id="esign">${ECSign.render(signOpts())}</div>`;
  ECSign.ready.then(() => { const el = $("esign"); if (el) el.innerHTML = ECSign.render(signOpts()); if (f.step === "find") paintFind(); });

  function eyebrow() {
    const sel = selected(), n = sel.length;
    if (!n || f.step === "find" || f.step === "done") return "";
    if (f.step === "wake") { const w = wakeList(), d = byId(w[f.wakeIdx]); return d ? `<div class="eyebrow-row"><span class="id-tag mono">${esc(d.serial)}</span><span>${esc(loc(d))}${w.length > 1 ? ` · ${f.wakeIdx + 1} of ${w.length}` : ""}</span></div>` : ""; }
    if (n > 1) return `<div class="eyebrow-row"><span class="id-tag">${n} displays</span><span>Same sign</span></div>`;
    return `<div class="eyebrow-row"><span class="id-tag mono">${esc(sel[0].serial)}</span><span>${esc(loc(sel[0]))}</span></div>`;
  }

  function body() {
    switch (f.step) {
      case "find": return `
        <div class="serial-field"><input class="input" id="serial" autocomplete="off" inputmode="numeric" pattern="[0-9]*" spellcheck="false" aria-label="Display ID" placeholder="Or type the display ID" /><span class="len" id="len">0/${SERIAL_LEN}</span></div>
        <div id="scan-reject"></div>
        <div class="sel-bar" id="sel-bar"></div>
        <div class="tree" id="tree"></div>`;

      case "current": {
        const sel = selected();
        const waiting = sel.filter((d) => d.status === "waiting"), unconf = sel.filter((d) => d.status === "unconfirmed");
        const lowBatt = sel.filter((d) => EC.battLevel(d.battery) === "bad");
        const same = sel.every((d) => JSON.stringify(d.sign) === JSON.stringify(sel[0].sign));
        return `
          ${sel.length === 1 || same
            ? `<div class="esign" data-o="${sel[0].orient}">${ECSign.render(Object.assign({ orient: sel[0].orient }, sel[0].sign))}</div>
               <div class="cur-row">${sel.length === 1 ? `<span class="mono"><b>${esc(loc(sel[0]))}</b></span>${chip(sel[0].status)}` : `<span class="note">All ${sel.length} displays show this sign.</span>`}</div>`
            : `<div class="cur-list">${sel.map((d) => `<div class="cur-item">${thumb(d, "thumb big")}<span class="dev-meta"><b class="mono">${esc(loc(d))}</b>${chip(d.status)}</span></div>`).join("")}</div>
               <p class="note" style="margin:0">These displays show different signs. They will all get the same new sign.</p>`}
          ${EC.nz("checkin", `<section class="checkin" aria-label="Last check-in">
            <h3>Last check-in</h3>
            ${sel.map((d) => `<div class="ck-row"><span class="ck-where"><b class="mono">${esc(loc(d))}${sel.length > 1 ? ` <span class="note mono">${esc(d.serial)}</span>` : ""}</b><span class="note">${d.seenAt ? esc(EC.ago(d.seenAt)) : ""}</span></span>${EC.health(d)}</div>`).join("")}
            <p class="note" style="margin:0">From the display’s last Wi-Fi connection. Not live.</p>
          </section>`)}
          ${lowBatt.length ? `<div class="hint-row as-note bad">${I.warn}<span>Battery was at ${lowBatt.map((d) => `<b>${d.battery}%</b> on <b>${esc(loc(d))}</b>`).join(", ")} at the last check-in. Swap it before you wake the display.</span></div>
          <button class="btn ghost" id="swap-now">Swap Battery</button>` : ""}
          ${waiting.length ? `<div class="hint-row as-note">${I.clock}<span>A sign is still waiting for a wake on <b>${waiting.map((d) => esc(loc(d))).join(", ")}</b>. A new push replaces it.</span></div>` : ""}
          ${unconf.length ? `<div class="hint-row as-note bad">${I.warn}<span>The last sign on <b>${unconf.map((d) => esc(loc(d))).join(", ")}</b> was not confirmed. Wake it to finish, or send a new sign.</span></div>` : ""}
          ${waiting.length || unconf.length ? `<button class="btn ghost" id="wake-only">Just wake ${waiting.length + unconf.length > 1 ? "them" : "it"}</button>` : ""}
          <p class="note" style="margin:0">Doesn’t match the screen in front of you? Wake the display. It takes the last sign sent.</p>`;
      }

      case "type": return `<div class="sign-list">${TYPES.map((t) => `<button class="sign-card" data-type-pick="${t.id}" aria-pressed="${f.type === t.id}" ${f.type && f.type !== t.id ? 'data-dim="1"' : ""}>${typeBand(t)}</button>`).join("")}</div>`;

      case "details": {
        const t = typeOf();
        return `
          ${t ? `<div class="sign-chip">${typeBand(t)}</div>` : ""}
          ${ECItem.html(f)}
          ${(`<div class="field"><label for="d-price">Price</label>
            <input class="input big money" id="d-price" data-money="priceC" value="${esc(fmtMoney(f.priceC))}" inputmode="numeric" pattern="[0-9]*" placeholder="$0.00" autocomplete="off" />
            <span class="field-note" id="price-note">${ECItem.priceNote(f)}</span>
            </div>`)}
          ${t && t.was ? `<div class="field"><label for="d-was">Was price</label>
            <input class="input big money" id="d-was" data-money="wasC" value="${esc(fmtMoney(f.wasC))}" inputmode="numeric" pattern="[0-9]*" placeholder="$0.00" autocomplete="off" />
            <span class="field-note${wasNote().startsWith("Was price is not") ? " warn" : ""}" id="was-note">${wasNote()}</span></div>` : ""}`;
      }

      case "preview": return `${pv.ready(previewKey()) ? eSign() + (navigator.onLine ? "" : `<div class="offline-note" role="status"><span>Offline. Push Content needs a connection.</span></div>`) : pv.html(previewKey(), ORIENT_ALL)}<p class="note" style="margin:0">${f.sel.length > 1 ? `Sending to ${f.sel.length} displays.` : `Sending to ${esc(loc(selected()[0]))}.`}</p>`;

      case "wake": { const guide = `
        <div class="wake-post">
          <div class="carousel" id="track" tabindex="0" aria-roledescription="carousel" aria-label="Wake the display">${WAKE.map((w, i) => `<div class="slide" aria-label="Step ${i + 1} of ${WAKE.length}">${ECArt.wake(w.art)}</div>`).join("")}</div>
          <div class="dots" role="tablist" aria-label="Steps">${WAKE.map((w, i) => `<button class="dot" role="tab" data-i="${i}" aria-label="Step ${i + 1}: ${esc(w.title)}"></button>`).join("")}</div>
          <section class="caption" id="caption" aria-live="polite"></section>
        </div>
        <button class="hint-row" id="no-light">${I.warn}<span>No light? Check the battery</span>${I.next}</button>`;
        // Just wake it / Wake it again: nothing new was pushed, so the button steps are the main thing
        return f.wakeOnly ? guide : ECArt.autoWake(guide); }

      case "done": return `
        <div class="done-list" id="done-list"></div>
        <p class="note">Each display updates in 3–5 minutes. Status changes to Updated when it connects. If nothing connects within ${EC.NOT_CONFIRMED_MIN} minutes it shows Not confirmed.</p>
        <button class="btn" id="again">Update another</button>
        <button class="btn ghost" id="home">Home</button>`;
    }
    return "";
  }

  /* Was note: a warning (doesn't block) when Was isn't above the price */
  function wasNote() {
    const p = centsToNum(f.priceC), w = centsToNum(f.wasC);
    return p !== null && w !== null && w <= p ? "Was price is not higher than the price. Check both." : "";
  }
  function paintDone() {
    const box = $("done-list"); if (!box) return;
    box.innerHTML = wakeList().map(byId).filter(Boolean).map((d) => `
      <div class="device-card"><div class="head">
        <span><span class="mono" style="font-weight:700">${esc(loc(d))}</span><br><span class="note mono">${esc(d.serial)}</span></span>
        ${chip(d.status)}
      </div>${d.status === "unconfirmed" ? `<button class="btn ghost small" data-rewake="${d.serial}">Wake it again</button>` : ""}</div>`).join("");
    document.querySelectorAll("[data-rewake]").forEach((b) => b.onclick = () => { f.wakeSel = [b.dataset.rewake]; f.wakeOnly = true; f.wakeIdx = 0; f.wakeSlide = 0; setStep("wake"); });
  }

  /* camera window at the very top, right under the phone's own camera */
  const scanBlock = () => `<div class="scan-top">
        <div class="scanner" id="scanner" data-state="idle">
          <button class="viewfinder" id="vf" aria-label="Start camera and scan a display"><span class="vf-frame"></span><span class="vf-hint">${I.scan.replace("<svg", '<svg style="width:28px;height:28px"')}Tap to scan again</span></button>
          <div class="cam"><video id="scan-video" playsinline muted></video><span class="vf-frame"></span><span class="scanline"></span><button class="cam-btn" id="cam-cancel" aria-label="Stop camera">${I.x}</button>
            <button class="cam-btn torch" id="torch" aria-label="Flashlight" aria-pressed="false" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 3h8l-2 6h-4z"/><path d="M10 9v11h4V9"/></svg></button></div>
          <div class="cam-fail"><strong>Camera unavailable</strong><span class="note">Type the ID or pick from the list.</span><button class="btn ghost" id="cam-retry">Try again</button></div>
          <div class="cam-state" aria-live="polite"><i></i><span id="cam-msg"></span></div>
        </div>
      </div>`;

  /* ---------- render ---------- */
  let ticker = 0;
  function render() {
    scanner.release(); scanner.state = "idle";
    clearInterval(ticker);
    const i = STEPS.indexOf(f.step), total = STEPS.length - 1;
    let [title, sub] = COPY[f.step];
    // Just wake it / Wake it again: nothing new was pushed, so the tech wakes it with the button
    if (f.step === "wake" && f.wakeOnly) [title, sub] = ["Wake the display", "Push the button so it picks up the last sign sent."];
    $("app").innerHTML = `
      <main class="screen" style="--tint:var(--tint-content)">
        ${header({ home: true })}
        <div class="flow">
          ${f.step === "find" ? scanBlock() : ""}
          <div class="flow-top">
            <div class="flow-name"><span class="kicker">Update Content</span><span class="count">${f.step === "done" ? "Done" : `${i + 1} / ${total}`}</span></div>
            <div class="progress">${STEPS.slice(0, total).map((_, k) => `<i class="${k < i ? "done" : k === i ? "now" : ""}"></i>`).join("")}</div>
          </div>
          <div class="step" id="body">
            ${eyebrow()}
            <h2>${esc(title)}</h2>
            ${sub ? `<p class="note" style="margin:0;font-size:15px">${esc(sub)}</p>` : ""}
            ${body()}
          </div>
          ${f.step === "done" ? "" : `
          <nav class="flow-nav">
            <button class="btn ghost" id="back">${I.back.replace("<svg", '<svg style="width:18px;height:18px"')} Back</button>
            <button class="btn" id="next" ${valid() ? "" : "disabled"}>${esc(nextLabel())}</button>
          </nav>`}
        </div>
      </main>`;
    bindHeader();
    bind();
  }
  function refreshNext() { const b = $("next"); if (b) { b.disabled = !valid(); b.textContent = nextLabel(); } }

  function bindWake() {
    const track = $("track"); if (!track) return;
    const dots = [...document.querySelectorAll(".dot")];
    let idx = Math.min(f.wakeSlide || 0, WAKE.length - 1);
    const paint = () => {
      const w = WAKE[idx];
      dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === idx)));
      if (!track.isConnected) return; // left the step before this frame
      $("caption").innerHTML = `<span class="step-no">Step ${idx + 1} of ${WAKE.length}</span><h2>${esc(w.title)}</h2><ul class="lines">${w.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>${idx === 0 ? `<p class="swipe-hint">Swipe the picture for the next step</p>` : ""}`;
      f.wakeSlide = idx; save();
    };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const goTo = (k, smooth = true) => { idx = Math.max(0, Math.min(WAKE.length - 1, k)); track.scrollTo({ left: idx * track.clientWidth, behavior: smooth && !reduce ? "smooth" : "auto" }); paint(); };
    let ticking = false;
    track.addEventListener("scroll", () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; const k = Math.round(track.scrollLeft / track.clientWidth); if (k !== idx && k >= 0 && k < WAKE.length) { idx = k; paint(); } }); }, { passive: true });
    let drag = null;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; drag = { x: e.clientX, left: track.scrollLeft, from: idx }; track.classList.add("dragging"); track.setPointerCapture(e.pointerId); });
    track.addEventListener("pointermove", (e) => { if (drag) track.scrollLeft = drag.left - (e.clientX - drag.x); });
    const end = (e) => { if (!drag) return; const dx = e.clientX - drag.x, from = drag.from; track.classList.remove("dragging"); drag = null; goTo(Math.abs(dx) > track.clientWidth * 0.15 ? from + (dx < 0 ? 1 : -1) : from); };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
    track.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); goTo(idx + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); goTo(idx - 1); } });
    dots.forEach((d) => d.addEventListener("click", () => goTo(+d.dataset.i)));
    paint(); requestAnimationFrame(() => goTo(idx, false));
  }

  function bind() {
    $("back")?.addEventListener("click", back);
    $("next")?.addEventListener("click", next);
    $("no-light")?.addEventListener("click", openBatteryGuide);
    $("swap-now")?.addEventListener("click", openBatteryGuide);

    if (f.step === "find") {
      scanner.paint("idle");
      $("vf").onclick = () => scanner.start();
      $("cam-retry").onclick = () => scanner.start();
      $("cam-cancel").onclick = () => scanner.stop();
      setTimeout(() => scanner.start(), 0); // the camera opens with the screen
      paintFind();
    }
    $("wake-only")?.addEventListener("click", () => {
      f.wakeSel = selected().filter((d) => d.status !== "updated").map((d) => d.serial);
      f.wakeOnly = true; f.wakeIdx = 0; f.wakeSlide = 0; setStep("wake");
    });

    document.querySelectorAll("[data-type-pick]").forEach((b) => b.addEventListener("click", () => { applyType(b.dataset.typePick); save(); render(); }));

    ECItem.bind(f, { onItem: () => { save(); refreshNext(); } }); // fills the price from the item record (v0.9.8)
    document.querySelectorAll("[data-money]").forEach((inp) => inp.addEventListener("input", () => {
      const c = normCents(inp.value); f[inp.dataset.money] = c; inp.value = fmtMoney(c);
      if (inp.dataset.money === "priceC") ECItem.priceTyped(f);
      try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch { /* not supported */ }
      const n = $("was-note");
      if (n) { const p = centsToNum(f.priceC), w = centsToNum(f.wasC); n.textContent = wasNote(); n.classList.toggle("warn", p !== null && w !== null && w <= p); }
      save(); refreshNext();
    }));

    if (f.step === "preview") { const key = previewKey(); pv.ensure(key); $("pv-retry")?.addEventListener("click", () => pv.retry(key)); }

    bindWake();

    if (f.step === "done") { paintDone(); ticker = setInterval(paintDone, 5000); }
    $("again")?.addEventListener("click", () => { f = state.flows.content = fresh(); save(); render(); });
    $("home")?.addEventListener("click", () => { delete state.flows.content; go("home"); });
  }

  EC.flowPage("content", { back, finished: () => f.step === "done", atStart: () => f.step === "find" });
  render();
})();
