// Pattern-INTERLEAVED pitch curriculum: the first ~8 words cover all four
// patterns (平板/頭高/中高/尾高) so the Pitch Karte has balanced data and can
// diagnose every pattern early. Readings + nucleus verified vs pitch-accents.json.
// Audio: public/pitch-audio/<word>.mp3.

export type PatternName = '平板' | '頭高' | '中高' | '尾高';

export interface PracticeWord { word: string; reading: string; nucleus: number; pattern: PatternName; }

export const PRACTICE_WORDS: PracticeWord[] = [
  { word: '水', reading: 'みず', nucleus: 0, pattern: '平板' }, { word: '手', reading: 'て', nucleus: 1, pattern: '頭高' },
  { word: '日本', reading: 'にほん', nucleus: 2, pattern: '中高' }, { word: '山', reading: 'やま', nucleus: 2, pattern: '尾高' },
  { word: '飴', reading: 'あめ', nucleus: 0, pattern: '平板' }, { word: '目', reading: 'め', nucleus: 1, pattern: '頭高' },
  { word: '卵', reading: 'たまご', nucleus: 2, pattern: '中高' }, { word: '川', reading: 'かわ', nucleus: 2, pattern: '尾高' },
  { word: '鼻', reading: 'はな', nucleus: 0, pattern: '平板' }, { word: '雨', reading: 'あめ', nucleus: 1, pattern: '頭高' },
  { word: '砂糖', reading: 'さとう', nucleus: 2, pattern: '中高' }, { word: '橋', reading: 'はし', nucleus: 2, pattern: '尾高' },
  { word: '口', reading: 'くち', nucleus: 0, pattern: '平板' }, { word: '箸', reading: 'はし', nucleus: 1, pattern: '頭高' },
  { word: '飛行機', reading: 'ひこうき', nucleus: 2, pattern: '中高' }, { word: '花', reading: 'はな', nucleus: 2, pattern: '尾高' },
  { word: '顔', reading: 'かお', nucleus: 0, pattern: '平板' }, { word: '母', reading: 'はは', nucleus: 1, pattern: '頭高' },
  { word: '果物', reading: 'くだもの', nucleus: 2, pattern: '中高' }, { word: '父', reading: 'ちち', nucleus: 2, pattern: '尾高' },
  { word: '電話', reading: 'でんわ', nucleus: 0, pattern: '平板' }, { word: '猫', reading: 'ねこ', nucleus: 1, pattern: '頭高' },
  { word: '自転車', reading: 'じてんしゃ', nucleus: 2, pattern: '中高' }, { word: '犬', reading: 'いぬ', nucleus: 2, pattern: '尾高' },
  { word: '名前', reading: 'なまえ', nucleus: 0, pattern: '平板' }, { word: '海', reading: 'うみ', nucleus: 1, pattern: '頭高' },
  { word: '先生', reading: 'せんせい', nucleus: 3, pattern: '中高' }, { word: '店', reading: 'みせ', nucleus: 2, pattern: '尾高' },
  { word: '時間', reading: 'じかん', nucleus: 0, pattern: '平板' }, { word: '空', reading: 'そら', nucleus: 1, pattern: '頭高' },
  { word: '足', reading: 'あし', nucleus: 2, pattern: '尾高' }, { word: '仕事', reading: 'しごと', nucleus: 0, pattern: '平板' },
  { word: '朝', reading: 'あさ', nucleus: 1, pattern: '頭高' }, { word: '耳', reading: 'みみ', nucleus: 2, pattern: '尾高' },
  { word: '車', reading: 'くるま', nucleus: 0, pattern: '平板' }, { word: '夜', reading: 'よる', nucleus: 1, pattern: '頭高' },
  { word: '肉', reading: 'にく', nucleus: 2, pattern: '尾高' }, { word: '野菜', reading: 'やさい', nucleus: 0, pattern: '平板' },
  { word: '駅', reading: 'えき', nucleus: 1, pattern: '頭高' }, { word: '塩', reading: 'しお', nucleus: 2, pattern: '尾高' },
  { word: '魚', reading: 'さかな', nucleus: 0, pattern: '平板' }, { word: '本', reading: 'ほん', nucleus: 1, pattern: '頭高' },
  { word: '明日', reading: 'あした', nucleus: 3, pattern: '尾高' }, { word: '時計', reading: 'とけい', nucleus: 0, pattern: '平板' },
  { word: '元気', reading: 'げんき', nucleus: 1, pattern: '頭高' }, { word: '頭', reading: 'あたま', nucleus: 3, pattern: '尾高' },
  { word: '財布', reading: 'さいふ', nucleus: 0, pattern: '平板' }, { word: '今日', reading: 'きょう', nucleus: 1, pattern: '頭高' },
  { word: '鞄', reading: 'かばん', nucleus: 0, pattern: '平板' }, { word: '家族', reading: 'かぞく', nucleus: 1, pattern: '頭高' },
  { word: '学生', reading: 'がくせい', nucleus: 0, pattern: '平板' }, { word: '映画', reading: 'えいが', nucleus: 1, pattern: '頭高' },
  { word: '友達', reading: 'ともだち', nucleus: 0, pattern: '平板' }, { word: '天気', reading: 'てんき', nucleus: 1, pattern: '頭高' },
  { word: '学校', reading: 'がっこう', nucleus: 0, pattern: '平板' }, { word: '眼鏡', reading: 'めがね', nucleus: 1, pattern: '頭高' },
  { word: '会社', reading: 'かいしゃ', nucleus: 0, pattern: '平板' }, { word: '音楽', reading: 'おんがく', nucleus: 1, pattern: '頭高' },
  { word: '旅行', reading: 'りょこう', nucleus: 0, pattern: '平板' }, { word: '料理', reading: 'りょうり', nucleus: 1, pattern: '頭高' },
  { word: '質問', reading: 'しつもん', nucleus: 0, pattern: '平板' }, { word: '問題', reading: 'もんだい', nucleus: 0, pattern: '平板' },
  { word: '新聞', reading: 'しんぶん', nucleus: 0, pattern: '平板' }, { word: '電車', reading: 'でんしゃ', nucleus: 0, pattern: '平板' },
  { word: '勉強', reading: 'べんきょう', nucleus: 0, pattern: '平板' }, { word: '牛乳', reading: 'ぎゅうにゅう', nucleus: 0, pattern: '平板' },
];
