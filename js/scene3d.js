/* =========================================================================
   scene3d.js — 5-зальная планировка ресторана:
     - Главный зал (нижний, со светящейся выходной дверью)
     - Кухня (верх-лево)
     - Склад (верх-право)
     - Туалет (середина-лево)
     - Кабинет менеджера (середина-право)
   Зоны разделены стенами с проёмами 2.5м.
   ========================================================================= */
import * as THREE from "./vendor/three.module.min.js";

// Координатная система:
//   X — запад(-)/восток(+),  Z — север(-)/юг(+)
// Главный зал: x [-12..12], z [4..18]; выходная дверь на z=18 (юг)
// Средний этаж (туалет+кабинет): z [-6..4], стенки на z=-6 и z=4
// Верхний этаж (кухня+склад): z [-18..-6]
// Внутренняя перегородка по x=0 разделяет 4 верхних комнаты (с проёмами).

export const WORLD = { halfW: 12, north: -18, south: 18, height: 4 };
export const PLAYER_R = 0.45;

export const ROOMS = {
  hall:     { name: "Главный зал",       cx:  0,  cz: 11 },
  kitchen:  { name: "Кухня",              cx: -6, cz: -12 },
  storage:  { name: "Склад продуктов",   cx:  6, cz: -12 },
  toilet:   { name: "Туалет",             cx: -6, cz: -1 },
  office:   { name: "Кабинет менеджера", cx:  6, cz: -1 },
};

const wallSegments = []; // {x1,z1,x2,z2}

function pushWall(x1, z1, x2, z2) { wallSegments.push({ x1, z1, x2, z2 }); }

// Внешний периметр
pushWall(-12, -18,  12, -18); // север
pushWall(-12,  18,  12,  18); // юг
pushWall(-12, -18, -12,  18); // запад
pushWall( 12, -18,  12,  18); // восток

// Внутренняя перегородка нижнего этажа от главного зала (горизонталь z=4)
// с проходами на x=-6 (вход в туалет) и x=6 (вход в кабинет)
pushWall(-12, 4, -7.25, 4);
pushWall(-4.75, 4, 4.75, 4);
pushWall(7.25, 4, 12, 4);

// Горизонтальная стена между средним и верхним этажом (z=-6)
// проходы x=-6 (туалет→кухня), x=6 (кабинет→склад)
pushWall(-12, -6, -7.25, -6);
pushWall(-4.75, -6, 4.75, -6);
pushWall(7.25, -6, 12, -6);

// Вертикальная перегородка между туалетом и кабинетом (x=0, z=-6..4)
pushWall(0, -6, 0, 4);

// Вертикальная перегородка между кухней и складом (x=0, z=-18..-6)
pushWall(0, -18, 0, -6);

// Главная выходная дверь — отдельно (проём 3м, x=-1.5..1.5)
pushWall(-12, 18, -1.5, 18);
pushWall( 1.5, 18, 12, 18);
// Заменяем сегмент юга (уже добавлен сверху — но проём не вырезан)
// Очистим юг и заменим
wallSegments.splice(1, 1); // удалили предыдущий "юг"

export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07091a);
  scene.fog = new THREE.FogExp2(0x07091a, 0.055);

  // ---------- Освещение базовое ----------
  scene.add(new THREE.AmbientLight(0x303860, 0.28));

  const moon = new THREE.DirectionalLight(0xa0b8ff, 0.45);
  moon.position.set(14, 22, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -22;
  moon.shadow.camera.right = 22;
  moon.shadow.camera.top = 22;
  moon.shadow.camera.bottom = -22;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 60;
  moon.shadow.bias = -0.0005;
  scene.add(moon);

  // ---------- Пол ----------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1f1838,
    roughness: 0.9,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.halfW * 2, WORLD.south - WORLD.north),
    floorMat
  );
  floor.position.set(0, 0, (WORLD.south + WORLD.north) / 2);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Цветовая подсветка пола в зонах (тёмные плитки)
  function zoneTint(cx, cz, w, d, color) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(cx, 0.01, cz);
    plate.receiveShadow = true;
    scene.add(plate);
  }
  zoneTint(-6, -12, 11.5, 11.5, 0x2a1e1e); // кухня — рыжеватый
  zoneTint( 6, -12, 11.5, 11.5, 0x1e2820); // склад — холодный
  zoneTint(-6,  -1, 11.5,  9.5, 0x1a2030); // туалет — синий
  zoneTint( 6,  -1, 11.5,  9.5, 0x251a26); // кабинет — фиолетовый

  // ---------- Стены из сегментов ----------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x171c40,
    roughness: 0.85,
  });
  const colliders = []; // {x, z, hw, hd}

  for (const w of wallSegments) {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const mx = (w.x1 + w.x2) / 2;
    const mz = (w.z1 + w.z2) / 2;
    const isHoriz = Math.abs(w.x2 - w.x1) > Math.abs(w.z2 - w.z1);
    const thick = 0.3;
    const geo = isHoriz
      ? new THREE.BoxGeometry(len, WORLD.height, thick)
      : new THREE.BoxGeometry(thick, WORLD.height, len);
    const m = new THREE.Mesh(geo, wallMat);
    m.position.set(mx, WORLD.height / 2, mz);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    colliders.push({
      x: mx, z: mz,
      hw: isHoriz ? len / 2 : thick / 2,
      hd: isHoriz ? thick / 2 : len / 2,
    });
  }

  // ---------- ВЫХОДНАЯ ДВЕРЬ (главная цель) ----------
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xff7b35,
    emissive: 0xff7b35,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.25), doorMat);
  door.position.set(0, 1.5, 18);
  scene.add(door);

  const doorGlow = new THREE.PointLight(0xff7b35, 2.5, 12);
  doorGlow.position.set(0, 2, 17);
  scene.add(doorGlow);

  // ---------- МЕБЕЛЬ ----------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4528, roughness: 0.75 });
  const woodLightMat = new THREE.MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.7 });
  const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xa67849, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x6e7682, roughness: 0.45, metalness: 0.6 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xe5e2d0, roughness: 0.4 });

  const hideSpots = []; // {x, z, r}

  // ----- Главный зал: 6 круглых столов со стульями -----
  function addRoundTable(x, z) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 8), woodLightMat);
    leg.position.y = 0.425;
    leg.castShadow = true;
    grp.add(leg);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 24), tableTopMat);
    top.position.y = 0.9;
    top.castShadow = true;
    top.receiveShadow = true;
    grp.add(top);
    for (const side of [-1.5, 1.5]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), woodMat);
      seat.position.set(side, 0.45, 0);
      seat.castShadow = true;
      grp.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.6), woodMat);
      back.position.set(side + Math.sign(side) * 0.3, 0.85, 0);
      back.castShadow = true;
      grp.add(back);
    }
    scene.add(grp);
    colliders.push({ x, z, hw: 1.05, hd: 1.05 });
    hideSpots.push({ x, z, r: 1.4, label: "под столом" });
  }
  const hallTables = [[-6, 7], [0, 7], [6, 7], [-6, 14], [0, 14], [6, 14]];
  for (const [x, z] of hallTables) addRoundTable(x, z);

  // ----- Кухня: длинные металлические столы + плита -----
  function addKitchenCounter(cx, cz, w, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), metalMat);
    m.position.set(cx, 0.45, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    colliders.push({ x: cx, z: cz, hw: w / 2, hd: d / 2 });
    hideSpots.push({ x: cx, z: cz, r: Math.max(w, d) * 0.6, label: "за стойкой" });
  }
  addKitchenCounter(-10, -10, 3, 2);  // плита
  addKitchenCounter(-6, -16, 6, 1.2); // верхняя стойка
  addKitchenCounter(-3, -10, 1.2, 3); // боковая
  // Холодильник
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.0), tileMat);
  fridge.position.set(-10.6, 1.1, -8);
  fridge.castShadow = true;
  scene.add(fridge);
  colliders.push({ x: -10.6, z: -8, hw: 0.6, hd: 0.5 });

  // ----- Склад: стеллажи + ящики -----
  function addShelf(cx, cz, w, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.0, d), woodMat);
    m.position.set(cx, 1, cz);
    m.castShadow = true;
    scene.add(m);
    colliders.push({ x: cx, z: cz, hw: w / 2, hd: d / 2 });
    hideSpots.push({ x: cx, z: cz, r: Math.max(w, d) * 0.7, label: "за стеллажом" });
  }
  addShelf(3, -16, 5, 0.8);
  addShelf(3, -10, 5, 0.8);
  addShelf(10, -13, 0.8, 5);
  // Ящики
  for (const [bx, bz, s] of [[8, -16, 0.7], [9, -8, 0.8], [4, -8, 0.6]]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodLightMat);
    box.position.set(bx, s / 2, bz);
    box.castShadow = true;
    scene.add(box);
    colliders.push({ x: bx, z: bz, hw: s / 2, hd: s / 2 });
  }

  // ----- Туалет: 3 кабинки + раковина -----
  function addToiletStall(cx, cz) {
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.08), tileMat);
    wall1.position.set(cx, 1.1, cz - 0.9);
    wall1.castShadow = true;
    scene.add(wall1);
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.8), tileMat);
    wall2.position.set(cx - 0.85, 1.1, cz);
    wall2.castShadow = true;
    scene.add(wall2);
    const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), tileMat);
    bowl.position.set(cx, 0.2, cz);
    bowl.castShadow = true;
    scene.add(bowl);
    colliders.push({ x: cx, z: cz, hw: 0.4, hd: 0.5 });
    hideSpots.push({ x: cx, z: cz - 0.3, r: 0.9, label: "в кабинке" });
  }
  addToiletStall(-9, -3);
  addToiletStall(-7, -3);
  addToiletStall(-5, -3);
  // Раковина
  const sink = new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 0.6), tileMat);
  sink.position.set(-7, 0.45, 1.5);
  sink.castShadow = true;
  scene.add(sink);
  colliders.push({ x: -7, z: 1.5, hw: 1.5, hd: 0.3 });

  // ----- Кабинет: стол + кресло + шкафы -----
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.85, 1.5), woodMat);
  desk.position.set(6, 0.425, -2);
  desk.castShadow = true;
  desk.receiveShadow = true;
  scene.add(desk);
  colliders.push({ x: 6, z: -2, hw: 1.5, hd: 0.75 });
  hideSpots.push({ x: 6, z: -2, r: 1.6, label: "под столом" });

  // Шкаф
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.8), woodMat);
  cabinet.position.set(10.5, 1.25, -4);
  cabinet.castShadow = true;
  scene.add(cabinet);
  colliders.push({ x: 10.5, z: -4, hw: 0.75, hd: 0.4 });
  hideSpots.push({ x: 10.5, z: -3.4, r: 0.9, label: "за шкафом" });

  // Диванчик
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 1.0), woodMat);
  sofa.position.set(3, 0.3, 2);
  sofa.castShadow = true;
  scene.add(sofa);
  colliders.push({ x: 3, z: 2, hw: 1.25, hd: 0.5 });
  hideSpots.push({ x: 3, z: 2, r: 1.4, label: "за диваном" });

  // ---------- АТМОСФЕРНЫЕ ОГНИ ----------
  const candles = [];
  function addCandle(x, z, color = 0xff9050) {
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf4e9cd })
    );
    wax.position.set(x, 1.1, z);
    wax.castShadow = false;
    scene.add(wax);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.15, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb066 })
    );
    flame.position.set(x, 1.4, z);
    scene.add(flame);
    const light = new THREE.PointLight(color, 1.4, 8, 2);
    light.position.set(x, 1.5, z);
    scene.add(light);
    candles.push({ light, flame, baseIntensity: 1.4, phase: Math.random() * Math.PI * 2 });
  }
  // По одной свече на стол в зале
  for (const [x, z] of hallTables) addCandle(x, z);
  // Свечи в комнатах
  addCandle(-6, -16, 0xff7b35);
  addCandle(6,  -16, 0x8fbcff);
  addCandle(-7,   2, 0x6680ff);
  addCandle(6,    1, 0x9d4edd);

  // Потолочные лампы (без теней)
  for (const [x, z] of [
    [-6, -12], [6, -12], [-6, -1], [6, -1], [0, 7], [0, 14], [-9, 14], [9, 14],
  ]) {
    const lamp = new THREE.PointLight(0x5070b0, 0.5, 10);
    lamp.position.set(x, 3.5, z);
    scene.add(lamp);
  }

  // ---------- ТУМАН-ЧАСТИЦЫ (плавающие пылинки) ----------
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 220;
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = Math.random() * 3 + 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xffdda8,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  scene.add(dust);

  return { scene, colliders, candles, hideSpots, dust, door };
}

// ---------- Коллизии ----------
export function collides(x, z, colliders) {
  if (x < -WORLD.halfW + PLAYER_R || x > WORLD.halfW - PLAYER_R) return true;
  if (z < WORLD.north + PLAYER_R || z > WORLD.south - PLAYER_R) return true;
  for (const c of colliders) {
    const cx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
    const cz = Math.max(c.z - c.hd, Math.min(z, c.z + c.hd));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < PLAYER_R * PLAYER_R) return true;
  }
  return false;
}

// Точка прямой видимости (segment vs AABB list) — для конуса зрения монстра
export function lineBlocked(x1, z1, x2, z2, colliders) {
  // Простая дискретизация — каждые 0.3м
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const steps = Math.max(2, Math.ceil(len / 0.3));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    for (const c of colliders) {
      if (Math.abs(px - c.x) < c.hw + 0.1 && Math.abs(pz - c.z) < c.hd + 0.1) return true;
    }
  }
  return false;
}

// В какой зоне точка
export function whichRoom(x, z) {
  if (z > 4) return "hall";
  if (z > -6) return x < 0 ? "toilet" : "office";
  return x < 0 ? "kitchen" : "storage";
}

// Анимация свечей
export function flickerCandles(candles, t) {
  for (const c of candles) {
    const f = Math.sin(t * 6 + c.phase) * 0.18 + Math.sin(t * 17 + c.phase * 3) * 0.07;
    c.light.intensity = c.baseIntensity * (1 + f);
    c.flame.scale.y = 1 + f * 0.6;
  }
}

// Анимация пылинок
export function driftDust(dust, t) {
  const arr = dust.geometry.attributes.position.array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 1] += Math.sin(t * 0.4 + i) * 0.0008;
    if (arr[i + 1] > 3.5) arr[i + 1] = 0.3;
  }
  dust.geometry.attributes.position.needsUpdate = true;
}
