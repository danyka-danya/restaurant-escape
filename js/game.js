/* =========================================================================
   game.js — game loop, рендер, координация
   ========================================================================= */
(function () {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let viewW = 0;   // CSS px
  let viewH = 0;
  let state = null;
  let player = null;
  let room = null;
  let lastTs = 0;
  let raf = null;
  let started = false;

  // Камера: масштабируем комнату в viewport по ширине, остальное центрируем
  function getCamera() {
    const scale = Math.min(viewW / room.width, viewH / room.height);
    const offX = (viewW - room.width * scale) / 2;
    const offY = (viewH - room.height * scale) / 2;
    return { scale, offX, offY };
  }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const r = canvas.getBoundingClientRect();
    viewW = Math.floor(r.width);
    viewH = Math.floor(r.height);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render() {
    // фон вьюпорта
    ctx.fillStyle = "#0a0e27";
    ctx.fillRect(0, 0, viewW, viewH);

    const cam = getCamera();
    ctx.save();
    ctx.translate(cam.offX, cam.offY);
    ctx.scale(cam.scale, cam.scale);

    room.drawBackground(ctx);
    room.drawObstacles(ctx);
    player.draw(ctx);

    ctx.restore();
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000); // cap 50ms (anti-stutter)
    lastTs = ts;

    if (Controls.consumeHideToggle()) {
      // На День 1 — просто toggle визуального состояния; реальная hide-логика на День 4
      player.hiding = !player.hiding;
      Controls.setHidingVisual(player.hiding);
      showToast(player.hiding ? "Ты прячешься (placeholder)" : "Вылез");
    }

    player.update(dt, Controls.input, room);
    render();
  }

  function showToast(msg, ms = 1400) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.hidden = true; }, ms);
  }

  function startGame() {
    if (started) return;
    started = true;
    document.getElementById("start-overlay").hidden = true;

    state = Save.load();
    room = Scenes.ROOMS[state.currentRoom] || Scenes.ROOMS.hall;
    player = new Entities.Player(room.spawn.x, room.spawn.y);

    document.getElementById("hud-room").textContent = room.name;

    resize();
    Controls.init();
    raf = requestAnimationFrame(tick);
  }

  function init() {
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 100));

    document.getElementById("start-btn").addEventListener("click", startGame);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.Game = { showToast };
})();
