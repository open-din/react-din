import { useMcpBridgeStatus } from './status';

function statusLabel(phase: ReturnType<typeof useMcpBridgeStatus>['phase']) {
    switch (phase) {
        case 'active':
            return 'MCP Active';
        case 'connecting':
        case 'discovering':
            return 'MCP Connecting';
        case 'error':
            return 'MCP Error';
        case 'offline':
        default:
            return 'MCP Offline';
    }
}

function statusClassName(phase: ReturnType<typeof useMcpBridgeStatus>['phase']) {
    switch (phase) {
        case 'active':
            return 'ui-mcp-indicator ui-mcp-indicator--active';
        case 'connecting':
        case 'discovering':
            return 'ui-mcp-indicator ui-mcp-indicator--connecting';
        case 'error':
            return 'ui-mcp-indicator ui-mcp-indicator--error';
        case 'offline':
        default:
            return 'ui-mcp-indicator ui-mcp-indicator--offline';
    }
}

function titleText(status: ReturnType<typeof useMcpBridgeStatus>) {
    const details = [
        status.message,
        status.sessionId ? `Session: ${status.sessionId}` : null,
        status.bridgeUrl ? `Bridge: ${status.bridgeUrl}` : null,
        status.serverVersion ? `Server: ${status.serverVersion}` : null,
        status.certificateFingerprint256 ? `TLS: ${status.certificateFingerprint256}` : null,
        status.readOnly ? 'Mode: read-only' : null,
    ].filter(Boolean);

    return details.join('\n');
}

export function McpStatusBadge() {
    const status = useMcpBridgeStatus();
    const label = statusLabel(status.phase);

    return (
        <div
            className={statusClassName(status.phase)}
            aria-label="MCP connection status"
            aria-live="polite"
            title={titleText(status)}
        >
            <span className="ui-mcp-indicator-dot" aria-hidden="true" />
            <span>{label}</span>
            {status.readOnly && status.phase === 'active' ? (
                <span className="ui-mcp-indicator-meta">RO</span>
            ) : null}
        </div>
    );
}
