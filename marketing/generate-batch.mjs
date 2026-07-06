// Content-calendar driver: builds a multi-week posting queue from the verified
// pairs (earPairs.ts) × hook variants (lib/hooks.mjs). One dictionary-correct
// pair yields several distinct-feeling posts, so 10 pairs → 30+ days of content
// with zero unverified pitch.
//
// Output: marketing/out-batch/NN_<reading>_<A><B>_<hook>/
//   quiz.mp4, 01..04_*.png, 投稿文_video.txt, 投稿文_slides.txt
// NN is the POST ORDER (interleaved: never the same pair or hook twice in a row).
//
//   node marketing/generate-batch.mjs                 # 1 hook/pair (10 posts)
//   node marketing/generate-batch.mjs --hooks 3       # 3 hooks/pair (30 posts)
//   node marketing/generate-batch.mjs --hooks all     # every hook (40 posts)
//   node marketing/generate-batch.mjs --only あめ,かみ  # subset of pairs
//   node marketing/generate-batch.mjs --skip-existing # resume interrupted run
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadPairs } from './lib/pairs.mjs';
import { renderQuizVideo, renderQuizSlides } from './lib/render-quiz.mjs';
import { videoCaption, slidesCaption } from './lib/captions.mjs';
import { HOOKS } from './lib/hooks.mjs';

const MK = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(MK, 'out-batch');

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const only = flag('--only')?.split(',') ?? null;
const skipExisting = args.includes('--skip-existing');
const hooksArg = flag('--hooks');
const hookCount = hooksArg === 'all' ? HOOKS.length : hooksArg ? Math.max(1, Math.min(HOOKS.length, +hooksArg)) : 1;
const hooks = HOOKS.slice(0, hookCount);

const allPairs = loadPairs();
const pairs = only ? allPairs.filter((p) => only.includes(p.reading)) : allPairs;
if (!pairs.length) {
  console.error(`no pairs matched --only ${flag('--only')}; available: ${allPairs.map((p) => p.reading).join(',')}`);
  process.exit(1);
}

// Preflight: audio must exist for every side.
const missing = pairs.flatMap((p) => [p.a, p.b].filter((s) => !existsSync(s.audioFile)).map((s) => s.audioFile));
if (missing.length) {
  console.error(`missing audio:\n${missing.join('\n')}`);
  process.exit(1);
}

// Build the interleaved queue: iterate hooks in the OUTER loop so consecutive
// posts differ in both pair and hook (hook h cycles pairs; next round shifts hook).
const queue = [];
for (let h = 0; h < hooks.length; h++) {
  for (let p = 0; p < pairs.length; p++) {
    const pair = pairs[p];
    // Answer side is stable per pair (A/B by original index) so a given pair
    // always reveals the same correct letter regardless of hook.
    const answerSide = allPairs.indexOf(pair) % 2 === 0 ? 'a' : 'b';
    queue.push({ pair, hook: hooks[h], answerSide });
  }
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const started = Date.now();
const failed = [];

for (let i = 0; i < queue.length; i++) {
  const { pair, hook, answerSide } = queue[i];
  const nn = String(i + 1).padStart(2, '0');
  const dir = path.join(OUT, `${nn}_${pair.reading}_${pair.a.word}${pair.b.word}_${hook.id}`);
  const videoOut = path.join(dir, 'quiz.mp4');

  if (skipExisting && existsSync(videoOut)) {
    console.log(`⏭  ${nn} ${pair.reading}/${hook.id} (exists)`);
    continue;
  }
  await mkdir(dir, { recursive: true });

  console.log(`▶ ${nn} ${pair.reading} ${pair.a.word}/${pair.b.word} · hook=${hook.id} · ans=${answerSide.toUpperCase()}`);
  // One flaky render (Playwright screenshot timeout under load) must not kill
  // the whole calendar — log it and keep going; rerun with --skip-existing to
  // fill the gaps.
  try {
    await renderQuizVideo(browser, pair, answerSide, videoOut, hook);
    await renderQuizSlides(browser, pair, answerSide, dir, hook);
    await writeFile(path.join(dir, '投稿文_video.txt'), videoCaption(pair, answerSide, hook.id));
    await writeFile(path.join(dir, '投稿文_slides.txt'), slidesCaption(pair, answerSide, hook.id));
    console.log(`✅ ${nn} ${pair.reading}/${hook.id}`);
  } catch (err) {
    failed.push(nn);
    console.error(`✗ ${nn} ${pair.reading}/${hook.id}: ${err.name} — will retry on next --skip-existing run`);
  }
}

await browser.close();
console.log(`\ndone: ${queue.length - failed.length}/${queue.length} posts in ${((Date.now() - started) / 60000).toFixed(1)} min → ${OUT}`);
if (failed.length) console.log(`⚠ ${failed.length} failed (${failed.join(',')}) — rerun: node marketing/generate-batch.mjs --hooks ${hooks.length} --skip-existing`);
console.log('投稿順: 01から毎日1本、動画とスライド交互。固定コメント+全返信を忘れるな。');
