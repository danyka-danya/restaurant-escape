/* =========================================================================
   entities.js — игровые сущности: Player, Monster, Pickup
   На День 1 — только Player. Остальные классы — заглушки для будущих фаз.
   ========================================================================= */
(function () {

  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 14;
      this.speed = 130;     // пикселей в секунду
      this.vx = 0;
      this.vy = 0;
      this.facing = "down"; // down | up | left | right
      this.hiding = false;
    }

    update(dt, input, room) {
      if (this.hiding) {
        this.vx = 0;
        this.vy = 0;
        return;
      }

      const mag = Math.hypot(input.x, input.y);
      if (mag > 0.05) {
        const nx = input.x / mag;
        const ny = input.y / mag;
        this.vx = nx * this.speed;
        this.vy = ny * this.speed;

        // направление взгляда — по доминантной оси
        if (Math.abs(nx) > Math.abs(ny)) {
          this.facing = nx > 0 ? "right" : "left";
        } else {
          this.facing = ny > 0 ? "down" : "up";
        }
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      // движение с разделением осей — чтобы скользить вдоль стен
      const newX = this.x + this.vx * dt;
      if (!room.collides(newX, this.y, this.radius)) this.x = newX;

      const newY = this.y + this.vy * dt;
      if (!room.collides(this.x, newY, this.radius)) this.y = newY;
    }

    draw(ctx) {
      const x = this.x;
      const y = this.y;
      const r = this.radius;

      // тень
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // тело — placeholder-кружок, заменим спрайтом
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
      grad.addColorStop(0, "#fff8e7");
      grad.addColorStop(1, "#f4e9cd");
      ctx.fillStyle = this.hiding ? "rgba(244, 233, 205, 0.25)" : grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // обводка
      ctx.strokeStyle = this.hiding ? "rgba(52, 211, 153, 0.6)" : "rgba(10, 14, 39, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // глаза, направление взгляда
      const eyeOffset = { down: [0, 3], up: [0, -3], left: [-3, 0], right: [3, 0] };
      const [dx, dy] = eyeOffset[this.facing] || [0, 3];
      ctx.fillStyle = "#0a0e27";
      ctx.beginPath();
      ctx.arc(x - 4 + dx, y - 2 + dy, 1.8, 0, Math.PI * 2);
      ctx.arc(x + 4 + dx, y - 2 + dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ----- Заглушки для следующих фаз -----
  class Monster {
    constructor() { /* День 3 */ }
    update() {}
    draw() {}
  }

  class Pickup {
    constructor() { /* День 4 */ }
    update() {}
    draw() {}
  }

  window.Entities = { Player, Monster, Pickup };
})();
