// 無料のテキスト分析（Gemini API不要）

export interface AnalysisResult {
  summary: string;
  keywords: string[];
}

/**
 * キーワード抽出（日本語学習向け：動詞・形容詞・名詞の頻出ワード）
 */
function extractKeywords(text: string): string[] {
  const candidates = [
    // 動詞
    '食べる', '飲む', '行く', '来る', '見る', '聞く', '話す', '書く', '読む', '勉強する',
    '練習する', '覚える', '学ぶ', '使う', '遊ぶ', '働く', '休む', '寝る', '起きる',
    // 形容詞
    '楽しい', '難しい', '面白い', '簡単', '嬉しい', '大変', '好き', '素晴らしい',
    // 名詞（学習関連）
    '日本語', '漢字', 'ひらがな', 'カタカナ', '文法', '単語', '発音', '会話',
    '授業', '先生', '友達', '学校', '仕事', '旅行', '食べ物', '文化'
  ];

  const found: string[] = [];
  for (const word of candidates) {
    if (text.includes(word) && found.length < 5) {
      found.push(word);
    }
  }

  return found.length > 0 ? found : [];
}

/**
 * 簡易要約（最初の2文）
 */
function buildSummary(text: string): string {
  if (text.length <= 50) {
    return text;
  }

  const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    return sentences.slice(0, 2).join('。') + '。';
  }

  return text.substring(0, 50) + '...';
}

/**
 * 無料でテキスト分析を実行
 */
export function analyzeFree(text: string): AnalysisResult {
  if (!text) {
    return { summary: '', keywords: [] };
  }

  try {
    return {
      summary: buildSummary(text),
      keywords: extractKeywords(text)
    };
  } catch (error) {
    return {
      summary: text.substring(0, 50) + '...',
      keywords: []
    };
  }
}

/**
 * 簡易要約生成
 */
export function generateSummaryFree(text: string): string {
  const keywords = extractKeywords(text);
  const base = buildSummary(text);

  if (keywords.length > 0) {
    return `${base}（${keywords.slice(0, 3).join('・')}について書かれています）`;
  }

  return base;
}
