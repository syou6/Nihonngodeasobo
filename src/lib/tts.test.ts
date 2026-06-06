import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cloud TTS is unavailable in tests, so speak() falls back to the browser voice.
vi.mock('./cloud-tts', () => ({
  cloudSpeak: vi.fn(async () => false),
  stopCloudAudio: vi.fn(),
}));

// Mock SpeechSynthesis API
function createMockSynth() {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null as any,
  };
}

function createMockVoice(lang: string, name: string): SpeechSynthesisVoice {
  return {
    lang,
    name,
    default: false,
    localService: true,
    voiceURI: name,
  };
}

describe('TextToSpeech', () => {
  let mockSynth: ReturnType<typeof createMockSynth>;

  beforeEach(() => {
    vi.resetModules();
    mockSynth = createMockSynth();

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynth,
      writable: true,
      configurable: true,
    });

    // Must be a real constructor function, not an arrow/mock
    function MockUtterance(this: any, text: string) {
      this.text = text;
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.lang = '';
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      writable: true,
      configurable: true,
    });
  });

  it('isSupported returns true when speechSynthesis exists', async () => {
    const { TextToSpeech } = await import('./tts');
    expect(TextToSpeech.isSupported()).toBe(true);
  });

  it('isSupported checks for speechSynthesis in window', async () => {
    // When speechSynthesis is present (our mock), should return true
    const { TextToSpeech } = await import('./tts');
    expect(TextToSpeech.isSupported()).toBe(true);
  });

  it('getJapaneseVoices filters Japanese voices', async () => {
    const jaVoice = createMockVoice('ja-JP', 'Kyoko');
    const enVoice = createMockVoice('en-US', 'Samantha');
    const jaVoice2 = createMockVoice('ja', 'Otoya');

    mockSynth.getVoices.mockReturnValue([jaVoice, enVoice, jaVoice2]);

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    const voices = ttsInstance.getJapaneseVoices();
    expect(voices).toEqual([jaVoice, jaVoice2]);
  });

  it('getPreferredVoice prefers ja-JP', async () => {
    const jaVoice = createMockVoice('ja', 'Generic');
    const jaJpVoice = createMockVoice('ja-JP', 'Kyoko');

    mockSynth.getVoices.mockReturnValue([jaVoice, jaJpVoice]);

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    expect(ttsInstance.getPreferredVoice()).toEqual(jaJpVoice);
  });

  it('getPreferredVoice returns first Japanese voice when no ja-JP', async () => {
    const jaVoice = createMockVoice('ja', 'Generic');
    mockSynth.getVoices.mockReturnValue([jaVoice]);

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    expect(ttsInstance.getPreferredVoice()).toEqual(jaVoice);
  });

  it('getPreferredVoice returns null when no Japanese voices', async () => {
    mockSynth.getVoices.mockReturnValue([createMockVoice('en-US', 'Samantha')]);

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    expect(ttsInstance.getPreferredVoice()).toBeNull();
  });

  it('speak calls synth.speak with correct language', async () => {
    mockSynth.getVoices.mockReturnValue([]);

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();

    // Don't await - we'll trigger onend manually
    const speakPromise = ttsInstance.speak('こんにちは');

    await new Promise((r) => setTimeout(r, 0)); // let cloud fallback resolve
    const utterance = mockSynth.speak.mock.calls[0][0];
    expect(utterance.lang).toBe('ja-JP');
    expect(utterance.rate).toBe(0.9); // Default slower rate for learners

    // Trigger onend to resolve promise
    utterance.onend();
    await speakPromise;
  });

  it('stop does nothing when not speaking', async () => {
    mockSynth.speaking = false;
    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    ttsInstance.stop();
    expect(mockSynth.cancel).not.toHaveBeenCalled();
  });

  it('speak resolves on interrupted/canceled errors', async () => {
    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();

    const speakPromise = ttsInstance.speak('test');
    await new Promise((r) => setTimeout(r, 0)); // let cloud fallback resolve
    const utterance = mockSynth.speak.mock.calls[0][0];

    utterance.onerror({ error: 'interrupted' });
    await speakPromise; // Should resolve, not reject
  });

  it('speak rejects on real errors', async () => {
    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();

    const speakPromise = ttsInstance.speak('test');
    await new Promise((r) => setTimeout(r, 0)); // let cloud fallback resolve
    const utterance = mockSynth.speak.mock.calls[0][0];

    utterance.onerror({ error: 'synthesis-failed' });
    await expect(speakPromise).rejects.toThrow('Speech error');
  });

  it('stop cancels current speech', async () => {
    mockSynth.speaking = true;

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    ttsInstance.stop();

    expect(mockSynth.cancel).toHaveBeenCalled();
  });

  it('pause pauses speech', async () => {
    mockSynth.speaking = true;

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    ttsInstance.pause();

    expect(mockSynth.pause).toHaveBeenCalled();
  });

  it('resume resumes speech', async () => {
    mockSynth.paused = true;

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    ttsInstance.resume();

    expect(mockSynth.resume).toHaveBeenCalled();
  });

  it('isSpeaking returns synth.speaking', async () => {
    mockSynth.speaking = true;

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    expect(ttsInstance.isSpeaking()).toBe(true);
  });

  it('isPaused returns synth.paused', async () => {
    mockSynth.paused = true;

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();
    expect(ttsInstance.isPaused()).toBe(true);
  });

  it('speak applies custom options', async () => {
    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();

    const speakPromise = ttsInstance.speak('test', { rate: 1.5, pitch: 0.8, volume: 0.5 });
    await new Promise((r) => setTimeout(r, 0)); // let cloud fallback resolve
    const utterance = mockSynth.speak.mock.calls[0][0];

    expect(utterance.rate).toBe(1.5);
    expect(utterance.pitch).toBe(0.8);
    expect(utterance.volume).toBe(0.5);

    utterance.onend();
    await speakPromise;
  });

  it('speak uses named voice when specified', async () => {
    const kyokoVoice = createMockVoice('ja-JP', 'Kyoko');
    mockSynth.getVoices.mockReturnValue([kyokoVoice]);

    const { TextToSpeech } = await import('./tts');
    const ttsInstance = new TextToSpeech();

    const speakPromise = ttsInstance.speak('test', { voice: 'Kyoko' });
    await new Promise((r) => setTimeout(r, 0)); // let cloud fallback resolve
    const utterance = mockSynth.speak.mock.calls[0][0];

    expect(utterance.voice).toEqual(kyokoVoice);
    utterance.onend();
    await speakPromise;
  });
});
