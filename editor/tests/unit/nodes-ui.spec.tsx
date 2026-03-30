import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

import OscNode from '../../ui/editor/nodes/OscNode';
import GainNode from '../../ui/editor/nodes/GainNode';
import OutputNode from '../../ui/editor/nodes/OutputNode';
import InputNode from '../../ui/editor/nodes/InputNode';
import UiTokensNode from '../../ui/editor/nodes/UiTokensNode';
import NoteNode from '../../ui/editor/nodes/NoteNode';
import { StepSequencerNode } from '../../ui/editor/nodes/StepSequencerNode';
import { PianoRollNode } from '../../ui/editor/nodes/PianoRollNode';
import MathNode from '../../ui/editor/nodes/MathNode';
import SwitchNode from '../../ui/editor/nodes/SwitchNode';
import DelayNode from '../../ui/editor/nodes/DelayNode';
import ReverbNode from '../../ui/editor/nodes/ReverbNode';
import StereoPannerNode from '../../ui/editor/nodes/StereoPannerNode';
import DistortionNode from '../../ui/editor/nodes/DistortionNode';
import ChorusNode from '../../ui/editor/nodes/ChorusNode';
import PhaserNode from '../../ui/editor/nodes/PhaserNode';
import FlangerNode from '../../ui/editor/nodes/FlangerNode';
import TremoloNode from '../../ui/editor/nodes/TremoloNode';
import EQ3Node from '../../ui/editor/nodes/EQ3Node';
import NoiseBurstNode from '../../ui/editor/nodes/NoiseBurstNode';
import WaveShaperNode from '../../ui/editor/nodes/WaveShaperNode';
import ConvolverNode from '../../ui/editor/nodes/ConvolverNode';
import AnalyzerNode from '../../ui/editor/nodes/AnalyzerNode';
import Panner3DNode from '../../ui/editor/nodes/Panner3DNode';
import AuxSendNode from '../../ui/editor/nodes/AuxSendNode';
import AuxReturnNode from '../../ui/editor/nodes/AuxReturnNode';
import MatrixMixerNode from '../../ui/editor/nodes/MatrixMixerNode';
import ConstantSourceNode from '../../ui/editor/nodes/ConstantSourceNode';
import MediaStreamNode from '../../ui/editor/nodes/MediaStreamNode';
import EventTriggerNode from '../../ui/editor/nodes/EventTriggerNode';
import CompressorNode from '../../ui/editor/nodes/CompressorNode';
import SamplerNode from '../../ui/editor/nodes/SamplerNode';
import MidiNoteNode from '../../ui/editor/nodes/MidiNoteNode';
import MidiCCNode from '../../ui/editor/nodes/MidiCCNode';
import MidiNoteOutputNode from '../../ui/editor/nodes/MidiNoteOutputNode';
import MidiCCOutputNode from '../../ui/editor/nodes/MidiCCOutputNode';
import MidiSyncNode from '../../ui/editor/nodes/MidiSyncNode';
import Inspector from '../../ui/editor/Inspector';
import { getInputParamHandleId } from '../../ui/editor/handleIds';
import { audioEngine } from '../../ui/editor/AudioEngine';

const updateNodeData = vi.fn();
const storeState = {
    updateNodeData,
    nodes: [] as any[],
    edges: [] as any[],
    selectedNodeId: null as string | null,
};
const audioEngineMock = vi.hoisted(() => ({
    subscribeStep: vi.fn((callback: (step: number) => void) => {
        callback(2);
        return () => {};
    }),
}));
const audioLibraryMock = vi.hoisted(() => ({
    addAssetFromFile: vi.fn(async (file: File) => ({
        id: `asset-${file.name}`,
        name: file.name,
        mimeType: file.type || 'audio/wav',
        size: file.size,
        createdAt: 1,
        updatedAt: 1,
    })),
    getAssetObjectUrl: vi.fn(async (assetId: string) => `blob:${assetId}`),
    listAssets: vi.fn(async () => ([
        { id: 'asset-kick', name: 'kick.wav', mimeType: 'audio/wav', size: 256, createdAt: 1, updatedAt: 1 },
        { id: 'asset-plate.wav', name: 'plate.wav', mimeType: 'audio/wav', size: 512, createdAt: 1, updatedAt: 1 },
    ])),
    subscribeAssets: vi.fn(() => () => {}),
}));
const midiHookState = vi.hoisted(() => ({
    midi: {
        supported: true,
        status: 'idle',
        error: null,
        inputs: [] as Array<{ id: string; name: string }>,
        outputs: [] as Array<{ id: string; name: string }>,
        defaultInputId: null as string | null,
        defaultOutputId: null as string | null,
        defaultInput: null,
        defaultOutput: null,
        listenMode: 'default',
        lastInputEvent: null as any,
        lastOutputEvent: null as any,
        clock: null,
        requestAccess: vi.fn(async () => {}),
        setDefaultInputId: vi.fn(),
        setDefaultOutputId: vi.fn(),
        setListenMode: vi.fn(),
        sendNoteOn: vi.fn(),
        sendNoteOff: vi.fn(),
        sendCC: vi.fn(),
        sendStart: vi.fn(),
        sendStop: vi.fn(),
        sendContinue: vi.fn(),
        sendClock: vi.fn(),
    },
    note: {
        gate: false,
        note: null as number | null,
        frequency: null as number | null,
        velocity: 0,
        channel: null as number | null,
        triggerToken: 0,
        activeNotes: [] as any[],
        lastEvent: null as any,
        source: { id: null as string | null, name: null as string | null },
    },
    cc: {
        raw: 0,
        normalized: 0,
        lastEvent: null as any,
        source: { id: null as string | null, name: null as string | null },
    },
    clock: {
        running: false,
        bpmEstimate: null as number | null,
        tickCount: 0,
        lastTickAt: null as number | null,
        source: { id: null as string | null, name: null as string | null },
    },
}));

vi.mock('@xyflow/react', () => ({
    Handle: ({ id }: { id?: string }) => <div data-testid={`handle-${id ?? 'default'}`} />,
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    useHandleConnections: () => [],
    useNodesData: () => null,
}));

vi.mock('../../ui/editor/store', () => ({
    useAudioGraphStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState),
}));

vi.mock('../../ui/editor/AudioEngine', () => ({
    audioEngine: {
        start: vi.fn(),
        stop: vi.fn(),
        updateNode: vi.fn(),
        subscribeStep: audioEngineMock.subscribeStep,
        getControlInputValue: vi.fn(() => null),
        getSourceOutputValue: vi.fn(() => null),
        updateSamplerParam: vi.fn(),
        playSampler: vi.fn(),
        stopSampler: vi.fn(),
        loadSamplerBuffer: vi.fn(),
        onSamplerEnd: () => () => {},
    },
}));

vi.mock('../../ui/editor/audioLibrary', () => audioLibraryMock);

vi.mock('../../../src/midi', () => ({
    useMidi: () => midiHookState.midi,
    useMidiNote: () => midiHookState.note,
    useMidiCC: () => midiHookState.cc,
    useMidiClock: () => midiHookState.clock,
}));

describe('editor node UIs', () => {
    afterEach(() => {
        storeState.nodes = [];
        storeState.edges = [];
        storeState.selectedNodeId = null;
        updateNodeData.mockClear();
        vi.mocked(audioEngine.updateNode).mockClear();
        audioLibraryMock.addAssetFromFile.mockClear();
        audioLibraryMock.getAssetObjectUrl.mockClear();
        audioLibraryMock.listAssets.mockClear();
        audioLibraryMock.subscribeAssets.mockClear();
        midiHookState.midi.supported = true;
        midiHookState.midi.status = 'idle';
        midiHookState.midi.error = null;
        midiHookState.midi.inputs = [];
        midiHookState.midi.outputs = [];
        midiHookState.midi.defaultInputId = null;
        midiHookState.midi.defaultOutputId = null;
        midiHookState.midi.defaultInput = null;
        midiHookState.midi.defaultOutput = null;
        midiHookState.midi.listenMode = 'default';
        midiHookState.midi.lastInputEvent = null;
        midiHookState.midi.lastOutputEvent = null;
        midiHookState.midi.requestAccess.mockClear();
        midiHookState.note.gate = false;
        midiHookState.note.note = null;
        midiHookState.note.frequency = null;
        midiHookState.note.velocity = 0;
        midiHookState.note.channel = null;
        midiHookState.note.triggerToken = 0;
        midiHookState.note.activeNotes = [];
        midiHookState.note.lastEvent = null;
        midiHookState.note.source = { id: null, name: null };
        midiHookState.cc.raw = 0;
        midiHookState.cc.normalized = 0;
        midiHookState.cc.lastEvent = null;
        midiHookState.cc.source = { id: null, name: null };
        midiHookState.clock.running = false;
        midiHookState.clock.bpmEstimate = null;
        midiHookState.clock.tickCount = 0;
        midiHookState.clock.lastTickAt = null;
        midiHookState.clock.source = { id: null, name: null };
        vi.unstubAllGlobals();
    });

    it('renders representative node families with their controls', () => {
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        render(
            <div>
                <InputNode
                    {...(sharedProps as any)}
                    id="input-1"
                    data={{
                        type: 'input',
                        label: 'Params',
                        params: [{ id: 'cutoff', name: 'cutoff', label: 'Cutoff', type: 'float', value: 440, defaultValue: 440, min: 20, max: 20000 }],
                    }}
                />
                <NoteNode {...(sharedProps as any)} id="note-1" data={{ type: 'note', note: 'C', octave: 4, frequency: 261.6, language: 'en', label: 'Note' }} />
                <OscNode {...(sharedProps as any)} id="osc-1" data={{ type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' }} />
                <OutputNode {...(sharedProps as any)} id="out-1" data={{ type: 'output', playing: false, masterGain: 0.5, label: 'Output' }} />
                <StepSequencerNode {...(sharedProps as any)} id="seq-1" data={{ type: 'stepSequencer', steps: 4, pattern: [1, 0, 1, 0], activeSteps: [true, false, true, false], label: 'Step Sequencer' }} />
                <PianoRollNode {...(sharedProps as any)} id="pr-1" data={{ type: 'pianoRoll', steps: 16, octaves: 2, baseNote: 48, notes: [], label: 'Piano Roll' }} />
                <DelayNode {...(sharedProps as any)} id="delay-1" data={{ type: 'delay', delayTime: 0.25, feedback: 0.5, label: 'Delay' }} />
                <ReverbNode {...(sharedProps as any)} id="reverb-1" data={{ type: 'reverb', decay: 2.5, mix: 0.4, label: 'Reverb' }} />
                <StereoPannerNode {...(sharedProps as any)} id="panner-1" data={{ type: 'panner', pan: 0.25, label: 'Pan' }} />
                <MathNode {...(sharedProps as any)} id="math-1" data={{ type: 'math', operation: 'add', a: 0, b: 1, c: 2, label: 'Math' }} />
                <SwitchNode {...(sharedProps as any)} id="switch-1" data={{ type: 'switch', inputs: 3, selectedIndex: 0, values: [0, 1, 2], label: 'Switch' }} />
            </div>
        );

        expect(screen.getByTestId('handle-param:cutoff')).toBeInTheDocument();
        expect(screen.getByText('Oscillator')).toBeInTheDocument();
        expect(screen.getByText('Output')).toBeInTheDocument();
        expect(screen.getByText('Step Sequencer')).toBeInTheDocument();
        expect(screen.getByText('Playing step 3 / 4')).toBeInTheDocument();
        expect(screen.getByText('Piano Roll')).toBeInTheDocument();
        expect(screen.getAllByText('Steps').length).toBeGreaterThan(1);
        expect(screen.getByText('Octaves')).toBeInTheDocument();
        expect(screen.getByText('Base')).toBeInTheDocument();
        expect(screen.getByTestId('handle-delayTime')).toBeInTheDocument();
        expect(screen.getByTestId('handle-feedback')).toBeInTheDocument();
        expect(screen.getByTestId('handle-decay')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-mix').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-pan')).toBeInTheDocument();
        expect(screen.getByTestId('handle-masterGain')).toBeInTheDocument();
        expect(screen.getByText('Math')).toBeInTheDocument();
        expect(screen.getByText('Switch')).toBeInTheDocument();
        expect(screen.getAllByTestId(/handle-/).length).toBeGreaterThan(5);
    });

    it('keeps only the frequency output on NoteNode', () => {
        cleanup();

        render(
            <NoteNode
                {...({
                    dragging: false,
                    selected: false,
                    zIndex: 0,
                    selectable: true,
                    draggable: true,
                    isConnectable: true,
                    positionAbsoluteX: 0,
                    positionAbsoluteY: 0,
                    xPos: 0,
                    yPos: 0,
                } as any)}
                id="note-only"
                data={{ type: 'note', note: 'C', octave: 4, frequency: 261.6, language: 'en', label: 'Note' }}
            />
        );

        expect(screen.getByTestId('handle-freq')).toBeInTheDocument();
        expect(screen.queryByTestId('handle-trigger')).not.toBeInTheDocument();
    });

    it('renders UI token handles and triggers only the selected token row', () => {
        cleanup();
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        const params = [
            { id: 'hoverToken', name: 'hoverToken', label: 'Hover Token', type: 'float' as const, value: 1, defaultValue: 0, min: 0, max: 9999 },
            { id: 'successToken', name: 'successToken', label: 'Success Token', type: 'float' as const, value: 2, defaultValue: 0, min: 0, max: 9999 },
            { id: 'errorToken', name: 'errorToken', label: 'Error Token', type: 'float' as const, value: 3, defaultValue: 0, min: 0, max: 9999 },
        ];

        render(
            <UiTokensNode
                {...(sharedProps as any)}
                id="ui-tokens-1"
                data={{
                    type: 'uiTokens',
                    label: 'UI Tokens',
                    params,
                }}
            />
        );

        expect(screen.getByTestId('handle-param:hoverToken')).toBeInTheDocument();
        expect(screen.getByTestId('handle-param:successToken')).toBeInTheDocument();
        expect(screen.getByTestId('handle-param:errorToken')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('ui-token-trigger-successToken'));
        expect(updateNodeData).toHaveBeenCalledWith(
            'ui-tokens-1',
            expect.objectContaining({
                params: expect.arrayContaining([
                    expect.objectContaining({ id: 'hoverToken', value: 1 }),
                    expect.objectContaining({ id: 'successToken', value: 3 }),
                    expect.objectContaining({ id: 'errorToken', value: 3 }),
                ]),
            })
        );
    });

    it('allows adding and removing uiTokens params from the inspector panel', () => {
        cleanup();
        storeState.selectedNodeId = 'ui-tokens-1';
        storeState.nodes = [{
            id: 'ui-tokens-1',
            type: 'uiTokensNode',
            data: {
                type: 'uiTokens',
                label: 'UI Tokens',
                params: [
                    { id: 'hoverToken', name: 'hoverToken', label: 'Hover Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                ],
            },
        }];

        render(<Inspector />);

        fireEvent.change(screen.getByPlaceholderText('New token name...'), { target: { value: 'Warning Token' } });
        fireEvent.click(screen.getByText('+'));

        expect(updateNodeData).toHaveBeenCalledWith(
            'ui-tokens-1',
            expect.objectContaining({
                params: expect.arrayContaining([
                    expect.objectContaining({ id: 'hoverToken' }),
                    expect.objectContaining({ name: 'Warning Token', label: 'Warning Token' }),
                ]),
            })
        );

        updateNodeData.mockClear();
        fireEvent.click(screen.getByText('×'));
        expect(updateNodeData).toHaveBeenCalledWith(
            'ui-tokens-1',
            expect.objectContaining({
                params: [],
            })
        );
    });

    it('replaces slider with connected value when parameter handle is connected', () => {
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        const param = {
            id: 'gainParam',
            name: 'gainParam',
            label: 'Gain Param',
            type: 'float' as const,
            value: 0.72,
            defaultValue: 0.72,
            min: 0,
            max: 1,
        };

        storeState.nodes = [
            { id: 'input-1', data: { type: 'input', params: [param], label: 'Params' } },
            { id: 'gain-1', data: { type: 'gain', gain: 0.2, label: 'Gain' } },
        ];
        storeState.edges = [
            { id: 'e-1', source: 'input-1', sourceHandle: getInputParamHandleId(param), target: 'gain-1', targetHandle: 'gain' },
        ];

        render(
            <GainNode
                {...(sharedProps as any)}
                id="gain-1"
                data={{ type: 'gain', gain: 0.2, label: 'Gain' }}
            />
        );

        expect(screen.queryByTitle('Gain level')).not.toBeInTheDocument();
        expect(screen.getByText('72%')).toBeInTheDocument();
    });

    it('renders extended MVP feedback and routing node controls with stable handles', () => {
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        render(
            <div>
                <CompressorNode {...(sharedProps as any)} id="compressor-1" data={{ type: 'compressor', threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25, sidechainStrength: 0.7, label: 'Compressor' }} />
                <DistortionNode {...(sharedProps as any)} id="distortion-1" data={{ type: 'distortion', distortionType: 'soft', drive: 0.4, level: 0.6, mix: 0.5, tone: 3200, label: 'Distortion' }} />
                <ChorusNode {...(sharedProps as any)} id="chorus-1" data={{ type: 'chorus', rate: 1.2, depth: 2.4, feedback: 0.2, delay: 18, mix: 0.3, stereo: true, label: 'Chorus' }} />
                <PhaserNode {...(sharedProps as any)} id="phaser-1" data={{ type: 'phaser', rate: 0.5, depth: 0.5, feedback: 0.7, baseFrequency: 1000, stages: 4, mix: 0.5, label: 'Phaser' }} />
                <FlangerNode {...(sharedProps as any)} id="flanger-1" data={{ type: 'flanger', rate: 0.2, depth: 2, feedback: 0.5, delay: 1, mix: 0.5, label: 'Flanger' }} />
                <TremoloNode {...(sharedProps as any)} id="tremolo-1" data={{ type: 'tremolo', rate: 4, depth: 0.5, waveform: 'sine', stereo: false, mix: 0.5, label: 'Tremolo' }} />
                <EQ3Node {...(sharedProps as any)} id="eq3-1" data={{ type: 'eq3', low: 0, mid: 0, high: 0, lowFrequency: 400, highFrequency: 2500, mix: 1, label: 'EQ3' }} />
                <NoiseBurstNode {...(sharedProps as any)} id="noise-burst-1" data={{ type: 'noiseBurst', noiseType: 'white', duration: 0.06, gain: 0.7, attack: 0.001, release: 0.02, label: 'Noise Burst' }} />
                <WaveShaperNode {...(sharedProps as any)} id="wave-shaper-1" data={{ type: 'waveShaper', amount: 0.45, preset: 'softClip', oversample: '2x', label: 'WaveShaper' }} />
                <ConvolverNode {...(sharedProps as any)} id="convolver-1" data={{ type: 'convolver', impulseSrc: '/impulses/plate.wav', normalize: true, label: 'Convolver' }} />
                <AnalyzerNode {...(sharedProps as any)} id="analyzer-1" data={{ type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.8, updateRate: 60, autoUpdate: true, label: 'Analyzer' }} />
                <Panner3DNode {...(sharedProps as any)} id="panner3d-1" data={{ type: 'panner3d', positionX: 0, positionY: 0, positionZ: -1, refDistance: 1, maxDistance: 10000, rolloffFactor: 1, panningModel: 'HRTF', distanceModel: 'inverse', label: 'Panner 3D' }} />
                <AuxSendNode {...(sharedProps as any)} id="aux-send-1" data={{ type: 'auxSend', busId: 'aux', sendGain: 0.5, tap: 'pre', label: 'Aux Send' }} />
                <AuxReturnNode {...(sharedProps as any)} id="aux-return-1" data={{ type: 'auxReturn', busId: 'aux', gain: 1, label: 'Aux Return' }} />
                <MatrixMixerNode
                    {...(sharedProps as any)}
                    id="matrix-1"
                    data={{ type: 'matrixMixer', inputs: 2, outputs: 2, matrix: [[1, 0], [0, 1]], label: 'Matrix Mixer' }}
                />
                <ConstantSourceNode {...(sharedProps as any)} id="constant-source-1" data={{ type: 'constantSource', offset: 1, label: 'Constant Source' }} />
                <MediaStreamNode {...(sharedProps as any)} id="media-stream-1" data={{ type: 'mediaStream', requestMic: false, label: 'Media Stream' }} />
                <EventTriggerNode {...(sharedProps as any)} id="event-trigger-1" data={{ type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 40, velocity: 1, duration: 0.1, note: 60, trackId: 'event', label: 'Event Trigger' }} />
            </div>
        );

        expect(screen.getByTestId('handle-threshold')).toBeInTheDocument();
        expect(screen.getByTestId('handle-knee')).toBeInTheDocument();
        expect(screen.getByTestId('handle-ratio')).toBeInTheDocument();
        expect(screen.getByTestId('handle-sidechainIn')).toBeInTheDocument();
        expect(screen.getByTestId('handle-sidechainStrength')).toBeInTheDocument();
        expect(screen.getByTestId('handle-drive')).toBeInTheDocument();
        expect(screen.getByTestId('handle-level')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-mix').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-tone')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-rate').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('handle-depth').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-baseFrequency')).toBeInTheDocument();
        expect(screen.getByTestId('handle-stages')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-delay').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-low')).toBeInTheDocument();
        expect(screen.getByTestId('handle-mid')).toBeInTheDocument();
        expect(screen.getByTestId('handle-high')).toBeInTheDocument();
        expect(screen.getByTestId('handle-lowFrequency')).toBeInTheDocument();
        expect(screen.getByTestId('handle-highFrequency')).toBeInTheDocument();
        expect(screen.getByTestId('handle-sendGain')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-gain').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-in1')).toBeInTheDocument();
        expect(screen.getByTestId('handle-in2')).toBeInTheDocument();
        expect(screen.getByTestId('handle-out1')).toBeInTheDocument();
        expect(screen.getByTestId('handle-out2')).toBeInTheDocument();
        expect(screen.getByTestId('handle-cell:0:0')).toBeInTheDocument();
        expect(screen.getByTestId('handle-cell:1:1')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-trigger').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-duration')).toBeInTheDocument();
        expect(screen.getByTestId('handle-amount')).toBeInTheDocument();
        expect(screen.getByTestId('handle-positionX')).toBeInTheDocument();
        expect(screen.getByTestId('handle-positionY')).toBeInTheDocument();
        expect(screen.getByTestId('handle-positionZ')).toBeInTheDocument();
        expect(screen.getByTestId('handle-refDistance')).toBeInTheDocument();
        expect(screen.getByTestId('handle-maxDistance')).toBeInTheDocument();
        expect(screen.getByTestId('handle-rolloffFactor')).toBeInTheDocument();
        expect(screen.getByTestId('handle-offset')).toBeInTheDocument();
        expect(screen.getByTestId('handle-token')).toBeInTheDocument();
        expect(screen.getByText('Media Stream')).toBeInTheDocument();
        expect(screen.getByText('Convolver')).toBeInTheDocument();
    });

    it('uploads an impulse audio file on ConvolverNode and stores a library asset reference', async () => {
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        const { container } = render(
            <ConvolverNode
                {...(sharedProps as any)}
                id="convolver-upload"
                data={{ type: 'convolver', impulseSrc: '', impulseFileName: '', normalize: true, label: 'Convolver' }}
            />
        );

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
        expect(fileInput).not.toBeNull();

        fireEvent.change(fileInput!, {
            target: {
                files: [new File(['fake-impulse'], 'plate.wav', { type: 'audio/wav' })],
            },
        });

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenCalledWith(
                'convolver-upload',
                expect.objectContaining({
                    impulseId: 'asset-plate.wav',
                    impulseFileName: 'plate.wav',
                    impulseSrc: 'blob:asset-plate.wav',
                })
            );
        });

        expect(audioEngine.updateNode).toHaveBeenCalledWith(
            'convolver-upload',
            expect.objectContaining({
                impulseId: 'asset-plate.wav',
                impulseFileName: 'plate.wav',
                impulseSrc: 'blob:asset-plate.wav',
            })
        );
        expect(screen.getByText('Impulse File')).toBeInTheDocument();
    });

    it('selects a cached sample from the sampler dropdown search', async () => {
        cleanup();

        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        render(
            <SamplerNode
                {...(sharedProps as any)}
                id="sampler-select"
                data={{ type: 'sampler', src: '', sampleId: '', fileName: '', loop: false, playbackRate: 1, detune: 0, loaded: false, label: 'Sampler' }}
            />
        );

        await waitFor(() => {
            expect(screen.getByTitle('Select cached sample')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByTitle('Select cached sample'), { target: { value: 'asset-kick' } });

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenCalledWith(
                'sampler-select',
                expect.objectContaining({
                    sampleId: 'asset-kick',
                    src: 'blob:asset-kick',
                    fileName: 'kick.wav',
                    loaded: true,
                })
            );
        });
    });

    it('maps MIDI note input sources, keeps disconnected mappings, and falls back after removal', async () => {
        cleanup();
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        midiHookState.midi.status = 'granted';
        midiHookState.midi.inputs = [{ id: 'usb-keys', name: 'USB Keys' }];
        midiHookState.midi.lastInputEvent = {
            seq: 7,
            kind: 'noteon',
            inputId: 'usb-keys',
            channel: 2,
            note: 67,
            velocity: 0.81,
            receivedAt: 700,
        };
        midiHookState.note.gate = true;
        midiHookState.note.note = 67;
        midiHookState.note.frequency = 391.995;
        midiHookState.note.velocity = 0.81;
        midiHookState.note.channel = 2;
        midiHookState.note.lastEvent = midiHookState.midi.lastInputEvent;
        midiHookState.note.source = { id: 'usb-keys', name: 'USB Keys' };

        let currentData: any = {
            type: 'midiNote',
            inputId: 'missing-input',
            channel: 'all',
            noteMode: 'all',
            note: 60,
            noteMin: 48,
            noteMax: 72,
            mappingEnabled: false,
            mappings: [],
            activeMappingId: null,
            label: 'Midi In',
        };

        const { rerender } = render(
            <MidiNoteNode
                {...(sharedProps as any)}
                id="midi-note-1"
                data={{ ...currentData }}
            />
        );

        expect(screen.getByText('Receiving')).toBeInTheDocument();
        expect(screen.getByText('Missing: missing-input')).toBeInTheDocument();
        expect(screen.getByText('Map Off')).toBeInTheDocument();
        expect(screen.getByText('No mapped sources')).toBeInTheDocument();
        expect(screen.getByText('67')).toBeInTheDocument();
        expect(screen.getByText('0.81')).toBeInTheDocument();
        expect(screen.getByTestId('handle-trigger')).toBeInTheDocument();
        expect(screen.getByTestId('handle-frequency')).toBeInTheDocument();
        expect(screen.getByTestId('handle-note')).toBeInTheDocument();
        expect(screen.getByTestId('handle-gate')).toBeInTheDocument();
        expect(screen.getByTestId('handle-velocity')).toBeInTheDocument();

        const applyLatestNodePatch = () => {
            const nextData = updateNodeData.mock.calls.at(-1)?.[1];
            if (!nextData) {
                throw new Error('Expected MIDI note node patch');
            }
            currentData = nextData;
            rerender(
                <MidiNoteNode
                    {...(sharedProps as any)}
                    id="midi-note-1"
                    data={{ ...currentData }}
                />
            );
        };

        fireEvent.click(screen.getByRole('button', { name: 'Map Off' }));

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenLastCalledWith('midi-note-1', expect.objectContaining({
                mappingEnabled: true,
            }));
        });
        applyLatestNodePatch();

        expect(screen.getByText('Map On')).toBeInTheDocument();
        expect(screen.getByText('Listening for MIDI...')).toBeInTheDocument();

        midiHookState.midi.lastInputEvent = {
            seq: 8,
            kind: 'noteon',
            inputId: 'usb-keys',
            channel: 2,
            note: 67,
            velocity: 0.81,
            receivedAt: 800,
        };
        rerender(
            <MidiNoteNode
                {...(sharedProps as any)}
                id="midi-note-1"
                data={{ ...currentData }}
            />
        );

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenLastCalledWith('midi-note-1', expect.objectContaining({
                inputId: 'usb-keys',
                channel: 2,
                activeMappingId: 'usb-keys:2',
                mappings: [
                    expect.objectContaining({
                        mappingId: 'usb-keys:2',
                        inputId: 'usb-keys',
                        inputName: 'USB Keys',
                        channel: 2,
                        lastNote: 67,
                        lastVelocity: 0.81,
                    }),
                ],
            }), expect.objectContaining({ history: 'skip' }));
        });
        applyLatestNodePatch();

        expect(screen.getAllByText('USB Keys / Ch 2').length).toBeGreaterThan(0);
        expect(screen.getByText('Active / Connected')).toBeInTheDocument();
        expect(screen.getByText('Note 67 / Vel 0.81')).toBeInTheDocument();

        midiHookState.midi.inputs = [
            { id: 'usb-keys', name: 'USB Keys' },
            { id: 'rack-keys', name: 'Rack Keys' },
        ];
        midiHookState.midi.lastInputEvent = {
            seq: 9,
            kind: 'noteon',
            inputId: 'rack-keys',
            channel: 5,
            note: 72,
            velocity: 0.64,
            receivedAt: 900,
        };
        rerender(
            <MidiNoteNode
                {...(sharedProps as any)}
                id="midi-note-1"
                data={{ ...currentData }}
            />
        );

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenLastCalledWith('midi-note-1', expect.objectContaining({
                inputId: 'rack-keys',
                channel: 5,
                activeMappingId: 'rack-keys:5',
                mappings: expect.arrayContaining([
                    expect.objectContaining({ mappingId: 'usb-keys:2' }),
                    expect.objectContaining({ mappingId: 'rack-keys:5' }),
                ]),
            }), expect.objectContaining({ history: 'skip' }));
        });
        applyLatestNodePatch();

        expect(screen.getAllByText('Rack Keys / Ch 5').length).toBeGreaterThan(0);
        expect(screen.getByText('Note 72 / Vel 0.64')).toBeInTheDocument();

        midiHookState.midi.inputs = [{ id: 'rack-keys', name: 'Rack Keys' }];
        rerender(
            <MidiNoteNode
                {...(sharedProps as any)}
                id="midi-note-1"
                data={{ ...currentData }}
            />
        );

        expect(screen.getByText('Mapped / Disconnected')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /USB Keys \/ Ch 2/i }));

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenLastCalledWith('midi-note-1', expect.objectContaining({
                inputId: 'usb-keys',
                channel: 2,
                activeMappingId: 'usb-keys:2',
            }));
        });
        applyLatestNodePatch();

        expect(screen.getByText('Active / Disconnected')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Remove USB Keys channel 2' }));

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenLastCalledWith('midi-note-1', expect.objectContaining({
                inputId: 'rack-keys',
                channel: 5,
                activeMappingId: 'rack-keys:5',
                mappings: [
                    expect.objectContaining({ mappingId: 'rack-keys:5' }),
                ],
            }));
        });
        applyLatestNodePatch();

        expect(screen.getByText('Active / Connected')).toBeInTheDocument();
        expect(screen.getAllByText('Rack Keys / Ch 5').length).toBeGreaterThan(0);
    });

    it('learns MIDI CC input and renders live sync state', async () => {
        cleanup();
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        midiHookState.midi.status = 'granted';
        midiHookState.midi.inputs = [{ id: 'knob-box', name: 'Knob Box' }];
        midiHookState.midi.outputs = [{ id: 'clock-out', name: 'Clock Out' }];
        midiHookState.midi.lastInputEvent = {
            seq: 8,
            kind: 'cc',
            inputId: 'knob-box',
            channel: 4,
            cc: 74,
            value: 91,
        };
        midiHookState.cc.raw = 91;
        midiHookState.cc.normalized = 91 / 127;
        midiHookState.cc.lastEvent = midiHookState.midi.lastInputEvent;
        midiHookState.cc.source = { id: 'knob-box', name: 'Knob Box' };
        midiHookState.clock.running = true;
        midiHookState.clock.bpmEstimate = 123.4;
        midiHookState.clock.tickCount = 96;
        midiHookState.clock.lastTickAt = 1200;
        midiHookState.clock.source = { id: 'knob-box', name: 'Knob Box' };

        render(
            <div>
                <MidiCCNode
                    {...(sharedProps as any)}
                    id="midi-cc-1"
                    data={{ type: 'midiCC', inputId: 'default', channel: 'all', cc: 1, label: 'Knob / CC In' }}
                />
                <MidiSyncNode
                    {...(sharedProps as any)}
                    id="midi-sync-1"
                    data={{ type: 'midiSync', mode: 'midi-master', inputId: 'knob-box', outputId: 'clock-out', sendStartStop: true, sendClock: true, label: 'Sync' }}
                />
            </div>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Learn' }));

        await waitFor(() => {
            expect(updateNodeData).toHaveBeenCalledWith('midi-cc-1', expect.objectContaining({
                inputId: 'knob-box',
                channel: 4,
                cc: 74,
            }));
        });

        expect(screen.getByText('0.72')).toBeInTheDocument();
        expect(screen.getByText('91')).toBeInTheDocument();
        expect(screen.getByTestId('handle-normalized')).toBeInTheDocument();
        expect(screen.getByTestId('handle-raw')).toBeInTheDocument();
        expect(screen.getByText('Clock locked')).toBeInTheDocument();
        expect(screen.getAllByText('Knob Box').length).toBeGreaterThan(0);
        expect(screen.getByText('123.4')).toBeInTheDocument();
    });

    it('replaces MIDI output controls with connected values and shows missing outputs', () => {
        cleanup();
        const sharedProps = {
            dragging: false,
            selected: false,
            zIndex: 0,
            selectable: true,
            draggable: true,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            xPos: 0,
            yPos: 0,
        } as const;

        midiHookState.midi.status = 'granted';
        midiHookState.midi.outputs = [{ id: 'hardware-out', name: 'Hardware Out' }];

        const freqParam = {
            id: 'freq',
            name: 'freq',
            label: 'Freq',
            type: 'float' as const,
            value: 523.25,
            defaultValue: 523.25,
            min: 20,
            max: 20000,
        };
        const valueParam = {
            id: 'mod',
            name: 'mod',
            label: 'Mod',
            type: 'float' as const,
            value: 0.72,
            defaultValue: 0.72,
            min: 0,
            max: 1,
        };

        storeState.nodes = [
            { id: 'input-1', data: { type: 'input', label: 'Params', params: [freqParam, valueParam] } },
            { id: 'midi-note-out-1', data: { type: 'midiNoteOutput', outputId: 'missing-output', channel: 1, gate: 0, note: 60, frequency: 261.63, velocity: 1, label: 'Note Out' } },
            { id: 'midi-cc-out-1', data: { type: 'midiCCOutput', outputId: 'missing-cc-output', channel: 1, cc: 1, value: 0.25, valueFormat: 'normalized', label: 'CC Out' } },
        ];
        storeState.edges = [
            { id: 'freq-edge', source: 'input-1', sourceHandle: getInputParamHandleId(freqParam), target: 'midi-note-out-1', targetHandle: 'frequency' },
            { id: 'value-edge', source: 'input-1', sourceHandle: getInputParamHandleId(valueParam), target: 'midi-cc-out-1', targetHandle: 'value' },
        ];

        render(
            <div>
                <MidiNoteOutputNode
                    {...(sharedProps as any)}
                    id="midi-note-out-1"
                    data={{ type: 'midiNoteOutput', outputId: 'missing-output', channel: 1, gate: 0, note: 60, frequency: 261.63, velocity: 1, label: 'Note Out' }}
                />
                <MidiCCOutputNode
                    {...(sharedProps as any)}
                    id="midi-cc-out-1"
                    data={{ type: 'midiCCOutput', outputId: 'missing-cc-output', channel: 1, cc: 1, value: 0.25, valueFormat: 'normalized', label: 'CC Out' }}
                />
            </div>
        );

        expect(screen.getByText('Missing: missing-output')).toBeInTheDocument();
        expect(screen.getByText('Missing: missing-cc-output')).toBeInTheDocument();
        expect(screen.getByText('523 Hz')).toBeInTheDocument();
        expect(screen.getByText('0.72')).toBeInTheDocument();
        expect(screen.getByTestId('handle-trigger')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-gate').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('handle-note').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('handle-frequency').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('handle-velocity').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('handle-value').length).toBeGreaterThan(0);
    });
});
