// HUDRenderer - screen-space HUD elements drawn above world
// Keep draws at identity transform and restore context state locally.

export default class HUDRenderer {
  constructor(ctx, camera, screenCenter) {
    this.ctx = ctx;
    this.camera = camera;
    this.screenCenter = screenCenter;
  }

  updateContext(ctx, camera, screenCenter) {
    this.ctx = ctx;
    this.camera = camera;
    this.screenCenter = screenCenter;
  }

  drawPlayerHealth(state) {
    try {
      const ship = state.ship;
      if (!ship || ship.isDestroyed) return;
      if (!(ship.health < ship.maxHealth)) return;
      const barWidth = 40;
      const barHeight = 4;
      const sx = ship.x - this.camera.x + this.screenCenter.x;
      const sy = ship.y - this.camera.y + this.screenCenter.y;
      const ctx = this.ctx;
      ctx.save();
      try {
        if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.fillRect(sx - barWidth / 2, sy - ship.size - 18, barWidth, barHeight);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.95)';
        ctx.fillRect(
          sx - barWidth / 2,
          sy - ship.size - 18,
          barWidth * (ship.health / ship.maxHealth),
          barHeight
        );
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - barWidth / 2, sy - ship.size - 18, barWidth, barHeight);
      } finally {
        ctx.restore();
      }
    } catch (_) {}
  }
}

