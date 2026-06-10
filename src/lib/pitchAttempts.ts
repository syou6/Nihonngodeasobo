import { supabase } from './supabase';

// Pitch-attempt logging — the data foundation of the Pitch Karte.
// Signed-in users append to public.pitch_attempts (RLS: own rows only).
// Guests accumulate the SAME shape in localStorage so their history can be
// backfilled at signup ("your N attempts are waiting — create an account").

export interface PitchAttempt {
  word: string;
  reading: string;
  pattern_name: string | null;
  target_nucleus: number;
  detected_nucleus: number;
  accuracy: number;
  created_at?: string;
}

const GUEST_KEY = 'guestPitchAttempts';
const GUEST_MAX = 200; // plenty for a karte; caps localStorage growth

function readGuestAttempts(): PitchAttempt[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function getGuestAttemptCount(): number {
  return readGuestAttempts().length;
}

/**
 * Record one scoring attempt. Fire-and-forget: a failed insert must never
 * break the practice loop.
 */
export function logAttempt(userId: string | null, attempt: PitchAttempt): void {
  if (userId) {
    void (async () => {
      const { error } = await supabase
        .from('pitch_attempts')
        .insert({ user_id: userId, ...attempt });
      if (error) console.error('pitch_attempts insert failed:', error.message);
    })();
    return;
  }
  // Guest: persist locally in the server row shape for later backfill.
  try {
    const list = readGuestAttempts();
    list.push({ ...attempt, created_at: new Date().toISOString() });
    localStorage.setItem(GUEST_KEY, JSON.stringify(list.slice(-GUEST_MAX)));
  } catch {
    // storage full/blocked — drop silently
  }
}

// ---- Karte aggregation (client-side over own RLS rows) ----

export interface PatternStat {
  pattern: string;
  attempts: number;
  errors: number;
  accuracy: number; // 0-100 mean
}

export interface KarteData {
  totalAttempts: number;
  headlineScore: number; // mean accuracy over the last 50 attempts
  patterns: PatternStat[]; // sorted worst-first, only patterns with >=3 attempts
  insufficientPatterns: string[]; // patterns with <3 attempts (not yet diagnosable)
  wrongWords: { word: string; reading: string; pattern: string | null; accuracy: number }[];
  recent: PitchAttempt[];
}

const MIN_PATTERN_SAMPLE = 3; // never diagnose a pattern from 1-2 noisy attempts

// Aggregate an attempt list (newest-first) into KarteData. Shared by the server
// (member) and localStorage (guest) paths so the diagnosis is identical.
function aggregate(rows: PitchAttempt[]): KarteData {
  const byPattern = new Map<string, { sum: number; n: number; errors: number }>();
  for (const r of rows) {
    const key = r.pattern_name || '不明';
    const s = byPattern.get(key) || { sum: 0, n: 0, errors: 0 };
    s.sum += r.accuracy;
    s.n += 1;
    if (r.accuracy < 80) s.errors += 1;
    byPattern.set(key, s);
  }
  const patterns: PatternStat[] = [];
  const insufficientPatterns: string[] = [];
  for (const [pattern, s] of byPattern) {
    if (s.n >= MIN_PATTERN_SAMPLE) {
      patterns.push({ pattern, attempts: s.n, errors: s.errors, accuracy: Math.round(s.sum / s.n) });
    } else {
      insufficientPatterns.push(pattern);
    }
  }
  patterns.sort((a, b) => a.accuracy - b.accuracy);

  // Worst words: latest attempt per word, keep failures.
  const latest = new Map<string, PitchAttempt>();
  for (const r of rows) if (!latest.has(r.word)) latest.set(r.word, r);
  const wrongWords = [...latest.values()]
    .filter((r) => r.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 20)
    .map((r) => ({ word: r.word, reading: r.reading, pattern: r.pattern_name, accuracy: r.accuracy }));

  const recent50 = rows.slice(0, 50);
  const headlineScore = recent50.length
    ? Math.round(recent50.reduce((s, r) => s + r.accuracy, 0) / recent50.length)
    : 0;

  return { totalAttempts: rows.length, headlineScore, patterns, insufficientPatterns, wrongWords, recent: rows };
}

export async function getKarteData(userId: string): Promise<KarteData> {
  const { data, error } = await supabase
    .from('pitch_attempts')
    .select('word, reading, pattern_name, target_nucleus, detected_nucleus, accuracy, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return aggregate((data || []) as PitchAttempt[]);
}

/** Karte from the guest's localStorage attempts — the registration carrot. */
export function getGuestKarteData(): KarteData {
  return aggregate([...readGuestAttempts()].reverse());
}

/**
 * Move guest-recorded attempts to the user's server log (call once after
 * signup/login). Keeps original timestamps so the karte history is honest.
 */
export async function backfillGuestAttempts(userId: string): Promise<number> {
  const list = readGuestAttempts();
  if (list.length === 0) return 0;
  try {
    const rows = list.map((a) => ({ user_id: userId, ...a }));
    const { error } = await supabase.from('pitch_attempts').insert(rows);
    if (error) throw error;
    localStorage.removeItem(GUEST_KEY);
    return rows.length;
  } catch (error) {
    console.error('guest attempt backfill failed:', error);
    return 0;
  }
}
