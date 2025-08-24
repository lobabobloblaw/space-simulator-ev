// Minimal WebGL renderer (Phase 1 spike)
// - Behind window.RENDER_WEBGL flag (OFF by default)
// - Draws player/NPC/projectile primitives in world space
// - Keeps UI/HUD/minimap/TargetCam out (handled by DOM/other systems)

import { getEventBus } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

export default class WebGLRenderSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = (canvas && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))) || null;
    this.eventBus = getEventBus();
    this.stateManager = getStateManager();
    this.program = null;
    this.buffers = {};
    this.locs = {};
    this._resizeObserver = null;
  }

  init() {
    if (!this.gl) {
      console.warn('[WebGLRenderSystem] WebGL not available; falling back to blank renders');
      return;
    }
    const gl = this.gl;
    // Basic shader program (colored triangle ship/arrow)
    const vs = `
      attribute vec2 a_position;
      uniform vec2 u_resolution;
      uniform vec2 u_translation;
      uniform float u_rotation;
      uniform float u_scale;
      void main() {
        float c = cos(u_rotation), s = sin(u_rotation);
        vec2 p = vec2(
          (a_position.x * c - a_position.y * s) * u_scale + u_translation.x,
          (a_position.x * s + a_position.y * c) * u_scale + u_translation.y
        );
        // pixels -> clip space
        vec2 zeroToOne = p / u_resolution;
        vec2 clip = zeroToOne * 2.0 - 1.0;
        gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      uniform vec4 u_color;
      void main() { gl_FragColor = u_color; }
    `;
    const prog = this._createProgram(vs, fs);
    if (!prog) { console.warn('[WebGLRenderSystem] Shader program failed'); return; }
    this.program = prog;
    gl.useProgram(this.program);

    // Geometry: canonical arrow triangle (points to +X)
    const verts = new Float32Array([
      12, 0,
      -10, -6,
      -10, 6,
    ]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffers.vbo = vbo;

    // Locations
    this.locs.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.locs.u_resolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.locs.u_translation = gl.getUniformLocation(this.program, 'u_translation');
    this.locs.u_rotation = gl.getUniformLocation(this.program, 'u_rotation');
    this.locs.u_scale = gl.getUniformLocation(this.program, 'u_scale');
    this.locs.u_color = gl.getUniformLocation(this.program, 'u_color');

    // Enable attrib
    gl.enableVertexAttribArray(this.locs.a_position);
    gl.vertexAttribPointer(this.locs.a_position, 2, gl.FLOAT, false, 0, 0);

    // Basic GL state
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // React to canvas resize
    try {
      this._resizeObserver = new ResizeObserver(() => this._resize());
      this._resizeObserver.observe(this.canvas);
    } catch(_) {}

    console.log('[WebGLRenderSystem] Initialized');
  }

  _resize() {
    const gl = this.gl; if (!gl) return;
    const w = this.canvas.clientWidth | 0;
    const h = this.canvas.clientHeight | 0;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(state, deltaTime) {
    const gl = this.gl; if (!gl) return;
    this._resize();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    const W = this.canvas.width || 1;
    const H = this.canvas.height || 1;
    gl.uniform2f(this.locs.u_resolution, W, H);

    const cam = state.camera || { x: 0, y: 0 };
    const cx = W * 0.5, cy = H * 0.5;

    // Draw helper
    const drawEntity = (x, y, angle, size, color) => {
      const tx = (x - cam.x) + cx;
      const ty = (y - cam.y) + cy;
      gl.uniform2f(this.locs.u_translation, tx, ty);
      gl.uniform1f(this.locs.u_rotation, angle || 0);
      gl.uniform1f(this.locs.u_scale, Math.max(0.5, size || 10));
      gl.uniform4f(this.locs.u_color, color[0], color[1], color[2], color[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Player
    try {
      const ship = state.ship;
      if (ship && !ship.isDestroyed) {
        drawEntity(ship.x, ship.y, ship.angle, 1.2 * (ship.size || 10), [0.7, 0.9, 1.0, 1.0]);
      }
    } catch(_) {}

    // NPCs
    const npcs = state.npcShips || [];
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i]; if (!n) continue;
      const c = (n.type === 'pirate') ? [1.0, 0.3, 0.3, 0.95]
              : (n.type === 'patrol') ? [0.6, 0.6, 1.0, 0.95]
              : [0.6, 1.0, 0.7, 0.95];
      drawEntity(n.x, n.y, n.angle, (n.size || 10), c);
    }

    // Projectiles (smaller, brighter)
    const proj = state.projectiles || [];
    for (let i = 0; i < proj.length; i++) {
      const p = proj[i]; if (!p) continue;
      drawEntity(p.x, p.y, Math.atan2(p.vy || 0, p.vx || 1), 6, [1.0, 1.0, 0.5, 0.9]);
    }
  }

  update() {
    // No-op; this system renders in render()
  }

  _createProgram(vsSource, fsSource) {
    const gl = this.gl; if (!gl) return null;
    const vs = this._compile(gl.VERTEX_SHADER, vsSource);
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[WebGLRenderSystem] Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  _compile(type, src) {
    const gl = this.gl; if (!gl) return null;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[WebGLRenderSystem] Shader compile error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }
}

