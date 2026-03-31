import { vi } from 'vitest';

export const audioEngine = {
    createNode: vi.fn(),
    updateNode: vi.fn(),
    removeNode: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    setPlaying: vi.fn(),
    setMasterGain: vi.fn(),
    loadGraph: vi.fn(),
    clear: vi.fn(),
    refreshConnections: vi.fn(),
    refreshDataValues: vi.fn(),
    stop: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    onSamplerEnd: vi.fn(() => () => {}),
    onAnalyzerUpdate: vi.fn(() => () => {}),
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    loadSamplerBuffer: vi.fn().mockResolvedValue(new AudioBuffer({ length: 1, sampleRate: 44100 })),
    playSampler: vi.fn(),
    stopSampler: vi.fn(),
    updateSamplerParam: vi.fn(),
    subscribeStep: vi.fn(() => () => {}),
    init: vi.fn().mockResolvedValue(undefined),
};

export default audioEngine;
