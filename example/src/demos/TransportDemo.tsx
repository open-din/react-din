import { useState, useCallback } from 'react';
import {
    AudioProvider,
    useAudio,
    TransportProvider,
    useTransport,
    Osc,
    Gain,
    Filter,
} from '@din/react';

/**
 * Transport Demo - Musical Timing and Playback Control
 *
 * Demonstrates:
 * - TransportProvider for tempo and timing
 * - useTransport hook for playback control
 * - Step, beat, bar, and phrase callbacks
 * - Tempo (BPM) adjustment
 * - Time signature configuration
 */
export function TransportDemo() {
    return (
        <div className="demo">
            <h1>Transport Demo</h1>
            <p>Musical timing: BPM, time signatures, step/beat/bar callbacks</p>

            <AudioProvider masterGain={0.5} createOnUserGesture debug>
                <TransportDemoContent />
            </AudioProvider>
        </div>
    );
}

function TransportDemoContent() {
    const { isUnlocked } = useAudio();

    // Transport configuration
    const [bpm, setBpm] = useState(120);
    const [beatsPerBar, setBeatsPerBar] = useState(4);
    const [stepsPerBeat, setStepsPerBeat] = useState(4);
    const [barsPerPhrase, setBarsPerPhrase] = useState(4);

    // Event log
    const [eventLog, setEventLog] = useState<string[]>([]);
    const addEvent = useCallback((event: string) => {
        setEventLog((prev) => [event, ...prev.slice(0, 9)]);
    }, []);

    // Callbacks
    const onStep = useCallback((step: number, _time: number) => {
        addEvent(`Step: ${step}`);
    }, [addEvent]);

    const onBeat = useCallback((beat: number, _time: number) => {
        addEvent(`🥁 Beat: ${beat}`);
    }, [addEvent]);

    const onBar = useCallback((bar: number, _time: number) => {
        addEvent(`📍 Bar: ${bar}`);
    }, [addEvent]);

    const onPhrase = useCallback((phrase: number, _time: number) => {
        addEvent(`🎵 Phrase: ${phrase}`);
    }, [addEvent]);

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
                </div>
            </div>

            {/* Transport Configuration */}
            <div className="demo-section">
                <h2>⚙️ Transport Configuration</h2>
                <p className="node-description">Configure tempo and time signature before starting playback.</p>
                <div className="controls">
                    <div className="control-group">
                        <label>BPM: {bpm}</label>
                        <input
                            type="range"
                            min="40"
                            max="240"
                            value={bpm}
                            onChange={(e) => setBpm(Number(e.target.value))}
                        />
                    </div>

                    <div className="control-group">
                        <label>Beats per Bar: {beatsPerBar}</label>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            value={beatsPerBar}
                            onChange={(e) => setBeatsPerBar(Number(e.target.value))}
                        />
                    </div>

                    <div className="control-group">
                        <label>Steps per Beat: {stepsPerBeat}</label>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            value={stepsPerBeat}
                            onChange={(e) => setStepsPerBeat(Number(e.target.value))}
                        />
                    </div>

                    <div className="control-group">
                        <label>Bars per Phrase: {barsPerPhrase}</label>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            value={barsPerPhrase}
                            onChange={(e) => setBarsPerPhrase(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* TransportProvider wraps the playback controls */}
            <TransportProvider
                bpm={bpm}
                beatsPerBar={beatsPerBar}
                stepsPerBeat={stepsPerBeat}
                barsPerPhrase={barsPerPhrase}
                onStep={onStep}
                onBeat={onBeat}
                onBar={onBar}
                onPhrase={onPhrase}
            >
                <TransportControls eventLog={eventLog} />
            </TransportProvider>
        </>
    );
}

interface TransportControlsProps {
    eventLog: string[];
}

function TransportControls({ eventLog }: TransportControlsProps) {
    const transport = useTransport();
    const {
        isPlaying,
        pause,
        toggle,
        reset,
        bpm,
        setBpm,
        step,
        beat,
        bar,
        phrase,
        totalSteps,
        stepDuration,
        beatDuration,
        barDuration,
    } = transport;

    // Visual metronome state
    const [soundEnabled, setSoundEnabled] = useState(true);

    return (
        <>
            {/* Playback Controls */}
            <div className="demo-section">
                <h2>▶️ Playback Controls</h2>
                <p className="node-description">Control transport playback: play, pause, stop, toggle.</p>
                <div className="controls">
                    <button
                        className={isPlaying ? 'danger' : 'primary'}
                        onClick={toggle}
                    >
                        {isPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>
                    <button className="secondary" onClick={pause} disabled={!isPlaying}>
                        ⏸ Pause
                    </button>
                    <button className="secondary" onClick={reset}>
                        ⏮ Reset
                    </button>
                    <button
                        className={soundEnabled ? 'primary' : 'secondary'}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                    >
                        {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
                    </button>
                </div>
            </div>

            {/* Live Tempo Control */}
            <div className="demo-section">
                <h2>🎚️ Live Tempo</h2>
                <p className="node-description">Adjust tempo in real-time while playing.</p>
                <div className="controls">
                    <div className="control-group">
                        <label>BPM: {bpm}</label>
                        <input
                            type="range"
                            min="40"
                            max="240"
                            value={bpm}
                            onChange={(e) => setBpm(Number(e.target.value))}
                        />
                    </div>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Step Duration</span>
                            <code>{(stepDuration * 1000).toFixed(1)} ms</code>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Beat Duration</span>
                            <code>{(beatDuration * 1000).toFixed(0)} ms</code>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Bar Duration</span>
                            <code>{barDuration.toFixed(2)} s</code>
                        </div>
                    </div>
                </div>
            </div>

            {/* Position Display */}
            <div className="demo-section">
                <h2>📍 Current Position</h2>
                <p className="node-description">Real-time position tracking: step, beat, bar, phrase.</p>
                <div className="position-display">
                    <div className="position-item">
                        <span className="position-label">Phrase</span>
                        <span className="position-value">{phrase}</span>
                    </div>
                    <div className="position-item">
                        <span className="position-label">Bar</span>
                        <span className="position-value">{bar}</span>
                    </div>
                    <div className="position-item">
                        <span className="position-label">Beat</span>
                        <span className="position-value">{beat}</span>
                    </div>
                    <div className="position-item">
                        <span className="position-label">Step</span>
                        <span className="position-value">{step}</span>
                    </div>
                    <div className="position-item total">
                        <span className="position-label">Total Steps</span>
                        <span className="position-value">{totalSteps}</span>
                    </div>
                </div>
            </div>

            {/* Visual Metronome */}
            <div className="demo-section">
                <h2>🎹 Visual Metronome</h2>
                <p className="node-description">Visual beat indicator with optional click sound.</p>
                <div className="metronome-display">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className={`metronome-beat ${beat === i && isPlaying ? 'active' : ''} ${i === 0 ? 'downbeat' : ''}`}
                        />
                    ))}
                </div>
                <div className="step-display">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div
                            key={i}
                            className={`step-indicator ${step + beat * 4 === i && isPlaying ? 'active' : ''}`}
                        />
                    ))}
                </div>
            </div>

            {/* Event Log */}
            <div className="demo-section">
                <h2>📜 Event Log</h2>
                <p className="node-description">Transport callbacks: onStep, onBeat, onBar, onPhrase.</p>
                <div className="event-log">
                    {eventLog.length === 0 ? (
                        <div className="event-empty">Press Play to see events...</div>
                    ) : (
                        eventLog.map((event, i) => (
                            <div key={i} className="event-item" style={{ opacity: 1 - i * 0.08 }}>
                                {event}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Metronome Click Sound */}
            {isPlaying && soundEnabled && (
                <Gain gain={0.3}>
                    <Filter type="highpass" frequency={1000}>
                        <Osc
                            type="sine"
                            frequency={beat === 0 ? 880 : 660}
                            autoStart
                        />
                    </Filter>
                </Gain>
            )}
        </>
    );
}
