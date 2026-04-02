import type { ReactNode } from 'react';
import { SHELL_LAYOUT } from './shellTokens';

interface EditorShellProps {
    rail: ReactNode;
    leftPanel: ReactNode;
    canvas: ReactNode;
    bottomDrawer: ReactNode;
    rightPanel: ReactNode;
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
    leftPanelWidth: number;
    rightPanelWidth: number;
}

export function EditorShell({
    rail,
    leftPanel,
    canvas,
    bottomDrawer,
    rightPanel,
    leftPanelCollapsed,
    rightPanelCollapsed,
    leftPanelWidth,
    rightPanelWidth,
}: EditorShellProps) {
    return (
        <div className="ui-shell relative h-full w-full overflow-hidden text-[var(--text)]">
            <div className="absolute inset-0 z-0">
                {canvas}
            </div>

            <div className="absolute z-10 bottom-4 left-0 right-0 pointer-events-none flex justify-center">
                <div className="pointer-events-auto w-full max-w-[calc(100vw-var(--component-rail-width)-var(--component-inspector-width)-80px)] px-4">
                    {bottomDrawer}
                </div>
            </div>

            <div 
                className="absolute z-20 bottom-4 left-4 flex pointer-events-none ui-panel overflow-hidden transition-all duration-300"
                style={{ top: SHELL_LAYOUT.sidebarTopOffset }}
            >
                <div 
                    className="pointer-events-auto border-r border-[var(--panel-border)]/40 bg-[var(--panel-muted)]/20"
                    style={{ width: SHELL_LAYOUT.railWidth }}
                >
                    {rail}
                </div>
                <div 
                    className="pointer-events-auto min-w-0 transition-all duration-300" 
                    style={{ 
                        width: leftPanelCollapsed ? 0 : leftPanelWidth, 
                        opacity: leftPanelCollapsed ? 0 : 1,
                        visibility: leftPanelCollapsed ? 'hidden' : 'visible'
                    }}
                >
                    {leftPanel}
                </div>
            </div>

            <div 
                className="absolute z-20 bottom-4 right-4 pointer-events-none flex"
                style={{ top: SHELL_LAYOUT.sidebarTopOffset }}
            >
                <div 
                    className="pointer-events-auto ui-panel min-h-0 overflow-hidden transition-all duration-300" 
                    style={{ width: rightPanelCollapsed ? 0 : rightPanelWidth, opacity: rightPanelCollapsed ? 0 : 1 }}
                >
                    {rightPanel}
                </div>
            </div>
        </div>
    );
}
