import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls, type Variants } from 'framer-motion';

// PitchBird — the app mascot: a chibi uguisu (鶯, Japanese bush warbler), the
// bird Japan associates with beautiful song. It fits the product on every axis
// the sheep didn't: sound + pitch + listening + Japan, and it can ride the pitch
// contour (hop to the high mora, drop at the nucleus) — a teaching device, not
// decoration. Built entirely in code (no Flutter / no Rive .riv). Reacts to game
// state via a tiny Mood API; a Rive file could later swap in behind the same API.
//
// Delight budget (design-craft): idle is subtle (bob + breathe + blink + gaze +
// the odd wing flutter), a correct answer is a quick hop with a ♪, a miss is
// GENTLE (we never make the learner feel bad — the brand), and a milestone gets
// the full magic (big hop + wing flap + ♪♪ + sparkles).

export type BirdMood = 'idle' | 'thinking' | 'talking' | 'happy' | 'sad' | 'celebrate';

interface Props {
  mood: BirdMood;
  size?: number;
  className?: string;
}

// Whole-body motion per mood. Resets transform on every entry so moods can't
// leave the bird stuck. Hops use a soft overshoot for bounce.
const body: Variants = {
  idle: { y: [0, -3, 0], rotate: 0, scaleX: 1, scaleY: 1, transition: { y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } } },
  thinking: { y: 0, rotate: -6, scaleX: 1, scaleY: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } },
  talking: { y: [0, -2, 0], rotate: [0, 1.5, -1.5, 0], scaleX: 1, scaleY: 1, transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -28, 4, 0], rotate: 0, scaleX: [1, 0.93, 1.07, 1], scaleY: [1, 1.12, 0.9, 1], transition: { duration: 0.62, ease: 'easeOut', times: [0, 0.4, 0.7, 1] } },
  sad: { y: 0, rotate: [0, -3, 3, -2, 0], scaleX: 1, scaleY: 1, transition: { duration: 0.7, ease: 'easeInOut' } },
  celebrate: { y: [0, -38, 2, -20, 0], rotate: [0, -4, 4, -2, 0], scaleX: [1, 0.9, 1.1, 0.96, 1], scaleY: [1, 1.14, 0.88, 1.04, 1], transition: { duration: 1.05, times: [0, 0.28, 0.55, 0.78, 1], ease: 'easeOut' } },
};

// Ground shadow shrinks/fades as the bird leaves the floor (sells height).
const shadow: Variants = {
  idle: { scaleX: [1, 0.94, 1], opacity: [0.1, 0.07, 0.1], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  thinking: { scaleX: 1, opacity: 0.1, transition: { duration: 0.3 } },
  talking: { scaleX: 1, opacity: 0.1, transition: { duration: 0.3 } },
  happy: { scaleX: [1, 0.68, 1], opacity: [0.1, 0.05, 0.1], transition: { duration: 0.62, times: [0, 0.4, 1] } },
  sad: { scaleX: 1, opacity: 0.1, transition: { duration: 0.3 } },
  celebrate: { scaleX: [1, 0.6, 0.9, 0.68, 1], opacity: [0.1, 0.04, 0.08, 0.05, 0.1], transition: { duration: 1.05, times: [0, 0.28, 0.55, 0.78, 1] } },
};

// 鶯色 — a dulled olive-green (traditional uguisu-iro), cream belly, tan beak.
const GREEN = '#94A24E';
const GREEN_DK = '#7C8A3E';
const BELLY = '#F0EBD6';
const BEAK = '#E8A23D';
const BEAK_DK = '#D08C2C';
const INK = '#3A3550';
const CHEEK = '#F2A65A';

export const PitchBird: React.FC<Props> = ({ mood, size = 120, className }) => {
  const [blink, setBlink] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const wings = useAnimationControls();
  const eyesOpen = mood === 'idle' || mood === 'thinking' || mood === 'talking';

  // natural blink only when the eyes are open
  useEffect(() => {
    if (!eyesOpen) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => { t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 120); loop(); }, 2200 + Math.random() * 2600); };
    loop();
    return () => clearTimeout(t);
  }, [eyesOpen]);

  // wandering gaze — pupils drift while idle, lock up while thinking
  useEffect(() => {
    if (mood === 'thinking') { setGaze({ x: 0, y: -1.6 }); return; }
    if (!eyesOpen) { setGaze({ x: 0, y: 0 }); return; }
    let t: ReturnType<typeof setTimeout>;
    const loop = () => { t = setTimeout(() => { setGaze({ x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 2 }); loop(); }, 1400 + Math.random() * 2200); };
    loop();
    return () => clearTimeout(t);
  }, [eyesOpen, mood]);

  // occasional wing flutter while calm
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'talking') return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => { t = setTimeout(async () => { await wings.start({ rotate: [0, -16, 0], transition: { duration: 0.3 } }); loop(); }, 2800 + Math.random() * 4200); };
    loop();
    return () => clearTimeout(t);
  }, [mood, wings]);

  // wings spread on the happy/celebrate hop
  useEffect(() => {
    if (mood === 'happy') wings.start({ rotate: [-26, 0], transition: { duration: 0.5, ease: 'easeOut' } });
    else if (mood === 'celebrate') wings.start({ rotate: [-34, -10, -34, -14, 0], transition: { duration: 1.0 } });
  }, [mood, wings]);

  const cheeks = mood === 'happy' || mood === 'celebrate';
  const notes = mood === 'happy' || mood === 'celebrate';

  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.svg viewBox="0 0 140 132" width={size} height={size} style={{ overflow: 'visible' }}>
        {/* contact shadow (one light source, vertical) */}
        <motion.ellipse cx="70" cy="124" rx="32" ry="5.5" fill="#000" variants={shadow} animate={mood} style={{ originX: '70px', originY: '124px' }} />

        {/* everything that hops */}
        <motion.g variants={body} animate={mood} style={{ originX: '70px', originY: '122px' }}>
          {/* breathing — slow independent in/out the hop rides on top of */}
          <motion.g animate={{ scale: eyesOpen ? [1, 1.022, 1] : 1 }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: '70px', originY: '92px' }}>
            {/* feet */}
            <g stroke={BEAK} strokeWidth="3" strokeLinecap="round">
              <path d="M62 108 v8 M58 118 h8" />
              <path d="M78 108 v8 M74 118 h8" />
            </g>

            {/* tail (behind body, lower-right) */}
            <g fill={GREEN_DK}>
              <path d="M98 92 q22 4 30 16 q-16 2 -28 -6 z" />
              <path d="M100 98 q20 8 26 20 q-16 -2 -26 -12 z" opacity="0.85" />
            </g>

            {/* far wing (behind), flutters */}
            <motion.g animate={wings} style={{ originX: '104px', originY: '72px' }}>
              <ellipse cx="103" cy="76" rx="12" ry="18" fill={GREEN_DK} transform="rotate(18 103 76)" />
            </motion.g>

            {/* body */}
            <ellipse cx="70" cy="72" rx="40" ry="39" fill={GREEN} stroke={GREEN_DK} strokeWidth="1.5" />
            {/* belly */}
            <ellipse cx="70" cy="86" rx="26" ry="22" fill={BELLY} />
            {/* crest tuft */}
            <g fill={GREEN_DK}>
              <path d="M66 36 q-3 -10 3 -14 q2 8 -1 14 z" />
              <path d="M72 35 q1 -11 7 -13 q-1 9 -5 14 z" />
            </g>

            {/* cheeks */}
            <AnimatePresence>
              {cheeks && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} exit={{ opacity: 0 }}>
                  <circle cx="50" cy="80" r="5.5" fill={CHEEK} />
                  <circle cx="90" cy="80" r="5.5" fill={CHEEK} />
                </motion.g>
              )}
            </AnimatePresence>

            {/* eyes + beak */}
            <Eyes mood={mood} blink={blink} gaze={gaze} />
            <Beak mood={mood} />

            {/* near wing (front), flutters/spreads */}
            <motion.g animate={wings} style={{ originX: '36px', originY: '72px' }}>
              <ellipse cx="37" cy="76" rx="12" ry="18" fill={GREEN_DK} transform="rotate(-18 37 76)" />
            </motion.g>
          </motion.g>
        </motion.g>

        {/* ♪ song notes (the bird's whole point) */}
        <AnimatePresence>
          {notes && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} fill={GREEN_DK}>
              {(mood === 'celebrate' ? [[26, 44], [112, 40], [70, 14], [20, 78]] : [[34, 40], [104, 44]]).map(([x, y], i) => (
                <motion.text key={i} x={x} y={y} fontSize="20" textAnchor="middle"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.1, 1, 0], opacity: [0, 1, 1, 0], y: [y, y - 12] }}
                  transition={{ duration: 1.1, delay: i * 0.12, repeat: Infinity, repeatDelay: 0.4 }}>♪</motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* sparkles for the big moment */}
        <AnimatePresence>
          {mood === 'celebrate' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[[44, 30], [96, 28], [60, 18]].map(([x, y], i) => (
                <motion.text key={i} x={x} y={y} fontSize="15" textAnchor="middle"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1, 0], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.0, delay: 0.2 + i * 0.1, repeat: Infinity, repeatDelay: 0.5 }}>✨</motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>
    </div>
  );
};

const Eyes: React.FC<{ mood: BirdMood; blink: boolean; gaze: { x: number; y: number } }> = ({ mood, blink, gaze }) => {
  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M53 70 Q58 64 63 70" />
        <path d="M77 70 Q82 64 87 70" />
      </g>
    );
  }
  if (mood === 'sad') {
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M53 71 Q58 76 63 71" />
        <path d="M77 71 Q82 76 87 71" />
      </g>
    );
  }
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={70} rx="5" ry="6" fill="#fff" stroke="#E3DEEC" strokeWidth="0.8" />
      <motion.circle cx={cx} cy={70} r="3.4" fill={INK} animate={{ cx: cx + gaze.x, cy: 70 + gaze.y }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} />
      <motion.circle cx={cx + 1.4} cy={68.2} r="1.2" fill="#fff" animate={{ cx: cx + 1.4 + gaze.x, cy: 68.2 + gaze.y }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} />
    </g>
  );
  return (
    <motion.g animate={{ scaleY: blink ? 0.08 : 1 }} transition={{ duration: 0.08 }} style={{ originY: '70px' }}>
      {eye(58)}
      {eye(82)}
    </motion.g>
  );
};

const Beak: React.FC<{ mood: BirdMood }> = ({ mood }) => {
  // upper mandible is fixed; lower drops to "chirp" while talking / smiles open when happy
  const openY = mood === 'happy' || mood === 'celebrate' ? 4 : 0;
  return (
    <g>
      {/* upper */}
      <path d="M62 80 H78 L70 86 Z" fill={BEAK} />
      {/* lower (animated) */}
      {mood === 'talking' ? (
        <motion.path d="M63 81 H77 L70 86 Z" fill={BEAK_DK} animate={{ y: [0, 5, 0] }} transition={{ duration: 0.26, repeat: Infinity, ease: 'easeInOut' }} />
      ) : (
        <path d="M63 81 H77 L70 86 Z" fill={BEAK_DK} transform={`translate(0 ${openY})`} />
      )}
    </g>
  );
};
