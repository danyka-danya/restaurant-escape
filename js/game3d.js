/* =========================================================================
   game3d.js — main entry: Three.js renderer + game state machine
   ========================================================================= */
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";
import {
  buildScene,
  collides,
  flickerCandles,
  driftDust,
  whichRoom,
  ROOMS,
} from "./scene3d.js";
import { buildPlayer, bobWhileMoving } from "./player3d.js";
import { buildMonster, updateMonster, teleportMonsterFar } from "./monster.js";
import { buildPickups, animatePickups, checkPickup, KEY_TYPES } from "./pickup.js";
import {
  initControls,
  getMove,
  consumeLook,
  consumeHide,
  setHidingVisual,
} from "./controls3d.js";

const canvas = document.getElementById("game-canvas");
const loadingEl = document.getElementById("loading");
const startOverlay = document.getElementById("start-overlay");
const startBtn = document.getElementById("start-btn");
const toastEl = document.getElementById("toast");
const roomLabel = document.getElementById("hud-room");
const keysHud = document.getElementById("hud-keys");
const cutsceneEl = document.getElementById("cutscene");
const cutsceneTitle = document.getElementById("cutscene-title");
const cutsceneBody = document.getElementById("cutscene-body");
const cutsceneBtn = document.getElementById("cutscene-btn");

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ---------- Scene + entities ----------
const { scene, colliders, candles, hideSpots, dust } = buildScene();
const player = buildPlayer();
player.position.set(0, 0, 15.5); // спавн возле выхода
scene.add(player);

const monster = buildMonster();
scene.add(monster);

const pickups = buildPickups();
for (const p of pickups) scene.add(p);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
let camYaw = Math.PI;
let camPitch = 0.35;
const CAM_DIST = 5.5;
const CAM_HEIGHT_OFFSET = 1.5;
const CAM_TARGET_OFFSET = 1.3;

function applyCamera() {
  const px = player.position.x;
  const py = player.position.y;
  const pz = player.position.z;
  const cosP = Math.cos(camPitch);
  const ox = Math.sin(camYaw) * cosP * CAM_DIST;
  const oz = Math.cos(camYaw) * cosP * CAM_DIST;
  const oy = Math.sin(camPitch) * CAM_DIST + CAM_HEIGHT_OFFSET;
  camera.position.set(px + ox, py + oy, pz + oz);
  camera.lookAt(px, py + CAM_TARGET_OFFSET, pz);
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", () => setTimeout(onResize, 100));
onResize();

// ---------- Toast ----------
let toastTimer = null;
function showToast(msg, ms = 1800) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}

function showCutscene(title, body, btnText, onClose) {
  cutsceneTitle.textContent = title;
  cutsceneBody.innerHTML = body;
  cutsceneBtn.textContent = btnText;
  cutsceneEl.hidden = false;
  const handler = () => {
    cutsceneBtn.removeEventListener("click", handler);
    cutsceneEl.hidden = true;
    if (onClose) onClose();
  };
  cutsceneBtn.addEventListener("click", handler);
}

// ---------- HUD ----------
function renderKeysHud(state) {
  const slots = keysHud.querySelectorAll(".hud__key");
  KEY_TYPES.forEach((def, i) => {
    const slot = slots[i];
    if (state.keysCollected.includes(def.id)) {
      slot.textContent = def.icon;
      slot.classList.add("is-collected");
    } else {
      slot.textContent = "·";
      slot.classList.remove("is-collected");
    }
  });
}

function updateRoomLabel() {
  const id = whichRoom(player.position.x, player.position.z);
  const room = ROOMS[id];
  if (room) roomLabel.textContent = room.name;
}

// ---------- Hide-spot detection ----------
function nearestHideSpot() {
  for (const h of hideSpots) {
    const dx = h.x - player.position.x;
    const dz = h.z - player.position.z;
    if (dx * dx + dz * dz < h.r * h.r) return h;
  }
  return null;
}

// ---------- Game state ----------
const STATE = { INTRO: 0, PLAYING: 1, CAUGHT: 2, WON: 3, PAUSED: 4 };
let gameState = STATE.INTRO;
let lastTs = 0;
let gameTime = 0;
let save = Save.load();
let lastKnownHide = null;

function startGame(fromReset = false) {
  if (fromReset) {
    Save.reset();
    save = Save.load();
    for (const p of pickups) {
      p.userData.collected = false;
      p.visible = true;
    }
    setHidingVisual(false);
    player.userData.hiding = false;
  }
  player.position.set(0, 0, 15.5);
  player.rotation.y = Math.PI;
  monster.position.set(monster.userData.waypoints[0].x, 0, monster.userData.waypoints[0].z);
  monster.userData.targetIdx = 1;
  monster.userData.waitTimer = 1;
  camYaw = Math.PI;
  camPitch = 0.35;
  gameState = STATE.PLAYING;
  startOverlay.hidden = true;
  cutsceneEl.hidden = true;
  renderKeysHud(save);
  updateRoomLabel();
}

function showCaught() {
  gameState = STATE.CAUGHT;
  setHidingVisual(false);
  player.userData.hiding = false;
  // Уберём 1 случайный ключ для мягкого fail'а
  let lost = null;
  if (save.keysCollected.length > 0) {
    const idx = Math.floor(Math.random() * save.keysCollected.length);
    lost = save.keysCollected[idx];
    save.keysCollected.splice(idx, 1);
    Save.save(save);
    const lostP = pickups.find(p => p.userData.id === lost);
    if (lostP) { lostP.userData.collected = false; lostP.visible = true; }
  }
  const lostMsg = lost
    ? `Призрак выхватил у тебя <b>${KEY_TYPES.find(k => k.id === lost).label.toLowerCase()}</b> и спрятал обратно.`
    : "Призрак вернул тебя ко входу.";
  showCutscene(
    "Призрак тебя увидел!",
    `${lostMsg}<br><br>Попробуй ещё раз. Прячься под столами и в шкафах.`,
    "Снова",
    () => startGame(false)
  );
}

function showWon() {
  gameState = STATE.WON;
  showCutscene(
    "Ты сбежал!",
    "Двери ресторана со скрипом открылись. Призрак повара выглянул из темноты — но не злой, а грустный.<br><br>«Спасибо, что не забыл меня,» — прошептал он и растворился.<br><br>Ты выбежал на улицу. Дома тебя ждал ужин.",
    "Сыграть снова",
    () => startGame(true)
  );
}

// ---------- Main loop ----------
function tick(ts) {
  requestAnimationFrame(tick);
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  gameTime += dt;

  flickerCandles(candles, gameTime);
  driftDust(dust, gameTime);
  animatePickups(pickups, gameTime);

  if (gameState === STATE.INTRO) {
    camYaw += dt * 0.08;
    applyCamera();
    renderer.render(scene, camera);
    return;
  }

  if (gameState === STATE.PLAYING) {
    // Camera look
    const look = consumeLook();
    camYaw -= look.dx * 0.005;
    camPitch += look.dy * 0.004;
    camPitch = Math.max(0.1, Math.min(0.95, camPitch));

    // Hide toggle
    if (consumeHide()) {
      if (player.userData.hiding) {
        player.userData.hiding = false;
        setHidingVisual(false);
        showToast("Вылез");
      } else {
        const spot = nearestHideSpot();
        if (spot) {
          player.userData.hiding = true;
          setHidingVisual(true);
          showToast(`Спрятался ${spot.label}`);
          lastKnownHide = spot;
        } else {
          showToast("Здесь негде спрятаться", 1200);
        }
      }
    }

    // Player movement (camera-relative)
    const move = getMove();
    const mag = Math.hypot(move.x, move.y);
    let isMoving = false;
    if (!player.userData.hiding && mag > 0.08) {
      isMoving = true;
      const fx = -Math.sin(camYaw);
      const fz = -Math.cos(camYaw);
      const rx = -fz;
      const rz = fx;
      const forward = -move.y;
      const right = move.x;
      const dx = (fx * forward + rx * right) * player.userData.speed * dt;
      const dz = (fz * forward + rz * right) * player.userData.speed * dt;
      const nx = player.position.x + dx;
      if (!collides(nx, player.position.z, colliders)) player.position.x = nx;
      const nz = player.position.z + dz;
      if (!collides(player.position.x, nz, colliders)) player.position.z = nz;
      // Rotate to movement direction
      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotation.y += diff * Math.min(1, dt * 12);
    }
    bobWhileMoving(player, dt, isMoving);

    // Flashlight target updates with camera yaw (направлен по взгляду)
    const fdx = -Math.sin(camYaw);
    const fdz = -Math.cos(camYaw);
    player.userData.flashTarget.position.set(fdx * 8, 0, fdz * 8);

    // Прозрачность игрока в hide-режиме
    player.traverse(o => {
      if (o.isMesh && o.material && "opacity" in o.material) {
        o.material.transparent = true;
        o.material.opacity = player.userData.hiding ? 0.35 : 1;
      }
    });

    // Pickup check
    const picked = checkPickup(pickups, player);
    if (picked) {
      Save.markKey(save, picked.userData.id);
      renderKeysHud(save);
      showToast(`✨ ${picked.userData.label}`);
      // Если все 4 собраны
      if (save.keysCollected.length === KEY_TYPES.length) {
        showToast("🔑 Все ключи у тебя! Беги к двери!", 2500);
      }
    }

    // Monster update + catch
    const caught = updateMonster(monster, dt, player, colliders, save.keysCollected.length);
    if (caught) {
      showCaught();
    }

    // Win check
    const dDoor = Math.hypot(player.position.x - 0, player.position.z - 17);
    if (save.keysCollected.length === KEY_TYPES.length && dDoor < 2.5) {
      showWon();
    }

    updateRoomLabel();
  }

  applyCamera();
  renderer.render(scene, camera);
}

// ---------- Intro ----------
function showIntro() {
  showCutscene(
    "Тебя забыли в ресторане",
    "Ты задержался в туалете — а официанты закрыли заведение и ушли.<br><br>Двери заперты. Где-то рядом бродит <b>Призрак Повара</b>, который ищет того, кто забрал его 4 любимые вещи.<br><br>Найди их в комнатах и беги к <b>светящейся оранжевой двери</b>.",
    "Войти в ресторан",
    () => startGame(true)
  );
}

// ---------- Boot ----------
function boot() {
  renderer.render(scene, camera);
  requestAnimationFrame(() => {
    loadingEl.hidden = true;
    startOverlay.hidden = false;
  });
  initControls();
  requestAnimationFrame(tick);
}

startBtn.addEventListener("click", () => {
  startOverlay.hidden = true;
  showIntro();
});

window.addEventListener("load", () => setTimeout(boot, 50));
