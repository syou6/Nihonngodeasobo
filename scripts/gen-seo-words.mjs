// Programmatic SEO part 2: one page per verified drop-word (47). Targets
// "how to pronounce X in Japanese" / "<romaji> pitch accent" queries. Each page
// embeds the real Kyoko clip, shows the H/L mora contour + which of the 4 pitch
// patterns it is, and funnels to the trainer + Ear Sprint. Honest: the contour
// is exactly what the app's detector hears in that clip (dict-agreed set).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/sho/nihongo-web';
const OUT = path.join(ROOT, 'public', 'learn', 'say');
const SITE = 'https://nihongo.amorjp.com';

// --- parse dropWords.ts ---
const src = readFileSync(path.join(ROOT, 'src/components/pitch/dropWords.ts'), 'utf8');
const re = /\{ word: '([^']+)', reading: '([^']+)', en: '([^']+)', morae: \[([^\]]*)\], dropAfter: (\d+) \}/g;
const WORDS = [];
let m;
while ((m = re.exec(src))) {
  WORDS.push({
    w: m[1], r: m[2], en: m[3].trim(),
    morae: m[4].split(',').map((s) => s.replace(/'/g, '').trim()).filter(Boolean),
    d: +m[5],
  });
}

// --- Hepburn romaji (katakana → hiragana → romaji, handles digraphs + ー) ---
const DI = { きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho', ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo', ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo', りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo', じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo', ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo' };
const MO = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n' };
function kataToHira(s) { return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
function romaji(reading) {
  const s = kataToHira(reading);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (DI[two]) { out += DI[two]; i++; continue; }
    if (s[i] === 'ー' || s[i] === '〜') { const v = out.match(/[aiueo]$/); out += v ? v[0] : ''; continue; }
    if (s[i] === 'っ') { const n = MO[s[i + 1]] || DI[s.slice(i + 1, i + 3)] || ''; out += n[0] || ''; continue; }
    out += MO[s[i]] ?? s[i];
  }
  return out;
}

// --- pitch pattern from the nucleus ---
function hl(morae, d) {
  if (d === 1) return morae.map((_, i) => (i === 0 ? 'H' : 'L'));
  return morae.map((_, i) => (i === 0 ? 'L' : d === 0 ? 'H' : i < d ? 'H' : 'L'));
}
function patternName(morae, d) {
  if (d === 0) return { jp: '平板', en: 'Heiban', desc: 'the pitch rises and stays high to the end — no drop' };
  if (d === 1) return { jp: '頭高', en: 'Atamadaka', desc: 'the pitch starts high and drops right after the first mora' };
  if (d === morae.length) return { jp: '尾高', en: 'Odaka', desc: 'the pitch stays high, then drops on the particle after the word' };
  return { jp: '中高', en: 'Nakadaka', desc: `the pitch rises, then drops after mora ${d}` };
}

const enWord = (en) => en.replace(/[^a-zA-Z /]/g, '').trim();          // "water 💧" → "water"
const enSlug = (en) => enWord(en).toLowerCase().replace(/[ /]+/g, '-').replace(/-+$/,'');
const slugFor = (x) => `${enSlug(x.en)}-${romaji(x.r)}`;

function page(x, all) {
  const rom = romaji(x.r);
  const pat = patternName(x.morae, x.d);
  const contour = hl(x.morae, x.d);
  const slug = slugFor(x);
  const url = `${SITE}/learn/say/${slug}.html`;
  const enw = enWord(x.en);
  const title = `How to Pronounce ${cap(enw)} in Japanese: ${x.w} (${rom}) — Pitch Accent`;
  const desc = `${cap(enw)} in Japanese is ${x.w} (${x.r}, ${rom}). Hear the real native pronunciation and learn its pitch accent — ${pat.en} (${pat.jp}). Free ear training.`;
  const moraSpans = x.morae.map((mo, i) => `<span class="mora ${contour[i] === 'H' ? 'hi' : 'lo'}">${mo}</span>`).join('');
  const same = all.filter((y) => y !== x && y.d === x.d).slice(0, 6);
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: `How do you say ${enw} in Japanese?`,
        acceptedAnswer: { '@type': 'Answer', text: `${cap(enw)} is ${x.w}, read ${x.r} (${rom}). Its pitch accent is ${pat.en} (${pat.jp}) — ${pat.desc}.` } },
      { '@type': 'Question', name: `What is the pitch accent of ${x.w} (${rom})?`,
        acceptedAnswer: { '@type': 'Answer', text: `${x.w} is ${pat.en} (${pat.jp}): ${contour.join('-')} across the morae ${x.morae.join('-')}. ${cap(pat.desc)}.` } },
    ],
  };
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<script>
  if (location.hostname === 'nihongo.amorjp.com') {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-79GNWZ3865';
    document.head.appendChild(gaScript);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-79GNWZ3865');
  }
</script>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:title" content="How to Pronounce ${cap(enw)} in Japanese: ${x.w} (${rom})"/>
<meta property="og:description" content="Hear ${x.w} (${x.r}) with real native audio and learn its pitch accent — ${pat.en}."/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>
  body{font-family:'Inter',sans-serif;background:#F9FAFB}
  h1,h2,h3{font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}
  .ja{font-family:'Hiragino Sans','Plus Jakarta Sans',sans-serif}
  .mora{display:inline-block;padding:.12em .5em;border-radius:.4em;font-weight:700;margin:0 1px}
  .hi{background:#d1fae5;color:#065f46}.lo{background:#f1f5f9;color:#475569}
</style>
<script type="application/ld+json">${JSON.stringify(faq)}</script>
</head><body class="text-gray-800">
<nav class="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-10">
  <div class="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 font-extrabold tracking-tight text-gray-900"><img src="/logo.png" class="w-8 h-8" alt="NihonGo"/> NihonGo</a>
    <a href="/app.html?guest=true&view=ear" class="bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-indigo-500">👂 Play the Ear Test</a>
  </div>
</nav>
  <article class="max-w-3xl mx-auto px-6 py-12 leading-relaxed">
    <p class="text-sm text-indigo-600 font-semibold">How to pronounce · Japanese pitch accent</p>
    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mt-1">How to pronounce <span class="ja">${x.w}</span> <span class="text-gray-500">(${enw})</span> in Japanese</h1>
    <p class="text-gray-500 mt-4 text-lg"><b class="ja text-gray-700">${x.w}</b> means <strong>${enw}</strong>. It's read <b class="ja text-gray-700">${x.r}</b> (<i>${rom}</i>). Tap to hear the real native pronunciation, then see exactly where the pitch goes. 🔊</p>

    <div class="my-8 flex flex-col items-center gap-4">
      <button onclick="hear('${x.w}',this)" class="ja bg-white rounded-3xl border border-gray-100 shadow-sm px-10 py-7 hover:scale-105 hover:border-indigo-200 transition-all text-center">
        <div class="text-6xl font-extrabold text-gray-900">${x.w}</div>
        <div class="text-sm text-gray-500 mt-2">${x.en}</div>
        <div class="text-[11px] font-bold text-indigo-600 mt-2">🔊 tap to hear</div>
      </button>
    </div>

    <h2 class="text-2xl font-extrabold text-gray-900 mt-10">Where the pitch goes</h2>
    <p class="text-gray-600 mt-2">${x.w} is <strong>${pat.en}</strong> (${pat.jp}) — ${pat.desc}. Each mora is shown high (<span class="mora hi">高</span>) or low (<span class="mora lo">低</span>):</p>
    <p class="mt-4 ja text-2xl text-center">${moraSpans}</p>
    <p class="text-center font-mono text-sm text-gray-400 mt-2">${contour.join('-')}</p>

    <div class="my-10 p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-center">
      <h2 class="text-2xl font-extrabold">🎤 Say it — get scored</h2>
      <p class="text-white/80 mt-2 mb-5">Record ${x.w} and NihonGo scores your pitch against the native contour. Free, no signup.</p>
      <a href="/app.html?guest=true&view=pitch" class="inline-block bg-white text-indigo-600 font-extrabold px-8 py-4 rounded-2xl hover:scale-105 transition-transform">Score My Pitch — Free →</a>
    </div>

    <p class="text-gray-600">Japanese pitch accent isn't guessable from spelling — you learn it per word, by ear. Related: <a href="/learn/japanese-pitch-accent-patterns.html" class="text-indigo-600 font-semibold">the 4 pitch patterns</a> · <a href="/learn/can-you-hear-japanese-pitch.html" class="text-indigo-600 font-semibold">can you hear it?</a></p>

    ${same.length ? `<h2 class="text-xl font-extrabold text-gray-900 mt-10">More ${pat.en} words</h2>
    <div class="flex flex-wrap gap-2 mt-3">
      ${same.map((y) => `<a href="/learn/say/${slugFor(y)}.html" class="ja text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 text-gray-600 hover:border-indigo-300 hover:text-indigo-600">${y.w} <span class="text-gray-400">${enWord(y.en)}</span></a>`).join('')}
    </div>` : ''}
  </article>
  <footer class="border-t border-gray-200 bg-white py-10 mt-16">
  <div class="max-w-3xl mx-auto px-6 text-sm text-gray-400 flex flex-wrap gap-6 justify-between">
    <span>&copy; 2026 AMOR LLC</span>
    <span class="flex gap-5">
      <a href="/learn/can-you-hear-japanese-pitch.html" class="hover:text-indigo-600">Hear It</a>
      <a href="/learn/japanese-pitch-accent-patterns.html" class="hover:text-indigo-600">Patterns</a>
      <a href="/learn/japanese-pitch-accent.html" class="hover:text-indigo-600">Minimal Pairs</a>
      <a href="/" class="hover:text-indigo-600">Home</a>
    </span>
  </div>
</footer>
<script>
  function hear(w,el){ try{ new Audio('/word-audio/'+encodeURIComponent(w)+'.mp3').play(); }catch(e){} el.animate([{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:240}); if(window.gtag)window.gtag('event','learn_hear_word',{word:w}); }
</script>
</body></html>`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

mkdirSync(OUT, { recursive: true });
const slugs = [];
for (const x of WORDS) { const s = slugFor(x); writeFileSync(path.join(OUT, `${s}.html`), page(x, WORDS)); slugs.push(s); }
writeFileSync('/tmp/word-slugs.json', JSON.stringify(slugs));
console.log(`wrote ${WORDS.length} word pages`);
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dup.length) console.log('⚠️ DUP SLUGS:', dup);
