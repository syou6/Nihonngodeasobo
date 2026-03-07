// Gemini API使用量制限とモニタリング

interface ApiUsage {
  count: number;
  lastReset: string;
  totalTokens: number;
}

const USAGE_KEY = 'gemini_api_usage';
const CACHE_KEY = 'gemini_api_cache';
const CIRCUIT_BREAKER_KEY = 'gemini_circuit_breaker';
const DAILY_LIMIT = 20; // 1日あたりの最大リクエスト数（大幅削減）
const MONTHLY_LIMIT = 500; // 月あたりの最大リクエスト数（削減）
const MAX_TOKENS_PER_DAY = 10000; // 1日あたりの最大トークン数（大幅削減）
const CACHE_EXPIRY_HOURS = 24; // キャッシュ有効期限（時間）
const MAX_REQUESTS_PER_MINUTE = 3; // 1分あたりの最大リクエスト数（バースト防止）
const CIRCUIT_BREAKER_THRESHOLD = 5; // 連続エラー回数の閾値

// ローカルストレージから使用量を取得
function getUsage(): ApiUsage {
  const stored = localStorage.getItem(USAGE_KEY);
  if (!stored) {
    return {
      count: 0,
      lastReset: new Date().toISOString(),
      totalTokens: 0
    };
  }
  return JSON.parse(stored);
}

// 使用量を保存
function saveUsage(usage: ApiUsage): void {
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

// 日付が変わったかチェック
function isNewDay(lastReset: string): boolean {
  const last = new Date(lastReset);
  const now = new Date();
  return last.toDateString() !== now.toDateString();
}

// 使用量をリセット
function resetDailyUsage(): ApiUsage {
  return {
    count: 0,
    lastReset: new Date().toISOString(),
    totalTokens: 0
  };
}

// API使用可能かチェック
function canUseApi(): { allowed: boolean; reason?: string } {
  const usage = getUsage();
  
  // 日付が変わっていればリセット
  if (isNewDay(usage.lastReset)) {
    saveUsage(resetDailyUsage());
    return { allowed: true };
  }
  
  // デイリー制限チェック
  if (usage.count >= DAILY_LIMIT) {
    return { 
      allowed: false, 
      reason: `本日のAPI使用上限(${DAILY_LIMIT}回)に達しました。明日またお試しください。` 
    };
  }
  
  // トークン制限チェック
  if (usage.totalTokens >= MAX_TOKENS_PER_DAY) {
    return { 
      allowed: false, 
      reason: `本日のトークン上限に達しました。明日またお試しください。` 
    };
  }
  
  return { allowed: true };
}

// API使用を記録
export function recordApiUsage(estimatedTokens: number = 200): void {
  const usage = getUsage();
  
  // 日付が変わっていればリセット
  if (isNewDay(usage.lastReset)) {
    saveUsage({
      count: 1,
      lastReset: new Date().toISOString(),
      totalTokens: estimatedTokens
    });
  } else {
    usage.count++;
    usage.totalTokens += estimatedTokens;
    saveUsage(usage);
  }
  
}

// 現在の使用状況を取得
export function getCurrentUsageStats(): {
  dailyUsed: number;
  dailyLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  remainingRequests: number;
} {
  const usage = getUsage();
  
  // 日付が変わっていればリセット扱い
  if (isNewDay(usage.lastReset)) {
    return {
      dailyUsed: 0,
      dailyLimit: DAILY_LIMIT,
      tokensUsed: 0,
      tokensLimit: MAX_TOKENS_PER_DAY,
      remainingRequests: DAILY_LIMIT
    };
  }
  
  return {
    dailyUsed: usage.count,
    dailyLimit: DAILY_LIMIT,
    tokensUsed: usage.totalTokens,
    tokensLimit: MAX_TOKENS_PER_DAY,
    remainingRequests: Math.max(0, DAILY_LIMIT - usage.count)
  };
}

// 使用量をリセット（テスト用）
export function resetUsage(): void {
  saveUsage(resetDailyUsage());
}

// キャッシュ管理
interface CachedAnalysis {
  contentHash: string;
  result: any;
  timestamp: string;
}

// テキストの簡易ハッシュを生成
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// キャッシュから結果を取得
export function getCachedAnalysis(text: string): any | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: CachedAnalysis[] = JSON.parse(cached);
    const hash = simpleHash(text);
    
    const found = cacheData.find(item => item.contentHash === hash);
    if (!found) return null;
    
    // キャッシュ有効期限チェック
    const cacheTime = new Date(found.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > CACHE_EXPIRY_HOURS) {
      // 期限切れキャッシュを削除
      const newCache = cacheData.filter(item => item.contentHash !== hash);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      return null;
    }
    
    return found.result;
  } catch {
    return null;
  }
}

// 分析結果をキャッシュに保存
export function cacheAnalysis(text: string, result: any): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    let cacheData: CachedAnalysis[] = cached ? JSON.parse(cached) : [];
    
    const hash = simpleHash(text);
    
    // 既存のエントリを削除
    cacheData = cacheData.filter(item => item.contentHash !== hash);
    
    // 新しいエントリを追加
    cacheData.push({
      contentHash: hash,
      result,
      timestamp: new Date().toISOString()
    });
    
    // キャッシュサイズ制限（最大20エントリ）
    if (cacheData.length > 20) {
      cacheData = cacheData.slice(-20);
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch { /* ignored */ }
}

// 警告メッセージを表示
export function showApiUsageWarning(): void {
  const stats = getCurrentUsageStats();
  const remainingPercent = (stats.remainingRequests / stats.dailyLimit) * 100;
  
  if (remainingPercent <= 20 && remainingPercent > 0) {
    // UIに警告を表示する場合はここに追加
  }
}

// レート制限（1分あたりのリクエスト数を制限）
interface RateLimitInfo {
  requests: number[];
  lastReset: number;
}

function getRateLimitInfo(): RateLimitInfo {
  const stored = localStorage.getItem('gemini_rate_limit');
  if (!stored) {
    return { requests: [], lastReset: Date.now() };
  }
  return JSON.parse(stored);
}

function checkRateLimit(): boolean {
  const now = Date.now();
  const info = getRateLimitInfo();
  
  // 1分以上経過していたらリセット
  if (now - info.lastReset > 60000) {
    info.requests = [];
    info.lastReset = now;
  }
  
  // 1分以内のリクエストをフィルタ
  info.requests = info.requests.filter(time => now - time < 60000);
  
  // 制限チェック
  if (info.requests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  // リクエストを記録
  info.requests.push(now);
  localStorage.setItem('gemini_rate_limit', JSON.stringify(info));
  return true;
}

// サーキットブレーカー（連続エラーでAPI呼び出しを停止）
interface CircuitBreakerState {
  errorCount: number;
  lastError: number;
  isOpen: boolean;
  nextRetry: number;
}

function getCircuitBreakerState(): CircuitBreakerState {
  const stored = localStorage.getItem(CIRCUIT_BREAKER_KEY);
  if (!stored) {
    return {
      errorCount: 0,
      lastError: 0,
      isOpen: false,
      nextRetry: 0
    };
  }
  return JSON.parse(stored);
}

export function recordApiError(): void {
  const state = getCircuitBreakerState();
  state.errorCount++;
  state.lastError = Date.now();
  
  // 閾値を超えたらサーキットを開く（10分間停止）
  if (state.errorCount >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    state.nextRetry = Date.now() + 600000; // 10分後
  }
  
  localStorage.setItem(CIRCUIT_BREAKER_KEY, JSON.stringify(state));
}

export function recordApiSuccess(): void {
  const state = getCircuitBreakerState();
  state.errorCount = 0;
  state.isOpen = false;
  localStorage.setItem(CIRCUIT_BREAKER_KEY, JSON.stringify(state));
}

function isCircuitBreakerOpen(): boolean {
  const state = getCircuitBreakerState();
  
  // 時間が経過していたらリセット
  if (state.isOpen && Date.now() > state.nextRetry) {
    state.isOpen = false;
    state.errorCount = 0;
    localStorage.setItem(CIRCUIT_BREAKER_KEY, JSON.stringify(state));
  }
  
  return state.isOpen;
}

// 総合的なAPI呼び出し可否チェック
export function canCallApi(): { allowed: boolean; reason?: string } {
  // サーキットブレーカーチェック
  if (isCircuitBreakerOpen()) {
    return { 
      allowed: false, 
      reason: 'API呼び出しが一時的に停止されています（連続エラーのため）' 
    };
  }
  
  // レート制限チェック
  if (!checkRateLimit()) {
    return { 
      allowed: false, 
      reason: '短時間に多すぎるリクエストです。1分後に再試行してください。' 
    };
  }
  
  // 既存の使用量制限チェック
  return canUseApi();
}