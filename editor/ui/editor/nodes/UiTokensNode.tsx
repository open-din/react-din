import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type UiTokensNodeData } from '../store';
import { getInputParamHandleId } from '../nodeHelpers';
import { normalizeUiTokenParams } from '../uiTokens';

const UiTokensNode = memo(({ id, data, selected }: NodeProps<Node<UiTokensNodeData>>) => {
    const updateNodeData = useAudioGraphStore((state) => state.updateNodeData);
    const uiTokensData = data;
    const params = normalizeUiTokenParams(uiTokensData.params);

    const triggerToken = (tokenId: string) => {
        const nextParams = params.map((param) =>
            param.id === tokenId ? { ...param, value: param.value + 1 } : param
        );
        updateNodeData(id, { params: nextParams });
    };

    return (
        <div className={`audio-node ui-tokens-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <div className="header-title">
                    <span className="node-icon">⏱️</span>
                    <span className="node-title">{uiTokensData.label || 'UI Tokens'}</span>
                </div>
            </div>

            <div className="node-content">
                {params.map((param, index) => {
                    const tokenLabel = (param.label || param.name || `Token ${index + 1}`).toUpperCase();

                    return (
                        <div key={param.id} className="node-control ui-token-row">
                            <div className="ui-token-row-inner">
                                <label className="ui-token-label">{tokenLabel}</label>
                                <button
                                    type="button"
                                    className="ui-token-trigger"
                                    onClick={() => triggerToken(param.id)}
                                    aria-label={`Trigger ${param.label || param.name || param.id}`}
                                    data-testid={`ui-token-trigger-${param.id}`}
                                >
                                    ▶
                                </button>
                            </div>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={getInputParamHandleId(param)}
                                className="handle handle-out handle-param"
                            />
                        </div>
                    );
                })}
                {!params.length && (
                    <div className="node-control text-no-outputs">
                        No outputs
                    </div>
                )}
            </div>
        </div>
    );
});

UiTokensNode.displayName = 'UiTokensNode';
export default UiTokensNode;
