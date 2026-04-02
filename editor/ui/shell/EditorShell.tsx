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

            <div className="absolute z-20 top-4 bottom-4 left-4 flex gap-4 pointer-events-none">
                <div 
                    className="pointer-events-auto min-h-0 bg-[var(--panel-bg)] border border-[var(--panel-border)] shadow-[var(--component-panel-shadow)] rounded-[var(--component-panel-radius)] overflow-hidden"
                    style={{ width: SHELL_LAYOUT.railWidth }}
                >
                    {rail}
                </div>
                <div 
                    className="pointer-events-auto min-h-0 overflow-hidden transition-all duration-300" 
                    style={{ width: leftPanelCollapsed ? 0 : leftPanelWidth, opacity: leftPanelCollapsed ? 0 : 1 }}
                >
                    {leftPanel}
                </div>
            </div>

            <div className="absolute z-20 top-4 bottom-4 right-4 pointer-events-none flex">
                <div 
                    className="pointer-events-auto min-h-0 overflow-hidden transition-all duration-300" 
                    style={{ width: rightPanelCollapsed ? 0 : rightPanelWidth, opacity: rightPanelCollapsed ? 0 : 1 }}
                >
                    {rightPanel}
                </div>
            </div>
        </div>
    );
}
