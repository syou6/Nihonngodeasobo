// Curriculum words for the Ear Sprint "Where does the pitch drop?" mode. dropAfter
// = mora after which the pitch falls (0 = heiban / no drop). Verified: the app's
// own detector on the Kyoko audio AGREES with the dictionary nucleus, so the
// answer matches both the audio and the canonical accent. Audio: /word-audio/<word>.mp3

export interface DropWord { word: string; reading: string; en: string; morae: string[]; dropAfter: number; }

export const DROP_WORDS: DropWord[] = [
  { word: '水', reading: 'みず', en: 'water 💧', morae: ['み', 'ず'], dropAfter: 0 },
  { word: '日本', reading: 'にほん', en: 'Japan 🇯🇵', morae: ['に', 'ほ', 'ん'], dropAfter: 2 },
  { word: '飴', reading: 'あめ', en: 'candy 🍬', morae: ['あ', 'め'], dropAfter: 0 },
  { word: '卵', reading: 'たまご', en: 'egg 🥚', morae: ['た', 'ま', 'ご'], dropAfter: 2 },
  { word: '鼻', reading: 'はな', en: 'nose 👃', morae: ['は', 'な'], dropAfter: 0 },
  { word: '雨', reading: 'あめ', en: 'rain 🌧', morae: ['あ', 'め'], dropAfter: 1 },
  { word: '口', reading: 'くち', en: 'mouth 👄', morae: ['く', 'ち'], dropAfter: 0 },
  { word: '箸', reading: 'はし', en: 'chopsticks 🥢', morae: ['は', 'し'], dropAfter: 1 },
  { word: '顔', reading: 'かお', en: 'face 😊', morae: ['か', 'お'], dropAfter: 0 },
  { word: '母', reading: 'はは', en: 'mother 👩', morae: ['は', 'は'], dropAfter: 1 },
  { word: '果物', reading: 'くだもの', en: 'fruit 🍎', morae: ['く', 'だ', 'も', 'の'], dropAfter: 2 },
  { word: '猫', reading: 'ねこ', en: 'cat 🐈', morae: ['ね', 'こ'], dropAfter: 1 },
  { word: '海', reading: 'うみ', en: 'sea 🌊', morae: ['う', 'み'], dropAfter: 1 },
  { word: '先生', reading: 'せんせい', en: 'teacher 🧑‍🏫', morae: ['せ', 'ん', 'せ', 'い'], dropAfter: 3 },
  { word: '時間', reading: 'じかん', en: 'time ⏰', morae: ['じ', 'か', 'ん'], dropAfter: 0 },
  { word: '空', reading: 'そら', en: 'sky ☁️', morae: ['そ', 'ら'], dropAfter: 1 },
  { word: '仕事', reading: 'しごと', en: 'work 💼', morae: ['し', 'ご', 'と'], dropAfter: 0 },
  { word: '車', reading: 'くるま', en: 'car 🚗', morae: ['く', 'る', 'ま'], dropAfter: 0 },
  { word: '夜', reading: 'よる', en: 'night 🌙', morae: ['よ', 'る'], dropAfter: 1 },
  { word: '野菜', reading: 'やさい', en: 'vegetable 🥬', morae: ['や', 'さ', 'い'], dropAfter: 0 },
  { word: '駅', reading: 'えき', en: 'station 🚉', morae: ['え', 'き'], dropAfter: 1 },
  { word: '魚', reading: 'さかな', en: 'fish 🐟', morae: ['さ', 'か', 'な'], dropAfter: 0 },
  { word: '本', reading: 'ほん', en: 'book 📖', morae: ['ほ', 'ん'], dropAfter: 1 },
  { word: '時計', reading: 'とけい', en: 'clock 🕐', morae: ['と', 'け', 'い'], dropAfter: 0 },
  { word: '鞄', reading: 'かばん', en: 'bag 👜', morae: ['か', 'ば', 'ん'], dropAfter: 0 },
  { word: '学校', reading: 'がっこう', en: 'school 🏫', morae: ['が', 'っ', 'こ', 'う'], dropAfter: 0 },
  { word: '眼鏡', reading: 'めがね', en: 'glasses 👓', morae: ['め', 'が', 'ね'], dropAfter: 1 },
  { word: '会社', reading: 'かいしゃ', en: 'company 🏢', morae: ['か', 'い', 'しゃ'], dropAfter: 0 },
  { word: '旅行', reading: 'りょこう', en: 'travel ✈️', morae: ['りょ', 'こ', 'う'], dropAfter: 0 },
  { word: '質問', reading: 'しつもん', en: 'question ❓', morae: ['し', 'つ', 'も', 'ん'], dropAfter: 0 },
  { word: '新聞', reading: 'しんぶん', en: 'newspaper 📰', morae: ['し', 'ん', 'ぶ', 'ん'], dropAfter: 0 },
  { word: '電車', reading: 'でんしゃ', en: 'train 🚃', morae: ['で', 'ん', 'しゃ'], dropAfter: 0 },
];
