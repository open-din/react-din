// Example code snippets for the Editor

export interface Example {
  name: string;
  description: string;
  code: string;
}

export const examples: Example[] = [
  {
    name: 'Simple Oscillator',
    description: 'Basic sine wave oscillator with on/off control',
    code: `import React, { useState } from 'react';
import { AudioProvider, Osc, Gain } from './react-din';

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [frequency, setFrequency] = useState(440);

  return (
    <AudioProvider>
      <div style={{ padding: 20, fontFamily: 'system-ui' }}>
        <h2>🎵 Simple Oscillator</h2>
        
        <div style={{ marginBottom: 20 }}>
          <label>
            Frequency: {frequency} Hz
            <br />
            <input
              type="range"
              min="100"
              max="1000"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              style={{ width: 200 }}
            />
          </label>
        </div>

        <button 
          onClick={() => setPlaying(!playing)}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            background: playing ? '#ff4444' : '#44ff44',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          {playing ? '⏹️ Stop' : '▶️ Play'}
        </button>

        {playing && (
          <Gain gain={0.3}>
            <Osc frequency={frequency} type="sine" autoStart />
          </Gain>
        )}
      </div>
    </AudioProvider>
  );
}`
  },
  {
    name: 'ADSR Envelope',
    description: 'Oscillator with Attack-Decay-Sustain-Release envelope',
    code: `import React, { useState } from 'react';
import { AudioProvider, Osc, Gain, ADSR, noteToFreq } from './react-din';

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState('C4');
  const [adsr, setAdsr] = useState({
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 0.5
  });

  const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

  return (
    <AudioProvider>
      <div style={{ padding: 20, fontFamily: 'system-ui' }}>
        <h2>🎹 ADSR Envelope</h2>
        
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {notes.map(n => (
            <button
              key={n}
              onPointerDown={() => { setNote(n); setPlaying(true); }}
              onPointerUp={() => setPlaying(false)}
              onPointerLeave={() => setPlaying(false)}
              style={{
                padding: '20px 15px',
                background: note === n && playing ? '#0088ff' : '#333',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 400 }}>
          {Object.entries(adsr).map(([key, value]) => (
            <label key={key}>
              {key}: {value.toFixed(2)}s
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={value}
                onChange={(e) => setAdsr(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </label>
          ))}
        </div>

        <ADSR 
          trigger={playing} 
          attack={adsr.attack}
          decay={adsr.decay}
          sustain={adsr.sustain}
          release={adsr.release}
        >
          <Gain gain={0.4}>
            <Osc frequency={noteToFreq(note)} type="sawtooth" autoStart />
          </Gain>
        </ADSR>
      </div>
    </AudioProvider>
  );
}`
  },
  {
    name: 'Additive Synth',
    description: 'Build complex timbres by adding harmonic sine partials',
    code: `import React, { useState } from 'react';
import { AudioProvider, Osc, Gain, noteToFreq } from './react-din';

// Additive synthesis - combining harmonic sine waves
export default function App() {
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState('A3');
  const [harmonics, setHarmonics] = useState([
    { n: 1, amp: 1.0 },   // Fundamental
    { n: 2, amp: 0.5 },   // 2nd harmonic (octave)
    { n: 3, amp: 0.33 },  // 3rd harmonic (octave + fifth)
    { n: 4, amp: 0.25 },  // 4th harmonic (2 octaves)
    { n: 5, amp: 0.2 },   // 5th harmonic
    { n: 6, amp: 0.17 },  // 6th harmonic
    { n: 7, amp: 0.14 },  // 7th harmonic
    { n: 8, amp: 0.12 },  // 8th harmonic
  ]);

  const fundamental = noteToFreq(note);
  const notes = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];

  const updateHarmonic = (index, value) => {
    setHarmonics(prev => prev.map((h, i) => 
      i === index ? { ...h, amp: value } : h
    ));
  };

  // Preset: Sawtooth-like (all harmonics at 1/n amplitude)
  const presetSaw = () => {
    setHarmonics(prev => prev.map(h => ({ ...h, amp: 1 / h.n })));
  };

  // Preset: Square-like (odd harmonics only at 1/n)
  const presetSquare = () => {
    setHarmonics(prev => prev.map(h => ({ 
      ...h, 
      amp: h.n % 2 === 1 ? 1 / h.n : 0 
    })));
  };

  // Preset: Organ-like (selected harmonics)
  const presetOrgan = () => {
    setHarmonics([
      { n: 1, amp: 1.0 },
      { n: 2, amp: 0.8 },
      { n: 3, amp: 0.1 },
      { n: 4, amp: 0.5 },
      { n: 5, amp: 0.05 },
      { n: 6, amp: 0.3 },
      { n: 7, amp: 0.02 },
      { n: 8, amp: 0.2 },
    ]);
  };

  return (
    <AudioProvider>
      <div style={{ padding: 20, fontFamily: 'system-ui', background: '#0a0a15', color: '#fff', minHeight: '100vh' }}>
        <h2>🎛️ Additive Synthesizer</h2>
        <p style={{ color: '#888', marginBottom: 20 }}>
          Build timbres by mixing harmonic sine waves
        </p>

        {/* Note selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {notes.map(n => (
            <button
              key={n}
              onClick={() => setNote(n)}
              style={{
                padding: '8px 14px',
                background: note === n ? '#0088ff' : '#222',
                color: 'white',
                border: note === n ? '2px solid #00aaff' : '2px solid #333',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={presetSaw} style={{ padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            🪚 Sawtooth
          </button>
          <button onClick={presetSquare} style={{ padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            ⬜ Square
          </button>
          <button onClick={presetOrgan} style={{ padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            🎹 Organ
          </button>
        </div>

        {/* Harmonic sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 25, maxWidth: 500 }}>
          {harmonics.map((h, i) => (
            <div key={h.n} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                {h.n === 1 ? 'Fund.' : \`H\${h.n}\`}
              </div>
              <div style={{ fontSize: 12, color: '#0af', marginBottom: 4 }}>
                {(h.amp * 100).toFixed(0)}%
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={h.amp}
                onChange={(e) => updateHarmonic(i, Number(e.target.value))}
                style={{ width: '100%', writingMode: 'vertical-lr', height: 80 }}
              />
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                {(fundamental * h.n).toFixed(0)} Hz
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setPlaying(!playing)}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            background: playing 
              ? 'linear-gradient(135deg, #ff4444, #cc2222)' 
              : 'linear-gradient(135deg, #00cc66, #00aa55)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {playing ? '⏹️ Stop' : '▶️ Play'}
        </button>

        {/* Additive synthesis: render each harmonic as a sine oscillator */}
        {playing && harmonics.map(h => (
          h.amp > 0 && (
            <Gain key={h.n} gain={h.amp * 0.15}>
              <Osc frequency={fundamental * h.n} type="sine" autoStart />
            </Gain>
          )
        ))}
      </div>
    </AudioProvider>
  );
}`
  },
  {
    name: 'Drone Generator',
    description: 'Ambient drone with detuned oscillators',
    code: `import React, { useState } from 'react';
import { AudioProvider, Osc, Gain, noteToFreq } from './react-din';

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [baseNote, setBaseNote] = useState('A2');
  const [detune, setDetune] = useState(5);

  const notes = ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'];
  const freq = noteToFreq(baseNote);

  return (
    <AudioProvider>
      <div style={{ padding: 20, fontFamily: 'system-ui', background: '#111', color: '#fff', minHeight: '100vh' }}>
        <h2>🌌 Drone Generator</h2>
        
        <div style={{ marginBottom: 20 }}>
          <label>Base Note: </label>
          <select 
            value={baseNote} 
            onChange={(e) => setBaseNote(e.target.value)}
            style={{ padding: 8, fontSize: 16 }}
          >
            {notes.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label>
            Detune: {detune} cents
            <input
              type="range"
              min="1"
              max="20"
              value={detune}
              onChange={(e) => setDetune(Number(e.target.value))}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </label>
        </div>

        <button 
          onClick={() => setPlaying(!playing)}
          style={{
            padding: '15px 30px',
            fontSize: 18,
            background: playing ? 'linear-gradient(45deg, #ff0077, #ff8800)' : 'linear-gradient(45deg, #0077ff, #00ff88)',
            border: 'none',
            borderRadius: 12,
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {playing ? '⏹️ Stop Drone' : '▶️ Start Drone'}
        </button>

        {playing && (
          <>
            {/* Layer 1 - Base */}
            <Gain gain={0.1}>
              <Osc frequency={freq} type="sine" autoStart />
            </Gain>
            {/* Layer 2 - Detuned up */}
            <Gain gain={0.08}>
              <Osc frequency={freq * Math.pow(2, detune/1200)} type="sine" autoStart />
            </Gain>
            {/* Layer 3 - Detuned down */}
            <Gain gain={0.08}>
              <Osc frequency={freq * Math.pow(2, -detune/1200)} type="sine" autoStart />
            </Gain>
            {/* Layer 4 - Octave up */}
            <Gain gain={0.05}>
              <Osc frequency={freq * 2} type="triangle" autoStart />
            </Gain>
            {/* Layer 5 - Fifth */}
            <Gain gain={0.04}>
              <Osc frequency={freq * 1.5} type="sine" autoStart />
            </Gain>
          </>
        )}
      </div>
    </AudioProvider>
  );
}`
  }
];

export default examples;
