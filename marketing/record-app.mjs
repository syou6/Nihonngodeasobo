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

  // 4) EDIT it like a TikTok: timed captions that narrate the footage (hook →
  // tension → honest-score punchline), a slow push-in zoom for life, a punch-zoom
  // on the score reveal, BGM + a CTA pill at the end. Recording timeline (from the
  // script above): word card ~0-1.8s, recording ~1.8-4.1s, result/score ~4.3s+.
  const music = path.join(MK, 'audio', 'music_130.mp3');
  const hasMusic = existsSync(music);
  const outFile = path.join(OUT, `NihonGo_real_${word}.mp4`);

  // captions: [start, end, text, color]
  const caption = (t0, t1, text, color = 'white', y = 120, size = 60) => {
    const safe = text.replace(/'/g, '’').replace(/:/g, '\\:');
    return `drawtext=text='${safe}':fontcolor=${color}:fontsize=${size}:font='Helvetica':x=(w-text_w)/2:y=${y}:` +
      `box=1:boxcolor=black@0.62:boxborderw=22:line_spacing=14:enable='between(t,${t0},${t1})'`;
  };

  const vf = [
    `scale=1188:2112:flags=lanczos`, // 1.1x oversize for a push-in headroom
    // slow Ken Burns push-in across the whole clip + a stronger punch on the score reveal (4.3-6s)
    `zoompan=z='if(between(in_time,4.3,6.0), min(1.04+(in_time-4.3)*0.06,1.16), min(1.03+in_time*0.004,1.10))':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`,
    caption(0, 1.9, 'You think you sound native.', 'white', 150, 54),
    caption(1.9, 4.2, 'So you test your pitch...', 'white', 150, 54),
    caption(4.3, 9.5, 'It scores you HONESTLY.', '#FDBA74', 150, 60),
    caption(6.2, 9.5, 'Most apps just say you are perfect.', 'white', 232, 40),
    // CTA pill only at the end
    `drawtext=text='Score your pitch FREE  ·  nihongo.amorjp.com':fontcolor=white:fontsize=38:font='Helvetica':x=(w-text_w)/2:y=h-130:box=1:boxcolor=0x4F46E5@0.96:boxborderw=24:enable='between(t,5.5,9.5)'`,
    `fade=t=in:st=0:d=0.4`,
  ].join(',');

  if (hasMusic) {
    await run('ffmpeg', ['-y', '-i', webm, '-i', music,
      '-filter_complex', `[0:v]${vf}[v];[1:a]volume=0.22,afade=t=in:st=0:d=0.6,afade=t=out:st=8.4:d=1.1[a]`,
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
