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
  ['水', 'みず'], ['飴', 'あめ'], ['鼻', 'はな'], ['口', 'くち'],
  ['顔', 'かお'], ['電話', 'でんわ'], ['名前', 'なまえ'], ['時間', 'じかん'],
  ['仕事', 'しごと'], ['車', 'くるま'], ['野菜', 'やさい'], ['魚', 'さかな'],
  ['時計', 'とけい'], ['財布', 'さいふ'], ['鞄', 'かばん'], ['学生', 'がくせい'],
  ['友達', 'ともだち'], ['学校', 'がっこう'], ['会社', 'かいしゃ'], ['旅行', 'りょこう'],
  ['質問', 'しつもん'], ['問題', 'もんだい'], ['新聞', 'しんぶん'], ['電車', 'でんしゃ'],
  ['勉強', 'べんきょう'], ['牛乳', 'ぎゅうにゅう'], ['手', 'て'], ['目', 'め'],
  ['雨', 'あめ'], ['箸', 'はし'], ['母', 'はは'], ['猫', 'ねこ'],
  ['海', 'うみ'], ['空', 'そら'], ['朝', 'あさ'], ['夜', 'よる'],
  ['駅', 'えき'], ['本', 'ほん'], ['元気', 'げんき'], ['今日', 'きょう'],
  ['家族', 'かぞく'], ['映画', 'えいが'], ['天気', 'てんき'], ['眼鏡', 'めがね'],
  ['音楽', 'おんがく'], ['料理', 'りょうり'], ['山', 'やま'], ['川', 'かわ'],
  ['橋', 'はし'], ['花', 'はな'], ['父', 'ちち'], ['犬', 'いぬ'],
  ['店', 'みせ'], ['足', 'あし'], ['耳', 'みみ'], ['肉', 'にく'],
  ['塩', 'しお'], ['日本', 'にほん'], ['卵', 'たまご'], ['砂糖', 'さとう'],
  ['飛行機', 'ひこうき'], ['果物', 'くだもの'], ['自転車', 'じてんしゃ'], ['明日', 'あした'],
  ['頭', 'あたま'], ['先生', 'せんせい'],
];

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'pitch-audio');
await mkdir(OUT, { recursive: true });

// Optional: pass specific words as args to regenerate ONLY those (saves credits):
//   node scripts/gen-pitch-audio.mjs 友達 学生
const only = process.argv.slice(2);
const todo = only.length ? WORDS.filter(([w]) => only.includes(w)) : WORDS;

let made = 0, failed = 0;
for (const [word, reading] of todo) {
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
