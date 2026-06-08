// Curated, pattern-ordered pitch-accent curriculum (heiban → atamadaka →
// nakadaka/odaka). Readings verified against public/pitch-accents.json.
// Audio: public/pitch-audio/<word>.mp3 (generate via scripts/gen-pitch-audio.mjs).

export interface PracticeWord { word: string; reading: string; }

export const PRACTICE_WORDS: PracticeWord[] = [
  { word: '水', reading: 'みず' }, { word: '飴', reading: 'あめ' }, { word: '鼻', reading: 'はな' }, { word: '口', reading: 'くち' },
  { word: '顔', reading: 'かお' }, { word: '電話', reading: 'でんわ' }, { word: '名前', reading: 'なまえ' }, { word: '時間', reading: 'じかん' },
  { word: '仕事', reading: 'しごと' }, { word: '車', reading: 'くるま' }, { word: '野菜', reading: 'やさい' }, { word: '魚', reading: 'さかな' },
  { word: '時計', reading: 'とけい' }, { word: '財布', reading: 'さいふ' }, { word: '鞄', reading: 'かばん' }, { word: '学生', reading: 'がくせい' },
  { word: '友達', reading: 'ともだち' }, { word: '学校', reading: 'がっこう' }, { word: '会社', reading: 'かいしゃ' }, { word: '旅行', reading: 'りょこう' },
  { word: '質問', reading: 'しつもん' }, { word: '問題', reading: 'もんだい' }, { word: '新聞', reading: 'しんぶん' }, { word: '電車', reading: 'でんしゃ' },
  { word: '勉強', reading: 'べんきょう' }, { word: '牛乳', reading: 'ぎゅうにゅう' }, { word: '手', reading: 'て' }, { word: '目', reading: 'め' },
  { word: '雨', reading: 'あめ' }, { word: '箸', reading: 'はし' }, { word: '母', reading: 'はは' }, { word: '猫', reading: 'ねこ' },
  { word: '海', reading: 'うみ' }, { word: '空', reading: 'そら' }, { word: '朝', reading: 'あさ' }, { word: '夜', reading: 'よる' },
  { word: '駅', reading: 'えき' }, { word: '本', reading: 'ほん' }, { word: '元気', reading: 'げんき' }, { word: '今日', reading: 'きょう' },
  { word: '家族', reading: 'かぞく' }, { word: '映画', reading: 'えいが' }, { word: '天気', reading: 'てんき' }, { word: '眼鏡', reading: 'めがね' },
  { word: '音楽', reading: 'おんがく' }, { word: '料理', reading: 'りょうり' }, { word: '山', reading: 'やま' }, { word: '川', reading: 'かわ' },
  { word: '橋', reading: 'はし' }, { word: '花', reading: 'はな' }, { word: '父', reading: 'ちち' }, { word: '犬', reading: 'いぬ' },
  { word: '店', reading: 'みせ' }, { word: '足', reading: 'あし' }, { word: '耳', reading: 'みみ' }, { word: '肉', reading: 'にく' },
  { word: '塩', reading: 'しお' }, { word: '日本', reading: 'にほん' }, { word: '卵', reading: 'たまご' }, { word: '砂糖', reading: 'さとう' },
  { word: '飛行機', reading: 'ひこうき' }, { word: '果物', reading: 'くだもの' }, { word: '自転車', reading: 'じてんしゃ' }, { word: '明日', reading: 'あした' },
  { word: '頭', reading: 'あたま' }, { word: '先生', reading: 'せんせい' },
];
