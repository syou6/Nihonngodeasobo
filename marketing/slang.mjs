// "Talk like a native, not a textbook" — casual reaction words natives actually
// use, with their REAL pitch (accents verified against public/pitch-accents.json,
// so the brand promise of honest pitch stays intact). Listicle format.
//   node marketing/slang.mjs
// Output: marketing/out-slang/NihonGo_slang.mp4 (1080x1920, ~14s).

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-slang');
const REC = path.join(MK, '.recslang');
const W = 1080, H = 1920;

// Real slang natives use. Pitch (p = accent nucleus) is the founder's best call
// (native speaker) — pure slang isn't in the accent dict. VERIFY before posting.
const SETS = {
  daily: {
    intro: ['📚 your textbook won\'t teach you this', 'Japanese SLANG<br>natives really use', '…and how to pitch it right 👇'],
    words: [
      { word: 'やばい',   reading: 'やばい',   p: 0, en: 'insane / amazing / OMG', use: 'この寿司やばい = this sushi is insane' },
      { word: 'まじ',     reading: 'まじ',     p: 1, en: 'seriously / for real?', use: 'まじで？ = are you for real?' },
      { word: 'うざい',   reading: 'うざい',   p: 0, en: 'annoying / so extra', use: 'あいつうざい = that guy is so annoying' },
      { word: 'だるい',   reading: 'だるい',   p: 1, en: 'ugh / cant be bothered', use: '学校だるい = school is such a drag' },
      { word: 'めっちゃ', reading: 'めっちゃ', p: 0, en: 'super / so', use: 'めっちゃ好き = I super like it' },
    ],
  },
  reactions: {
    intro: ['😳 react like a native, not a robot', 'Slang natives SPAM<br>in every chat', '…with the right pitch 👇'],
    words: [
      { word: 'ガチ',   reading: 'がち',   p: 1, en: 'for real / legit', use: 'ガチで嬉しい = genuinely happy' },
      { word: 'エモい', reading: 'えもい', p: 0, en: 'nostalgic / hits different', use: 'この曲エモい = this song hits different' },
      { word: 'うける', reading: 'うける', p: 0, en: 'lol / hilarious', use: 'うけるw = lmao' },
      { word: 'きもい', reading: 'きもい', p: 1, en: 'gross / creepy', use: 'きもい = ew, creepy' },
      { word: 'ださい', reading: 'ださい', p: 1, en: 'lame / uncool', use: 'その服ださい = that outfit is lame' },
    ],
  },
  hype: {
    intro: ['🔥 hype up like a native', 'Slang to say<br>something is AMAZING', '…and nail the pitch 👇'],
    words: [
      { word: '神',     reading: 'かみ',     p: 1, en: 'godlike / the best', use: 'この曲神 = this song is godlike' },
      { word: '最強',   reading: 'さいきょう', p: 0, en: 'the strongest / OP', use: 'これ最強 = this is OP' },
      { word: '優勝',   reading: 'ゆうしょう', p: 0, en: 'winning / unbeatable', use: 'この組み合わせ優勝 = this combo is winning' },
      { word: '天才',   reading: 'てんさい',   p: 0, en: 'genius! (praise)', use: '天才か = youre a genius' },
      { word: 'やばい', reading: 'やばい',     p: 0, en: 'insane (good way)', use: 'かっこよさやばい = insanely cool' },
    ],
  },
};

const setArg = process.argv.includes('--set') ? process.argv[process.argv.indexOf('--set') + 1] : 'daily';
const SET = SETS[setArg] || SETS.daily;
const WORDS = SET.words;

const SMALL = new Set([...'ゃゅょぁぃぅぇぉ']);
const morae = (r) => { const o = []; for (const c of r) { if (SMALL.has(c) && o.length) o[o.length - 1] += c; else o.push(c); } return o; };
const pattern = (p, n) => Array.from({ length: n }, (_, i) => { const m = i + 1; if (p === 0) return m === 1 ? 0 : 1; if (p === 1) return m === 1 ? 1 : 0; return m >= 2 && m <= p ? 1 : 0; });

function contourSVG(ms, pat) {
  const w = 560, h = 200, pad = 60;
  const xs = pat.map((_, i) => pad + (i / Math.max(1, pat.length - 1)) * (w - 2 * pad));
  const ys = pat.map((v) => (v ? h * 0.28 : h * 0.72));
  const pts = xs.map((x, i) => `${x.toFixed(0)},${ys[i].toFixed(0)}`);
  const dots = xs.map((x, i) => `<circle cx="${x.toFixed(0)}" cy="${ys[i].toFixed(0)}" r="9" fill="#FDBA74"/>`).join('');
  const labels = ms.map((m, i) => `<text x="${xs[i].toFixed(0)}" y="${h - 8}" fill="rgba(255,255,255,.65)" font-size="30" font-family="'Hiragino Sans'" text-anchor="middle">${m}</text>`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts.join(' ')}" fill="none" stroke="#FDBA74" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}

const base = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#4338CA 0%,#5B21B6 55%,#3B0764 100%)}
.glow{position:absolute;border-radius:50%;filter:blur(120px);z-index:0}
.g1{width:760px;height:760px;background:rgba(255,122,89,.30);right:-120px;top:60px}
.g2{width:720px;height:720px;background:rgba(99,102,241,.45);left:-160px;bottom:80px}
.jp{font-family:'Hiragino Sans','Yu Gothic',sans-serif}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;z-index:2;opacity:0}
@keyframes seg{0%{opacity:0;transform:translateY(40px) scale(.97)}8%{opacity:1;transform:none}90%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-24px)}}
.num{font-size:40px;font-weight:800;color:#FDBA74;letter-spacing:.1em;margin-bottom:18px}
.word{font-size:210px;font-weight:800;line-height:1}
.read{font-size:54px;color:rgba(255,255,255,.72);margin-top:6px}
.en{font-size:52px;font-weight:800;margin-top:22px}
.use{font-size:38px;color:rgba(255,255,255,.7);margin-top:18px}
.card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:28px;padding:20px 30px;margin-top:34px}
.btn{font-size:56px;font-weight:800;color:#4f46e5;background:#fff;padding:32px 78px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3);margin-top:48px}
`;

const stages = [];
// intro
stages.push({ dur: 2.4, html: `
  <div class="num">${SET.intro[0]}</div>
  <div style="font-size:92px;font-weight:800;line-height:1.08">${SET.intro[1]}</div>
  <div style="font-size:42px;color:rgba(255,255,255,.7);margin-top:30px">${SET.intro[2]}</div>` });
// words
WORDS.forEach((e, i) => {
  const ms = morae(e.reading); const pat = pattern(e.p, ms.length);
  stages.push({ dur: 3.0, html: `
    <div class="num">${i + 1} / ${WORDS.length}</div>
    <div class="word jp">${e.word}</div>
    ${e.word === e.reading ? '' : `<div class="read jp">${e.reading}</div>`}
    <div class="en">${e.en}</div>
    <div class="card">${contourSVG(ms, pat)}</div>
    <div class="use jp">${e.use}</div>` });
});
// cta
stages.push({ dur: 3.0, html: `
  <div style="font-size:34px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.55)">🍣 NihonGo</div>
  <div style="font-size:84px;font-weight:800;line-height:1.08;margin-top:22px">Sound native,<br>not robotic.</div>
  <div style="font-size:44px;color:rgba(255,255,255,.8);margin-top:26px">Score your pitch on any word — free.</div>
  <div class="btn">Try it FREE →</div>
  <div style="font-size:40px;font-weight:700;color:rgba(255,255,255,.8);margin-top:30px">nihongo.amorjp.com</div>` });

// build the timeline as sequential CSS animations
let t = 0;
const stageDivs = stages.map((s, i) => {
  const div = `<div class="stage" style="animation:seg ${s.dur}s ${t}s both">${s.html}</div>`;
  t += s.dur;
  return div;
}).join('\n');
const TOTAL = t;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>${base}</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>
${stageDivs}
</body></html>`;

await mkdir(OUT, { recursive: true });
await rm(REC, { recursive: true, force: true });
await mkdir(REC, { recursive: true });
const file = path.join(REC, 's.html');
await writeFile(file, html);

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: REC, size: { width: W, height: H } } });
const page = await ctx.newPage();
await page.goto('file://' + file);
await page.waitForTimeout(700);
await page.waitForTimeout(TOTAL * 1000);
await ctx.close();
await browser.close();

const webm = path.join(REC, (await readdir(REC)).find((f) => f.endsWith('.webm')));
const outFile = path.join(OUT, `NihonGo_slang_${setArg}.mp4`);
const music = path.join(MK, 'audio', 'music_526.mp3');
if (existsSync(music)) {
  await run('ffmpeg', ['-y', '-i', webm, '-i', music,
    '-filter_complex', `[0:v]fps=30,format=yuv420p[v];[1:a]volume=0.26,afade=t=in:st=0:d=0.8,afade=t=out:st=${(TOTAL - 1.2).toFixed(1)}:d=1.2[a]`,
    '-map', '[v]', '-map', '[a]', '-t', String(TOTAL),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outFile]);
} else {
  await run('ffmpeg', ['-y', '-i', webm, '-t', String(TOTAL), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', outFile]);
}
await rm(REC, { recursive: true, force: true });
console.log(`✅ ${outFile} (${TOTAL.toFixed(1)}s)`);
