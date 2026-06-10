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
