// TikTok PHOTO-MODE carousel — minimal-pair pitch quiz as swipeable slides.
// Why: TikTok is currently boosting photo/carousel posts hard (dwell + comments).
// Each slide is SELF-CONTAINED (people land mid-swipe / screenshot any one).
// Slide 2 drives comments BEFORE the reveal — kills the 0-comment problem.
//   node marketing/generate-quiz-slides.mjs
// Output: marketing/out-quiz-slides/NN_*.png (1080x1920) — upload as one photo post.

import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-quiz-slides');
const TMP = path.join(MK, '.recslides');
const W = 1080, H = 1920;

// DICTIONARY-CORRECT pitch (honest scoring = brand): 箸 頭高 [H,L]  橋 尾高 [L,H]
const PAIR = {
  kana: 'はし',
  morae: ['は', 'し'],
  a: { word: '箸', en: 'chopsticks', emoji: '🥢', pat: [1, 0] },
  b: { word: '橋', en: 'bridge', emoji: '🌉', pat: [0, 1] },
};

function contour(morae, pat, color, big = false) {
  const w = big ? 460 : 420, h = big ? 230 : 200, pad = 60;
  const xs = pat.map((_, i) => pad + (i / Math.max(1, pat.length - 1)) * (w - 2 * pad));
  const ys = pat.map((v) => (v ? h * 0.24 : h * 0.72));
  const pts = xs.map((x, i) => `${x.toFixed(0)},${ys[i].toFixed(0)}`);
  const dots = xs.map((x, i) => `<circle cx="${x.toFixed(0)}" cy="${ys[i].toFixed(0)}" r="15" fill="${color}"/>`).join('');
  const labels = morae.map((m, i) => `<text x="${xs[i].toFixed(0)}" y="${h - 6}" fill="rgba(255,255,255,.7)" font-size="44" font-family="'Hiragino Sans',sans-serif" text-anchor="middle">${m}</text>`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${labels}</svg>`;
}

const BASE = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#4338CA 0%,#5B21B6 55%,#3B0764 100%);position:relative}
.glow{position:absolute;border-radius:50%;filter:blur(120px);z-index:0}
.g1{width:760px;height:760px;background:rgba(255,122,89,.30);right:-120px;top:60px}
.g2{width:720px;height:720px;background:rgba(99,102,241,.45);left:-160px;bottom:80px}
.jp{font-family:'Hiragino Sans','Yu Gothic',sans-serif}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;z-index:2}
.swipe{position:absolute;bottom:70px;left:0;right:0;text-align:center;font-size:40px;font-weight:800;color:rgba(255,255,255,.7);z-index:3}
.pageno{position:absolute;top:64px;right:70px;font-size:38px;font-weight:800;color:rgba(255,255,255,.45);z-index:3}
.logo{position:absolute;top:60px;left:70px;font-size:42px;font-weight:800;font-style:italic;color:rgba(255,255,255,.85);z-index:3}
`;

const head = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>${BASE}{{EXTRA}}</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="logo">🍣 NihonGo</div><div class="pageno">{{NO}}</div>`;

const slides = [
  // 1 — hook
  { name: '01_hook', extra: `
    .kicker{font-size:48px;font-weight:800;color:#FDBA74;margin-bottom:30px}
    .kana{font-size:300px;font-weight:800;line-height:1}
    .same{margin-top:24px;font-size:48px;font-weight:700;color:rgba(255,255,255,.82)}
    .tm{margin-top:50px;display:flex;gap:34px;font-size:54px;font-weight:800}
    .tm span{background:rgba(255,255,255,.12);padding:22px 38px;border-radius:26px}`,
    body: `<div class="wrap">
      <div class="kicker">95% OF LEARNERS GET THIS WRONG</div>
      <div class="kana jp">${PAIR.kana}</div>
      <div class="same">one sound — TWO meanings 👇</div>
      <div class="tm"><span>${PAIR.a.emoji} ${PAIR.a.en}</span><span>${PAIR.b.emoji} ${PAIR.b.en}</span></div>
    </div><div class="swipe">swipe → can you tell them apart?</div>` },

  // 2 — quiz + COMMENT driver. Show only the two PITCH SHAPES (kanji hidden = real quiz).
  { name: '02_quiz', extra: `
    .q{font-size:60px;font-weight:800;margin-bottom:10px}
    .qk{font-size:46px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:48px}
    .cards{display:flex;gap:36px;margin-bottom:54px}
    .card{background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.25);border-radius:34px;padding:30px 30px 18px}
    .card .lab{font-size:54px;font-weight:800;color:#FDBA74;margin-bottom:8px}
    .ask{font-size:58px;font-weight:800;background:rgba(52,211,153,.22);border:3px solid rgba(52,211,153,.6);padding:28px 56px;border-radius:999px}
    .askno{margin-top:28px;font-size:44px;font-weight:700;color:rgba(255,255,255,.75)}`,
    body: `<div class="wrap">
      <div class="q">Which pitch means 🥢 ?</div>
      <div class="qk jp">both are「はし」— the shape decides</div>
      <div class="cards">
        <div class="card"><div class="lab">A</div>${contour(PAIR.morae, PAIR.a.pat, '#fff')}</div>
        <div class="card"><div class="lab">B</div>${contour(PAIR.morae, PAIR.b.pat, '#fff')}</div>
      </div>
      <div class="ask">👇 comment A or B NOW</div>
      <div class="askno">guess before you swipe 😤</div>
    </div><div class="swipe">swipe → answer</div>` },

  // 3 — reveal + contours (teaches silently)
  { name: '03_reveal', extra: `
    .rev{font-size:70px;font-weight:800;margin-bottom:44px}
    .rev .good{color:#34D399}
    .pair{display:flex;flex-direction:column;gap:40px;width:100%;max-width:560px}
    .pbox{background:rgba(255,255,255,.10);border-radius:30px;padding:30px 36px 18px;display:flex;flex-direction:column;align-items:center}
    .pbox.win{border:3px solid #34D399}
    .pbox .pm{font-size:42px;font-weight:700;color:rgba(255,255,255,.78);margin-bottom:10px}`,
    body: `<div class="wrap">
      <div class="rev">A · ${PAIR.a.word} ${PAIR.a.emoji} = <span class="good">chopsticks</span></div>
      <div class="pair">
        <div class="pbox win"><div class="pm">🥢 箸 — high → low</div>${contour(PAIR.morae, PAIR.a.pat, '#34D399', true)}</div>
        <div class="pbox"><div class="pm">🌉 橋 — low → high</div>${contour(PAIR.morae, PAIR.b.pat, '#FB7185', true)}</div>
      </div>
    </div><div class="swipe">swipe → train your ear 👂</div>` },

  // 4 — CTA / open loop
  { name: '04_cta', extra: `
    .ct{font-size:78px;font-weight:800;line-height:1.12}
    .ct .y{color:#FDBA74}
    .sub{margin-top:34px;font-size:48px;font-weight:700;color:rgba(255,255,255,.82)}
    .btn{margin-top:64px;font-size:56px;font-weight:800;color:#4f46e5;background:#fff;padding:34px 78px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
    .url{margin-top:30px;font-size:44px;color:rgba(255,255,255,.8);font-weight:700}`,
    body: `<div class="wrap">
      <div class="ct">Got it right?<br><span class="y">prove your ear.</span></div>
      <div class="sub">100+ pairs · real pitch audio · honest score</div>
      <div class="btn">Play free → link in bio</div>
      <div class="url">nihongo.amorjp.com</div>
    </div>` },
];

await mkdir(OUT, { recursive: true });
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (let i = 0; i < slides.length; i++) {
  const s = slides[i];
  const html = head.replace('{{EXTRA}}', s.extra).replace('{{NO}}', `${i + 1}/${slides.length}`) + s.body + '</body></html>';
  const f = path.join(TMP, `${s.name}.html`);
  await writeFile(f, html);
  await page.goto('file://' + f);
  await page.waitForTimeout(700); // webfonts
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
  console.log(`✅ ${s.name}.png`);
}

await ctx.close();
await browser.close();
await rm(TMP, { recursive: true, force: true });
console.log(`\n${slides.length} slides → ${OUT}`);
