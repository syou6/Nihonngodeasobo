// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export class VoiceTranscriber {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private shouldBeListening: boolean = false;
  private finalTranscript: string = '';
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();
      
      // 設定
      this.recognition.continuous = true;  // 継続的に音声を認識
      this.recognition.interimResults = true;  // 途中結果も取得
      this.recognition.lang = 'ja-JP';  // Japanese
      this.recognition.maxAlternatives = 1;

      // イベントハンドラ
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            this.finalTranscript += transcript + ' ';
            if (this.onResultCallback) {
              this.onResultCallback(this.finalTranscript, true);
            }
          } else {
            interimTranscript += transcript;
            if (this.onResultCallback) {
              this.onResultCallback(this.finalTranscript + interimTranscript, false);
            }
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // iOS Safari stops recognition unexpectedly - auto-restart if still needed
        if (this.shouldBeListening && this.recognition) {
          try {
            this.recognition.start();
          } catch (e) {
            // Already started or other error - ignore
          }
        }
      };

      this.recognition.onstart = () => {
        this.isListening = true;
      };
    }
  }

  // Start speech recognition
  start(onResult?: (text: string, isFinal: boolean) => void, onError?: (error: string) => void): void {
    if (!this.recognition) {
      if (onError) onError('Speech recognition is not supported');
      return;
    }

    this.finalTranscript = '';
    this.shouldBeListening = true;
    this.onResultCallback = onResult || null;
    this.onErrorCallback = onError || null;

    try {
      this.recognition.start();
    } catch {
      if (onError) onError('Failed to start speech recognition');
    }
  }

  // Stop speech recognition
  stop(): string {
    this.shouldBeListening = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    return this.finalTranscript.trim();
  }

  // Cancel speech recognition
  abort(): void {
    this.shouldBeListening = false;
    if (this.recognition && this.isListening) {
      this.recognition.abort();
    }
    this.finalTranscript = '';
  }

  // Check if speech recognition is supported
  static isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  // Check if currently listening
  getIsListening(): boolean {
    return this.isListening;
  }

  // Get current transcript
  getCurrentTranscript(): string {
    return this.finalTranscript.trim();
  }
}