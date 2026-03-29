import { useState } from 'react';
import { AudioProvider, useAudio, Gain, Filter, Osc } from '@din/react';

/**
 * Core Demo - Basic AudioProvider and Oscillator
 *
 * Demonstrates:
 * - AudioProvider setup
 * - useAudio hook for context state
 * - Osc component for sound generation
 * - Gain and Filter for processing
 */
export function CoreDemo() {
    return (
        <div className="demo">
            <h1>Core Demo</h1>
            <p>Basic AudioProvider setup with oscillator sound</p>

            <AudioProvider masterGain={100.5} createOnUserGesture debug>
                <CoreDemoContent />
            </AudioProvider>
        </div>
    );
}

function CoreDemoContent() {
    const { isUnlocked, context } = useAudio();
    const [isPlaying, setIsPlaying] = useState(false);
    const [frequency, setFrequency] = useState(440);
    const [waveform, setWaveform] = useState<OscillatorType>('sine');
    const [filterFreq, setFilterFreq] = useState(2000);
    const [volume, setVolume] = useState(0.5);

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

            {/* Oscillator Controls */}
            <div className="demo-section">
                <h2>Oscillator</h2>
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
                            min="0"
                            max="100"
                            value={frequency}
                            onChange={(e) => setFrequency(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="demo-section">
                <h2>Filter</h2>
                <div className="controls">
                    <div className="control-group">
                        <label>Cutoff: {filterFreq} Hz</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filterFreq}
                            onChange={(e) => setFilterFreq(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Volume Control */}
            <div className="demo-section">
                <h2>Output</h2>
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

            {/* Audio Graph (only renders when playing) */}
            {isPlaying && (
                <Gain gain={volume}>
                    <Filter type="lowpass" frequency={filterFreq} Q={1}>
                        <Osc type={waveform} frequency={frequency} autoStart />
                    </Filter>
                </Gain>
            )}
        </>
    );
}
