// Build-time native pitch-contour extraction.
//
// Decodes each public/pitch-audio/<word>.mp3, runs McLeod pitch detection
// (pitchy) over it, and writes a NORMALIZED contour per word to
// public/pitch-contours.json. The app overlays this real native shape on the
// trainer graph (falling back to the idealized model line when a word is
// missing). We normalize to relative shape — x in [0,1] over the voiced span,
// y in [0,1] (1 = highest) in semitone space — because pitch accent is about
// the RELATIVE rise/fall and downstep timing, not the speaker's absolute Hz.
//
//   node scripts/gen-pitch-contours.mjs            # all words
//   node scripts/gen-pitch-contours.mjs 箸 水      # only these
//
// Requires the devDependency mpg123-decoder (wasm mp3 decoder).

import { MPEGDecoder } from 'mpg123-decoder';
import { PitchDetector } from 'pitchy';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AUDIO_DIR = path.join(ROOT, 'public', 'pitch-audio');
const OUT = path.join(ROOT, 'public', 'pitch-contours.json');

const WINDOW = 1024;
const HOP = 256;
const MIN_CLARITY = 0.6;
const MIN_HZ = 70;
const MAX_HZ = 450;
const BUCKETS = 40; // resample every contour to this many points

const semitones = (hz) => 12 * Math.log2(hz);

function extractContour(pcm, sampleRate) {
  const detector = PitchDetector.forFloat32Array(WINDOW);
  const pts = []; // [tSec, semitone]
  for (let i = 0; i + WINDOW <= pcm.length; i += HOP) {
    const [hz, clarity] = detector.findPitch(pcm.subarray(i, i + WINDOW), sampleRate);
    if (clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ) {
      pts.push([i / sampleRate, semitones(hz)]);
    }
  }
  if (pts.length < 4) return null;

  const t0 = pts[0][0];
  const t1 = pts[pts.length - 1][0];
  const span = t1 - t0 || 1;
  const sts = pts.map((p) => p[1]);
  const lo = Math.min(...sts);
  const hi = Math.max(...sts);
  const range = hi - lo || 1;

  // Bin into evenly-spaced x buckets, averaging the normalized y in each.
  const sumY = new Array(BUCKETS).fill(0);
  const cnt = new Array(BUCKETS).fill(0);
  for (const [t, st] of pts) {
    const xn = (t - t0) / span;
    const b = Math.min(BUCKETS - 1, Math.floor(xn * BUCKETS));
    sumY[b] += (st - lo) / range;
    cnt[b] += 1;
  }
  const x = [];
  const y = [];
  for (let b = 0; b < BUCKETS; b++) {
    if (cnt[b] > 0) {
      x.push(+((b + 0.5) / BUCKETS).toFixed(3));
      y.push(+(sumY[b] / cnt[b]).toFixed(3));
    }
  }
  return x.length >= 4 ? { x, y } : null;
}

const decoder = new MPEGDecoder();
await decoder.ready;

const only = process.argv.slice(2);
const files = (await readdir(AUDIO_DIR)).filter((f) => f.endsWith('.mp3'));
const words = files.map((f) => f.replace(/\.mp3$/, ''));
const todo = only.length ? words.filter((w) => only.includes(w)) : words;

const out = {};
let ok = 0;
let skipped = 0;
for (const word of todo) {
  try {
    const buf = new Uint8Array(await readFile(path.join(AUDIO_DIR, `${word}.mp3`)));
    const { channelData, sampleRate } = decoder.decode(buf);
    decoder.reset();
    const contour = extractContour(channelData[0], sampleRate);
    if (contour) {
      out[word] = contour;
      ok++;
    } else {
      skipped++;
      console.warn(`skip ${word}: too few voiced frames`);
    }
  } catch (e) {
    skipped++;
    console.warn(`skip ${word}: ${e.message}`);
  }
}
decoder.free();

// Merge with any existing contours so a partial (word-list) run doesn't drop the rest.
let existing = {};
if (only.length) {
  try {
    existing = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    /* no prior file */
  }
}
await writeFile(OUT, JSON.stringify({ ...existing, ...out }));
console.log(`Wrote ${OUT}: ${ok} contours (${skipped} skipped)`);
