import type { ReactNode } from 'react';
import { SHELL_LAYOUT } from './shellTokens';

interface FooterStatusProps {
    gitLabel: string;
    audioLabel: string;
}

export function FooterStatus({ gitLabel, audioLabel }: FooterStatusProps) {
    return (
        <footer
            className="flex items-center justify-between gap-3 border-t border-[var(--panel-border)] bg-[color-mix(in_oklab,var(--panel-bg)_90%,transparent)] px-3"
            style={{ height: `${SHELL_LAYOUT.footerHeight}px` }}
            data-testid="editor-footer"
        >
            <div className="min-w-0">
                <span className="inline-flex min-w-0 items-center px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                    <span className="truncate">{gitLabel}</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                    {audioLabel}
                </span>
            </div>
        </footer>
    );
}
