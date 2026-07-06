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
