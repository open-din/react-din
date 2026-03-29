import { useState } from 'react';
import {
    AudioProvider,
    useAudio,
    Gain,
    Filter,
    Osc,
    Delay,
    StereoPanner,
    Compressor,
} from '@din/react';

/**
 * Nodes Demo - Audio Processing Nodes
 *
 * Demonstrates:
 * - Gain for volume control
 * - Delay for echo effects
 * - StereoPanner for stereo positioning
 * - Compressor for dynamics processing
 * - Chaining multiple nodes together
 */
export function NodesDemo() {
    return (
        <div className="demo">
            <h1>Nodes Demo</h1>
            <p>Audio processing nodes: Gain, Delay, StereoPanner, Compressor</p>

            <AudioProvider masterGain={0.5} createOnUserGesture debug>
                <NodesDemoContent />
            </AudioProvider>
        </div>
    );
}

function NodesDemoContent() {
    const { isUnlocked, context } = useAudio();
    const [isPlaying, setIsPlaying] = useState(false);

    // Oscillator settings
    const [frequency, setFrequency] = useState(220);
    const [waveform, setWaveform] = useState<OscillatorType>('sawtooth');

    // Gain settings
    const [volume, setVolume] = useState(0.5);

    // Delay settings
    const [delayTime, setDelayTime] = useState(0.3);
    const [delayMix, setDelayMix] = useState(0.4);

    // StereoPanner settings
    const [pan, setPan] = useState(0);

    // Compressor settings
    const [compressorEnabled, setCompressorEnabled] = useState(true);
    const [threshold, setThreshold] = useState(-24);
    const [ratio, setRatio] = useState(4);

    // Filter settings
    const [filterFreq, setFilterFreq] = useState(2000);
    const [filterQ, setFilterQ] = useState(1);

    return (
        <>
            {/* Status Section */}
            <div className="demo-section">
                <h2>AudioContext Status</h2>
                <div className="controls">
                    <div className="status">
                        <span
                            className={`status-dot ${isUnlocked ? 'active' : 'inactive'}`}
                        />
                        {isUnlocked ? 'Unlocked' : 'Locked (click to unlock)'}
                    </div>
                    {context && (
                        <div className="status">
                            Sample Rate: <code>{context.sampleRate} Hz</code>
                        </div>
                    )}
                </div>
            </div>

            {/* Play Control */}
            <div className="demo-section">
                <h2>Source Oscillator</h2>
                <div className="controls">
                    <button
                        className={isPlaying ? 'danger' : 'primary'}
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>

                    <div className="control-group">
                        <label>Waveform</label>
                        <select
                            value={waveform}
                            onChange={(e) => setWaveform(e.target.value as OscillatorType)}
                        >
                            <option value="sine">Sine</option>
                            <option value="square">Square</option>
                            <option value="sawtooth">Sawtooth</option>
                            <option value="triangle">Triangle</option>
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Frequency: {frequency} Hz</label>
                        <input
                            type="range"
                            min="55"
                            max="880"
                            value={frequency}
                            onChange={(e) => setFrequency(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Gain Control */}
            <div className="demo-section">
                <h2>🔊 Gain Node</h2>
                <p className="node-description">Controls the volume/amplitude of the audio signal.</p>
                <div className="controls">
                    <div className="control-group">
                        <label>Volume: {Math.round(volume * 100)}%</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Control */}
            <div className="demo-section">
                <h2>🎚️ Filter Node</h2>
                <p className="node-description">Low-pass filter to shape the frequency content.</p>
                <div className="controls">
                    <div className="control-group">
                        <label>Cutoff: {filterFreq} Hz</label>
                        <input
                            type="range"
                            min="100"
                            max="10000"
                            value={filterFreq}
                            onChange={(e) => setFilterFreq(Number(e.target.value))}
                        />
                    </div>
                    <div className="control-group">
                        <label>Resonance (Q): {filterQ.toFixed(1)}</label>
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={filterQ}
                            onChange={(e) => setFilterQ(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Delay Control */}
            <div className="demo-section">
                <h2>⏱️ Delay Node</h2>
                <p className="node-description">Creates echo/delay effects by delaying the audio signal.</p>
                <div className="controls">
                    <div className="control-group">
                        <label>Delay Time: {(delayTime * 1000).toFixed(0)} ms</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={delayTime}
                            onChange={(e) => setDelayTime(Number(e.target.value))}
                        />
                    </div>
                    <div className="control-group">
                        <label>Delay Mix: {Math.round(delayMix * 100)}%</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={delayMix}
                            onChange={(e) => setDelayMix(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* StereoPanner Control */}
            <div className="demo-section">
                <h2>🔀 StereoPanner Node</h2>
                <p className="node-description">Positions audio in the stereo field (left to right).</p>
                <div className="controls">
                    <div className="control-group">
                        <label>
                            Pan: {pan < 0 ? `${Math.abs(pan * 100).toFixed(0)}% Left` : pan > 0 ? `${(pan * 100).toFixed(0)}% Right` : 'Center'}
                        </label>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.01"
                            value={pan}
                            onChange={(e) => setPan(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Compressor Control */}
            <div className="demo-section">
                <h2>📊 Compressor Node</h2>
                <p className="node-description">Dynamics processor that reduces the volume of loud sounds.</p>
                <div className="controls">
                    <button
                        className={compressorEnabled ? 'primary' : 'secondary'}
                        onClick={() => setCompressorEnabled(!compressorEnabled)}
                    >
                        {compressorEnabled ? '✓ Enabled' : '✗ Bypassed'}
                    </button>

                    <div className="control-group">
                        <label>Threshold: {threshold} dB</label>
                        <input
                            type="range"
                            min="-60"
                            max="0"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                        />
                    </div>
                    <div className="control-group">
                        <label>Ratio: {ratio}:1</label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={ratio}
                            onChange={(e) => setRatio(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Audio Graph */}
            {isPlaying && (
                <Compressor
                    threshold={threshold}
                    ratio={ratio}
                    bypass={!compressorEnabled}
                >
                    <StereoPanner pan={pan}>
                        {/* Dry signal */}
                        <Gain gain={volume * (1 - delayMix)}>
                            <Filter type="lowpass" frequency={filterFreq} Q={filterQ}>
                                <Osc type={waveform} frequency={frequency} autoStart />
                            </Filter>
                        </Gain>

                        {/* Wet (delayed) signal */}
                        <Gain gain={volume * delayMix}>
                            <Delay delayTime={delayTime}>
                                <Filter type="lowpass" frequency={filterFreq} Q={filterQ}>
                                    <Osc type={waveform} frequency={frequency} autoStart />
                                </Filter>
                            </Delay>
                        </Gain>
                    </StereoPanner>
                </Compressor>
            )}
        </>
    );
}
