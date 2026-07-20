// REAL Ear Sprint footage → marketing video. Plays the actual no-mic perception
// game (taps the correct answer to build a combo) and records it, then frames it
// with a hook caption + BGM. The new viral angle: "can you hear chopsticks vs
// bridge?" — authentic gameplay of the free wedge.
//   node marketing/record-ear.mjs
// Needs a built ./dist. Output: marketing/out-ear/NihonGo_ear.mp4 (1080x1920).

import { chromium } from 'playwright';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT = path.resolve(MK, '..');
const OUT = path.join(MK, 'out-ear');
const REC = path.join(MK, '.recear');
const PORT = 8931;

if (!existsSync(path.join(ROOT, 'dist', 'app.html'))) { console.error('Build first: npm run build'); process.exit(1); }
await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.join(ROOT, 'dist'), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

try {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
    recordVideo: { dir: REC, size: { width: 540, height: 960 } },
  });
  const page = await ctx.newPage();
  // Playwright records VIDEO ONLY — but the pair audio IS the game. Hook every
  // <audio>.play() in-page with a wall-clock stamp, then re-mix the real mp3s
  // at those offsets in ffmpeg so the final cut has the actual game sound.
  const t0 = Date.now();
  await page.addInitScript(() => {
    window.__audioLog = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      window.__audioLog.push({ src: this.currentSrc || this.src || '', at: Date.now() });
      return orig.apply(this, a);
    };
  });
  await page.goto(`http://localhost:${PORT}/app.html?guest=true&view=ear`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.addStyleTag({ content: `[class*="from-yellow-400"]{display:none!important} body{background:#F2F1FA!important}` });
  // hide the guest tab switcher for a clean shot
  await page.evaluate(() => { const t = [...document.querySelectorAll('div')].find((d) => /Pitch Trainer/.test(d.textContent || '') && d.className.includes('rounded-full')); if (t) t.style.display = 'none'; });
  await page.waitForTimeout(1200);
  await page.locator('text=/^Start/').first().click();
  await page.waitForTimeout(900);

  // play ~9 rounds, tapping the correct answer (data-played="1") to build a combo
  for (let r = 0; r < 9; r++) {
    const correct = page.locator('button[data-played="1"]').first();
    if (await correct.isVisible().catch(() => false)) {
      await page.waitForTimeout(700); // let the clip play + a beat of "thinking"
      await correct.click();
      await page.waitForTimeout(700); // see the green + combo
    } else { await page.waitForTimeout(600); }
  }
  await page.waitForTimeout(800);
  const audioLog = await page.evaluate(() => window.__audioLog || []);
  await ctx.close();
  await browser.close();

  const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));
  const outFile = path.join(OUT, 'NihonGo_ear.mp4');
  const music = path.join(MK, 'audio', 'music_526.mp3');
  const hasMusic = existsSync(music);

  // Resolve logged plays to local files + ms offsets from recording start.
  const plays = audioLog
    .map((e) => {
      const m = (e.src || '').match(/\/pair-audio\/([\w-]+\.mp3)/);
      if (!m) return null;
      const f = path.join(ROOT, 'public', 'pair-audio', m[1]);
      const at = Math.max(0, e.at - t0);
      return existsSync(f) ? { f, at } : null;
    })
    .filter(Boolean);
  console.log(`captured ${plays.length} in-game audio plays`);

  const vf = [
    `scale=1080:1920:flags=lanczos`,
    `drawbox=x=0:y=0:w=1080:h=210:color=0x1e1b4b@0.82:t=fill`,
    `drawtext=text='Can you hear chopsticks vs bridge?':fontcolor=white:fontsize=48:font='Helvetica':x=(w-text_w)/2:y=58:enable='between(t,0,3)'`,
    `drawtext=text='Same sounds. The PITCH decides.':fontcolor=#FDBA74:fontsize=50:font='Helvetica':x=(w-text_w)/2:y=58:enable='between(t,3,20)'`,
    `drawtext=text='Train your ear free  ·  nihongo.amorjp.com':fontcolor=white:fontsize=38:font='Helvetica':x=(w-text_w)/2:y=h-120:box=1:boxcolor=0x4F46E5@0.95:boxborderw=24`,
  ].join(',');

  // Mix: BGM (quiet) + every real pair-audio clip at its captured offset.
  const inputs = ['-i', webm];
  const filters = [`[0:v]${vf}[v]`];
  const amix = [];
  let ai = 1;
  if (hasMusic) {
    inputs.push('-i', music);
    filters.push(`[${ai}:a]volume=0.18,afade=t=in:st=0:d=0.6,afade=t=out:st=11:d=1.2[m]`);
    amix.push('[m]'); ai++;
  }
  for (const p of plays) {
    inputs.push('-i', p.f);
    filters.push(`[${ai}:a]adelay=${p.at}|${p.at},volume=1.7[g${ai}]`);
    amix.push(`[g${ai}]`); ai++;
  }
  if (amix.length) {
    filters.push(`${amix.join('')}amix=inputs=${amix.length}:duration=longest:normalize=0[a]`);
    await run('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'),
      '-map', '[v]', '-map', '[a]', '-t', '12.5',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outFile]);
  } else {
    await run('ffmpeg', ['-y', '-i', webm, '-vf', vf, '-t', '12.5', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
  }
  console.log(`✅ ${outFile}`);
} finally {
  server.kill();
  await rm(REC, { recursive: true, force: true });
}
