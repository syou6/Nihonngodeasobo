// Interactive QUIZ short generator (motion graphics, recorded via Playwright).
// Hook -> question + A/B + 3-2-1 countdown ("comment your answer") -> reveal -> CTA.
//   node marketing/generate-quiz.mjs --index 0
// Output: marketing/out-quiz/NihonGo_quiz_<n>.mp4 (1080x1920, ~13s, silent).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-quiz');
const REC = path.join(MK, '.recq');
const W = 1080, H = 1920, DUR = 13.2;

const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const bank = JSON.parse(await readFile(path.join(MK, 'quiz-bank.json'), 'utf8')).entries;
const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const idx = (idxArg != null ? idxArg : doy) % bank.length;
const e = bank[idx];
const correctA = e.correct === 'A';

// option cards; `reveal` styles the answer (correct=green ✅, wrong=dim ❌)
const options = (reveal) => `
  <div class="opt ${reveal ? (correctA ? 'win' : 'lose') : ''}"><span class="ol">A</span>${e.a}${reveal && correctA ? ' ✅' : reveal && !correctA ? ' ❌' : ''}</div>
  <div class="opt ${reveal ? (!correctA ? 'win' : 'lose') : ''}"><span class="ol">B</span>${e.b}${reveal && !correctA ? ' ✅' : reveal && correctA ? ' ❌' : ''}</div>`;

const particles = Array.from({ length: 22 }, (_, i) => {
  const x = (i * 53) % 100, y = (i * 37) % 100, s = 4 + (i % 5) * 3, dur = 7 + (i % 6), del = (i % 7) * 0.6;
  return `<span class="dot" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-duration:${dur}s;animation-delay:-${del}s"></span>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Hiragino Sans','Helvetica Neue',Arial,sans-serif}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#070a16}
.aurora{position:absolute;inset:-20%;filter:blur(60px);opacity:.9;z-index:0}
.aurora b{position:absolute;border-radius:50%;mix-blend-mode:screen;animation:drift 16s ease-in-out infinite}
.b1{width:760px;height:760px;background:#5b3df0;left:5%;top:8%}
.b2{width:680px;height:680px;background:#0e9c7a;right:0;top:30%;animation-delay:-5s}
.b3{width:620px;height:620px;background:#e0427a;left:18%;bottom:6%;animation-delay:-9s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(120px,-90px) scale(1.15)}66%{transform:translate(-90px,80px) scale(.9)}}
.dot{position:absolute;background:#fff;border-radius:50%;opacity:.16;z-index:1;animation:floaty linear infinite}
@keyframes floaty{0%{transform:translateY(0)}50%{transform:translateY(-40px)}100%{transform:translateY(0)}}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;z-index:2;padding:0 60px}
.s1{animation:vis1 2.2s 0s both}
.s2{animation:vis 5.6s 2.2s both}
.s3{animation:vis 3.0s 7.8s both}
.s4{animation:vis 2.8s 10.8s both}
@keyframes vis1{0%,86%{opacity:1}100%{opacity:0}}
@keyframes vis{0%{opacity:0;transform:translateY(50px) scale(.95)}6%{opacity:1;transform:none}90%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-30px) scale(.97)}}
.hook{font-size:104px;font-weight:900;color:#fff;line-height:1.08;text-shadow:0 6px 40px rgba(120,90,255,.5);animation:slam .22s cubic-bezier(.2,1.5,.4,1) both}
@keyframes slam{0%{transform:scale(1.14)}55%{transform:scale(.97)}100%{transform:scale(1)}}
.hsub{font-size:46px;color:#cdbcff;margin-top:30px;animation:up .5s .5s both}
.qlabel{font-size:38px;font-weight:800;color:#fff;background:rgba(124,75,255,.9);padding:14px 36px;border-radius:999px;box-shadow:0 10px 30px rgba(124,75,255,.5)}
.q{font-size:74px;font-weight:900;color:#fff;margin:46px 0 50px;line-height:1.25;text-shadow:0 4px 30px rgba(0,0,0,.4)}
.opt{display:flex;align-items:center;gap:24px;font-size:60px;font-weight:800;color:#fff;background:rgba(23,31,58,.85);border:2px solid rgba(255,255,255,.08);border-radius:28px;padding:30px 40px;margin:16px 0;width:760px;box-shadow:0 18px 50px rgba(0,0,0,.45)}
.ol{font-size:46px;font-weight:900;color:#5b3df0;background:#fff;width:78px;height:78px;border-radius:20px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.win{border-color:#34f5ad;background:rgba(20,80,60,.85);box-shadow:0 0 60px rgba(52,245,173,.5);animation:pulsewin 1s infinite}
@keyframes pulsewin{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
.lose{opacity:.4}
.count{font-size:240px;font-weight:900;color:#fff;position:absolute;text-shadow:0 0 60px rgba(120,90,255,.7)}
.c3{animation:cnum .9s .4s both}.c2{animation:cnum .9s 1.3s both}.c1{animation:cnum .9s 2.2s both}
@keyframes cnum{0%{transform:scale(2);opacity:0}25%{transform:scale(1);opacity:1}80%{opacity:1}100%{transform:scale(.6);opacity:0}}
.cta-comment{font-size:50px;font-weight:800;color:#34f5ad;margin-top:44px;animation:up .5s 3.1s both}
.why{font-size:46px;color:#fff;font-weight:700;line-height:1.4;padding:0 50px;text-shadow:0 4px 30px rgba(0,0,0,.4);animation:up .55s .2s both}
.logo{font-size:118px;font-weight:900;color:#fff;text-shadow:0 8px 50px rgba(120,90,255,.6);animation:slam .5s .1s both}
.btn{margin-top:46px;font-size:56px;font-weight:900;color:#5b3df0;background:#fff;padding:32px 78px;border-radius:999px;box-shadow:0 16px 50px rgba(255,255,255,.25);animation:pulse 1.1s .6s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.url{font-size:42px;color:#c3b2ff;margin-top:34px;animation:up .5s .9s both}
@keyframes up{0%{transform:translateY(50px);opacity:0}100%{transform:translateY(0);opacity:1}}
</style></head><body>
<div class="aurora"><b class="b1"></b><b class="b2"></b><b class="b3"></b></div>${particles}
<div class="stage s1"><div class="hook">Can you pass<br>this quiz? 🇯🇵</div><div class="hsub">${e.level} · comment your answer 👇</div></div>
<div class="stage s2">
  <span class="qlabel">JLPT ${e.level}</span>
  <div class="q">${e.q}</div>
  ${options(false)}
  <div class="count c3">3</div><div class="count c2">2</div><div class="count c1">1</div>
  <div class="cta-comment">Comment A or B 👇</div>
</div>
<div class="stage s3"><span class="qlabel">Answer</span><div class="q">${e.q}</div>${options(true)}</div>
<div class="stage s4"><div class="why">${e.why}</div><div class="logo">NihonGo 🍣</div><div class="btn">Learn free →</div><div class="url">nihongo.amorjp.com</div></div>
</body></html>`;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });
const sceneFile = path.join(REC, 'q.html');
await writeFile(sceneFile, html);

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  recordVideo: { dir: REC, size: { width: W, height: H } },
});
const page = await ctx.newPage();
await page.goto('file://' + sceneFile);
await page.waitForTimeout(DUR * 1000);
await ctx.close();
await browser.close();

const webm = (await readdir(REC)).find((f) => f.endsWith('.webm'));
const outFile = path.join(OUT, `NihonGo_quiz_${idx}.mp4`);
await run('ffmpeg', ['-y', '-i', path.join(REC, webm),
  '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-vf', `scale=${W}:${H},fps=30`, '-movflags', '+faststart', outFile]);
await rm(REC, { recursive: true, force: true });

const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
console.log(`\n✅ ${outFile}\n   ${Number(stdout.trim()).toFixed(1)}s · quiz #${idx}`);
