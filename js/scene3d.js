/* =========================================================================
   scene3d.js — построение 3D-сцены ресторана: пол, стены, мебель, освещение
   Возвращает { scene, colliders, candles, doorTarget }
   ========================================================================= */
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";

// Размеры главного зала (в условных метрах)
export const ROOM = { width: 24, depth: 36, height: 4 };
// Player AABB-радиус для коллизий — используется при move-check
export const PLAYER_R = 0.45;

export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e27);
  scene.fog = new THREE.FogExp2(0x0a0e27, 0.045);

  // ---------- Освещение ----------
  const ambient = new THREE.AmbientLight(0x404870, 0.35);
  scene.add(ambient);

  // Лунный свет из окна — directional с тенями
  const moon = new THREE.DirectionalLight(0xb8c8ff, 0.55);
  moon.position.set(12, 18, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -18;
  moon.shadow.camera.right = 18;
  moon.shadow.camera.top = 22;
  moon.shadow.camera.bottom = -22;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 50;
  moon.shadow.bias = -0.0005;
  scene.add(moon);

  // ---------- Пол ----------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a1d4a,
    roughness: 0.85,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Клетчатый узор-overlay из тёмных квадратов
  for (let i = -ROOM.width / 2 + 2; i < ROOM.width / 2 - 1; i += 4) {
    for (let j = -ROOM.depth / 2 + 2; j < ROOM.depth / 2 - 1; j += 4) {
      if (((i + j) & 4) === 0) continue;
      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 3.6),
        new THREE.MeshStandardMaterial({ color: 0x1c1336, roughness: 0.9 })
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(i, 0.01, j);
      tile.receiveShadow = true;
      scene.add(tile);
    }
  }

  // ---------- Стены ----------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f44,
    roughness: 0.8,
  });

  function addWall(x, z, w, d) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(w, ROOM.height, d),
      wallMat
    );
    wall.position.set(x, ROOM.height / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  // Север (с проёмом-дверью)
  addWall(-(ROOM.width / 2) + 5.5, -ROOM.depth / 2, 11, 0.4);
  addWall( (ROOM.width / 2) - 5.5, -ROOM.depth / 2, 11, 0.4);
  // Юг (со светящимся выходом)
  addWall(-(ROOM.width / 2) + 5.5,  ROOM.depth / 2, 11, 0.4);
  addWall( (ROOM.width / 2) - 5.5,  ROOM.depth / 2, 11, 0.4);
  // Запад / Восток
  addWall(-ROOM.width / 2, 0, 0.4, ROOM.depth);
  addWall( ROOM.width / 2, 0, 0.4, ROOM.depth);

  // ---------- Парадная дверь — цель (южная стена, светится) ----------
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xff7b35,
    emissive: 0xff7b35,
    emissiveIntensity: 0.5,
    roughness: 0.4,
  });
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 0.2),
    doorMat
  );
  door.position.set(0, 1.5, ROOM.depth / 2 - 0.1);
  scene.add(door);

  const doorGlow = new THREE.PointLight(0xff7b35, 1.5, 10);
  doorGlow.position.set(0, 2, ROOM.depth / 2 - 1);
  scene.add(doorGlow);

  // ---------- Мебель: столы + стулья ----------
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a3c,
    roughness: 0.7,
  });
  const tableTopMat = new THREE.MeshStandardMaterial({
    color: 0xa67849,
    roughness: 0.6,
  });

  const colliders = []; // {x, z, hw, hd} — AABB для коллизий

  function addTableWithChairs(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // ножка
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.85, 8),
      woodMat
    );
    leg.position.y = 0.425;
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);

    // столешница
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.1, 24),
      tableTopMat
    );
    top.position.y = 0.9;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 2 стула
    for (const side of [-1.6, 1.6]) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.1, 0.7),
        woodMat
      );
      seat.position.set(side, 0.5, 0);
      seat.castShadow = true;
      seat.receiveShadow = true;
      group.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.9, 0.7),
        woodMat
      );
      back.position.set(side + (side > 0 ? 0.3 : -0.3), 0.95, 0);
      back.castShadow = true;
      group.add(back);

      for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
        const chairLeg = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.5, 0.07),
          woodMat
        );
        chairLeg.position.set(side + lx, 0.25, lz);
        chairLeg.castShadow = true;
        group.add(chairLeg);
      }
    }

    scene.add(group);
    // collider — стол радиусом ~1.2 + стулья снаружи ~0.4 каждый, но для движения достаточно стола
    colliders.push({ x, z, hw: 1.15, hd: 1.15 });
  }

  const tablePositions = [
    [-7, -10], [0, -10], [7, -10],
    [-7,  -2],           [7,  -2],
    [-7,   6], [0,   6], [7,   6],
  ];
  for (const [x, z] of tablePositions) addTableWithChairs(x, z);

  // ---------- Барная стойка (вдоль западной стены) ----------
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.6 })
  );
  bar.position.set(-ROOM.width / 2 + 1.2, 0.55, 12);
  bar.castShadow = true;
  bar.receiveShadow = true;
  scene.add(bar);
  colliders.push({ x: -ROOM.width / 2 + 1.2, z: 12, hw: 0.6, hd: 4 });

  // ---------- Свечи (point-light + мерцание) ----------
  const candles = [];
  function addCandle(x, z) {
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0xf4e9cd, roughness: 0.4 })
    );
    wax.position.set(x, 1.13, z);
    wax.castShadow = true;
    scene.add(wax);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.18, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb066 })
    );
    flame.position.set(x, 1.45, z);
    scene.add(flame);

    const light = new THREE.PointLight(0xff9050, 1.8, 7, 2);
    light.position.set(x, 1.5, z);
    light.castShadow = false;
    scene.add(light);

    candles.push({ light, flame, baseIntensity: 1.8, phase: Math.random() * Math.PI * 2 });
  }
  for (const [x, z] of tablePositions) addCandle(x, z);

  // ---------- Подвешенные лампы у потолка (тусклые) ----------
  for (const [x, z] of [[-6, -14], [6, -14], [-6, 14], [6, 14], [0, 0]]) {
    const lamp = new THREE.PointLight(0x6680ff, 0.45, 12);
    lamp.position.set(x, 3.5, z);
    scene.add(lamp);
  }

  return { scene, colliders, candles, door };
}

// Проверка коллизии для попытки переместить игрока в (x, z)
export function collides(x, z, colliders) {
  // Стены комнаты
  const halfW = ROOM.width / 2 - 0.5;
  const halfD = ROOM.depth / 2 - 0.5;
  if (x < -halfW + PLAYER_R || x > halfW - PLAYER_R) return true;
  if (z < -halfD + PLAYER_R || z > halfD - PLAYER_R) return true;

  // AABB-circle для каждого collider'а
  for (const c of colliders) {
    const cx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
    const cz = Math.max(c.z - c.hd, Math.min(z, c.z + c.hd));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < PLAYER_R * PLAYER_R) return true;
  }
  return false;
}

export function flickerCandles(candles, t) {
  for (const c of candles) {
    const f = Math.sin(t * 6 + c.phase) * 0.15 + Math.sin(t * 17 + c.phase * 3) * 0.08;
    c.light.intensity = c.baseIntensity * (1 + f);
    c.flame.scale.y = 1 + f * 0.5;
  }
}
