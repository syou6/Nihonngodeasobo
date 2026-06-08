// Pre-generate native reference audio for the pitch-practice words as STATIC
// assets (no runtime TTS dependency). Run locally with your own key — the key
// stays in your shell env, never in the repo:
//
//   ELEVENLABS_API_KEY=sk_xxx node scripts/gen-pitch-audio.mjs
//
// Output: public/pitch-audio/<word>.mp3  (skips files that already exist).
// Feeds the KANJI word (not the kana) so the model picks the right reading +
// pitch for common words. Review the output; swap any word that sounds wrong.

import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('Set ELEVENLABS_API_KEY in your env. Get a free key at elevenlabs.io.');
  process.exit(1);
}

// Premade multilingual voice (works on the free tier). Override with PITCH_VOICE_ID.
const VOICE = process.env.PITCH_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const MODEL = process.env.PITCH_MODEL || 'eleven_multilingual_v2';

// Mirror src/components/pitch/PitchPractice.tsx PRACTICE_WORDS.
const WORDS = [
  '日本', '学生', '先生', '水', '山', '川', '雨', '飴', '箸', '橋', '花', '鼻',
  '母', '友達', '学校', '電話', '名前', '犬', '猫', '元気', '今日', '明日', '海',
];

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'pitch-audio');
await mkdir(OUT, { recursive: true });

const exists = async (p) => access(p).then(() => true).catch(() => false);

let made = 0, skipped = 0, failed = 0;
for (const word of WORDS) {
  const out = path.join(OUT, `${word}.mp3`);
  if (await exists(out)) { skipped++; continue; }
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word, model_id: MODEL }),
      },
    );
    if (!res.ok) {
      failed++;
      console.error(`✗ ${word}: ${res.status} ${(await res.text()).slice(0, 120)}`);
      continue;
    }
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    made++;
    console.log(`✓ ${word}.mp3`);
  } catch (e) {
    failed++;
    console.error(`✗ ${word}: ${e.message}`);
  }
}
console.log(`\nDone — made ${made}, skipped ${skipped}, failed ${failed}. Files in public/pitch-audio/`);
