// High-quality ANIMATED short-form generator (CSS motion graphics recorded via
// Playwright). v2: living aurora background, floating particles, slide/zoom scene
// transitions, word-by-word kinetic hook, glow.
//   node marketing/generate-anim.mjs --index 8
// Output: marketing/out-anim/NihonGo_anim_<slug>.mp4 (1080x1920, ~13s, silent).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-anim');
const REC = path.join(MK, '.rec');
const PHONE = path.join(MK, 'howto', 'shots', 'record.png');
const W = 1080, H = 1920, DUR = 12.8;

const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const bank = JSON.parse(await readFile(path.join(MK, 'content-bank.json'), 'utf8')).entries;
const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const idx = (idxArg != null ? idxArg : doy) % bank.length;
const e = bank[idx];
const slug = e.type === 'pitch' ? `${e.a.word}_${e.b.word}` : e.wrong.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 8);

// word-by-word kinetic hook (each word pops in, staggered, from frame 0)
const kinetic = (text) => text.split(' ').map((w, i) =>
  `<span class="kw" style="--i:${i}">${w}</span>`).join(' ');

const hookText = e.type === 'pitch'
  ? `${e.a.word} or ${e.b.word}? You're saying it WRONG 🇯🇵`
  : `${e.hook} 🇯🇵`;
const hookSub = e.type === 'pitch' ? '…and no app told you why' : '…the mistake 90% of learners make';

function lesson() {
  if (e.type === 'pitch') {
    const line = (hl, color, d) => {
      const pts = hl === 'HL' ? '20,18 95,18 95,82 175,82' : '20,82 95,82 95,18 175,18';
      return `<svg width="200" height="100" class="draw"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" pathLength="1" style="--d:${d}"/></svg>`;
    };
    return `<span class="badge">same sound · ${e.reading}</span>
      <div class="pair">
        <div class="card" style="--d:.5s"><div class="kanji">${e.a.word}</div><div class="mean">${e.a.en}</div>${line(e.a.hl, '#34f5ad', '1.0s')}</div>
        <div class="card" style="--d:.75s"><div class="kanji">${e.b.word}</div><div class="mean">${e.b.en}</div>${line(e.b.hl, '#ff6b86', '1.25s')}</div>
      </div>
      <div class="why" style="--d:1.7s">Different <b>pitch</b> = different word.</div>`;
  }
  return `<span class="badge">JLPT ${e.level}</span>
    <div class="wrong">❌ ${e.wrong}</div>
    <div class="arrow">↓</div>
    <div class="right">✅ ${e.right}</div>
    <div class="why" style="--d:2.2s">${e.why}</div>`;
}

const phone = existsSync(PHONE) ? `data:image/png;base64,${(await readFile(PHONE)).toString('base64')}` : '';
const particles = Array.from({ length: 22 }, (_, i) => {
  const x = (i * 53) % 100, y = (i * 37) % 100, s = 4 + (i % 5) * 3, dur = 7 + (i % 6), del = (i % 7) * 0.6;
  return `<span class="dot" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-duration:${dur}s;animation-delay:-${del}s"></span>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Hiragino Sans','Helvetica Neue',Arial,sans-serif}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#070a16}
/* living aurora background */
.aurora{position:absolute;inset:-20%;filter:blur(60px);opacity:.9;z-index:0}
.aurora b{position:absolute;border-radius:50%;mix-blend-mode:screen;animation:drift 16s ease-in-out infinite}
.b1{width:760px;height:760px;background:#5b3df0;left:5%;top:8%}
.b2{width:680px;height:680px;background:#0e9c7a;right:0%;top:30%;animation-delay:-5s}
.b3{width:620px;height:620px;background:#e0427a;left:18%;bottom:6%;animation-delay:-9s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(120px,-90px) scale(1.15)}66%{transform:translate(-90px,80px) scale(.9)}}
.grain{position:absolute;inset:0;z-index:1;opacity:.05;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:5px 5px}
.dot{position:absolute;background:#fff;border-radius:50%;opacity:.18;z-index:1;animation:float linear infinite}
@keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-40px)}100%{transform:translateY(0)}}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;z-index:2}
/* scene timeline — smooth slide/zoom entrances */
.s1{animation:vis1 2.8s 0s both}
.s2{animation:vis 3.9s 2.8s both}
.s3{animation:vis 3.1s 6.7s both}
.s4{animation:vis 3.0s 9.8s both}
@keyframes vis1{0%,88%{opacity:1}100%{opacity:0}}
@keyframes vis{0%{opacity:0;transform:translateY(60px) scale(.94)}7%{opacity:1;transform:translateY(0) scale(1)}88%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-40px) scale(.97)}}
/* kinetic hook: words pop staggered, visible from frame 0 */
.hook{font-size:104px;font-weight:900;color:#fff;line-height:1.08;padding:0 56px;text-shadow:0 6px 40px rgba(120,90,255,.5)}
.kw{display:inline-block;animation:kpop .45s calc(var(--i)*.05s) cubic-bezier(.2,1.6,.4,1) both}
@keyframes kpop{0%{transform:scale(1.25) translateY(-6px)}60%{transform:scale(.96)}100%{transform:scale(1)}}
.sub{font-size:44px;color:#cdbcff;margin-top:36px;animation:up .5s .6s both}
.badge{font-size:38px;font-weight:800;color:#fff;background:rgba(124,75,255,.9);padding:14px 36px;border-radius:999px;box-shadow:0 10px 30px rgba(124,75,255,.5);animation:up .5s var(--d,.2s) both}
.wrong{font-size:104px;font-weight:900;color:#ff6b86;margin:50px 0 6px;text-shadow:0 0 40px rgba(255,80,110,.45);animation:shake .55s .55s both}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-18px)}40%{transform:translateX(18px)}60%{transform:translateX(-11px)}80%{transform:translateX(11px)}}
.arrow{font-size:62px;color:#8ea;opacity:.7;animation:up .5s 1.2s both}
.right{font-size:114px;font-weight:900;color:#34f5ad;margin-top:6px;text-shadow:0 0 50px rgba(52,245,173,.5);animation:kpop2 .6s 1.7s cubic-bezier(.2,1.6,.4,1) both}
@keyframes kpop2{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}
.why{font-size:40px;color:#aebbd6;margin-top:46px;padding:0 86px;line-height:1.45;animation:up .55s var(--d,2s) both}
.why b{color:#fff}
.pair{display:flex;gap:46px;margin:30px 0}
.card{background:rgba(23,31,58,.82);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.06);border-radius:38px;padding:46px 38px;width:380px;box-shadow:0 24px 70px rgba(0,0,0,.5);animation:up .6s var(--d,.5s) cubic-bezier(.2,1.3,.4,1) both}
.kanji{font-size:132px;font-weight:900;color:#fff;line-height:1}
.mean{font-size:36px;color:#9ab;margin:6px 0 18px}
.draw polyline{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .7s var(--d,1s) ease both}
@keyframes draw{to{stroke-dashoffset:0}}
.t3{font-size:80px;font-weight:900;color:#fff;line-height:1.15;text-shadow:0 0 40px rgba(52,245,173,.4);animation:kpop2 .6s .2s cubic-bezier(.2,1.6,.4,1) both}
.phone{margin-top:44px;width:500px;border-radius:34px;box-shadow:0 36px 100px rgba(0,0,0,.6);animation:up .8s .55s cubic-bezier(.2,1.2,.4,1) both}
.logo{font-size:120px;font-weight:900;color:#fff;text-shadow:0 8px 50px rgba(120,90,255,.6);animation:kpop2 .7s .2s cubic-bezier(.2,1.6,.4,1) both}
.btn{margin-top:48px;font-size:58px;font-weight:900;color:#5b3df0;background:#fff;padding:34px 80px;border-radius:999px;box-shadow:0 16px 50px rgba(255,255,255,.25);animation:pulse 1.1s .7s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.url{font-size:42px;color:#c3b2ff;margin-top:38px;animation:up .55s .9s both}
@keyframes up{0%{transform:translateY(60px);opacity:0}100%{transform:translateY(0);opacity:1}}
</style></head><body>
<div class="aurora"><b class="b1"></b><b class="b2"></b><b class="b3"></b></div>
<div class="grain"></div>${particles}
<div class="stage s1"><div class="hook">${kinetic(hookText)}</div><div class="sub">${hookSub}</div></div>
<div class="stage s2">${lesson()}</div>
<div class="stage s3"><div class="t3">NihonGo fixes it<br>instantly ✨</div><img class="phone" src="${phone}"></div>
<div class="stage s4"><div class="logo">NihonGo 🍣</div><div class="btn">Try Free →</div><div class="url">nihongo.amorjp.com</div></div>
</body></html>`;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });
const sceneFile = path.join(REC, 'scene.html');
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
const outFile = path.join(OUT, `NihonGo_anim_${slug}.mp4`);
await run('ffmpeg', ['-y', '-i', path.join(REC, webm),
  '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-vf', `scale=${W}:${H},fps=30`, '-movflags', '+faststart', outFile]);
await rm(REC, { recursive: true, force: true });

const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
console.log(`\n✅ ${outFile}\n   ${Number(stdout.trim()).toFixed(1)}s · ${W}x${H} · animated v2`);
