type Listener = (...args: unknown[]) => void;

class MockEventTarget {
    private listeners = new Map<string, Set<Listener>>();

    addEventListener(type: string, listener: Listener) {
        const set = this.listeners.get(type) ?? new Set<Listener>();
        set.add(listener);
        this.listeners.set(type, set);
    }

    removeEventListener(type: string, listener: Listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type: string) {
        this.listeners.get(type)?.forEach((listener) => listener());
    }
}

export class MockAudioParam {
    value: number;

    constructor(value = 0) {
        this.value = value;
    }

    setValueAtTime(value: number) {
        this.value = value;
    }

    linearRampToValueAtTime(value: number) {
        this.value = value;
    }

    exponentialRampToValueAtTime(value: number) {
        this.value = value;
    }

    cancelScheduledValues() {}
}

export class MockAudioNode {
    connections: unknown[] = [];

    connect(target: unknown) {
        this.connections.push(target);
        return target;
    }

    disconnect() {
        this.connections = [];
    }
}

export class MockAudioBuffer {
    duration: number;
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    private data: Float32Array[];

    constructor(numberOfChannels: number, length: number, sampleRate: number) {
        this.duration = length / sampleRate;
        this.numberOfChannels = numberOfChannels;
        this.length = length;
        this.sampleRate = sampleRate;
        this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
    }

    getChannelData(channel: number) {
        return this.data[channel];
    }
}

class MockBufferSourceNode extends MockAudioNode {
    buffer: MockAudioBuffer | null = null;
    loop = false;
    loopStart = 0;
    loopEnd = 0;
    playbackRate = new MockAudioParam(1);
    detune = new MockAudioParam(0);
    onended: (() => void) | null = null;
    started = false;

    start() {
        this.started = true;
    }

    stop() {
        this.started = false;
        this.onended?.();
    }
}

class MockOscillatorNode extends MockAudioNode {
    type: OscillatorType = 'sine';
    frequency = new MockAudioParam(440);
    detune = new MockAudioParam(0);
    started = false;

    start() {
        this.started = true;
    }

    stop() {
        this.started = false;
    }

    setPeriodicWave() {}
}

class MockAnalyserNode extends MockAudioNode {
    fftSize = 2048;
    smoothingTimeConstant = 0.8;
    minDecibels = -100;
    maxDecibels = -30;
    frequencyBinCount = 1024;

    getByteFrequencyData(array: Uint8Array) {
        if (!array) return;
        array.fill(32);
    }

    getByteTimeDomainData(array: Uint8Array) {
        if (!array) return;
        array.fill(128);
    }
}

class MockGainNode extends MockAudioNode {
    gain = new MockAudioParam(1);
}

class MockBiquadFilterNode extends MockAudioNode {
    type: BiquadFilterType = 'lowpass';
    frequency = new MockAudioParam(350);
    detune = new MockAudioParam(0);
    Q = new MockAudioParam(1);
    gain = new MockAudioParam(0);
}

class MockDelayNode extends MockAudioNode {
    delayTime = new MockAudioParam(0);
}

class MockCompressorNode extends MockAudioNode {
    threshold = new MockAudioParam(-24);
    knee = new MockAudioParam(30);
    ratio = new MockAudioParam(12);
    attack = new MockAudioParam(0.003);
    release = new MockAudioParam(0.25);
}

class MockConvolverNode extends MockAudioNode {
    buffer: MockAudioBuffer | null = null;
    normalize = true;
}

class MockPannerNode extends MockAudioNode {
    positionX = new MockAudioParam(0);
    positionY = new MockAudioParam(0);
    positionZ = new MockAudioParam(0);
    orientationX = new MockAudioParam(1);
    orientationY = new MockAudioParam(0);
    orientationZ = new MockAudioParam(0);
    panningModel: PanningModelType = 'equalpower';
    distanceModel: DistanceModelType = 'inverse';
    refDistance = 1;
    maxDistance = 10000;
    rolloffFactor = 1;
    coneInnerAngle = 360;
    coneOuterAngle = 360;
    coneOuterGain = 0;
}

class MockStereoPannerNode extends MockAudioNode {
    pan = new MockAudioParam(0);
}

class MockWaveShaperNode extends MockAudioNode {
    curve: Float32Array | null = null;
    oversample: OverSampleType = 'none';
}

class MockConstantSourceNode extends MockAudioNode {
    offset = new MockAudioParam(1);
    started = false;

    start() {
        this.started = true;
    }
}

class MockMediaStreamSourceNode extends MockAudioNode {}

class MockScriptProcessorNode extends MockAudioNode {
    bufferSize: number;
    onaudioprocess: ((event: { outputBuffer: MockAudioBuffer }) => void) | null = null;

    constructor(bufferSize: number, _numberOfInputChannels: number, numberOfOutputChannels: number) {
        super();
        this.bufferSize = bufferSize;
        void numberOfOutputChannels;
    }
}

export class MockAudioContext extends MockEventTarget {
    state: AudioContextState = 'suspended';
    sampleRate = 44100;
    currentTime = 0;
    destination = new MockAudioNode();

    resume = async () => {
        this.state = 'running';
        this.dispatch('statechange');
    };

    close = async () => {
        this.state = 'closed';
        this.dispatch('statechange');
    };

    createGain() {
        return new MockGainNode();
    }

    createBiquadFilter() {
        return new MockBiquadFilterNode();
    }

    createOscillator() {
        return new MockOscillatorNode();
    }

    createDelay() {
        return new MockDelayNode();
    }

    createDynamicsCompressor() {
        return new MockCompressorNode();
    }

    createConvolver() {
        return new MockConvolverNode();
    }

    createPanner() {
        return new MockPannerNode();
    }

    createStereoPanner() {
        return new MockStereoPannerNode();
    }

    createWaveShaper() {
        return new MockWaveShaperNode();
    }

    createAnalyser() {
        return new MockAnalyserNode();
    }

    createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
        return new MockAudioBuffer(numberOfChannels, length, sampleRate);
    }

    decodeAudioData = async () => new MockAudioBuffer(2, this.sampleRate, this.sampleRate);

    createBufferSource() {
        return new MockBufferSourceNode();
    }

    createConstantSource() {
        return new MockConstantSourceNode();
    }

    createMediaStreamSource() {
        return new MockMediaStreamSourceNode();
    }

    createScriptProcessor(bufferSize: number, numberOfInputChannels: number, numberOfOutputChannels: number) {
        return new MockScriptProcessorNode(bufferSize, numberOfInputChannels, numberOfOutputChannels);
    }

    createPeriodicWave() {
        return {};
    }
}

export const installMockWebAudio = () => {
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            value: MockAudioContext,
        });
        Object.defineProperty(window, 'webkitAudioContext', {
            configurable: true,
            value: MockAudioContext,
        });
    }

    Object.defineProperty(globalThis, 'AudioContext', {
        configurable: true,
        value: MockAudioContext,
    });
    Object.defineProperty(globalThis, 'AudioBuffer', {
        configurable: true,
        value: MockAudioBuffer,
    });
};
