// Batch driver: renders the FULL content calendar in one run.
// For every pair in src/components/pitch/earPairs.ts →
//   marketing/out-batch/NN_<reading>_<A><B>/
//     quiz.mp4            (comment-driven video, 13s, BGM + real audio)
//     01..04_*.png        (photo-mode carousel, same quiz silent-safe)
//     投稿文_video.txt     (caption + pinned comment + reply templates)
//     投稿文_slides.txt
// Answer side alternates A/B by index so comment sections can't pattern-match.
//
//   node marketing/generate-batch.mjs                 # all pairs
//   node marketing/generate-batch.mjs --only あめ,かみ  # subset by reading
//   node marketing/generate-batch.mjs --skip-existing # resume interrupted run
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadPairs } from './lib/pairs.mjs';
import { renderQuizVideo, renderQuizSlides } from './lib/render-quiz.mjs';
import { videoCaption, slidesCaption } from './lib/captions.mjs';

const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-batch');

const args = process.argv.slice(2);
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const only = onlyArg ? onlyArg.split(',') : null;
const skipExisting = args.includes('--skip-existing');

const allPairs = loadPairs();
const pairs = only ? allPairs.filter((p) => only.includes(p.reading)) : allPairs;
if (!pairs.length) {
  console.error(`no pairs matched --only ${onlyArg}; available: ${allPairs.map((p) => p.reading).join(',')}`);
  process.exit(1);
}

// Preflight: every side must have its audio file.
const missing = pairs.flatMap((p) => [p.a, p.b].filter((s) => !existsSync(s.audioFile)).map((s) => s.audioFile));
if (missing.length) {
  console.error(`missing audio:\n${missing.join('\n')}`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const started = Date.now();

for (let i = 0; i < pairs.length; i++) {
  const pair = pairs[i];
  const answerSide = allPairs.indexOf(pair) % 2 === 0 ? 'a' : 'b'; // stable per pair, not per run subset
  const nn = String(allPairs.indexOf(pair) + 1).padStart(2, '0');
  const dir = path.join(OUT, `${nn}_${pair.reading}_${pair.a.word}${pair.b.word}`);
  const videoOut = path.join(dir, 'quiz.mp4');

  if (skipExisting && existsSync(videoOut)) {
    console.log(`⏭  ${nn} ${pair.reading} (exists)`);
    continue;
  }
  await mkdir(dir, { recursive: true });

  console.log(`▶ ${nn} ${pair.reading} ${pair.a.word}/${pair.b.word} (answer=${answerSide.toUpperCase()})`);
  await renderQuizVideo(browser, pair, answerSide, videoOut);
  await renderQuizSlides(browser, pair, answerSide, dir);
  await writeFile(path.join(dir, '投稿文_video.txt'), videoCaption(pair, answerSide));
  await writeFile(path.join(dir, '投稿文_slides.txt'), slidesCaption(pair, answerSide));
  console.log(`✅ ${nn} ${pair.reading} → ${dir}`);
}

await browser.close();
console.log(`\ndone: ${pairs.length} pairs in ${((Date.now() - started) / 60000).toFixed(1)} min → ${OUT}`);
console.log('投稿順: 01から毎日1本、動画とスライド交互。固定コメント+全返信を忘れるな。');
