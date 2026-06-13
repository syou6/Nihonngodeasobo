import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls, type Variants } from 'framer-motion';

// PitchSheep — the app mascot. A pure SVG + framer-motion sheep that reacts to
// game state, built entirely in code (no Flutter, no Rive .riv dependency). It
// goes for Rive-grade life through layered micro-animation: breathing, an
// occasional ear twitch, a wandering gaze (real sclera + pupils, not dots), a
// shadow that shrinks when it leaves the ground, and squash-and-stretch springs.
//
// Delight budget (design-craft): idle stays subtle, a correct answer is a quick
// spring, a miss is GENTLE (we never make the learner feel bad — the brand), and
// a milestone gets the full magic (big jump + sparkles). When a Rive file ever
// exists, swap this for <RiveMascot/> — the SheepMood API stays the same so no
// caller changes.

export type SheepMood = 'idle' | 'thinking' | 'talking' | 'happy' | 'sad' | 'celebrate';

interface Props {
  mood: SheepMood;
  size?: number;
  className?: string;
}

// Whole-body motion per mood. rotate/scale reset on every entry so moods can't
// leave the sheep stuck mid-tilt. Jumps use a soft overshoot for bounce.
const body: Variants = {
  idle: { y: [0, -3, 0], rotate: 0, scaleX: 1, scaleY: 1, transition: { y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } } },
  thinking: { y: 0, rotate: -5, scaleX: 1, scaleY: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } },
  talking: { y: [0, -2, 0], rotate: [0, 1.5, -1.5, 0], scaleX: 1, scaleY: 1, transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -26, 4, 0], rotate: 0, scaleX: [1, 0.92, 1.08, 1], scaleY: [1, 1.12, 0.9, 1], transition: { duration: 0.62, ease: 'easeOut', times: [0, 0.4, 0.7, 1] } },
  sad: { y: 0, rotate: [0, -3, 3, -2, 0], scaleX: 1, scaleY: 1, transition: { duration: 0.7, ease: 'easeInOut' } },
  celebrate: { y: [0, -36, 2, -18, 0], rotate: [0, -4, 4, -2, 0], scaleX: [1, 0.9, 1.1, 0.96, 1], scaleY: [1, 1.14, 0.88, 1.04, 1], transition: { duration: 1.05, times: [0, 0.28, 0.55, 0.78, 1], ease: 'easeOut' } },
};

// The ground shadow shrinks/fades as the sheep leaves the floor (sells height).
const shadow: Variants = {
  idle: { scaleX: [1, 0.94, 1], opacity: [0.1, 0.07, 0.1], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  thinking: { scaleX: 1, opacity: 0.1, transition: { duration: 0.3 } },
  talking: { scaleX: 1, opacity: 0.1, transition: { duration: 0.3 } },
  happy: { scaleX: [1, 0.7, 1], opacity: [0.1, 0.05, 0.1], transition: { duration: 0.62, times: [0, 0.4, 1] } },
  sad: { scaleX: 1, opacity: 0.1, transition: { duration: 0.3 } },
  celebrate: { scaleX: [1, 0.62, 0.9, 0.7, 1], opacity: [0.1, 0.04, 0.08, 0.05, 0.1], transition: { duration: 1.05, times: [0, 0.28, 0.55, 0.78, 1] } },
};

const WOOL = '#FFFFFF';
const WOOL_EDGE = '#E7E2F2';
const FACE = '#E9DAC4';
const FACE_DK = '#D9C5A6';
const INK = '#3A3550';
const CHEEK = '#F7A8C4';

const WOOL_BUMPS: [number, number, number][] = [
  [44, 64, 18], [96, 64, 18], [54, 46, 17], [86, 46, 17], [70, 40, 18],
  [40, 80, 15], [100, 80, 15], [58, 92, 16], [82, 92, 16],
];

export const PitchSheep: React.FC<Props> = ({ mood, size = 120, className }) => {
  const [blink, setBlink] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const ears = useAnimationControls();
  const eyesOpen = mood === 'idle' || mood === 'thinking' || mood === 'talking';

  // Natural blink only when the eyes are open.
  useEffect(() => {
    if (!eyesOpen) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
        loop();
      }, 2200 + Math.random() * 2600);
    };
    loop();
    return () => clearTimeout(t);
  }, [eyesOpen]);

  // Wandering gaze — the pupils drift to a new spot every few seconds while idle,
  // and lock forward+up while thinking. Tiny offsets; this is what reads as alive.
  useEffect(() => {
    if (mood === 'thinking') { setGaze({ x: 0, y: -1.6 }); return; }
    if (!eyesOpen) { setGaze({ x: 0, y: 0 }); return; }
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setGaze({ x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 2 });
        loop();
      }, 1400 + Math.random() * 2200);
    };
    loop();
    return () => clearTimeout(t);
  }, [eyesOpen, mood]);

  // Occasional ear twitch while calm.
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'talking') return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(async () => {
        await ears.start({ rotate: [0, -6, 0], transition: { duration: 0.32 } });
        loop();
      }, 3000 + Math.random() * 4000);
    };
    loop();
    return () => clearTimeout(t);
  }, [mood, ears]);

  const cheeks = mood === 'happy' || mood === 'celebrate';

  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.svg viewBox="0 0 140 132" width={size} height={size} style={{ overflow: 'visible' }}>
        {/* contact shadow (one light source, vertical) */}
        <motion.ellipse cx="70" cy="122" rx="34" ry="6" fill="#000" variants={shadow} animate={mood} style={{ originX: '70px', originY: '122px' }} />

        {/* everything that jumps */}
        <motion.g variants={body} animate={mood} style={{ originX: '70px', originY: '120px' }}>
          {/* breathing — a slow, independent in/out the jump rides on top of */}
          <motion.g
            animate={{ scale: eyesOpen ? [1, 1.022, 1] : 1 }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '70px', originY: '88px' }}
          >
            {/* legs */}
            {[50, 64, 78, 92].map((x) => (
              <rect key={x} x={x} y="100" width="7" height="16" rx="3.5" fill={FACE_DK} />
            ))}

            {/* ears (twitch) — drawn under the wool */}
            <motion.g animate={ears} style={{ originX: '70px', originY: '68px' }}>
              <ellipse cx="42" cy="68" rx="11" ry="6.5" fill={FACE_DK} transform={`rotate(${mood === 'sad' ? 28 : 18} 42 68)`} />
              <ellipse cx="98" cy="68" rx="11" ry="6.5" fill={FACE_DK} transform={`rotate(${mood === 'sad' ? -28 : -18} 98 68)`} />
            </motion.g>

            {/* wool body — cloud of bumps with a soft inner shade for depth */}
            <g>
              {WOOL_BUMPS.map(([cx, cy, r], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
              ))}
              <ellipse cx="70" cy="70" rx="40" ry="34" fill={WOOL} />
              <ellipse cx="70" cy="80" rx="34" ry="20" fill="#EEEAF6" opacity="0.5" />
            </g>

            {/* face */}
            <ellipse cx="70" cy="72" rx="29" ry="27" fill={FACE} />
            <ellipse cx="70" cy="80" rx="24" ry="16" fill="#000" opacity="0.04" />
            {/* forelock curls */}
            <circle cx="60" cy="50" r="9" fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
            <circle cx="72" cy="47" r="10" fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
            <circle cx="82" cy="51" r="8" fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />

            {/* cheeks */}
            <AnimatePresence>
              {cheeks && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} exit={{ opacity: 0 }}>
                  <circle cx="54" cy="82" r="6" fill={CHEEK} />
                  <circle cx="86" cy="82" r="6" fill={CHEEK} />
                </motion.g>
              )}
            </AnimatePresence>

            {/* eyes + mouth */}
            <Eyes mood={mood} blink={blink} gaze={gaze} />
            <Mouth mood={mood} />
          </motion.g>
        </motion.g>

        {/* sparkles for the big moment */}
        <AnimatePresence>
          {mood === 'celebrate' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[[24, 40], [116, 36], [30, 78], [110, 80], [70, 16]].map(([x, y], i) => (
                <motion.text
                  key={i}
                  x={x}
                  y={y}
                  fontSize="16"
                  textAnchor="middle"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1, 0], opacity: [0, 1, 1, 0], y: [y, y - 8] }}
                  transition={{ duration: 1.1, delay: i * 0.08, repeat: Infinity, repeatDelay: 0.4 }}
                >
                  ✨
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>
    </div>
  );
};

const Eyes: React.FC<{ mood: SheepMood; blink: boolean; gaze: { x: number; y: number } }> = ({ mood, blink, gaze }) => {
  // happy / celebrate → upward arc "^ ^"
  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M55 73 Q60 67 65 73" />
        <path d="M75 73 Q80 67 85 73" />
      </g>
    );
  }
  // sad → gentle droop (not crying — soft)
  if (mood === 'sad') {
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M55 74 Q60 79 65 74" />
        <path d="M75 74 Q80 79 85 74" />
      </g>
    );
  }
  // open eyes: white sclera + a pupil that tracks the gaze + catchlight; blink
  // collapses the whole eye vertically.
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={73} rx="5" ry="6" fill="#fff" stroke="#E3DEEC" strokeWidth="0.8" />
      <motion.circle cx={cx} cy={73} r="3.4" fill={INK} animate={{ cx: cx + gaze.x, cy: 73 + gaze.y }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} />
      <motion.circle cx={cx + 1.4} cy={71.2} r="1.2" fill="#fff" animate={{ cx: cx + 1.4 + gaze.x, cy: 71.2 + gaze.y }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} />
    </g>
  );
  return (
    <motion.g animate={{ scaleY: blink ? 0.08 : 1 }} transition={{ duration: 0.08 }} style={{ originY: '73px' }}>
      {eye(60)}
      {eye(80)}
    </motion.g>
  );
};

const Mouth: React.FC<{ mood: SheepMood }> = ({ mood }) => {
  if (mood === 'happy' || mood === 'celebrate') {
    return <path d="M62 86 Q70 96 78 86 Z" fill={INK} />;
  }
  if (mood === 'sad') {
    return <path d="M64 90 Q70 85 76 90" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />;
  }
  if (mood === 'talking') {
    // mouth flaps open/closed to fake a lip-sync while audio plays
    return (
      <motion.ellipse cx="70" cy="88" rx="5" fill={INK} animate={{ ry: [1.2, 4.5, 1.2] }} transition={{ duration: 0.26, repeat: Infinity, ease: 'easeInOut' }} />
    );
  }
  if (mood === 'thinking') {
    return <circle cx="70" cy="88" r="2.5" fill={INK} />;
  }
  return <path d="M64 87 Q70 91 76 87" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />;
};
