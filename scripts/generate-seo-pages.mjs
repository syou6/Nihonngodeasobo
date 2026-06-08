// Generate keyword-targeted SEO guide pages from the marketing content banks.
// Output: public/learn/*.html (brand-styled, JSON-LD, internal links, CTA).
//   node scripts/generate-seo-pages.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public', 'learn');
mkdirSync(OUT, { recursive: true });
const bank1 = JSON.parse(readFileSync(path.join(ROOT, 'marketing/content-bank.json'), 'utf8')).entries;
const bank2 = JSON.parse(readFileSync(path.join(ROOT, 'marketing/content-bank-30.json'), 'utf8')).entries;
const grammar = [...bank1, ...bank2].filter((e) => e.type === 'grammar');
const pitch = bank1.filter((e) => e.type === 'pitch');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const HEAD = (title, desc, slug, jsonld) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="https://nihongo.amorjp.com/learn/${slug}.html"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="https://nihongo.amorjp.com/learn/${slug}.html"/>
<meta property="og:image" content="https://nihongo.amorjp.com/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>
  body{font-family:'Inter',sans-serif;background:#F9FAFB}
  h1,h2,h3{font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}
  .wrong{color:#e11d48;font-weight:700}.right{color:#059669;font-weight:700}
  .ja{font-family:'Plus Jakarta Sans','Hiragino Sans',sans-serif}
</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body class="text-gray-800">
<nav class="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-10">
  <div class="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 font-extrabold tracking-tight text-gray-900"><img src="/logo.png" class="w-8 h-8" alt="NihonGo"/> NihonGo</a>
    <a href="/app.html?signup=true" class="bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-indigo-500">Start Free</a>
  </div>
</nav>`;

const CTA = `<div class="my-12 p-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-orange-50 border border-indigo-100 text-center">
  <h2 class="text-2xl font-extrabold text-gray-900">Stop making these mistakes 🍣</h2>
  <p class="text-gray-600 mt-2 mb-5">NihonGo's AI catches them in your own writing — and tells you why. Free to start.</p>
  <a href="/app.html?signup=true" class="inline-block bg-indigo-600 text-white font-extrabold px-8 py-4 rounded-2xl hover:scale-105 transition-transform">Try NihonGo Free →</a>
</div>`;

const FOOT = `<footer class="border-t border-gray-200 bg-white py-10 mt-16">
  <div class="max-w-3xl mx-auto px-6 text-sm text-gray-400 flex flex-wrap gap-6 justify-between">
    <span>&copy; 2026 AMOR LLC</span>
    <span class="flex gap-5">
      <a href="/learn/common-japanese-mistakes.html" class="hover:text-indigo-600">Common Mistakes</a>
      <a href="/learn/japanese-pitch-accent.html" class="hover:text-indigo-600">Pitch Accent</a>
      <a href="/" class="hover:text-indigo-600">Home</a>
    </span>
  </div>
</footer></body></html>`;

// ---- Page 1: Common Japanese mistakes ----
{
  const title = `${grammar.length} Common Japanese Mistakes Beginners Make (and How to Fix Them)`;
  const desc = `A practical list of the most common Japanese grammar mistakes learners make — with the correction and a clear why for each. JLPT N5–N3.`;
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: grammar.slice(0, 8).map((e) => ({
      '@type': 'Question', name: `Is "${e.wrong}" correct Japanese?`,
      acceptedAnswer: { '@type': 'Answer', text: `No. The correct form is "${e.right}". ${e.why}` },
    })),
  };
  const items = grammar.map((e, i) => `
    <div class="py-6 border-b border-gray-100">
      <h3 class="text-lg font-bold text-gray-900 mb-2">${i + 1}. ${esc(e.hook)} <span class="text-xs font-bold text-indigo-500 align-middle">${e.level}</span></h3>
      <p class="ja text-xl mb-1"><span class="wrong">❌ ${esc(e.wrong)}</span></p>
      <p class="ja text-xl mb-2"><span class="right">✅ ${esc(e.right)}</span></p>
      <p class="text-gray-600">${esc(e.why)}</p>
    </div>`).join('');
  const html = HEAD(title, desc, 'common-japanese-mistakes', faq) + `
  <article class="max-w-3xl mx-auto px-6 py-12">
    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">${grammar.length} Common Japanese Mistakes Beginners Make</h1>
    <p class="text-gray-500 mt-4 text-lg">If your Japanese sounds slightly off, it's probably one of these. Each mistake below shows the wrong version, the natural correction, and <strong>why</strong> — the part most apps skip. Levels N5–N3.</p>
    ${CTA}
    ${items}
    ${CTA}
  </article>` + FOOT;
  writeFileSync(path.join(OUT, 'common-japanese-mistakes.html'), html);
  console.log('✓ common-japanese-mistakes.html (' + grammar.length + ' items)');
}

// ---- Page 2: Pitch accent ----
{
  const title = `Japanese Pitch Accent for Beginners: ${pitch.length} Minimal Pairs (はし, あめ…)`;
  const desc = `Learn Japanese pitch accent with minimal pairs like 箸 vs 橋 (hashi). Same sounds, different pitch, different meaning — with simple high/low patterns.`;
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: pitch.map((e) => ({
      '@type': 'Question', name: `What's the difference between ${e.a.word} and ${e.b.word} (${e.reading})?`,
      acceptedAnswer: { '@type': 'Answer', text: `They sound the same (${e.reading}) but the pitch differs: ${e.a.word} (${e.a.en}) is ${e.a.hl}, ${e.b.word} (${e.b.en}) is ${e.b.hl}. The pitch changes the meaning.` },
    })),
  };
  const rows = pitch.map((e) => `
    <div class="py-6 border-b border-gray-100">
      <p class="text-sm text-gray-400 mb-2">Same sound: <strong class="ja text-gray-700">${esc(e.reading)}</strong></p>
      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100"><div class="ja text-3xl font-extrabold">${esc(e.a.word)}</div><div class="text-gray-500">${esc(e.a.en)}</div><div class="text-xs font-mono text-emerald-600 mt-1">${e.a.hl}</div></div>
        <div class="p-4 rounded-2xl bg-rose-50 border border-rose-100"><div class="ja text-3xl font-extrabold">${esc(e.b.word)}</div><div class="text-gray-500">${esc(e.b.en)}</div><div class="text-xs font-mono text-rose-600 mt-1">${e.b.hl}</div></div>
      </div>
    </div>`).join('');
  const html = HEAD(title, desc, 'japanese-pitch-accent', faq) + `
  <article class="max-w-3xl mx-auto px-6 py-12">
    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">Japanese Pitch Accent for Beginners</h1>
    <p class="text-gray-500 mt-4 text-lg">In Japanese, two words can have the <em>exact same sounds</em> but different <strong>pitch</strong> — and that changes the meaning entirely. Here are ${pitch.length} classic minimal pairs. <strong>H</strong> = high, <strong>L</strong> = low.</p>
    ${CTA}
    ${rows}
    <p class="text-gray-500 mt-8">Want to train your own pitch? NihonGo scores your pitch accent live as you speak.</p>
    ${CTA}
  </article>` + FOOT;
  writeFileSync(path.join(OUT, 'japanese-pitch-accent.html'), html);
  console.log('✓ japanese-pitch-accent.html (' + pitch.length + ' pairs)');
}
