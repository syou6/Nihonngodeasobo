// PREMIUM marketing video generator: real Japan b-roll background + animated
// lesson overlay (motion graphics) + cinematic color grade + music bed + SFX.
//   node marketing/generate-premium.mjs --index 8
// Output: marketing/out-premium/NihonGo_pro_<slug>.mp4 (1080x1920, ~13s, WITH audio).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-premium');
const REC = path.join(MK, '.recp');
const STOCK = path.join(MK, 'stock');
const AUDIO = path.join(MK, 'audio');
const PHONE = path.join(MK, 'howto', 'shots', 'record.png');
const W = 1080, H = 1920, DUR = 12.9;

const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const bank = JSON.parse(await readFile(path.join(MK, 'content-bank.json'), 'utf8')).entries;
const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const idx = (idxArg != null ? idxArg : doy) % bank.length;
const e = bank[idx];
const slug = e.type === 'pitch' ? `${e.a.word}_${e.b.word}` : e.wrong.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 8);

// rotate b-roll + music deterministically by index
const clips = (await readdir(STOCK)).filter((f) => f.endsWith('.mp4'));
const music = (await readdir(AUDIO)).filter((f) => f.startsWith('music_'));
const clip = path.join(STOCK, clips[idx % clips.length]);
const track = path.join(AUDIO, music[idx % music.length]);
const sfxPop = path.join(AUDIO, 'sfx_2568.wav');
const sfxWhoosh = path.join(AUDIO, 'sfx_2003.wav');

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
    <div class="wrong">❌ ${e.wrong}</div><div class="arrow">↓</div><div class="right">✅ ${e.right}</div>
    <div class="why" style="--d:2.2s">${e.why}</div>`;
}
const hookHtml = e.type === 'pitch'
  ? `<div class="hook">${e.a.word} or ${e.b.word}?<br>You're saying it WRONG 🇯🇵</div><div class="sub">…and no app told you why</div>`
  : `<div class="hook">${e.hook} 🇯🇵</div><div class="sub">…the mistake 90% of learners make</div>`;

const phone = existsSync(PHONE) ? `data:image/png;base64,${(await readFile(PHONE)).toString('base64')}` : '';
const VID = 'file://' + clip;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Hiragino Sans','Helvetica Neue',Arial,sans-serif}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000}
video{position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover;z-index:0}
.scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(8,10,22,.5),rgba(8,10,22,.55) 40%,rgba(8,10,22,.85))}
.grain{position:absolute;inset:0;z-index:1;opacity:.05;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:5px 5px}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;z-index:3;padding:0 56px}
.s1{animation:vis1 2.8s 0s both}.s2{animation:vis 3.9s 2.8s both}.s3{animation:vis 3.0s 6.7s both}.s4{animation:vis 3.0s 9.8s both}
@keyframes vis1{0%,88%{opacity:1}100%{opacity:0}}
@keyframes vis{0%{opacity:0;transform:translateY(60px) scale(.94)}7%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-40px) scale(.97)}}
.hook{font-size:104px;font-weight:900;color:#fff;line-height:1.08;padding:0 30px;text-shadow:0 6px 50px rgba(0,0,0,.85),0 2px 18px rgba(0,0,0,.95);animation:slam .22s cubic-bezier(.2,1.5,.4,1) both}
@keyframes slam{0%{transform:scale(1.14)}55%{transform:scale(.97)}100%{transform:scale(1)}}
.sub{font-size:46px;color:#dcd0ff;margin-top:32px;text-shadow:0 2px 16px rgba(0,0,0,.95);animation:up .5s .55s both}
.badge{font-size:40px;font-weight:800;color:#fff;background:rgba(124,75,255,.95);padding:16px 38px;border-radius:999px;box-shadow:0 10px 40px rgba(0,0,0,.6);animation:up .5s .2s both}
.wrong{font-size:106px;font-weight:900;color:#ff6b86;margin:48px 0 6px;text-shadow:0 4px 30px rgba(0,0,0,.95),0 0 50px rgba(255,80,110,.5);animation:shake .55s .55s both}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-18px)}40%{transform:translateX(18px)}60%{transform:translateX(-11px)}80%{transform:translateX(11px)}}
.arrow{font-size:62px;color:#fff;opacity:.8;animation:up .5s 1.2s both}
.right{font-size:116px;font-weight:900;color:#34f5ad;margin-top:6px;text-shadow:0 4px 30px rgba(0,0,0,.95),0 0 60px rgba(52,245,173,.6);animation:kpop .6s 1.7s cubic-bezier(.2,1.6,.4,1) both}
@keyframes kpop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}
.why{font-size:42px;color:#fff;margin-top:44px;padding:0 60px;line-height:1.45;text-shadow:0 2px 20px rgba(0,0,0,.98);animation:up .55s var(--d,2s) both}
.why b{color:#9affd9}
.pair{display:flex;gap:44px;margin:28px 0}
.card{background:rgba(15,20,40,.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:38px;padding:44px 36px;width:380px;box-shadow:0 30px 80px rgba(0,0,0,.6);animation:up .6s var(--d,.5s) cubic-bezier(.2,1.3,.4,1) both}
.kanji{font-size:132px;font-weight:900;color:#fff;line-height:1;text-shadow:0 2px 20px rgba(0,0,0,.8)}
.mean{font-size:36px;color:#bcd;margin:6px 0 18px}
.draw polyline{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .7s var(--d,1s) ease both}
@keyframes draw{to{stroke-dashoffset:0}}
.t3{font-size:84px;font-weight:900;color:#fff;line-height:1.15;text-shadow:0 4px 40px rgba(0,0,0,.9);animation:kpop .6s .2s cubic-bezier(.2,1.6,.4,1) both}
.phone{margin-top:42px;width:480px;border-radius:34px;box-shadow:0 36px 110px rgba(0,0,0,.85);animation:up .8s .55s both}
.logo{font-size:120px;font-weight:900;color:#fff;text-shadow:0 8px 60px rgba(0,0,0,.9);animation:kpop .7s .2s cubic-bezier(.2,1.6,.4,1) both}
.btn{margin-top:46px;font-size:58px;font-weight:900;color:#5b3df0;background:#fff;padding:34px 80px;border-radius:999px;box-shadow:0 16px 60px rgba(0,0,0,.5);animation:pulse 1.1s .7s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.url{font-size:42px;color:#fff;margin-top:36px;text-shadow:0 2px 16px rgba(0,0,0,.95);animation:up .55s 1s both}
@keyframes up{0%{transform:translateY(60px);opacity:0}100%{transform:translateY(0);opacity:1}}
</style></head><body>
<video autoplay muted loop src="${VID}"></video><div class="scrim"></div><div class="grain"></div>
<div class="stage s1">${hookHtml}</div>
<div class="stage s2">${lesson()}</div>
<div class="stage s3"><div class="t3">NihonGo fixes it<br>instantly ✨</div><img class="phone" src="${phone}"></div>
<div class="stage s4"><div class="logo">NihonGo 🍣</div><div class="btn">Try Free →</div><div class="url">nihongo.amorjp.com</div></div>
</body></html>`;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });
const sceneFile = path.join(REC, 'p.html');
await writeFile(sceneFile, html);

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  recordVideo: { dir: REC, size: { width: W, height: H } },
});
const page = await ctx.newPage();
await page.goto('file://' + sceneFile);
await page.waitForTimeout(600);
await page.waitForTimeout(DUR * 1000);
await ctx.close();
await browser.close();

const webm = (await readdir(REC)).find((f) => f.endsWith('.webm'));
const silent = path.join(REC, 'silent.mp4');
await run('ffmpeg', ['-y', '-i', path.join(REC, webm),
  '-c:v', 'libx264', '-crf', '19', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-vf', `scale=${W}:${H},fps=30`, '-t', '13', silent]);

const outFile = path.join(OUT, `NihonGo_pro_${slug}.mp4`);
// color grade + audio mix (music bed faded + whoosh on cuts + pop on reveal)
await run('ffmpeg', ['-y', '-i', silent, '-i', track, '-i', sfxPop, '-i', sfxWhoosh,
  '-filter_complex',
  `[0:v]eq=contrast=1.08:saturation=1.18:brightness=0.01,vignette=PI/5[v];` +
  `[1:a]volume=0.20,atrim=0:14,afade=t=in:st=0:d=1,afade=t=out:st=12:d=1.5[m];` +
  `[2:a]adelay=4520|4520,volume=1.2[pop];` +
  `[3:a]asplit=3[w1][w2][w3];` +
  `[w1]adelay=2780|2780,volume=0.4[wa];[w2]adelay=6680|6680,volume=0.4[wb];[w3]adelay=9780|9780,volume=0.4[wc];` +
  `[m][pop][wa][wb][wc]amix=inputs=5:duration=longest:normalize=0[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', '13', outFile]);
await rm(REC, { recursive: true, force: true });

const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
console.log(`\n✅ ${outFile}\n   ${Number(stdout.trim()).toFixed(1)}s · real footage + grade + music + sfx`);
