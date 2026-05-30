/* =========================================================================
   controls.js — виртуальный джойстик + кнопка «спрятаться»
   Возвращает нормализованный input {x, y} в диапазоне [-1, 1]
   ========================================================================= */
(function () {
  const input = { x: 0, y: 0, hide: false, hideToggleRequested: false };

  let joyEl, stickEl, hideBtn;
  let joyCenter = { x: 0, y: 0 };
  let joyRadius = 50;
  let activeTouchId = null;

  function setStick(dx, dy) {
    const mag = Math.hypot(dx, dy);
    if (mag > joyRadius) {
      dx = (dx / mag) * joyRadius;
      dy = (dy / mag) * joyRadius;
    }
    stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
    input.x = dx / joyRadius;
    input.y = dy / joyRadius;
  }

  function resetStick() {
    stickEl.style.transform = "translate(0, 0)";
    input.x = 0;
    input.y = 0;
    activeTouchId = null;
  }

  function updateJoyCenter() {
    const r = joyEl.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    joyRadius = r.width / 2 - 28; // padding под стик
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (activeTouchId !== null) return;
    const t = e.changedTouches[0];
    activeTouchId = t.identifier;
    updateJoyCenter();
    setStick(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== activeTouchId) continue;
      setStick(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
    }
  }

  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === activeTouchId) {
        resetStick();
        return;
      }
    }
  }

  // Mouse-fallback для отладки в десктоп-браузере
  let mouseDown = false;
  function onMouseDown(e) {
    mouseDown = true;
    updateJoyCenter();
    setStick(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
  }
  function onMouseMove(e) {
    if (!mouseDown) return;
    setStick(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
  }
  function onMouseUp() {
    mouseDown = false;
    resetStick();
  }

  function onHideClick() {
    input.hideToggleRequested = true;
  }

  function consumeHideToggle() {
    if (input.hideToggleRequested) {
      input.hideToggleRequested = false;
      return true;
    }
    return false;
  }

  function setHidingVisual(isHiding) {
    if (!hideBtn) return;
    hideBtn.classList.toggle("is-hiding", isHiding);
    hideBtn.querySelector(".hide-btn__lbl").textContent = isHiding ? "Вылезти" : "Спрятаться";
  }

  function setupKeyboard() {
    // WASD / стрелки для отладки на десктопе
    const keys = { up: 0, down: 0, left: 0, right: 0 };
    const map = {
      ArrowUp: "up", w: "up", W: "up", "ц": "up", "Ц": "up",
      ArrowDown: "down", s: "down", S: "down", "ы": "down", "Ы": "down",
      ArrowLeft: "left", a: "left", A: "left", "ф": "left", "Ф": "left",
      ArrowRight: "right", d: "right", D: "right", "в": "right", "В": "right",
    };
    document.addEventListener("keydown", (e) => {
      const k = map[e.key];
      if (k) {
        keys[k] = 1;
        applyKeys();
      }
      if (e.key === " " || e.key === "Enter") {
        input.hideToggleRequested = true;
      }
    });
    document.addEventListener("keyup", (e) => {
      const k = map[e.key];
      if (k) {
        keys[k] = 0;
        applyKeys();
      }
    });
    function applyKeys() {
      // если кнопки нажаты — джойстик-логика игнорится; используем кейборд как input
      const kx = (keys.right - keys.left);
      const ky = (keys.down - keys.up);
      if (kx !== 0 || ky !== 0) {
        input.x = kx;
        input.y = ky;
      } else if (!mouseDown && activeTouchId === null) {
        input.x = 0;
        input.y = 0;
      }
    }
  }

  function init() {
    joyEl = document.getElementById("joystick");
    stickEl = document.getElementById("joystick-stick");
    hideBtn = document.getElementById("hide-btn");

    if (!joyEl || !stickEl) return;

    joyEl.addEventListener("touchstart", onTouchStart, { passive: false });
    joyEl.addEventListener("touchmove", onTouchMove, { passive: false });
    joyEl.addEventListener("touchend", onTouchEnd);
    joyEl.addEventListener("touchcancel", onTouchEnd);

    joyEl.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    if (hideBtn) {
      hideBtn.addEventListener("click", onHideClick);
    }

    window.addEventListener("resize", updateJoyCenter);
    window.addEventListener("orientationchange", updateJoyCenter);

    setupKeyboard();
    updateJoyCenter();
  }

  window.Controls = {
    init,
    input,
    consumeHideToggle,
    setHidingVisual,
  };
})();
