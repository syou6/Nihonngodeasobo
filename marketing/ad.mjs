// THE ad. A clear, desire-driving story — not a feature demo:
//   HOOK   はし → 🥢箸 or 🌉橋? same sound, the PITCH changes the meaning
//   PAIN   get it wrong = you said the wrong word. and you can't hear your own pitch.
//   PROOF  real app footage: it SHOWS your pitch vs a native, so you can fix it
//   DESIRE Stop sounding foreign. Score your pitch FREE.
//
//   node marketing/ad.mjs            (uses 箸/橋)
// Needs a built ./dist. Output: marketing/out-ad/NihonGo_ad.mp4 (1080x1920, ~13s).

import { chromium } from 'playwright';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT = path.resolve(MK, '..');
const OUT = path.join(MK, 'out-ad');
const REC = path.join(MK, '.recad');
const PORT = 8912;
const W = 1080, H = 1920;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });

// ── Shared brand CSS for the title-card scenes ──────────────────────────────
const baseCSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#4338CA 0%,#5B21B6 55%,#3B0764 100%)}
.glow{position:absolute;border-radius:50%;filter:blur(120px);z-index:0}
.g1{width:760px;height:760px;background:rgba(255,122,89,.30);right:-120px;top:60px}
.g2{width:720px;height:720px;background:rgba(99,102,241,.45);left:-160px;bottom:80px}
.jp{font-family:'Hiragino Sans','Yu Gothic',sans-serif}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;z-index:2}
.fade{opacity:0;animation:fade var(--d,1s) var(--t,0s) both}
@keyframes fade{0%{opacity:0;transform:translateY(34px)}100%{opacity:1;transform:none}}
.pop{opacity:0;animation:pop .6s var(--t,0s) cubic-bezier(.2,1.4,.4,1) both}
@keyframes pop{0%{opacity:0;transform:scale(.5)}100%{opacity:1;transform:scale(1)}}
`;

const head = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>${baseCSS}</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>`;

// SCENE 1 — HOOK + PAIN (≈6.0s)
const hookHTML = `${head}
<div class="c">
  <div class="fade" style="--t:.1s"><span class="jp" style="font-size:240px;font-weight:800">はし</span></div>
  <div class="fade" style="--t:.5s;font-size:46px;color:rgba(255,255,255,.7);margin-top:6px">you say it… but which one?</div>

  <div style="display:flex;gap:34px;margin-top:60px">
    <div class="pop" style="--t:1.4s;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:32px;padding:36px 30px;width:340px">
      <div class="jp" style="font-size:130px;font-weight:800">箸</div>
      <div style="font-size:40px;color:#FDBA74;font-weight:700;margin-top:8px">🥢 chopsticks</div>
      <div style="font-family:monospace;font-size:34px;color:rgba(255,255,255,.6);margin-top:8px">HIGH-low</div>
    </div>
    <div class="pop" style="--t:1.9s;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:32px;padding:36px 30px;width:340px">
      <div class="jp" style="font-size:130px;font-weight:800">橋</div>
      <div style="font-size:40px;color:#34D399;font-weight:700;margin-top:8px">🌉 bridge</div>
      <div style="font-family:monospace;font-size:34px;color:rgba(255,255,255,.6);margin-top:8px">low-HIGH</div>
    </div>
  </div>

  <div class="fade" style="--t:2.8s;--d:.8s;font-size:60px;font-weight:800;margin-top:64px;line-height:1.2">Same sounds.<br><span style="color:#FDBA74">The PITCH</span> changes the meaning.</div>
  <div class="fade" style="--t:4.3s;--d:.8s;font-size:44px;color:rgba(255,255,255,.75);font-weight:700;margin-top:40px">Say it wrong → you said the wrong word 😳</div>
</div>
</body></html>`;

// SCENE 3 — DESIRE / CTA (≈3.2s)
const ctaHTML = `${head}
<div class="c">
  <div class="fade" style="--t:.1s;font-size:34px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.55)">🍣 NihonGo</div>
  <div class="fade" style="--t:.35s;font-size:96px;font-weight:800;line-height:1.05;margin-top:24px">Stop sounding<br>foreign.</div>
  <div class="fade" style="--t:.9s;font-size:46px;color:rgba(255,255,255,.8);margin-top:30px;max-width:760px">See your pitch vs a native — and fix it in seconds.</div>
  <div class="fade" style="--t:1.4s;margin-top:54px;font-size:56px;font-weight:800;color:#4f46e5;background:#fff;padding:34px 80px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3)">Score My Pitch FREE →</div>
  <div class="fade" style="--t:1.8s;margin-top:34px;font-size:42px;font-weight:700;color:rgba(255,255,255,.8)">nihongo.amorjp.com</div>
</div>
</body></html>`;

async function renderScene(html, seconds, name) {
  const file = path.join(REC, `${name}.html`);
  await writeFile(file, html);
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: REC, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  await page.goto('file://' + file);
  await page.waitForTimeout(700);          // fonts
  await page.waitForTimeout(seconds * 1000);
  await ctx.close();
  await browser.close();
  const webm = (await readdir(REC)).filter((f) => f.endsWith('.webm')).map((f) => path.join(REC, f));
  const latest = webm.sort().pop();
  const mp4 = path.join(REC, `${name}.mp4`);
  await run('ffmpeg', ['-y', '-i', latest, '-t', String(seconds), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', mp4]);
  await rm(latest, { force: true });
  return mp4;
}

// ── SCENE 2 — real app footage (the PROOF) ───────────────────────────────────
async function renderApp(word, seconds, name) {
  const mp3 = path.join(ROOT, 'public', 'pitch-audio', `${word}.mp3`);
  const wav = path.join(REC, 'in.wav');
  await run('ffmpeg', ['-y', '-i', mp3, '-ar', '44100', '-ac', '1', wav]);
  const browser = await chromium.launch({ args: [
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required',
    '--force-color-profile=srgb', '--hide-scrollbars',
  ]});
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, permissions: ['microphone'], recordVideo: { dir: REC, size: { width: 540, height: 960 } } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/app.html?guest=true&w=${encodeURIComponent(word)}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.addStyleTag({ content: `[class*="from-yellow-400"]{display:none!important} body{background:#F2F1FA!important}` });
  await page.evaluate(() => { const t = [...document.querySelectorAll('div')].find((d) => /Pitch Trainer/.test(d.textContent || '') && d.className.includes('rounded-full') && d.querySelectorAll('button').length === 2); if (t) t.style.display = 'none'; });
  await page.waitForTimeout(1000);                       // hold on the word card (箸)
  await page.locator('text=/Record & say it/i').first().click();
  await page.waitForTimeout(1500);                       // recording
  const stop = page.locator('text=/Stop/i').first();
  if (await stop.isVisible().catch(() => false)) await stop.click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo({ top: 360, behavior: 'smooth' })); // bring the contour graph (your pitch vs target) into view
  await page.waitForTimeout(seconds * 1000 - 1000 - 1500 - 600); // hold on the result (~2.9s)
  await ctx.close();
  await browser.close();
  const webm = (await readdir(REC)).filter((f) => f.endsWith('.webm')).map((f) => path.join(REC, f)).sort().pop();
  const mp4 = path.join(REC, `${name}.mp4`);
  // scale to 1080x1920 + caption overlay
  const vf = [
    `scale=${W}:${H}:flags=lanczos`,
    `drawbox=x=0:y=0:w=${W}:h=200:color=0x1e1b4b@0.82:t=fill`,
    `drawtext=text='You cant hear your own pitch.':fontcolor=white:fontsize=52:font='Helvetica':x=(w-text_w)/2:y=44:enable='between(t,0,2.2)'`,
    `drawtext=text='So this app SHOWS it.':fontcolor=#FDBA74:fontsize=58:font='Helvetica':x=(w-text_w)/2:y=44:enable='between(t,2.2,10)'`,
  ].join(',');
  await run('ffmpeg', ['-y', '-i', webm, '-t', String(seconds), '-vf', vf + ',fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', mp4]);
  return mp4;
}

// serve the built app
if (!existsSync(path.join(ROOT, 'dist', 'app.html'))) { console.error('Build first: npm run build'); process.exit(1); }
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.join(ROOT, 'dist'), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

try {
  const s1 = await renderScene(hookHTML, 6.0, 's1');
  const s2 = await renderApp('箸', 6.0, 's2');
  const s3 = await renderScene(ctaHTML, 3.2, 's3');

  // concat + BGM
  const list = path.join(REC, 'list.txt');
  await writeFile(list, [s1, s2, s3].map((f) => `file '${f}'`).join('\n'));
  const concat = path.join(REC, 'concat.mp4');
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', concat]);

  const music = path.join(MK, 'audio', 'music_738.mp3');
  const outFile = path.join(OUT, 'NihonGo_ad.mp4');
  if (existsSync(music)) {
    await run('ffmpeg', ['-y', '-i', concat, '-i', music,
      '-filter_complex', '[1:a]volume=0.28,afade=t=in:st=0:d=0.8,afade=t=out:st=14:d=1.2[a]',
      '-map', '0:v', '-map', '[a]', '-t', '15.2', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outFile]);
  } else {
    await run('ffmpeg', ['-y', '-i', concat, '-c', 'copy', outFile]);
  }
  console.log(`✅ ${outFile}`);
} finally {
  server.kill();
  await rm(REC, { recursive: true, force: true });
}
