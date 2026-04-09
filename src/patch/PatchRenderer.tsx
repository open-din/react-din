import React, { useMemo } from 'react';
import { AudioProvider } from '../core';
import { TransportProvider } from '../transport';
import { PatchWasmBridge } from '../runtime/wasm/PatchWasmBridge';
import { migratePatchDocument } from './document';
import { assertNoRecursivePatchInline } from './runtime';
import type {
    ImportPatchOptions,
    PatchDocument,
    PatchMidiBindings,
    PatchMidiOutput,
    PatchNode,
    PatchProps,
    PatchRendererProps,
} from './types';

type AnyNodeData = Record<string, unknown> & { type: string; label?: string };

function asNumber(value: unknown, fallback = 0): number {
    return Number.isFinite(value) ? Number(value) : fallback;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function buildTransportProps(
    transportNode: PatchNode | undefined,
    syncBindings: Array<{ node: PatchNode; binding: Record<string, unknown>; metadata: PatchMidiOutput }>
) {
    const data = (transportNode?.data ?? {}) as AnyNodeData;
    const props: Record<string, unknown> = {};

    if (transportNode) {
        props.bpm = asNumber(data.bpm, 120);
        props.beatsPerBar = asNumber(data.beatsPerBar, 4);
        props.beatUnit = asNumber(data.beatUnit, 4);
        props.stepsPerBeat = asNumber(data.stepsPerBeat, 4);
        props.barsPerPhrase = asNumber(data.barsPerPhrase, 4);
        props.swing = asNumber(data.swing, 0);
    }

    const requiresManualMode = syncBindings.some(({ node, binding }) => {
        const nodeData = node.data as AnyNodeData;
        const mode = asString(binding.mode, asString(nodeData.mode, 'transport-master'));
        return mode === 'midi-master';
    });

    if (requiresManualMode) {
        props.mode = 'manual';
    }

    return props;
}

function buildMidiOutputBindingList<TPatch extends PatchDocument>(
    patch: TPatch,
    midi: PatchMidiBindings<TPatch> | undefined
) {
    return patch.interface.midiOutputs.flatMap((item) => {
        const binding = midi?.outputs?.[item.key as keyof typeof midi.outputs];
        if (!binding) return [];
        const node = patch.nodes.find((candidate) => candidate.id === item.nodeId);
        if (!node) return [];
        return [{
            node,
            metadata: item,
            binding: binding as Record<string, unknown>,
        }];
    });
}

/**
 * Render a patch document through the `din-wasm` audio runtime (graph execution in WebAssembly).
 */
export function PatchRenderer<const TPatch extends PatchDocument>({
    patch,
    includeProvider = true,
    assetRoot,
    midi,
    ...rest
}: PatchRendererProps<TPatch>) {
    const migratedPatch = useMemo(() => {
        const migrated = migratePatchDocument(patch);
        assertNoRecursivePatchInline(migrated);
        return migrated;
    }, [patch]);
    const transportNode = useMemo(
        () => migratedPatch.nodes.find((node) => node.data.type === 'transport'),
        [migratedPatch.nodes]
    );
    const midiOutputBindings = useMemo(
        () => buildMidiOutputBindingList(migratedPatch, midi as PatchMidiBindings<PatchDocument> | undefined),
        [midi, migratedPatch]
    );
    const transportBindings = midiOutputBindings.filter(({ metadata }) => metadata.kind === 'midi-sync-output');

    const content = (
        <PatchWasmBridge
            patch={migratedPatch}
            assetRoot={assetRoot}
            propValues={rest as Record<string, unknown>}
            midi={midi as PatchMidiBindings<PatchDocument> | undefined}
        />
    );

    if (!includeProvider) {
        return content;
    }

    const transportProps = buildTransportProps(transportNode, transportBindings);
    const needsTransportProvider = Boolean(transportNode) || transportBindings.length > 0;

    return (
        <AudioProvider>
            {needsTransportProvider ? (
                <TransportProvider {...transportProps}>
                    {content}
                </TransportProvider>
            ) : (
                content
            )}
        </AudioProvider>
    );
}

/**
 * Create a reusable React component from a patch document.
 */
export function importPatch<const TPatch extends PatchDocument>(
    patch: TPatch,
    options: ImportPatchOptions = {}
) {
    const migratedPatch = migratePatchDocument(patch);

    const includeProvider = options.includeProvider ?? true;

    const ImportedPatch = (props: PatchProps<TPatch>) => (
        <PatchRenderer
            patch={migratedPatch as TPatch}
            includeProvider={includeProvider}
            assetRoot={options.assetRoot}
            {...props}
        />
    );

    const patchName = typeof migratedPatch.name === 'string' && migratedPatch.name.trim() ? migratedPatch.name.trim() : 'Patch';
    ImportedPatch.displayName = `${patchName.replace(/[^a-zA-Z0-9]+/g, '') || 'Patch'}Component`;

    return ImportedPatch;
}
