// Synthesized UI sound (Web Audio, no asset pipeline) — the delight layer the
// app was missing. Respects a mute toggle. Must be triggered inside a user
// gesture the first time (browser autoplay policy).

let _actx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_actx) _actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (_actx.state === 'suspended') void _actx.resume();
    return _actx;
  } catch { return null; }
}

export function tone(freq: number, start: number, dur: number, gain = 0.12, type: OscillatorType = 'sine'): void {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function isMuted(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem('pitchMuted') === '1';
}
export function setMutedFlag(m: boolean): void {
  localStorage.setItem('pitchMuted', m ? '1' : '0');
}

function haptic(ms = 16): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
}

/** Production-score feedback: nailed drop = rising perfect fifth (climbs per combo). */
export function playScore(accuracy: number, combo = 0): void {
  if (isMuted()) return;
  if (accuracy >= 80) {
    const base = 523 * Math.pow(2 ** (1 / 12), Math.min(combo, 7));
    tone(base, 0, 0.18, 0.13, 'triangle');
    tone(base * 1.5, 0.08, 0.28, 0.13, 'triangle');
    haptic(18);
  } else if (accuracy >= 50) {
    tone(440, 0, 0.16, 0.08);
  } else {
    tone(294, 0, 0.2, 0.07);
  }
}

/** Ear-game correct: a quick bright two-note pop, pitched up by combo. */
export function playCorrect(combo = 0): void {
  if (isMuted()) return;
  const base = 587 * Math.pow(2 ** (1 / 12), Math.min(combo, 10));
  tone(base, 0, 0.1, 0.12, 'triangle');
  tone(base * 1.335, 0.06, 0.16, 0.12, 'triangle'); // up a fourth-ish
  haptic(12);
}

/** Ear-game wrong: a soft, non-judgy descending blip (never a buzzer). */
export function playWrong(): void {
  if (isMuted()) return;
  tone(392, 0, 0.12, 0.07);
  tone(330, 0.1, 0.18, 0.07);
}

/** Session-clear flourish: a little ascending arpeggio. */
export function playClear(): void {
  if (isMuted()) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 0.11, 'triangle'));
  haptic(30);
}
