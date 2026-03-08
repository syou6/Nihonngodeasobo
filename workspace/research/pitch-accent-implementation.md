# Japanese Pitch Accent Evaluation - Full Research Report

## Executive Summary

Japanese pitch accent evaluation in a web app is fully achievable using a layered approach:
(1) a static pitch accent dictionary (Kanjium, 124K words, CC-licensed) to show expected patterns,
(2) client-side fundamental frequency (F0) extraction via Web Audio API + pitchfinder/pitchy,
and (3) Gemini 2.5 Flash audio analysis for holistic pronunciation feedback via the existing Edge Function.
No single solution covers all three layers, but combining them gives richer feedback than any specialist commercial API currently supports for Japanese specifically.

---

## Findings

### 1. How Japanese Pitch Accent Works (高低アクセント)

Japanese is a pitch-accent language, not a tonal language. Pitch does not carry lexical meaning on individual syllables throughout a word the way Chinese tones do, but a single "downstep" (核, kaku) position per word determines the entire melody pattern. The unit of timing is the mora (拍), not the syllable.

All standard Tokyo-dialect words belong to one of four accent pattern types:

| Pattern | Japanese name | Notation example (L=low, H=high) | Notes |
|---------|---------------|----------------------------------|-------|
| Flat / Accentless | 平板 (heiban) | L-H-H-H... | High persists onto particles |
| Head-high | 頭高 (atamadaka) | H-L-L-L | Drop after mora 1 |
| Middle-high | 中高 (nakadaka) | L-H...H-L-L | Drop after mora N (2 <= N <= end-1) |
| Tail-high | 尾高 (odaka) | L-H-H-H then drop on particle | Indistinguishable from heiban without a particle |

Pitch accent is encoded as a single integer representing the downstep position:
- 0 = heiban (no downstep)
- 1 = atamadaka
- 2..n = nakadaka or odaka (drops after mora n)

This integer encoding is what Kanjium and NHK dictionaries store, and what the hatsuon npm library consumes.

---

### 2. Pitch Accent Dictionaries and Data Sources

#### Kanjium (Recommended - Open Source)
- Repository: https://github.com/mifunetoshiro/kanjium
- File: `data/accents.txt` - TSV with 124,137 entries
- Format: `word\treading\taccent_number`
- License: Creative Commons (free for app use)
- Used by: Anki add-ons, Yomichan/Yomitan, the React training game Nami
- How to bundle: Download and convert to JSON at build time; ship as a static asset

#### NHK日本語発音アクセント辞典 (Not Open Source)
- The gold standard reference dictionary
- Not freely available as data; available as a physical book with CD-ROM
- Some Anki shared decks distribute derived data; legal status is contested
- Do not use NHK data directly in a commercial app

#### OJAD (Online Japanese Accent Dictionary)
- URL: https://www.gavo.t.u-tokyo.ac.jp/ojad/
- 9,000+ nouns, 3,500+ declinable words, 42,300 conjugation patterns
- Has a sentence pitch visualiser (Suzuki-kun) that generates F0 contour SVGs
- No public API; web scraping violates ToS
- Best used as a reference for the development team, not programmatically

#### Wadoku
- Open German-Japanese dictionary with pitch data
- Used by SVG_pitch project: https://github.com/IllDepence/SVG_pitch
- Smaller coverage than Kanjium

**Practical recommendation**: Bundle Kanjium's `accents.txt` as a JSON lookup table. At 124K entries it is ~5MB uncompressed, ~1.5MB gzipped. Serve it as a static asset from Vercel and cache in IndexedDB/localStorage after first load.

---

### 3. Client-Side Pitch Detection with Web Audio API

#### How It Works

The Web Audio API gives raw PCM samples via `AnalyserNode.getFloatTimeDomainData()`. A pitch detection algorithm extracts the fundamental frequency (F0) from these samples. For speech, F0 corresponds to vocal cord vibration frequency, which is what a pitch accent learner is trying to control.

Human speech F0 range: approximately 80-350 Hz (male 80-180 Hz, female 160-260 Hz).

#### Recommended Algorithms

**Autocorrelation** (reference implementation by cwilso):
```typescript
// Core autocorrelation - O(n^2) but fine for short buffers
function detectPitchACF(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const correlations = new Float32Array(SIZE);

  for (let lag = 0; lag < SIZE; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find first valley then next peak
  let d = 0;
  while (d < SIZE && correlations[d] > correlations[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < SIZE; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxPos = i;
    }
  }

  // RMS check - reject silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // silence

  return maxPos > 0 ? sampleRate / maxPos : null;
}
```

**YIN via pitchfinder** (better accuracy, fewer false positives):
```bash
npm install pitchfinder
```
```typescript
import * as Pitchfinder from 'pitchfinder';

const detectPitch = Pitchfinder.YIN({ sampleRate: audioContext.sampleRate });

function processPitch(analyser: AnalyserNode, sampleRate: number): number | null {
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  return detectPitch(buffer); // returns Hz or null
}
```

**pitchy** (McLeod method, pure TypeScript, no dependencies):
```bash
npm install pitchy
```
```typescript
import { PitchDetector } from 'pitchy';

const detector = PitchDetector.forFloat32Array(analyser.fftSize);

function processPitch(analyser: AnalyserNode, sampleRate: number): { pitch: number; clarity: number } | null {
  const input = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(input);
  const [pitch, clarity] = detector.findPitch(input, sampleRate);
  if (clarity < 0.9 || pitch < 70 || pitch > 400) return null;
  return { pitch, clarity };
}
```

**pitchy is the best choice** for this project: pure TypeScript, zero dependencies, McLeod method has better noise rejection than basic autocorrelation, and the `clarity` score lets you filter out unvoiced frames cleanly.

#### Real-Time Pitch Tracking Loop

```typescript
class PitchTracker {
  private animationFrame: number | null = null;
  private pitchHistory: number[] = [];

  start(analyser: AnalyserNode, sampleRate: number, onPitch: (hz: number | null) => void) {
    const detector = PitchDetector.forFloat32Array(analyser.fftSize);
    const input = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(input);
      const [pitch, clarity] = detector.findPitch(input, sampleRate);

      if (clarity > 0.9 && pitch > 70 && pitch < 400) {
        this.pitchHistory.push(pitch);
        onPitch(pitch);
      } else {
        onPitch(null);
      }

      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  stop(): number[] {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    const history = [...this.pitchHistory];
    this.pitchHistory = [];
    return history;
  }
}
```

#### Limitations

- Pitch detection works on voiced speech only. Unvoiced consonants (s, sh, k, t, etc.) return null.
- Japanese vowels are the reliable pitch carriers. Consonants must be skipped in analysis.
- Accuracy: ±2-5 Hz at typical speech F0 ranges, which is sufficient for high/low discrimination.
- Browsers require HTTPS and `getUserMedia` permission. Already handled by VoiceRecorder.

---

### 4. Hatsuon - npm Library for Pitch Pattern Utilities

```bash
npm install hatsuon
```

```typescript
import { hatsuon, getMorae, getPitchPatternName } from 'hatsuon';

// Given a word reading and its accent number from Kanjium:
const result = hatsuon({ reading: 'ちゅうがっこう', pitchNum: 3 });
// Returns:
// {
//   morae: ['ちゅ', 'う', 'が', 'っ', 'こ', 'う'],
//   pattern: [0, 1, 1, 0, 0, 0],  // 0=low, 1=high
//   patternName: '中高'
// }
```

This library transforms a Kanjium accent number into a per-mora H/L array, which is directly usable for:
1. SVG visualization (draw a line graph over mora labels)
2. Comparison against detected F0 values (high detected F0 should align with `pattern[i] === 1`)

---

### 5. Gemini AI for Pitch Accent Evaluation

#### Option A: Text-Based Inference (Currently Viable)

Since Gemini cannot directly "hear" pitch, but the Web Speech API gives us transcribed text + timing, the practical approach is:

1. Record audio with Web Audio API
2. Simultaneously transcribe with Web Speech API (already done in VoiceRecorder)
3. Run client-side pitch detection to get F0 time series
4. Map F0 series to mora segments using the timing from SpeechRecognition
5. Send to Gemini: transcribed text + per-mora pitch labels (H/L) + expected pattern from Kanjium dictionary

Prompt structure for the Edge Function:
```typescript
const pitchEvaluationPrompt = `
You are a Japanese pronunciation coach evaluating pitch accent.

The learner said: "${transcribedText}"

Expected pitch accent pattern (per mora):
${morae.map((m, i) => `${m}: ${expectedPattern[i] === 1 ? 'HIGH' : 'LOW'}`).join(', ')}

Detected pitch pattern from audio (per mora):
${morae.map((m, i) => `${m}: ${detectedPattern[i] ? 'HIGH' : detectedPattern[i] === false ? 'LOW' : 'unclear'}`).join(', ')}

Evaluate the pronunciation:
1. Which morae had incorrect pitch?
2. What is the accent pattern type (平板/頭高/中高/尾高)?
3. Provide specific, encouraging feedback in English for a Japanese learner.
4. Give a score from 0-100.

Respond as JSON: { score: number, patternName: string, errors: string[], feedback: string, encouragement: string }
`;
```

#### Option B: Direct Audio Analysis (Gemini 2.5 Flash)

Gemini 2.5 Flash accepts inline base64 audio (WAV, WebM, MP3). Audio recorded via MediaRecorder is typically WebM/Opus in Chrome, which is supported. The 20MB request limit allows several minutes of compressed audio.

```typescript
// In the Supabase Edge Function (gemini-ai/index.ts), add a new handler:
case 'pitch-accent': {
  const { audioBase64, mimeType, transcribedText, targetWord } = body;

  const response = await model.generateContent([
    {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType || 'audio/webm'
      }
    },
    `You are a Japanese pitch accent coach. The learner is practicing the word/phrase: "${targetWord}".
     The transcription of what they said is: "${transcribedText}".

     Listen to the audio and evaluate:
     1. Does the pitch accent sound natural for Tokyo-dialect Japanese?
     2. Is there a clear downstep at the correct position?
     3. Are the high and low morae distinguishable?

     Provide structured feedback as JSON:
     {
       "naturalness": 0-100,
       "pitchAccuracyScore": 0-100,
       "patternDetected": "平板|頭高|中高|尾高|unclear",
       "specificIssues": ["..."],
       "feedback": "encouraging feedback in English",
       "nextStep": "one specific practice suggestion"
     }`
  ]);

  return new Response(JSON.stringify({ result: JSON.parse(response.text()) }));
}
```

**Key caveat**: Gemini is a language model, not a phonetics analysis tool. Its ability to detect specific mora-level pitch is unverified. It performs better at holistic fluency and naturalness assessment than precise pitch measurement. Treat its audio analysis as "soft" feedback, not ground truth.

#### Option C: SpeechSuper API (Commercial, Most Accurate for Japanese)

SpeechSuper has dedicated Japanese pronunciation assessment with phoneme-level scoring and a "tone score" that approximates pitch accent evaluation. It is the closest to a purpose-built solution.

- Demo: https://www.speechsuper.com/demo/japanese/index.html
- Pricing: Contact them (B2B, likely per-API-call)
- Integration: REST API, works from the Supabase Edge Function
- Limitation: External dependency, per-call cost, requires appKey/secretKey

---

### 6. Existing Apps That Do This Well

| App | Approach | Strength | Weakness |
|-----|----------|----------|----------|
| Dogen (Patreon) | Video + minimal comparison | Human expert quality | Passive learning only |
| OJAD/Suzuki-kun | TTS F0 curve visualization | Free, sentence-level | No user audio comparison |
| Migaku | Dictionary lookup + audio | Clean UX, integrated | No real-time feedback |
| Onsei | Python DTW + pitch comparison | Open source, accurate | Requires Python server |
| コツ (Kotsu) | Minimal pairs perception test | Good for ear training | No production evaluation |
| Praat | Spectrogram analysis | Gold standard accuracy | Desktop only, complex UI |

None of these offer what this app could: Gemini-powered holistic feedback combined with dictionary lookup and real-time F0 visualization in a mobile-friendly React UI.

---

### 7. npm Packages Summary

| Package | Purpose | Size | Notes |
|---------|---------|------|-------|
| `pitchy` | Real-time F0 detection (McLeod) | ~10KB | Best choice, pure TS, no deps |
| `pitchfinder` | F0 detection (YIN, AMDF, etc.) | ~30KB | Good YIN implementation |
| `hatsuon` | Pitch pattern utils from accent number | ~5KB | Essential for Kanjium integration |
| `kuromoji` | Japanese morphological analysis (tokenizer) | ~10MB | Needed to segment text into morae |

**kuromoji** deserves special mention: to map F0 data to morae, you need to segment the transcribed text into morae-level units. Kuromoji is the standard browser-compatible Japanese tokenizer and returns reading (kana) for each token.

```bash
npm install kuromoji hatsuon pitchy
```

---

### 8. Recommended Architecture for This App

#### Phase 1: Dictionary Lookup (No Audio Analysis) - Ship First

1. Download Kanjium `accents.txt` and convert to `pitch-accents.json` at build time
2. Install `hatsuon` to transform accent numbers to H/L patterns
3. Add a "Pitch Accent" badge to DiaryCard showing the accent pattern for detected keywords
4. Show SVG visualization of expected pitch pattern for vocabulary words

**Effort**: 2-3 days. Pure front-end, no new infrastructure.

#### Phase 2: Gemini Audio Evaluation - Use Existing Edge Function

1. After recording stops in VoiceRecorder, the `currentAudio` Blob is already available
2. Convert Blob to base64, send to Edge Function with new handler type `pitch-accent`
3. Edge Function forwards to Gemini 2.5 Flash with audio + transcribed text + target word
4. Return holistic naturalness + pitch feedback
5. Display in FeedbackCard component alongside grammar feedback

**Effort**: 1-2 days. Reuses existing VoiceRecorder, Edge Function pattern.

#### Phase 3: Real-Time F0 Visualization (Premium Feature)

1. Extend VoiceRecorder: add `PitchTracker` class that runs `pitchy` on the live AnalyserNode (already set up in the recording flow)
2. Capture F0 time series during recording
3. Post-recording: show a pitch contour graph (SVG/Canvas) comparing recorded F0 to expected pattern
4. Use `kuromoji` to segment transcribed text; align morae to time segments by uniform distribution or Web Speech API word timestamps

**Effort**: 3-5 days. Significant UI work. Best as a Premium-gated feature.

#### Data Flow Diagram

```
[Microphone]
     |
     +--> [MediaRecorder] --> [Blob (WebM)] --> [Base64] --> [Edge Function] --> [Gemini Audio API]
     |                                                                                    |
     +--> [AnalyserNode] --> [pitchy] --> [F0 time series]                               v
     |                                        |                              [Naturalness + pitch feedback]
     +--> [Web Speech API] --> [Transcription] --> [kuromoji tokenize]
                                                        |
                                                        v
                                               [Kanjium lookup] --> [hatsuon] --> [Expected H/L pattern]
                                                        |
                                                        v
                                               [Compare F0 to expected pattern]
                                                        |
                                                        v
                                               [Per-mora accuracy score]
```

---

### 9. Client-Side vs. Server-Side Analysis

| Criterion | Client-Side (pitchy + Web Audio) | Server-Side (Gemini / SpeechSuper) |
|-----------|----------------------------------|-------------------------------------|
| Latency | Real-time, zero network round-trip | 1-3 seconds per request |
| Privacy | Audio never leaves device | Audio transmitted to third party |
| Accuracy | Good for F0 extraction; needs mora alignment | Gemini: holistic; SpeechSuper: phoneme-level |
| Cost | Free (CPU only) | Per-call cost |
| Japanese-specific | Needs custom mora alignment logic | SpeechSuper built for Japanese |
| Offline | Works offline | Requires network |
| Complexity | Medium (F0 to mora mapping is non-trivial) | Low (one API call) |

**Recommendation**: Use client-side for real-time visual feedback during practice, server-side (Gemini) for post-recording holistic feedback. Do not route audio to third-party APIs like SpeechSuper unless willing to add a dependency and per-call billing.

---

## Concrete Implementation: Minimum Viable Pitch Feature

### Step 1: Build the Kanjium JSON lookup

```bash
# One-time build script (add to package.json scripts)
curl -o /tmp/accents.txt \
  https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/accents.txt
node scripts/build-pitch-dict.js
```

```typescript
// scripts/build-pitch-dict.ts
import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({ input: fs.createReadStream('/tmp/accents.txt') });
const dict: Record<string, { reading: string; pitch: number }[]> = {};

rl.on('line', (line) => {
  const [word, reading, pitchStr] = line.split('\t');
  if (!word || !reading || !pitchStr) return;
  const pitch = parseInt(pitchStr, 10);
  if (!dict[word]) dict[word] = [];
  dict[word].push({ reading, pitch });
});

rl.on('close', () => {
  fs.writeFileSync('public/pitch-accents.json', JSON.stringify(dict));
});
```

### Step 2: Pitch accent lookup hook

```typescript
// src/hooks/usePitchAccent.ts
import { useEffect, useState } from 'react';
import { hatsuon } from 'hatsuon';

type PitchData = {
  morae: string[];
  pattern: number[];  // 0=low, 1=high
  patternName: string;
};

let cachedDict: Record<string, { reading: string; pitch: number }[]> | null = null;

async function loadDict() {
  if (cachedDict) return cachedDict;
  const res = await fetch('/pitch-accents.json');
  cachedDict = await res.json();
  return cachedDict!;
}

export function usePitchAccent(word: string | null) {
  const [pitchData, setPitchData] = useState<PitchData | null>(null);

  useEffect(() => {
    if (!word) { setPitchData(null); return; }

    loadDict().then((dict) => {
      const entries = dict[word];
      if (!entries?.length) { setPitchData(null); return; }

      const { reading, pitch } = entries[0];
      const result = hatsuon({ reading, pitchNum: pitch });
      setPitchData({
        morae: result.morae,
        pattern: result.pattern,
        patternName: result.patternName,
      });
    });
  }, [word]);

  return pitchData;
}
```

### Step 3: SVG Pitch Accent Visualization Component

```tsx
// src/components/pitch/PitchAccentDisplay.tsx
import React from 'react';

interface Props {
  morae: string[];
  pattern: number[];  // 0=low, 1=high per mora
  patternName: string;
  detectedPattern?: (boolean | null)[];  // null = unvoiced
}

const MORA_WIDTH = 40;
const HIGH_Y = 15;
const LOW_Y = 45;
const HEIGHT = 70;

export const PitchAccentDisplay: React.FC<Props> = ({
  morae, pattern, patternName, detectedPattern
}) => {
  const width = morae.length * MORA_WIDTH + 20;

  const points = morae.map((_, i) => ({
    x: i * MORA_WIDTH + MORA_WIDTH / 2 + 10,
    y: pattern[i] === 1 ? HIGH_Y : LOW_Y,
  }));

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={width} height={HEIGHT} className="overflow-visible">
        {/* Expected pattern line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Mora dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3B82F6" />
        ))}
        {/* Detected pattern dots (if available) */}
        {detectedPattern && detectedPattern.map((isHigh, i) => {
          if (isHigh === null) return null;
          const detY = isHigh ? HIGH_Y : LOW_Y;
          return (
            <circle
              key={`d-${i}`}
              cx={points[i].x}
              cy={detY}
              r={5}
              fill={isHigh === (pattern[i] === 1) ? '#10B981' : '#EF4444'}
              opacity={0.7}
            />
          );
        })}
        {/* Mora labels */}
        {morae.map((m, i) => (
          <text
            key={i}
            x={points[i].x}
            y={HEIGHT - 5}
            textAnchor="middle"
            fontSize="14"
            fontFamily="sans-serif"
          >
            {m}
          </text>
        ))}
      </svg>
      <span className="text-xs text-gray-500">{patternName}型</span>
    </div>
  );
};
```

### Step 4: Edge Function handler for audio pitch evaluation

Add to `supabase/functions/gemini-ai/index.ts`:

```typescript
case 'pitch-accent': {
  const { audioBase64, mimeType, transcribedText, targetWord, expectedPattern } = body;

  const patternDesc = expectedPattern
    ? `Expected pattern: ${expectedPattern.join('-').replace(/1/g, 'H').replace(/0/g, 'L')}`
    : '';

  const prompt = [
    {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType ?? 'audio/webm',
      },
    },
    `You are a Japanese pronunciation coach specializing in pitch accent (高低アクセント).

The learner is practicing: "${targetWord ?? transcribedText}"
Transcription of what they said: "${transcribedText}"
${patternDesc}

Listen carefully to the recording and provide:
1. Whether the overall pitch contour sounds natural for Tokyo-dialect Japanese
2. Whether there is a clear downstep at the right position
3. Specific morae that sound off (if any)
4. A naturalness score 0-100
5. Encouraging, specific feedback

Respond ONLY with valid JSON matching this schema exactly:
{
  "naturalness": number,
  "pitchAccuracyScore": number,
  "patternDetected": "平板" | "頭高" | "中高" | "尾高" | "unclear",
  "issues": string[],
  "feedback": string,
  "nextStep": string
}`,
  ];

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));

  return new Response(JSON.stringify(parsed), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Confidence Assessment

- **High confidence**: Pitch accent theory (four types, mora encoding, Kanjium data format). Multiple authoritative sources confirm.
- **High confidence**: pitchfinder and pitchy npm packages work in browser via Web Audio API. GitHub source code and documentation confirm.
- **High confidence**: hatsuon npm library correctly transforms accent numbers to H/L arrays. Source code and live demo confirm.
- **High confidence**: Gemini accepts inline base64 WebM/WAV audio up to 20MB. Official Google docs confirm.
- **Medium confidence**: Gemini can assess pitch accent quality from audio. The API supports audio analysis and emotion detection; Japanese pitch-specific capability is extrapolated but unverified empirically.
- **Medium confidence**: SpeechSuper has Japanese pitch assessment. Demo exists but pricing undisclosed.
- **Low confidence**: Azure Speech prosody assessment for Japanese. Docs explicitly say prosody is en-US only.
- **Low confidence**: Mora-level F0 alignment accuracy in browser. The mapping of F0 time series to specific morae without forced alignment (e.g., Julius or Montreal Forced Aligner) is approximate.

## Information Gaps

- Gemini 2.5 Flash's actual pitch accent detection accuracy for Japanese has not been empirically measured; no published benchmarks found.
- SpeechSuper pricing for the Japanese pronunciation API is not publicly listed.
- Whether OJAD provides any API access is unclear; the website gives no indication of a REST API.
- Mora-level forced alignment (mapping audio timestamps to specific morae) requires either a specialized speech aligner or probabilistic estimation based on mora durations.
- The Kanjium dataset completeness for common spoken Japanese (vs. written-only vocabulary) is unknown.
