import type { PitchFrame } from './pitch-tracker';

// Generates a premium 1080×1350 (portrait, social-optimized) share card of a
// pitch-accent result — the viral loop "I scored X% — can you sound more native?".
// Pure canvas, no dependency.

export interface ShareCardInput {
  word: string;
  reading: string;
  score: number;
  pattern: string;        // 平板 / 頭高 / 中高 / 尾高
  patternEn: string;      // Heiban / Atamadaka / ...
  frames: PitchFrame[];   // the user's recorded pitch
  targetNucleus: number;  // expected drop position (0 = heiban)
  moraCount: number;
  streak?: number;        // current correct streak — a flex/social-proof badge
}

const W = 1080;
const H = 1350;
const JP_FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";
const UI_FONT = "'Plus Jakarta Sans','Inter',system-ui,sans-serif";

function bandColor(score: number): string {
  if (score >= 80) return '#34D399';
  if (score >= 60) return '#FBBF24';
  return '#FB7185';
}
function reaction(score: number): string {
  if (score >= 90) return '🎉 Native-like!';
  if (score >= 80) return '✅ Nailed the drop';
  if (score >= 60) return '👍 So close';
  return '💪 Keep training';
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

// The native target contour as a smooth stepped line (low→high, drop after nucleus).
function targetPoints(nucleus: number, moraCount: number): number[] {
  // value per mora: 1 = high, 0 = low. Heiban (nucleus 0): low on mora1 then high.
  const vals: number[] = [];
  for (let m = 1; m <= moraCount; m++) {
    if (nucleus === 0) vals.push(m === 1 ? 0 : 1);
    else if (m === 1) vals.push(nucleus === 1 ? 1 : 0);
    else vals.push(m <= nucleus ? 1 : 0);
  }
  return vals;
}

function drawContours(
  ctx: CanvasRenderingContext2D,
  frames: PitchFrame[],
  nucleus: number,
  moraCount: number,
  x: number, y: number, w: number, h: number,
) {
  // Native target line (dashed white)
  const tv = targetPoints(nucleus, moraCount);
  if (tv.length >= 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 7;
    ctx.setLineDash([14, 12]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    tv.forEach((v, i) => {
      const px = x + (tv.length === 1 ? 0.5 : i / (tv.length - 1)) * w;
      const py = y + h - (v * 0.78 + 0.11) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // User's recorded contour (solid orange)
  const voiced = frames.filter((f): f is PitchFrame & { pitch: number } => f.pitch != null && f.pitch > 0 && f.clarity > 0.3);
  if (voiced.length >= 2) {
    const hzs = voiced.map((f) => f.pitch);
    const min = Math.min(...hzs), max = Math.max(...hzs);
    const range = Math.max(1, max - min);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#FDBA74');
    grad.addColorStop(1, '#FB923C');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(251,146,60,0.5)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    voiced.forEach((f, i) => {
      const px = x + (i / (voiced.length - 1)) * w;
      const py = y + h - ((f.pitch - min) / range * 0.78 + 0.11) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawScoreRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, score: number) {
  const start = -Math.PI / 2;
  const end = start + (score / 100) * 2 * Math.PI;
  // track
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();
  // progress
  ctx.strokeStyle = bandColor(score);
  ctx.shadowColor = bandColor(score);
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // number
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 150px ${UI_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(score), cx, cy - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `700 40px ${UI_FONT}`;
  ctx.fillText('/ 100', cx, cy + 78);
  ctx.textBaseline = 'alphabetic';
}

export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient + dual glow
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, '#4338CA');
  g.addColorStop(0.55, '#5B21B6');
  g.addColorStop(1, '#3B0764');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 760);
  glow1.addColorStop(0, 'rgba(255,122,89,0.30)');
  glow1.addColorStop(1, 'rgba(255,122,89,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.9, 0, W * 0.1, H * 0.9, 700);
  glow2.addColorStop(0, 'rgba(99,102,241,0.35)');
  glow2.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 italic 50px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('🍣 NihonGo', 80, 130);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 28px ${UI_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('PITCH ACCENT TRAINER', W - 80, 128);

  // Streak badge (top-right, under the header) — social-proof flex
  if (input.streak && input.streak >= 2) {
    const sText = `🔥 ${input.streak} in a row`;
    ctx.font = `800 32px ${UI_FONT}`;
    const sw = ctx.measureText(sText).width + 56;
    ctx.fillStyle = 'rgba(251,146,60,0.22)';
    roundRect(ctx, W - 80 - sw, 168, sw, 58, 29);
    ctx.fill();
    ctx.fillStyle = '#FDBA74';
    ctx.textAlign = 'right';
    ctx.fillText(sText, W - 108, 207);
  }

  // Word hero (font shrinks for longer words so it never overflows)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  const wordSize = input.word.length >= 4 ? 150 : input.word.length === 3 ? 185 : 230;
  ctx.font = `800 ${wordSize}px ${JP_FONT}`;
  ctx.fillText(input.word, W / 2, 460);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `600 60px ${JP_FONT}`;
  ctx.fillText(input.reading, W / 2, 540);

  // Pattern pill
  const pillText = `${input.pattern}  ${input.patternEn}`;
  ctx.font = `700 36px ${UI_FONT}`;
  const pw = ctx.measureText(pillText).width + 64;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, W / 2 - pw / 2, 580, pw, 64, 32);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(pillText, W / 2, 623);

  // Contour panel (glass) with native vs you + legend
  const px = 90, py = 700, pwid = W - 180, ph = 240;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, px, py, pwid, ph, 32);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pwid, ph, 32);
  ctx.stroke();
  drawContours(ctx, input.frames, input.targetNucleus, input.moraCount, px + 50, py + 40, pwid - 100, ph - 80);
  // legend
  ctx.textAlign = 'left';
  ctx.font = `700 26px ${UI_FONT}`;
  ctx.fillStyle = '#FB923C';
  ctx.fillText('—  you', px + 40, py + ph - 18);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('- - native', px + 200, py + ph - 18);

  // Score ring (hero)
  drawScoreRing(ctx, W / 2, 1090, 118, input.score);

  // Reaction (under the ring)
  ctx.textAlign = 'center';
  ctx.fillStyle = bandColor(input.score);
  ctx.font = `800 46px ${UI_FONT}`;
  ctx.fillText(reaction(input.score), W / 2, 1270);

  // CTA pill
  const cta = 'Can you sound more native?  →  nihongo.amorjp.com';
  ctx.font = `700 30px ${UI_FONT}`;
  const cw = ctx.measureText(cta).width + 64;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, W / 2 - cw / 2, 1298, cw, 56, 28);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(cta, W / 2, 1335);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

const SHARE_URL = 'https://nihongo.amorjp.com/?utm_source=share_card';

export async function shareResult(input: ShareCardInput): Promise<'shared' | 'downloaded'> {
  const blob = await generateShareCard(input);
  const file = new File([blob], `nihongo-pitch-${input.word}.png`, { type: 'image/png' });
  const text =
    `I scored ${input.score}/100 on Japanese pitch accent (${input.word} ${input.reading}) 🎯\n` +
    `Can you sound more native? ${SHARE_URL}\n\n` +
    `#LearnJapanese #JapanesePitchAccent #日本語 #studytok`;

  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'My NihonGo pitch score' });
      return 'shared';
    } catch {
      // cancelled → fall through to download
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
