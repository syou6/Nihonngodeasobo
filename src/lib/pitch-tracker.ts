import { PitchDetector } from 'pitchy';

export interface PitchFrame {
  time: number;       // ms since start
  pitch: number | null; // Hz or null for unvoiced
  clarity: number;    // 0-1
}

const MIN_PITCH_HZ = 70;
const MAX_PITCH_HZ = 400;
const MIN_CLARITY = 0.85;
const FFT_SIZE = 2048;

export class PitchTracker {
  onPitch: ((frame: PitchFrame) => void) | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private detector: PitchDetector<Float32Array> | null = null;
  private buffer: Float32Array | null = null;
  private frames: PitchFrame[] = [];
  private rafId: number | null = null;
  private startTime: number | null = null;
  private running = false;

  start(stream: MediaStream): void {
    if (this.running) {
      this.stop();
    }

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const bufferLength = this.analyser.fftSize;
    this.detector = PitchDetector.forFloat32Array(bufferLength);
    this.buffer = new Float32Array(bufferLength);
    this.frames = [];
    this.startTime = performance.now();
    this.running = true;

    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): PitchFrame[] {
    this.running = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.source?.disconnect();
    this.source = null;

    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.detector = null;
    this.buffer = null;
    this.startTime = null;

    const result = this.frames;
    this.frames = [];
    return result;
  }

  private tick = (): void => {
    if (!this.running) return;

    const frame = this.detectFrame();
    if (frame !== null) {
      this.frames = [...this.frames, frame];
      this.onPitch?.(frame);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private detectFrame(): PitchFrame | null {
    if (
      this.analyser === null ||
      this.detector === null ||
      this.buffer === null ||
      this.audioContext === null ||
      this.startTime === null
    ) {
      return null;
    }

    this.analyser.getFloatTimeDomainData(this.buffer);

    const sampleRate = this.audioContext.sampleRate;
    const [rawPitch, clarity] = this.detector.findPitch(this.buffer, sampleRate);

    const time = performance.now() - this.startTime;

    const isVoiced =
      clarity >= MIN_CLARITY &&
      rawPitch >= MIN_PITCH_HZ &&
      rawPitch <= MAX_PITCH_HZ;

    return {
      time,
      pitch: isVoiced ? rawPitch : null,
      clarity,
    };
  }
}
