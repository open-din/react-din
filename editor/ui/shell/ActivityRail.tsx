import type { ReactNode } from 'react';
import { Boxes, FolderTree, LibraryBig, PlayCircle, GitBranch } from 'lucide-react';

interface ActivityRailItem {
    id: string;
    label: string;
    shortLabel: string;
    active: boolean;
    onSelect: () => void;
    badge?: ReactNode;
}

interface ActivityRailProps {
    items: ActivityRailItem[];
}

const ITEM_ICONS: Record<string, typeof FolderTree> = {
    explorer: FolderTree,
    catalog: Boxes,
    library: LibraryBig,
    runtime: PlayCircle,
    review: GitBranch,
};

export function ActivityRail({ items }: ActivityRailProps) {
    return (
        <nav
            className="flex h-full flex-col items-center gap-2 bg-[var(--panel-muted)]/60 px-2 py-3"
            aria-label="Editor activity rail"
            data-testid="activity-rail"
        >
            {items.map((item) => {
                const Icon = ITEM_ICONS[item.id] ?? FolderTree;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={item.onSelect}
                        className={`group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
                            item.active
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_12px_rgba(79,117,255,0.2)]'
                                : 'border-transparent text-[var(--text-subtle)] hover:bg-[var(--panel-bg)] hover:text-[var(--text)]'
                        }`}
                        aria-pressed={item.active}
                        title={item.label}
                    >
                        <Icon 
                            className={`h-5 w-5 transition-transform duration-200 ${item.active ? 'scale-110' : 'group-hover:scale-110'}`} 
                            strokeWidth={item.active ? 2.2 : 1.8} 
                            aria-hidden="true" 
                        />
                        {item.badge && (
                            <div className="absolute -right-1 -top-1 pointer-events-none">
                                {item.badge}
                            </div>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
