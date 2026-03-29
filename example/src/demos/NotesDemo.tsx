import { useState, useCallback, useEffect, useRef, type FC } from 'react';
import {
    AudioProvider,
    Osc,
    Gain,
    ADSR,
    noteToFreq,
    parseNote,
} from '@din/react';

/**
 * Notes Demo - Interactive Piano Keyboard
 *
 * Demonstrates:
 * - Note string parsing (English & French)
 * - MIDI to frequency conversion
 * - Interactive piano keyboard
 * - Different synth sounds per octave
 */

// Piano key configuration
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// ADSR configuration type
interface ADSRParams {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
}

// ADSR Curve Editor Component - Interactive envelope visualization
interface ADSRCurveEditorProps {
    adsr: ADSRParams;
    onChange: (key: keyof ADSRParams, value: number) => void;
}

const ADSRCurveEditor: FC<ADSRCurveEditorProps> = ({ adsr, onChange }) => {
    const [dragging, setDragging] = useState<'attack' | 'decay' | 'sustain' | 'release' | null>(null);
    const svgRef = useCallback((node: SVGSVGElement | null) => {
        if (node) {
            node.style.touchAction = 'none';
        }
    }, []);

    // Canvas dimensions
    const width = 320;
    const height = 140;
    const padding = { top: 15, right: 15, bottom: 15, left: 15 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Time scaling: total time shown = attack + decay + sustainHold + release
    const sustainHoldTime = 0.3; // Fixed visual hold time for sustain
    const totalTime = Math.max(0.5, adsr.attack + adsr.decay + sustainHoldTime + adsr.release);

    // Calculate point positions
    const timeToX = (t: number) => padding.left + (t / totalTime) * graphWidth;
    const levelToY = (level: number) => padding.top + (1 - level) * graphHeight;

    // Key points on the envelope
    const startX = timeToX(0);
    const startY = levelToY(0);

    const attackEndX = timeToX(adsr.attack);
    const attackEndY = levelToY(1); // Peak at 100%

    const decayEndX = timeToX(adsr.attack + adsr.decay);
    const decayEndY = levelToY(adsr.sustain);

    const sustainEndX = timeToX(adsr.attack + adsr.decay + sustainHoldTime);
    const sustainEndY = levelToY(adsr.sustain);

    const releaseEndX = timeToX(adsr.attack + adsr.decay + sustainHoldTime + adsr.release);
    const releaseEndY = levelToY(0);

    // Build the path
    const pathD = `
        M ${startX} ${startY}
        L ${attackEndX} ${attackEndY}
        L ${decayEndX} ${decayEndY}
        L ${sustainEndX} ${sustainEndY}
        L ${releaseEndX} ${releaseEndY}
    `;

    // Drag handling
    const handleMouseDown = (point: 'attack' | 'decay' | 'sustain' | 'release') => (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as SVGElement).setPointerCapture(e.pointerId);
        setDragging(point);
    };

    const handleMouseMove = useCallback((e: React.PointerEvent) => {
        if (!dragging) return;

        const svg = e.currentTarget as SVGSVGElement;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert pixel position to time/level
        const time = Math.max(0.001, ((x - padding.left) / graphWidth) * totalTime);
        const level = Math.max(0, Math.min(1, 1 - (y - padding.top) / graphHeight));

        switch (dragging) {
            case 'attack':
                // Attack point: X controls attack time
                onChange('attack', Math.min(time, 1));
                break;
            case 'decay':
                // Decay point: X controls decay time, Y controls sustain level
                const decayTime = Math.max(0.01, time - adsr.attack);
                onChange('decay', Math.min(decayTime, 2));
                onChange('sustain', level);
                break;
            case 'sustain':
                // Sustain point: only Y movement (sustain level)
                onChange('sustain', level);
                break;
            case 'release':
                // Release point: X controls release time
                const releaseTime = Math.max(0.01, time - adsr.attack - adsr.decay - sustainHoldTime);
                onChange('release', Math.min(releaseTime, 3));
                break;
        }
    }, [dragging, adsr.attack, adsr.decay, graphWidth, graphHeight, padding.left, padding.top, totalTime, onChange]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    // Control point component
    const ControlPoint: FC<{
        cx: number;
        cy: number;
        pointType: 'attack' | 'decay' | 'sustain' | 'release';
    }> = ({ cx, cy, pointType }) => (
        <g className="control-point">
            {/* Outer glow */}
            <circle
                cx={cx}
                cy={cy}
                r={10}
                fill="transparent"
                className="point-hitbox"
                onPointerDown={handleMouseDown(pointType)}
                style={{ cursor: 'grab' }}
            />
            {/* Main circle */}
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill={dragging === pointType ? '#00ffff' : '#1a1a2e'}
                stroke="#00d4ff"
                strokeWidth={2}
                onPointerDown={handleMouseDown(pointType)}
                style={{ cursor: 'grab' }}
            />
            {/* Inner highlight */}
            <circle
                cx={cx}
                cy={cy}
                r={3}
                fill="#ffa500"
                onPointerDown={handleMouseDown(pointType)}
                style={{ cursor: 'grab' }}
            />
        </g>
    );

    return (
        <div className="adsr-curve-editor">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                onPointerMove={handleMouseMove}
                onPointerUp={handleMouseUp}
                onPointerLeave={handleMouseUp}
            >
                {/* Background */}
                <rect x={0} y={0} width={width} height={height} fill="#0a0a14" rx={4} />

                {/* Graph area border */}
                <rect
                    x={padding.left}
                    y={padding.top}
                    width={graphWidth}
                    height={graphHeight}
                    fill="transparent"
                    stroke="#2a2a3a"
                    strokeWidth={1}
                />

                {/* Horizontal grid lines */}
                {[0.25, 0.5, 0.75].map((level, i) => (
                    <line
                        key={i}
                        x1={padding.left}
                        y1={levelToY(level)}
                        x2={padding.left + graphWidth}
                        y2={levelToY(level)}
                        stroke="#1a1a2a"
                        strokeDasharray="2,4"
                    />
                ))}

                {/* Envelope path with glow effect */}
                <path
                    d={pathD}
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                />
                <path
                    d={pathD}
                    fill="none"
                    stroke="#00ffff"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Glow filter */}
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Control points */}
                <ControlPoint cx={attackEndX} cy={attackEndY} pointType="attack" />
                <ControlPoint cx={decayEndX} cy={decayEndY} pointType="decay" />
                <ControlPoint cx={sustainEndX} cy={sustainEndY} pointType="sustain" />
                <ControlPoint cx={releaseEndX} cy={releaseEndY} pointType="release" />
            </svg>

            {/* Value labels */}
            <div className="adsr-values">
                <div className="adsr-value">
                    <span className="label">Attack</span>
                    <span className="value">{(adsr.attack * 1000).toFixed(0)} ms</span>
                </div>
                <div className="adsr-value">
                    <span className="label">Decay</span>
                    <span className="value">{(adsr.decay * 1000).toFixed(0)} ms</span>
                </div>
                <div className="adsr-value">
                    <span className="label">Sustain</span>
                    <span className="value">{(adsr.sustain * 100).toFixed(0)}%</span>
                </div>
                <div className="adsr-value">
                    <span className="label">Release</span>
                    <span className="value">{(adsr.release * 1000).toFixed(0)} ms</span>
                </div>
            </div>
        </div>
    );
};

// Piano keyboard component
interface PianoProps {
    startOctave: number;
    octaves: number;
    waveform: OscillatorType;
    adsr: ADSRParams;
    gain: number;
}

// Calculate black key positions relative to white keys
const BLACK_KEY_OFFSETS: { [key: string]: number } = {
    'C#': 0.65,
    'D#': 1.75,
    'F#': 3.6,
    'G#': 4.7,
    'A#': 5.8,
};

// Monophonic Voice component - always mounted, frequency changes dynamically
interface MonoVoiceProps {
    note: string | null;
    waveform: OscillatorType;
    adsr: ADSRParams;
    gain: number;
    trigger: boolean;
}

const MonoVoice: FC<MonoVoiceProps> = ({ note, waveform, adsr, gain, trigger }) => {
    const frequency = note ? noteToFreq(note) : 440;

    return (
        <ADSR trigger={trigger} attack={adsr.attack} decay={adsr.decay} sustain={adsr.sustain} release={adsr.release}>
            <Gain gain={gain}>
                <Osc frequency={frequency} type={waveform} autoStart />
            </Gain>
        </ADSR>
    );
};

const Piano: FC<PianoProps> = ({ startOctave, octaves, waveform, adsr, gain }) => {
    // Monophonic state - single voice
    const [currentNote, setCurrentNote] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const isPointerDownRef = useRef(false);

    const handlePointerDown = useCallback((note: string) => {
        isPointerDownRef.current = true;
        setCurrentNote(note);
        setIsPlaying(true);
    }, []);

    const handlePointerUp = useCallback(() => {
        isPointerDownRef.current = false;
        setIsPlaying(false);
    }, []);

    const handlePointerEnter = useCallback((note: string) => {
        // Only change note if pointer is currently down (glide behavior)
        if (isPointerDownRef.current) {
            setCurrentNote(note);
        }
    }, []);

    // Generate white keys
    const whiteKeys: { note: string; index: number }[] = [];
    let whiteKeyIndex = 0;
    for (let octave = startOctave; octave < startOctave + octaves; octave++) {
        WHITE_KEYS.forEach((key) => {
            whiteKeys.push({ note: `${key}${octave}`, index: whiteKeyIndex });
            whiteKeyIndex++;
        });
    }
    // Add final C
    whiteKeys.push({ note: `C${startOctave + octaves}`, index: whiteKeyIndex });

    // Generate black keys with positions
    const blackKeys: { note: string; leftOffset: number }[] = [];
    const whiteKeyWidth = 50;
    const gap = 2;

    for (let octave = startOctave; octave < startOctave + octaves; octave++) {
        const octaveOffset = (octave - startOctave) * 7;

        Object.entries(BLACK_KEY_OFFSETS).forEach(([key, offset]) => {
            const leftPos = (octaveOffset + offset) * (whiteKeyWidth + gap) + 10; // 10 = padding
            blackKeys.push({
                note: `${key}${octave}`,
                leftOffset: leftPos,
            });
        });
    }

    return (
        <div className="piano-container">
            <div
                className="piano-keyboard"
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {whiteKeys.map(({ note }) => (
                    <button
                        key={note}
                        className={`piano-key white ${currentNote === note && isPlaying ? 'active' : ''}`}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            handlePointerDown(note);
                        }}
                        onPointerEnter={() => handlePointerEnter(note)}
                        aria-label={`Play note ${note}`}
                    >
                        <span className="key-label">{note}</span>
                    </button>
                ))}
                {blackKeys.map(({ note, leftOffset }) => (
                    <button
                        key={note}
                        className={`piano-key black ${currentNote === note && isPlaying ? 'active' : ''}`}
                        style={{ left: `${leftOffset}px` }}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            handlePointerDown(note);
                        }}
                        onPointerEnter={() => handlePointerEnter(note)}
                        aria-label={`Play note ${note}`}
                    >
                        <span className="key-label">{note}</span>
                    </button>
                ))}
            </div>

            {/* Single monophonic voice - always mounted */}
            <MonoVoice
                note={currentNote}
                waveform={waveform}
                adsr={adsr}
                gain={gain}
                trigger={isPlaying}
            />
        </div>
    );
};

// Note converter panel
const NoteConverter: FC = () => {
    const [input, setInput] = useState('C4');
    const [result, setResult] = useState<{ midi: number; freq: number; note: string } | null>(null);

    const convert = useCallback(() => {
        try {
            const parsed = parseNote(input);
            if (parsed) {
                setResult({
                    midi: parsed.midi,
                    freq: parsed.frequency,
                    note: `${parsed.note}${parsed.octave}`,
                });
            }
        } catch {
            setResult(null);
        }
    }, [input]);

    useEffect(() => {
        convert();
    }, [input, convert]);

    return (
        <div className="note-converter">
            <h3>Note Converter</h3>
            <div className="converter-input">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Enter note (C4, Do3, Sol#2...)"
                />
            </div>
            {result && (
                <div className="converter-result">
                    <div className="result-item">
                        <span className="label">Note:</span>
                        <span className="value">{result.note}</span>
                    </div>
                    <div className="result-item">
                        <span className="label">MIDI:</span>
                        <span className="value">{result.midi}</span>
                    </div>
                    <div className="result-item">
                        <span className="label">Frequency:</span>
                        <span className="value">{result.freq.toFixed(2)} Hz</span>
                    </div>
                </div>
            )}
            <div className="examples">
                <p>Try: <code>A4</code>, <code>Do4</code>, <code>Sol#3</code>, <code>Bb2</code>, <code>Mi5</code></p>
            </div>
        </div>
    );
};

// Waveform selector
interface WaveformSelectorProps {
    value: OscillatorType;
    onChange: (waveform: OscillatorType) => void;
}

const WaveformSelector: FC<WaveformSelectorProps> = ({ value, onChange }) => {
    const waveforms: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];

    return (
        <div className="waveform-selector">
            <h3>Waveform</h3>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as OscillatorType)}
                className="control-select"
                aria-label="Select waveform"
            >
                {waveforms.map(wf => (
                    <option key={wf} value={wf}>
                        {wf.charAt(0).toUpperCase() + wf.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
};

// Main demo component
export const NotesDemo: FC = () => {
    const [waveform, setWaveform] = useState<OscillatorType>('sine');
    const [startOctave, setStartOctave] = useState(3);
    const [adsr, setAdsr] = useState<ADSRParams>({
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3,
    });
    const [gain, setGain] = useState(0.3);

    const updateAdsr = useCallback((key: keyof ADSRParams, value: number) => {
        setAdsr(prev => ({ ...prev, [key]: value }));
    }, []);

    return (
        <AudioProvider>
            <div className="notes-demo">
                <style>{`
                    .notes-demo {
                        padding: 20px;
                        max-width: 1000px;
                        margin: 0 auto;
                        font-family: system-ui, -apple-system, sans-serif;
                    }

                    .notes-demo h1 {
                        text-align: center;
                        margin-bottom: 10px;
                    }

                    .notes-demo .subtitle {
                        text-align: center;
                        color: #666;
                        margin-bottom: 30px;
                    }

                    .controls-row {
                        display: flex;
                        gap: 20px;
                        margin-bottom: 30px;
                        flex-wrap: wrap;
                    }

                    .waveform-selector, .note-converter, .octave-selector {
                        background: #1e1e2e;
                        padding: 15px;
                        border-radius: 8px;
                        flex: 1;
                        min-width: 200px;
                        color: #e0e0e0;
                    }

                    .waveform-selector h3, .note-converter h3, .octave-selector h3 {
                        margin: 0 0 10px 0;
                        font-size: 14px;
                        text-transform: uppercase;
                        color: #a0a0a0;
                    }

                    .control-select {
                        width: 100%;
                        padding: 12px 16px;
                        border: 2px solid #3a3a4a;
                        border-radius: 6px;
                        background: #2a2a3a;
                        color: #fff;
                        font-size: 16px;
                        cursor: pointer;
                        appearance: none;
                        -webkit-appearance: none;
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
                        background-repeat: no-repeat;
                        background-position: right 12px center;
                    }

                    .control-select:focus {
                        outline: none;
                        border-color: #0088ff;
                    }

                    .converter-input input {
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #3a3a4a;
                        border-radius: 6px;
                        font-size: 16px;
                        font-family: monospace;
                        background: #2a2a3a;
                        color: #fff;
                    }

                    .converter-input input:focus {
                        outline: none;
                        border-color: #0088ff;
                    }

                    .converter-result {
                        display: flex;
                        gap: 15px;
                        margin-top: 10px;
                        flex-wrap: wrap;
                    }

                    .result-item {
                        display: flex;
                        flex-direction: column;
                    }

                    .result-item .label {
                        font-size: 11px;
                        color: #888;
                        text-transform: uppercase;
                    }

                    .result-item .value {
                        font-size: 18px;
                        font-weight: bold;
                        font-family: monospace;
                        color: #7dd3fc;
                    }

                    .examples {
                        margin-top: 10px;
                        font-size: 12px;
                        color: #888;
                    }

                    .examples code {
                        background: #2d2d44;
                        color: #7dd3fc;
                        padding: 2px 6px;
                        border-radius: 3px;
                    }

                    .adsr-controls, .gain-control {
                        background: #1e1e2e;
                        padding: 15px;
                        border-radius: 8px;
                        flex: 1;
                        min-width: 200px;
                        color: #e0e0e0;
                    }

                    .adsr-controls {
                        flex: 2;
                    }

                    .adsr-controls h3, .gain-control h3 {
                        margin: 0 0 12px 0;
                        font-size: 14px;
                        text-transform: uppercase;
                        color: #a0a0a0;
                    }

                    .envelope-row {
                        align-items: flex-start;
                    }

                    .adsr-curve-editor {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .adsr-curve-editor svg {
                        border-radius: 4px;
                        border: 1px solid #2a2a3a;
                    }

                    .adsr-values {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 8px;
                        text-align: center;
                    }

                    .adsr-value {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }

                    .adsr-value .label {
                        font-size: 11px;
                        text-transform: uppercase;
                        color: #888;
                    }

                    .adsr-value .value {
                        font-size: 14px;
                        font-weight: 500;
                        color: #00d4ff;
                    }

                    .gain-control {
                        align-self: flex-start;
                    }

                    .slider-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 12px;
                    }

                    .slider-grid label {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }

                    .slider-grid label span {
                        font-size: 12px;
                        color: #888;
                    }

                    .slider-grid input[type="range"] {
                        width: 100%;
                        height: 8px;
                        border-radius: 4px;
                        background: #3a3a4a;
                        outline: none;
                        -webkit-appearance: none;
                        appearance: none;
                    }

                    .slider-grid input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: #0088ff;
                        cursor: pointer;
                        border: 2px solid #ffffff;
                    }

                    .slider-grid input[type="range"]::-moz-range-thumb {
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: #0088ff;
                        cursor: pointer;
                        border: 2px solid #ffffff;
                    }

                    .octave-buttons {
                        display: flex;
                        gap: 8px;
                    }

                    .octave-btn {
                        width: 40px;
                        height: 40px;
                        border: 2px solid #ddd;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.1s;
                    }

                    .octave-btn.active {
                        border-color: #0066ff;
                        background: #0066ff;
                        color: white;
                    }

                    .piano-container {
                        margin-top: 20px;
                    }

                    .piano-keyboard {
                        display: flex;
                        position: relative;
                        height: 180px;
                        background: #333;
                        padding: 10px;
                        border-radius: 8px;
                        overflow-x: auto;
                    }

                    .piano-key {
                        position: relative;
                        border: none;
                        cursor: pointer;
                        transition: all 0.05s;
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        padding-bottom: 10px;
                    }

                    .piano-key.white {
                        width: 50px;
                        height: 160px;
                        background: linear-gradient(to bottom, #f8f8f8 0%, #fff 100%);
                        border-radius: 0 0 6px 6px;
                        box-shadow: 0 2px 0 #bbb, inset 0 -1px 0 #ddd;
                        z-index: 1;
                        margin-right: 2px;
                    }

                    .piano-key.white:active, .piano-key.white.active {
                        background: linear-gradient(to bottom, #e8e8e8 0%, #f5f5f5 100%);
                        box-shadow: 0 1px 0 #aaa, inset 0 -1px 0 #ccc;
                        transform: translateY(2px);
                    }

                    .piano-key.white .key-label {
                        font-size: 10px;
                        color: #666;
                    }

                    .piano-key.black {
                        position: absolute;
                        width: 32px;
                        height: 100px;
                        background: linear-gradient(to bottom, #333 0%, #111 100%);
                        border-radius: 0 0 4px 4px;
                        box-shadow: 0 2px 0 #000;
                        z-index: 2;
                        margin-left: -18px;
                    }

                    .piano-key.black:active, .piano-key.black.active {
                        background: linear-gradient(to bottom, #444 0%, #222 100%);
                        box-shadow: 0 1px 0 #000;
                        transform: translateY(2px);
                    }

                    .piano-key.black .key-label {
                        font-size: 8px;
                        color: #888;
                    }

                    .key-info {
                        margin-top: 20px;
                        padding: 15px;
                        background: #1a1a2e;
                        border-radius: 8px;
                        font-size: 14px;
                        color: #e0e0e0;
                    }

                    .key-info strong {
                        color: #fff;
                    }

                    .key-info code {
                        background: #2d2d44;
                        color: #7dd3fc;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-family: monospace;
                    }
                `}</style>

                <h1>🎹 Notes Demo</h1>
                <p className="subtitle">Interactive piano keyboard with note conversion</p>

                <div className="controls-row">
                    <WaveformSelector value={waveform} onChange={setWaveform} />

                    <div className="octave-selector">
                        <h3>Start Octave</h3>
                        <select
                            value={startOctave}
                            onChange={(e) => setStartOctave(Number(e.target.value))}
                            className="control-select"
                            aria-label="Select start octave"
                        >
                            {[1, 2, 3, 4, 5].map(oct => (
                                <option key={oct} value={oct}>Octave {oct}</option>
                            ))}
                        </select>
                    </div>

                    <NoteConverter />
                </div>

                <div className="controls-row envelope-row">
                    <div className="adsr-controls">
                        <h3>ADSR Envelope</h3>
                        <ADSRCurveEditor adsr={adsr} onChange={updateAdsr} />
                    </div>

                    <div className="gain-control">
                        <h3>Volume</h3>
                        <div className="slider-grid">
                            <label>
                                <span>Gain: {(gain * 100).toFixed(0)}%</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={gain}
                                    onChange={(e) => setGain(Number(e.target.value))}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <Piano startOctave={startOctave} octaves={2} waveform={waveform} adsr={adsr} gain={gain} />

                <div className="key-info">
                    <strong>How to use:</strong> Click or tap on piano keys to play notes.
                    The <code>noteToFreq()</code> function converts note strings like <code>"C4"</code>, <code>"Do3"</code>, or <code>"Sol#2"</code> to frequencies.
                </div>
            </div>
        </AudioProvider>
    );
};

export default NotesDemo;
