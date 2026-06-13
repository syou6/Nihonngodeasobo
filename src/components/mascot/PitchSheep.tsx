import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// PitchSheep — the app mascot. A pure SVG + framer-motion sheep that reacts to
// game state. Delight budget (design-craft): idle is a subtle bob + blink, a
// correct answer is a quick spring jump, a miss is GENTLE (we never make the
// learner feel bad — that's the brand), and a milestone gets the full magic
// (big jump + sparkles). When a Rive .riv exists, swap this for <RiveMascot/>;
// the Mood API stays the same so callers don't change.

export type SheepMood = 'idle' | 'thinking' | 'talking' | 'happy' | 'sad' | 'celebrate';

interface Props {
  mood: SheepMood;
  size?: number;
  className?: string;
}

// Whole-body motion per mood. rotate/scale reset on every entry so moods can't
// leave the sheep stuck mid-tilt.
const body: Variants = {
  idle: { y: [0, -3, 0], rotate: 0, scaleX: 1, scaleY: 1, transition: { y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } } },
  thinking: { y: 0, rotate: -5, scaleX: 1, scaleY: 1, transition: { type: 'spring', stiffness: 200, damping: 18 } },
  talking: { y: [0, -2, 0], rotate: [0, 1.5, -1.5, 0], scaleX: 1, scaleY: 1, transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -24, 0], rotate: 0, scaleX: [1, 0.95, 1.05, 1], scaleY: [1, 1.08, 0.94, 1], transition: { duration: 0.55, ease: 'easeOut' } },
  sad: { y: 0, rotate: [0, -3, 3, -2, 0], scaleX: 1, scaleY: 1, transition: { duration: 0.7, ease: 'easeInOut' } },
  celebrate: { y: [0, -34, 2, -16, 0], rotate: 0, scaleX: 1, scaleY: 1, transition: { duration: 1.0, times: [0, 0.3, 0.55, 0.78, 1], ease: 'easeOut' } },
};

const WOOL = '#FFFFFF';
const WOOL_EDGE = '#E7E2F2';
const FACE = '#E9DAC4';
const FACE_DK = '#D9C5A6';
const INK = '#3A3550';
const CHEEK = '#F7A8C4';

export const PitchSheep: React.FC<Props> = ({ mood, size = 120, className }) => {
  const [blink, setBlink] = useState(false);

  // natural blink only when the eyes are open (idle/thinking)
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'thinking' && mood !== 'talking') return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2200 + Math.random() * 2400);
    };
    loop();
    return () => clearTimeout(t);
  }, [mood]);

  const cheeks = mood === 'happy' || mood === 'celebrate';
  const lookUp = mood === 'thinking';

  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 140 132"
        width={size}
        height={size}
        animate={mood}
        variants={body}
        style={{ originX: 0.5, originY: 1, overflow: 'visible' }}
      >
        {/* contact shadow (one light source, vertical) */}
        <ellipse cx="70" cy="122" rx="34" ry="6" fill="#000" opacity="0.08" />

        {/* legs */}
        {[50, 64, 78, 92].map((x) => (
          <rect key={x} x={x} y="100" width="7" height="16" rx="3.5" fill={FACE_DK} />
        ))}

        {/* wool body — cloud of bumps */}
        <g>
          {[
            [44, 64, 18], [96, 64, 18], [54, 46, 17], [86, 46, 17], [70, 40, 18],
            [40, 80, 15], [100, 80, 15], [58, 92, 16], [82, 92, 16],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
          ))}
          <ellipse cx="70" cy="70" rx="40" ry="34" fill={WOOL} />
        </g>

        {/* face */}
        <ellipse cx="70" cy="72" rx="29" ry="27" fill={FACE} />
        {/* forelock curls */}
        <circle cx="60" cy="50" r="9" fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
        <circle cx="72" cy="47" r="10" fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
        <circle cx="82" cy="51" r="8" fill={WOOL} stroke={WOOL_EDGE} strokeWidth="1.5" />
        {/* ears */}
        <ellipse cx="42" cy="68" rx="11" ry="6.5" fill={FACE_DK} transform={`rotate(${mood === 'sad' ? 28 : 18} 42 68)`} />
        <ellipse cx="98" cy="68" rx="11" ry="6.5" fill={FACE_DK} transform={`rotate(${mood === 'sad' ? -28 : -18} 98 68)`} />

        {/* cheeks */}
        <AnimatePresence>
          {cheeks && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} exit={{ opacity: 0 }}>
              <circle cx="54" cy="82" r="6" fill={CHEEK} />
              <circle cx="86" cy="82" r="6" fill={CHEEK} />
            </motion.g>
          )}
        </AnimatePresence>

        {/* eyes */}
        <Eyes mood={mood} blink={blink} lookUp={lookUp} />

        {/* mouth */}
        <Mouth mood={mood} />

        {/* sparkles for the big moment */}
        <AnimatePresence>
          {mood === 'celebrate' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[
                [24, 40], [116, 36], [30, 78], [110, 80], [70, 16],
              ].map(([x, y], i) => (
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

const Eyes: React.FC<{ mood: SheepMood; blink: boolean; lookUp: boolean }> = ({ mood, blink, lookUp }) => {
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
  // idle / thinking → round eyes that blink; thinking glances up
  const dy = lookUp ? -2 : 0;
  return (
    <g fill={INK}>
      <ellipse cx="60" cy={73 + dy} rx="4" ry={blink ? 0.6 : 5} />
      <ellipse cx="80" cy={73 + dy} rx="4" ry={blink ? 0.6 : 5} />
      {/* catchlight */}
      {!blink && (
        <g fill="#fff">
          <circle cx="61.5" cy={71 + dy} r="1.3" />
          <circle cx="81.5" cy={71 + dy} r="1.3" />
        </g>
      )}
    </g>
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
      <motion.ellipse
        cx="70"
        cy="88"
        rx="5"
        fill={INK}
        animate={{ ry: [1.2, 4.5, 1.2] }}
        transition={{ duration: 0.26, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }
  if (mood === 'thinking') {
    return <circle cx="70" cy="88" r="2.5" fill={INK} />;
  }
  return <path d="M64 87 Q70 91 76 87" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />;
};
