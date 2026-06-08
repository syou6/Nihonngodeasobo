import type { PitchFrame } from '../../lib/pitch-tracker';

export interface ExpectedPattern {
  morae: string[];
  pattern: number[]; // 1 = HIGH, 0 = LOW
}

interface Props {
  frames: PitchFrame[];
  expectedPattern?: ExpectedPattern;
  /** Draw the idealized native pitch line over the bands (a model to trace). */
  showReferenceLine?: boolean;
  width?: number | string;
  height?: number;
}

const PADDING = { top: 12, right: 12, bottom: 28, left: 40 };
const HIGH_COLOR = '#22c55e'; // green-500
const LOW_COLOR = '#9ca3af';  // gray-400
const LINE_COLOR = '#3b82f6'; // blue-500
const REF_COLOR = '#16a34a';  // green-600 — the native model line
const BAND_OPACITY = 0.18;

export function PitchContourGraph({
  frames,
  expectedPattern,
  showReferenceLine = true,
  width = '100%',
  height = 160,
}: Props) {
  const voiced = frames.filter((f) => f.pitch !== null);

  const innerW = typeof width === 'number' ? width - PADDING.left - PADDING.right : 600;
  const innerH = height - PADDING.top - PADDING.bottom;

  const pitchValues = voiced.map((f) => f.pitch as number);
  const rawMin = pitchValues.length > 0 ? Math.min(...pitchValues) : 70;
  const rawMax = pitchValues.length > 0 ? Math.max(...pitchValues) : 400;
  const pitchMin = Math.max(70, rawMin - 20);
  const pitchMax = Math.min(400, rawMax + 20);

  const maxTime = frames.length > 0 ? frames[frames.length - 1].time : 1;

  const toX = (time: number) => (time / maxTime) * innerW;
  const toY = (pitch: number) =>
    innerH - ((pitch - pitchMin) / (pitchMax - pitchMin)) * innerH;

  // Build polyline path, splitting on null gaps
  const pathSegments: string[] = [];
  let current: string[] = [];

  for (const frame of frames) {
    if (frame.pitch !== null) {
      current.push(`${toX(frame.time).toFixed(1)},${toY(frame.pitch).toFixed(1)}`);
    } else {
      if (current.length > 1) pathSegments.push(`M ${current.join(' L ')}`);
      current = [];
    }
  }
  if (current.length > 1) pathSegments.push(`M ${current.join(' L ')}`);

  // Reference bands
  const moraCount = expectedPattern?.morae.length ?? 0;
  const segW = moraCount > 0 ? innerW / moraCount : 0;
  const midY = innerH / 2;
  const bandH = innerH * 0.3;

  // Idealized native model line: sit in the middle of each mora's target band so
  // the learner has a smooth contour to trace, not just abstract H/L blocks.
  const refLine =
    showReferenceLine && moraCount > 0
      ? buildReferencePath(expectedPattern!.pattern, segW, midY, bandH, innerW)
      : null;

  const yAxisTicks = buildYTicks(pitchMin, pitchMax, 4);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${typeof width === 'number' ? width : 652} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Pitch contour graph"
      role="img"
    >
      <g transform={`translate(${PADDING.left},${PADDING.top})`}>
        {/* Y-axis ticks */}
        {yAxisTicks.map((hz) => {
          const y = toY(hz);
          return (
            <g key={hz}>
              <line x1={-4} y1={y} x2={innerW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={-8} y={y + 4} textAnchor="end" fontSize={9} fill="#6b7280">
                {hz}
              </text>
            </g>
          );
        })}

        {/* Expected pattern reference bands */}
        {expectedPattern?.morae.map((mora, i) => {
          const isHigh = expectedPattern.pattern[i] === 1;
          const x = i * segW;
          const bandY = isHigh ? midY - bandH : midY;
          return (
            <g key={i}>
              <rect
                x={x}
                y={bandY}
                width={segW}
                height={bandH}
                fill={isHigh ? HIGH_COLOR : LOW_COLOR}
                opacity={BAND_OPACITY}
              />
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={innerH}
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={x + segW / 2}
                y={innerH + 16}
                textAnchor="middle"
                fontSize={11}
                fill="#374151"
              >
                {mora}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={0} y1={0} x2={0} y2={innerH} stroke="#9ca3af" strokeWidth={1} />
        <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#9ca3af" strokeWidth={1} />

        {/* Native model line (dashed) — the target contour to trace */}
        {refLine && (
          <path
            d={refLine}
            fill="none"
            stroke={REF_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        )}

        {/* Pitch contour */}
        {pathSegments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* No data message */}
        {voiced.length === 0 && (
          <text
            x={innerW / 2}
            y={innerH / 2}
            textAnchor="middle"
            fontSize={12}
            fill="#9ca3af"
          >
            No pitch data
          </text>
        )}
      </g>
    </svg>
  );
}

// Build an SVG path for the native model line: one point at each mora's centre,
// at the vertical middle of its high/low band, extended to both edges. Uses a
// step at each H↔L boundary so the downstep reads as a crisp fall.
function buildReferencePath(
  pattern: number[],
  segW: number,
  midY: number,
  bandH: number,
  innerW: number,
): string {
  const yFor = (high: boolean) => (high ? midY - bandH / 2 : midY + bandH / 2);
  const pts: Array<[number, number]> = [];
  pattern.forEach((p, i) => {
    const high = p === 1;
    const y = yFor(high);
    const xStart = i * segW;
    const xEnd = (i + 1) * segW;
    // Step at the boundary: hold the previous level's x, then jump to this level.
    if (i > 0) pts.push([xStart, y]);
    pts.push([i === 0 ? 0 : xStart, y]);
    pts.push([i === pattern.length - 1 ? innerW : xEnd, y]);
  });
  if (pts.length === 0) return '';
  return `M ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')}`;
}

function buildYTicks(min: number, max: number, count: number): number[] {
  const step = Math.ceil((max - min) / count / 10) * 10;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max; v += step) {
    ticks.push(v);
  }
  return ticks;
}
