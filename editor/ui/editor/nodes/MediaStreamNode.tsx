import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type MediaStreamNodeData } from '../store';
import { audioEngine } from '../AudioEngine';

const MediaStreamNode = memo(({ id, data, selected }: NodeProps) => {
    const mediaData = data as MediaStreamNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const handleToggleRequestMic = (requestMic: boolean) => {
        updateNodeData(id, { requestMic });
        audioEngine.updateNode(id, { requestMic });
    };

    return (
        <div className={`audio-node media-stream-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#7bd1ff', color: '#072033' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">🎙️</span>
                    <span className="node-title">Media Stream</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={mediaData.requestMic} onChange={(e) => handleToggleRequestMic(e.target.checked)} />
                        Request microphone
                    </label>
                </div>
                <div className="node-control" style={{ fontSize: '10px', color: '#8aa0c0' }}>
                    Browser permissions are required.
                </div>
            </div>
        </div>
    );
});

MediaStreamNode.displayName = 'MediaStreamNode';
export default MediaStreamNode;
