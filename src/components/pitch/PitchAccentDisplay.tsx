import React from 'react';

interface Props {
  morae: string[];
  /** H/L pattern: 0=low, 1=high. Length = morae.length + 1 (particle slot). */
  pattern: number[];
  patternName: string;
  /** Per-mora correctness overlay. null = no feedback for that mora. */
  detectedPattern?: (boolean | null)[];
}

const VIEWBOX_HEIGHT = 80;
const MORA_WIDTH = 48;
const DOT_RADIUS = 5;
const PADDING_X = 24;
const HIGH_Y = 16;
const LOW_Y = 52;
const LABEL_Y = 72;

function computePoints(pattern: number[], moraeCount: number): { x: number; y: number }[] {
  // We display morae slots only (not the particle slot at the end)
  return pattern.slice(0, moraeCount).map((level, i) => ({
    x: PADDING_X + i * MORA_WIDTH,
    y: level === 1 ? HIGH_Y : LOW_Y,
  }));
}

function dotColor(detected: boolean | null | undefined): string {
  if (detected === true) return '#22c55e';  // green-500
  if (detected === false) return '#ef4444'; // red-500
  return '#3b82f6'; // blue-500 (expected, no feedback)
}

export function PitchAccentDisplay({
  morae,
  pattern,
  patternName,
  detectedPattern,
}: Props): React.ReactElement {
  const moraeCount = morae.length;
  const points = computePoints(pattern, moraeCount);
  const viewBoxWidth = PADDING_X * 2 + Math.max(0, moraeCount - 1) * MORA_WIDTH;

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${VIEWBOX_HEIGHT}`}
        width={viewBoxWidth}
        height={VIEWBOX_HEIGHT}
        aria-label={`ピッチアクセン図: ${patternName}`}
        role="img"
        style={{ maxWidth: '100%' }}
      >
        {/* Pitch polyline */}
        {points.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Mora labels and dots */}
        {points.map((pt, i) => {
          const detectedValue = detectedPattern ? detectedPattern[i] : undefined;
          const color = detectedValue !== undefined ? dotColor(detectedValue) : '#3b82f6';

          return (
            <g key={i}>
              {/* Mora label */}
              <text
                x={pt.x}
                y={LABEL_Y}
                textAnchor="middle"
                fontSize={14}
                fontFamily="sans-serif"
                fill="#374151"
              >
                {morae[i]}
              </text>

              {/* Dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={DOT_RADIUS}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Pattern name */}
      <span className="text-xs text-gray-500 font-medium">{patternName}型</span>
    </div>
  );
}
