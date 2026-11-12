/*
 * Game picker: lists games.json and opens the chosen game's browser player.
 * Tap/click a title, or use the D-pad (tile or arrow keys) and A / Start / Enter.
 * With Playtile mode on, playtile.js sends tile presses to window.playtileTarget.
 */
(function () {
  "use strict";

  const list = document.getElementById("games");
  const status = document.getElementById("status");
  let games = [];
  let sel = 0;

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const when = (iso) => (iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
  const gameUrl = (g) => `${g.path}?b=${encodeURIComponent(g.build)}`; // new URL per build = never a stale copy

  function launch(i) {
    const g = games[i];
    if (!g) return;
    store.set("launcher.last", g.slug);
    location.href = gameUrl(g);
  }

  function select(i) {
    if (!games.length) return;
    sel = (i + games.length) % games.length;
    list.querySelectorAll(".game").forEach((li, n) => li.classList.toggle("selected", n === sel));
    const li = list.children[sel];
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  function render() {
    list.textContent = "";
    games.forEach((g, i) => {
      const li = document.createElement("li");
      li.className = "game";
      li.setAttribute("data-pt-tap", "");
      li.innerHTML = `
        <span class="cursor" aria-hidden="true">&#9654;</span>
        <div class="info">
          <div class="title"></div>
          <div class="meta"></div>
          <div class="note"></div>
        </div>
        <div class="actions">
          <a class="play">Play</a>
          <a class="download" download>.gbc</a>
        </div>`;
      li.querySelector(".title").textContent = g.title;
      li.querySelector(".meta").textContent = `build ${g.build}${g.time ? ` · ${when(g.time)}` : ""}`;
      li.querySelector(".note").textContent = g.note || "";
      li.querySelector(".play").href = gameUrl(g);
      const dl = li.querySelector(".download");
      if (g.rom) dl.href = g.rom; else dl.remove();
      dl.addEventListener("click", (e) => e.stopPropagation());
      li.addEventListener("click", (e) => { if (!e.target.closest("a")) launch(i); });
      list.appendChild(li);
    });
    status.textContent = games.length ? "" : "No games posted yet.";
    const want = new URLSearchParams(location.search).get("from") || store.get("launcher.last");
    select(Math.max(0, games.findIndex((g) => g.slug === want)));
  }

  fetch(`games.json?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((data) => { games = Array.isArray(data.games) ? data.games : []; render(); })
    .catch(() => { status.textContent = "Couldn't load the game list. Check your connection and tap RELOAD."; });

  // Playtile (or any) joypad input: D-pad moves, A / Start opens
  window.playtileTarget = {
    setJoypUp: (down) => { if (down) select(sel - 1); },
    setJoypDown: (down) => { if (down) select(sel + 1); },
    setJoypA: (down) => { if (down) launch(sel); },
    setJoypStart: (down) => { if (down) launch(sel); },
    setJoypB() {},
    setJoypLeft() {},
    setJoypRight() {},
    setJoypSelect() {},
  };

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") select(sel - 1);
    else if (k === "arrowdown" || k === "s") select(sel + 1);
    else if (k === "enter" || k === "z" || k === "j") launch(sel);
    else return;
    e.preventDefault();
  });
})();
