// Shareable 1080×1350 card for an Ear Sprint score — the growth loop: a player
// posts "I scored X on the Japanese ear test, can you hear it?" and a friend
// lands straight in the 60s game. Pure canvas, no dependency. Mirrors the brand
// (indigo→violet, the PitchBird mascot drawn happy + singing).

export interface EarShareInput {
  score: number;
  rank: string;       // e.g. "Sharp ear 👂"
  bestCombo: number;
  best: number;       // all-time best
}

const W = 1080;
const H = 1350;
const UI_FONT = "'Plus Jakarta Sans','Inter',system-ui,sans-serif";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A happy PitchBird (uguisu) drawn at (cx, cy) scaled by s (matches the SVG mascot).
function drawBird(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const P = (x: number, y: number) => [cx + (x - 70) * s, cy + (y - 70) * s] as const;
  const GREEN = '#94A24E', GREEN_DK = '#7C8A3E', BELLY = '#F0EBD6', BEAK = '#E8A23D', BEAK_DK = '#D08C2C', INK = '#3A3550', CHEEK = '#F2A65A';
  const ellipse = (bx: number, by: number, rx: number, ry: number, fill: string, rot = 0) => { const [x, y] = P(bx, by); ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(0, 0, rx * s, ry * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  const tri = (p1: [number, number], p2: [number, number], p3: [number, number], fill: string) => { const [a, b] = P(...p1); const [c, d] = P(...p2); const [e, f] = P(...p3); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.closePath(); ctx.fill(); };
  // feet
  ctx.strokeStyle = BEAK; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  const seg = (x1: number, y1: number, x2: number, y2: number) => { const [a, b] = P(x1, y1); const [c, d] = P(x2, y2); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  seg(62, 108, 62, 116); seg(58, 118, 66, 118); seg(78, 108, 78, 116); seg(74, 118, 82, 118);
  // tail
  ctx.fillStyle = GREEN_DK; { const [a, b] = P(98, 92), [c, d] = P(128, 108), [e, f] = P(100, 102); ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(c, d, e, f); ctx.closePath(); ctx.fill(); }
  // far wing
  ellipse(103, 76, 12, 18, GREEN_DK, 0.3);
  // body
  ellipse(70, 72, 40, 39, GREEN);
  // belly
  ellipse(70, 86, 26, 22, BELLY);
  // crest
  tri([66, 36], [69, 22], [70, 36], GREEN_DK); tri([72, 35], [79, 23], [76, 36], GREEN_DK);
  // cheeks
  ellipse(50, 80, 5.5, 5.5, CHEEK); ellipse(90, 80, 5.5, 5.5, CHEEK);
  // happy ^^ eyes
  ctx.strokeStyle = INK; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  const arc = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => { const [a, b] = P(x1, y1); const [c, d] = P(x2, y2); const [e, f] = P(x3, y3); ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(c, d, e, f); ctx.stroke(); };
  arc(53, 70, 58, 64, 63, 70); arc(77, 70, 82, 64, 87, 70);
  // open beak
  tri([62, 80], [78, 80], [70, 85], BEAK);
  tri([63, 84], [77, 84], [70, 89], BEAK_DK);
  // near wing
  ellipse(37, 76, 12, 18, GREEN_DK, -0.3);
  // ♪ note
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${Math.round(26 * s)}px ${UI_FONT}`;
  ctx.textAlign = 'center';
  { const [a, b] = P(112, 44); ctx.fillText('♪', a, b); }
}

export async function generateEarShareCard(input: EarShareInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#4f46e5');
  g.addColorStop(1, '#7c3aed');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft glow
  const rg = ctx.createRadialGradient(W / 2, 430, 40, W / 2, 430, 520);
  rg.addColorStop(0, 'rgba(255,255,255,0.16)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 46px ${UI_FONT}`;
  ctx.fillText('🍣 NihonGo', 80, 130);
  ctx.textAlign = 'right';
  ctx.font = `700 30px ${UI_FONT}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText('JAPANESE EAR TEST', W - 80, 128);
  ctx.globalAlpha = 1;

  // mascot
  drawBird(ctx, W / 2, 400, 3.4);

  // score
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 64px ${UI_FONT}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText('I scored', W / 2, 690);
  ctx.globalAlpha = 1;
  ctx.font = `900 280px ${UI_FONT}`;
  ctx.fillText(String(input.score), W / 2, 940);
  ctx.font = `700 52px ${UI_FONT}`;
  ctx.globalAlpha = 0.92;
  ctx.fillText(input.rank, W / 2, 1020);
  ctx.globalAlpha = 1;

  // combo / best badges
  ctx.font = `700 38px ${UI_FONT}`;
  const badge = (text: string, x: number, w: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, x, 1070, w, 78, 39); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x + w / 2, 1120);
  };
  const cText = `🔥 best combo ×${input.bestCombo}`;
  const bText = `🏆 all-time ${input.best}`;
  ctx.font = `700 36px ${UI_FONT}`;
  const cw = ctx.measureText(cText).width + 64;
  const bw = ctx.measureText(bText).width + 64;
  const gap = 24;
  const total = cw + bw + gap;
  badge(cText, (W - total) / 2, cw);
  badge(bText, (W - total) / 2 + cw + gap, bw);

  // CTA pill
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 140, 1210, W - 280, 96, 48); ctx.fill();
  ctx.fillStyle = '#4f46e5';
  ctx.font = `800 40px ${UI_FONT}`;
  ctx.fillText('Can you hear it? 箸 or 橋 👂', W / 2, 1258);
  ctx.fillStyle = '#6366f1';
  ctx.font = `600 30px ${UI_FONT}`;
  ctx.fillText('nihongo.amorjp.com', W / 2, 1296);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

const SHARE_URL = 'https://nihongo.amorjp.com/app.html?guest=true&view=ear&utm_source=ear_share';

export async function shareEarResult(input: EarShareInput): Promise<'shared' | 'downloaded'> {
  const blob = await generateEarShareCard(input);
  const file = new File([blob], `nihongo-ear-${input.score}.png`, { type: 'image/png' });
  const text =
    `I scored ${input.score} on the Japanese ear test 👂 (${input.rank})\n` +
    `Can you hear 箸 vs 橋? Try the 60-sec game — no mic ${SHARE_URL}\n\n` +
    `#LearnJapanese #JapanesePitchAccent #日本語 #studytok`;

  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'My NihonGo ear-test score' });
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
