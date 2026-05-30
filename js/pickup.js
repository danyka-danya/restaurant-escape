/* =========================================================================
   pickup.js — 4 ключевых предмета: рыба, ключ-вилка, фотография, монета.
   У каждого pulsing glow, спавнятся в разных комнатах.
   ========================================================================= */
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";

export const KEY_TYPES = [
  { id: "key-fork", room: "kitchen", label: "Серебряная вилка",  color: 0xe0e8f0, emoji: "🍴", icon: "🍴" },
  { id: "key-food", room: "storage", label: "Любимое блюдо",     color: 0xff7b35, emoji: "🍔", icon: "🍔" },
  { id: "key-photo", room: "office", label: "Старое фото",       color: 0xa080ff, emoji: "🖼", icon: "🖼" },
  { id: "key-coin", room: "toilet",  label: "Золотая монета",    color: 0xffd060, emoji: "🪙", icon: "🪙" },
];

const SPAWN_POS = {
  kitchen: { x: -10, z: -10 },
  storage: { x:  10, z: -16 },
  office:  { x:   6, z:  -2 }, // на столе
  toilet:  { x:  -7, z:   1 }, // у раковины
};

export function buildPickups() {
  const pickups = [];
  for (const def of KEY_TYPES) {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.4,
    });

    // Платформа-плита под ключом
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a1840, emissive: 0x4a2c80, emissiveIntensity: 0.3 })
    );
    base.position.y = 0.03;
    group.add(base);

    // Сам "предмет" — стилизованный полигон
    let item;
    if (def.id === "key-fork") {
      item = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mat);
      handle.position.y = 0.25;
      item.add(handle);
      for (let i = -1; i <= 1; i++) {
        const tine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), mat);
        tine.position.set(i * 0.05, 0.6, 0);
        item.add(tine);
      }
    } else if (def.id === "key-food") {
      // Бургер-стек
      item = new THREE.Group();
      const bun1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      bun1.position.y = 0.35; bun1.scale.y = 0.6;
      item.add(bun1);
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0x4a2810, emissive: 0x4a2810, emissiveIntensity: 0.3 }));
      patty.position.y = 0.25;
      item.add(patty);
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffd060, emissiveIntensity: 0.4 }));
      cheese.position.y = 0.21;
      item.add(cheese);
      const bun2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 16), mat);
      bun2.position.y = 0.15;
      item.add(bun2);
    } else if (def.id === "key-photo") {
      item = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.04), mat);
      frame.position.y = 0.4;
      item.add(frame);
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.45), new THREE.MeshBasicMaterial({ color: 0xfff2c8 }));
      inner.position.set(0, 0.4, 0.025);
      item.add(inner);
    } else if (def.id === "key-coin") {
      item = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24), mat);
      item.position.y = 0.4;
      item.rotation.x = Math.PI / 2;
    }
    group.add(item);

    // Свет для подсветки
    const glow = new THREE.PointLight(def.color, 1.4, 5);
    glow.position.y = 0.5;
    group.add(glow);

    const pos = SPAWN_POS[def.room];
    group.position.set(pos.x, 0, pos.z);

    group.userData = {
      id: def.id,
      label: def.label,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
      item,
      glow,
      baseGlowIntensity: 1.4,
    };

    pickups.push(group);
  }
  return pickups;
}

export function animatePickups(pickups, t) {
  for (const p of pickups) {
    if (p.userData.collected) continue;
    p.userData.bobPhase += 0.05;
    p.userData.item.position.y = Math.sin(p.userData.bobPhase) * 0.08;
    p.userData.item.rotation.y += 0.02;
    p.userData.glow.intensity = p.userData.baseGlowIntensity * (1 + Math.sin(t * 3 + p.userData.bobPhase) * 0.3);
  }
}

export function checkPickup(pickups, player, radius = 1.2) {
  for (const p of pickups) {
    if (p.userData.collected) continue;
    const dx = p.position.x - player.position.x;
    const dz = p.position.z - player.position.z;
    if (dx * dx + dz * dz < radius * radius) {
      p.userData.collected = true;
      p.visible = false;
      return p;
    }
  }
  return null;
}
