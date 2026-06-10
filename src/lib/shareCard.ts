import type { PitchFrame } from './pitch-tracker';

// Generates a polished 1080×1080 share card (PNG) of a pitch-accent result —
// the viral loop: "I scored X% — can you sound more native?" → friends try.
// Pure canvas, no dependency.

export interface ShareCardInput {
  word: string;
  reading: string;
  score: number;
  pattern: string;        // 平板 / 頭高 / 中高 / 尾高
  patternEn: string;      // Heiban / Atamadaka / ...
  frames: PitchFrame[];   // the user's recorded pitch
}

const W = 1080;
const H = 1080;
const JP_FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";
const UI_FONT = "'Plus Jakarta Sans','Inter',system-ui,sans-serif";

function bandColor(score: number): string {
  if (score >= 80) return '#34D399'; // green
  if (score >= 60) return '#FBBF24'; // amber
  return '#FB7185'; // rose
}
function reactionEmoji(score: number): string {
  if (score >= 90) return '🎉';
  if (score >= 80) return '✅';
  if (score >= 60) return '👍';
  return '💪';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw the user's pitch contour (normalized) inside a panel.
function drawContour(ctx: CanvasRenderingContext2D, frames: PitchFrame[], x: number, y: number, w: number, h: number) {
  const voiced = frames.filter((f): f is PitchFrame & { pitch: number } => f.pitch != null && f.pitch > 0 && f.clarity > 0.3);
  if (voiced.length < 2) return;
  const hzs = voiced.map((f) => f.pitch);
  const min = Math.min(...hzs);
  const max = Math.max(...hzs);
  const range = Math.max(1, max - min);
  ctx.strokeStyle = '#FDBA74'; // warm orange line
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  voiced.forEach((f, i) => {
    const px = x + (i / (voiced.length - 1)) * w;
    const py = y + h - ((f.pitch - min) / range) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
}

export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background: indigo→violet gradient + soft radial glow
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#4F46E5');
  g.addColorStop(1, '#7C3AED');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, 700);
  glow.addColorStop(0, 'rgba(255,122,89,0.35)');
  glow.addColorStop(1, 'rgba(255,122,89,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 italic 46px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('🍣 NihonGo', 72, 110);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `700 30px ${UI_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('PITCH ACCENT', W - 72, 108);

  // Word + reading (center top)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 200px ${JP_FONT}`;
  ctx.fillText(input.word, W / 2, 360);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `600 56px ${JP_FONT}`;
  ctx.fillText(input.reading, W / 2, 430);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 34px ${UI_FONT}`;
  ctx.fillText(`${input.pattern} · ${input.patternEn}`, W / 2, 482);

  // Contour panel
  const px = 110, py = 520, pw = W - 220, ph = 180;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.fill();
  drawContour(ctx, input.frames, px + 40, py + 30, pw - 80, ph - 60);

  // Score
  ctx.textAlign = 'center';
  ctx.font = `90px ${UI_FONT}`;
  ctx.fillText(reactionEmoji(input.score), W / 2, 820);
  ctx.fillStyle = bandColor(input.score);
  ctx.font = `900 190px ${UI_FONT}`;
  ctx.fillText(String(input.score), W / 2 - 40, 960);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `700 64px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('/100', W / 2 + 130, 960);

  // CTA footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 46px ${UI_FONT}`;
  ctx.fillText('Can you sound more native?', W / 2, 1015);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 34px ${UI_FONT}`;
  ctx.fillText('Score your pitch free → nihongo.amorjp.com', W / 2, 1058);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

const SHARE_URL = 'https://nihongo.amorjp.com/?utm_source=share_card';

/**
 * Share the result card via the native share sheet (mobile) with a file, or
 * fall back to downloading the PNG. Returns the method used.
 */
export async function shareResult(input: ShareCardInput): Promise<'shared' | 'downloaded'> {
  const blob = await generateShareCard(input);
  const file = new File([blob], `nihongo-pitch-${input.word}.png`, { type: 'image/png' });
  const text = `I scored ${input.score}/100 on Japanese pitch accent (${input.word}) 🎯 Can you sound more native? ${SHARE_URL}`;

  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'My NihonGo pitch score' });
      return 'shared';
    } catch {
      // user cancelled or share failed → fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
