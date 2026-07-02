// COMMENT-DRIVEN minimal-pair quiz short — fixes the TikTok leak.
// Diagnosis (28d data): 6,898 views but 0.3% profile-rate, 0 comments, link ignored.
// Root cause: videos resolve the answer in-frame → no reason to leave TikTok.
// This format: frame-1 hook → quiz → LOCK answer in COMMENTS before reveal →
//   reveal (watch-time) → open-loop "what's YOUR score?" to profile.
//   node marketing/generate-quiz-pair.mjs
// Output: marketing/out-quiz-pair/NihonGo_quiz_<pair>.mp4 (1080x1920, ~13s, BGM + both reads).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-quiz-pair');
const REC = path.join(MK, '.recquiz');
const W = 1080, H = 1920, DUR = 13.0;

// The pair. answer = the audio that plays during the quiz (A).
// Contours are DICTIONARY-CORRECT (honest scoring is the brand):
//   箸 chopsticks = 頭高 [HIGH, LOW]   橋 bridge = 尾高 [LOW, HIGH]
const PAIR = {
  kana: 'はし',
  morae: ['は', 'し'],
  a: { word: '箸', en: 'chopsticks', emoji: '🥢', pat: [1, 0] }, // plays in quiz
  b: { word: '橋', en: 'bridge', emoji: '🌉', pat: [0, 1] },
};

// SVG pitch contour for a 2+ mora pattern. flat=false (we always show true pitch).
function contour(morae, pat, color) {
  const w = 420, h = 200, pad = 56;
  const xs = pat.map((_, i) => pad + (i / Math.max(1, pat.length - 1)) * (w - 2 * pad));
  const ys = pat.map((v) => (v ? h * 0.26 : h * 0.70));
  const pts = xs.map((x, i) => `${x.toFixed(0)},${ys[i].toFixed(0)}`);
  const dots = xs.map((x, i) => `<circle cx="${x.toFixed(0)}" cy="${ys[i].toFixed(0)}" r="13" fill="${color}"/>`).join('');
  const labels = morae.map((m, i) => `<text x="${xs[i].toFixed(0)}" y="${h - 8}" fill="rgba(255,255,255,.7)" font-size="40" font-family="'Hiragino Sans',sans-serif" text-anchor="middle">${m}</text>`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${labels}</svg>`;
}

const ringDash = Math.PI * 2 * 130;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#4338CA 0%,#5B21B6 55%,#3B0764 100%)}
.glow{position:absolute;border-radius:50%;filter:blur(120px);z-index:0}
.g1{width:760px;height:760px;background:rgba(255,122,89,.30);right:-120px;top:60px}
.g2{width:720px;height:720px;background:rgba(99,102,241,.45);left:-160px;bottom:80px}
.jp{font-family:'Hiragino Sans','Yu Gothic',sans-serif}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;z-index:2;opacity:0}
/* seg(dur,delay) */
.s1{animation:seg 2.8s 0s both}
.s2{animation:seg 4.0s 2.8s both}
.s3{animation:seg 2.2s 6.8s both}
.s4{animation:seg 4.0s 9.0s both}
@keyframes seg{0%{opacity:0;transform:translateY(40px) scale(.97)}7%{opacity:1;transform:none}93%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-26px) scale(.98)}}

/* s1 hook */
.kicker{font-size:46px;font-weight:800;letter-spacing:.04em;color:#FDBA74;margin-bottom:30px}
.kana{font-size:280px;font-weight:800;line-height:1}
.same{margin-top:18px;font-size:44px;font-weight:700;color:rgba(255,255,255,.8)}
.twomean{margin-top:46px;display:flex;gap:34px;font-size:50px;font-weight:800}
.twomean span{background:rgba(255,255,255,.12);padding:20px 34px;border-radius:24px}

/* s2 quiz */
.q{font-size:60px;font-weight:800;margin-bottom:14px}
.qsub{font-size:42px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:40px}
.cards{display:flex;gap:34px;margin-bottom:40px}
.card{background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.25);border-radius:32px;padding:40px 50px;min-width:280px}
.card .lab{font-size:48px;font-weight:800;color:#FDBA74;margin-bottom:14px}
.card .w{font-size:130px;font-weight:800;line-height:1}
.card .m{font-size:40px;color:rgba(255,255,255,.7);margin-top:10px}
.ringwrap{position:relative;width:300px;height:300px}
.ringnum{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:150px;font-weight:800}
.ringnum .c3{animation:tick 1s 3.2s both}
.ringnum .c2{animation:tick 1s 4.2s both}
.ringnum .c1{animation:tick 1s 5.2s both}
@keyframes tick{0%{opacity:0;transform:scale(.6)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(1.3)}}
.arc{stroke-dasharray:${ringDash.toFixed(0)};stroke-dashoffset:0;animation:arc 3s 3.2s linear forwards}
@keyframes arc{to{stroke-dashoffset:${ringDash.toFixed(0)}}}

/* s3 comment lock */
.lock{font-size:96px;font-weight:800;line-height:1.1}
.lock .hi{color:#FDBA74}
.locksub{margin-top:34px;font-size:52px;font-weight:800;color:#fff;background:rgba(52,211,153,.22);border:3px solid rgba(52,211,153,.6);padding:24px 50px;border-radius:999px}
.lockno{margin-top:30px;font-size:44px;font-weight:700;color:rgba(255,255,255,.75)}

/* s4 reveal + CTA */
.rev{font-size:62px;font-weight:800;margin-bottom:30px}
.rev .good{color:#34D399}
.pair{display:flex;gap:50px;margin-bottom:36px}
.pbox{background:rgba(255,255,255,.10);border-radius:28px;padding:30px 30px 16px}
.pbox.win{border:3px solid #34D399}
.pbox .pw{font-size:80px;font-weight:800;line-height:1}
.pbox .pm{font-size:34px;color:rgba(255,255,255,.65);margin-bottom:8px}
.cta{margin-top:10px;font-size:54px;font-weight:800;color:#fff}
.cta .y{color:#FDBA74}
.btn{margin-top:34px;font-size:54px;font-weight:800;color:#4f46e5;background:#fff;padding:30px 70px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3);animation:pulse 1.2s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.url{margin-top:24px;font-size:40px;color:rgba(255,255,255,.78);font-weight:700}
</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>

<!-- s1: frame-1 hook -->
<div class="stage s1">
  <div class="kicker">95% OF LEARNERS GET THIS WRONG</div>
  <div class="kana jp">${PAIR.kana}</div>
  <div class="same">same sound — but it means TWO things 👇</div>
  <div class="twomean"><span>${PAIR.a.emoji} ${PAIR.a.en}</span><span>${PAIR.b.emoji} ${PAIR.b.en}</span></div>
</div>

<!-- s2: quiz + countdown -->
<div class="stage s2">
  <div class="q">Listen 👂 which one is this?</div>
  <div class="qsub">the PITCH is the only clue</div>
  <div class="cards">
    <div class="card"><div class="lab">A</div><div class="w jp">${PAIR.a.word}</div><div class="m">${PAIR.a.emoji} ${PAIR.a.en}</div></div>
    <div class="card"><div class="lab">B</div><div class="w jp">${PAIR.b.word}</div><div class="m">${PAIR.b.emoji} ${PAIR.b.en}</div></div>
  </div>
  <div class="ringwrap">
    <svg width="300" height="300" viewBox="0 0 300 300" style="transform:rotate(-90deg)">
      <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="22"/>
      <circle class="arc" cx="150" cy="150" r="130" fill="none" stroke="#FDBA74" stroke-width="22" stroke-linecap="round"/>
    </svg>
    <div class="ringnum"><span class="c3">3</span><span class="c2" style="position:absolute">2</span><span class="c1" style="position:absolute">1</span></div>
  </div>
</div>

<!-- s3: lock answer in comments BEFORE reveal -->
<div class="stage s3">
  <div class="lock"><span class="hi">A</span> or <span class="hi">B</span> ?</div>
  <div class="locksub">👇 comment your answer NOW</div>
  <div class="lockno">no scrolling till you guess 😤</div>
</div>

<!-- s4: reveal + open-loop CTA -->
<div class="stage s4">
  <div class="rev">It was <span class="good">A · ${PAIR.a.word}</span> ${PAIR.a.emoji}</div>
  <div class="pair">
    <div class="pbox win">
      <div class="pm">A · ${PAIR.a.word} ${PAIR.a.en}</div>
      ${contour(PAIR.morae, PAIR.a.pat, '#34D399')}
    </div>
    <div class="pbox">
      <div class="pm">B · ${PAIR.b.word} ${PAIR.b.en}</div>
      ${contour(PAIR.morae, PAIR.b.pat, '#FB7185')}
    </div>
  </div>
  <div class="cta">Got it right? <span class="y">prove it.</span></div>
  <div class="btn">What's YOUR ear score? →</div>
  <div class="url">nihongo.amorjp.com · free</div>
</div>
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
await page.waitForTimeout(800);
await page.waitForTimeout(DUR * 1000);
await ctx.close();
await browser.close();

const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));
const outFile = path.join(OUT, `NihonGo_quiz_${PAIR.a.word}${PAIR.b.word}.mp4`);

const music = path.join(MK, 'audio', 'music_130.mp3');
const aud = path.join(MK, 'audio', 'words', `${PAIR.a.word}.mp3`); // 箸 plays in quiz
const audB = path.join(MK, 'audio', 'words', `${PAIR.b.word}.mp3`); // 橋 at reveal contrast

const inputs = ['-i', webm];
const filters = [`[0:v]scale=${W}:${H},fps=30[v]`];
const amix = [];
let ai = 1;
if (existsSync(music)) {
  inputs.push('-i', music);
  filters.push(`[${ai}:a]volume=0.14,atrim=0:13.5,afade=t=in:st=0:d=1,afade=t=out:st=12:d=1.3[m]`);
  amix.push('[m]'); ai++;
}
if (existsSync(aud)) {
  inputs.push('-i', aud); // quiz play @3.3s, reveal play @9.4s
  filters.push(`[${ai}:a]asplit=2[qa][ra]`);
  filters.push(`[qa]adelay=3300|3300,volume=1.8[q]`);
  filters.push(`[ra]adelay=9400|9400,volume=1.8[r]`);
  amix.push('[q]', '[r]'); ai++;
}
if (existsSync(audB)) {
  inputs.push('-i', audB); // 橋 contrast @10.7s
  filters.push(`[${ai}:a]adelay=10700|10700,volume=1.8[rb]`);
  amix.push('[rb]'); ai++;
}
filters.push(`${amix.join('')}amix=inputs=${amix.length}:duration=longest:normalize=0[a]`);

await run('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'),
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(DUR), outFile]);

await rm(REC, { recursive: true, force: true });
console.log(`✅ ${outFile}`);
