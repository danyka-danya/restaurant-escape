# Побег из ресторана

Детский хоррор-побег для iPhone Safari. PWA, чистый HTML5/CSS/Vanilla JS, без билд-системы.

## Локальный запуск



Открыть на десктопе: http://localhost:8000

Открыть с iPhone (в одной Wi-Fi сети с компом): найти LAN IP компа (`ipconfig`) и открыть `http://<LAN-IP>:8000` в Safari. «Поделиться → На экран Домой» — поставится как PWA.

## Управление

- **Виртуальный джойстик** (слева) — движение
- **Кнопка «Спрятаться»** (справа) — присесть/вылезти
- На десктопе: **WASD / стрелки**, **Space / Enter** для hide

## Структура

```
index.html              # app shell
manifest.webmanifest    # PWA
sw.js                   # service worker (offline)
css/styles.css          # хоррор-палитра
js/
  game.js               # game loop
  controls.js           # joystick + hide
  scenes.js             # комнаты
  entities.js           # Player (Monster, Pickup — на след. фазы)
  save.js               # localStorage
```
