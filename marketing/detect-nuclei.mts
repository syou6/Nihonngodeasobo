// Run the APP'S OWN tested detector on each Kyoko word audio to get a
// self-consistent ground-truth nucleus for the 'Where's the drop?' game.
// Uses the same pitchy + moraMedians + detectAccentNucleus as the live trainer,
// so the game's answer = exactly what the app would hear in that audio.
//   npx tsx marketing/detect-nuclei.mts > /tmp/nuclei.json
import { PitchDetector } from 'pitchy';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { moraMedians, detectAccentNucleus, type PitchFrame } from '../src/lib/pitch-analyzer';

const words = JSON.parse(readFileSync('/tmp/words.json', 'utf8')) as { w: string; r: string; n: number; p: string }[];
const SMALL = new Set([...'ゃゅょぁぃぅぇぉ']);
const moraCount = (r: string) => { let n = 0; for (const c of r) if (!SMALL.has(c)) n++; return n; };

function framesFor(wav: string): PitchFrame[] {
  // decode to 44100 mono f32 little-endian
  const raw = execFileSync('ffmpeg', ['-v', 'quiet', '-i', wav, '-ar', '44100', '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 1 << 26 });
  const data = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
  const SR = 44100, FFT = 2048, HOP = 512;
  const det = PitchDetector.forFloat32Array(FFT);
  const frames: PitchFrame[] = [];
  for (let i = 0; i + FFT <= data.length; i += HOP) {
    const buf = data.slice(i, i + FFT);
    const [pitch, clarity] = det.findPitch(buf, SR);
    const voiced = clarity >= 0.85 && pitch >= 70 && pitch <= 400;
    frames.push({ time: (i / SR) * 1000, pitch: voiced ? pitch : null, clarity });
  }
  return frames;
}

const out: { word: string; reading: string; morae: string[]; dropAfter: number; agreesDict: boolean }[] = [];
const morae = (r: string) => { const o: string[] = []; for (const c of r) { if (SMALL.has(c) && o.length) o[o.length - 1] += c; else o.push(c); } return o; };

for (const x of words) {
  const wav = path.resolve('public/word-audio', `${x.w}.wav`);
  if (!existsSync(wav)) continue;
  const mc = moraCount(x.r);
  const frames = framesFor(wav);
  const m = moraMedians(frames, mc);
  const res = detectAccentNucleus(m);
  // res.nucleus: 0 = heiban (no drop), else drop after that mora (1-indexed)
  const exp = x.n <= mc ? x.n : mc;
  out.push({ word: x.w, reading: x.r, morae: morae(x.r), dropAfter: res.nucleus, agreesDict: res.nucleus === exp });
}

console.log(JSON.stringify(out, null, 0));
console.error(`detected ${out.length} · agrees-dict ${out.filter((o) => o.agreesDict).length}`);
