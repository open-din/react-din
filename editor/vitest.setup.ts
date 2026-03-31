import '../vitest.setup';
import '@testing-library/jest-dom';
import { vi } from 'vitest';


// Explicitly mock AudioEngine to the stub to ensure esbuild never tries to transform the 3k line file
vi.mock('./ui/editor/AudioEngine', () => {
  const stub = require('./ui/editor/AudioEngine.stub');
  return {
    ...stub,
    default: stub.audioEngine,
    audioEngine: stub.audioEngine,
  };
});

// Polyfill AudioBuffer for JSDOM
if (typeof window !== 'undefined' && !window.AudioBuffer) {
  (window as any).AudioBuffer = class AudioBuffer {
    constructor({ length, sampleRate }: { length: number; sampleRate: number }) {
      this.length = length;
      this.sampleRate = sampleRate;
      this.duration = length / sampleRate;
      this.numberOfChannels = 1;
    }
    length: number;
    sampleRate: number;
    duration: number;
    numberOfChannels: number;
    getChannelData() { return new Float32Array(this.length); }
    copyFromChannel() {}
    copyToChannel() {}
  };
}
