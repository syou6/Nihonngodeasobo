// PREMIUM pitch-accent short — brand-matched to the app's share card.
// Deep indigo→violet gradient, animated contour draw-in (you vs native), a score
// ring CTA. A quality step up from the "aurora" flat format.
//   node marketing/generate-pro.mjs --index 0
// Output: marketing/out-pro/NihonGo_pro_<word>.mp4 (1080x1920, ~12.4s, BGM + word).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-pro');
const REC = path.join(MK, '.recpro');
const W = 1080, H = 1920, DUR = 12.4;

const WORDS = [
  { word: '日本語', reading: 'にほんご', en: 'Japanese (language)', p: 0 },
  { word: '東京', reading: 'とうきょう', en: 'Tokyo', p: 0 },
  { word: '美味しい', reading: 'おいしい', en: 'delicious', p: 0 },
  { word: '友達', reading: 'ともだち', en: 'friend', p: 0 },
  { word: 'お願い', reading: 'おねがい', en: 'please / a favor', p: 0 },
  { word: '勉強', reading: 'べんきょう', en: 'study', p: 0 },
  { word: '先生', reading: 'せんせい', en: 'teacher', p: 3 },
  { word: '可愛い', reading: 'かわいい', en: 'cute', p: 3 },
  { word: '大丈夫', reading: 'だいじょうぶ', en: 'it\'s OK', p: 3 },
  { word: '元気', reading: 'げんき', en: 'energetic / well', p: 1 },
  { word: '学校', reading: 'がっこう', en: 'school', p: 0 },
  { word: '仕事', reading: 'しごと', en: 'work', p: 0 },
  { word: '名前', reading: 'なまえ', en: 'name', p: 0 },
  { word: '家族', reading: 'かぞく', en: 'family', p: 1 },
  { word: '天気', reading: 'てんき', en: 'weather', p: 1 },
  { word: '京都', reading: 'きょうと', en: 'Kyoto', p: 1 },
  { word: '世界', reading: 'せかい', en: 'world', p: 1 },
  { word: '便利', reading: 'べんり', en: 'convenient', p: 1 },
  { word: '綺麗', reading: 'きれい', en: 'pretty', p: 1 },
  { word: '映画', reading: 'えいが', en: 'movie', p: 1 },
];

const SMALL = new Set([...'ゃゅょぁぃぅぇぉャュョ']);
const morae = (r) => { const out = []; for (const c of r) { if (SMALL.has(c) && out.length) out[out.length - 1] += c; else out.push(c); } return out; };
const pattern = (p, n) => Array.from({ length: n }, (_, i) => { const m = i + 1; if (p === 0) return m === 1 ? 0 : 1; if (p === 1) return m === 1 ? 1 : 0; return m >= 2 && m <= p ? 1 : 0; });

const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const doy = Math.floor((Date.now() - Date.UTC(2026, 0, 0)) / 86400000);
const idx = (idxArg != null ? idxArg : doy) % WORDS.length;
const e = WORDS[idx];
const ms = morae(e.reading);
const n = ms.length;
const pat = pattern(e.p, n);

// Build an SVG polyline (points + per-mora dots/labels). `flat` = monotone mistake.
function contour(pat, color, flat, animClass) {
  const w = 760, h = 300, pad = 70;
  const xs = pat.map((_, i) => pad + (i / Math.max(1, pat.length - 1)) * (w - 2 * pad));
  const ys = pat.map((v) => (flat ? h * 0.5 : (v ? h * 0.26 : h * 0.72)));
  const pts = xs.map((x, i) => `${x.toFixed(0)},${ys[i].toFixed(0)}`);
  const dots = xs.map((x, i) => `<circle cx="${x.toFixed(0)}" cy="${ys[i].toFixed(0)}" r="11" fill="${color}"/>`).join('');
  const labels = ms.map((m, i) => `<text x="${xs[i].toFixed(0)}" y="${h - 12}" fill="rgba(255,255,255,.6)" font-size="34" font-family="'Hiragino Sans',sans-serif" text-anchor="middle">${m}</text>`).join('');
  // length estimate for the draw-in dash animation
  let len = 0; for (let i = 1; i < xs.length; i++) len += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline class="${animClass}" points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" style="--len:${Math.ceil(len)}"/>
    ${dots}${labels}</svg>`;
}

const ringDash = Math.PI * 2 * 150;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#4338CA 0%,#5B21B6 55%,#3B0764 100%)}
.glow{position:absolute;border-radius:50%;filter:blur(120px);z-index:0}
.g1{width:760px;height:760px;background:rgba(255,122,89,.30);right:-120px;top:60px}
.g2{width:720px;height:720px;background:rgba(99,102,241,.45);left:-160px;bottom:80px}
.jp{font-family:'Hiragino Sans','Yu Gothic',sans-serif}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;z-index:2;opacity:0}
.s1{animation:seg 2.5s 0s both}.s2{animation:seg 3s 2.5s both}.s3{animation:seg 3.5s 5.5s both}.s4{animation:seg 3.4s 9s both}
@keyframes seg{0%{opacity:0;transform:translateY(40px) scale(.97)}6%{opacity:1;transform:none}92%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-26px) scale(.98)}}
.kicker{font-size:40px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:24px}
.hook{font-size:104px;font-weight:800;line-height:1.04;letter-spacing:-.02em}
.hook .w{color:#FDBA74}
.subhook{margin-top:30px;font-size:46px;font-weight:700;color:rgba(255,255,255,.82)}
.word{font-size:200px;font-weight:800;line-height:1}
.read{font-size:56px;color:rgba(255,255,255,.7);margin-top:8px}
.mean{font-size:38px;color:rgba(255,255,255,.5);margin-top:6px}
.tag{display:inline-block;font-size:40px;font-weight:800;padding:14px 40px;border-radius:999px;margin-bottom:26px}
.bad{background:rgba(251,113,133,.92);color:#fff}.good{background:rgba(52,211,153,.92);color:#06281c}
.draw{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:draw 1s .25s ease-out forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.btn{margin-top:50px;font-size:58px;font-weight:800;color:#4f46e5;background:#fff;padding:34px 86px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3);animation:pulse 1.2s .5s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.logo{font-size:58px;font-weight:800;font-style:italic;margin-bottom:14px}
.url{margin-top:30px;font-size:40px;color:rgba(255,255,255,.75);font-weight:700}
.ringwrap{position:relative;width:340px;height:340px;margin-bottom:30px}
.ringnum{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ringnum b{font-size:120px;font-weight:800;color:#34D399}.ringnum span{font-size:36px;color:rgba(255,255,255,.6);font-weight:700}
.arc{stroke-dasharray:${ringDash.toFixed(0)};stroke-dashoffset:${ringDash.toFixed(0)};animation:arc 1s .3s ease-out forwards}
@keyframes arc{to{stroke-dashoffset:${(ringDash * 0.08).toFixed(0)}}}
</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>

<div class="stage s1">
  <div class="hook">You're saying<br><span class="w jp">${e.word}</span><br>too FLAT 😳</div>
  <div class="subhook">…that's why you sound foreign 🇯🇵</div>
</div>

<div class="stage s2">
  <div class="word jp">${e.word}</div><div class="read jp">${e.reading}</div><div class="mean">${e.en}</div>
  <div style="margin-top:40px"><span class="tag bad">❌ how most learners say it</span></div>
  ${contour(pat, '#FB7185', true, 'draw')}
</div>

<div class="stage s3">
  <div class="word jp" style="font-size:150px">${e.word}</div>
  <div style="margin-top:30px"><span class="tag good">✅ native pitch</span></div>
  ${contour(pat, '#34D399', false, 'draw')}
  <div style="margin-top:14px;font-size:38px;color:rgba(255,255,255,.7);font-weight:700">the pitch moves — hear it 👂</div>
</div>

<div class="stage s4">
  <div class="logo">🍣 NihonGo</div>
  <div class="ringwrap">
    <svg width="340" height="340" viewBox="0 0 340 340" style="transform:rotate(-90deg)">
      <circle cx="170" cy="170" r="150" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="26"/>
      <circle class="arc" cx="170" cy="170" r="150" fill="none" stroke="#34D399" stroke-width="26" stroke-linecap="round"/>
    </svg>
    <div class="ringnum"><b>92</b><span>/ 100</span></div>
  </div>
  <div class="btn">Score My Pitch FREE →</div>
  <div class="url">nihongo.amorjp.com</div>
</div>
</body></html>`;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });
const sceneFile = path.join(REC, 'f.html');
await writeFile(sceneFile, html);

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: REC, size: { width: W, height: H } } });
const page = await ctx.newPage();
await page.goto('file://' + sceneFile);
await page.waitForTimeout(800); // let webfonts load
await page.waitForTimeout(DUR * 1000);
await ctx.close();
await browser.close();

const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));
const outFile = path.join(OUT, `NihonGo_pro_${e.word}.mp4`);

const music = path.join(MK, 'audio', 'music_130.mp3');
const wordAudio = path.join(MK, 'audio', 'words', `${e.word}.mp3`);
const hasMusic = existsSync(music);
const hasWord = existsSync(wordAudio);

if (hasMusic || hasWord) {
  const inputs = ['-i', webm];
  const filters = [`[0:v]scale=${W}:${H},fps=30[v]`];
  const amix = [];
  let ai = 1;
  if (hasMusic) {
    inputs.push('-i', music);
    filters.push(`[${ai}:a]volume=0.16,atrim=0:13,afade=t=in:st=0:d=1,afade=t=out:st=11.4:d=1.2[m]`);
    amix.push('[m]'); ai++;
  }
  if (hasWord) {
    inputs.push('-i', wordAudio);
    filters.push(`[${ai}:a]adelay=6000|6000,volume=1.7[w]`); // word at the ✅ native reveal (s3 @5.5s)
    amix.push('[w]'); ai++;
  }
  filters.push(`${amix.join('')}amix=inputs=${amix.length}:duration=longest:normalize=0[a]`);
  await run('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', '12.4', outFile]);
} else {
  await run('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-vf', `scale=${W}:${H},fps=30`, '-movflags', '+faststart', outFile]);
}
await rm(REC, { recursive: true, force: true });
console.log(`✅ ${outFile}${hasWord ? ' (BGM + word read-aloud)' : ''}`);
