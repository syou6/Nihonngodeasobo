import { supabase } from './supabase';

let currentAudio: HTMLAudioElement | null = null;

export function stopCloudAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/**
 * Speak text with the cloud (ElevenLabs) voice via the `tts` Edge Function.
 * Returns true if it played, false if unavailable (not configured / not
 * authenticated / error) so the caller can fall back to the browser voice.
 */
export async function cloudSpeak(text: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('tts', { body: { text } });
    if (error || !data?.audio) return false;

    stopCloudAudio();
    const audio = new Audio(`data:${data.mime || 'audio/mpeg'};base64,${data.audio}`);
    currentAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('audio playback failed'));
      audio.play().catch(reject);
    });
    return true;
  } catch {
    return false;
  }
}
