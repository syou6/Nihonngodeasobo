import React, { useEffect, useRef } from 'react';

// Live "karaoke" lane: while you speak, your F0 drives a glowing dot that rides
// over the target high/low bands. The DROP-GATE (neon cliff at the accent
// nucleus) is the thing to steer your voice through. Real-time, canvas-based,
// reads a shared ref so the 60fps tick never re-renders React.
//
// Forgiving by design: a short null-pitch gap holds the last dot (the drop
// moment is low-pitch + often low-clarity, exactly when pitchy returns null),
// and the displayed pitch is a median-of-3 to kill jitter.

export interface LiveFrame { t: number; pitch: number | null }

interface Props {
  framesRef: React.MutableRefObject<LiveFrame[]>;
  morae: string[];
  // target high/low per mora (1 = high, 0 = low); length = morae.length
  pattern: number[];
  active: boolean;
}

const W = 640, H = 280;
const PAD_X = 50, PAD_TOP = 36, PAD_BOT = 50;

export const LivePitchLane: React.FC<Props> = ({ framesRef, morae, pattern, active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const n = Math.max(1, pattern.length);
    const laneW = W - PAD_X * 2;
    const hiY = PAD_TOP + 26;          // center of high band
    const loY = H - PAD_BOT - 26;      // center of low band
    const bandH = 46;
    const moraX = (i: number) => PAD_X + (n === 1 ? 0.5 : i / (n - 1)) * laneW;
    // the drop-gate sits between the last high mora and the first low mora
    let gateIdx = -1;
    for (let i = 0; i < pattern.length - 1; i++) if (pattern[i] === 1 && pattern[i + 1] === 0) { gateIdx = i; break; }
    const gateX = gateIdx >= 0 ? (moraX(gateIdx) + moraX(gateIdx + 1)) / 2 : -1;

    // map a live pitch (Hz) to a Y using a running median so any voice range fits
    const recent: number[] = [];
    const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
    let lastY = (hiY + loY) / 2;
    let holdFrames = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // bands
      pattern.forEach((v, i) => {
        const x = moraX(i);
        const y = v ? hiY : loY;
        ctx.fillStyle = v ? 'rgba(52,211,153,0.16)' : 'rgba(148,163,184,0.14)';
        ctx.beginPath();
        ctx.roundRect(x - laneW / (2 * n) + 4, y - bandH / 2, laneW / n - 8, bandH, 14);
        ctx.fill();
        // mora label
        ctx.fillStyle = 'rgba(100,116,139,0.9)';
        ctx.font = "600 22px 'Hiragino Sans',sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(morae[i] ?? '', x, H - 16);
      });
      // drop-gate (neon cliff)
      if (gateX > 0) {
        const g = ctx.createLinearGradient(0, PAD_TOP, 0, H - PAD_BOT);
        g.addColorStop(0, 'rgba(251,146,60,0.9)');
        g.addColorStop(1, 'rgba(251,113,133,0.5)');
        ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.setLineDash([8, 7]);
        ctx.beginPath(); ctx.moveTo(gateX, PAD_TOP); ctx.lineTo(gateX, H - PAD_BOT); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#FB923C'; ctx.font = "800 14px 'Plus Jakarta Sans',sans-serif";
        ctx.fillText('DROP', gateX, PAD_TOP - 8);
      }

      // live trace
      const frames = framesRef.current;
      if (frames.length) {
        const t0 = frames[0].t;
        const tEnd = Math.max(frames[frames.length - 1].t, t0 + 1);
        const xFor = (t: number) => PAD_X + Math.min(1, (t - t0) / Math.max(1200, tEnd - t0)) * laneW;
        ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = '#4F46E5';
        ctx.beginPath();
        let started = false; let lastX = PAD_X;
        for (const f of frames) {
          if (f.pitch && f.pitch > 0) {
            recent.push(f.pitch); if (recent.length > 60) recent.shift();
            const m = median(recent.slice(-15)) || f.pitch;
            const semi = 12 * Math.log2(f.pitch / m); // ± semitones from running median
            const y = (hiY + loY) / 2 - Math.max(-7, Math.min(7, semi)) / 7 * ((loY - hiY) / 2 + bandH / 2);
            lastY = y; holdFrames = 0;
            const x = xFor(f.t); lastX = x;
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          } else if (started && holdFrames < 6) {
            holdFrames++; ctx.lineTo(lastX, lastY); // hold through a brief unvoiced gap
          }
        }
        ctx.stroke();
        // glowing head dot
        ctx.shadowColor = 'rgba(79,70,229,0.7)'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#4F46E5';
        ctx.beginPath(); ctx.arc(lastX, lastY, 11, 0, 2 * Math.PI); ctx.fill();
        ctx.shadowBlur = 0;
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    if (active) rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [framesRef, morae, pattern, active]);

  return (
    <div className="rounded-3xl bg-white ring-1 ring-gray-100 shadow-card p-3 overflow-hidden">
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
};
