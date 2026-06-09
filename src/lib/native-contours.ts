import type { NativeContour } from '../components/pitch/PitchContourGraph';

// Real native pitch contours extracted from the reference audio at build time
// (scripts/gen-pitch-contours.mjs → public/pitch-contours.json). Fetched once
// and cached; failures degrade gracefully to the idealized model line.

export type ContourMap = Record<string, NativeContour>;

let cache: ContourMap | null = null;
let inflight: Promise<ContourMap> | null = null;

export function loadNativeContours(): Promise<ContourMap> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/pitch-contours.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: ContourMap) => {
        cache = j && typeof j === 'object' ? j : {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return inflight;
}
