import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

import OscNode from '../../src/playground/nodes/OscNode';
import GainNode from '../../src/playground/nodes/GainNode';
import OutputNode from '../../src/playground/nodes/OutputNode';
import InputNode from '../../src/playground/nodes/InputNode';
import UiTokensNode from '../../src/playground/nodes/UiTokensNode';
import NoteNode from '../../src/playground/nodes/NoteNode';
import { StepSequencerNode } from '../../src/playground/nodes/StepSequencerNode';
import { PianoRollNode } from '../../src/playground/nodes/PianoRollNode';
import MathNode from '../../src/playground/nodes/MathNode';
import SwitchNode from '../../src/playground/nodes/SwitchNode';
import DelayNode from '../../src/playground/nodes/DelayNode';
import ReverbNode from '../../src/playground/nodes/ReverbNode';
import StereoPannerNode from '../../src/playground/nodes/StereoPannerNode';
import DistortionNode from '../../src/playground/nodes/DistortionNode';
import ChorusNode from '../../src/playground/nodes/ChorusNode';
import NoiseBurstNode from '../../src/playground/nodes/NoiseBurstNode';
import WaveShaperNode from '../../src/playground/nodes/WaveShaperNode';
import ConvolverNode from '../../src/playground/nodes/ConvolverNode';
import AnalyzerNode from '../../src/playground/nodes/AnalyzerNode';
import Panner3DNode from '../../src/playground/nodes/Panner3DNode';
import ConstantSourceNode from '../../src/playground/nodes/ConstantSourceNode';
import MediaStreamNode from '../../src/playground/nodes/MediaStreamNode';
import EventTriggerNode from '../../src/playground/nodes/EventTriggerNode';
import CompressorNode from '../../src/playground/nodes/CompressorNode';
import SamplerNode from '../../src/playground/nodes/SamplerNode';
import Inspector from '../../src/playground/Inspector';
import { getInputParamHandleId } from '../../src/playground/handleIds';
import { audioEngine } from '../../src/playground/AudioEngine';

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

vi.mock('@xyflow/react', () => ({
    Handle: ({ id }: { id?: string }) => <div data-testid={`handle-${id ?? 'default'}`} />,
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    useHandleConnections: () => [],
    useNodesData: () => null,
}));

vi.mock('../../src/playground/store', () => ({
    useAudioGraphStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState),
}));

vi.mock('../../src/playground/AudioEngine', () => ({
    audioEngine: {
        start: vi.fn(),
        stop: vi.fn(),
        updateNode: vi.fn(),
        subscribeStep: audioEngineMock.subscribeStep,
        getControlInputValue: vi.fn(() => null),
        updateSamplerParam: vi.fn(),
        playSampler: vi.fn(),
        stopSampler: vi.fn(),
        loadSamplerBuffer: vi.fn(),
        onSamplerEnd: () => () => {},
    },
}));

vi.mock('../../src/playground/audioLibrary', () => audioLibraryMock);

describe('playground node UIs', () => {
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
                <CompressorNode {...(sharedProps as any)} id="compressor-1" data={{ type: 'compressor', threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25, label: 'Compressor' }} />
                <DistortionNode {...(sharedProps as any)} id="distortion-1" data={{ type: 'distortion', distortionType: 'soft', drive: 0.4, level: 0.6, mix: 0.5, tone: 3200, label: 'Distortion' }} />
                <ChorusNode {...(sharedProps as any)} id="chorus-1" data={{ type: 'chorus', rate: 1.2, depth: 2.4, feedback: 0.2, delay: 18, mix: 0.3, stereo: true, label: 'Chorus' }} />
                <NoiseBurstNode {...(sharedProps as any)} id="noise-burst-1" data={{ type: 'noiseBurst', noiseType: 'white', duration: 0.06, gain: 0.7, attack: 0.001, release: 0.02, label: 'Noise Burst' }} />
                <WaveShaperNode {...(sharedProps as any)} id="wave-shaper-1" data={{ type: 'waveShaper', amount: 0.45, preset: 'softClip', oversample: '2x', label: 'WaveShaper' }} />
                <ConvolverNode {...(sharedProps as any)} id="convolver-1" data={{ type: 'convolver', impulseSrc: '/impulses/plate.wav', normalize: true, label: 'Convolver' }} />
                <AnalyzerNode {...(sharedProps as any)} id="analyzer-1" data={{ type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.8, updateRate: 60, autoUpdate: true, label: 'Analyzer' }} />
                <Panner3DNode {...(sharedProps as any)} id="panner3d-1" data={{ type: 'panner3d', positionX: 0, positionY: 0, positionZ: -1, refDistance: 1, maxDistance: 10000, rolloffFactor: 1, panningModel: 'HRTF', distanceModel: 'inverse', label: 'Panner 3D' }} />
                <ConstantSourceNode {...(sharedProps as any)} id="constant-source-1" data={{ type: 'constantSource', offset: 1, label: 'Constant Source' }} />
                <MediaStreamNode {...(sharedProps as any)} id="media-stream-1" data={{ type: 'mediaStream', requestMic: false, label: 'Media Stream' }} />
                <EventTriggerNode {...(sharedProps as any)} id="event-trigger-1" data={{ type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 40, velocity: 1, duration: 0.1, note: 60, trackId: 'event', label: 'Event Trigger' }} />
            </div>
        );

        expect(screen.getByTestId('handle-threshold')).toBeInTheDocument();
        expect(screen.getByTestId('handle-knee')).toBeInTheDocument();
        expect(screen.getByTestId('handle-ratio')).toBeInTheDocument();
        expect(screen.getByTestId('handle-drive')).toBeInTheDocument();
        expect(screen.getByTestId('handle-level')).toBeInTheDocument();
        expect(screen.getAllByTestId('handle-mix').length).toBeGreaterThan(0);
        expect(screen.getByTestId('handle-tone')).toBeInTheDocument();
        expect(screen.getByTestId('handle-rate')).toBeInTheDocument();
        expect(screen.getByTestId('handle-depth')).toBeInTheDocument();
        expect(screen.getByTestId('handle-delay')).toBeInTheDocument();
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
});
