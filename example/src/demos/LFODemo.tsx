import React, { useState } from 'react';
import {
    AudioProvider,
    Gain,
    Filter,
    Osc,
    useLFO,
    LFO,
    type LFOWaveform,
} from '@din/react';

/**
 * LFO Demo - Demonstrates using LFO for modulation
 * 
 * Shows how to use:
 * 1. useLFO hook to create an LFO and pass it to props
 * 2. LFO component with render props pattern
 * 3. Real-time control of LFO parameters
 */
export const LFODemo: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);

    // LFO parameters
    const [lfoRate, setLfoRate] = useState(2);
    const [lfoDepth, setLfoDepth] = useState(500);
    const [lfoWaveform, setLfoWaveform] = useState<LFOWaveform>('sine');
    const [baseFrequency, setBaseFrequency] = useState(1000);

    // Tremolo parameters
    const [tremoloRate, setTremoloRate] = useState(5);
    const [tremoloDepth, setTremoloDepth] = useState(0.3);

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
            <h1>🌊 LFO Demo</h1>
            <p>Demonstrate LFO modulation on Filter frequency and Gain (tremolo)</p>

            <AudioProvider debug>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Filter LFO Example */}
                    <div style={{
                        padding: '1.5rem',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        minWidth: '300px',
                        background: '#1a1a2e'
                    }}>
                        <h3>🎛️ Filter Wobble</h3>
                        <p style={{ fontSize: '0.9rem', color: '#888' }}>
                            LFO modulates filter cutoff frequency
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                            <label>LFO Rate: {lfoRate.toFixed(1)} Hz</label>
                            <input
                                type="range"
                                min="0.1"
                                max="20"
                                step="0.1"
                                value={lfoRate}
                                onChange={(e) => setLfoRate(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label>LFO Depth: {lfoDepth.toFixed(0)} Hz</label>
                            <input
                                type="range"
                                min="0"
                                max="2000"
                                step="10"
                                value={lfoDepth}
                                onChange={(e) => setLfoDepth(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label>Base Frequency: {baseFrequency} Hz</label>
                            <input
                                type="range"
                                min="100"
                                max="4000"
                                step="10"
                                value={baseFrequency}
                                onChange={(e) => setBaseFrequency(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label>Waveform</label>
                            <select
                                value={lfoWaveform}
                                onChange={(e) => setLfoWaveform(e.target.value as LFOWaveform)}
                                style={{ width: '100%', padding: '0.5rem' }}
                            >
                                <option value="sine">Sine</option>
                                <option value="triangle">Triangle</option>
                                <option value="sawtooth">Sawtooth</option>
                                <option value="square">Square</option>
                            </select>
                        </div>

                        {/* Using LFO component with render props */}
                        {isPlaying && (
                            <LFO rate={lfoRate} depth={lfoDepth} waveform={lfoWaveform}>
                                {(lfo) => (
                                    <Gain gain={0.3}>
                                        <Filter
                                            type="lowpass"
                                            frequency={lfo ?? baseFrequency}
                                            frequencyBase={baseFrequency}
                                            Q={5}
                                        >
                                            <Osc type="sawtooth" frequency={110} autoStart />
                                        </Filter>
                                    </Gain>
                                )}
                            </LFO>
                        )}
                    </div>

                    {/* Tremolo Example */}
                    <div style={{
                        padding: '1.5rem',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        minWidth: '300px',
                        background: '#1a1a2e'
                    }}>
                        <h3>🔊 Tremolo Effect</h3>
                        <p style={{ fontSize: '0.9rem', color: '#888' }}>
                            LFO modulates gain for tremolo effect
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                            <label>Tremolo Rate: {tremoloRate.toFixed(1)} Hz</label>
                            <input
                                type="range"
                                min="0.5"
                                max="15"
                                step="0.5"
                                value={tremoloRate}
                                onChange={(e) => setTremoloRate(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label>Tremolo Depth: {tremoloDepth.toFixed(2)}</label>
                            <input
                                type="range"
                                min="0"
                                max="0.5"
                                step="0.01"
                                value={tremoloDepth}
                                onChange={(e) => setTremoloDepth(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Using useLFO hook pattern would be used inside a child component */}
                        {isPlaying && (
                            <TremoloSynth rate={tremoloRate} depth={tremoloDepth} />
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        style={{
                            padding: '1rem 2rem',
                            fontSize: '1.2rem',
                            background: isPlaying ? '#e74c3c' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                        }}
                    >
                        {isPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>
                </div>
            </AudioProvider>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1a2e', borderRadius: '8px' }}>
                <h3>📖 Usage Examples</h3>
                <pre style={{ background: '#0d0d1a', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
                    {`// Using useLFO hook
const lfo = useLFO({ rate: 2, depth: 500, waveform: 'sine' });

<Filter frequency={lfo} frequencyBase={1000}>
  <Osc type="sawtooth" frequency={110} />
</Filter>

// Using LFO component with render props
<LFO rate={2} depth={500}>
  {(lfo) => (
    <Filter frequency={lfo} frequencyBase={1000}>
      <Osc type="sawtooth" frequency={110} />
    </Filter>
  )}
</LFO>

// Fixed value (original behavior still works)
<Filter frequency={1000}>
  <Osc type="sawtooth" frequency={110} />
</Filter>`}
                </pre>
            </div>
        </div>
    );
};

/**
 * Tremolo synth using useLFO hook
 */
const TremoloSynth: React.FC<{ rate: number; depth: number }> = ({ rate, depth }) => {
    const lfo = useLFO({ rate, depth, waveform: 'sine' });

    if (!lfo) return null;

    return (
        <Gain gain={lfo} gainBase={0.5}>
            <Osc type="sine" frequency={440} autoStart />
        </Gain>
    );
};

export default LFODemo;
