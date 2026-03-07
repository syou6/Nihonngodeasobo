import { supabase } from './supabase';

export interface PitchAccentResult {
  naturalness: number;
  pitchAccuracyScore: number;
  patternDetected: string;
  issues: string[];
  feedback: string;
  nextStep: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:<mimeType>;base64," prefix
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to extract base64 from FileReader result'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('FileReader failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

export async function evaluatePitchAccent(
  audioBlob: Blob,
  transcribedText: string,
  targetWord?: string,
  expectedPattern?: number[]
): Promise<PitchAccentResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Audio blob is empty or missing');
  }
  if (!transcribedText.trim()) {
    throw new Error('Transcribed text is required');
  }

  const audioBase64 = await blobToBase64(audioBlob);
  const mimeType = audioBlob.type || 'audio/webm';

  const { data, error } = await supabase.functions.invoke('gemini-ai', {
    body: {
      type: 'pitch-accent',
      audioBase64,
      mimeType,
      transcribedText,
      ...(targetWord !== undefined && { targetWord }),
      ...(expectedPattern !== undefined && { expectedPattern }),
    },
  });

  if (error) {
    throw new Error(error.message || 'Pitch accent evaluation failed');
  }

  const result = data as PitchAccentResult;

  if (
    typeof result.naturalness !== 'number' ||
    typeof result.pitchAccuracyScore !== 'number' ||
    typeof result.patternDetected !== 'string' ||
    !Array.isArray(result.issues) ||
    typeof result.feedback !== 'string' ||
    typeof result.nextStep !== 'string'
  ) {
    throw new Error('Unexpected response shape from pitch-accent handler');
  }

  return result;
}
