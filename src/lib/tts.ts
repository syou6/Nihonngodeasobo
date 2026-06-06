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
   * Get the highest-quality available Japanese voice. Browser default voices
   * vary wildly — neural/enhanced ones (Google, Kyoko, Microsoft "Natural")
   * sound natural, while legacy ones (e.g. Microsoft Haruka) sound robotic.
   * Rank by known-good names so learners hear the best voice the device offers.
   */
  getPreferredVoice(): SpeechSynthesisVoice | null {
    const japaneseVoices = this.getJapaneseVoices();
    if (japaneseVoices.length === 0) return null;

    const score = (v: SpeechSynthesisVoice): number => {
      const n = v.name.toLowerCase();
      let s = 0;
      if (/natural|neural|enhanced|premium/.test(n)) s += 100; // best neural voices
      if (n.includes('google')) s += 80;   // Chrome's natural network voice
      if (/nanami|keita/.test(n)) s += 70;  // Microsoft neural JA
      if (/kyoko|o-ren|otoya|hattori/.test(n)) s += 50; // Apple voices
      if (/haruka|ichiro|sayaka/.test(n)) s -= 50; // legacy robotic — avoid
      if (v.localService === false) s += 10; // network voices usually richer
      if (v.lang === 'ja-JP') s += 5;
      return s;
    };

    return [...japaneseVoices].sort((a, b) => score(b) - score(a))[0];
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
