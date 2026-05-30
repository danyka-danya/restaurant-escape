/* =========================================================================
   controls3d.js — dual-touch: левый джойстик (move) + правый swipe (look)
   ========================================================================= */

const move = { x: 0, y: 0 };          // [-1, 1] normalized
const lookDelta = { dx: 0, dy: 0 };   // pixels since last consume
const flags = { hideRequested: false };

let joyEl, stickEl, lookEl, hideBtn;
let joyCenter = { x: 0, y: 0 };
let joyRadius = 50;
let joyTouchId = null;
let lookTouchId = null;
let lookLastX = 0, lookLastY = 0;

function setStick(dx, dy) {
  const mag = Math.hypot(dx, dy);
  if (mag > joyRadius) {
    dx = (dx / mag) * joyRadius;
    dy = (dy / mag) * joyRadius;
  }
  stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
  move.x = dx / joyRadius;
  move.y = dy / joyRadius;
}

function resetStick() {
  stickEl.style.transform = "translate(0, 0)";
  move.x = 0;
  move.y = 0;
  joyTouchId = null;
}

function updateJoyCenter() {
  const r = joyEl.getBoundingClientRect();
  joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  joyRadius = r.width / 2 - 28;
}

// ---------- Joystick handlers ----------
function onJoyStart(e) {
  e.preventDefault();
  if (joyTouchId !== null) return;
  const t = e.changedTouches[0];
  joyTouchId = t.identifier;
  updateJoyCenter();
  setStick(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
}

function onJoyMove(e) {
  if (joyTouchId === null) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== joyTouchId) continue;
    e.preventDefault();
    setStick(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
  }
}

function onJoyEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      resetStick();
      return;
    }
  }
}

// ---------- Look-zone handlers ----------
function onLookStart(e) {
  if (lookTouchId !== null) return;
  const t = e.changedTouches[0];
  lookTouchId = t.identifier;
  lookLastX = t.clientX;
  lookLastY = t.clientY;
  e.preventDefault();
}

function onLookMove(e) {
  if (lookTouchId === null) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== lookTouchId) continue;
    e.preventDefault();
    lookDelta.dx += t.clientX - lookLastX;
    lookDelta.dy += t.clientY - lookLastY;
    lookLastX = t.clientX;
    lookLastY = t.clientY;
  }
}

function onLookEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === lookTouchId) {
      lookTouchId = null;
      return;
    }
  }
}

// ---------- Mouse-fallback (desktop debug) ----------
let mouseInJoy = false, mouseInLook = false;
let mouseLastX = 0, mouseLastY = 0;

function onMouseDown(e) {
  if (e.target === joyEl || joyEl.contains(e.target)) {
    mouseInJoy = true;
    updateJoyCenter();
    setStick(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
  } else if (e.target === lookEl) {
    mouseInLook = true;
    mouseLastX = e.clientX;
    mouseLastY = e.clientY;
  }
}

function onMouseMove(e) {
  if (mouseInJoy) {
    setStick(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
  } else if (mouseInLook) {
    lookDelta.dx += e.clientX - mouseLastX;
    lookDelta.dy += e.clientY - mouseLastY;
    mouseLastX = e.clientX;
    mouseLastY = e.clientY;
  }
}

function onMouseUp() {
  if (mouseInJoy) resetStick();
  mouseInJoy = false;
  mouseInLook = false;
}

// ---------- Keyboard (desktop) ----------
const keys = { up: 0, down: 0, left: 0, right: 0 };
function setupKeyboard() {
  const map = {
    ArrowUp: "up", w: "up", W: "up", "ц": "up", "Ц": "up",
    ArrowDown: "down", s: "down", S: "down", "ы": "down", "Ы": "down",
    ArrowLeft: "left", a: "left", A: "left", "ф": "left", "Ф": "left",
    ArrowRight: "right", d: "right", D: "right", "в": "right", "В": "right",
  };
  document.addEventListener("keydown", (e) => {
    const k = map[e.key];
    if (k) keys[k] = 1;
    if (e.key === " " || e.key === "Enter") flags.hideRequested = true;
  });
  document.addEventListener("keyup", (e) => {
    const k = map[e.key];
    if (k) keys[k] = 0;
  });
}

// ---------- Public API ----------
export function initControls() {
  joyEl = document.getElementById("joystick");
  stickEl = document.getElementById("joystick-stick");
  lookEl = document.getElementById("look-zone");
  hideBtn = document.getElementById("hide-btn");

  if (!joyEl || !stickEl || !lookEl) {
    console.warn("controls3d: HUD elements missing");
    return;
  }

  joyEl.addEventListener("touchstart", onJoyStart, { passive: false });
  joyEl.addEventListener("touchmove", onJoyMove, { passive: false });
  joyEl.addEventListener("touchend", onJoyEnd);
  joyEl.addEventListener("touchcancel", onJoyEnd);

  lookEl.addEventListener("touchstart", onLookStart, { passive: false });
  lookEl.addEventListener("touchmove", onLookMove, { passive: false });
  lookEl.addEventListener("touchend", onLookEnd);
  lookEl.addEventListener("touchcancel", onLookEnd);

  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  if (hideBtn) {
    hideBtn.addEventListener("click", () => { flags.hideRequested = true; });
  }

  window.addEventListener("resize", updateJoyCenter);
  window.addEventListener("orientationchange", () => setTimeout(updateJoyCenter, 100));

  setupKeyboard();
  updateJoyCenter();
}

export function getMove() {
  // Объединяем джойстик и кейборд (если есть нажатие кейборда — оно главнее)
  const kx = keys.right - keys.left;
  const ky = keys.down - keys.up;
  if (kx !== 0 || ky !== 0) return { x: kx, y: ky };
  return { x: move.x, y: move.y };
}

export function consumeLook() {
  const out = { dx: lookDelta.dx, dy: lookDelta.dy };
  lookDelta.dx = 0;
  lookDelta.dy = 0;
  return out;
}

export function consumeHide() {
  if (flags.hideRequested) {
    flags.hideRequested = false;
    return true;
  }
  return false;
}

export function setHidingVisual(isHiding) {
  if (!hideBtn) return;
  hideBtn.classList.toggle("is-hiding", isHiding);
  const lbl = hideBtn.querySelector(".hide-btn__lbl");
  if (lbl) lbl.textContent = isHiding ? "Вылезти" : "Спрятаться";
}
