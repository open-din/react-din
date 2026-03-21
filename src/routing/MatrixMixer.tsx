import { useEffect, useMemo, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import type { MatrixMixerProps } from './types';

interface MatrixRefs {
    input: GainNode;
    output: GainNode;
    splitter?: ChannelSplitterNode;
    merger?: ChannelMergerNode;
    cells: GainNode[][];
}

const clampMatrixSize = (value: number | undefined, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(2, Math.min(8, Math.floor(Number(value))));
};

function getCellValue(matrix: number[][] | undefined, row: number, column: number): number {
    const rowValue = matrix?.[row];
    const value = Array.isArray(rowValue) ? rowValue[column] : undefined;
    return Number.isFinite(value) ? Number(value) : (row === column ? 1 : 0);
}

export const MatrixMixer: FC<MatrixMixerProps> = ({
    children,
    bypass = false,
    inputs = 4,
    outputs = 4,
    matrix,
    smoothingTime = 0.01,
    nodeRef: externalRef,
}) => {
    const { context } = useAudio();
    const { outputNode } = useAudioOut();

    const inputCount = clampMatrixSize(inputs, 4);
    const outputCount = clampMatrixSize(outputs, 4);

    const refs = useRef<MatrixRefs | null>(null);

    const safeMatrix = useMemo(
        () => Array.from({ length: inputCount }, (_, row) =>
            Array.from({ length: outputCount }, (_, column) => getCellValue(matrix, row, column))
        ),
        [inputCount, outputCount, matrix]
    );

    useEffect(() => {
        if (!context || !outputNode) return;

        const input = context.createGain();
        const output = context.createGain();
        const cells: GainNode[][] = Array.from({ length: inputCount }, () => []);

        if (
            typeof context.createChannelSplitter === 'function'
            && typeof context.createChannelMerger === 'function'
        ) {
            const splitter = context.createChannelSplitter(inputCount);
            const merger = context.createChannelMerger(outputCount);
            input.connect(splitter);

            for (let row = 0; row < inputCount; row++) {
                for (let column = 0; column < outputCount; column++) {
                    const gain = context.createGain();
                    gain.gain.value = bypass ? 0 : safeMatrix[row][column];
                    splitter.connect(gain, row, 0);
                    gain.connect(merger, 0, column);
                    cells[row][column] = gain;
                }
            }
            merger.connect(output);
            refs.current = { input, output, splitter, merger, cells };
        } else {
            input.connect(output);
            refs.current = { input, output, cells };
        }

        output.connect(outputNode);

        if (externalRef) {
            (externalRef as React.MutableRefObject<GainNode | null>).current = output;
        }

        return () => {
            try { input.disconnect(); } catch { /* noop */ }
            try { refs.current?.splitter?.disconnect(); } catch { /* noop */ }
            try { refs.current?.merger?.disconnect(); } catch { /* noop */ }
            try { output.disconnect(); } catch { /* noop */ }
            cells.forEach((row) => row.forEach((gain) => {
                try { gain.disconnect(); } catch { /* noop */ }
            }));
            refs.current = null;
            if (externalRef) {
                (externalRef as React.MutableRefObject<GainNode | null>).current = null;
            }
        };
    }, [context, outputNode, inputCount, outputCount, bypass, externalRef]);

    useEffect(() => {
        if (!refs.current || !context) return;
        refs.current.cells.forEach((row, rowIndex) => {
            row.forEach((gain, columnIndex) => {
                const next = bypass ? 0 : safeMatrix[rowIndex][columnIndex];
                gain.gain.setTargetAtTime(next, context.currentTime, Math.max(0.001, smoothingTime));
            });
        });
    }, [context, safeMatrix, bypass, smoothingTime]);

    return (
        <AudioOutProvider node={bypass ? outputNode : refs.current?.input ?? null}>
            {children}
        </AudioOutProvider>
    );
};
