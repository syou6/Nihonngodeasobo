// Renderers for the comment-driven minimal-pair quiz (video + photo-mode slides).
// Ported from generate-quiz-pair.mjs / generate-quiz-slides.mjs, parameterized:
// pair comes from lib/pairs.mjs, `answerSide` ('a'|'b') varies the correct card
// so batches don't leak a constant "always A" pattern in the comments.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { HOOKS } from './hooks.mjs';

const run = promisify(execFile);
const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// Tightened to 10s for TikTok completion-rate (the 3-2-1 countdown was dead
// air that tanked watch-through → the algo throttled reach to <500 views).
const W = 1080, H = 1920, DUR = 10.0, FPS = 30, SCALE = 2;
const MUSIC = path.join(MK, 'audio', 'music_130.mp3');

// Audio cue timeline (ms) — the CSS sound-pulse animations and the ffmpeg
// adelay values are derived from the same constants so they can never drift.
const T_QUIZ_PLAY = 3000, T_REVEAL_ANS = 7400, T_REVEAL_OTHER = 8400;

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

// Sound-pulse equalizer shown exactly while an audio clip plays, so viewers
// know WHEN to listen (and at reveal, WHICH contour is sounding).
function eqPulse(delayMs, color, barH = 40) {
  const bars = [0, 1, 2, 3, 4].map((i) =>
    `<span style="background:${color};animation:eqbar .38s ${-i * 0.09}s ease-in-out infinite alternate"></span>`).join('');
  return `<div class="eq" style="animation:eqwin 1.1s ${delayMs}ms both;height:${barH}px">${bars}</div>`;
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

function videoHtml(pair, answerSide, hook = HOOKS[0], platform = 'tiktok', tease = false) {
  const v = view(pair, answerSide);
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}
<style>${BASE_CSS}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;z-index:2;opacity:0}
.s1{animation:seg 2.6s 0s both}.s2{animation:seg 2.8s 2.6s both}.s3{animation:seg 1.6s 5.4s both}.s4{animation:seg 3.0s 7.0s both}
@keyframes seg{0%{opacity:0;transform:translateY(40px) scale(.97)}8%{opacity:1;transform:none}92%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-26px) scale(.98)}}
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
.eq{display:flex;gap:8px;align-items:center;justify-content:center;opacity:0}
.eq span{width:11px;height:100%;border-radius:6px;transform-origin:center}
@keyframes eqwin{0%{opacity:0}10%{opacity:1}85%{opacity:1}100%{opacity:0}}
@keyframes eqbar{from{transform:scaleY(.25)}to{transform:scaleY(1)}}
</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="stage s1">
  <div class="kicker">${hook.kicker}</div>
  <div class="kana jp">${v.reading}</div>
  <div class="same">${hook.same}</div>
  <div class="twomean"><span>${v.a.emoji} ${v.a.en}</span><span>${v.b.emoji} ${v.b.en}</span></div>
</div>
<div class="stage s2">
  <div class="q">Listen 👂 which one is this?</div>
  <div class="qsub">the PITCH is the only clue</div>
  ${eqPulse(T_QUIZ_PLAY, '#FDBA74', 48)}
  <div class="cards" style="margin-top:30px">
    <div class="card"><div class="lab">A</div><div class="w jp">${v.a.word}</div><div class="m">${v.a.emoji} ${v.a.en}</div></div>
    <div class="card"><div class="lab">B</div><div class="w jp">${v.b.word}</div><div class="m">${v.b.emoji} ${v.b.en}</div></div>
  </div>
</div>
<div class="stage s3">
  <div class="lock"><span class="hi">A</span> or <span class="hi">B</span> ?</div>
  <div class="locksub">👇 comment your answer NOW</div>
  <div class="lockno">no scrolling till you guess 😤</div>
</div>
${tease ? `<div class="stage s4">
  <div class="rev">Sure about your answer? 🤔</div>
  <div class="locksub" style="margin-top:10px">answer = pinned comment 👇</div>
  <div class="lockno">it's harder than you think — hear it again:</div>
  <div class="pair" style="margin-top:34px">
    <div class="pbox"><div class="pm">🔊 one of these…</div>${eqPulse(T_REVEAL_ANS, '#FDBA74', 34)}</div>
    <div class="pbox"><div class="pm">🔊 …and the other</div>${eqPulse(T_REVEAL_OTHER, '#FDBA74', 34)}</div>
  </div>
  <div class="cta" style="margin-top:28px">${hook.ctaLine}</div>
  <div class="btn">${hook.btn}</div>
  <div class="url">${platform === 'youtube' ? 'nihongo.amorjp.com · free' : '👀 free — link in bio'}</div>
</div>` : `<div class="stage s4">
  <div class="rev">It was <span class="good">${v.letter} · ${v.ans.word}</span> ${v.ans.emoji}</div>
  <div class="pair">
    <div class="pbox${answerSide === 'a' ? ' win' : ''}">
      <div class="pm">A · ${v.a.word} ${v.a.en}</div>
      ${contour(v.morae, v.a.pat, answerSide === 'a' ? '#34D399' : '#FB7185')}
      ${eqPulse(answerSide === 'a' ? T_REVEAL_ANS : T_REVEAL_OTHER, answerSide === 'a' ? '#34D399' : '#FB7185', 30)}
    </div>
    <div class="pbox${answerSide === 'b' ? ' win' : ''}">
      <div class="pm">B · ${v.b.word} ${v.b.en}</div>
      ${contour(v.morae, v.b.pat, answerSide === 'b' ? '#34D399' : '#FB7185')}
      ${eqPulse(answerSide === 'b' ? T_REVEAL_ANS : T_REVEAL_OTHER, answerSide === 'b' ? '#34D399' : '#FB7185', 30)}
    </div>
  </div>
  <div class="cta">${hook.ctaLine}</div>
  <div class="btn">${hook.btn}</div>
  <div class="url">${platform === 'youtube' ? 'nihongo.amorjp.com · free' : '👀 free — link in bio'}</div>
</div>`}
</body></html>`;
}

// Deterministic frame-by-frame capture: pause every CSS animation and seek the
// whole timeline per frame, screenshotting at 2x. No realtime recording means
// zero dropped frames, exact audio/animation sync, and much sharper text than
// the old webm re-encode. ~390 lossless frames → single ffmpeg encode.
export async function renderQuizVideo(browser, pair, answerSide, outFile, hook = HOOKS[0], platform = 'tiktok', tease = false) {
  const v = view(pair, answerSide);
  const rec = path.join(MK, `.recquiz-${pair.a.audio}-${hook.id}-${platform}${tease ? '-tease' : ''}`);
  await rm(rec, { recursive: true, force: true });
  await mkdir(rec, { recursive: true });
  const sceneFile = path.join(rec, 'f.html');
  await writeFile(sceneFile, videoHtml(pair, answerSide, hook, platform, tease));

  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  await page.goto('file://' + sceneFile);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.getAnimations({ subtree: true }).forEach((a) => a.pause()));

  // JPEG q92 intermediates: ~4x faster to write than PNG at 2x scale, and the
  // difference is invisible after the x264 CRF-16 encode.
  const totalFrames = Math.round(DUR * FPS);
  for (let i = 0; i < totalFrames; i++) {
    await page.evaluate((ms) => {
      document.getAnimations({ subtree: true }).forEach((a) => { a.currentTime = ms; });
    }, (i * 1000) / FPS);
    await page.screenshot({ path: path.join(rec, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92, timeout: 60000 });
  }
  await ctx.close();

  const inputs = ['-framerate', String(FPS), '-i', path.join(rec, 'f%04d.jpg')];
  const filters = [`[0:v]scale=${W}:${H}:flags=lanczos,fps=${FPS}[v]`];
  const amix = [];
  let ai = 1;
  if (existsSync(MUSIC)) {
    inputs.push('-i', MUSIC);
    filters.push(`[${ai}:a]volume=0.14,atrim=0:13.5,afade=t=in:st=0:d=1,afade=t=out:st=12:d=1.3[m]`);
    amix.push('[m]'); ai++;
  }
  if (existsSync(v.ans.audioFile)) {
    inputs.push('-i', v.ans.audioFile); // quiz play + reveal replay
    filters.push(`[${ai}:a]asplit=2[qa][ra]`);
    filters.push(`[qa]adelay=${T_QUIZ_PLAY}|${T_QUIZ_PLAY},volume=1.8[q]`);
    filters.push(`[ra]adelay=${T_REVEAL_ANS}|${T_REVEAL_ANS},volume=1.8[r]`);
    amix.push('[q]', '[r]'); ai++;
  }
  if (existsSync(v.other.audioFile)) {
    inputs.push('-i', v.other.audioFile); // contrast at reveal
    filters.push(`[${ai}:a]adelay=${T_REVEAL_OTHER}|${T_REVEAL_OTHER},volume=1.8[rb]`);
    amix.push('[rb]'); ai++;
  }
  filters.push(`${amix.join('')}amix=inputs=${amix.length}:duration=longest:normalize=0[a]`);

  await run('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(DUR), outFile]);
  await rm(rec, { recursive: true, force: true });
  return outFile;
}

// ---------------- slides ----------------

function slideDefs(pair, answerSide, hook = HOOKS[0], platform = 'tiktok') {
  const v = view(pair, answerSide);
  return [
    { name: '01_hook', extra: `
      .kicker{font-size:48px;font-weight:800;color:#FDBA74;margin-bottom:30px}
      .kana{font-size:${v.reading.length > 2 ? 230 : 300}px;font-weight:800;line-height:1}
      .same{margin-top:24px;font-size:48px;font-weight:700;color:rgba(255,255,255,.82)}
      .tm{margin-top:50px;display:flex;gap:34px;font-size:54px;font-weight:800}
      .tm span{background:rgba(255,255,255,.12);padding:22px 38px;border-radius:26px}`,
      body: `<div class="wrap">
        <div class="kicker">${hook.kicker}</div>
        <div class="kana jp">${v.reading}</div>
        <div class="same">${hook.same}</div>
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
        ${platform === 'youtube' ? '<div class="url">nihongo.amorjp.com</div>' : ''}
      </div>` },
  ];
}

export async function renderQuizSlides(browser, pair, answerSide, outDir, hook = HOOKS[0], platform = 'tiktok') {
  const tmp = path.join(MK, `.recslides-${pair.a.audio}-${hook.id}-${platform}`);
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

  const defs = slideDefs(pair, answerSide, hook, platform);
  // 2x scale for crisp carousel PNGs (matches the video's sharpness bump).
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  const outFiles = [];
  for (let i = 0; i < defs.length; i++) {
    const s = defs[i];
    const html = head(s.extra, `${i + 1}/${defs.length}`) + s.body + '</body></html>';
    const f = path.join(tmp, `${s.name}.html`);
    await writeFile(f, html);
    await page.goto('file://' + f);
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(outDir, `${s.name}.png`);
    await page.screenshot({ path: out });
    outFiles.push(out);
  }
  await ctx.close();
  await rm(tmp, { recursive: true, force: true });
  return outFiles;
}
