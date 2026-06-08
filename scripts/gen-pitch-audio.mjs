// Pre-generate native reference audio for the pitch-practice words as STATIC
// assets (no runtime TTS dependency). Run locally with your own key — the key
// stays in your shell env, never in the repo:
//
//   ELEVENLABS_API_KEY=sk_xxx node scripts/gen-pitch-audio.mjs
//
// Output: public/pitch-audio/<word>.mp3  (overwrites).
// Feeds the HIRAGANA reading (not the kanji) so the model can't misread the
// word (e.g. 友達 → "yōdai"). TTS pitch is approximate either way; the trainer
// teaches pitch via the visual contour, the audio gives a correct-reading model.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('Set ELEVENLABS_API_KEY in your env. Get a free key at elevenlabs.io.');
  process.exit(1);
}

// Premade multilingual voice (works on the free tier). Override with PITCH_VOICE_ID.
const VOICE = process.env.PITCH_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const MODEL = process.env.PITCH_MODEL || 'eleven_multilingual_v2';

// Mirror src/components/pitch/PitchPractice.tsx PRACTICE_WORDS — feed the reading,
// name the file by the word (the app looks up audio by word).
const WORDS = [
  ['日本', 'にほん'], ['学生', 'がくせい'], ['先生', 'せんせい'], ['水', 'みず'],
  ['山', 'やま'], ['川', 'かわ'], ['雨', 'あめ'], ['飴', 'あめ'], ['箸', 'はし'],
  ['橋', 'はし'], ['花', 'はな'], ['鼻', 'はな'], ['母', 'はは'], ['友達', 'ともだち'],
  ['学校', 'がっこう'], ['電話', 'でんわ'], ['名前', 'なまえ'], ['犬', 'いぬ'],
  ['猫', 'ねこ'], ['元気', 'げんき'], ['今日', 'きょう'], ['明日', 'あした'], ['海', 'うみ'],
];

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'pitch-audio');
await mkdir(OUT, { recursive: true });

let made = 0, failed = 0;
for (const [word, reading] of WORDS) {
  const out = path.join(OUT, `${word}.mp3`);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reading, model_id: MODEL }),
      },
    );
    if (!res.ok) {
      failed++;
      console.error(`✗ ${word} (${reading}): ${res.status} ${(await res.text()).slice(0, 120)}`);
      continue;
    }
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    made++;
    console.log(`✓ ${word}.mp3 ← ${reading}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${word}: ${e.message}`);
  }
}
console.log(`\nDone — made ${made}, failed ${failed}. Files in public/pitch-audio/`);
