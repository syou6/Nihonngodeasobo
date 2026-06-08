import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft, RotateCcw, ChevronRight, Loader2, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { PitchWordCard } from './PitchWordCard';
import { PitchContourGraph } from './PitchContourGraph';
import { usePitchAccent } from '../../hooks/usePitchAccent';
import { PitchTracker, type PitchFrame } from '../../lib/pitch-tracker';
import { comparePitchToPattern } from '../../lib/pitch-analyzer';
import { trackEvent } from '../../lib/analytics';

// Curated beginner word set. Each carries its intended reading so the dictionary
// lookup picks the correct entry (entries are not ordered by commonness — e.g.
// 学生 lists がくしょう before がくせい). All readings verified against
// /pitch-accents.json. Includes minimal pairs where pitch alone changes meaning
// (箸/橋, 雨/飴, 花/鼻).
const PRACTICE_WORDS: { word: string; reading: string }[] = [
  { word: '日本', reading: 'にほん' }, { word: '学生', reading: 'がくせい' },
  { word: '先生', reading: 'せんせい' }, { word: '水', reading: 'みず' },
  { word: '山', reading: 'やま' }, { word: '川', reading: 'かわ' },
  { word: '雨', reading: 'あめ' }, { word: '飴', reading: 'あめ' },
  { word: '箸', reading: 'はし' }, { word: '橋', reading: 'はし' },
  { word: '花', reading: 'はな' }, { word: '鼻', reading: 'はな' },
  { word: '母', reading: 'はは' }, { word: '友達', reading: 'ともだち' },
  { word: '学校', reading: 'がっこう' }, { word: '電話', reading: 'でんわ' },
  { word: '名前', reading: 'なまえ' }, { word: '犬', reading: 'いぬ' },
  { word: '猫', reading: 'ねこ' }, { word: '元気', reading: 'げんき' },
  { word: '今日', reading: 'きょう' }, { word: '明日', reading: 'あした' },
  { word: '海', reading: 'うみ' },
];

type Phase = 'ready' | 'recording' | 'result';

interface PitchPracticeProps {
  onBack: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

// Actionable feedback from the detected vs target accent nucleus.
function coachText(
  result: { userNucleus: number; targetNucleus: number; accuracy: number },
  morae: string[],
): string {
  const at = (n: number) => (n >= 1 && n <= morae.length ? `「${morae[n - 1]}」` : 'the particle');
  const { userNucleus, targetNucleus, accuracy } = result;
  if (accuracy >= 80) {
    return targetNucleus === 0
      ? 'Nice — 平板: it stays high with no drop. ✅'
      : `Nice — the drop after ${at(targetNucleus)} is right. ✅`;
  }
  const target = targetNucleus === 0 ? 'no drop — 平板, stays high' : `a drop after ${at(targetNucleus)}`;
  const you = userNucleus === 0 ? 'you kept it flat' : `you dropped after ${at(userNucleus)}`;
  return `Target: ${target}. But ${you}.`;
}

export const PitchPractice: React.FC<PitchPracticeProps> = ({ onBack }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [matches, setMatches] = useState<(boolean | null)[] | undefined>(undefined);
  const [coach, setCoach] = useState<string | null>(null);
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('pitchStreak') || 0));
  const [error, setError] = useState<string | null>(null);

  const trackerRef = useRef<PitchTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { word, reading } = PRACTICE_WORDS[wordIndex];
  const pitchData = usePitchAccent(word, reading);
  const isLoadingAccent = pitchData === null;

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackerRef.current = null;
  };

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      trackerRef.current?.stop();
      releaseMic();
    };
  }, []);

  const resetAttempt = () => {
    setPhase('ready');
    setFrames([]);
    setAccuracy(null);
    setMatches(undefined);
    setCoach(null);
    setError(null);
  };

  const startRecording = async () => {
    if (!pitchData) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const tracker = new PitchTracker();
      trackerRef.current = tracker;
      tracker.start(stream);
      setPhase('recording');
    } catch {
      setError('Microphone access was denied. Please allow mic access and try again.');
      releaseMic();
    }
  };

  const stopRecording = () => {
    const tracker = trackerRef.current;
    if (!tracker || !pitchData) return;

    const captured = tracker.stop();
    releaseMic();

    const moraCount = pitchData.morae.length;
    const result = comparePitchToPattern(captured, pitchData.pattern, moraCount);

    setFrames(captured);
    setMatches(result.matches);
    setAccuracy(result.accuracy);
    setCoach(coachText(result, pitchData.morae));
    const newStreak = result.accuracy >= 80 ? streak + 1 : 0;
    setStreak(newStreak);
    localStorage.setItem('pitchStreak', String(newStreak));
    setPhase('result');
    trackEvent('pitch_scored', { word, accuracy: result.accuracy });
  };

  const nextWord = () => {
    setWordIndex((i) => (i + 1) % PRACTICE_WORDS.length);
    resetAttempt();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pitch Accent Practice</h1>
          <p className="text-sm text-gray-500">
            Word {wordIndex + 1} of {PRACTICE_WORDS.length}
          </p>
        </div>
        {streak > 0 && (
          <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-600 font-bold text-sm px-3 py-1">
            🔥 {streak}
          </div>
        )}
      </div>

      <motion.div
        key={word}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Target word + expected pattern (green/red overlay after an attempt) */}
        <div className="flex justify-center">
          <PitchWordCard word={word} reading={reading} detectedPattern={matches} />
        </div>

        {/* Result: score + recorded contour vs expected bands */}
        {phase === 'result' && accuracy !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="text-center mb-4">
              <div className={`text-5xl font-black ${scoreColor(accuracy)}`}>
                {accuracy}
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Pitch accuracy</p>
            </div>

            {coach && (
              <p className={`text-center text-sm font-medium mb-4 ${accuracy >= 80 ? 'text-green-700' : 'text-gray-700'}`}>
                {coach}
              </p>
            )}

            {pitchData && (
              <PitchContourGraph
                frames={frames}
                expectedPattern={{ morae: pitchData.morae, pattern: pitchData.pattern }}
              />
            )}

            <p className="text-xs text-gray-400 text-center mt-2">
              Blue line = your pitch · shaded bands = target high/low
            </p>
          </motion.div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          {/* Listen to the native model (pre-generated static audio; silently
              no-ops if the asset isn't present yet) */}
          <button
            type="button"
            onClick={() => {
              const a = new Audio(`/pitch-audio/${encodeURIComponent(word)}.mp3`);
              a.play().catch(() => {/* asset missing or autoplay blocked */});
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            <Volume2 className="w-4 h-4" />
            Listen to a native speaker
          </button>

          {phase === 'ready' && (
            <Button
              onClick={startRecording}
              variant="primary"
              size="lg"
              className="w-full sm:w-64"
              disabled={isLoadingAccent}
            >
              {isLoadingAccent ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Record & say it
                </>
              )}
            </Button>
          )}

          {phase === 'recording' && (
            <Button
              onClick={stopRecording}
              variant="primary"
              size="lg"
              className="w-full sm:w-64 !bg-red-500 hover:!bg-red-600"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop
            </Button>
          )}

          {phase === 'result' && (
            <div className="flex gap-3 w-full sm:w-auto">
              <Button onClick={resetAttempt} variant="outline" size="lg" className="flex-1">
                <RotateCcw className="w-5 h-5 mr-2" />
                Retry
              </Button>
              <Button onClick={nextWord} variant="primary" size="lg" className="flex-1">
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
