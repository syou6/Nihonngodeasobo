// Single source of truth: parse EAR_PAIRS out of src/components/pitch/earPairs.ts
// (TS can't be imported from plain node — we extract the literal array by regex;
// the file's shape is enforced by its own interface, so the regex stays stable).
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ROOT = path.resolve(MK, '..');
const EARPAIRS_TS = path.join(ROOT, 'src', 'components', 'pitch', 'earPairs.ts');
export const PAIR_AUDIO_DIR = path.join(ROOT, 'public', 'pair-audio');

const SMALL_KANA = /[ゃゅょぁぃぅぇぉャュョァィゥェォ]/;

// Split a reading into morae (small kana merge into the previous mora).
export function morae(reading) {
  return [...reading].reduce((acc, ch) => (
    SMALL_KANA.test(ch) && acc.length
      ? [...acc.slice(0, -1), acc[acc.length - 1] + ch]
      : [...acc, ch]
  ), []);
}

// Dictionary pitch pattern → per-mora H/L array.
// HL = 頭高 (first mora high, rest low). LH = rise after mora 1 (尾高/平板 shape).
export function patArray(pattern, moraCount) {
  return Array.from({ length: moraCount }, (_, i) =>
    pattern === 'HL' ? (i === 0 ? 1 : 0) : (i === 0 ? 0 : 1));
}

// 'rain 🌧' → { en: 'rain', emoji: '🌧' } (emoji is always the last token).
function splitEn(enWithEmoji) {
  const parts = enWithEmoji.trim().split(/\s+/);
  return { en: parts.slice(0, -1).join(' '), emoji: parts[parts.length - 1] };
}

const ENTRY_RE = /reading:\s*'([^']+)',\s*a:\s*\{\s*word:\s*'([^']+)',\s*en:\s*'([^']+)',\s*audio:\s*'([^']+)',\s*pattern:\s*'(HL|LH)'\s*\},\s*b:\s*\{\s*word:\s*'([^']+)',\s*en:\s*'([^']+)',\s*audio:\s*'([^']+)',\s*pattern:\s*'(HL|LH)'\s*\}/g;

function side(word, enRaw, audio, pattern, moraList) {
  const { en, emoji } = splitEn(enRaw);
  return {
    word, en, emoji, audio, pattern,
    pat: patArray(pattern, moraList.length),
    audioFile: path.join(PAIR_AUDIO_DIR, `${audio}.mp3`),
  };
}

// Load all pairs, enriched for rendering.
export function loadPairs() {
  const src = readFileSync(EARPAIRS_TS, 'utf8');
  const pairs = [];
  for (const m of src.matchAll(ENTRY_RE)) {
    const [, reading, aw, aen, aau, apat, bw, ben, bau, bpat] = m;
    const moraList = morae(reading);
    pairs.push({
      reading,
      morae: moraList,
      a: side(aw, aen, aau, apat, moraList),
      b: side(bw, ben, bau, bpat, moraList),
    });
  }
  if (!pairs.length) throw new Error(`no pairs parsed from ${EARPAIRS_TS} — regex/file drift?`);
  return pairs;
}
