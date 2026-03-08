# Executive Summary: Japanese Pitch Accent Evaluation

## Bottom Line

Implement pitch accent evaluation in three phases using tools that integrate cleanly with the existing stack:

1. **Phase 1** (2-3 days): Static dictionary lookup from Kanjium (124K words, CC-licensed) + hatsuon npm library - show expected pitch patterns as SVG on vocabulary in diary feedback. No audio analysis required.

2. **Phase 2** (1-2 days): Send recorded audio Blob (already in VoiceRecorder) as base64 to Gemini 2.5 Flash via the existing Edge Function - get holistic naturalness + pitch feedback. Reuses existing pattern.

3. **Phase 3** (3-5 days, Premium): Real-time F0 extraction with `pitchy` npm package during recording via the AnalyserNode already connected in VoiceRecorder - live pitch contour visualization compared to expected pattern.

## Key npm Packages

```bash
npm install pitchy hatsuon kuromoji
```

- `pitchy`: McLeod pitch detection, pure TypeScript, zero deps, works on existing AnalyserNode
- `hatsuon`: Converts Kanjium accent integer to per-mora H/L array
- `kuromoji`: Japanese tokenizer to segment transcribed text into morae

## Key Data Source

Kanjium `accents.txt`: 124,137 words with pitch accent numbers. Download once at build time, ship as gzipped JSON static asset (~1.5MB compressed). CC-licensed, safe for commercial use.

## Key Architectural Decision

Do NOT use Azure Speech (prosody is en-US only), do NOT scrape OJAD (ToS violation). Use Gemini audio analysis for holistic feedback and client-side pitchy for real-time F0 visualization. SpeechSuper is the best commercial option if budget allows phoneme-level scoring.

## Full Research

See: `/workspace/research/pitch-accent-implementation.md`
