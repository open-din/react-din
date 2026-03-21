import React, { useCallback, useState } from 'react';
import { useAudioGraphStore, type AudioNodeData, type InputNodeData, type InputParam, type UiTokensNodeData } from './store';

import { CodeGenerator } from './CodeGenerator';

const Inspector: React.FC = () => {
    const nodes = useAudioGraphStore((s) => s.nodes);
    const selectedNodeId = useAudioGraphStore((s) => s.selectedNodeId);
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    const nodeData = selectedNode?.data as AudioNodeData | undefined;
    const isParamEditorNode = nodeData?.type === 'input' || nodeData?.type === 'uiTokens';
    const paramEditorData = isParamEditorNode ? (nodeData as InputNodeData | UiTokensNodeData) : null;

    const [newParamName, setNewParamName] = useState('');

    const handleAddParam = useCallback(() => {
        if (!selectedNodeId || !newParamName.trim()) return;
        if (!paramEditorData) return;
        const params = [...(paramEditorData.params || [])];
        const trimmedName = newParamName.trim();

        params.push({
            id: crypto.randomUUID(),
            name: trimmedName,
            type: 'float',
            value: 0,
            defaultValue: 0,
            min: 0,
            max: nodeData?.type === 'uiTokens' ? 9999 : 1,
            label: trimmedName,
        });

        updateNodeData(selectedNodeId, { params });
        setNewParamName('');
    }, [selectedNodeId, newParamName, paramEditorData, updateNodeData]);

    const handleUpdateParam = (index: number, updates: Partial<InputParam>) => {
        if (!selectedNodeId) return;
        if (!paramEditorData) return;
        const params = [...(paramEditorData.params || [])];
        params[index] = { ...params[index], ...updates };
        // If label changes, update name too? Or keep them separate.
        // For now, let's keep them somewhat synced or allow detailed editing.
        updateNodeData(selectedNodeId, { params });
    };

    const handleRemoveParam = (index: number) => {
        if (!selectedNodeId) return;
        if (!paramEditorData) return;
        const params = [...(paramEditorData.params || [])];
        params.splice(index, 1);
        updateNodeData(selectedNodeId, { params });
    };



    if (!selectedNode || !nodeData) {
        return <CodeGenerator />;
    }

    return (
        <div className="flex h-full flex-col bg-[var(--panel-bg)] text-[11px] text-[var(--text)]">
            <div className="border-b border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3">
                <h3 className="text-[12px] font-semibold text-[var(--text)]">
                    {nodeData.label || selectedNode.type}
                </h3>
                <span className="text-[9px] text-[var(--text-subtle)]">{selectedNode.id}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Param/Token Node Specific Controls */}
                {isParamEditorNode && paramEditorData && (
                    <div className="mb-6">
                        <h4 className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                            {nodeData.type === 'uiTokens' ? 'Tokens' : 'Params'}
                        </h4>
                        <div className="flex flex-col gap-3">
                            {paramEditorData.params.map((param, index) => (
                                <div key={param.id} className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent text-[11px] font-semibold text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none"
                                            value={param.label || param.name}
                                            onChange={(e) => handleUpdateParam(index, { label: e.target.value, name: e.target.value })}
                                        />
                                        <button
                                            className="text-[12px] text-[var(--text-subtle)] transition hover:text-[var(--danger)]"
                                            onClick={() => handleRemoveParam(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <label className="flex-1 text-[10px] text-[var(--text-muted)]">Default</label>
                                            <input
                                                type="number"
                                                value={param.defaultValue}
                                                onChange={(e) => handleUpdateParam(index, { defaultValue: Number(e.target.value), value: Number(e.target.value) })}
                                                step="0.01"
                                                className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="flex-1 text-[10px] text-[var(--text-muted)]">Min</label>
                                            <input
                                                type="number"
                                                value={param.min}
                                                onChange={(e) => handleUpdateParam(index, { min: Number(e.target.value) })}
                                                step="0.01"
                                                className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="flex-1 text-[10px] text-[var(--text-muted)]">Max</label>
                                            <input
                                                type="number"
                                                value={param.max}
                                                onChange={(e) => handleUpdateParam(index, { max: Number(e.target.value) })}
                                                step="0.01"
                                                className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="flex-1 text-[10px] text-[var(--text-muted)]">Current</label>
                                            <input
                                                type="range"
                                                min={param.min}
                                                max={param.max}
                                                step="0.01"
                                                value={param.value}
                                                onChange={(e) => handleUpdateParam(index, { value: Number(e.target.value) })}
                                                className="flex-[2] accent-[var(--accent)]"
                                            />
                                            <span className="w-8 text-right text-[10px] text-[var(--accent)]">{param.value.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <input
                                type="text"
                                placeholder={nodeData.type === 'uiTokens' ? 'New token name...' : 'New param name...'}
                                value={newParamName}
                                onChange={(e) => setNewParamName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddParam()}
                                className="h-8 flex-1 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[11px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:outline-none"
                            />
                            <button
                                onClick={handleAddParam}
                                className="h-8 w-8 rounded border border-[var(--panel-border)] text-[11px] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            >
                                +
                            </button>
                        </div>
                    </div>
                )}

                {/* Transport Node Specific Controls */}
                {nodeData.type === 'transport' && (
                    <div className="mb-6">
                        <h4 className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                            Transport Controls
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">Playing</label>
                                <input
                                    type="checkbox"
                                    checked={(nodeData as any).playing}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { playing: e.target.checked })}
                                    className="accent-[var(--accent)]"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">BPM</label>
                                <input
                                    type="number"
                                    value={(nodeData as any).bpm}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { bpm: Number(e.target.value) })}
                                    min={40}
                                    max={240}
                                    className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">Beats / Bar</label>
                                <input
                                    type="number"
                                    value={(nodeData as any).beatsPerBar ?? 4}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { beatsPerBar: Number(e.target.value) })}
                                    min={1}
                                    max={16}
                                    className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">Beat Unit</label>
                                <input
                                    type="number"
                                    value={(nodeData as any).beatUnit ?? 4}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { beatUnit: Number(e.target.value) })}
                                    min={1}
                                    max={16}
                                    className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">Steps / Beat</label>
                                <input
                                    type="number"
                                    value={(nodeData as any).stepsPerBeat ?? 4}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { stepsPerBeat: Number(e.target.value) })}
                                    min={1}
                                    max={16}
                                    className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">Bars / Phrase</label>
                                <input
                                    type="number"
                                    value={(nodeData as any).barsPerPhrase ?? 4}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { barsPerPhrase: Number(e.target.value) })}
                                    min={1}
                                    max={16}
                                    className="h-7 w-16 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 text-[10px] text-[var(--text-muted)]">Swing</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={(nodeData as any).swing ?? 0}
                                    onChange={(e) => updateNodeData(selectedNodeId!, { swing: Number(e.target.value) })}
                                    className="flex-[2] accent-[var(--accent)]"
                                />
                                <span className="w-8 text-right text-[10px] text-[var(--accent)]">{((nodeData as any).swing ?? 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Common Properties */}
                <div className="mb-4">
                    <h4 className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                        Node Properties
                    </h4>
                    {(nodeData as any).label !== undefined && (
                        <div className="flex items-center gap-2">
                            <label className="flex-1 text-[10px] text-[var(--text-muted)]">Label</label>
                            <input
                                type="text"
                                value={nodeData.label}
                                onChange={(e) => updateNodeData(selectedNodeId!, { label: e.target.value })}
                                className="h-8 flex-1 rounded border border-[var(--panel-border)] bg-[var(--control-bg)] px-2 text-[11px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Inspector;
