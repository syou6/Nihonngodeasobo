// "Stop saying Japanese FLAT" video generator — a different content angle from
// minimal pairs / grammar: one common word, the learner's flat monotone (❌) vs
// the native pitch contour (✅). Matches the pitch-trainer app.
//   node marketing/generate-flat.mjs --index 0
// Output: marketing/out-flat/NihonGo_flat_<word>.mp4 (1080x1920, ~12s, silent).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-flat');
const REC = path.join(MK, '.recf');
const W = 1080, H = 1920, DUR = 12.4;

// Common words learners flatten. p = accent nucleus from the dict (0 = heiban).
const WORDS = [
  { word: '日本語', reading: 'にほんご', en: 'Japanese (language)', p: 0 },
  { word: '東京', reading: 'とうきょう', en: 'Tokyo', p: 0 },
  { word: '美味しい', reading: 'おいしい', en: 'delicious', p: 0 },
  { word: '友達', reading: 'ともだち', en: 'friend', p: 0 },
  { word: 'お願い', reading: 'おねがい', en: 'please / a favor', p: 0 },
  { word: '勉強', reading: 'べんきょう', en: 'study', p: 0 },
  { word: '先生', reading: 'せんせい', en: 'teacher', p: 3 },
  { word: '可愛い', reading: 'かわいい', en: 'cute', p: 3 },
  { word: '大丈夫', reading: 'だいじょうぶ', en: "it's OK", p: 3 },
  { word: '元気', reading: 'げんき', en: 'energetic / well', p: 1 },
];

const SMALL = new Set([...'ゃゅょぁぃぅぇぉャュョ']);
const morae = (r) => { const out = []; for (const c of r) { if (SMALL.has(c) && out.length) out[out.length - 1] += c; else out.push(c); } return out; };
const pattern = (p, n) => Array.from({ length: n }, (_, i) => { const m = i + 1; if (p === 0) return m === 1 ? 0 : 1; if (p === 1) return m === 1 ? 1 : 0; return m >= 2 && m <= p ? 1 : 0; });

const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const idx = (idxArg != null ? idxArg : doy) % WORDS.length;
const e = WORDS[idx];
const ms = morae(e.reading);
const n = ms.length;
const pat = pattern(e.p, n);

// SVG contour from an H/L pattern. flat=true draws a monotone (the mistake).
function contour(pat, color, flat) {
  const w = 560, h = 200, padX = 50, hi = 40, lo = 150;
  const step = (w - padX * 2) / Math.max(1, n - 1);
  const pts = pat.map((lv, i) => `${padX + i * step},${flat ? 95 : (lv ? hi : lo)}`);
  const dots = pat.map((lv, i) => `<circle cx="${padX + i * step}" cy="${flat ? 95 : (lv ? hi : lo)}" r="9" fill="${color}"/>`).join('');
  const labels = ms.map((m, i) => `<text x="${padX + i * step}" y="195" text-anchor="middle" font-size="34" fill="#cdd5e6" font-family="'Hiragino Sans',sans-serif">${m}</text>`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}

const particles = Array.from({ length: 20 }, (_, i) => {
  const x = (i * 53) % 100, y = (i * 37) % 100, s = 4 + (i % 5) * 3, du = 7 + (i % 6), de = (i % 7) * 0.6;
  return `<span class="dot" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-duration:${du}s;animation-delay:-${de}s"></span>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box;font-family:-apple-system,'Hiragino Sans','Helvetica Neue',Arial,sans-serif}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#070a16}
.aurora{position:absolute;inset:-20%;filter:blur(60px);opacity:.85;z-index:0}
.aurora b{position:absolute;border-radius:50%;mix-blend-mode:screen;animation:drift 16s ease-in-out infinite}
.b1{width:760px;height:760px;background:#5b3df0;left:5%;top:8%}.b2{width:680px;height:680px;background:#0e9c7a;right:0;top:32%;animation-delay:-5s}.b3{width:620px;height:620px;background:#e0427a;left:18%;bottom:6%;animation-delay:-9s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(110px,-80px) scale(1.12)}}
.dot{position:absolute;background:#fff;border-radius:50%;opacity:.16;z-index:1;animation:fl linear infinite}
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-40px)}}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;z-index:2;padding:0 60px}
.s1{animation:v1 2.8s 0s both}.s2{animation:v 4.4s 2.8s both}.s3{animation:v 2.8s 7.2s both}.s4{animation:v 2.6s 10s both}
@keyframes v1{0%,88%{opacity:1}100%{opacity:0}}
@keyframes v{0%{opacity:0;transform:translateY(50px) scale(.95)}7%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-30px) scale(.97)}}
.hook{font-size:108px;font-weight:900;color:#fff;line-height:1.08;text-shadow:0 6px 40px rgba(120,90,255,.5);animation:slam .22s cubic-bezier(.2,1.5,.4,1) both}
@keyframes slam{0%{transform:scale(1.14)}55%{transform:scale(.97)}100%{transform:scale(1)}}
.sub{font-size:46px;color:#cdbcff;margin-top:30px;animation:up .5s .5s both}
.word{font-size:150px;font-weight:900;color:#fff;text-shadow:0 6px 40px rgba(0,0,0,.5)}
.read{font-size:48px;color:#9fb0cc;margin-top:6px}.mean{font-size:38px;color:#7a8aa8}
.row{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:30px}
.tag{font-size:40px;font-weight:800;padding:8px 28px;border-radius:999px}
.bad{color:#fff;background:rgba(255,80,110,.9)}.good{color:#fff;background:rgba(52,245,173,.85)}
.t3{font-size:84px;font-weight:900;color:#fff;line-height:1.15;animation:slam .5s .1s both}
.logo{font-size:118px;font-weight:900;color:#fff;text-shadow:0 8px 50px rgba(120,90,255,.6);animation:slam .6s .1s both}
.btn{margin-top:44px;font-size:56px;font-weight:900;color:#5b3df0;background:#fff;padding:32px 78px;border-radius:999px;animation:pulse 1.1s .6s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.url{font-size:42px;color:#c3b2ff;margin-top:34px}
@keyframes up{0%{transform:translateY(50px);opacity:0}100%{transform:translateY(0);opacity:1}}
</style></head><body>
<div class="aurora"><b class="b1"></b><b class="b2"></b><b class="b3"></b></div>${particles}
<div class="stage s1"><div class="hook">You say<br>${e.word} too FLAT 🇯🇵</div><div class="sub">…that's why you sound foreign</div></div>
<div class="stage s2">
  <div class="word">${e.word}</div><div class="read">${e.reading}</div><div class="mean">${e.en}</div>
  <div class="row"><span class="tag bad">❌ most learners</span>${contour(pat, '#ff6b86', true)}</div>
</div>
<div class="stage s3">
  <div class="word" style="font-size:120px">${e.word}</div>
  <div class="row"><span class="tag good">✅ native pitch</span>${contour(pat, '#34f5ad', false)}</div>
</div>
<div class="stage s4"><div class="logo">NihonGo 🍣</div><div class="btn">Score My Pitch →</div><div class="url">nihongo.amorjp.com</div></div>
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
await page.waitForTimeout(DUR * 1000);
await ctx.close();
await browser.close();

const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));
const outFile = path.join(OUT, `NihonGo_flat_${e.word}.mp4`);

// Audio: a music bed (faded) + the word spoken at the ✅ native-pitch reveal (s3
// starts at 7.2s) so viewers HEAR the correct pitch, not just see the contour.
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
    filters.push(`[${ai}:a]adelay=7350|7350,volume=1.7[w]`);
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
