// High-quality ANIMATED short-form generator (CSS motion graphics recorded via
// Playwright). Higher production value than the static-card generator.
//   node marketing/generate-anim.mjs --index 8
//   node marketing/generate-anim.mjs            # rotates by date
// Output: marketing/out-anim/NihonGo_anim_<slug>.mp4  (1080x1920, ~13s, silent —
// add a trending sound in-app when posting).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MK = path.join(ROOT, 'marketing');
const OUT = path.join(MK, 'out-anim');
const REC = path.join(MK, '.rec');
const PHONE = path.join(MK, 'howto', 'shots', 'record.png');
const W = 1080, H = 1920, DUR = 12.6;

const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const bank = JSON.parse(await readFile(path.join(MK, 'content-bank.json'), 'utf8')).entries;
const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const idx = (idxArg != null ? idxArg : doy) % bank.length;
const e = bank[idx];
const slug = e.type === 'pitch' ? `${e.a.word}_${e.b.word}` : e.wrong.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 8);

// ---- scene 2 (the "lesson") differs by type ----
function lessonScene() {
  if (e.type === 'pitch') {
    const line = (hl, color, id) => {
      const pts = hl === 'HL' ? '20,18 95,18 95,82 175,82' : '20,82 95,82 95,18 175,18';
      return `<svg width="200" height="100" class="draw" style="--d:${id}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" pathLength="1"/></svg>`;
    };
    return `<span class="badge">same sound · ${e.reading}</span>
      <div class="pair">
        <div class="card pop" style="--d:.6s"><div class="kanji">${e.a.word}</div><div class="mean">${e.a.en}</div>${line(e.a.hl, '#28e0a0', '1.1s')}</div>
        <div class="card pop" style="--d:.85s"><div class="kanji">${e.b.word}</div><div class="mean">${e.b.en}</div>${line(e.b.hl, '#ff5470', '1.35s')}</div>
      </div>
      <div class="why up" style="--d:1.8s">Different <b>pitch</b> = different word.</div>`;
  }
  return `<span class="badge">JLPT ${e.level}</span>
    <div class="wrong">❌ ${e.wrong}</div>
    <div class="arrow">↓</div>
    <div class="right">✅ ${e.right}</div>
    <div class="why up" style="--d:2.3s">${e.why}</div>`;
}

const hook = e.type === 'pitch'
  ? `<div class="hook">${e.a.word} or ${e.b.word}?<br>You're saying it WRONG 🇯🇵</div><div class="sub">…and no app told you why</div>`
  : `<div class="hook">${e.hook} 🇯🇵</div><div class="sub">…the mistake 90% of learners make</div>`;

const phone = existsSync(PHONE) ? `data:image/png;base64,${(await readFile(PHONE)).toString('base64')}` : '';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Hiragino Sans','Helvetica Neue',Arial,sans-serif}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0b1020}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0}
/* Scene 1 is fully visible at frame 0 — max impact in the first 0.5s, no fade-in. */
.s1{animation:show1 2.7s 0s both;background:radial-gradient(circle at 50% 35%,#3b2a78,#0b1020)}
.s2{animation:show 3.8s 2.7s both;background:#0b1020}
.s3{animation:show 3.0s 6.5s both;background:radial-gradient(circle at 50% 40%,#0e7a5f,#0b1020)}
.s4{animation:show 3.0s 9.5s both;background:radial-gradient(circle at 50% 45%,#3b2a78,#0b1020)}
@keyframes show1{0%,90%{opacity:1}100%{opacity:0}}
@keyframes show{0%{opacity:0}5%{opacity:1}90%{opacity:1}100%{opacity:0}}
.pop{animation:pop .6s var(--d,.2s) cubic-bezier(.2,1.4,.4,1) both}
@keyframes pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
.up{animation:up .65s var(--d,.2s) cubic-bezier(.2,.9,.3,1) both}
@keyframes up{0%{transform:translateY(70px);opacity:0}100%{transform:translateY(0);opacity:1}}
.draw polyline{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .7s var(--d,1.1s) ease both}
@keyframes draw{to{stroke-dashoffset:0}}
/* Hook is on screen at frame 0 (scale-punch, no opacity fade) for instant impact. */
.hook{font-size:100px;font-weight:900;color:#fff;line-height:1.1;padding:0 60px;animation:slam .22s 0s cubic-bezier(.2,1.5,.4,1) both}
@keyframes slam{0%{transform:scale(1.14)}55%{transform:scale(.97)}100%{transform:scale(1)}}
.sub{font-size:44px;color:#c7b6ff;margin-top:34px;animation:up .5s .55s both}
.badge{font-size:38px;font-weight:800;color:#fff;background:#6d4bff;padding:14px 34px;border-radius:999px;animation:pop .5s .2s both}
.wrong{font-size:100px;font-weight:900;color:#ff5470;margin:50px 0 6px;animation:shake .6s .5s both}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-16px)}40%{transform:translateX(16px)}60%{transform:translateX(-10px)}80%{transform:translateX(10px)}}
.arrow{font-size:60px;color:#7a8aa8;animation:up .5s 1.2s both}
.right{font-size:108px;font-weight:900;color:#28e0a0;margin-top:6px;animation:pop .6s 1.7s cubic-bezier(.2,1.4,.4,1) both}
.why{font-size:40px;color:#9fb0cc;margin-top:46px;padding:0 90px;line-height:1.45}
.why b{color:#fff}
.pair{display:flex;gap:48px;margin:30px 0}
.card{background:#171f3a;border-radius:36px;padding:46px 40px;width:380px}
.kanji{font-size:130px;font-weight:900;color:#fff;line-height:1}
.mean{font-size:36px;color:#8aa;margin:6px 0 18px}
.t3{font-size:78px;font-weight:900;color:#fff;line-height:1.15;animation:pop .6s .2s cubic-bezier(.2,1.4,.4,1) both}
.phone{margin-top:46px;width:500px;border-radius:34px;box-shadow:0 30px 90px rgba(0,0,0,.55);animation:up .8s .6s both}
.logo{font-size:118px;font-weight:900;color:#fff;animation:pop .7s .2s cubic-bezier(.2,1.4,.4,1) both}
.btn{margin-top:46px;font-size:56px;font-weight:900;color:#6d4bff;background:#fff;padding:34px 78px;border-radius:999px;animation:pulse 1.2s .8s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.url{font-size:42px;color:#b9a8ff;margin-top:38px;animation:up .6s 1s both}
</style></head><body>
<div class="stage s1">${hook}</div>
<div class="stage s2">${lessonScene()}</div>
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
  '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-vf', `scale=${W}:${H},fps=30`, '-movflags', '+faststart', outFile]);
await rm(REC, { recursive: true, force: true });

const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
console.log(`\n✅ ${outFile}\n   ${Number(stdout.trim()).toFixed(1)}s · ${W}x${H} · animated`);
