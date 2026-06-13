// Minimal pairs for the Ear Sprint perception game. Audio is macOS Kyoko
// (accent-aware Japanese TTS) rendered per-kanji so each side has its REAL,
// distinct pitch — verified distinct; a native speaker confirms correctness.
// Files: public/pair-audio/<audio>.mp3.

export interface PairSide {
  word: string;
  en: string;       // short meaning + emoji
  audio: string;    // file in /pair-audio
  pattern: 'HL' | 'LH'; // for the post-answer reveal
}

export interface MinimalPair {
  reading: string;
  a: PairSide;
  b: PairSide;
}

// Look up a word's meaning + its minimal-pair twin (for the result "meaning flip").
export function meaningFlipFor(word: string): { en: string; twinWord: string; twinEn: string } | null {
  for (const p of EAR_PAIRS) {
    if (p.a.word === word) return { en: p.a.en, twinWord: p.b.word, twinEn: p.b.en };
    if (p.b.word === word) return { en: p.b.en, twinWord: p.a.word, twinEn: p.a.en };
  }
  return null;
}

export const EAR_PAIRS: MinimalPair[] = [
  {
    reading: 'あめ',
    a: { word: '雨', en: 'rain 🌧', audio: 'ame_rain', pattern: 'HL' },
    b: { word: '飴', en: 'candy 🍬', audio: 'ame_candy', pattern: 'LH' },
  },
  {
    reading: 'はし',
    a: { word: '箸', en: 'chopsticks 🥢', audio: 'hashi_chopsticks', pattern: 'HL' },
    b: { word: '橋', en: 'bridge 🌉', audio: 'hashi_bridge', pattern: 'LH' },
  },
  {
    reading: 'かみ',
    a: { word: '神', en: 'god ⛩️', audio: 'kami_god', pattern: 'HL' },
    b: { word: '紙', en: 'paper 📄', audio: 'kami_paper', pattern: 'LH' },
  },
  {
    reading: 'いま',
    a: { word: '今', en: 'now ⏰', audio: 'ima_now', pattern: 'HL' },
    b: { word: '居間', en: 'living room 🛋️', audio: 'ima_room', pattern: 'LH' },
  },
  {
    reading: 'さけ',
    a: { word: '酒', en: 'alcohol 🍶', audio: 'sake_alcohol', pattern: 'HL' },
    b: { word: '鮭', en: 'salmon 🐟', audio: 'sake_salmon', pattern: 'LH' },
  },
  {
    reading: 'かき',
    a: { word: '牡蠣', en: 'oyster 🦪', audio: 'kaki_oyster', pattern: 'HL' },
    b: { word: '柿', en: 'persimmon 🟠', audio: 'kaki_persimmon', pattern: 'LH' },
  },
  {
    reading: 'きる',
    a: { word: '切る', en: 'to cut ✂️', audio: 'kiru_cut', pattern: 'HL' },
    b: { word: '着る', en: 'to wear 👕', audio: 'kiru_wear', pattern: 'LH' },
  },
  {
    reading: 'かめ',
    a: { word: '瓶', en: 'jar 🏺', audio: 'kame_jar', pattern: 'HL' },
    b: { word: '亀', en: 'turtle 🐢', audio: 'kame_turtle', pattern: 'LH' },
  },
  {
    reading: 'うみ',
    a: { word: '膿', en: 'pus 🤕', audio: 'umi_pus', pattern: 'HL' },
    b: { word: '海', en: 'sea 🌊', audio: 'umi_sea', pattern: 'LH' },
  },
  {
    reading: 'かえる',
    a: { word: '帰る', en: 'to go home 🏠', audio: 'kaeru_return', pattern: 'HL' },
    b: { word: '蛙', en: 'frog 🐸', audio: 'kaeru_frog', pattern: 'LH' },
  },
];
