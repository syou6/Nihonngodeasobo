import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceTranscriber } from './speechRecognition';

// Mock SpeechRecognition API
function createMockSpeechRecognition() {
  return {
    continuous: false,
    interimResults: false,
    lang: '',
    maxAlternatives: 1,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onresult: null as any,
    onerror: null as any,
    onend: null as any,
    onstart: null as any,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

describe('VoiceTranscriber', () => {
  let mockRecognition: ReturnType<typeof createMockSpeechRecognition>;

  beforeEach(() => {
    mockRecognition = createMockSpeechRecognition();

    // Must use a real function constructor (not vi.fn arrow)
    function MockSpeechRecognition() {
      return mockRecognition;
    }

    // Set up window.SpeechRecognition
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });

    // Remove webkit variant to avoid confusion
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  describe('constructor', () => {
    it('initializes speech recognition with correct settings', () => {
      const transcriber = new VoiceTranscriber();
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(true);
      expect(mockRecognition.lang).toBe('ja-JP');
      expect(mockRecognition.maxAlternatives).toBe(1);
    });

    it('sets up event handlers', () => {
      const transcriber = new VoiceTranscriber();
      expect(mockRecognition.onresult).toBeTypeOf('function');
      expect(mockRecognition.onerror).toBeTypeOf('function');
      expect(mockRecognition.onend).toBeTypeOf('function');
      expect(mockRecognition.onstart).toBeTypeOf('function');
    });
  });

  describe('start', () => {
    it('starts recognition and registers callbacks', () => {
      const transcriber = new VoiceTranscriber();
      const onResult = vi.fn();
      const onError = vi.fn();

      transcriber.start(onResult, onError);
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('calls onError when recognition is not supported', () => {
      // Remove SpeechRecognition support entirely
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const transcriber = new VoiceTranscriber();
      const onError = vi.fn();

      transcriber.start(undefined, onError);
      expect(onError).toHaveBeenCalledWith('Speech recognition is not supported');
    });

    it('calls onError when start throws', () => {
      mockRecognition.start.mockImplementation(() => {
        throw new Error('already started');
      });

      const transcriber = new VoiceTranscriber();
      const onError = vi.fn();

      transcriber.start(undefined, onError);
      expect(onError).toHaveBeenCalledWith('Failed to start speech recognition');
    });
  });

  describe('stop', () => {
    it('stops recognition and returns transcript', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();

      // Simulate onstart
      mockRecognition.onstart();

      // Simulate a final result
      mockRecognition.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'hello world', confidence: 0.9 },
            length: 1,
          },
        },
      });

      const result = transcriber.stop();
      expect(result).toBe('hello world');
      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('returns empty string when no transcript', () => {
      const transcriber = new VoiceTranscriber();
      const result = transcriber.stop();
      expect(result).toBe('');
    });
  });

  describe('abort', () => {
    it('aborts recognition and clears transcript', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();

      // Simulate active listening
      mockRecognition.onstart();

      // Simulate transcript
      mockRecognition.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'some text', confidence: 0.9 },
            length: 1,
          },
        },
      });

      transcriber.abort();
      expect(mockRecognition.abort).toHaveBeenCalled();
      expect(transcriber.getCurrentTranscript()).toBe('');
    });
  });

  describe('isSupported', () => {
    it('returns true when SpeechRecognition is available', () => {
      expect(VoiceTranscriber.isSupported()).toBe(true);
    });

    it('returns true when only webkitSpeechRecognition is available', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: vi.fn(() => createMockSpeechRecognition()),
        writable: true,
        configurable: true,
      });

      expect(VoiceTranscriber.isSupported()).toBe(true);
    });

    it('returns false when no speech recognition available', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      expect(VoiceTranscriber.isSupported()).toBe(false);
    });
  });

  describe('getIsListening', () => {
    it('returns false initially', () => {
      const transcriber = new VoiceTranscriber();
      expect(transcriber.getIsListening()).toBe(false);
    });

    it('returns true after onstart fires', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();
      mockRecognition.onstart();
      expect(transcriber.getIsListening()).toBe(true);
    });

    it('returns false after onend fires', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();
      mockRecognition.onstart();
      // set shouldBeListening to false to prevent auto-restart
      transcriber.stop();
      mockRecognition.onend();
      expect(transcriber.getIsListening()).toBe(false);
    });
  });

  describe('getCurrentTranscript', () => {
    it('returns empty string initially', () => {
      const transcriber = new VoiceTranscriber();
      expect(transcriber.getCurrentTranscript()).toBe('');
    });

    it('returns accumulated final transcripts', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();

      mockRecognition.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'first part', confidence: 0.9 },
            length: 1,
          },
        },
      });

      mockRecognition.onresult({
        resultIndex: 1,
        results: {
          length: 2,
          0: {
            isFinal: true,
            0: { transcript: 'first part', confidence: 0.9 },
            length: 1,
          },
          1: {
            isFinal: true,
            0: { transcript: 'second part', confidence: 0.9 },
            length: 1,
          },
        },
      });

      expect(transcriber.getCurrentTranscript()).toBe('first part second part');
    });
  });

  describe('onresult callback', () => {
    it('calls onResult with interim transcript', () => {
      const transcriber = new VoiceTranscriber();
      const onResult = vi.fn();
      transcriber.start(onResult);

      mockRecognition.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: false,
            0: { transcript: 'partial', confidence: 0.5 },
            length: 1,
          },
        },
      });

      expect(onResult).toHaveBeenCalledWith('partial', false);
    });

    it('calls onResult with final transcript', () => {
      const transcriber = new VoiceTranscriber();
      const onResult = vi.fn();
      transcriber.start(onResult);

      mockRecognition.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'final text', confidence: 0.95 },
            length: 1,
          },
        },
      });

      expect(onResult).toHaveBeenCalledWith('final text ', true);
    });
  });

  describe('onerror callback', () => {
    it('calls onError with error string', () => {
      const transcriber = new VoiceTranscriber();
      const onError = vi.fn();
      transcriber.start(undefined, onError);

      mockRecognition.onerror({ error: 'not-allowed' });
      expect(onError).toHaveBeenCalledWith('not-allowed');
    });
  });

  describe('auto-restart on unexpected end', () => {
    it('restarts recognition if shouldBeListening is true', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();
      mockRecognition.onstart();

      // Simulate unexpected end (e.g. iOS Safari)
      mockRecognition.onend();

      // Should attempt to restart
      expect(mockRecognition.start).toHaveBeenCalledTimes(2); // initial + restart
    });

    it('does not restart if stop was called', () => {
      const transcriber = new VoiceTranscriber();
      transcriber.start();
      mockRecognition.onstart();
      transcriber.stop();

      mockRecognition.onend();

      // Only the initial start call
      expect(mockRecognition.start).toHaveBeenCalledTimes(1);
    });
  });
});
