// Long-form (16:9, ~3 min) YouTube lesson: "Japanese Pitch Accent Explained".
// Slide-timeline rendered via Playwright + music bed + Japanese word audio.
//   node marketing/generate-longform.mjs
// Output: marketing/out-long/NihonGo_pitch_explained.mp4 (1920x1080, ~3 min).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-long');
const REC = path.join(MK, '.recl');
const AUDIO = path.join(MK, 'audio');
const W = 1920, H = 1080;

// ---- pitch helpers (mirror generate-flat) ----
const SMALL = new Set([...'ゃゅょぁぃぅぇぉ']);
const morae = (r) => { const o = []; for (const c of r) { if (SMALL.has(c) && o.length) o[o.length - 1] += c; else o.push(c); } return o; };
const pat = (p, n) => Array.from({ length: n }, (_, i) => { const m = i + 1; if (p === 0) return m === 1 ? 0 : 1; if (p === 1) return m === 1 ? 1 : 0; return m >= 2 && m <= p ? 1 : 0; });
function contour(reading, p, color = '#34f5ad', flat = false) {
  const ms = morae(reading); const n = ms.length;
  const P = pat(p, n); const w = 620, h = 210, padX = 60, hi = 45, lo = 160;
  const step = (w - padX * 2) / Math.max(1, n - 1);
  const pts = P.map((lv, i) => `${padX + i * step},${flat ? 100 : (lv ? hi : lo)}`);
  const dots = P.map((lv, i) => `<circle cx="${padX + i * step}" cy="${flat ? 100 : (lv ? hi : lo)}" r="11" fill="${color}"/>`).join('');
  const labs = ms.map((m, i) => `<text x="${padX + i * step}" y="200" text-anchor="middle" font-size="40" fill="#cdd5e6" font-family="'Hiragino Sans',sans-serif">${m}</text>`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labs}</svg>`;
}

// ---- slides: [html, durationSec, audioWord?] ----
const slides = [
  [`<div class="big">Japanese Pitch Accent</div><div class="sub">— Explained in 3 minutes —</div>`, 4],
  [`<div class="mid">Your grammar is perfect.</div><div class="mid">But you still sound foreign.</div><div class="sub2">Why?</div>`, 6],
  [`<div class="huge text-grad">It's your PITCH. 🎯</div>`, 4],
  [`<div class="mid">Two words, same sounds (はし)…</div>
    <div class="pairrow">
      <div class="pcard"><div class="kj">箸</div><div class="en">chopsticks</div>${contour('はし', 1, '#ff6b86')}</div>
      <div class="pcard"><div class="kj">橋</div><div class="en">bridge</div>${contour('はし', 0, '#34f5ad')}</div>
    </div>
    <div class="sub2">…different <b>pitch</b> = different meaning.</div>`, 11, '箸'],
  [`<div class="mid">Japanese has <b>4 pitch patterns</b>:</div>
    <div class="patgrid"><span>平板 Heiban</span><span>頭高 Atamadaka</span><span>中高 Nakadaka</span><span>尾高 Odaka</span></div>`, 5],
  [`<div class="tag heiban">① 平板 — Heiban</div><div class="kj2">日本語</div><div class="read">にほんご</div>${contour('にほんご', 0)}<div class="sub2">Starts low, rises, stays high. <b>No drop.</b></div>`, 11, '日本語'],
  [`<div class="tag atama">② 頭高 — Atamadaka</div><div class="kj2">猫</div><div class="read">ねこ</div>${contour('ねこ', 1, '#ff6b86')}<div class="sub2">Starts <b>high</b>, drops right after the 1st mora.</div>`, 10, '猫'],
  [`<div class="tag naka">③ 中高 — Nakadaka</div><div class="kj2">大丈夫</div><div class="read">だいじょうぶ</div>${contour('だいじょうぶ', 3, '#ffd93d')}<div class="sub2">Rises, then <b>drops in the middle</b>.</div>`, 11, '大丈夫'],
  [`<div class="tag odaka">④ 尾高 — Odaka</div><div class="kj2">男</div><div class="read">おとこ</div>${contour('おとこ', 3, '#7ee0ff')}<div class="sub2">High through the word — the drop lands on the next <b>particle</b>.</div>`, 9],
  [`<div class="huge">The #1 mistake?</div><div class="mid">Saying everything <span class="text-bad">FLAT.</span></div>${contour('にほんご', 0, '#ff6b86', true)}`, 8],
  [`<div class="mid">Words you're probably flattening:</div>
    <div class="wordrow"><span>友達</span><span>先生</span><span>元気</span><span>東京</span></div>
    <div class="sub2">Each has a pitch shape. Flat = foreign.</div>`, 9, '友達'],
  [`<div class="mid">So how do you fix it?</div><div class="sub2">You need <b>feedback on your own voice</b> — most apps don't give it.</div>`, 7],
  [`<div class="mid">NihonGo scores <b>your</b> pitch 🍣</div><div class="sub2">Record a word → see your contour vs a native → fix the drop.</div><div class="huge text-grad" style="margin-top:30px">honest feedback you can trust</div>`, 9],
  [`<div class="logo">NihonGo 🍣</div><div class="big">Train your pitch — free</div><div class="url">nihongo.amorjp.com</div>`, 6],
];

// build cumulative timeline
let t = 0; const timed = slides.map(([html, dur, word]) => { const start = t; t += dur; return { html, start, dur, word }; });
const total = t;

const slideHtml = timed.map((s, i) => `<div class="slide" style="animation:show ${s.dur}s ${s.start}s both">${s.html}</div>`).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box;font-family:-apple-system,'Hiragino Sans','Helvetica Neue',Arial,sans-serif}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#070a16;color:#fff}
.aurora{position:absolute;inset:-20%;filter:blur(80px);opacity:.7;z-index:0}
.aurora b{position:absolute;border-radius:50%;mix-blend-mode:screen;animation:drift 18s ease-in-out infinite}
.b1{width:900px;height:900px;background:#5b3df0;left:2%;top:5%}.b2{width:800px;height:800px;background:#0e9c7a;right:0;top:25%;animation-delay:-6s}.b3{width:760px;height:760px;background:#e0427a;left:25%;bottom:2%;animation-delay:-10s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(140px,-100px) scale(1.12)}}
.slide{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;z-index:2;padding:0 120px;gap:18px}
@keyframes show{0%{opacity:0;transform:translateY(40px) scale(.97)}6%{opacity:1;transform:none}92%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-24px) scale(.98)}}
.big{font-size:96px;font-weight:900;line-height:1.05;text-shadow:0 8px 50px rgba(120,90,255,.5)}
.huge{font-size:120px;font-weight:900;line-height:1.02}
.mid{font-size:64px;font-weight:800;line-height:1.15}
.sub{font-size:44px;color:#cdbcff;font-weight:600}
.sub2{font-size:42px;color:#aeb9d6;margin-top:8px}.sub2 b{color:#fff}
.text-grad{background:linear-gradient(110deg,#fff,#9affd9,#c3b2ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.text-bad{color:#ff6b86}
.kj{font-size:120px;font-weight:900}.kj2{font-size:140px;font-weight:900}
.en{font-size:34px;color:#9ab}.read{font-size:48px;color:#9fb0cc}
.pairrow{display:flex;gap:90px;margin:10px 0}
.pcard{background:rgba(15,20,40,.6);border:1px solid rgba(255,255,255,.08);border-radius:30px;padding:36px 48px}
.patgrid{display:flex;gap:26px;flex-wrap:wrap;justify-content:center;font-size:40px;font-weight:800;margin-top:14px}
.patgrid span{background:rgba(124,75,255,.85);padding:14px 30px;border-radius:999px}
.tag{font-size:46px;font-weight:900;padding:12px 36px;border-radius:999px}
.heiban{background:#0e9c7a}.atama{background:#e0427a}.naka{background:#c79a1a}.odaka{background:#2a7fb8}
.wordrow{display:flex;gap:40px;font-size:80px;font-weight:900;margin:10px 0}
.logo{font-size:120px;font-weight:900;text-shadow:0 8px 60px rgba(120,90,255,.6)}
.url{font-size:48px;color:#c3b2ff;margin-top:10px}
</style></head><body>
<div class="aurora"><b class="b1"></b><b class="b2"></b><b class="b3"></b></div>
${slideHtml}
</body></html>`;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });
const sceneFile = path.join(REC, 'l.html');
await writeFile(sceneFile, html);

console.log(`Rendering ${total}s long-form…`);
const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: REC, size: { width: W, height: H } } });
const page = await ctx.newPage();
await page.goto('file://' + sceneFile);
await page.waitForTimeout((total + 0.5) * 1000);
await ctx.close();
await browser.close();

const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));
const silent = path.join(REC, 's.mp4');
await run('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-vf', `scale=${W}:${H},fps=30`, '-t', String(total), silent]);

// audio: music bed + each slide's word example at its start
const music = path.join(AUDIO, 'music_130.mp3');
const inputs = ['-i', silent];
const fc = [];
const amix = [];
let ai = 1;
if (existsSync(music)) {
  inputs.push('-stream_loop', '-1', '-i', music);
  fc.push(`[${ai}:a]volume=0.14,atrim=0:${total},afade=t=in:st=0:d=1.5,afade=t=out:st=${total - 2}:d=2[m]`);
  amix.push('[m]'); ai++;
}
for (const s of timed) {
  if (!s.word) continue;
  const wp = path.join(AUDIO, 'words', `${s.word}.mp3`);
  if (!existsSync(wp)) continue;
  const delay = Math.round((s.start + 1.2) * 1000);
  inputs.push('-i', wp);
  fc.push(`[${ai}:a]adelay=${delay}|${delay},volume=1.6[w${ai}]`);
  amix.push(`[w${ai}]`); ai++;
}
const outFile = path.join(OUT, 'NihonGo_pitch_explained.mp4');
if (amix.length) {
  fc.push(`${amix.join('')}amix=inputs=${amix.length}:duration=longest:normalize=0[a]`);
  await run('ffmpeg', ['-y', ...inputs, '-filter_complex', fc.join(';'), '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(total), outFile]);
} else {
  await run('ffmpeg', ['-y', '-i', silent, '-c', 'copy', outFile]);
}
await rm(REC, { recursive: true, force: true });
const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
console.log(`\n✅ ${outFile}\n   ${Number(stdout.trim()).toFixed(0)}s · ${W}x${H} · long-form`);
