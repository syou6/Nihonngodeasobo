/**
 * JLPT Speaking Practice Questions
 * Part E: Summary - Level-adjusted by JLPT level
 * Part F: Opinion - No level adjustment needed
 */

import { PRACTICE } from './constants';
import type { JLPTLevel } from './constants';

const PART_E_TIME = PRACTICE.PART_E.TIME_LIMIT;
const PART_F_TIME = PRACTICE.PART_F.TIME_LIMIT;

// Re-export for backward compatibility
export type { JLPTLevel } from './constants';

export interface VersantQuestion {
  id: string;
  part: 'E' | 'F';
  text: string;
  timeLimit: number; // seconds
  category?: string;
  jlptLevel?: JLPTLevel;
}

// Part E: Summary Questions - grouped by JLPT level
export const partEQuestions: VersantQuestion[] = [
  // N5 level
  {
    id: 'e-n5-1',
    part: 'E',
    text: 'たなかさんは まいにち がっこうに いきます。すうがくと りかが すきです。がっこうの あとで ともだちと サッカーを します。ごじに いえに かえって かぞくと ばんごはんを たべます。',
    timeLimit: PART_E_TIME,
    category: 'Daily Life',
    jlptLevel: 'N5'
  },
  {
    id: 'e-n5-2',
    part: 'E',
    text: 'マリアさんは みせで はたらいています。くだものと やさいを うっています。みせは あさ はちじに あきます。たくさんの ひとが たべものを かいに きます。',
    timeLimit: PART_E_TIME,
    category: 'Work',
    jlptLevel: 'N5'
  },
  {
    id: 'e-n5-3',
    part: 'E',
    text: 'きょうは いい てんきです。こどもたちが こうえんで あそんでいます。アイスクリームを たべている こどもも います。みんな たのしそうです。',
    timeLimit: PART_E_TIME,
    category: 'Weather',
    jlptLevel: 'N5'
  },
  // N4 level
  {
    id: 'e-n4-1',
    part: 'E',
    text: '駅の近くに新しいカフェができました。コーヒーやお茶、手作りケーキがあります。値段も手ごろで、スタッフもやさしいです。仕事の後に来る人が多いです。Wi-Fiも無料で使えます。',
    timeLimit: PART_E_TIME,
    category: 'Food',
    jlptLevel: 'N4'
  },
  {
    id: 'e-n4-2',
    part: 'E',
    text: '図書館で子供向けの読書プログラムが始まりました。毎週土曜日にボランティアが子供たちに本を読みます。子供たちはとても楽しんでいて、家でもっと本を読みたいと言っています。',
    timeLimit: PART_E_TIME,
    category: 'Education',
    jlptLevel: 'N4'
  },
  {
    id: 'e-n4-3',
    part: 'E',
    text: 'サラさんは今年から運動を始めました。毎朝30分散歩をしています。週末はプールで泳いでいます。二か月後、前より元気になって、夜もよく眠れるようになりました。',
    timeLimit: PART_E_TIME,
    category: 'Health',
    jlptLevel: 'N4'
  },
  // N3 level
  {
    id: 'e-n3-1',
    part: 'E',
    text: 'この会社はリモートワークの新しいルールを作りました。来月から社員は週に3日まで家で仕事ができます。調査で80%の社員が柔軟な働き方を希望したからです。これで仕事と生活のバランスが良くなると期待されています。',
    timeLimit: PART_E_TIME,
    category: 'Business',
    jlptLevel: 'N3'
  },
  {
    id: 'e-n3-2',
    part: 'E',
    text: '新しい研究で、定期的に運動する人は記憶力と集中力がいいことがわかりました。研究者が500人を2年間調べたところ、毎日30分以上運動した人はテストの成績が20%良かったそうです。',
    timeLimit: PART_E_TIME,
    category: 'Health',
    jlptLevel: 'N3'
  },
  {
    id: 'e-n3-3',
    part: 'E',
    text: '有名なレストランチェーンがメニューにベジタリアン料理を増やすことにしました。社長によると、客のベジタリアン料理の注文が去年の2倍になったそうです。来月、新しいメニューを10品追加する予定です。',
    timeLimit: PART_E_TIME,
    category: 'Food',
    jlptLevel: 'N3'
  },
  // N2 level
  {
    id: 'e-n2-1',
    part: 'E',
    text: '市は新しい公共交通計画を発表しました。電気バスを50台追加し、地下鉄を空港まで延伸します。このプロジェクトには2000億円かかり、完成まで3年の予定です。交通渋滞を30%削減し、二酸化炭素の排出も大幅に減らせると期待されています。',
    timeLimit: PART_E_TIME,
    category: 'Transportation',
    jlptLevel: 'N2'
  },
  {
    id: 'e-n2-2',
    part: 'E',
    text: '大学でオンライン学習が増えています。昨年、オンラインコースの受講者が40%増加しました。学生はどこでも勉強できる柔軟性を評価していますが、教授の中には重要な社会的交流が失われることを心配する人もいます。',
    timeLimit: PART_E_TIME,
    category: 'Education',
    jlptLevel: 'N2'
  },
  // N1 level
  {
    id: 'e-n1-1',
    part: 'E',
    text: 'バイリンガルの人は認知的柔軟性がモノリンガルの人より高いことが長期研究で明らかになった。2000人以上を30年間追跡した結果、日常的に言語を切り替えることが実行機能に関連する神経経路を強化することが示された。特に注目すべきは、この認知的利点が高齢になっても持続し、認知症の発症を数年遅らせる可能性があることだ。',
    timeLimit: PART_E_TIME,
    category: 'Science',
    jlptLevel: 'N1'
  },
  {
    id: 'e-n1-2',
    part: 'E',
    text: '量子コンピューティングと製薬開発の交差点は、創薬における根本的な変革を意味している。従来の計算手法では、原子レベルでの分子相互作用のシミュレーションに何年もかかるが、量子アルゴリズムを使えば指数関数的に高速化でき、有望な薬剤候補の同定が加速される。',
    timeLimit: PART_E_TIME,
    category: 'Science',
    jlptLevel: 'N1'
  }
];

// Part F: Opinion Questions (40秒で意見を述べる) - レベル調整なし
export const partFQuestions: VersantQuestion[] = [
  {
    id: 'f1',
    part: 'F',
    text: '在宅勤務とオフィス勤務、どちらがいいと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Work'
  },
  {
    id: 'f2',
    part: 'F',
    text: 'SNSは社会にとっていい影響と悪い影響、どちらが大きいと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Technology'
  },
  {
    id: 'f3',
    part: 'F',
    text: '学校で制服を着るべきだと思いますか？なぜですか？',
    timeLimit: PART_F_TIME,
    category: 'Education'
  },
  {
    id: 'f4',
    part: 'F',
    text: '大きい都市と小さい町、どちらに住みたいですか？その理由は？',
    timeLimit: PART_F_TIME,
    category: 'Lifestyle'
  },
  {
    id: 'f5',
    part: 'F',
    text: '一人旅と友達や家族との旅行、どちらが好きですか？',
    timeLimit: PART_F_TIME,
    category: 'Travel'
  },
  {
    id: 'f6',
    part: 'F',
    text: '外国語を学ぶことは大切だと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Education'
  },
  {
    id: 'f7',
    part: 'F',
    text: '会社は育児休暇を義務化するべきだと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Work'
  },
  {
    id: 'f8',
    part: 'F',
    text: 'お金は貯金するのと経験に使うのと、どちらがいいですか？',
    timeLimit: PART_F_TIME,
    category: 'Finance'
  },
  {
    id: 'f9',
    part: 'F',
    text: 'ネットショッピングは将来、実店舗に取って代わると思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Shopping'
  },
  {
    id: 'f10',
    part: 'F',
    text: '選挙で投票は義務にするべきだと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Politics'
  },
  {
    id: 'f11',
    part: 'F',
    text: '子供は料理を学ぶべきだと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Life Skills'
  },
  {
    id: 'f12',
    part: 'F',
    text: '電気自動車はガソリン車より人気になると思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Environment'
  },
  {
    id: 'f13',
    part: 'F',
    text: '毎日宿題を出すべきだと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Education'
  },
  {
    id: 'f14',
    part: 'F',
    text: '本を読むのと映画を見るの、どちらが好きですか？',
    timeLimit: PART_F_TIME,
    category: 'Entertainment'
  },
  {
    id: 'f15',
    part: 'F',
    text: '仕事と生活のバランスは大切ですか？どうすれば実現できますか？',
    timeLimit: PART_F_TIME,
    category: 'Work'
  },
  {
    id: 'f16',
    part: 'F',
    text: '学校でファストフードを禁止するべきですか？',
    timeLimit: PART_F_TIME,
    category: 'Health'
  },
  {
    id: 'f17',
    part: 'F',
    text: '将来、ロボットが多くの仕事を奪うと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Technology'
  },
  {
    id: 'f18',
    part: 'F',
    text: '親しい友人が少ないのと知り合いが多いの、どちらがいいですか？',
    timeLimit: PART_F_TIME,
    category: 'Relationships'
  },
  {
    id: 'f19',
    part: 'F',
    text: 'プラスチックの使用を減らすべきですか？',
    timeLimit: PART_F_TIME,
    category: 'Environment'
  },
  {
    id: 'f20',
    part: 'F',
    text: '毎日ニュースを見ることは大事だと思いますか？',
    timeLimit: PART_F_TIME,
    category: 'Media'
  }
];

// JLPTレベルに応じた出題グループを返す
function getLevelGroup(level: JLPTLevel): JLPTLevel[] {
  const groups: Record<JLPTLevel, JLPTLevel[]> = {
    'N5': ['N5'],
    'N4': ['N4', 'N5'],
    'N3': ['N3', 'N4'],
    'N2': ['N2', 'N3'],
    'N1': ['N1', 'N2']
  };
  return groups[level] || ['N4'];
}

// Pick a random item from array, excluding a specific ID
function pickRandom(questions: VersantQuestion[], excludeId?: string): VersantQuestion {
  const candidates = excludeId
    ? questions.filter(q => q.id !== excludeId)
    : questions;

  // If all were excluded (only 1 question available), fall back to full list
  const pool = candidates.length > 0 ? candidates : questions;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// Get random question by part, optionally filtered by JLPT level (Part E only)
// Pass excludeId to avoid getting the same question twice in a row
export function getRandomQuestion(part: 'E' | 'F', jlptLevel?: JLPTLevel, excludeId?: string): VersantQuestion {
  if (part === 'F') {
    return pickRandom(partFQuestions, excludeId);
  }

  // Part E: filter by JLPT level
  if (jlptLevel) {
    const levelGroup = getLevelGroup(jlptLevel);
    const filtered = partEQuestions.filter(q => q.jlptLevel && levelGroup.includes(q.jlptLevel));
    if (filtered.length > 0) {
      return pickRandom(filtered, excludeId);
    }
  }

  // Fallback: return any Part E question
  return pickRandom(partEQuestions, excludeId);
}

// Get all questions by part
export function getQuestionsByPart(part: 'E' | 'F'): VersantQuestion[] {
  return part === 'E' ? partEQuestions : partFQuestions;
}

// Get question by ID
export function getQuestionById(id: string): VersantQuestion | undefined {
  return [...partEQuestions, ...partFQuestions].find(q => q.id === id);
}
