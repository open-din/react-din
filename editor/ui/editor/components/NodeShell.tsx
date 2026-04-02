import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Position } from '@xyflow/react';
import type { EditorNodeType, PaletteCategory } from '../nodeCatalog';
import { getNodeCatalogEntry } from '../nodeCatalog';
import { CustomHandle } from './CustomHandle';
import { EditorIcon } from './EditorIcons';

type NodeCategoryLabel = PaletteCategory | 'MIDI';
type NodeHandleKind = 'audio' | 'control' | 'trigger';

const CATEGORY_LABELS: Record<NodeCategoryLabel, string> = {
    Sources: 'SOURCE',
    Effects: 'EFFECT',
    Routing: 'ROUTING',
    Math: 'MATH',
    MIDI: 'MIDI',
};

const CATEGORY_OVERRIDES: Partial<Record<EditorNodeType, NodeCategoryLabel>> = {
    stepSequencer: 'MIDI',
    pianoRoll: 'MIDI',
    midiNote: 'MIDI',
    midiCC: 'MIDI',
    midiNoteOutput: 'MIDI',
    midiCCOutput: 'MIDI',
    midiSync: 'MIDI',
};

function getCategoryLabel(nodeType: EditorNodeType): string {
    const category = CATEGORY_OVERRIDES[nodeType] ?? getNodeCatalogEntry(nodeType).category;
    return CATEGORY_LABELS[category];
}

function getHandleClassName(kind: NodeHandleKind, direction: 'source' | 'target'): string {
    const base = direction === 'source' ? 'handle handle-out' : 'handle handle-in';
    const kindClass = kind === 'audio'
        ? 'handle-audio'
        : kind === 'trigger'
            ? 'handle-trigger'
            : 'handle-param';
    return `${base} ${kindClass}`;
}

interface NodeShellProps {
    nodeType: EditorNodeType;
    title: string;
    selected?: boolean;
    badge?: ReactNode;
    className?: string;
    children: ReactNode;
}

export function NodeShell({ nodeType, title, selected = false, badge, className = '', children }: NodeShellProps) {
    return (
        <div className={`audio-node node-shell ${nodeType}-node ${selected ? 'selected' : ''} ${className}`.trim()}>
            <div className="node-header node-shell__header">
                <div className="node-shell__header-group">
                    <span className="node-shell__header-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                    </span>
                    <span className="node-shell__header-category">{getCategoryLabel(nodeType)}</span>
                </div>
                <span className="node-shell__header-title">{title}</span>
                {badge ? <div className="node-shell__header-badge">{badge}</div> : <span className="node-shell__header-spacer" aria-hidden="true" />}
            </div>
            <div className="node-shell__body">
                {children}
            </div>
        </div>
    );
}

interface NodeHandleRowProps {
    direction: 'source' | 'target';
    label: string;
    handleId?: string;
    handleKind?: NodeHandleKind;
    trailing?: ReactNode;
    className?: string;
}

export function NodeHandleRow({
    direction,
    label,
    handleId,
    handleKind = 'audio',
    trailing,
    className = '',
}: NodeHandleRowProps) {
    const isSource = direction === 'source';

    return (
        <div className={`node-shell__row node-shell__row--${direction} ${className}`.trim()}>
            {!isSource && handleId ? (
                <CustomHandle
                    type="target"
                    position={Position.Left}
                    id={handleId}
                    className={getHandleClassName(handleKind, 'target')}
                />
            ) : null}
            <span className={`node-shell__row-label ${isSource ? 'node-shell__row-label--source' : ''}`}>{label}</span>
            {trailing ? <div className="node-shell__row-trailing">{trailing}</div> : null}
            {isSource && handleId ? (
                <CustomHandle
                    type="source"
                    position={Position.Right}
                    id={handleId}
                    className={getHandleClassName(handleKind, 'source')}
                />
            ) : null}
        </div>
    );
}

interface NodeWidgetProps {
    title: ReactNode;
    children: ReactNode;
    className?: string;
    footer?: ReactNode;
}

export function NodeWidget({ title, children, className = '', footer }: NodeWidgetProps) {
    return (
        <div className={`node-shell__widget ${className}`.trim()}>
            <div className="node-shell__widget-title">{title}</div>
            <div className="node-shell__widget-body">{children}</div>
            {footer ? <div className="node-shell__widget-footer">{footer}</div> : null}
        </div>
    );
}

interface NodeWidgetTitleProps {
    icon?: Parameters<typeof EditorIcon>[0]['name'];
    children: ReactNode;
}

export function NodeWidgetTitle({ icon, children }: NodeWidgetTitleProps) {
    return (
        <span className="node-shell__widget-title-content">
            {icon ? <EditorIcon name={icon} className="node-shell__widget-title-icon" /> : null}
            <span>{children}</span>
        </span>
    );
}

interface NodeValueBadgeProps {
    children: ReactNode;
    live?: boolean;
    className?: string;
    dot?: boolean;
}

export function NodeValueBadge({ children, live = false, className = '', dot = live }: NodeValueBadgeProps) {
    return (
        <span className={`node-shell__badge ${live ? 'node-shell__badge--live' : ''} ${className}`.trim()}>
            {dot ? <span className="node-shell__badge-dot" aria-hidden="true" /> : null}
            <span>{children}</span>
        </span>
    );
}

interface NodeNumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (value: number) => void;
}

export function NodeNumberField({ value, onChange, className = '', ...props }: NodeNumberFieldProps) {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(Number(event.target.value));
    };

    return (
        <input
            {...props}
            type="number"
            value={Number.isFinite(value) ? value : 0}
            onChange={handleChange}
            className={`node-shell__field ${className}`.trim()}
        />
    );
}

interface NodeSelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    onChange: (value: string) => void;
    children: ReactNode;
}

export function NodeSelectField({ onChange, children, className = '', ...props }: NodeSelectFieldProps) {
    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        onChange(event.target.value);
    };

    return (
        <span className={`node-shell__select-wrap ${className}`.trim()}>
            <select {...props} onChange={handleChange} className="node-shell__field node-shell__select">
                {children}
            </select>
            <EditorIcon name="chevronDown" className="node-shell__select-icon" />
        </span>
    );
}

export function NodeHelperText({ children }: { children: ReactNode }) {
    return <p className="node-shell__helper-text">{children}</p>;
}
