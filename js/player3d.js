/* =========================================================================
   player3d.js — 3D-игрок: капсула + голова + кепка; rotation faces movement
   ========================================================================= */
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";

export function buildPlayer() {
  const group = new THREE.Group();

  // Тело — капсула
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3b4a8f,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.7, 4, 8),
    bodyMat
  );
  body.position.y = 0.67;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Голова
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf4d4a8,
    roughness: 0.7,
  });
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 16),
    skinMat
  );
  head.position.y = 1.4;
  head.castShadow = true;
  group.add(head);

  // Кепка — ярко-оранжевая, чтобы было видно в темноте
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xff7b35,
    emissive: 0xff7b35,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.3, 16),
    capMat
  );
  cap.position.y = 1.72;
  cap.castShadow = true;
  group.add(cap);

  // Глазки — две маленькие тёмные сферы
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0e27 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  eyeL.position.set(-0.09, 1.43, 0.23);
  eyeR.position.set( 0.09, 1.43, 0.23);
  group.add(eyeL, eyeR);

  // Слабое свечение вокруг игрока — мини point-light чтобы было видно где он
  const aura = new THREE.PointLight(0xffa066, 0.4, 4);
  aura.position.set(0, 1.0, 0);
  group.add(aura);

  group.userData = {
    speed: 4.2,
    radius: 0.45,
    hiding: false,
    bobPhase: 0,
  };

  return group;
}

export function bobWhileMoving(player, dt, isMoving) {
  if (isMoving) {
    player.userData.bobPhase += dt * 10;
    const bob = Math.sin(player.userData.bobPhase) * 0.04;
    player.position.y = bob;
  } else {
    player.userData.bobPhase = 0;
    player.position.y = 0;
  }
}
