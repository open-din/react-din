import { useState, useCallback, useRef, type FC } from 'react';
import {
    AudioProvider,
    useAudio,
    Sequencer,
    Track,
    Gain,
    Filter,
    NoiseBurst,
    Synth,
    MonoSynth,
    DrumSynth,
    noteToFreq,
} from '@din/react';

/**
 * Sequencer Demo - Acid House Banger
 *
 * Demonstrates:
 * - 128-step sequencer (16 steps × 8 pages) with groovy patterns
 * - TR-909 style drum synthesis with punchy kicks
 * - TB-303 style acid synth with squelchy filter
 * - Dedicated bass synth for deep sub-bass
 * - XY Arpeggiator pad for live performance
 * - Interactive pattern editing with page navigation
 */

// ============================================================================
// Constants
// ============================================================================

const STEPS_PER_PAGE = 16;
const TOTAL_PAGES = 8;
const TOTAL_STEPS = STEPS_PER_PAGE * TOTAL_PAGES; // 128 steps

// ============================================================================
// Types
// ============================================================================

type Pattern = (0 | 1)[];

interface DrumPattern {
    kick: Pattern;
    hihat: Pattern;
    openhat: Pattern;
    clap: Pattern;
    perc: Pattern;
}

interface BassPattern {
    steps: Pattern;
    notes: string[];  // Note strings like 'C2', 'D2', etc.
}

interface AcidPattern {
    steps: Pattern;
    notes: string[];  // Note strings like 'C3', 'G3', etc.
    accents: Pattern;
    slides: Pattern;
}

// ============================================================================
// Helper to create 128-step patterns
// ============================================================================

function createPattern(pagePatterns: Pattern[]): Pattern {
    const result: Pattern = [];
    for (let page = 0; page < TOTAL_PAGES; page++) {
        const pattern = pagePatterns[page % pagePatterns.length];
        for (let step = 0; step < STEPS_PER_PAGE; step++) {
            result.push(pattern[step % pattern.length]);
        }
    }
    return result;
}

// Base patterns (16 steps each)
const KICK_BASE: Pattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const KICK_VAR4: Pattern = [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0]; // Syncopated variation
const KICK_VAR8: Pattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1]; // Fill with extra hits

const HIHAT_BASE: Pattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
const HIHAT_VAR4: Pattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]; // Busy 16ths
const HIHAT_VAR8: Pattern = [0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1]; // Syncopated

const OPENHAT_BASE: Pattern = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1];
const OPENHAT_VAR4: Pattern = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]; // Extra open hats
const OPENHAT_VAR8: Pattern = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1]; // Build-up

const CLAP_BASE: Pattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
const CLAP_VAR4: Pattern = [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0]; // Extra snares
const CLAP_VAR8: Pattern = [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1]; // Roll ending

const PERC_BASE: Pattern = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0];
const PERC_VAR4: Pattern = [0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1]; // Busy congas
const PERC_VAR8: Pattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1]; // Build-up fill

// 128-step patterns with variations on pages 4 and 8
const DEFAULT_DRUM_PATTERN: DrumPattern = {
    kick: createPattern([KICK_BASE, KICK_BASE, KICK_BASE, KICK_VAR4, KICK_BASE, KICK_BASE, KICK_BASE, KICK_VAR8]),
    hihat: createPattern([HIHAT_BASE, HIHAT_BASE, HIHAT_BASE, HIHAT_VAR4, HIHAT_BASE, HIHAT_BASE, HIHAT_BASE, HIHAT_VAR8]),
    openhat: createPattern([OPENHAT_BASE, OPENHAT_BASE, OPENHAT_BASE, OPENHAT_VAR4, OPENHAT_BASE, OPENHAT_BASE, OPENHAT_BASE, OPENHAT_VAR8]),
    clap: createPattern([CLAP_BASE, CLAP_BASE, CLAP_BASE, CLAP_VAR4, CLAP_BASE, CLAP_BASE, CLAP_BASE, CLAP_VAR8]),
    perc: createPattern([PERC_BASE, PERC_BASE, PERC_BASE, PERC_VAR4, PERC_BASE, PERC_BASE, PERC_BASE, PERC_VAR8]),
};

// Bass patterns (16 steps each)
const BASS_BASE: Pattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
const BASS_VAR4: Pattern = [1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0];
const BASS_VAR8: Pattern = [1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1];

// Bass notes using note strings - Funkier bassline with octave jumps
const BASS_NOTES_BASE = ['C2', 'C3', 'C2', 'Eb2', 'C2', 'G2', 'F2', 'C3', 'C2', 'Eb2', 'D2', 'C3', 'C2', 'G2', 'F2', 'Eb2'];
const BASS_NOTES_VAR4 = ['C2', 'G2', 'C3', 'Eb2', 'C2', 'F2', 'D2', 'C3', 'G2', 'Eb2', 'C2', 'G2', 'F2', 'C3', 'Eb2', 'D2'];
const BASS_NOTES_VAR8 = ['C2', 'C3', 'G2', 'C3', 'F2', 'C3', 'Eb2', 'G2', 'C2', 'C3', 'G2', 'Eb2', 'C3', 'F2', 'G2', 'C3'];

function createBassNotes(): string[] {
    const notePatterns = [BASS_NOTES_BASE, BASS_NOTES_BASE, BASS_NOTES_BASE, BASS_NOTES_VAR4,
        BASS_NOTES_BASE, BASS_NOTES_BASE, BASS_NOTES_BASE, BASS_NOTES_VAR8];
    const result: string[] = [];
    for (let page = 0; page < TOTAL_PAGES; page++) {
        result.push(...notePatterns[page]);
    }
    return result;
}

const DEFAULT_BASS_PATTERN: BassPattern = {
    steps: createPattern([BASS_BASE, BASS_BASE, BASS_BASE, BASS_VAR4, BASS_BASE, BASS_BASE, BASS_BASE, BASS_VAR8]),
    notes: createBassNotes(),
};

// Acid patterns (16 steps each)
const ACID_BASE: Pattern = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1];
const ACID_VAR4: Pattern = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0];
const ACID_VAR8: Pattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1];

// Acid notes - Wilder melodic range for more fun
const ACID_NOTES_BASE = ['C3', 'G3', 'C4', 'Eb4', 'C4', 'G4', 'C5', 'Bb4', 'G4', 'Eb4', 'C4', 'G3', 'C4', 'Eb4', 'G4', 'C5'];
const ACID_NOTES_VAR4 = ['C4', 'Eb4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4', 'Eb4', 'C4', 'Eb4', 'G4', 'C5', 'Eb5', 'C5', 'G4', 'Eb4'];
const ACID_NOTES_VAR8 = ['C3', 'C4', 'C5', 'C4', 'G4', 'C5', 'Eb5', 'C5', 'G4', 'Bb4', 'G4', 'Eb4', 'G4', 'C5', 'Eb5', 'G5'];

const ACCENT_BASE: Pattern = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1];
const ACCENT_VAR4: Pattern = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0];
const ACCENT_VAR8: Pattern = [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1];

const SLIDE_BASE: Pattern = [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0];
const SLIDE_VAR4: Pattern = [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
const SLIDE_VAR8: Pattern = [0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];

function createAcidNotes(): string[] {
    const notePatterns = [ACID_NOTES_BASE, ACID_NOTES_BASE, ACID_NOTES_BASE, ACID_NOTES_VAR4,
        ACID_NOTES_BASE, ACID_NOTES_BASE, ACID_NOTES_BASE, ACID_NOTES_VAR8];
    const result: string[] = [];
    for (let page = 0; page < TOTAL_PAGES; page++) {
        result.push(...notePatterns[page]);
    }
    return result;
}

const DEFAULT_ACID_PATTERN: AcidPattern = {
    steps: createPattern([ACID_BASE, ACID_BASE, ACID_BASE, ACID_VAR4, ACID_BASE, ACID_BASE, ACID_BASE, ACID_VAR8]),
    notes: createAcidNotes(),
    accents: createPattern([ACCENT_BASE, ACCENT_BASE, ACCENT_BASE, ACCENT_VAR4, ACCENT_BASE, ACCENT_BASE, ACCENT_BASE, ACCENT_VAR8]),
    slides: createPattern([SLIDE_BASE, SLIDE_BASE, SLIDE_BASE, SLIDE_VAR4, SLIDE_BASE, SLIDE_BASE, SLIDE_BASE, SLIDE_VAR8]),
};

// Helper to convert note (string or number) to frequency
function toFreq(note: number | string): number {
    return typeof note === 'number' ? 440 * Math.pow(2, (note - 69) / 12) : noteToFreq(note);
}

// ============================================================================
// Main Demo Component
// ============================================================================

export function SequencerDemo() {
    return (
        <div className="demo sequencer-demo">
            <h1>🔊 Acid House Banger</h1>
            <p>128-step sequencer (16×8 pages) with TR-909 drums, sub-bass, TB-303 acid & XY arpeggiator</p>

            <AudioProvider masterGain={0.7} createOnUserGesture debug>
                <SequencerDemoContent />
            </AudioProvider>
        </div>
    );
}

function SequencerDemoContent() {
    const { isUnlocked, context } = useAudio();

    // Sequencer settings - 132 BPM is classic acid house tempo
    const [bpm, setBpm] = useState(132);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Page navigation (0-7 for 8 pages)
    const [currentPage, setCurrentPage] = useState(0);

    // Drum patterns (mutable)
    const [drumPattern, setDrumPattern] = useState<DrumPattern>(DEFAULT_DRUM_PATTERN);
    const [drumMutes, setDrumMutes] = useState({ kick: false, hihat: false, openhat: false, clap: false, perc: false });

    // Bass synth pattern
    const [bassPattern, setBassPattern] = useState<BassPattern>(DEFAULT_BASS_PATTERN);
    const [bassMute, setBassMute] = useState(false);

    // Acid synth patterns and params
    const [acidPattern, setAcidPattern] = useState<AcidPattern>(DEFAULT_ACID_PATTERN);
    const [acidMute, setAcidMute] = useState(false);
    const [cutoff, setCutoff] = useState(600);
    const [resonance, setResonance] = useState(15);
    const [envAmount, setEnvAmount] = useState(3000);

    // XY Arpeggiator state
    const [arpActive, setArpActive] = useState(false);
    const [arpX, setArpX] = useState(0.5);
    const [arpY, setArpY] = useState(0.5);
    const arpOscRef = useRef<OscillatorNode | null>(null);
    const arpGainRef = useRef<GainNode | null>(null);
    const arpFilterRef = useRef<BiquadFilterNode | null>(null);

    // Helper to get slice for current page
    const getPageSlice = useCallback(<T,>(arr: T[]): T[] => {
        const start = currentPage * STEPS_PER_PAGE;
        const end = start + STEPS_PER_PAGE;
        return arr.slice(start, end);
    }, [currentPage]);

    // Get current step within page
    const stepInPage = currentStep % STEPS_PER_PAGE;
    const playingPage = Math.floor(currentStep / STEPS_PER_PAGE);

    // Toggle step handler (global step index)
    const toggleDrumStep = useCallback((track: keyof DrumPattern, pageStep: number) => {
        const globalStep = currentPage * STEPS_PER_PAGE + pageStep;
        setDrumPattern(prev => ({
            ...prev,
            [track]: prev[track].map((v, i) => i === globalStep ? (v ? 0 : 1) as 0 | 1 : v),
        }));
    }, [currentPage]);

    const toggleBassStep = useCallback((pageStep: number) => {
        const globalStep = currentPage * STEPS_PER_PAGE + pageStep;
        setBassPattern(prev => ({
            ...prev,
            steps: prev.steps.map((v, i) => i === globalStep ? (v ? 0 : 1) as 0 | 1 : v),
        }));
    }, [currentPage]);

    const toggleAcidStep = useCallback((pageStep: number) => {
        const globalStep = currentPage * STEPS_PER_PAGE + pageStep;
        setAcidPattern(prev => ({
            ...prev,
            steps: prev.steps.map((v, i) => i === globalStep ? (v ? 0 : 1) as 0 | 1 : v),
        }));
    }, [currentPage]);

    const toggleAcidAccent = useCallback((pageStep: number) => {
        const globalStep = currentPage * STEPS_PER_PAGE + pageStep;
        setAcidPattern(prev => ({
            ...prev,
            accents: prev.accents.map((v, i) => i === globalStep ? (v ? 0 : 1) as 0 | 1 : v),
        }));
    }, [currentPage]);

    // Step callback
    const onStep = useCallback((step: number) => {
        setCurrentStep(step);
    }, []);

    // XY Arpeggiator handlers
    const handleArpStart = useCallback((x: number, y: number) => {
        if (!context || !isUnlocked) return;

        setArpActive(true);
        setArpX(x);
        setArpY(y);

        // Create oscillator
        const osc = context.createOscillator();
        osc.type = 'sawtooth';

        // Create filter
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 12;

        // Create gain
        const gain = context.createGain();
        gain.gain.value = 0;

        // Connect
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);

        osc.start();
        gain.gain.linearRampToValueAtTime(0.25, context.currentTime + 0.05);

        arpOscRef.current = osc;
        arpGainRef.current = gain;
        arpFilterRef.current = filter;

        // Set initial values
        updateArpParams(x, y);
    }, [context, isUnlocked]);

    const updateArpParams = useCallback((x: number, y: number) => {
        if (!arpOscRef.current || !arpFilterRef.current || !context) return;

        // X controls note (C2 to C5 = MIDI 36 to 84)
        const midiNote = 36 + Math.floor(x * 48);
        const freq = toFreq(midiNote);
        arpOscRef.current.frequency.setTargetAtTime(freq, context.currentTime, 0.02);

        // Y controls filter cutoff (100Hz to 8000Hz)
        const filterFreq = 100 + y * 7900;
        arpFilterRef.current.frequency.setTargetAtTime(filterFreq, context.currentTime, 0.02);
    }, [context]);

    const handleArpMove = useCallback((x: number, y: number) => {
        setArpX(x);
        setArpY(y);
        updateArpParams(x, y);
    }, [updateArpParams]);

    const handleArpEnd = useCallback(() => {
        setArpActive(false);

        if (arpGainRef.current && context) {
            arpGainRef.current.gain.linearRampToValueAtTime(0, context.currentTime + 0.1);
        }

        setTimeout(() => {
            if (arpOscRef.current) {
                arpOscRef.current.stop();
                arpOscRef.current.disconnect();
                arpOscRef.current = null;
            }
            if (arpFilterRef.current) {
                arpFilterRef.current.disconnect();
                arpFilterRef.current = null;
            }
            if (arpGainRef.current) {
                arpGainRef.current.disconnect();
                arpGainRef.current = null;
            }
        }, 150);
    }, [context]);

    // Calculate display step (only show if current playing page matches viewed page)
    const displayStep = (isPlaying && playingPage === currentPage) ? stepInPage : -1;

    return (
        <>
            {/* Status & Transport */}
            <div className="demo-section status-section">
                <div className="controls top-controls">
                    <div className="status">
                        <span className={`status-dot ${isUnlocked ? 'active' : 'inactive'}`} />
                        {isUnlocked ? 'Audio Ready' : 'Click to unlock audio'}
                    </div>

                    <button
                        className={isPlaying ? 'danger' : 'primary'}
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={!isUnlocked}
                    >
                        {isPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>

                    <div className="control-group">
                        <label htmlFor="bpm-slider">BPM: {bpm}</label>
                        <input
                            id="bpm-slider"
                            type="range"
                            min="60"
                            max="180"
                            value={bpm}
                            onChange={(e) => setBpm(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Main Instrument Grid */}
            <div className="sequencer-layout">
                <div className="demo-section">
                    <h2>🥁 TR-909 Drums</h2>
                    <div className="sequencer-grid">
                        <DrumRow label="KICK" pattern={getPageSlice(drumPattern.kick)} currentStep={displayStep} isPlaying={isPlaying} muted={drumMutes.kick} onToggle={(s) => toggleDrumStep('kick', s)} onMuteToggle={() => setDrumMutes(m => ({ ...m, kick: !m.kick }))} color="#FF5722" />
                        <DrumRow label="HI-HAT" pattern={getPageSlice(drumPattern.hihat)} currentStep={displayStep} isPlaying={isPlaying} muted={drumMutes.hihat} onToggle={(s) => toggleDrumStep('hihat', s)} onMuteToggle={() => setDrumMutes(m => ({ ...m, hihat: !m.hihat }))} color="#FFC107" />
                        <DrumRow label="OPEN" pattern={getPageSlice(drumPattern.openhat)} currentStep={displayStep} isPlaying={isPlaying} muted={drumMutes.openhat} onToggle={(s) => toggleDrumStep('openhat', s)} onMuteToggle={() => setDrumMutes(m => ({ ...m, openhat: !m.openhat }))} color="#FFEB3B" />
                        <DrumRow label="CLAP" pattern={getPageSlice(drumPattern.clap)} currentStep={displayStep} isPlaying={isPlaying} muted={drumMutes.clap} onToggle={(s) => toggleDrumStep('clap', s)} onMuteToggle={() => setDrumMutes(m => ({ ...m, clap: !m.clap }))} color="#E91E63" />
                        <DrumRow label="PERC" pattern={getPageSlice(drumPattern.perc)} currentStep={displayStep} isPlaying={isPlaying} muted={drumMutes.perc} onToggle={(s) => toggleDrumStep('perc', s)} onMuteToggle={() => setDrumMutes(m => ({ ...m, perc: !m.perc }))} color="#9C27B0" />
                    </div>
                </div>

                <div className="demo-section">
                    <h2>🎸 Sub Bass</h2>
                    <div className="sequencer-grid bass-grid">
                        <BassRow
                            pattern={{
                                steps: getPageSlice(bassPattern.steps),
                                notes: getPageSlice(bassPattern.notes)
                            }}
                            currentStep={displayStep}
                            isPlaying={isPlaying}
                            muted={bassMute}
                            onToggle={toggleBassStep}
                            onMuteToggle={() => setBassMute(!bassMute)}
                        />
                    </div>
                </div>

                <div className="demo-section">
                    <h2>🧪 TB-303 Acid</h2>
                    <div className="acid-section-content">
                        <div className="acid-controls-wrapper">
                            <div className="acid-controls">
                                <div className="control-group">
                                    <label>Cutoff</label>
                                    <input type="range" min="100" max="4000" value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} />
                                </div>
                                <div className="control-group">
                                    <label>Res</label>
                                    <input type="range" min="1" max="30" value={resonance} onChange={(e) => setResonance(Number(e.target.value))} />
                                </div>
                                <div className="control-group">
                                    <label>Env</label>
                                    <input type="range" min="0" max="6000" value={envAmount} onChange={(e) => setEnvAmount(Number(e.target.value))} />
                                </div>
                                <button className={`acid-mute-btn ${acidMute ? 'secondary' : 'primary'}`} onClick={() => setAcidMute(!acidMute)}>
                                    {acidMute ? '🔇' : '🔊'}
                                </button>
                            </div>

                            <div className="arp-container">
                                <XYPad
                                    x={arpX}
                                    y={arpY}
                                    active={arpActive}
                                    onStart={handleArpStart}
                                    onMove={handleArpMove}
                                    onEnd={handleArpEnd}
                                />
                            </div>
                        </div>

                        <div className="sequencer-grid acid-grid">
                            <AcidRow
                                pattern={{
                                    steps: getPageSlice(acidPattern.steps),
                                    notes: getPageSlice(acidPattern.notes),
                                    accents: getPageSlice(acidPattern.accents),
                                    slides: getPageSlice(acidPattern.slides)
                                }}
                                currentStep={displayStep}
                                isPlaying={isPlaying}
                                muted={acidMute}
                                onToggle={toggleAcidStep}
                                onAccentToggle={toggleAcidAccent}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pagination Bar */}
            <div className="pagination-bar">
                <div className="pagination-label">PATTERN PAGE</div>
                <div className="pagination-buttons">
                    {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                        <button
                            key={i}
                            className={`page-btn ${currentPage === i ? 'active' : ''} ${isPlaying && playingPage === i ? 'playing' : ''}`}
                            onClick={() => setCurrentPage(i)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
                <div className="pagination-info">
                    {isPlaying ? `Playing Page ${playingPage + 1} / 8` : 'Stopped'}
                </div>
            </div>

            {/* Audio Graph */}
            {isPlaying && isUnlocked && (
                <Sequencer
                    bpm={bpm}
                    steps={TOTAL_STEPS}
                    autoStart
                    loop
                    onStep={onStep}
                >
                    <Track id="kick" pattern={drumPattern.kick} mute={drumMutes.kick}><Kick909 /></Track>
                    <Track id="hihat" pattern={drumPattern.hihat} mute={drumMutes.hihat}><ClosedHiHat /></Track>
                    <Track id="openhat" pattern={drumPattern.openhat} mute={drumMutes.openhat}><OpenHiHat /></Track>
                    <Track id="clap" pattern={drumPattern.clap} mute={drumMutes.clap}><Clap909 /></Track>
                    <Track id="perc" pattern={drumPattern.perc} mute={drumMutes.perc}><Percussion /></Track>

                    <Track id="bass" pattern={bassPattern.steps} mute={bassMute}>
                        <Synth
                            notes={bassPattern.notes}
                            oscillator={{ type: 'triangle', detune: 5 }}
                            envelope={{ attack: 0.005, decay: 0.15, sustain: 0.6, release: 0.08 }}
                            filter={{ type: 'lowpass', frequency: 350, Q: 2, envelope: 200 }}
                            volume={0.7}
                        />
                    </Track>

                    <Track id="acid" pattern={acidPattern.steps} mute={acidMute}>
                        <MonoSynth
                            notes={acidPattern.notes}
                            accents={acidPattern.accents}
                            oscillator={{ type: 'sawtooth', detune: 8 }}
                            envelope={{ attack: 0.001, decay: 0.08, sustain: 0.4, release: 0.05 }}
                            filter={{
                                type: 'lowpass',
                                frequency: cutoff,
                                Q: resonance * 1.5,
                                envelope: envAmount * 1.5
                            }}
                            volume={0.55}
                        />
                    </Track>
                </Sequencer>
            )}
        </>
    );
}

// ============================================================================
// XY Pad Component
// ============================================================================

interface XYPadProps {
    x: number;
    y: number;
    active: boolean;
    onStart: (x: number, y: number) => void;
    onMove: (x: number, y: number) => void;
    onEnd: () => void;
}

const XYPad: FC<XYPadProps> = ({ x, y, active, onStart, onMove, onEnd }) => {
    const ref = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!ref.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = ref.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        onStart(newX, newY);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!active || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        onMove(newX, newY);
    };

    return (
        <div
            ref={ref}
            className={`xy-pad ${active ? 'active' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={onEnd}
            onPointerLeave={onEnd}
        >
            <div
                className="xy-cursor"
                style={{
                    left: `${x * 100}%`,
                    bottom: `${y * 100}%`
                }}
            />
            <div className="xy-label">ARPEGGIATOR</div>
        </div>
    );
};

// ============================================================================
// Drum Row Component
// ============================================================================

interface DrumRowProps {
    label: string;
    pattern: Pattern;
    currentStep: number;
    isPlaying: boolean;
    muted: boolean;
    onToggle: (step: number) => void;
    onMuteToggle: () => void;
    color: string;
}

const DrumRow: FC<DrumRowProps> = ({
    label,
    pattern,
    currentStep,
    isPlaying,
    muted,
    onToggle,
    onMuteToggle,
    color,
}) => {
    return (
        <div className={`sequencer-row ${muted ? 'muted' : ''}`}>
            <div className="row-controls">
                <span className="row-label" style={{ color }}>{label}</span>
                <button
                    className={`mute-btn ${muted ? 'active' : ''}`}
                    onClick={onMuteToggle}
                    aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`}
                >
                    {muted ? 'M' : '○'}
                </button>
            </div>
            <div className="step-buttons">
                {pattern.map((value, i) => (
                    <button
                        key={i}
                        className={`step-btn ${value ? 'on' : ''} ${isPlaying && currentStep === i ? 'current' : ''} ${i % 4 === 0 ? 'beat-start' : ''}`}
                        onClick={() => onToggle(i)}
                        aria-label={`${label} step ${i + 1} ${value ? 'on' : 'off'}`}
                        style={{
                            '--step-color': color,
                        } as React.CSSProperties}
                    />
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// Acid Row Component
// ============================================================================

interface AcidRowProps {
    pattern: AcidPattern;
    currentStep: number;
    isPlaying: boolean;
    muted: boolean;
    onToggle: (step: number) => void;
    onAccentToggle: (step: number) => void;
}

const AcidRow: FC<AcidRowProps> = ({
    pattern,
    currentStep,
    isPlaying,
    muted,
    onToggle,
    onAccentToggle,
}) => {
    return (
        <div className={`sequencer-row acid-row ${muted ? 'muted' : ''}`}>
            <div className="row-controls">
                <span className="row-label acid-label">ACID</span>
            </div>
            <div className="step-buttons">
                {pattern.steps.map((value, i) => (
                    <div key={i} className="acid-step-container">
                        <button
                            className={`step-btn acid ${value ? 'on' : ''} ${pattern.accents[i] ? 'accent' : ''} ${isPlaying && currentStep === i ? 'current' : ''} ${i % 4 === 0 ? 'beat-start' : ''}`}
                            onClick={() => onToggle(i)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                onAccentToggle(i);
                            }}
                            aria-label={`Acid step ${i + 1} ${value ? 'on' : 'off'} ${pattern.accents[i] ? 'accented' : ''}`}
                        />
                        {value === 1 && (
                            <span className="note-indicator">{pattern.notes[i].replace(/[0-9]/g, '')}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// Bass Row Component
// ============================================================================

interface BassRowProps {
    pattern: BassPattern;
    currentStep: number;
    isPlaying: boolean;
    muted: boolean;
    onToggle: (step: number) => void;
    onMuteToggle: () => void;
}

const BassRow: FC<BassRowProps> = ({
    pattern,
    currentStep,
    isPlaying,
    muted,
    onToggle,
    onMuteToggle,
}) => {
    return (
        <div className={`sequencer-row bass-row ${muted ? 'muted' : ''}`}>
            <div className="row-controls">
                <span className="row-label bass-label">BASS</span>
                <button
                    className={`mute-btn ${muted ? 'active' : ''}`}
                    onClick={onMuteToggle}
                    aria-label={`${muted ? 'Unmute' : 'Mute'} bass`}
                >
                    {muted ? 'M' : '○'}
                </button>
            </div>
            <div className="step-buttons">
                {pattern.steps.map((value, i) => (
                    <div key={i} className="bass-step-container">
                        <button
                            className={`step-btn bass ${value ? 'on' : ''} ${isPlaying && currentStep === i ? 'current' : ''} ${i % 4 === 0 ? 'beat-start' : ''}`}
                            onClick={() => onToggle(i)}
                            aria-label={`Bass step ${i + 1} ${value ? 'on' : 'off'}`}
                        />
                        {value === 1 && (
                            <span className="note-indicator">{pattern.notes[i].replace(/[0-9]/g, '')}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// TR-909 Style Drum Synth Components - Using DrumSynth
// ============================================================================

/**
 * Kick909 - Punchy 909-style kick with extra thump
 */
const Kick909: FC = () => (
    <DrumSynth
        oscillators={[
            // Main body - aggressive pitch sweep
            { type: 'sine', frequency: 220, pitchDecay: 40, pitchDecayTime: 0.06, gain: 1.0, duration: 0.3 },
            // Sub oscillator for massive low-end
            { type: 'sine', frequency: 50, gain: 0.8, duration: 0.35 },
            // Click transient - snappy attack
            { type: 'triangle', frequency: 5000, pitchDecay: 80, pitchDecayTime: 0.008, gain: 0.4, duration: 0.015 },
        ]}
        envelope={{ attack: 0.001, decay: 0.3, sustain: 0, release: 0.08 }}
        volume={0.85}
        saturation
        saturationAmount={2.5}
    />
);

/**
 * ClosedHiHat - Crispy and bright
 */
const ClosedHiHat: FC = () => (
    <Gain gain={0.22}>
        <Filter type="highpass" frequency={8000} Q={1}>
            <Filter type="bandpass" frequency={14000} Q={2.5}>
                <NoiseBurst type="white" duration={0.04} attack={0.0005} release={0.015} />
            </Filter>
        </Filter>
    </Gain>
);

/**
 * OpenHiHat - Long sizzle with shimmer
 */
const OpenHiHat: FC = () => (
    <Gain gain={0.18}>
        <Filter type="highpass" frequency={6000} Q={0.8}>
            <Filter type="bandpass" frequency={11000} Q={1.8}>
                <NoiseBurst type="white" duration={0.3} attack={0.0005} release={0.25} />
            </Filter>
        </Filter>
    </Gain>
);

/**
 * Clap909 - Fat clap with more body
 */
const Clap909: FC = () => (
    <DrumSynth
        oscillators={[
            // Add a bit of tone for body
            { type: 'sine', frequency: 200, pitchDecay: 100, pitchDecayTime: 0.01, gain: 0.15, duration: 0.03 },
        ]}
        noise={[
            // Multiple bursts for that classic 909 flutter
            { type: 'white', filterType: 'bandpass', filterFrequency: 1400, filterQ: 3, gain: 0.2, duration: 0.015 },
            { type: 'white', filterType: 'bandpass', filterFrequency: 1200, filterQ: 2.5, gain: 0.15, duration: 0.02 },
            { type: 'white', filterType: 'bandpass', filterFrequency: 1100, filterQ: 2, gain: 0.3, duration: 0.15 },
        ]}
        envelope={{ attack: 0.0005, decay: 0.15, sustain: 0, release: 0.04 }}
        volume={0.55}
        saturation
        saturationAmount={1.5}
    />
);

/**
 * Percussion - Funky conga/rimshot hybrid
 */
const Percussion: FC = () => (
    <DrumSynth
        oscillators={[
            // Tone body - more resonant
            { type: 'triangle', frequency: 600, pitchDecay: 150, pitchDecayTime: 0.04, gain: 0.45, duration: 0.12 },
            // Add harmonic layer
            { type: 'sine', frequency: 1200, pitchDecay: 300, pitchDecayTime: 0.02, gain: 0.2, duration: 0.06 },
        ]}
        noise={[
            // Brighter attack
            { type: 'white', filterType: 'highpass', filterFrequency: 3000, filterQ: 1.5, gain: 0.35, duration: 0.025 },
        ]}
        envelope={{ attack: 0.001, decay: 0.12, sustain: 0, release: 0.04 }}
        volume={0.55}
    />
);
