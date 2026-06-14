// Build /learn/index.html — the crawlable hub that links every learn page
// (explainers + minimal pairs + all per-word pages, grouped by pitch pattern).
// Homepage → hub → all pages gives crawlers (and curious users) one path to the
// whole library, concentrating internal links.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/sho/nihongo-web';
const SITE = 'https://nihongo.amorjp.com';

// --- word data (reuse parse + romaji from the word generator's conventions) ---
const src = readFileSync(path.join(ROOT, 'src/components/pitch/dropWords.ts'), 'utf8');
const re = /\{ word: '([^']+)', reading: '([^']+)', en: '([^']+)', morae: \[([^\]]*)\], dropAfter: (\d+) \}/g;
const W = [];
let m;
while ((m = re.exec(src))) W.push({ w: m[1], r: m[2], en: m[3].trim(), n: m[4].split(',').length, d: +m[5] });

const DI = { きゃ: 'kya', しゃ: 'sha', しゅ: 'shu', しょ: 'sho', ちゃ: 'cha', りょ: 'ryo', じゃ: 'ja', ぎゅ: 'gyu', きゅ: 'kyu' };
const MO = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', だ: 'da', で: 'de', ど: 'do', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', ん: 'n' };
const kh = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
function romaji(r) { const s = kh(r); let o = ''; for (let i = 0; i < s.length; i++) { const t = s.slice(i, i + 2); if (DI[t]) { o += DI[t]; i++; continue; } if (s[i] === 'ー') { const v = o.match(/[aiueo]$/); o += v ? v[0] : ''; continue; } if (s[i] === 'っ') { const nx = MO[s[i + 1]] || ''; o += nx[0] || ''; continue; } o += MO[s[i]] ?? s[i]; } return o; }
const enw = (e) => e.replace(/[^a-zA-Z /]/g, '').trim();
const wslug = (x) => `${enw(x.en).toLowerCase().replace(/[ /]+/g, '-')}-${romaji(x.r)}`;
const cls = (x) => (x.d === 0 ? 'Heiban (平板)' : x.d === 1 ? 'Atamadaka (頭高)' : x.d === x.n ? 'Odaka (尾高)' : 'Nakadaka (中高)');

const PAIRS = [
  ['hashi-chopsticks-vs-bridge', '箸 / 橋', 'chopsticks vs bridge'],
  ['ame-rain-vs-candy', '雨 / 飴', 'rain vs candy'],
  ['kami-god-vs-paper', '神 / 紙', 'god vs paper'],
  ['ima-now-vs-living-room', '今 / 居間', 'now vs living room'],
  ['sake-alcohol-vs-salmon', '酒 / 鮭', 'alcohol vs salmon'],
  ['kaki-oyster-vs-persimmon', '牡蠣 / 柿', 'oyster vs persimmon'],
  ['kiru-to-cut-vs-to-wear', '切る / 着る', 'cut vs wear'],
  ['kame-jar-vs-turtle', '瓶 / 亀', 'jar vs turtle'],
  ['umi-sea-vs-pus', '海 / 膿', 'sea vs pus'],
  ['kaeru-to-go-home-vs-frog', '帰る / 蛙', 'go home vs frog'],
];
const EXPLAINERS = [
  ['how-to-learn-japanese-pitch-accent', 'How to learn pitch accent', 'The complete step-by-step guide.'],
  ['can-you-hear-japanese-pitch', 'Can you hear Japanese pitch?', 'The aha — tap 箸 vs 橋 and hear it.'],
  ['japanese-pitch-accent-patterns', 'The 4 pitch patterns', 'Heiban, atamadaka, nakadaka, odaka.'],
  ['japanese-pitch-accent', 'Minimal pairs', 'Same sounds, different pitch, different word.'],
  ['why-you-sound-foreign-in-japanese', 'Why you sound foreign', 'Pitch is the missing piece.'],
  ['common-japanese-mistakes', 'Common mistakes', 'What trips up every learner.'],
];

const order = ['Heiban (平板)', 'Atamadaka (頭高)', 'Nakadaka (中高)', 'Odaka (尾高)'];
const groups = {};
for (const x of W) (groups[cls(x)] ??= []).push(x);

const chip = (href, jp, en) => `<a href="${href}" class="ja text-sm bg-white border border-gray-200 rounded-full px-3.5 py-1.5 text-gray-600 hover:border-indigo-300 hover:text-indigo-600">${jp}${en ? ` <span class="text-gray-400">${en}</span>` : ''}</a>`;

const html = `<!DOCTYPE html><html lang="en"><head>
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
<title>Japanese Pitch Accent — Learn by Ear (${W.length} words, real audio) | NihonGo</title>
<meta name="description" content="The full Japanese pitch-accent library: hear ${W.length} common words and ${PAIRS.length} minimal pairs with real native audio, see each pitch contour, and train your ear free."/>
<link rel="canonical" href="${SITE}/learn/"/>
<meta property="og:title" content="Japanese Pitch Accent — Learn by Ear"/>
<meta property="og:description" content="Hear ${W.length} words + ${PAIRS.length} minimal pairs with native audio and learn every pitch contour. Free ear training."/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${SITE}/learn/"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>body{font-family:'Inter',sans-serif;background:#F9FAFB}h1,h2,h3{font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}.ja{font-family:'Hiragino Sans','Plus Jakarta Sans',sans-serif}</style>
</head><body class="text-gray-800">
<nav class="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-10">
  <div class="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 font-extrabold tracking-tight text-gray-900"><img src="/logo.png" class="w-8 h-8" alt="NihonGo"/> NihonGo</a>
    <a href="/app.html?guest=true&view=ear" class="bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-indigo-500">👂 Play the Ear Test</a>
  </div>
</nav>
  <article class="max-w-3xl mx-auto px-6 py-12 leading-relaxed">
    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">Japanese Pitch Accent — Learn by Ear</h1>
    <p class="text-gray-500 mt-4 text-lg">Every Japanese word has a high/low pitch shape, and it changes meaning. Hear <strong>${W.length} common words</strong> and <strong>${PAIRS.length} minimal pairs</strong> with real native audio, see each contour, then train your ear free. 🔊</p>

    <h2 class="text-2xl font-extrabold text-gray-900 mt-10">Start here</h2>
    <div class="grid sm:grid-cols-2 gap-3 mt-3">
      ${EXPLAINERS.map(([s, t, d]) => `<a href="/learn/${s}.html" class="block rounded-2xl bg-white border border-gray-100 p-4 hover:border-indigo-200"><div class="font-bold text-gray-900">${t}</div><div class="text-sm text-gray-500 mt-0.5">${d}</div></a>`).join('')}
    </div>

    <h2 class="text-2xl font-extrabold text-gray-900 mt-10">Minimal pairs</h2>
    <p class="text-gray-600 mt-1">Same sounds, different pitch — completely different word.</p>
    <div class="flex flex-wrap gap-2 mt-3">
      ${PAIRS.map(([s, jp, en]) => chip(`/learn/${s}.html`, jp, en)).join('')}
    </div>

    <h2 class="text-2xl font-extrabold text-gray-900 mt-10">How to pronounce (${W.length} words)</h2>
    <p class="text-gray-600 mt-1">Grouped by pitch pattern. Tap any word to hear it and see the contour.</p>
    ${order.filter((g) => groups[g]).map((g) => `<h3 class="font-bold text-gray-800 mt-5 mb-2">${g} · ${groups[g].length}</h3>
    <div class="flex flex-wrap gap-2">${groups[g].map((x) => chip(`/learn/say/${wslug(x)}.html`, x.w, enw(x.en))).join('')}</div>`).join('')}

    <div class="my-10 p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-center">
      <h2 class="text-2xl font-extrabold">👂 Train your ear — 60 seconds</h2>
      <p class="text-white/80 mt-2 mb-5">Hear it, tap it, build a combo. No mic, no signup, free.</p>
      <a href="/app.html?guest=true&view=ear" class="inline-block bg-white text-indigo-600 font-extrabold px-8 py-4 rounded-2xl hover:scale-105 transition-transform">Play the Ear Test — Free →</a>
    </div>
  </article>
  <footer class="border-t border-gray-200 bg-white py-10 mt-16">
  <div class="max-w-3xl mx-auto px-6 text-sm text-gray-400 flex flex-wrap gap-6 justify-between">
    <span>&copy; 2026 AMOR LLC</span>
    <span class="flex gap-5"><a href="/" class="hover:text-indigo-600">Home</a></span>
  </div>
</footer>
</body></html>`;

writeFileSync(path.join(ROOT, 'public', 'learn', 'index.html'), html);
console.log(`learn hub: ${W.length} words + ${PAIRS.length} pairs + ${EXPLAINERS.length} explainers`);
