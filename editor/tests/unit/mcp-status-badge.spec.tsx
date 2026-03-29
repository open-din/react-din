import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { McpStatusBadge } from '../../bridge/McpStatusBadge';
import { resetMcpBridgeStatus, setMcpBridgeStatus } from '../../bridge/status';

describe('MCP status badge', () => {
    afterEach(() => {
        cleanup();
        resetMcpBridgeStatus();
    });

    it('shows an offline indicator by default', () => {
        render(<McpStatusBadge />);

        const badge = screen.getByLabelText('MCP connection status');
        expect(badge.textContent).toContain('MCP Offline');
        expect(badge.getAttribute('title')).toContain('Waiting for the local MCP bridge.');
    });

    it('shows an active indicator for a live MCP session', () => {
        render(<McpStatusBadge />);

        act(() => {
            setMcpBridgeStatus({
                phase: 'active',
                message: 'Connected to the local MCP bridge and ready for agent control.',
                sessionId: 'session-editor',
                bridgeUrl: 'wss://127.0.0.1:17373/bridge',
                serverVersion: '0.1.0',
                certificateFingerprint256: 'AA:BB:CC',
                readOnly: true,
            });
        });

        const badge = screen.getByLabelText('MCP connection status');
        expect(badge.textContent).toContain('MCP Active');
        expect(badge.textContent).toContain('RO');
        expect(badge.getAttribute('title')).toContain('Session: session-editor');
        expect(badge.getAttribute('title')).toContain('Mode: read-only');
    });
});
