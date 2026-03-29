import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type AnalyzerNodeData } from '../store';
import { audioEngine } from '../AudioEngine';

const fftSizes = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

const AnalyzerNode = memo(({ id, data, selected }: NodeProps) => {
    const analyzerData = data as AnalyzerNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const handleChange = (key: keyof AnalyzerNodeData, value: number | boolean) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node analyzer-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#7bd1ff', color: '#072033' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">📊</span>
                    <span className="node-title">Analyzer</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>FFT Size</label>
                    <select value={analyzerData.fftSize} onChange={(e) => handleChange('fftSize', Number(e.target.value))}>
                        {fftSizes.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
                <div className="node-control">
                    <label>Smoothing</label>
                    <input type="range" min="0" max="1" step="0.01" value={analyzerData.smoothingTimeConstant} onChange={(e) => handleChange('smoothingTimeConstant', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label>Update Rate</label>
                    <input type="number" min="1" max="240" value={analyzerData.updateRate} onChange={(e) => handleChange('updateRate', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={analyzerData.autoUpdate} onChange={(e) => handleChange('autoUpdate', e.target.checked)} />
                        Auto update
                    </label>
                </div>
            </div>
        </div>
    );
});

AnalyzerNode.displayName = 'AnalyzerNode';
export default AnalyzerNode;
