// Lightweight @din/react mock for Sandpack editor
// This provides basic audio components using Web Audio API directly

export const reactDinMock = `
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// Audio Context
const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [ctx, setCtx] = useState(null);
  
  useEffect(() => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setCtx(context);
    return () => context.close();
  }, []);
  
  const unlock = () => {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  };
  
  return (
    <AudioContext.Provider value={{ context: ctx, unlock }}>
      <div onClick={unlock}>{children}</div>
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}

// Output Context for chaining nodes
const OutputContext = createContext(null);

function useOutput() {
  return useContext(OutputContext);
}

// Oscillator Component
export function Osc({ frequency = 440, type = 'sine', autoStart = false, children }) {
  const { context } = useAudio();
  const output = useOutput();
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  
  useEffect(() => {
    if (!context) return;
    
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 1;
    
    osc.connect(gain);
    oscRef.current = osc;
    gainRef.current = gain;
    
    if (output) {
      gain.connect(output);
    } else {
      gain.connect(context.destination);
    }
    
    if (autoStart) {
      osc.start();
    }
    
    return () => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    };
  }, [context, type, autoStart]);
  
  useEffect(() => {
    if (oscRef.current) {
      oscRef.current.frequency.value = frequency;
    }
  }, [frequency]);
  
  return children ? (
    <OutputContext.Provider value={gainRef.current}>
      {children}
    </OutputContext.Provider>
  ) : null;
}

// Gain Component
export function Gain({ gain = 1, children }) {
  const { context } = useAudio();
  const output = useOutput();
  const nodeRef = useRef(null);
  
  useEffect(() => {
    if (!context) return;
    
    const gainNode = context.createGain();
    gainNode.gain.value = gain;
    nodeRef.current = gainNode;
    
    if (output) {
      gainNode.connect(output);
    } else {
      gainNode.connect(context.destination);
    }
    
    return () => gainNode.disconnect();
  }, [context]);
  
  useEffect(() => {
    if (nodeRef.current) {
      nodeRef.current.gain.value = gain;
    }
  }, [gain]);
  
  return (
    <OutputContext.Provider value={nodeRef.current}>
      {children}
    </OutputContext.Provider>
  );
}

// ADSR Envelope Component
export function ADSR({ 
  trigger = false, 
  attack = 0.01, 
  decay = 0.1, 
  sustain = 0.7, 
  release = 0.3, 
  children 
}) {
  const { context } = useAudio();
  const output = useOutput();
  const nodeRef = useRef(null);
  const wasTriggeredRef = useRef(false);
  
  useEffect(() => {
    if (!context) return;
    
    const gainNode = context.createGain();
    gainNode.gain.value = 0;
    nodeRef.current = gainNode;
    
    if (output) {
      gainNode.connect(output);
    } else {
      gainNode.connect(context.destination);
    }
    
    return () => gainNode.disconnect();
  }, [context]);
  
  useEffect(() => {
    if (!nodeRef.current || !context) return;
    
    const gain = nodeRef.current.gain;
    const now = context.currentTime;
    
    if (trigger && !wasTriggeredRef.current) {
      wasTriggeredRef.current = true;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(0.001, now);
      gain.linearRampToValueAtTime(1, now + attack);
      gain.exponentialRampToValueAtTime(Math.max(sustain, 0.001), now + attack + decay);
    } else if (!trigger && wasTriggeredRef.current) {
      wasTriggeredRef.current = false;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(Math.max(gain.value, 0.001), now);
      gain.exponentialRampToValueAtTime(0.001, now + release);
    }
  }, [trigger, attack, decay, sustain, release, context]);
  
  return (
    <OutputContext.Provider value={nodeRef.current}>
      {children}
    </OutputContext.Provider>
  );
}

// Note to frequency conversion
export function noteToFreq(note) {
  const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const match = note.match(/^([A-G])([#b]?)([0-9])$/i);
  if (!match) return 440;
  
  let [, noteName, accidental, octave] = match;
  let semitone = notes[noteName.toUpperCase()];
  if (accidental === '#') semitone++;
  if (accidental === 'b') semitone--;
  
  const midi = 12 + parseInt(octave) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
`;

export default reactDinMock;
