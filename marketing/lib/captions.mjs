// Caption + pinned-comment generator for the quiz format.
// Structure mirrors the hand-written 箸/橋 captions that defined the format.

const HASHTAGS_VIDEO = '#learnjapanese #japanesepitchaccent #japanese #studytok #speakjapanese #日本語 #japanesepronunciation #anime';
const HASHTAGS_SLIDES = '#learnjapanese #japanesepitchaccent #japanese #studytok #speakjapanese #日本語 #japanesepronunciation #langtok';

const patJp = (pat) => (pat[0] ? 'high→low' : 'low→high');

function core(pair, answerSide) {
  const ans = pair[answerSide];
  const other = pair[answerSide === 'a' ? 'b' : 'a'];
  const letter = answerSide.toUpperCase();
  return { ans, other, letter };
}

// Per-hook caption opener so the on-platform text matches the video's angle.
const HOOK_OPENER = {
  mistake: 'Can you hear it? 👂 95% of learners get this wrong.',
  native: 'A native hears this instantly 👂 can you?',
  pov: "POV: you've been saying this wrong 👂",
  challenge: 'Can your ear pass this? 👂',
};

// tease=true: the video does NOT reveal — the pinned comment (posted ~12-24h
// later) carries the answer, giving people an actual reason to comment first.
export function teaseCaption(pair, answerSide, hookId = 'mistake') {
  const { ans, letter } = core(pair, answerSide);
  const opener = HOOK_OPENER[hookId] ?? HOOK_OPENER.mistake;
  return `${opener} ${pair.reading} = ${pair.a.en} OR ${pair.b.en} — the PITCH decides. A or B? ${pair.a.emoji}${pair.b.emoji}

No reveal in the video 😤 drop your guess in the comments — answer gets pinned tomorrow.

Train your ear while you wait (free) → link in bio

#learnjapanese #japanesepitchaccent #japanese #studytok #speakjapanese #日本語 #japanesepronunciation #langtok

────────────────────────────────────
【運用 — teaseの肝】
1. 投稿直後はピン留めしない(答えを出さない)
2. 来たコメント全部に「👀」「いい耳してる…かも?」等、正解を言わずに返す
3. 【翌日】このコメントを投稿してピン留め → 答えは ${letter}・${ans.word}${ans.emoji}(${patJp(ans.pat)})。当てた人おめでとう🎉 次はもっと難しいの行くよ
4. 答え待ちの人が翌日戻ってくる = リテンション+再視聴シグナル`;
}

export function videoCaption(pair, answerSide, hookId = 'mistake') {
  const { ans, other, letter } = core(pair, answerSide);
  const opener = HOOK_OPENER[hookId] ?? HOOK_OPENER.mistake;
  return `${opener} ${pair.reading} = ${pair.a.en} OR ${pair.b.en} — the PITCH decides. A or B? ${pair.a.emoji}${pair.b.emoji}

Drop your answer in the comments BEFORE the reveal 👇 no cheating 😤

${pair.a.emoji} ${pair.a.word} = ${patJp(pair.a.pat)}　${pair.b.emoji} ${pair.b.word} = ${patJp(pair.b.pat)}

Get it right? Prove your ear → free game in bio (nihongo.amorjp.com)

${HASHTAGS_VIDEO}

────────────────────────────────────
【固定コメント(自分でピン留め)】
答えは ${letter}・${ans.word}${ans.emoji} — 合ってた人❤️、外した人は bio のゲームで耳を鍛えて👂
【コメント返信テンプレ】
正解者→「正解👏 じゃあ ${other.word} との聞き分けは自信ある?」
不正解者→「惜しい! ${ans.word} は ${patJp(ans.pat)}。bio のゲームで3分で掴めるよ👂」`;
}

// YouTube Shorts: searchable keyword-front title + link-carrying description.
// Unlike TikTok, YouTube rewards outbound links and surfaces Shorts in search
// for years — titles lead with the query people actually type.
export function youtubeText(pair, answerSide, hookId = 'mistake') {
  const { ans, letter } = core(pair, answerSide);
  const title = `Japanese Pitch Accent Quiz: ${pair.a.word} vs ${pair.b.word} (${pair.reading}) — Can You Hear It? #shorts`;
  const description = `${pair.a.word} (${pair.a.en}) and ${pair.b.word} (${pair.b.en}) are BOTH pronounced "${pair.reading}" — only the pitch accent tells them apart. Can your ear hear it?

🎧 Train your ear free (no signup): https://nihongo.amorjp.com/app.html?guest=true&view=ear&utm_source=youtube

${pair.a.emoji} ${pair.a.word} = ${patJp(pair.a.pat)} (${pair.a.pattern === 'HL' ? 'atamadaka 頭高' : 'rising'})
${pair.b.emoji} ${pair.b.word} = ${patJp(pair.b.pat)} (${pair.b.pattern === 'HL' ? 'atamadaka 頭高' : 'rising'})

Answer: ${letter} · ${ans.word} ${ans.emoji}

Pitch data follows the NHK Japanese accent dictionary. New minimal-pair quiz daily.

#japanese #learnjapanese #japanesepitchaccent #japanesepronunciation #jlpt #nihongo #minimalpairs

────────────────────────────────────
【投稿手順】タイトルと上の本文をコピペ。ピン留めコメントは不要(概要欄に答えあり)。同じmp4をそのまま上げる。`;
  return `【タイトル】\n${title}\n\n【概要欄】\n${description}`;
}

export function slidesCaption(pair, answerSide, hookId = 'mistake') {
  const { ans, letter } = core(pair, answerSide);
  const opener = HOOK_OPENER[hookId] ?? HOOK_OPENER.mistake;
  return `${opener} Same sound「${pair.reading}」, two meanings ${pair.a.emoji}${pair.b.emoji}. Which shape is ${ans.en}, A or B? 👇

Comment your guess BEFORE you swipe to the answer 😤

Train your ear (free) → link in bio

${HASHTAGS_SLIDES}

────────────────────────────────────
アップロード: TikTok → ＋ → 写真モード → 01→02→03→04 の順。音は「おすすめ」から静かめトレンド音源(無音NG)。
【固定コメント(自分でピン留め)】
答え = ${letter}(${ans.word}・${patJp(ans.pat)})${ans.emoji}
【運用】全コメント返信・毎日投稿・動画とスライド交互。`;
}
