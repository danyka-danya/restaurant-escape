/* =========================================================================
   scenes.js — комнаты ресторана. На День 1 — одна пустая «Главный зал»
   с border-стенами и парой столов как collider'ов.
   ========================================================================= */
(function () {

  class Room {
    constructor(spec) {
      this.id = spec.id;
      this.name = spec.name;
      this.width = spec.width;        // логические координаты комнаты
      this.height = spec.height;
      this.spawn = spec.spawn || { x: 100, y: 100 };
      this.obstacles = spec.obstacles || []; // [{x, y, w, h, kind}]
      this.doors = spec.doors || [];         // [{x, y, w, h, to}]
    }

    collides(px, py, pr) {
      // стены комнаты
      if (px - pr < 0) return true;
      if (px + pr > this.width) return true;
      if (py - pr < 0) return true;
      if (py + pr > this.height) return true;

      for (const o of this.obstacles) {
        // AABB-circle: ближайшая точка прямоугольника к центру
        const cx = Math.max(o.x, Math.min(px, o.x + o.w));
        const cy = Math.max(o.y, Math.min(py, o.y + o.h));
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < pr * pr) return true;
      }
      return false;
    }

    drawBackground(ctx) {
      // ковёр-фон — плейсхолдер до арта
      ctx.fillStyle = "#131a3a";
      ctx.fillRect(0, 0, this.width, this.height);

      // лёгкий клетчатый паттерн пола
      ctx.strokeStyle = "rgba(157, 78, 221, 0.05)";
      ctx.lineWidth = 1;
      const tile = 40;
      for (let x = 0; x < this.width; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }
      for (let y = 0; y < this.height; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }

      // рамка комнаты — стены
      ctx.strokeStyle = "rgba(244, 233, 205, 0.18)";
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, this.width - 3, this.height - 3);
    }

    drawObstacles(ctx) {
      for (const o of this.obstacles) {
        // стол / препятствие — placeholder
        ctx.fillStyle = "#2a1d4a";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "rgba(157, 78, 221, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(o.x + 0.75, o.y + 0.75, o.w - 1.5, o.h - 1.5);

        if (o.kind === "table") {
          ctx.fillStyle = "rgba(244, 233, 205, 0.15)";
          ctx.font = "16px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🍽", o.x + o.w / 2, o.y + o.h / 2);
        }
      }
    }
  }

  // ----- Спецификации комнат (День 1: только hall) -----
  const ROOMS = {
    hall: new Room({
      id: "hall",
      name: "Главный зал",
      width: 540,
      height: 800,
      spawn: { x: 270, y: 700 },
      obstacles: [
        { x: 80,  y: 150, w: 80, h: 60, kind: "table" },
        { x: 240, y: 150, w: 80, h: 60, kind: "table" },
        { x: 400, y: 150, w: 80, h: 60, kind: "table" },
        { x: 80,  y: 320, w: 80, h: 60, kind: "table" },
        { x: 400, y: 320, w: 80, h: 60, kind: "table" },
        { x: 240, y: 480, w: 80, h: 60, kind: "table" },
        { x: 60,  y: 580, w: 30, h: 180, kind: "bar" },
        { x: 450, y: 580, w: 30, h: 180, kind: "bar" },
      ],
      doors: [
        // пока пусто — на День 2
      ],
    }),
  };

  window.Scenes = { Room, ROOMS };
})();
