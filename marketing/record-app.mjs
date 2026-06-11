// REAL APP-FOOTAGE marketing video. Feeds a word's audio into the real (built)
// pitch trainer via fake audio capture, records the actual scoring flow (record →
// live contour → score ring), then frames it with a caption hook + BGM.
// Authentic "watch the app score real Japanese pitch" footage — CSS can't fake it.
//
//   node marketing/record-app.mjs --word 水 --reading みず
// Needs: a built ./dist and public/pitch-audio/<word>.mp3.
// Output: marketing/out-real/NihonGo_real_<word>.mp4 (1080x1920).

import { chromium } from 'playwright';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT = path.resolve(MK, '..');
const OUT = path.join(MK, 'out-real');
const REC = path.join(MK, '.recreal');
const PORT = 8911;

const args = process.argv.slice(2);
const word = args.includes('--word') ? args[args.indexOf('--word') + 1] : '水';
const hookText = args.includes('--hook')
  ? args[args.indexOf('--hook') + 1]
  : 'Most apps say you\'re perfect.\nThis one is brutally HONEST.';

const mp3 = path.join(ROOT, 'public', 'pitch-audio', `${word}.mp3`);
if (!existsSync(mp3)) { console.error(`No audio: ${mp3}`); process.exit(1); }
if (!existsSync(path.join(ROOT, 'dist', 'app.html'))) { console.error('Build first: npm run build'); process.exit(1); }

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });

// 1) word audio → wav for fake mic capture
const wav = path.join(REC, 'in.wav');
await run('ffmpeg', ['-y', '-i', mp3, '-ar', '44100', '-ac', '1', wav]);

// 2) serve the built app
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.join(ROOT, 'dist'), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

try {
  // 3) record the real scoring flow (1080x1920 = viewport 540x960 @2x)
  const browser = await chromium.launch({ args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`,
    '--autoplay-policy=no-user-gesture-required',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
  ]});
  // recordVideo doesn't upscale the viewport, so record at the native viewport
  // size (fills the frame cleanly) and let ffmpeg scale 2x → 1080x1920.
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
    permissions: ['microphone'],
    recordVideo: { dir: REC, size: { width: 540, height: 960 } },
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/app.html?guest=true`, { waitUntil: 'networkidle', timeout: 30000 });
  // Clean the chrome for a focused product shot: hide the guest banner + tabs,
  // tint the page background to the brand, center the trainer.
  await page.addStyleTag({ content: `
    .bg-gradient-to-r.from-yellow-400, [class*="from-yellow-400"] { display:none !important; }
    body { background:#F2F1FA !important; }
  `});
  // hide the guest tab switcher (Pitch Trainer / My Karte pills) for a clean shot
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('div')].find((d) => /Pitch Trainer/.test(d.textContent || '') && d.className.includes('rounded-full') && d.querySelectorAll('button').length === 2);
    if (tabs) tabs.style.display = 'none';
  });
  await page.waitForTimeout(1800);                 // hold on the word card
  await page.locator('text=/Record & say it/i').first().click();
  await page.waitForTimeout(2300);                 // audio feeds → live capture
  const stop = page.locator('text=/Stop/i').first();
  if (await stop.isVisible().catch(() => false)) await stop.click();
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: 120, behavior: 'smooth' }));
  await page.waitForTimeout(3000);                 // hold on the result (ring fills)
  await ctx.close();
  await browser.close();

  const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));

  // 4) frame it: caption hook banner (top) + BGM + end url. The webm is already
  // 1080x1920, so no scale/crop — just overlays.
  const music = path.join(MK, 'audio', 'music_130.mp3');
  const hasMusic = existsSync(music);
  const outFile = path.join(OUT, `NihonGo_real_${word}.mp4`);
  const cap = hookText.replace(/'/g, '’').replace(/:/g, '\\:');

  const vf = [
    `scale=1080:1920:flags=lanczos`,
    `drawbox=x=0:y=0:w=1080:h=210:color=0x1e1b4b@0.82:t=fill`,
    `drawtext=text='${cap}':fontcolor=white:fontsize=56:font='Helvetica':x=(w-text_w)/2:y=58:line_spacing=16`,
    `drawtext=text='Score your pitch FREE  ·  nihongo.amorjp.com':fontcolor=white:fontsize=38:font='Helvetica':x=(w-text_w)/2:y=h-120:box=1:boxcolor=0x4F46E5@0.95:boxborderw=24`,
  ].join(',');

  if (hasMusic) {
    await run('ffmpeg', ['-y', '-i', webm, '-i', music,
      '-filter_complex', `[0:v]${vf}[v];[1:a]volume=0.2,afade=t=in:st=0:d=1,afade=t=out:st=8:d=1[a]`,
      '-map', '[v]', '-map', '[a]', '-t', '9.5',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outFile]);
  } else {
    await run('ffmpeg', ['-y', '-i', webm, '-vf', vf, '-t', '9.5',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
  }
  console.log(`✅ ${outFile}`);
} finally {
  server.kill();
  await rm(REC, { recursive: true, force: true });
}
