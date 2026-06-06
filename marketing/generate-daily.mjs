// NihonGo daily short-form video generator.
// Usage:
//   node marketing/generate-daily.mjs            # picks today's entry (rotates by date)
//   node marketing/generate-daily.mjs --index 2  # force a specific entry
// Output: marketing/out/NihonGo_<date>_<slug>.mp4  (1080x1920, ~30s, silent)
//
// Requires: playwright (installed) + ffmpeg on PATH.

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MK = path.join(ROOT, 'marketing');
const TMP = path.join(MK, '.work');
const OUT = path.join(MK, 'out');
const APP_SHOT = path.join(MK, 'assets', 'g_record.png');

const W = 1080, H = 1920;

// ---------- pick entry ----------
const args = process.argv.slice(2);
const idxArg = args.includes('--index') ? Number(args[args.indexOf('--index') + 1]) : null;
const bank = JSON.parse(await readFile(path.join(MK, 'content-bank.json'), 'utf8')).entries;
const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const idx = idxArg != null ? idxArg % bank.length : dayOfYear % bank.length;
const e = bank[idx];
const dateStr = new Date().toISOString().slice(0, 10);
const slug = e.type === 'pitch' ? `${e.a.word}_${e.b.word}` : e.wrong.slice(0, 6);
console.log(`Entry #${idx} [${e.type}] -> ${slug}`);

// ---------- card templates ----------
const base = `*{margin:0;box-sizing:border-box;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif}
body{width:${W}px;height:${H}px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px}`;

const pitchLine = (hl, color) => hl === 'HL'
  ? `<svg width="300" height="120"><polyline points="20,20 150,20 150,100 280,100" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/><circle cx="20" cy="20" r="12" fill="${color}"/><circle cx="150" cy="20" r="12" fill="${color}"/><circle cx="150" cy="100" r="12" fill="${color}"/></svg>`
  : `<svg width="300" height="120"><polyline points="20,100 150,100 150,20 280,20" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/><circle cx="20" cy="100" r="12" fill="${color}"/><circle cx="150" cy="100" r="12" fill="${color}"/><circle cx="150" cy="20" r="12" fill="${color}"/></svg>`;

function cards() {
  const hookText = e.type === 'pitch'
    ? `<div style="font-size:280px;font-weight:800;color:#fff;line-height:1">${e.a.word}</div><div style="font-size:74px;font-weight:800;color:#fff;margin-top:30px;line-height:1.15">You're saying<br>this WRONG</div><div style="font-size:44px;color:#c7d2fe;margin-top:30px">…and no app told you why</div>`
    : `<div style="font-size:70px;font-weight:800;color:#fff;line-height:1.25">${e.hook}</div><div style="font-size:46px;color:#c7d2fe;margin-top:40px">Most apps never catch this.</div>`;

  const c = {};
  c.hook = `<style>${base} body{background:linear-gradient(160deg,#1e1b4b,#4f46e5)}</style>${hookText}`;

  if (e.type === 'pitch') {
    c.concept = `<style>${base} body{background:#0f172a;gap:36px}
      .head{font-size:64px;font-weight:800;color:#fff}.read{font-size:90px;color:#fbbf24;font-weight:800;margin:16px 0 40px;letter-spacing:14px}
      .row{display:flex;gap:50px}.c{background:#1e293b;border-radius:40px;padding:56px 46px;width:400px}
      .k{font-size:150px;font-weight:800;color:#fff}.m{font-size:42px;color:#94a3b8;margin-top:8px}
      .foot{font-size:48px;color:#e2e8f0;margin-top:46px;font-weight:700}</style>
      <div class="head">Same sound.</div><div class="read">${e.reading}</div>
      <div class="row">
        <div class="c"><div class="k">${e.a.word}</div><div class="m">${e.a.en}</div>${pitchLine(e.a.hl, '#10b981')}</div>
        <div class="c"><div class="k">${e.b.word}</div><div class="m">${e.b.en}</div>${pitchLine(e.b.hl, '#f43f5e')}</div>
      </div>
      <div class="foot">Different PITCH = different word.</div>`;

    c.result = `<style>${base} body{background:#ecfdf5;justify-content:flex-start;padding-top:170px}
      .cap{font-size:58px;font-weight:800;color:#065f46;margin-bottom:50px}
      .card{background:#fff;border-radius:40px;padding:70px;width:100%;box-shadow:0 30px 80px rgba(16,185,129,.25)}
      .word{font-size:78px;font-weight:800;color:#111827;margin-bottom:18px}
      .sc{font-size:170px;font-weight:800;color:#10b981}.lbl{font-size:44px;color:#6b7280;margin-bottom:46px}</style>
      <div class="cap">Speak it. Get scored. 🎤</div>
      <div class="card"><div class="word">${e.a.word} — ${e.reading}</div><div class="sc">94</div><div class="lbl">Pitch accuracy /100</div>
      <svg width="700" height="170"><rect x="0" y="0" width="350" height="80" fill="#10b981" opacity="0.15"/><rect x="350" y="90" width="350" height="80" fill="#9ca3af" opacity="0.15"/><polyline points="40,50 330,40 360,140 660,130" fill="none" stroke="#3b82f6" stroke-width="9" stroke-linecap="round"/></svg></div>`;
  } else {
    c.concept = `<style>${base} body{background:#0f172a}
      .lvl{font-size:40px;font-weight:800;color:#fff;background:#4f46e5;padding:14px 34px;border-radius:999px}
      .x{font-size:96px;font-weight:800;color:#f43f5e;margin:60px 0 10px}.xl{font-size:40px;color:#94a3b8}
      .arrow{font-size:60px;color:#64748b;margin:30px 0}
      .v{font-size:96px;font-weight:800;color:#10b981}</style>
      <div class="lvl">JLPT ${e.level}</div>
      <div class="x">❌ ${e.wrong}</div><div class="arrow">↓</div><div class="v">✅ ${e.right}</div>`;

    c.result = `<style>${base} body{background:#eef2ff;justify-content:flex-start;padding-top:150px}
      .cap{font-size:56px;font-weight:800;color:#1e293b;margin-bottom:44px}
      .card{background:#fff;border-radius:40px;padding:64px;width:100%;box-shadow:0 30px 80px rgba(79,70,229,.2);text-align:left}
      .badge{display:inline-block;background:#4f46e5;color:#fff;font-size:40px;font-weight:800;padding:14px 32px;border-radius:999px}
      .h{font-size:46px;font-weight:800;color:#111827;margin:40px 0 22px}
      .l{font-size:44px;margin:14px 0;color:#374151}.x{color:#ef4444;font-weight:700}.v{color:#10b981;font-weight:700}
      .why{font-size:38px;color:#6b7280;margin-top:30px;line-height:1.4}</style>
      <div class="cap">The AI explains why 👇</div>
      <div class="card"><span class="badge">AI Feedback · ${e.level}</span>
      <div class="h">Correction</div>
      <div class="l"><span class="x">❌ ${e.wrong}</span> → <span class="v">✅ ${e.right}</span></div>
      <div class="why">${e.why}</div></div>`;
  }

  c.features = `<style>${base} body{background:linear-gradient(160deg,#10b981,#0891b2)}
    .t{font-size:92px;font-weight:800;color:#fff;line-height:1.25}.s{font-size:52px;color:#d1fae5;margin-top:46px;font-weight:700}</style>
    <div class="t">Pronunciation.<br>Grammar.<br>JLPT speaking.</div><div class="s">All in one app.</div>`;

  c.cta = `<style>${base} body{background:linear-gradient(160deg,#1e1b4b,#4f46e5)}
    .logo{font-size:124px;font-weight:800;color:#fff}.s{font-size:56px;color:#c7d2fe;margin-top:20px}
    .btn{margin-top:70px;background:#fff;color:#4f46e5;font-size:58px;font-weight:800;padding:36px 86px;border-radius:999px}
    .u{font-size:44px;color:#a5b4fc;margin-top:46px}</style>
    <div class="logo">NihonGo 🍣</div><div class="s">Learn Japanese, every day.</div>
    <div class="btn">Try Free →</div><div class="u">nihongo.amorjp.com</div>`;
  return c;
}

// ---------- render ----------
await mkdir(TMP, { recursive: true });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// Capture the live app once (cached under marketing/assets).
if (!existsSync(APP_SHOT)) {
  await mkdir(path.dirname(APP_SHOT), { recursive: true });
  try {
    await page.goto('https://nihongo.amorjp.com/app.html?guest=true', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    try { await page.getByText('Skip', { exact: false }).first().click({ timeout: 4000 }); } catch {}
    await page.waitForTimeout(1200);
    try { await page.getByText('Record', { exact: false }).first().click({ timeout: 4000 }); } catch {}
    await page.waitForTimeout(1500);
    await page.screenshot({ path: APP_SHOT });
    console.log('captured live app screen');
  } catch (err) {
    console.log('app capture failed, will skip demo shot:', err.message);
  }
}

const c = cards();
const order = ['hook', 'concept', 'result', 'features', 'cta'];
const shotPaths = {};
for (const key of order) {
  await page.setContent(`<!doctype html><html><body>${c[key]}</body></html>`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  const p = path.join(TMP, `${key}.png`);
  await page.screenshot({ path: p });
  shotPaths[key] = p;
}
await browser.close();

// ---------- compose ----------
async function seg(img, dur, out, caption) {
  const draw = caption
    ? `,drawbox=x=0:y=ih-340:w=iw:h=340:color=black@0.55:t=fill,drawtext=text='${caption}':fontcolor=white:fontsize=62:x=(w-text_w)/2:y=h-235`
    : '';
  await run('ffmpeg', ['-y', '-loop', '1', '-t', String(dur), '-i', img,
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}${draw},format=yuv420p,setsar=1`,
    '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', out]);
}

// timeline: hook, concept, demo(app), result, features, cta
const timeline = [
  [shotPaths.hook, 3.5, null],
  [shotPaths.concept, 5.0, null],
  ...(existsSync(APP_SHOT) ? [[APP_SHOT, 4.0, 'Just speak — in Japanese']] : []),
  [shotPaths.result, 4.5, null],
  [shotPaths.features, 3.0, null],
  [shotPaths.cta, 4.5, null],
];

const segFiles = [];
for (let i = 0; i < timeline.length; i++) {
  const f = path.join(TMP, `seg${i}.mp4`);
  await seg(timeline[i][0], timeline[i][1], f, timeline[i][2]);
  segFiles.push(f);
}

const listFile = path.join(TMP, 'concat.txt');
await writeFile(listFile, segFiles.map((f) => `file '${f}'`).join('\n'));
const outFile = path.join(OUT, `NihonGo_${dateStr}_${slug}.mp4`);
await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outFile]);

await rm(TMP, { recursive: true, force: true });
const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
console.log(`\n✅ ${outFile}\n   ${Number(stdout.trim()).toFixed(1)}s · ${W}x${H}`);
