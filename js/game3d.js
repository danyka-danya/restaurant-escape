/* =========================================================================
   game3d.js — main entry: Three.js renderer, camera follow, game loop
   ========================================================================= */
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";
import { buildScene, collides, flickerCandles, ROOM } from "./scene3d.js";
import { buildPlayer, bobWhileMoving } from "./player3d.js";
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
renderer.toneMappingExposure = 1.05;

// ---------- Scene + Player ----------
const { scene, colliders, candles } = buildScene();
const player = buildPlayer();
player.position.set(0, 0, ROOM.depth / 2 - 3); // спавн возле парадной двери (внутри)
scene.add(player);

// ---------- Camera (3rd-person follow) ----------
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
let camYaw = Math.PI;     // смотрим в сторону -Z (вглубь зала)
let camPitch = 0.35;      // лёгкий наклон вниз
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

// ---------- Resize ----------
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

// ---------- Toast helper ----------
let toastTimer = null;
function showToast(msg, ms = 1500) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}

// ---------- Game state ----------
let started = false;
let lastTs = 0;
let gameTime = 0;

function tick(ts) {
  requestAnimationFrame(tick);
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  gameTime += dt;

  if (!started) {
    // Idle: тихий поворот камеры вокруг сцены, мерцание свечей
    camYaw += dt * 0.08;
    applyCamera();
    flickerCandles(candles, gameTime);
    renderer.render(scene, camera);
    return;
  }

  // -------- Камера (свайп) --------
  const look = consumeLook();
  camYaw -= look.dx * 0.005;
  camPitch += look.dy * 0.004;
  camPitch = Math.max(0.1, Math.min(0.95, camPitch));

  // -------- Hide toggle --------
  if (consumeHide()) {
    player.userData.hiding = !player.userData.hiding;
    setHidingVisual(player.userData.hiding);
    showToast(player.userData.hiding ? "Ты прячешься (placeholder)" : "Вылез");
  }

  // -------- Движение игрока (camera-relative) --------
  const move = getMove();
  const mag = Math.hypot(move.x, move.y);
  let isMoving = false;

  if (!player.userData.hiding && mag > 0.08) {
    isMoving = true;
    // forward в мире = направление, куда смотрит камера (по xz)
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    // right = forward rotated -90° around Y → (-fz, fx)
    const rx = -fz;
    const rz = fx;

    const forward = -move.y; // up on joystick = forward
    const right = move.x;

    const dx = (fx * forward + rx * right) * player.userData.speed * dt;
    const dz = (fz * forward + rz * right) * player.userData.speed * dt;

    // движение по осям отдельно — slide along walls
    const nx = player.position.x + dx;
    if (!collides(nx, player.position.z, colliders)) player.position.x = nx;
    const nz = player.position.z + dz;
    if (!collides(player.position.x, nz, colliders)) player.position.z = nz;

    // поворот игрока — в сторону движения (smoothed)
    const targetAngle = Math.atan2(dx, dz);
    const cur = player.rotation.y;
    let diff = targetAngle - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.rotation.y = cur + diff * Math.min(1, dt * 12);
  }

  bobWhileMoving(player, dt, isMoving);
  flickerCandles(candles, gameTime);

  // прозрачность игрока в «спрятался»
  player.traverse(o => {
    if (o.isMesh && o.material && "opacity" in o.material) {
      o.material.transparent = true;
      o.material.opacity = player.userData.hiding ? 0.35 : 1;
    }
  });

  applyCamera();
  renderer.render(scene, camera);
}

// ---------- Boot ----------
function boot() {
  // 1 фрейм рендера, потом убираем loading и показываем start-overlay
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
  started = true;
  camYaw = Math.PI;
  camPitch = 0.35;
  // приветственный toast
  showToast("Найди 4 ключа и беги к оранжевой двери");
});

// Запускаем чуть с задержкой, чтобы шрифты/CSS успели прогрузиться
window.addEventListener("load", () => setTimeout(boot, 50));
