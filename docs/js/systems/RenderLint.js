// Minimal render lint to catch common leaks in dev.
// Only active when explicitly enabled via state.debug.renderLint.

export function check2DContext(ctx, label = 'ctx') {
  try {
    const issues = [];
    // Composite
    if (ctx.globalCompositeOperation !== 'source-over') issues.push(`composite=${ctx.globalCompositeOperation}`);
    // Alpha
    if (ctx.globalAlpha !== 1) issues.push(`alpha=${ctx.globalAlpha}`);
    // Transform
    if (typeof ctx.getTransform === 'function') {
      const t = ctx.getTransform();
      const isIdentity = (t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1 && t.e === 0 && t.f === 0);
      if (!isIdentity) issues.push(`transform=[${t.a},${t.b},${t.c},${t.d},${t.e},${t.f}]`);
    }
    if (issues.length) {
      console.warn(`[RenderLint] ${label}:`, issues.join(' '));
    }
  } catch (_) { /* ignore */ }
}

