/* =========================================================================
   player3d.js — 3D-игрок: капсула + голова + кепка + ФОНАРИК (SpotLight)
   ========================================================================= */
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";

export function buildPlayer() {
  const group = new THREE.Group();

  // Тело
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.7, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b4a8f, roughness: 0.6 })
  );
  body.position.y = 0.67;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Голова
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf4d4a8, roughness: 0.7 })
  );
  head.position.y = 1.4;
  head.castShadow = true;
  group.add(head);

  // Кепка
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.3, 16),
    new THREE.MeshStandardMaterial({
      color: 0xff7b35,
      emissive: 0xff7b35,
      emissiveIntensity: 0.25,
      roughness: 0.5,
    })
  );
  cap.position.y = 1.72;
  cap.castShadow = true;
  group.add(cap);

  // Глазки
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0e27 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  eyeL.position.set(-0.09, 1.43, 0.23);
  eyeR.position.set( 0.09, 1.43, 0.23);
  group.add(eyeL, eyeR);

  // Аура для видимости
  const aura = new THREE.PointLight(0xffa066, 0.35, 3);
  aura.position.set(0, 1.0, 0);
  group.add(aura);

  // ---------- ФОНАРИК (SpotLight) ----------
  const flashlight = new THREE.SpotLight(
    0xfff0c0,  // тёплый белый
    8,         // intensity
    14,        // distance
    Math.PI / 7, // angle (~25°)
    0.4,       // penumbra
    1.2        // decay
  );
  flashlight.position.set(0, 1.2, 0.3);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(512, 512);
  flashlight.shadow.camera.near = 0.5;
  flashlight.shadow.camera.far = 14;
  flashlight.shadow.bias = -0.0005;
  group.add(flashlight);

  // Target фонарика — отдельный объект, ставим перед игроком
  const flashTarget = new THREE.Object3D();
  flashTarget.position.set(0, 1.2, 5);
  group.add(flashTarget);
  flashlight.target = flashTarget;

  // Корпус фонарика (виден в руке)
  const torchBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x303040, metalness: 0.7, roughness: 0.3 })
  );
  torchBody.rotation.x = Math.PI / 2;
  torchBody.position.set(0.25, 1.05, 0.35);
  group.add(torchBody);

  group.userData = {
    speed: 4.2,
    radius: 0.45,
    hiding: false,
    bobPhase: 0,
    flashlight,
    flashTarget,
    torchBody,
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
