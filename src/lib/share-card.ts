// Render a square share card to a PNG Blob on the client (no server). Used by
// the session summary's "Share my progress" so the viral loop carries an image,
// not just text. Returns null if canvas isn't available (e.g. SSR/tests).

export interface ShareCardOpts {
  mastered: number;
  total: number;
  streak: number;
}

const SIZE = 1080;

export async function buildShareCard(opts: ShareCardOpts): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient (indigo → violet).
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, '#4f46e5');
  grad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.textAlign = 'center';

  // Eyebrow.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillText('JAPANESE PITCH ACCENT', SIZE / 2, 200);

  // Big mastery number.
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 260px system-ui, sans-serif';
  ctx.fillText(`${opts.mastered}`, SIZE / 2, 520);
  ctx.font = '700 64px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`/ ${opts.total} words mastered`, SIZE / 2, 600);

  // Streak pill.
  if (opts.streak > 0) {
    ctx.font = '700 56px system-ui, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`🔥 ${opts.streak}-streak`, SIZE / 2, 720);
  }

  // Progress bar.
  const barW = 720;
  const barX = (SIZE - barW) / 2;
  const barY = 820;
  const pct = opts.total > 0 ? Math.max(0, Math.min(1, opts.mastered / opts.total)) : 0;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, barX, barY, barW, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  roundRect(ctx, barX, barY, Math.max(28, barW * pct), 28, 14);
  ctx.fill();

  // Footer.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '600 44px system-ui, sans-serif';
  ctx.fillText('Stop sounding like a foreigner →', SIZE / 2, 960);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
