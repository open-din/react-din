import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAudioGraphStore, type SamplerNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { addAssetFromFile, getAssetObjectUrl, listAssets, subscribeAssets, type AudioLibraryAsset } from '../audioLibrary';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import '../editor.css';

export const SamplerNode: React.FC<NodeProps<Node<SamplerNodeData>>> = memo(({ id, data, selected }) => {
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const playbackRateConnection = useTargetHandleConnection(id, 'playbackRate');
    const detuneConnection = useTargetHandleConnection(id, 'detune');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [libraryAssets, setLibraryAssets] = useState<AudioLibraryAsset[]>([]);
    const [libraryQuery, setLibraryQuery] = useState('');
    const [libraryError, setLibraryError] = useState<string | null>(null);
    const externalAssetPath = typeof data.assetPath === 'string' ? data.assetPath.trim() : '';

    const selectedSampleId = typeof data.sampleId === 'string' ? data.sampleId : '';

    const refreshAssets = useCallback(() => {
        listAssets()
            .then((assets) => setLibraryAssets(assets))
            .catch(() => setLibraryAssets([]));
    }, []);

    useEffect(() => {
        refreshAssets();
        return subscribeAssets(refreshAssets);
    }, [refreshAssets]);

    const filteredAssets = useMemo(() => {
        const query = libraryQuery.trim().toLowerCase();
        if (!query) return libraryAssets;
        return libraryAssets.filter((asset) => asset.name.toLowerCase().includes(query));
    }, [libraryAssets, libraryQuery]);

    const applyAssetSelection = useCallback(async (assetId: string, fallbackName?: string) => {
        if (!assetId) {
            updateNodeData(id, {
                src: '',
                assetPath: '',
                sampleId: '',
                fileName: '',
                loaded: false,
            });
            setLibraryError(null);
            return;
        }

        const objectUrl = await getAssetObjectUrl(assetId);
        if (!objectUrl) {
            setLibraryError('Failed to read cached asset.');
            updateNodeData(id, { loaded: false });
            return;
        }

        const asset = libraryAssets.find((entry) => entry.id === assetId);
        updateNodeData(id, {
            src: objectUrl,
            assetPath: externalAssetPath || (asset?.name ? `/samples/${asset.name}` : undefined),
            sampleId: assetId,
            fileName: asset?.name || fallbackName || data.fileName || 'Cached sample',
            loaded: true,
        });
        setLibraryError(null);
        audioEngine.loadSamplerBuffer(id, objectUrl);
    }, [data.fileName, id, libraryAssets, updateNodeData]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        addAssetFromFile(file)
            .then((asset) => applyAssetSelection(asset.id, asset.name))
            .catch(() => {
                setLibraryError('Failed to cache file.');
                updateNodeData(id, { loaded: false });
            })
            .finally(() => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            });
    }, [applyAssetSelection, id, updateNodeData]);

    const handleLibrarySelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        void applyAssetSelection(event.target.value);
    }, [applyAssetSelection]);

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handlePlayClick = useCallback(() => {
        if (!data.src) return;

        if (isPlaying) {
            audioEngine.stopSampler(id);
            setIsPlaying(false);
        } else {
            audioEngine.playSampler(id, data);
            setIsPlaying(true);
        }
    }, [id, data, isPlaying]);

    const handleLoop = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { loop: e.target.checked });
    }, [id, updateNodeData]);

    const handlePlaybackRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const rate = parseFloat(e.target.value);
        updateNodeData(id, { playbackRate: rate });
        audioEngine.updateSamplerParam(id, 'playbackRate', rate);
    }, [id, updateNodeData]);

    const handleDetune = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const detune = parseFloat(e.target.value);
        updateNodeData(id, { detune });
        audioEngine.updateSamplerParam(id, 'detune', detune);
    }, [id, updateNodeData]);

    useEffect(() => {
        setIsPlaying(false);
    }, [data.src]);

    useEffect(() => {
        const unsubscribe = audioEngine.onSamplerEnd(id, () => {
            setIsPlaying(false);
        });
        return unsubscribe;
    }, [id]);

    const fileLabel = data.fileName || (data.src ? 'Loaded' : 'No file selected');

    return (
        <div className={`audio-node sampler-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ background: '#44ccff', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">🎹</span>
                    <span className="node-title">{data.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#fff', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" />
                </div>
            </div>

            <div className="node-content">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    title="Select audio file"
                />

                <div className="node-control">
                    <label>Audio File</label>
                    <button
                        onClick={handleBrowseClick}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px dashed #555',
                            background: '#2a2a3e',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '11px',
                        }}
                    >
                        📁 Upload...
                    </button>
                </div>

                <div className="node-control">
                    <label>Library</label>
                    <input
                        type="text"
                        value={libraryQuery}
                        onChange={(event) => setLibraryQuery(event.target.value)}
                        placeholder="Search assets"
                        title="Search audio assets"
                    />
                    <select
                        value={selectedSampleId}
                        onChange={handleLibrarySelect}
                        title="Select cached sample"
                    >
                        <option value="">Select cached file</option>
                        {filteredAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>{asset.name}</option>
                        ))}
                    </select>
                </div>

                <div className="node-control" style={{ fontSize: '10px', color: data.src ? '#44cc44' : '#888' }}>
                    {data.src ? `✅ ${fileLabel}` : '⚪ No file selected'}
                </div>

                {!data.src && externalAssetPath && (
                    <div className="node-control" style={{ fontSize: '10px', color: '#ffcc66' }}>
                        External patch asset: {externalAssetPath}
                    </div>
                )}

                {libraryError && (
                    <div className="node-control" style={{ fontSize: '10px', color: '#ff6b6b' }}>
                        {libraryError}
                    </div>
                )}

                <div className="node-control">
                    <button
                        onClick={handlePlayClick}
                        disabled={!data.src}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: 'none',
                            background: isPlaying ? '#ff4466' : (data.src ? '#22cc66' : '#444'),
                            color: '#fff',
                            cursor: data.src ? 'pointer' : 'not-allowed',
                            fontSize: '12px',
                            fontWeight: 'bold',
                        }}
                    >
                        {isPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>
                </div>

                <div className="node-control">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            checked={data.loop}
                            onChange={handleLoop}
                        />
                        Loop
                    </label>
                </div>

                <div className="node-control">
                    <label>Speed</label>
                    {playbackRateConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(playbackRateConnection.value, (value) => `${value.toFixed(2)}x`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0.25"
                            max="4"
                            step="0.01"
                            value={data.playbackRate}
                            onChange={handlePlaybackRate}
                            title="Playback rate"
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="playbackRate" className="handle handle-in handle-param" />
                </div>

                <div className="node-control">
                    <label>Detune</label>
                    {detuneConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(detuneConnection.value, (value) => `${Math.round(value)}¢`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="-1200"
                            max="1200"
                            step="10"
                            value={data.detune}
                            onChange={handleDetune}
                            title="Detune in cents"
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="detune" className="handle handle-in handle-param" />
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Left}
                id="trigger"
                className="handle handle-in handle-trigger"
                style={{ top: '50%' }}
            />
        </div>
    );
});

SamplerNode.displayName = 'SamplerNode';
export default SamplerNode;
