// Rebuild sitemap.xml from the actual files on disk: static roots + everything
// under public/learn (flat pair/explainer pages + per-word pages in /say).
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/sho/nihongo-web';
const SITE = 'https://nihongo.amorjp.com';
const LEARN = path.join(ROOT, 'public', 'learn');

const STATIC = [
  { loc: '/', freq: 'weekly', pri: '1.0' },
  { loc: '/terms.html', freq: 'yearly', pri: '0.3' },
  { loc: '/privacy.html', freq: 'yearly', pri: '0.3' },
  { loc: '/legal.html', freq: 'yearly', pri: '0.3' },
];

const urls = [...STATIC];

// flat /learn/*.html
for (const f of readdirSync(LEARN)) {
  if (!f.endsWith('.html')) continue;
  if (f === 'index.html') { urls.push({ loc: '/learn/', freq: 'weekly', pri: '0.9' }); continue; }
  const explainer = ['can-you-hear-japanese-pitch', 'japanese-pitch-accent', 'japanese-pitch-accent-patterns', 'why-you-sound-foreign-in-japanese', 'common-japanese-mistakes', 'how-to-learn-japanese-pitch-accent'].includes(f.replace('.html', ''));
  urls.push({ loc: `/learn/${f}`, freq: 'monthly', pri: explainer ? '0.9' : '0.8' });
}
// per-word /learn/say/*.html
const sayDir = path.join(LEARN, 'say');
try {
  for (const f of readdirSync(sayDir)) {
    if (f.endsWith('.html')) urls.push({ loc: `/learn/say/${f}`, freq: 'monthly', pri: '0.7' });
  }
} catch { /* no say dir */ }

const body = urls.map((u) => `  <url>\n    <loc>${SITE}${u.loc}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml);
console.log(`sitemap: ${urls.length} urls`);
