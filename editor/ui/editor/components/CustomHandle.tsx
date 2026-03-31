import React, { memo, useMemo } from 'react';
import { Handle, type HandleProps, useNodeId } from '@xyflow/react';
import { useAudioGraphStore } from '../store';
import { canConnect, normalizeConnectionFromStart } from '../nodeHelpers';

export const CustomHandle = memo((props: HandleProps) => {
    const { id: handleId, type: handleType, className = '' } = props;
    const nodeId = useNodeId();
    const connectionAssist = useAudioGraphStore((s) => s.connectionAssist);
    const nodes = useAudioGraphStore((s) => s.nodes);
    
    const isCompatible = useMemo(() => {
        if (!connectionAssist || !nodeId) return false;
        
        // If we are the node that started the connection, we are not a compatible TARGET
        if (connectionAssist.nodeId === nodeId) return false;

        // Create a candidate connection from the start to this handle
        const connection = normalizeConnectionFromStart(connectionAssist, {
            nodeId,
            handleId: handleId ?? null,
            handleType: handleType,
        });

        if (!connection) return false;

        // Use a lookup for nodes for the canConnect check
        const nodeById = new Map(nodes.map(n => [n.id, n]));
        return canConnect(connection, nodeById);
    }, [connectionAssist, nodeId, handleId, handleType, nodes]);

    return (
        <Handle
            {...props}
            className={`${className} ${isCompatible ? 'connection-assist-handle' : ''}`}
        />
    );
});

CustomHandle.displayName = 'CustomHandle';
