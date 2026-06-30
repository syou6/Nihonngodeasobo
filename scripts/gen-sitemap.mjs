// Rebuild sitemap.xml from the actual files on disk: static roots + everything
// under public/learn (flat pair/explainer pages + per-word pages in /say).
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/sho/nihongo-web';
const SITE = 'https://nihongo.amorjp.com';
const LEARN = path.join(ROOT, 'public', 'learn');

// lastmod = file mtime (YYYY-MM-DD). Gives Google a real freshness signal
// per URL so it can prioritise crawl. Falls back to undefined if stat fails.
const lastmodFor = (relPath) => {
  try {
    const abs = path.join(ROOT, 'public', relPath.replace(/^\//, ''));
    return statSync(abs).mtime.toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
};

// `file` is the on-disk path (relative to public/) used to read lastmod;
// it differs from `loc` for directory-style URLs that map to index.html.
const STATIC = [
  { loc: '/', file: 'index.html', freq: 'weekly', pri: '1.0' },
  { loc: '/terms.html', file: 'terms.html', freq: 'yearly', pri: '0.3' },
  { loc: '/privacy.html', file: 'privacy.html', freq: 'yearly', pri: '0.3' },
  { loc: '/legal.html', file: 'legal.html', freq: 'yearly', pri: '0.3' },
];

const urls = [...STATIC];

// flat /learn/*.html
for (const f of readdirSync(LEARN)) {
  if (!f.endsWith('.html')) continue;
  if (f === 'index.html') { urls.push({ loc: '/learn/', file: 'learn/index.html', freq: 'weekly', pri: '0.9' }); continue; }
  const explainer = ['can-you-hear-japanese-pitch', 'japanese-pitch-accent', 'japanese-pitch-accent-patterns', 'why-you-sound-foreign-in-japanese', 'common-japanese-mistakes', 'how-to-learn-japanese-pitch-accent'].includes(f.replace('.html', ''));
  urls.push({ loc: `/learn/${f}`, file: `learn/${f}`, freq: 'monthly', pri: explainer ? '0.9' : '0.8' });
}
// per-word /learn/say/*.html are intentionally EXCLUDED from the sitemap:
// they carry <meta name="robots" content="noindex,follow"> (near-identical
// templated pages — kept for users/social, withheld from the index to
// concentrate crawl + quality signal on the richer guide pages above).

const body = urls.map((u) => {
  const lastmod = lastmodFor(u.file);
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${SITE}${u.loc}</loc>${lastmodLine}\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`;
}).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml);
console.log(`sitemap: ${urls.length} urls`);
