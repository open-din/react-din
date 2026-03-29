import type {
    ClampMode,
    CompareOperation,
    DinCoreBackend,
    DistortionCurveType,
    GraphConnectionLike,
    GraphDocumentLike,
    GraphNodeLike,
    MathOperation,
    NoiseType,
    ParsedNote,
    PatchConnection,
    PatchDocument,
    PatchInterface,
    PatchNode,
    PatchToGraphOptions,
    WaveShaperCurvePreset,
} from './contracts';
import { fallbackDinCoreBackend } from './fallback';

declare global {
    // Future build steps can register a generated WASM-backed bridge here.
    // eslint-disable-next-line no-var
    var __dinVanillaCoreBackend__: Partial<DinCoreBackend> | undefined;
    // eslint-disable-next-line no-var
    var __reactDinCoreBackend__: Partial<DinCoreBackend> | undefined;
}

let registeredBackend: Partial<DinCoreBackend> | undefined;

function getBackend(): DinCoreBackend {
    const backend = registeredBackend
        ?? globalThis.__dinVanillaCoreBackend__
        ?? globalThis.__reactDinCoreBackend__;
    if (!backend) return fallbackDinCoreBackend;
    return { ...fallbackDinCoreBackend, ...backend };
}

export function registerDinCoreBackend(backend: Partial<DinCoreBackend>) {
    registeredBackend = backend;
    globalThis.__dinVanillaCoreBackend__ = backend;
}

export function clearDinCoreBackend() {
    registeredBackend = undefined;
    globalThis.__dinVanillaCoreBackend__ = undefined;
}

export function getDinCoreRuntime(): DinCoreBackend['runtime'] {
    return getBackend().runtime;
}

export async function loadDinCoreWasmBackend(
    loader: () => Promise<Partial<DinCoreBackend>>
): Promise<DinCoreBackend['runtime']> {
    const backend = await loader();
    registerDinCoreBackend({ ...backend, runtime: backend.runtime ?? 'wasm' });
    return getDinCoreRuntime();
}

export const PATCH_DOCUMENT_VERSION = fallbackDinCoreBackend.patchDocumentVersion;
export const PATCH_INPUT_HANDLE_PREFIX = fallbackDinCoreBackend.patchInputHandlePrefix;

export type {
    ClampMode,
    CompareOperation,
    DistortionCurveType,
    DinCoreBackend,
    GraphConnectionLike,
    GraphDocumentLike,
    GraphNodeLike,
    MathOperation,
    NoiseType,
    ParsedNote,
    PatchConnection,
    PatchDocument,
    PatchInterface,
    PatchNode,
    PatchPosition,
    PatchToGraphOptions,
    MidiTransportSyncMode,
    MidiValueFormat,
    WaveShaperCurvePreset,
} from './contracts';

export function dinCoreMath(operation: MathOperation, a = 0, b = 0, c = 0): number {
    return getBackend().math(operation, a, b, c);
}

export function dinCoreCompare(operation: CompareOperation, a = 0, b = 0): number {
    return getBackend().compare(operation, a, b);
}

export function dinCoreMix(a = 0, b = 0, t = 0, clampMix = false): number {
    return getBackend().mix(a, b, t, clampMix);
}

export function dinCoreClamp(value = 0, min = 0, max = 1, mode: ClampMode = 'minmax'): number {
    return getBackend().clamp(value, min, max, mode);
}

export function dinCoreSwitchValue(index: number, values: readonly number[], fallback = 0): number {
    return getBackend().switchValue(index, values, fallback);
}

export function dinCoreParseNote(input: string | number): ParsedNote {
    return getBackend().parseNote(input);
}

export function dinCoreNoteToMidi(note: string, octave?: number | null): number {
    return getBackend().noteToMidi(note, octave);
}

export function dinCoreMidiToNote(midi: number, preferFlats = false): string {
    return getBackend().midiToNote(midi, preferFlats);
}

export function dinCoreMidiToFreq(midi: number): number {
    return getBackend().midiToFreq(midi);
}

export function dinCoreNoteToFreq(note: string | number, octave?: number | null): number {
    return getBackend().noteToFreq(note, octave);
}

export function dinCoreNoteToFrench(note: string): string {
    return getBackend().noteToFrench(note);
}

export function dinCoreNoteFromFrench(note: string): string {
    return getBackend().noteFromFrench(note);
}

export function dinCoreCreateDistortionCurve(
    type: DistortionCurveType,
    drive: number,
    samples?: number
): Float32Array {
    return getBackend().createDistortionCurve(type, drive, samples);
}

export function dinCoreCreateWaveShaperCurve(
    amount: number,
    preset: WaveShaperCurvePreset,
    samples?: number
): Float32Array {
    return getBackend().createWaveShaperCurve(amount, preset, samples);
}

export function dinCoreFillNoiseSamples(
    type: NoiseType,
    sampleCount: number,
    target?: Float32Array
): Float32Array {
    return getBackend().fillNoiseSamples(type, sampleCount, target);
}

export function dinCoreCreateReverbImpulseFrames(
    sampleRate: number,
    decay: number,
    preDelay = 0,
    damping = 0
) {
    return getBackend().createReverbImpulseFrames(sampleRate, decay, preDelay, damping);
}

export function dinCoreGraphDocumentToPatch(graph: GraphDocumentLike): PatchDocument {
    return getBackend().graphDocumentToPatch(graph);
}

export function dinCoreMigratePatchDocument(patch: PatchDocument): PatchDocument {
    return getBackend().migratePatchDocument(patch);
}

export function dinCorePatchToGraphDocument(patch: PatchDocument, options: PatchToGraphOptions = {}) {
    return getBackend().patchToGraphDocument(patch, options);
}

export function dinCoreIsAudioConnectionLike(
    connection: Pick<PatchConnection, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
    nodeById: Map<string, PatchNode>
): boolean {
    return getBackend().isAudioConnectionLike(connection, nodeById);
}

export function dinCoreGetTransportConnections(
    connections: readonly PatchConnection[],
    nodeById: Map<string, PatchNode>
): Set<string> {
    return getBackend().getTransportConnections(connections, nodeById);
}

export function dinCoreResolvePatchAssetPath(assetPath: string | undefined, assetRoot?: string): string | undefined {
    return getBackend().resolvePatchAssetPath(assetPath, assetRoot);
}

export function dinCoreBuildPatchInterface(nodes: readonly PatchNode[]): PatchInterface {
    return getBackend().buildPatchInterface(nodes);
}

export const math = dinCoreMath;
export const compare = dinCoreCompare;
export const mix = dinCoreMix;
export const clamp = dinCoreClamp;
export const switchValue = dinCoreSwitchValue;
export const parseNote = dinCoreParseNote;
export const noteToMidi = dinCoreNoteToMidi;
export const midiToNote = dinCoreMidiToNote;
export const midiToFreq = dinCoreMidiToFreq;
export const noteToFreq = dinCoreNoteToFreq;
export const noteToFrench = dinCoreNoteToFrench;
export const noteFromFrench = dinCoreNoteFromFrench;
export const createDistortionCurve = dinCoreCreateDistortionCurve;
export const createWaveShaperCurve = dinCoreCreateWaveShaperCurve;
export const fillNoiseSamples = dinCoreFillNoiseSamples;
export const createReverbImpulseFrames = dinCoreCreateReverbImpulseFrames;
export const graphDocumentToPatch = dinCoreGraphDocumentToPatch;
export const migratePatchDocument = dinCoreMigratePatchDocument;
export const patchToGraphDocument = dinCorePatchToGraphDocument;
export const isAudioConnectionLike = dinCoreIsAudioConnectionLike;
export const getTransportConnections = dinCoreGetTransportConnections;
export const resolvePatchAssetPath = dinCoreResolvePatchAssetPath;
export const buildPatchInterface = dinCoreBuildPatchInterface;
