// Programmatic SEO: one indexable page per verified minimal pair. Each targets a
// real long-tail query (e.g. "hashi chopsticks vs bridge pronunciation"), embeds
// the REAL distinct Kyoko audio we already ship, explains the pitch difference,
// and funnels to the Ear Sprint game. Pages share the /learn look. Honest set:
// only the 10 pairs used in-game (audio verified distinct).
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/sho/nihongo-web';
const OUT = path.join(ROOT, 'public', 'learn');

// a = HIGH-low (atamadaka), b = low-HIGH. ex = a short, correct usage sentence.
const PAIRS = [
  { slug: 'hashi-chopsticks-vs-bridge', reading: 'はし', romaji: 'hashi',
    a: { w: '箸', en: 'chopsticks', emoji: '🥢', au: 'hashi_chopsticks', ex: '箸でご飯を食べる', exEn: 'eat rice with chopsticks' },
    b: { w: '橋', en: 'bridge', emoji: '🌉', au: 'hashi_bridge', ex: '橋を渡る', exEn: 'cross the bridge' } },
  { slug: 'ame-rain-vs-candy', reading: 'あめ', romaji: 'ame',
    a: { w: '雨', en: 'rain', emoji: '🌧', au: 'ame_rain', ex: '雨が降っている', exEn: "it's raining" },
    b: { w: '飴', en: 'candy', emoji: '🍬', au: 'ame_candy', ex: '飴をなめる', exEn: 'suck on candy' } },
  { slug: 'kami-god-vs-paper', reading: 'かみ', romaji: 'kami',
    a: { w: '神', en: 'god', emoji: '⛩️', au: 'kami_god', ex: '神に祈る', exEn: 'pray to god' },
    b: { w: '紙', en: 'paper', emoji: '📄', au: 'kami_paper', ex: '紙に書く', exEn: 'write on paper' } },
  { slug: 'ima-now-vs-living-room', reading: 'いま', romaji: 'ima',
    a: { w: '今', en: 'now', emoji: '⏰', au: 'ima_now', ex: '今行く', exEn: "I'm going now" },
    b: { w: '居間', en: 'living room', emoji: '🛋️', au: 'ima_room', ex: '居間でくつろぐ', exEn: 'relax in the living room' } },
  { slug: 'sake-alcohol-vs-salmon', reading: 'さけ', romaji: 'sake',
    a: { w: '酒', en: 'alcohol / sake', emoji: '🍶', au: 'sake_alcohol', ex: 'お酒を飲む', exEn: 'drink alcohol' },
    b: { w: '鮭', en: 'salmon', emoji: '🐟', au: 'sake_salmon', ex: '鮭を焼く', exEn: 'grill salmon' } },
  { slug: 'kaki-oyster-vs-persimmon', reading: 'かき', romaji: 'kaki',
    a: { w: '牡蠣', en: 'oyster', emoji: '🦪', au: 'kaki_oyster', ex: '牡蠣を食べる', exEn: 'eat oysters' },
    b: { w: '柿', en: 'persimmon', emoji: '🟠', au: 'kaki_persimmon', ex: '柿が甘い', exEn: 'the persimmon is sweet' } },
  { slug: 'kiru-to-cut-vs-to-wear', reading: 'きる', romaji: 'kiru',
    a: { w: '切る', en: 'to cut', emoji: '✂️', au: 'kiru_cut', ex: '紙を切る', exEn: 'cut the paper' },
    b: { w: '着る', en: 'to wear', emoji: '👕', au: 'kiru_wear', ex: '服を着る', exEn: 'put on clothes' } },
  { slug: 'kame-jar-vs-turtle', reading: 'かめ', romaji: 'kame',
    a: { w: '瓶', en: 'jar', emoji: '🏺', au: 'kame_jar', ex: '瓶に水を入れる', exEn: 'put water in the jar' },
    b: { w: '亀', en: 'turtle', emoji: '🐢', au: 'kame_turtle', ex: '亀が泳ぐ', exEn: 'the turtle swims' } },
  { slug: 'umi-sea-vs-pus', reading: 'うみ', romaji: 'umi',
    a: { w: '膿', en: 'pus', emoji: '🤕', au: 'umi_pus', ex: '膿が出る', exEn: 'pus comes out' },
    b: { w: '海', en: 'sea', emoji: '🌊', au: 'umi_sea', ex: '海で泳ぐ', exEn: 'swim in the sea' } },
  { slug: 'kaeru-to-go-home-vs-frog', reading: 'かえる', romaji: 'kaeru',
    a: { w: '帰る', en: 'to go home', emoji: '🏠', au: 'kaeru_return', ex: '家に帰る', exEn: 'go home' },
    b: { w: '蛙', en: 'frog', emoji: '🐸', au: 'kaeru_frog', ex: '蛙が鳴く', exEn: 'the frog croaks' } },
];

const SITE = 'https://nihongo.amorjp.com';

const card = (s, pat) => `
        <button onclick="hear('${s.au}',this)" class="ja bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:scale-[1.03] hover:border-indigo-200 transition-all text-center">
          <div class="text-5xl font-extrabold text-gray-900">${s.w}</div>
          <div class="text-sm text-gray-500 mt-1">${s.emoji} ${s.en}</div>
          <div class="font-mono text-xs text-gray-400 mt-1">${pat}</div>
          <div class="text-[11px] font-bold text-indigo-600 mt-1.5">🔊 tap to hear</div>
        </button>`;

function page(p) {
  const { a, b, reading, romaji } = p;
  const title = `${a.w} vs ${b.w}: ${cap(a.en)} or ${cap(b.en)}? (${reading}) — Japanese Pitch`;
  const desc = `${a.w} (${a.en}) and ${b.w} (${b.en}) are both read ${reading} (${romaji}) — only the pitch differs. Tap to hear the real difference, then train your ear free.`;
  const url = `${SITE}/learn/${p.slug}.html`;
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: `What is the difference between ${a.w} and ${b.w}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Both are read ${reading} (${romaji}), but the pitch accent differs: ${a.w} (${a.en}) is HIGH-low, and ${b.w} (${b.en}) is low-HIGH. The pitch is the only thing that tells the two words apart.` } },
      { '@type': 'Question', name: `How do you say ${romaji} for "${b.en}" in Japanese?`,
        acceptedAnswer: { '@type': 'Answer', text: `${b.en} is ${b.w} (${reading}), pronounced low-HIGH — the voice starts low and rises. Compare it with ${a.w} (${a.en}), which is HIGH-low.` } },
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
<meta property="og:title" content="${a.w} vs ${b.w}: ${cap(a.en)} or ${cap(b.en)}? (${reading})"/>
<meta property="og:description" content="Same sounds ${reading} — different pitch, different word. Tap to hear ${a.w} vs ${b.w}, then play the ear game."/>
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
  .mora{display:inline-block;padding:.1em .4em;border-radius:.35em;font-weight:700}
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
    <p class="text-sm text-indigo-600 font-semibold">Japanese minimal pairs</p>
    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mt-1">${a.w} vs ${b.w}: <span class="text-gray-500">${cap(a.en)} or ${cap(b.en)}?</span></h1>
    <p class="text-gray-500 mt-4 text-lg">Both words are read <b class="ja text-gray-700">${reading}</b> (<i>${romaji}</i>) — the exact same sounds. The <strong>pitch accent</strong> is the only difference, and it changes the meaning completely. Tap each card to hear the real native audio. 🔊</p>

    <div class="grid grid-cols-2 gap-4 my-8">
      ${card(a, 'HIGH-low')}
      ${card(b, 'low-HIGH')}
    </div>

    <h2 class="text-2xl font-extrabold text-gray-900 mt-10">How the pitch differs</h2>
    <p class="text-gray-600 mt-2"><b class="ja">${a.w}</b> (${a.en}) is <strong>HIGH-low</strong> — the voice starts high on the first mora and drops:</p>
    <p class="mt-2 ja text-xl"><span class="mora hi">${reading[0]}</span><span class="mora lo">${reading.slice(1)}</span></p>
    <p class="text-gray-600 mt-4"><b class="ja">${b.w}</b> (${b.en}) is <strong>low-HIGH</strong> — the voice starts low and rises, then stays up:</p>
    <p class="mt-2 ja text-xl"><span class="mora lo">${reading[0]}</span><span class="mora hi">${reading.slice(1)}</span></p>

    <h2 class="text-2xl font-extrabold text-gray-900 mt-10">In a sentence</h2>
    <div class="space-y-3 mt-3">
      <div class="rounded-xl bg-white border border-gray-100 p-4"><p class="ja text-lg text-gray-900">${a.ex}</p><p class="text-sm text-gray-400">${a.exEn} — <b class="ja">${a.w}</b> ${a.emoji}</p></div>
      <div class="rounded-xl bg-white border border-gray-100 p-4"><p class="ja text-lg text-gray-900">${b.ex}</p><p class="text-sm text-gray-400">${b.exEn} — <b class="ja">${b.w}</b> ${b.emoji}</p></div>
    </div>

    <div class="my-10 p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-center">
      <h2 class="text-2xl font-extrabold">👂 Can you hear it every time?</h2>
      <p class="text-white/80 mt-2 mb-5">${a.w} or ${b.w}? Hear it, tap it, build a combo. 60 seconds, no mic, free.</p>
      <a href="/app.html?guest=true&view=ear" class="inline-block bg-white text-indigo-600 font-extrabold px-8 py-4 rounded-2xl hover:scale-105 transition-transform">Play the Ear Test — Free →</a>
    </div>

    <p class="text-gray-600">Pitch accent isn't guessable from spelling — you learn it per word, by ear. The fastest way is minimal-pair listening like this. Related: <a href="/learn/can-you-hear-japanese-pitch.html" class="text-indigo-600 font-semibold">can you hear Japanese pitch?</a> · <a href="/learn/japanese-pitch-accent-patterns.html" class="text-indigo-600 font-semibold">the 4 pitch patterns</a></p>

    <h2 class="text-xl font-extrabold text-gray-900 mt-10">More minimal pairs</h2>
    <div class="flex flex-wrap gap-2 mt-3">
      ${PAIRS.filter((x) => x.slug !== p.slug).map((x) => `<a href="/learn/${x.slug}.html" class="ja text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 text-gray-600 hover:border-indigo-300 hover:text-indigo-600">${x.a.w} / ${x.b.w}</a>`).join('')}
    </div>
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
  function hear(au,el){ try{ new Audio('/pair-audio/'+au+'.mp3').play(); }catch(e){} el.animate([{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:240}); if(window.gtag)window.gtag('event','learn_hear_pair',{pair:au}); }
</script>
</body></html>`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

mkdirSync(OUT, { recursive: true });
for (const p of PAIRS) writeFileSync(path.join(OUT, `${p.slug}.html`), page(p));
console.log(`wrote ${PAIRS.length} pages: ${PAIRS.map((p) => p.slug).join(', ')}`);
// emit slugs for sitemap
writeFileSync('/tmp/pair-slugs.json', JSON.stringify(PAIRS.map((p) => p.slug)));
