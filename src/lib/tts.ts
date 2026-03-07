/**
 * Text-to-Speech utility using Web Speech API
 */

export interface TTSOptions {
  rate?: number;      // Speech rate (0.1 - 10, default 1)
  pitch?: number;     // Speech pitch (0 - 2, default 1)
  volume?: number;    // Volume (0 - 1, default 1)
  voice?: string;     // Voice name (optional)
}

class TextToSpeech {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isReady: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices(): void {
    // Voices may not be immediately available
    const loadVoicesHandler = () => {
      this.voices = this.synth.getVoices();
      this.isReady = this.voices.length > 0;
    };

    loadVoicesHandler();

    // Chrome requires this event listener
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoicesHandler;
    }
  }

  /**
   * Check if TTS is supported
   */
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available Japanese voices
   */
  getJapaneseVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice =>
      voice.lang.startsWith('ja-') || voice.lang === 'ja'
    );
  }

  /**
   * Get preferred Japanese voice (ja-JP preferred)
   */
  getPreferredVoice(): SpeechSynthesisVoice | null {
    const japaneseVoices = this.getJapaneseVoices();

    // Priority: ja-JP > any Japanese voice
    const jaJpVoice = japaneseVoices.find(v => v.lang === 'ja-JP');
    if (jaJpVoice) return jaJpVoice;

    return japaneseVoices[0] || null;
  }

  /**
   * Speak text
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!TextToSpeech.isSupported()) {
        reject(new Error('Text-to-speech not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set options
      utterance.rate = options.rate ?? 0.9; // Slightly slower for learners
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      utterance.lang = 'ja-JP';

      // Set voice
      if (options.voice) {
        const selectedVoice = this.voices.find(v => v.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      } else {
        const preferredVoice = this.getPreferredVoice();
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      // Event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        // "interrupted" and "canceled" are intentional stops, not errors
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
          return;
        }
        reject(new Error(`Speech error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.synth.paused;
  }
}

// Singleton instance
export const tts = new TextToSpeech();

// Export class for type checking
export { TextToSpeech };
