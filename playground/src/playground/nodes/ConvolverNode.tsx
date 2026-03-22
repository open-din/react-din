import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type ConvolverNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { addAssetFromFile, getAssetObjectUrl, listAssets, subscribeAssets, type AudioLibraryAsset } from '../audioLibrary';

const ConvolverNode = memo(({ id, data, selected }: NodeProps) => {
    const convolverData = data as ConvolverNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [libraryAssets, setLibraryAssets] = useState<AudioLibraryAsset[]>([]);
    const [libraryQuery, setLibraryQuery] = useState('');
    const externalAssetPath = typeof convolverData.assetPath === 'string' ? convolverData.assetPath.trim() : '';

    const selectedImpulseId = typeof convolverData.impulseId === 'string' ? convolverData.impulseId : '';

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

    const applyImpulseUpdate = useCallback((payload: Partial<ConvolverNodeData>) => {
        updateNodeData(id, payload);
        audioEngine.updateNode(id, payload);
    }, [id, updateNodeData]);

    const applyImpulseAsset = useCallback(async (assetId: string, fallbackName?: string) => {
        if (!assetId) {
            setUploadError(null);
            applyImpulseUpdate({
                assetPath: '',
                impulseId: '',
                impulseSrc: '',
                impulseFileName: '',
            });
            return;
        }

        const objectUrl = await getAssetObjectUrl(assetId);
        if (!objectUrl) {
            setUploadError('Failed to read cached asset.');
            return;
        }

        const asset = libraryAssets.find((entry) => entry.id === assetId);
        setUploadError(null);
        applyImpulseUpdate({
            assetPath: externalAssetPath || (asset?.name ? `/impulses/${asset.name}` : undefined),
            impulseId: assetId,
            impulseSrc: objectUrl,
            impulseFileName: asset?.name || fallbackName || convolverData.impulseFileName || 'Impulse',
        });
    }, [applyImpulseUpdate, convolverData.impulseFileName, libraryAssets]);

    const handleNormalizeChange = useCallback((normalize: boolean) => {
        applyImpulseUpdate({ normalize });
    }, [applyImpulseUpdate]);

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadError(null);
        addAssetFromFile(file)
            .then((asset) => applyImpulseAsset(asset.id, asset.name))
            .catch(() => {
                setUploadError('Failed to cache audio file.');
            })
            .finally(() => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            });
    }, [applyImpulseAsset]);

    const handleLibrarySelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        void applyImpulseAsset(event.target.value);
    }, [applyImpulseAsset]);

    const handleClearFile = useCallback(() => {
        setUploadError(null);
        applyImpulseUpdate({
            assetPath: '',
            impulseId: '',
            impulseSrc: '',
            impulseFileName: '',
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [applyImpulseUpdate]);

    const hasImpulse = Boolean(convolverData.impulseSrc);
    const fileLabel = convolverData.impulseFileName || (hasImpulse ? 'Impulse loaded' : 'No file selected');

    return (
        <div className={`audio-node convolver-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#8844ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🧱</span>
                    <span className="node-title">Convolver</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    title="Select impulse response audio file"
                />
                <div className="node-control">
                    <label>Impulse File</label>
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
                        title="Search impulse assets"
                    />
                    <select
                        value={selectedImpulseId}
                        onChange={handleLibrarySelect}
                        title="Select cached impulse response"
                    >
                        <option value="">Select cached file</option>
                        {filteredAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>{asset.name}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control" style={{ fontSize: '10px', color: hasImpulse ? '#44cc44' : '#888' }}>
                    {hasImpulse ? `✅ ${fileLabel}` : '⚪ No file selected'}
                </div>
                {!hasImpulse && externalAssetPath && (
                    <div className="node-control" style={{ fontSize: '10px', color: '#ffcc66' }}>
                        External patch asset: {externalAssetPath}
                    </div>
                )}
                {uploadError && (
                    <div className="node-control" style={{ fontSize: '10px', color: '#ff6b6b' }}>
                        {uploadError}
                    </div>
                )}
                {hasImpulse && (
                    <div className="node-control">
                        <button
                            onClick={handleClearFile}
                            style={{
                                width: '100%',
                                padding: '6px',
                                borderRadius: '4px',
                                border: '1px solid #555',
                                background: '#2a2a3e',
                                color: '#ddd',
                                cursor: 'pointer',
                                fontSize: '10px',
                            }}
                        >
                            Clear file
                        </button>
                    </div>
                )}
                <div className="node-control">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={convolverData.normalize} onChange={(e) => handleNormalizeChange(e.target.checked)} />
                        Normalize
                    </label>
                </div>
            </div>
        </div>
    );
});

ConvolverNode.displayName = 'ConvolverNode';
export default ConvolverNode;
