// Renderers for the comment-driven minimal-pair quiz (video + photo-mode slides).
// Ported from generate-quiz-pair.mjs / generate-quiz-slides.mjs, parameterized:
// pair comes from lib/pairs.mjs, `answerSide` ('a'|'b') varies the correct card
// so batches don't leak a constant "always A" pattern in the comments.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const W = 1080, H = 1920, DUR = 13.0;
const MUSIC = path.join(MK, 'audio', 'music_130.mp3');

const patText = (pat) => (pat[0] ? 'high → low' : 'low → high');

// SVG pitch contour (dictionary-correct, n-mora).
function contour(moraeList, pat, color, big = false) {
  const w = big ? 460 : 420, h = big ? 230 : 200, pad = big ? 60 : 56;
  const xs = pat.map((_, i) => pad + (i / Math.max(1, pat.length - 1)) * (w - 2 * pad));
  const ys = pat.map((v) => (v ? h * 0.25 : h * 0.71));
  const pts = xs.map((x, i) => `${x.toFixed(0)},${ys[i].toFixed(0)}`);
  const dots = xs.map((x, i) => `<circle cx="${x.toFixed(0)}" cy="${ys[i].toFixed(0)}" r="14" fill="${color}"/>`).join('');
  const labels = moraeList.map((m, i) => `<text x="${xs[i].toFixed(0)}" y="${h - 7}" fill="rgba(255,255,255,.7)" font-size="42" font-family="'Hiragino Sans',sans-serif" text-anchor="middle">${m}</text>`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${labels}</svg>`;
}

// answerSide-aware view: cards stay a=A / b=B; `ans`/`other` flag which wins.
function view(pair, answerSide) {
  const ans = pair[answerSide];
  const other = pair[answerSide === 'a' ? 'b' : 'a'];
  const letter = answerSide.toUpperCase();
  return { ...pair, ans, other, letter };
}

const FONTS = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">`;

const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#4338CA 0%,#5B21B6 55%,#3B0764 100%);position:relative}
.glow{position:absolute;border-radius:50%;filter:blur(120px);z-index:0}
.g1{width:760px;height:760px;background:rgba(255,122,89,.30);right:-120px;top:60px}
.g2{width:720px;height:720px;background:rgba(99,102,241,.45);left:-160px;bottom:80px}
.jp{font-family:'Hiragino Sans','Yu Gothic',sans-serif}`;

// ---------------- video ----------------

function videoHtml(pair, answerSide) {
  const v = view(pair, answerSide);
  const ringDash = Math.PI * 2 * 130;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}
<style>${BASE_CSS}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;z-index:2;opacity:0}
.s1{animation:seg 2.8s 0s both}.s2{animation:seg 4.0s 2.8s both}.s3{animation:seg 2.2s 6.8s both}.s4{animation:seg 4.0s 9.0s both}
@keyframes seg{0%{opacity:0;transform:translateY(40px) scale(.97)}7%{opacity:1;transform:none}93%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-26px) scale(.98)}}
.kicker{font-size:46px;font-weight:800;letter-spacing:.04em;color:#FDBA74;margin-bottom:30px}
.kana{font-size:${v.reading.length > 2 ? 220 : 280}px;font-weight:800;line-height:1}
.same{margin-top:18px;font-size:44px;font-weight:700;color:rgba(255,255,255,.8)}
.twomean{margin-top:46px;display:flex;gap:34px;font-size:50px;font-weight:800}
.twomean span{background:rgba(255,255,255,.12);padding:20px 34px;border-radius:24px}
.q{font-size:60px;font-weight:800;margin-bottom:14px}
.qsub{font-size:42px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:40px}
.cards{display:flex;gap:34px;margin-bottom:40px}
.card{background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.25);border-radius:32px;padding:40px 50px;min-width:280px}
.card .lab{font-size:48px;font-weight:800;color:#FDBA74;margin-bottom:14px}
.card .w{font-size:130px;font-weight:800;line-height:1}
.card .m{font-size:40px;color:rgba(255,255,255,.7);margin-top:10px}
.ringwrap{position:relative;width:300px;height:300px}
.ringnum{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:150px;font-weight:800}
.ringnum .c3{animation:tick 1s 3.2s both}.ringnum .c2{animation:tick 1s 4.2s both}.ringnum .c1{animation:tick 1s 5.2s both}
@keyframes tick{0%{opacity:0;transform:scale(.6)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(1.3)}}
.arc{stroke-dasharray:${ringDash.toFixed(0)};stroke-dashoffset:0;animation:arc 3s 3.2s linear forwards}
@keyframes arc{to{stroke-dashoffset:${ringDash.toFixed(0)}}}
.lock{font-size:96px;font-weight:800;line-height:1.1}.lock .hi{color:#FDBA74}
.locksub{margin-top:34px;font-size:52px;font-weight:800;color:#fff;background:rgba(52,211,153,.22);border:3px solid rgba(52,211,153,.6);padding:24px 50px;border-radius:999px}
.lockno{margin-top:30px;font-size:44px;font-weight:700;color:rgba(255,255,255,.75)}
.rev{font-size:62px;font-weight:800;margin-bottom:30px}.rev .good{color:#34D399}
.pair{display:flex;gap:50px;margin-bottom:36px}
.pbox{background:rgba(255,255,255,.10);border-radius:28px;padding:30px 30px 16px}
.pbox.win{border:3px solid #34D399}
.pbox .pm{font-size:34px;color:rgba(255,255,255,.65);margin-bottom:8px}
.cta{margin-top:10px;font-size:54px;font-weight:800;color:#fff}.cta .y{color:#FDBA74}
.btn{margin-top:34px;font-size:54px;font-weight:800;color:#4f46e5;background:#fff;padding:30px 70px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3);animation:pulse 1.2s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.url{margin-top:24px;font-size:40px;color:rgba(255,255,255,.78);font-weight:700}
</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="stage s1">
  <div class="kicker">95% OF LEARNERS GET THIS WRONG</div>
  <div class="kana jp">${v.reading}</div>
  <div class="same">same sound — but it means TWO things 👇</div>
  <div class="twomean"><span>${v.a.emoji} ${v.a.en}</span><span>${v.b.emoji} ${v.b.en}</span></div>
</div>
<div class="stage s2">
  <div class="q">Listen 👂 which one is this?</div>
  <div class="qsub">the PITCH is the only clue</div>
  <div class="cards">
    <div class="card"><div class="lab">A</div><div class="w jp">${v.a.word}</div><div class="m">${v.a.emoji} ${v.a.en}</div></div>
    <div class="card"><div class="lab">B</div><div class="w jp">${v.b.word}</div><div class="m">${v.b.emoji} ${v.b.en}</div></div>
  </div>
  <div class="ringwrap">
    <svg width="300" height="300" viewBox="0 0 300 300" style="transform:rotate(-90deg)">
      <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="22"/>
      <circle class="arc" cx="150" cy="150" r="130" fill="none" stroke="#FDBA74" stroke-width="22" stroke-linecap="round"/>
    </svg>
    <div class="ringnum"><span class="c3">3</span><span class="c2" style="position:absolute">2</span><span class="c1" style="position:absolute">1</span></div>
  </div>
</div>
<div class="stage s3">
  <div class="lock"><span class="hi">A</span> or <span class="hi">B</span> ?</div>
  <div class="locksub">👇 comment your answer NOW</div>
  <div class="lockno">no scrolling till you guess 😤</div>
</div>
<div class="stage s4">
  <div class="rev">It was <span class="good">${v.letter} · ${v.ans.word}</span> ${v.ans.emoji}</div>
  <div class="pair">
    <div class="pbox${answerSide === 'a' ? ' win' : ''}">
      <div class="pm">A · ${v.a.word} ${v.a.en}</div>
      ${contour(v.morae, v.a.pat, answerSide === 'a' ? '#34D399' : '#FB7185')}
    </div>
    <div class="pbox${answerSide === 'b' ? ' win' : ''}">
      <div class="pm">B · ${v.b.word} ${v.b.en}</div>
      ${contour(v.morae, v.b.pat, answerSide === 'b' ? '#34D399' : '#FB7185')}
    </div>
  </div>
  <div class="cta">Got it right? <span class="y">prove it.</span></div>
  <div class="btn">What's YOUR ear score? →</div>
  <div class="url">nihongo.amorjp.com · free</div>
</div>
</body></html>`;
}

export async function renderQuizVideo(browser, pair, answerSide, outFile) {
  const v = view(pair, answerSide);
  const rec = path.join(MK, `.recquiz-${pair.a.audio}`);
  await rm(rec, { recursive: true, force: true });
  await mkdir(rec, { recursive: true });
  const sceneFile = path.join(rec, 'f.html');
  await writeFile(sceneFile, videoHtml(pair, answerSide));

  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: rec, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  await page.goto('file://' + sceneFile);
  await page.waitForTimeout(800);
  await page.waitForTimeout(DUR * 1000);
  await ctx.close();

  const webm = path.join(rec, (await readdir(rec)).find((f) => f.endsWith('.webm')));
  const inputs = ['-i', webm];
  const filters = [`[0:v]scale=${W}:${H},fps=30[v]`];
  const amix = [];
  let ai = 1;
  if (existsSync(MUSIC)) {
    inputs.push('-i', MUSIC);
    filters.push(`[${ai}:a]volume=0.14,atrim=0:13.5,afade=t=in:st=0:d=1,afade=t=out:st=12:d=1.3[m]`);
    amix.push('[m]'); ai++;
  }
  if (existsSync(v.ans.audioFile)) {
    inputs.push('-i', v.ans.audioFile); // quiz play @3.3s, reveal replay @9.4s
    filters.push(`[${ai}:a]asplit=2[qa][ra]`);
    filters.push(`[qa]adelay=3300|3300,volume=1.8[q]`);
    filters.push(`[ra]adelay=9400|9400,volume=1.8[r]`);
    amix.push('[q]', '[r]'); ai++;
  }
  if (existsSync(v.other.audioFile)) {
    inputs.push('-i', v.other.audioFile); // contrast @10.7s
    filters.push(`[${ai}:a]adelay=10700|10700,volume=1.8[rb]`);
    amix.push('[rb]'); ai++;
  }
  filters.push(`${amix.join('')}amix=inputs=${amix.length}:duration=longest:normalize=0[a]`);

  await run('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(DUR), outFile]);
  await rm(rec, { recursive: true, force: true });
  return outFile;
}

// ---------------- slides ----------------

function slideDefs(pair, answerSide) {
  const v = view(pair, answerSide);
  return [
    { name: '01_hook', extra: `
      .kicker{font-size:48px;font-weight:800;color:#FDBA74;margin-bottom:30px}
      .kana{font-size:${v.reading.length > 2 ? 230 : 300}px;font-weight:800;line-height:1}
      .same{margin-top:24px;font-size:48px;font-weight:700;color:rgba(255,255,255,.82)}
      .tm{margin-top:50px;display:flex;gap:34px;font-size:54px;font-weight:800}
      .tm span{background:rgba(255,255,255,.12);padding:22px 38px;border-radius:26px}`,
      body: `<div class="wrap">
        <div class="kicker">95% OF LEARNERS GET THIS WRONG</div>
        <div class="kana jp">${v.reading}</div>
        <div class="same">one sound — TWO meanings 👇</div>
        <div class="tm"><span>${v.a.emoji} ${v.a.en}</span><span>${v.b.emoji} ${v.b.en}</span></div>
      </div><div class="swipe">swipe → can you tell them apart?</div>` },

    { name: '02_quiz', extra: `
      .q{font-size:60px;font-weight:800;margin-bottom:10px}
      .qk{font-size:46px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:48px}
      .cards{display:flex;gap:36px;margin-bottom:54px}
      .card{background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.25);border-radius:34px;padding:30px 30px 18px}
      .card .lab{font-size:54px;font-weight:800;color:#FDBA74;margin-bottom:8px}
      .ask{font-size:58px;font-weight:800;background:rgba(52,211,153,.22);border:3px solid rgba(52,211,153,.6);padding:28px 56px;border-radius:999px}
      .askno{margin-top:28px;font-size:44px;font-weight:700;color:rgba(255,255,255,.75)}`,
      body: `<div class="wrap">
        <div class="q">Which pitch means ${v.ans.emoji} ?</div>
        <div class="qk jp">both are「${v.reading}」— the shape decides</div>
        <div class="cards">
          <div class="card"><div class="lab">A</div>${contour(v.morae, v.a.pat, '#fff')}</div>
          <div class="card"><div class="lab">B</div>${contour(v.morae, v.b.pat, '#fff')}</div>
        </div>
        <div class="ask">👇 comment A or B NOW</div>
        <div class="askno">guess before you swipe 😤</div>
      </div><div class="swipe">swipe → answer</div>` },

    { name: '03_reveal', extra: `
      .rev{font-size:70px;font-weight:800;margin-bottom:44px}
      .rev .good{color:#34D399}
      .pair{display:flex;flex-direction:column;gap:40px;width:100%;max-width:560px}
      .pbox{background:rgba(255,255,255,.10);border-radius:30px;padding:30px 36px 18px;display:flex;flex-direction:column;align-items:center}
      .pbox.win{border:3px solid #34D399}
      .pbox .pm{font-size:42px;font-weight:700;color:rgba(255,255,255,.78);margin-bottom:10px}`,
      body: `<div class="wrap">
        <div class="rev">${v.letter} · ${v.ans.word} ${v.ans.emoji} = <span class="good">${v.ans.en}</span></div>
        <div class="pair">
          <div class="pbox${answerSide === 'a' ? ' win' : ''}"><div class="pm">${v.a.emoji} ${v.a.word} — ${patText(v.a.pat)}</div>${contour(v.morae, v.a.pat, answerSide === 'a' ? '#34D399' : '#FB7185', true)}</div>
          <div class="pbox${answerSide === 'b' ? ' win' : ''}"><div class="pm">${v.b.emoji} ${v.b.word} — ${patText(v.b.pat)}</div>${contour(v.morae, v.b.pat, answerSide === 'b' ? '#34D399' : '#FB7185', true)}</div>
        </div>
      </div><div class="swipe">swipe → train your ear 👂</div>` },

    { name: '04_cta', extra: `
      .ct{font-size:78px;font-weight:800;line-height:1.12}
      .ct .y{color:#FDBA74}
      .sub{margin-top:34px;font-size:48px;font-weight:700;color:rgba(255,255,255,.82)}
      .btn{margin-top:64px;font-size:56px;font-weight:800;color:#4f46e5;background:#fff;padding:34px 78px;border-radius:999px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
      .url{margin-top:30px;font-size:44px;color:rgba(255,255,255,.8);font-weight:700}`,
      body: `<div class="wrap">
        <div class="ct">Got it right?<br><span class="y">prove your ear.</span></div>
        <div class="sub">real pitch audio · honest score · free</div>
        <div class="btn">Play free → link in bio</div>
        <div class="url">nihongo.amorjp.com</div>
      </div>` },
  ];
}

export async function renderQuizSlides(browser, pair, answerSide, outDir) {
  const tmp = path.join(MK, `.recslides-${pair.a.audio}`);
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const head = (extra, no) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}
<style>${BASE_CSS}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;z-index:2}
.swipe{position:absolute;bottom:70px;left:0;right:0;text-align:center;font-size:40px;font-weight:800;color:rgba(255,255,255,.7);z-index:3}
.pageno{position:absolute;top:64px;right:70px;font-size:38px;font-weight:800;color:rgba(255,255,255,.45);z-index:3}
.logo{position:absolute;top:60px;left:70px;font-size:42px;font-weight:800;font-style:italic;color:rgba(255,255,255,.85);z-index:3}
${extra}</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="logo">🍣 NihonGo</div><div class="pageno">${no}</div>`;

  const defs = slideDefs(pair, answerSide);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const outFiles = [];
  for (let i = 0; i < defs.length; i++) {
    const s = defs[i];
    const html = head(s.extra, `${i + 1}/${defs.length}`) + s.body + '</body></html>';
    const f = path.join(tmp, `${s.name}.html`);
    await writeFile(f, html);
    await page.goto('file://' + f);
    await page.waitForTimeout(700); // webfonts
    const out = path.join(outDir, `${s.name}.png`);
    await page.screenshot({ path: out });
    outFiles.push(out);
  }
  await ctx.close();
  await rm(tmp, { recursive: true, force: true });
  return outFiles;
}
