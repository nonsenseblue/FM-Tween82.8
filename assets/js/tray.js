// ============================================================
//  Tween 82.8 — Tray (clock + battery)
// ============================================================

// Clock
(function() {
  function tick() {
    const d = new Date();
    document.getElementById("tray-clock").textContent =
      String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  }
  setInterval(tick, 1000);
  tick();
})();

// Battery
(function() {
  const fill = document.getElementById("bat-fill");
  const tray = document.getElementById("tray-battery");
  if (!fill || !navigator.getBattery) return;
  navigator.getBattery().then(bat => {
    function update() {
      const pct = bat.level;
      fill.setAttribute("width", Math.round(pct * 10));
      fill.setAttribute("fill", pct < 0.2 ? "#ff0000" : "#000000");
      const label = bat.charging ? t("tray.charging") : "";
      tray.title = label + Math.round(pct * 100) + "%";
    }
    bat.addEventListener("levelchange",   update);
    bat.addEventListener("chargingchange", update);
    update();
  }).catch(() => {});
})();
