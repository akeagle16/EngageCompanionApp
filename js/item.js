/* item.js — product entry (PROPOSED: review note 1, needs the customer's list).
   No free-typed product names. The tech scans the product barcode (UPC) or types the barcode or the produce PLU;
   the item comes from a preapproved content list that carries its name, size, unit and picture (pictures come from the
   image repository the sign build already pulls from).
   v0.9.8: scanning or typing an item fills its price from the item record; the tech can change it. Was price is always typed.
   Shared by Install and Update Content › Details. The list below is demo data; production gets it from the customer. */
(function () {
  "use strict";
  const { esc, I, haptic } = EC;
  const P = (n) => `assets/products/${n}.png`;

  // [code, name, size, unit, price in cents (from the item record), picture]  · produce = PLU (a leading 9 = organic) · packaged = 12-digit UPC
  const LIST = [
    ["4664", "Tomatoes on the Vine", "", "lb", "212", P("tomatoes-on-vine")],
    ["4087", "Roma Tomatoes", "", "lb", "128", ""],
    ["4013", "Navel Oranges", "", "lb", "129", P("navel-oranges")],
    ["4011", "Bananas", "", "lb", "58", P("bananas")],
    ["94011", "Organic Bananas", "", "lb", "78", P("bananas")],
    ["4225", "Hass Avocados", "", "ea", "97", P("hass-avocados")],
    ["3134", "Pie Pumpkins", "", "lb", "348", P("pie-pumpkins")],
    ["4016", "Red Delicious Apples", "", "lb", "198", P("red-delicious-apples")],
    ["4065", "Green Bell Peppers", "", "ea", "74", ""],
    ["012345678905", "Cola 12 pk, 12 fl oz cans", "12", "ct", "748", ""],
    ["012345678912", "Sports Drink, Berry", "28", "fl oz", "148", ""],
    ["012345678929", "Cat Food Pâté", "2.6", "oz", "68", ""],
    ["012345678936", "Cinnamon Rolls", "8", "ct", "398", ""],
  ].map(([code, name, size, uom, priceC, img]) => ({ code, name, size, uom, priceC, img, plu: code.length <= 5 ? code : "" }));
  const BY = Object.fromEntries(LIST.map((x) => [x.code, x]));

  const digits = (v) => String(v || "").replace(/\D/g, "").slice(0, 13);
  /* 13-digit EAN with a leading 0 is the same item as its 12-digit UPC */
  const norm = (v) => { const d = digits(v); return d.length === 13 && d[0] === "0" ? d.slice(1) : d; };
  /* → { item } when it's on the list · { why } when it can't be · {} while it may still be typing */
  function lookup(raw) {
    const c = norm(raw);
    if (!c) return {};
    if (BY[c]) return { item: BY[c] };
    const done = c.length === 12 || c.length === 13 || c.length === 5 || (c.length === 4 && c[0] !== "9") || c.length === 8;
    if (!done) return {};
    return { why: `${c.length <= 5 ? "PLU" : "Barcode"} ${c} isn’t on the approved list. Check the number, or ask your manager to have it added.` };
  }
  const byPlu = (plu) => (plu ? BY[plu] || null : null);


  const card = (it) => it ? `<div class="item-card" id="item-card">
      <span class="item-pic">${it.img ? `<img src="${esc(it.img)}" alt="" />` : `<span class="item-nopic">No picture</span>`}</span>
      <span class="item-meta"><b>${esc(it.name)}</b>
        <span class="note">${esc([it.size && `${it.size} ${it.uom}`, it.uom === "lb" ? "per lb" : it.uom === "ea" ? "each" : ""].filter(Boolean).join(" · "))}</span>
        <span class="note mono">${it.plu ? `PLU ${esc(it.plu)}` : `UPC ${esc(it.code)}`}</span></span>
    </div>` : `<div id="item-card"></div>`;

  /* the field: number entry + scan button on the right (same pattern as Maintenance search) */
  function html(f, { label = "Product barcode or PLU" } = {}) {
    const it = BY[f.itemCode] || null;
    return EC.nz("item", `
      <div class="field"><label for="d-code">${esc(label)}</label>
        <div class="search-scan code-field">${I.search}
          <input class="input big" id="d-code" value="${esc(f.codeTyped || (it ? it.code : ""))}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Type PLU or scan" />
          <button class="scan-btn" id="d-scan" aria-label="Scan the product barcode">${I.scan}</button>
        </div>
        <span class="field-note" id="code-note">${it ? "On the approved list" : ""}</span>
        <span class="field-note plu-hint">Produce: type the PLU from the sticker (4 or 5 digits). Packaged: scan the barcode.</span></div>
      ${card(it)}`);
  }

    /* price from the item record (v0.9.8): filled when an item is found, unless the tech typed a price */
  const money = (c) => { if (!c) return ""; const p = String(c).padStart(3, "0"); return `$${Number(p.slice(0, -2)).toLocaleString("en-US")}.${p.slice(-2)}`; };
  const PRICE_NOTE = "From the item record. Change it if needed.";
  function fillPrice(f, it) {
    if (it && it.priceC && (!f.priceC || f.priceFrom === "item")) { f.priceC = it.priceC; f.priceFrom = "item"; }
    else if (!it && f.priceFrom === "item") { f.priceC = ""; f.priceFrom = ""; }
    const p = document.getElementById("d-price"); if (p) p.value = money(f.priceC);
    const n = document.getElementById("price-note"); if (n) n.textContent = f.priceFrom === "item" && f.priceC ? PRICE_NOTE : "";
  }
  /* the page calls this when the tech types in the price field: it's theirs now */
  const priceTyped = (f) => { f.priceFrom = ""; const n = document.getElementById("price-note"); if (n) n.textContent = ""; };
  const priceNote = (f) => (f.priceFrom === "item" && f.priceC ? PRICE_NOTE : "");

  /* hooks.onItem(item|null) — the page refreshes Next */
  function bind(f, hooks) {
    const inp = document.getElementById("d-code");
    if (!inp) return;
    const note = document.getElementById("code-note");
    const apply = (raw, fromScan) => {
      const r = lookup(raw);
      f.codeTyped = digits(raw);
      if (r.item) {
        const it = r.item;
        Object.assign(f, { itemCode: it.code, desc: it.name, plu: it.plu, img: it.img, uom: it.uom, size: it.size });
        note.textContent = "On the approved list"; note.classList.remove("warn");
        if (fromScan) { inp.value = it.code; haptic(40); }
      } else {
        Object.assign(f, { itemCode: "", desc: "", plu: "", img: "", uom: "", size: "" });
        note.textContent = r.why || ""; note.classList.toggle("warn", !!r.why);
      }
      document.getElementById("item-card").outerHTML = card(r.item || null);
      fillPrice(f, r.item || null);
      EC.save();
      hooks.onItem(r.item || null);
    };
    inp.addEventListener("input", () => { const d = digits(inp.value); if (inp.value !== d) inp.value = d; apply(d, false); });
    document.getElementById("d-scan").onclick = () => scanSheet((code) => apply(code, true));
  }

  /* ---------- camera sheet for product barcodes ----------
     Reads UPC-A / EAN-13 / EAN-8 / UPC-E / Code 128. A display ID label (5-digit Code 128) shakes with "That’s a display barcode".
     A code not on the list says so and keeps scanning. Each code counts once while it stays in view. */
  function scanSheet(onPick) {
    const { el, close } = EC.sheet(`
      <h3>Scan the product barcode</h3>
      <div class="cam item-cam"><video id="item-video" playsinline muted></video><span class="vf-frame"></span><span class="scanline"></span></div>
      <p class="note" id="item-cam-msg" aria-live="polite">Starting camera…</p>
      <button class="btn ghost" id="item-cam-close">Type it instead</button>`, { label: "Scan the product barcode" });
    const video = el.querySelector("#item-video"), msg = el.querySelector("#item-cam-msg");
    let stream = null, zx = null, raf = 0, live = true;
    const seen = {};
    const stop = () => { live = false; cancelAnimationFrame(raf); try { zx && zx.reset(); } catch { /* ignore */ } if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
    el.addEventListener("close", stop);
    el.querySelector("#item-cam-close").onclick = close;
    const shake = () => { const fr = el.querySelector(".vf-frame"); if (fr) { fr.classList.remove("shake"); void fr.offsetWidth; fr.classList.add("shake"); } };
    function handle(raw, isC128) {
      const now = Date.now(), v = String(raw || "").trim();
      if (now - (seen[v] || 0) < 2500) { seen[v] = now; return false; }
      seen[v] = now;
      if (isC128 && /^\d{5}$/.test(v)) { /* a display ID label: 5 digits in Code 128 */ msg.textContent = "That’s a display barcode. Scan the product’s barcode."; shake(); return false; }
      const r = lookup(v);
      if (r.item) { stop(); close(); onPick(r.item.code); return true; }
      msg.textContent = r.why || "Hold the barcode inside the frame."; shake();
      return false;
    }
    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no-camera-api");
        if ("BarcodeDetector" in window) {
          const det = new window.BarcodeDetector({ formats: ["upc_a", "ean_13", "ean_8", "upc_e", "code_128"] });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          if (!live) return stop();
          video.srcObject = stream; await video.play(); msg.textContent = "Aim at the product barcode";
          const tick = async () => { if (!live) return; try { for (const c of await det.detect(video)) if (handle(c.rawValue, c.format === "code_128")) return; } catch { /* frame not ready */ } raf = requestAnimationFrame(tick); };
          tick();
        } else {
          if (!window.ZXing) await new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = "lib/zxing.min.js"; sc.onload = ok; sc.onerror = () => bad(new Error("zxing-load")); document.head.appendChild(sc); });
          if (!live) return;
          zx = new window.ZXing.BrowserMultiFormatReader();
          await zx.decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video, (res) => { if (res && live) handle(res.getText(), window.ZXing.BarcodeFormat && res.getBarcodeFormat() === window.ZXing.BarcodeFormat.CODE_128); });
          stream = video.srcObject; msg.textContent = "Aim at the product barcode";
        }
      } catch (e) {
        stop();
        msg.textContent = e && e.name === "NotAllowedError" ? "Camera permission was declined. Type the number instead." : "The camera couldn’t start here. Type the number instead.";
      }
    })();
  }

  window.ECItem = { LIST, lookup, byPlu, html, bind, norm, priceTyped, priceNote };
})();
