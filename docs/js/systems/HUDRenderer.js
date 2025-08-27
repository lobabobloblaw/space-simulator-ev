// HUDRenderer - screen-space HUD elements drawn above world
// Keep draws at identity transform and restore context state locally.
import { withScreen } from './RenderHelpers.js';

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

  // Optional: small build tag text in the top-right corner (QA-only)
  // Enable via: window.HUD_SHOW_BUILD_TAG = true
  // Override text via: window.HUD_BUILD_TAG = 'build:2025-08-23T18:00Z'
  drawBuildTag() {
    try {
      if (!(typeof window !== 'undefined' && window.HUD_SHOW_BUILD_TAG)) return;
      const ctx = this.ctx;
      const dpr = (ctx && ctx.canvas && ctx.canvas.__dpr) ? ctx.canvas.__dpr : 1;
      const w = (ctx && ctx.canvas && ctx.canvas.width) ? (ctx.canvas.width / dpr) : 0;
      const margin = 6;
      let tag = (typeof window.HUD_BUILD_TAG === 'string' && window.HUD_BUILD_TAG.length)
        ? window.HUD_BUILD_TAG
        : new Date().toISOString().replace(/\..+/, '');
      try {
        if (window.HUD_SHOW_SAVE_SIZE && typeof window.LAST_SAVE_SIZE_KB === 'number') {
          tag += ` | save:${window.LAST_SAVE_SIZE_KB.toFixed(1)}KB`;
        }
      } catch(_) {}
      withScreen(ctx, () => {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#9ccfff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.font = '10px VT323, monospace';
        ctx.fillText(tag, w - margin, margin);
        ctx.restore();
      });
    } catch (_) {}
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
      withScreen(ctx, () => {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.fillRect(sx - barWidth / 2, sy - ship.size - 18, barWidth, barHeight);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.95)';
        const ratio = Math.max(0, Math.min(1, (ship.health || 0) / (ship.maxHealth || 1)));
        ctx.fillRect(
          sx - barWidth / 2,
          sy - ship.size - 18,
          barWidth * ratio,
          barHeight
        );
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - barWidth / 2, sy - ship.size - 18, barWidth, barHeight);
      });
    } catch (_) {}
  }

  drawNPCHealth(npc) {
    try {
      if (!(npc && npc.health < npc.maxHealth)) return;
      const barWidth = 30;
      const barHeight = 3;
      const sx = npc.x - this.camera.x + this.screenCenter.x;
      const sy = npc.y - this.camera.y + this.screenCenter.y;
      const ctx = this.ctx;
      withScreen(ctx, () => {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(sx - barWidth/2, sy - npc.size - 10, barWidth, barHeight);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        const ratio = Math.max(0, Math.min(1, (npc.health || 0) / (npc.maxHealth || 1)));
        ctx.fillRect(sx - barWidth/2, sy - npc.size - 10, barWidth * ratio, barHeight);
      });
    } catch (_) {}
  }

  drawFactionBracket(npc, npcScale = 1.0, isTargeted = false, accentColor = '#ff4444') {
    const size = (npc.size || 10) * npcScale;
    const half = size * 1.1;
    const arm = Math.max(5, Math.min(9, size * 0.5));
    const sx = npc.x - this.camera.x + this.screenCenter.x;
    const sy = npc.y - this.camera.y + this.screenCenter.y;
    const ctx = this.ctx;
    withScreen(ctx, () => {
      ctx.strokeStyle = accentColor;
      ctx.globalAlpha = isTargeted ? (0.8 + 0.2 * Math.abs(Math.sin(Date.now()*0.006))) : 0.6;
      ctx.lineWidth = isTargeted ? 2.5 : 1.5;
      // TL
      ctx.beginPath(); ctx.moveTo(sx - half, sy - half + arm); ctx.lineTo(sx - half, sy - half); ctx.lineTo(sx - half + arm, sy - half); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(sx + half - arm, sy - half); ctx.lineTo(sx + half, sy - half); ctx.lineTo(sx + half, sy - half + arm); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(sx - half, sy + half - arm); ctx.lineTo(sx - half, sy + half); ctx.lineTo(sx - half + arm, sy + half); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(sx + half - arm, sy + half); ctx.lineTo(sx + half, sy + half); ctx.lineTo(sx + half, sy + half - arm); ctx.stroke();
      if (isTargeted) {
        ctx.fillStyle = accentColor; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(1.5, size*0.08), 0, Math.PI*2); ctx.fill();
      }
    });
  }

  drawNPCStateIndicator(npc) {
    const iconSize = 8;
    const sx = npc.x - this.camera.x + this.screenCenter.x;
    const sy = (npc.y + npc.size + 15) - this.camera.y + this.screenCenter.y;
    const ctx = this.ctx;
    withScreen(ctx, () => {
      ctx.save();
      ctx.translate(sx, sy);
      switch(npc.state) {
        case 'pursuing':
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(-1, -iconSize/2, 2, iconSize * 0.6);
          ctx.beginPath(); ctx.arc(0, iconSize/2 - 1, 1.5, 0, Math.PI * 2); ctx.fill();
          break;
        case 'fleeing':
          ctx.strokeStyle = '#ffff44'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-iconSize, 0); ctx.lineTo(-iconSize/2, -iconSize/2);
          ctx.moveTo(-iconSize, 0); ctx.lineTo(-iconSize/2, iconSize/2);
          ctx.moveTo(iconSize, 0); ctx.lineTo(iconSize/2, -iconSize/2);
          ctx.moveTo(iconSize, 0); ctx.lineTo(iconSize/2, iconSize/2);
          ctx.stroke();
          break;
        case 'warning':
          ctx.strokeStyle = '#ff8800'; ctx.fillStyle = 'rgba(255,136,0,0.3)'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -iconSize); ctx.lineTo(-iconSize, iconSize); ctx.lineTo(iconSize, iconSize);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        case 'patrolling':
          ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 2;
          ctx.rotate(Date.now() * 0.002);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, iconSize/2, i * Math.PI * 2/3, i * Math.PI * 2/3 + Math.PI/4); ctx.stroke(); }
          break;
      }
      ctx.restore();
    });
  }

  drawNPCMessage(npc) {
    const fadeTime = 3000;
    const timeSinceMessage = Date.now() - npc.messageTime;
    const alpha = Math.max(0, 1 - (timeSinceMessage / fadeTime));
    if (alpha <= 0) return;
    const ctx = this.ctx;
    const sx = npc.x - this.camera.x + this.screenCenter.x;
    const sy = npc.y - this.camera.y + this.screenCenter.y;
    withScreen(ctx, () => {
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(npc.message).width;
      const bubbleWidth = textWidth + 16;
      const bubbleHeight = 20;
      const bubbleX = sx - bubbleWidth / 2;
      const bubbleY = sy - npc.size - 35;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeStyle = npc.color;
      ctx.lineWidth = 1.5;
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(bubbleX + radius, bubbleY);
      ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
      ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
      ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
      // Tail
      ctx.lineTo(sx + 5, bubbleY + bubbleHeight);
      ctx.lineTo(sx, bubbleY + bubbleHeight + 5);
      ctx.lineTo(sx - 5, bubbleY + bubbleHeight);
      ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
      ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
      ctx.lineTo(bubbleX, bubbleY + radius);
      ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(npc.message, sx, bubbleY + bubbleHeight / 2);
    });
  }
}
