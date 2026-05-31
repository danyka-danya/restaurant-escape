/* =========================================================================
   monster.js — призрак-повар: патруль по waypoints + конус зрения + поимка
   ========================================================================= */
import * as THREE from "./vendor/three.module.min.js";
import { lineBlocked } from "./scene3d.js";

const VISION_RANGE_NORMAL = 8;
const VISION_RANGE_ANGRY = 11;
const VISION_CONE_RAD = Math.PI / 3; // ±30° = 60° конус

// Waypoint loop — обход всех комнат
const WAYPOINTS = [
  { x:  0, z: 13 },   // главный зал центр
  { x: -8, z:  9 },   // зап. часть зала
  { x:  8, z:  9 },   // вост. часть зала
  { x: -6, z:  1 },   // вход в туалет
  { x: -6, z: -3 },   // глубина туалета
  { x: -6, z: -8 },   // вход в кухню
  { x: -8, z: -14 },  // кухня дальний угол
  { x:  6, z: -14 },  // склад дальний угол
  { x:  6, z: -8 },   // выход из склада
  { x:  6, z: -3 },   // кабинет
  { x:  6, z:  1 },   // выход из кабинета
];

export function buildMonster() {
  const group = new THREE.Group();

  // Тело — широкая «мантия» из конуса
  const robeMat = new THREE.MeshStandardMaterial({
    color: 0x2a1840,
    roughness: 0.4,
    emissive: 0x4a2c80,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 16), robeMat);
  robe.position.y = 1.2;
  robe.castShadow = true;
  group.add(robe);

  // Голова — сфера полупрозрачная
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xe0d8ff,
    roughness: 0.3,
    emissive: 0xa080ff,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), headMat);
  head.position.y = 2.45;
  head.castShadow = true;
  group.add(head);

  // Колпак повара
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.5, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xf4e9cd, roughness: 0.6 })
  );
  hat.position.y = 3.1;
  group.add(hat);
  const hatTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf4e9cd, roughness: 0.6 })
  );
  hatTop.position.y = 3.35;
  group.add(hatTop);

  // Глаза — два чёрных провала с подсветкой
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3050 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  eyeL.position.set(-0.18, 2.5, 0.45);
  eyeR.position.set( 0.18, 2.5, 0.45);
  group.add(eyeL, eyeR);

  // Свечение вокруг призрака
  const aura = new THREE.PointLight(0x9d4edd, 1.2, 6);
  aura.position.y = 2;
  group.add(aura);

  // Визуальный конус зрения
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xff3050,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coneGeo = new THREE.ConeGeometry(VISION_RANGE_NORMAL * Math.tan(VISION_CONE_RAD), VISION_RANGE_NORMAL, 16, 1, true);
  const visionCone = new THREE.Mesh(coneGeo, coneMat);
  visionCone.rotation.x = Math.PI / 2;
  visionCone.position.set(0, 0.5, VISION_RANGE_NORMAL / 2);
  group.add(visionCone);

  group.userData = {
    speed: 1.6,
    angrySpeed: 2.6,
    facing: 0,
    targetIdx: 0,
    waitTimer: 0,
    visionRange: VISION_RANGE_NORMAL,
    visionCone,
    aura,
    eyeL, eyeR,
    angry: false,
    waypoints: WAYPOINTS,
  };

  // Стартовая позиция
  group.position.set(WAYPOINTS[0].x, 0, WAYPOINTS[0].z);
  return group;
}

export function updateMonster(monster, dt, player, colliders, keyCount) {
  const ud = monster.userData;
  // Angry mode: 3+ ключей
  ud.angry = keyCount >= 3;
  ud.visionRange = ud.angry ? VISION_RANGE_ANGRY : VISION_RANGE_NORMAL;
  const speed = ud.angry ? ud.angrySpeed : ud.speed;

  // Обновляем визуал конуса
  const visionRangeScale = ud.visionRange / VISION_RANGE_NORMAL;
  ud.visionCone.scale.set(visionRangeScale, visionRangeScale, visionRangeScale);
  ud.visionCone.material.color.setHex(ud.angry ? 0xff0030 : 0xff5060);
  ud.eyeL.material.color.setHex(ud.angry ? 0xff0040 : 0xff5070);
  ud.eyeR.material.color.setHex(ud.angry ? 0xff0040 : 0xff5070);
  ud.aura.color.setHex(ud.angry ? 0xff3050 : 0x9d4edd);

  // Pathfind to current waypoint
  const wp = ud.waypoints[ud.targetIdx];
  const dx = wp.x - monster.position.x;
  const dz = wp.z - monster.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.4) {
    ud.waitTimer -= dt;
    if (ud.waitTimer <= 0) {
      ud.targetIdx = (ud.targetIdx + 1) % ud.waypoints.length;
      ud.waitTimer = ud.angry ? 0.3 : 1.2 + Math.random();
    }
  } else {
    const nx = dx / dist;
    const nz = dz / dist;
    const targetAngle = Math.atan2(nx, nz);
    // плавный поворот
    let diff = targetAngle - ud.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const rotSpeed = ud.angry ? 4 : 2.5;
    ud.facing += diff * Math.min(1, dt * rotSpeed);

    // Лёгкое покачивание
    monster.position.x += Math.sin(ud.facing) * speed * dt;
    monster.position.z += Math.cos(ud.facing) * speed * dt;
    monster.position.y = Math.sin(performance.now() * 0.003) * 0.08;
  }
  monster.rotation.y = ud.facing;

  // ---------- Vision check ----------
  if (player.userData.hiding) return false;
  const pdx = player.position.x - monster.position.x;
  const pdz = player.position.z - monster.position.z;
  const pdist = Math.hypot(pdx, pdz);
  if (pdist > ud.visionRange) return false;

  // Угол между фейсом монстра и игроком
  const angleToPlayer = Math.atan2(pdx, pdz);
  let aDiff = angleToPlayer - ud.facing;
  while (aDiff > Math.PI) aDiff -= Math.PI * 2;
  while (aDiff < -Math.PI) aDiff += Math.PI * 2;
  if (Math.abs(aDiff) > VISION_CONE_RAD) return false;

  // Прямая видимость (стены могут блокировать)
  if (lineBlocked(monster.position.x, monster.position.z, player.position.x, player.position.z, colliders)) return false;

  return true; // caught!
}

export function teleportMonsterFar(monster, fromX, fromZ) {
  // Перенести монстра на самый дальний waypoint от точки
  let best = 0, bestDist = -1;
  monster.userData.waypoints.forEach((wp, i) => {
    const d = Math.hypot(wp.x - fromX, wp.z - fromZ);
    if (d > bestDist) { bestDist = d; best = i; }
  });
  const wp = monster.userData.waypoints[best];
  monster.position.set(wp.x, 0, wp.z);
  monster.userData.targetIdx = (best + 1) % monster.userData.waypoints.length;
  monster.userData.waitTimer = 1.5;
}
