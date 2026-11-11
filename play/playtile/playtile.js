/*
 * Playtile mode for the GB Studio web export
 * ==========================================
 * A full-screen portrait layout for a Playtiles (Season 2) controller stuck on an
 * iPhone 13 Pro Max screen (428 x 926 CSS px in a Home Screen web app). Pressing a
 * tile button lands as an ordinary touch at a fixed spot; this maps those touches to
 * Game Boy buttons and feeds them straight into the emulator through the export's own
 * joypad methods (emulator.setJoypA(true) and friends).
 *
 * Injected on every deploy by tools/playtile/inject.mjs; never edit the exported files.
 * With Playtile mode off (desktop default) the only change is cache-busted asset URLs.
 *
 *   ?playtile=1 / ?playtile=0   turn the mode on / off (remembered on this device)
 *   ?debug=1                     start with the debug view on
 *
 * Layout source of truth: Playtiles' drawing of the tile back, in mm, converted for
 * the 13 Pro Max (458 ppi, devicePixelRatio 3). Touch zones match the Delta skin
 * "Playtile GBC Raised (13 Pro Max)" so the tile sits in the same spot in both.
 */
(function () {
  "use strict";

  // Which game button each tile button sends. If your tile turns out to be the other
  // way round, swap these two values.
  const TILE_BUTTONS = { small: "B", big: "A" }; // small = upper button, big = lower-right button

  const BUILD = window.PLAYTILE_BUILD || { build: "dev", time: "" };
  const params = new URLSearchParams(location.search);

  const storage = (getStore) => {
    let s = null;
    try { s = getStore(); } catch (e) { /* storage blocked */ }
    return {
      get: (k) => { try { return s.getItem(k); } catch (e) { return null; } },
      set: (k, v) => { try { s.setItem(k, v); } catch (e) { /* private mode / full */ } },
      del: (k) => { try { s.removeItem(k); } catch (e) { /* private mode */ } },
    };
  };
  const local = storage(() => window.localStorage);
  const session = storage(() => window.sessionStorage);

  // ---------------------------------------------------------------------------------
  // 1. Cache-busting (both modes). The export fetches gbstudio.json, the ROM and the
  //    emulator's wasm with plain URLs; GitHub Pages and Home Screen apps cache those
  //    for ~10 minutes. Tag every same-origin fetch with this build's id instead.
  // ---------------------------------------------------------------------------------
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === "string" || input instanceof URL) {
      try {
        const url = new URL(String(input), location.href);
        if (url.origin === location.origin && !url.searchParams.has("v")) {
          url.searchParams.set("v", BUILD.build);
          input = url.href;
        }
      } catch (e) { /* leave the request alone */ }
    }
    return nativeFetch(input, init);
  };

  // ---------------------------------------------------------------------------------
  // 2. Mode: on by default on touch devices; ?playtile=0/1 switches and is remembered
  // ---------------------------------------------------------------------------------
  if (params.has("playtile")) local.set("playtile.mode", params.get("playtile") === "0" ? "off" : "on");
  const savedMode = local.get("playtile.mode");
  const touchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const enabled = savedMode ? savedMode === "on" : touchDevice;
  window.playtile = { build: BUILD, enabled };
  if (!enabled) return; // desktop: keyboard, gamepad and the export's own touch controls as before
  document.documentElement.classList.add("pt-on");

  // ---------------------------------------------------------------------------------
  // 3. Layout, in "design" CSS px: the 13 Pro Max screen, origin at its top-left
  // ---------------------------------------------------------------------------------
  const DESIGN_W = 428;
  const DESIGN_H = 926;
  const MM = 458 / 25.4 / 3; // CSS px per mm on the 13 Pro Max (= 6.0105)

  const TILE = { w: 68 * MM, h: 40 * MM, r: 5 * MM, notchW: 5.9 * MM, notchD: 5.9 * MM, y: 452 };
  TILE.x = (DESIGN_W - TILE.w) / 2; // centred horizontally
  const onTile = (xmm, ymm) => ({ x: TILE.x + xmm * MM, y: TILE.y + ymm * MM });

  const DPAD = Object.assign(onTile(15.903, 16.438), { padOffset: 7.17 * MM, padR: (8.29 * MM) / 2 });
  const PADS = {
    Up: { x: DPAD.x, y: DPAD.y - DPAD.padOffset },
    Down: { x: DPAD.x, y: DPAD.y + DPAD.padOffset },
    Left: { x: DPAD.x - DPAD.padOffset, y: DPAD.y },
    Right: { x: DPAD.x + DPAD.padOffset, y: DPAD.y },
  };
  // Tile buttons and their touch zones (squares from the Delta skin, with extra margins)
  const BUTTONS = {
    small: Object.assign(onTile(48.217, 10.101), { r: (9.99 * MM) / 2, zone: { size: 62, left: 12, top: 12, right: 6, bottom: 0 } }),
    big: Object.assign(onTile(55.896, 21.339), { r: (12.84 * MM) / 2, zone: { size: 72, left: 6, top: 0, right: 12, bottom: 12 } }),
  };
  // D-pad: 129.3 px square split 3 x 3 (edges = directions, corners = diagonals), +10 px all round
  const DPAD_ZONE = { size: 129.3, extra: 10 };
  // Game screen: exactly 8x the Game Boy's 160 x 144 in device pixels
  const SCREEN = { x: 2 / 3, y: 52, w: 1280 / 3, h: 384 }; // 2 device px in, 1280 x 1152 device px
  // On-screen pills (Select/Start where Delta has them; the bottom row is ours)
  const PILLS = [
    { id: "select", label: "SELECT", x: 104, y: 720, w: 90, h: 36, game: "Select" },
    { id: "start", label: "START", x: 234, y: 720, w: 90, h: 36, game: "Start" },
    { id: "calibrate", label: "CALIBRATE", x: 24, y: 800, w: 86, h: 34 },
    { id: "debug", label: "DEBUG", x: 122, y: 800, w: 86, h: 34 },
    { id: "mute", label: "MUTE", x: 220, y: 800, w: 86, h: 34 },
    { id: "reload", label: "RELOAD", x: 318, y: 800, w: 86, h: 34 },
  ];
  const JOYP = { Up: "setJoypUp", Down: "setJoypDown", Left: "setJoypLeft", Right: "setJoypRight", A: "setJoypA", B: "setJoypB", Start: "setJoypStart", Select: "setJoypSelect" };
  const CAL_STEPS = [
    { prompt: "&uarr;", at: PADS.Up },
    { prompt: "&darr;", at: PADS.Down },
    { prompt: "&larr;", at: PADS.Left },
    { prompt: "&rarr;", at: PADS.Right },
    { prompt: `${TILE_BUTTONS.small} <small>(small, upper)</small>`, at: BUTTONS.small },
    { prompt: `${TILE_BUTTONS.big} <small>(big, lower right)</small>`, at: BUTTONS.big },
  ];

  // Calibration = similarity transform from design space to page space:
  // page = [a -b; b a] * design + [tx ty]
  const IDENTITY = { a: 1, b: 0, tx: 0, ty: 0 };
  const toPage = (t, x, y) => ({ x: t.a * x - t.b * y + t.tx, y: t.b * x + t.a * y + t.ty });
  const toDesign = (t, x, y) => {
    const dx = x - t.tx, dy = y - t.ty, d = t.a * t.a + t.b * t.b;
    return { x: (t.a * dx + t.b * dy) / d, y: (-t.b * dx + t.a * dy) / d };
  };

  // ---------------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------------
  const touches = new Map(); // touch identifier -> { x, y, hit }
  let pressed = new Set(); // game buttons currently held
  let sent = {}; // what the emulator was last told, per button
  let sentTo = null; // the emulator instance that was told
  let T = IDENTITY;
  let layout = null;
  let debugOn = params.get("debug") === "1";
  let muted = local.get("playtile.muted") === "1";
  let newBuild = null;
  let calib = null; // { step, samples, waitRelease } while calibrating
  let panel = null; // { el, buttons: [{ id, el, action }] }
  let rotated = false;
  let anyGameInput = false;
  const loadedAt = Date.now();
  const els = {};

  const getEmulator = () => { try { return typeof emulator !== "undefined" ? emulator : null; } catch (e) { return null; } };
  const getVm = () => { try { return typeof vm !== "undefined" ? vm : null; } catch (e) { return null; } };
  const getAudioCtx = () => { try { return typeof Audio !== "undefined" && Audio.ctx ? Audio.ctx : null; } catch (e) { return null; } };
  const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const viewportKey = () => `${Math.round(innerWidth)}x${Math.round(innerHeight)}`;

  // ---------------------------------------------------------------------------------
  // Calibration storage (per viewport size, so a Safari-tab calibration doesn't leak
  // into the Home Screen app)
  // ---------------------------------------------------------------------------------
  const savedCalibrations = () => { try { return JSON.parse(local.get("playtile.calibration") || "{}") || {}; } catch (e) { return {}; } };
  const calibrationFor = (key) => { const c = savedCalibrations()[key]; return c && typeof c.a === "number" ? c : null; };
  function saveCalibration(key, c) {
    const all = savedCalibrations();
    if (c) all[key] = c; else delete all[key];
    local.set("playtile.calibration", JSON.stringify(all));
  }

  function fitSimilarity(from, to) {
    const n = from.length;
    const mean = (pts) => pts.reduce((m, p) => ({ x: m.x + p.x / n, y: m.y + p.y / n }), { x: 0, y: 0 });
    const fc = mean(from), tc = mean(to);
    let sdot = 0, scross = 0, snorm = 0;
    for (let i = 0; i < n; i++) {
      const lx = from[i].x - fc.x, ly = from[i].y - fc.y, mx = to[i].x - tc.x, my = to[i].y - tc.y;
      sdot += lx * mx + ly * my;
      scross += lx * my - ly * mx;
      snorm += lx * lx + ly * ly;
    }
    const a = sdot / snorm, b = scross / snorm;
    const t = { a, b, tx: tc.x - (a * fc.x - b * fc.y), ty: tc.y - (b * fc.x + a * fc.y) };
    let err = 0;
    for (let i = 0; i < n; i++) { const p = toPage(t, from[i].x, from[i].y); err += (p.x - to[i].x) ** 2 + (p.y - to[i].y) ** 2; }
    return Object.assign(t, { rms: Math.sqrt(err / n) });
  }

  // ---------------------------------------------------------------------------------
  // Layout in page space
  // ---------------------------------------------------------------------------------
  function readSafeArea() {
    const cs = getComputedStyle(els.safe);
    return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
  }

  function computeLayout() {
    const vw = innerWidth, vh = innerHeight;
    const safe = readSafeArea();
    const exact = Math.abs(vw - DESIGN_W) < 1 && Math.abs(vh - DESIGN_H) < 1;
    const cal = calibrationFor(viewportKey());
    T = cal || IDENTITY;
    const corners = [[TILE.x, TILE.y], [TILE.x + TILE.w, TILE.y], [TILE.x, TILE.y + TILE.h], [TILE.x + TILE.w, TILE.y + TILE.h]].map(([x, y]) => toPage(T, x, y));
    const tileTop = Math.min(...corners.map((c) => c.y));
    const tileBottom = Math.max(...corners.map((c) => c.y));

    // Game screen: the exact Delta rect when it fits; otherwise the biggest 160:144
    // rect between the status bar and the tile.
    let screen = Object.assign({}, SCREEN);
    if (!exact || screen.y + screen.h > tileTop - 4) {
      const top = Math.max(safe.top + 4, 8);
      const availH = Math.max(72, tileTop - 12 - top);
      const w = Math.min(vw, (availH * 160) / 144);
      screen = { x: (vw - w) / 2, y: top, w, h: (w * 144) / 160 };
    }

    // Pills follow the tile (they're not under it) and stay inside the viewport
    const dx = (vw - DESIGN_W) / 2;
    const dy = tileBottom - (TILE.y + TILE.h);
    const lowest = Math.max(...PILLS.map((p) => p.y + p.h)) + dy;
    const overflow = Math.max(0, lowest - (vh - Math.max(safe.bottom, 4)));
    const pills = PILLS.map((p) => Object.assign({}, p, { x: p.x + dx, y: p.y + dy - overflow }));
    const pillsBottom = lowest - overflow;
    const stampY = pillsBottom + 22 < vh - safe.bottom ? pillsBottom + 8 : Math.max(0, screen.y + screen.h + 1);

    return { vw, vh, exact, standalone: isStandalone(), safe, calibrated: !!cal, cal, screen, pills, tileTop, tileBottom, stampY };
  }

  // ---------------------------------------------------------------------------------
  // Hit-testing (page coordinates)
  // ---------------------------------------------------------------------------------
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const buttonZone = (b) => ({
    x: b.x - b.zone.size / 2 - b.zone.left,
    y: b.y - b.zone.size / 2 - b.zone.top,
    w: b.zone.size + b.zone.left + b.zone.right,
    h: b.zone.size + b.zone.top + b.zone.bottom,
  });

  function panelButtonAt(x, y) {
    if (!panel) return null;
    for (const b of panel.buttons) {
      const r = b.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { kind: "ui", id: b.id, action: b.action };
    }
    return null;
  }

  function hitTest(px, py) {
    const ui = panelButtonAt(px, py);
    if (ui) return ui;
    for (const p of layout.pills) {
      if (inRect(px, py, p)) return p.game ? { kind: "game", buttons: [p.game], id: p.id } : { kind: "action", id: p.id };
    }
    const d = toDesign(T, px, py);
    const half = DPAD_ZONE.size / 2 + DPAD_ZONE.extra;
    const edge = DPAD_ZONE.size / 6; // half a cell: inside it is the dead centre
    const dx = d.x - DPAD.x, dy = d.y - DPAD.y;
    if (Math.abs(dx) <= half && Math.abs(dy) <= half) {
      const buttons = [];
      if (dx < -edge) buttons.push("Left"); else if (dx > edge) buttons.push("Right");
      if (dy < -edge) buttons.push("Up"); else if (dy > edge) buttons.push("Down");
      return { kind: "game", buttons, id: "dpad" };
    }
    const hits = Object.keys(BUTTONS)
      .filter((k) => inRect(d.x, d.y, buttonZone(BUTTONS[k])))
      .map((k) => ({ k, dist: Math.hypot(d.x - BUTTONS[k].x, d.y - BUTTONS[k].y) }))
      .sort((p, q) => p.dist - q.dist); // if a touch could count for both, the nearer wins
    if (hits.length) return { kind: "game", buttons: [TILE_BUTTONS[hits[0].k]], id: hits[0].k };
    return { kind: "none" };
  }

  // ---------------------------------------------------------------------------------
  // Feeding the emulator
  // ---------------------------------------------------------------------------------
  let syncRetry = 0;
  function syncEmulator() {
    const emu = getEmulator();
    if (!emu) {
      if (pressed.size && !syncRetry) syncRetry = setTimeout(() => { syncRetry = 0; syncEmulator(); }, 100);
      return;
    }
    if (emu !== sentTo) { sent = {}; sentTo = emu; }
    for (const b of Object.keys(JOYP)) {
      const want = pressed.has(b);
      if (!!sent[b] !== want) {
        try { emu[JOYP[b]](want); } catch (e) { /* emulator mid-restart */ }
        sent[b] = want;
      }
    }
  }

  function updatePressed() {
    const next = new Set();
    if (!calib && !rotated) {
      for (const s of touches.values()) if (s.hit.kind === "game") s.hit.buttons.forEach((b) => next.add(b));
    }
    if (next.size) anyGameInput = true;
    pressed = next;
    syncEmulator();
    renderPressed();
    if (debugOn) renderDebug();
  }

  function releaseAll() {
    touches.clear();
    updatePressed();
  }

  // iOS only starts Web Audio inside a user gesture, and touchend counts where touchstart doesn't.
  function unlockAudio() {
    try {
      const emu = getEmulator();
      if (emu && emu.audio && !emu.audio.started) emu.audio.startPlayback();
      const ctx = getAudioCtx();
      if (ctx && ctx.state !== "running") ctx.resume();
    } catch (e) { /* no audio yet */ }
  }

  // ---------------------------------------------------------------------------------
  // Touch layer: one full-screen element; every touch is hit-tested by identifier
  // ---------------------------------------------------------------------------------
  function handlePoint(type, id, x, y) {
    if (type === "start") {
      if (calib && !panelButtonAt(x, y)) {
        captureCalibration(x, y);
        touches.set(id, { x, y, hit: { kind: "none" } });
        return;
      }
      touches.set(id, { x, y, hit: hitTest(x, y) });
    } else if (type === "move") {
      const s = touches.get(id);
      if (!s) return;
      s.x = x;
      s.y = y;
      if (!calib && (s.hit.kind === "game" || s.hit.kind === "none")) {
        const h = hitTest(x, y); // sliding between pads / onto a button
        s.hit = h.kind === "game" ? h : { kind: "none" };
      }
    } else {
      const s = touches.get(id);
      touches.delete(id);
      if (s && type === "end" && (s.hit.kind === "action" || s.hit.kind === "ui")) {
        const h = hitTest(x, y);
        if (h.kind === s.hit.kind && h.id === s.hit.id) runAction(s.hit); // fire on release, if still on it
      }
    }
  }

  function onTouch(ev) {
    ev.preventDefault();
    const type = { touchstart: "start", touchmove: "move", touchend: "end", touchcancel: "cancel" }[ev.type];
    for (const t of ev.changedTouches) handlePoint(type, t.identifier, t.clientX, t.clientY);
    if (type === "end" || type === "cancel") {
      // Safety net: forget touches the browser no longer reports
      const live = new Set(Array.from(ev.touches, (t) => t.identifier));
      for (const id of touches.keys()) if (id !== "mouse" && !live.has(id)) touches.delete(id);
      if (calib && touches.size === 0) calib.waitRelease = false;
    }
    if (type === "end") unlockAudio();
    updatePressed();
  }

  // Mouse, for trying Playtile mode on a desktop with ?playtile=1
  let mouseDown = false;
  function onMouse(ev) {
    ev.preventDefault();
    if (ev.type === "mousedown") { mouseDown = true; handlePoint("start", "mouse", ev.clientX, ev.clientY); }
    else if (ev.type === "mousemove") { if (!mouseDown) return; handlePoint("move", "mouse", ev.clientX, ev.clientY); }
    else if (mouseDown) { mouseDown = false; handlePoint("end", "mouse", ev.clientX, ev.clientY); unlockAudio(); if (calib && touches.size === 0) calib.waitRelease = false; }
    updatePressed();
  }

  // ---------------------------------------------------------------------------------
  // Actions (bottom pills)
  // ---------------------------------------------------------------------------------
  function runAction(hit) {
    if (hit.kind === "ui") return hit.action();
    if (hit.id === "calibrate") startCalibration();
    else if (hit.id === "debug") { debugOn = !debugOn; render(); }
    else if (hit.id === "mute") { muted = !muted; local.set("playtile.muted", muted ? "1" : "0"); applyMute(); render(); }
    else if (hit.id === "reload") reload();
  }

  let defaultVolume = null;
  function applyMute() {
    const v = getVm();
    if (!v) return;
    if (defaultVolume === null) defaultVolume = v.volume;
    v.volume = muted ? 0 : defaultVolume;
  }

  function reload() {
    const url = new URL(location.href);
    url.searchParams.set("b", newBuild ? newBuild.build : String(Date.now())); // new URL = no stale page
    location.replace(url.href);
  }

  async function checkForNewBuild() {
    if (BUILD.build === "dev") return;
    try {
      const res = await nativeFetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const info = await res.json();
      if (!info.build || info.build === BUILD.build) return;
      newBuild = info;
      // Opened a stale copy and haven't started playing: switch straight to the new build (once)
      if (!anyGameInput && Date.now() - loadedAt < 8000 && session.get("playtile.autoReload") !== info.build) {
        session.set("playtile.autoReload", info.build);
        reload();
        return;
      }
      render();
    } catch (e) { /* offline */ }
  }

  // ---------------------------------------------------------------------------------
  // Panels (calibration, prompts). Their buttons are hit-tested by the touch layer too.
  // ---------------------------------------------------------------------------------
  function showPanel(html, buttons, autoCloseMs) {
    closePanel();
    const el = document.createElement("div");
    el.className = "pt-panel";
    el.innerHTML = html;
    const row = document.createElement("div");
    row.className = "pt-row";
    el.appendChild(row);
    panel = { el, buttons: [] };
    for (const b of buttons) {
      const be = document.createElement("div");
      be.className = "pt-btn";
      be.textContent = b.label;
      row.appendChild(be);
      panel.buttons.push({ id: b.id, el: be, action: b.action });
    }
    document.body.appendChild(el);
    if (autoCloseMs) { const p = panel; setTimeout(() => { if (panel === p) closePanel(); }, autoCloseMs); }
  }

  function closePanel() {
    if (panel) panel.el.remove();
    panel = null;
  }

  function maybeOfferCalibration() {
    if (calib || panel || layout.exact || layout.calibrated || rotated) return;
    if (session.get("playtile.offerDismissed") === viewportKey()) return;
    const how = layout.standalone ? "" : " Opened from your Home Screen it should be 428 &times; 926.";
    showPanel(
      `<div class="pt-title">Line up your Playtile</div><div>This screen is ${Math.round(layout.vw)} &times; ${Math.round(layout.vh)}, not 428 &times; 926.${how} Calibrate so the buttons match where your tile presses?</div>`,
      [
        { id: "calibrate", label: "Calibrate", action: startCalibration },
        { id: "later", label: "Not now", action: () => { session.set("playtile.offerDismissed", viewportKey()); closePanel(); } },
      ],
    );
  }

  function startCalibration() {
    calib = { step: 0, samples: [], waitRelease: touches.size > 0 };
    updatePressed();
    showCalibrationStep();
  }

  function showCalibrationStep(message) {
    const dots = CAL_STEPS.map((_, i) => `<span class="${i < calib.step ? "done" : i === calib.step ? "now" : ""}"></span>`).join("");
    showPanel(
      `<div class="pt-title">Calibrate your Playtile</div><div class="pt-big">Press ${CAL_STEPS[calib.step].prompt} on your tile</div><div class="pt-dots">${dots}</div>${message ? `<div class="pt-msg">${message}</div>` : ""}`,
      [
        { id: "cancel", label: "Cancel", action: () => { calib = null; closePanel(); render(); } },
        { id: "reset", label: "Reset to default", action: resetCalibration },
      ],
    );
  }

  function captureCalibration(x, y) {
    if (calib.waitRelease) return; // one press per step
    calib.waitRelease = true;
    calib.samples.push({ x, y });
    calib.step += 1;
    if (calib.step < CAL_STEPS.length) showCalibrationStep();
    else finishCalibration();
  }

  function finishCalibration() {
    const fit = fitSimilarity(CAL_STEPS.map((s) => s.at), calib.samples);
    const scale = Math.hypot(fit.a, fit.b);
    const angle = (Math.atan2(fit.b, fit.a) * 180) / Math.PI;
    if (!(scale > 0.8 && scale < 1.25 && Math.abs(angle) < 10 && fit.rms < 14)) {
      calib = { step: 0, samples: [], waitRelease: true };
      showCalibrationStep(`Those presses didn't match the tile's layout (off by ${Math.round(fit.rms)} px). Start again with &uarr;, pressing each button once.`);
      return;
    }
    saveCalibration(viewportKey(), { a: fit.a, b: fit.b, tx: fit.tx, ty: fit.ty, rms: Math.round(fit.rms * 10) / 10, at: new Date().toISOString() });
    calib = null;
    relayout();
    const shift = toPage(fit, DPAD.x, DPAD.y);
    showPanel(
      `<div class="pt-title">Calibrated</div><div>Moved ${Math.round(shift.x - DPAD.x)}, ${Math.round(shift.y - DPAD.y)} px &middot; scale ${scale.toFixed(3)} &middot; ${angle.toFixed(1)}&deg; &middot; fit &plusmn;${fit.rms.toFixed(1)} px</div>`,
      [{ id: "ok", label: "OK", action: closePanel }],
      4000,
    );
  }

  function resetCalibration() {
    saveCalibration(viewportKey(), null);
    calib = null;
    relayout();
    showPanel(`<div class="pt-title">Back to the default layout</div><div>For ${viewportKey().replace("x", " &times; ")}.</div>`, [{ id: "ok", label: "OK", action: closePanel }], 3000);
  }

  // ---------------------------------------------------------------------------------
  // Rendering (SVG only: the export grabs the first <canvas> on the page for the game)
  // ---------------------------------------------------------------------------------
  const SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function tileOutlinePath() {
    const { x, y, w, h, r } = TILE;
    const nr = TILE.notchW / 2, cx = x + w / 2, ny = y + TILE.notchD - nr;
    return [
      `M ${x + r} ${y}`, `H ${cx - nr}`, `V ${ny}`, `A ${nr} ${nr} 0 0 0 ${cx + nr} ${ny}`, `V ${y}`, // U-shaped notch
      `H ${x + w - r}`, `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
      `V ${y + h - r}`, `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
      `H ${x + r}`, `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
      `V ${y + r}`, `A ${r} ${r} 0 0 1 ${x + r} ${y}`, "Z",
    ].join(" ");
  }

  function buildDom() {
    const add = (tag, id, parent) => { const e = document.createElement(tag); if (id) e.id = id; (parent || document.body).appendChild(e); return e; };
    els.safe = add("div", "pt-safe");

    els.svg = svgEl("svg", { id: "pt-svg" });
    document.body.appendChild(els.svg);
    els.tile = svgEl("g", {}, els.svg);
    svgEl("path", { d: tileOutlinePath(), fill: "#1a1c22", stroke: "#8a909b", "stroke-width": 2, "stroke-dasharray": "7 5", "vector-effect": "non-scaling-stroke" }, els.tile);
    const label = svgEl("text", { x: TILE.x + TILE.w / 2, y: TILE.y + TILE.h - 16, class: "pt-tile-label" }, els.tile);
    label.textContent = "LINE UP YOUR PLAYTILE HERE";
    els.rings = {};
    for (const k of Object.keys(PADS)) els.rings[k] = svgEl("circle", { cx: PADS[k].x, cy: PADS[k].y, r: DPAD.padR, class: "pt-ring" }, els.tile);
    for (const k of Object.keys(BUTTONS)) els.rings[TILE_BUTTONS[k]] = svgEl("circle", { cx: BUTTONS[k].x, cy: BUTTONS[k].y, r: BUTTONS[k].r, class: "pt-ring" }, els.tile);

    els.pills = {};
    for (const p of PILLS) {
      const g = svgEl("g", { class: "pt-pill" }, els.svg);
      const rect = svgEl("rect", { width: p.w, height: p.h, rx: p.h / 2 }, g);
      const text = svgEl("text", { x: p.w / 2, y: p.h / 2 }, g);
      text.textContent = p.label;
      els.pills[p.id] = { g, rect, text };
    }
    els.debug = svgEl("g", { id: "pt-debug-layer" }, els.svg);

    els.stamp = add("div", "pt-stamp");
    els.info = add("div", "pt-info");
    els.rotate = add("div", "pt-rotate");
    els.rotate.innerHTML = "<div>&#8635;</div><div>Rotate to portrait</div>";
    els.layer = add("div", "pt-touch"); // last = on top of everything
  }

  function render() {
    layout = computeLayout();
    const L = layout;
    const root = document.documentElement.style;
    root.setProperty("--pt-sx", `${L.screen.x}px`);
    root.setProperty("--pt-sy", `${L.screen.y}px`);
    root.setProperty("--pt-sw", `${L.screen.w}px`);
    root.setProperty("--pt-sh", `${L.screen.h}px`);

    els.svg.setAttribute("width", L.vw);
    els.svg.setAttribute("height", L.vh);
    els.tile.setAttribute("transform", `matrix(${T.a} ${T.b} ${-T.b} ${T.a} ${T.tx} ${T.ty})`);
    for (const p of L.pills) els.pills[p.id].g.setAttribute("transform", `translate(${p.x} ${p.y})`);
    els.pills.mute.text.textContent = muted ? "UNMUTE" : "MUTE";
    els.pills.reload.text.textContent = newBuild ? "UPDATE" : "RELOAD";
    els.pills.reload.g.classList.toggle("pt-attention", !!newBuild);
    els.pills.debug.g.classList.toggle("pt-on-state", debugOn);
    els.pills.mute.g.classList.toggle("pt-on-state", muted);

    const time = BUILD.time ? new Date(BUILD.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    els.stamp.textContent = `build ${BUILD.build}${time ? ` · ${time}` : ""}${newBuild ? `  → ${newBuild.build} available` : ""}`;
    els.stamp.style.top = `${L.stampY}px`;

    rotated = L.vw > L.vh;
    els.rotate.style.display = rotated ? "flex" : "none";
    if (rotated) releaseAll();

    renderPressed();
    renderDebug();
  }

  function renderPressed() {
    if (!els.rings) return;
    for (const k in els.rings) els.rings[k].classList.toggle("pt-down", pressed.has(k));
    els.pills.select.g.classList.toggle("pt-down", pressed.has("Select"));
    els.pills.start.g.classList.toggle("pt-down", pressed.has("Start"));
  }

  function renderDebug() {
    const g = els.debug;
    while (g.firstChild) g.firstChild.remove();
    els.info.style.display = debugOn ? "block" : "none";
    if (!debugOn || !layout) return;
    const L = layout;
    const poly = (pts, cls) => svgEl("polygon", { points: pts.map((p) => `${p.x},${p.y}`).join(" "), class: cls }, g);
    const rectPts = (r) => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([x, y]) => toPage(T, x, y));
    const scale = Math.hypot(T.a, T.b);

    svgEl("rect", { x: L.screen.x, y: L.screen.y, width: L.screen.w, height: L.screen.h, class: "pt-dbg-screen" }, g);
    // D-pad: outer zone (with the +10 margin) and the 3 x 3 cell grid
    const half = DPAD_ZONE.size / 2 + DPAD_ZONE.extra, edge = DPAD_ZONE.size / 6;
    poly(rectPts({ x: DPAD.x - half, y: DPAD.y - half, w: half * 2, h: half * 2 }), "pt-dbg-zone");
    for (const v of [-edge, edge]) {
      const a = toPage(T, DPAD.x + v, DPAD.y - half), b = toPage(T, DPAD.x + v, DPAD.y + half);
      const c = toPage(T, DPAD.x - half, DPAD.y + v), d = toPage(T, DPAD.x + half, DPAD.y + v);
      svgEl("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "pt-dbg-grid" }, g);
      svgEl("line", { x1: c.x, y1: c.y, x2: d.x, y2: d.y, class: "pt-dbg-grid" }, g);
    }
    for (const k of Object.keys(PADS)) { const c = toPage(T, PADS[k].x, PADS[k].y); svgEl("circle", { cx: c.x, cy: c.y, r: DPAD.padR * scale, class: "pt-dbg-pad" }, g); }
    for (const k of Object.keys(BUTTONS)) {
      const b = BUTTONS[k], c = toPage(T, b.x, b.y);
      poly(rectPts(buttonZone(b)), "pt-dbg-zone");
      svgEl("circle", { cx: c.x, cy: c.y, r: b.r * scale, class: "pt-dbg-pad" }, g);
      const t = svgEl("text", { x: c.x, y: c.y, class: "pt-dbg-label" }, g);
      t.textContent = TILE_BUTTONS[k];
    }
    for (const p of L.pills) svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, class: "pt-dbg-zone" }, g);

    // Live touches
    for (const [id, s] of touches) {
      svgEl("circle", { cx: s.x, cy: s.y, r: 9, class: "pt-dbg-touch" }, g);
      const what = s.hit.kind === "game" ? s.hit.buttons.join("+") || "dead centre" : s.hit.kind === "none" ? "–" : s.hit.id;
      const t = svgEl("text", { x: Math.min(s.x + 12, L.vw - 120), y: s.y - 14, class: "pt-dbg-touch-label" }, g);
      t.textContent = `#${id} ${Math.round(s.x)},${Math.round(s.y)} → ${what}`;
    }

    const ctx = getAudioCtx();
    const sa = L.safe;
    els.info.textContent = [
      `viewport ${L.vw} x ${L.vh} @${window.devicePixelRatio}x ${L.exact ? "(13 Pro Max layout 1:1)" : "(NOT 428 x 926)"}`,
      `display-mode ${L.standalone ? "standalone" : "browser"}`,
      `safe-area t${sa.top} r${sa.right} b${sa.bottom} l${sa.left}`,
      `layout ${L.calibrated ? `calibrated (moved ${Math.round(T.tx)},${Math.round(T.ty)} s${scale.toFixed(3)} fit ±${L.cal.rms}px)` : "default"}`,
      `pressed ${[...pressed].join(" ") || "-"}`,
      `emulator ${getEmulator() ? "running" : "loading"} · audio ${ctx ? ctx.state : "-"}${muted ? " (muted)" : ""}`,
      `build ${BUILD.build}${newBuild ? ` (new: ${newBuild.build})` : ""}`,
    ].join("\n");
  }

  function relayout() {
    render();
    maybeOfferCalibration();
  }

  // ---------------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------------
  function init() {
    buildDom();
    const opts = { passive: false };
    for (const t of ["touchstart", "touchmove", "touchend", "touchcancel"]) els.layer.addEventListener(t, onTouch, opts);
    for (const t of ["mousedown", "mousemove", "mouseup", "mouseleave"]) els.layer.addEventListener(t, onMouse, opts);
    const block = (e) => e.preventDefault();
    for (const t of ["gesturestart", "gesturechange", "gestureend", "dblclick", "contextmenu", "selectstart"]) document.addEventListener(t, block, opts);

    window.addEventListener("resize", relayout);
    window.addEventListener("orientationchange", () => setTimeout(relayout, 250));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { releaseAll(); return; }
      const ctx = getAudioCtx();
      if (ctx && ctx.state !== "running") ctx.resume().catch(() => {}); // else the next tile press does it
      checkForNewBuild();
    });
    window.addEventListener("pagehide", releaseAll);
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pageshow", (e) => { if (e.persisted) { relayout(); checkForNewBuild(); } });

    // Play through the ring/silent switch like a game app does (Safari 17+); Mute is the off switch
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* unsupported */ }
    applyMute();
    relayout();
    setTimeout(checkForNewBuild, 500);
    setInterval(() => { if (!document.hidden) checkForNewBuild(); }, 60000);

    Object.assign(window.playtile, {
      hitTest: (x, y) => hitTest(x, y),
      pressed: () => [...pressed],
      layout: () => layout,
      points: () => {
        const p = (pt) => toPage(T, pt.x, pt.y);
        return { Up: p(PADS.Up), Down: p(PADS.Down), Left: p(PADS.Left), Right: p(PADS.Right), dpad: p(DPAD), small: p(BUTTONS.small), big: p(BUTTONS.big) };
      },
      mapping: TILE_BUTTONS,
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
