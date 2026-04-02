import type { SVGProps } from 'react';
import type { EditorNodeType } from '../nodeCatalog';

type IconName =
    | EditorNodeType
    | 'play'
    | 'stop'
    | 'chevronDown'
    | 'status';

interface EditorIconProps extends SVGProps<SVGSVGElement> {
    name: IconName;
}

function BaseIcon({ children, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    );
}

export function EditorIcon({ name, ...props }: EditorIconProps) {
    switch (name) {
        case 'gain':
            return (
                <BaseIcon {...props}>
                    <path d="M8 5v14" />
                    <path d="M16 5v14" />
                    <path d="M5 9h6" />
                    <path d="M13 15h6" />
                    <circle cx="11" cy="9" r="1.8" />
                    <circle cx="13" cy="15" r="1.8" />
                </BaseIcon>
            );
        case 'filter':
        case 'eq3':
            return (
                <BaseIcon {...props}>
                    <path d="M4 17c3.2 0 4.1-10 8-10 3.2 0 4.3 6 8 6" />
                    <path d="M4 19h16" opacity="0.45" />
                </BaseIcon>
            );
        case 'output':
        case 'mixer':
        case 'auxSend':
        case 'auxReturn':
        case 'matrixMixer':
            return (
                <BaseIcon {...props}>
                    <path d="M5 14h3l4 3V7l-4 3H5z" />
                    <path d="M16 9c1.5 1 2.5 2.4 2.5 4s-1 3-2.5 4" />
                    <path d="M18.5 6.5C21 8.2 22 10.4 22 13s-1 4.8-3.5 6.5" />
                </BaseIcon>
            );
        case 'stepSequencer':
            return (
                <BaseIcon {...props}>
                    <rect x="4" y="13" width="3" height="7" rx="1" />
                    <rect x="9" y="8" width="3" height="12" rx="1" />
                    <rect x="14" y="11" width="3" height="9" rx="1" />
                    <rect x="19" y="6" width="3" height="14" rx="1" />
                </BaseIcon>
            );
        case 'pianoRoll':
            return (
                <BaseIcon {...props}>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M8 9h4" />
                    <path d="M7 13h6" />
                    <path d="M13 11h4" />
                    <path d="M4 9h16" opacity="0.35" />
                    <path d="M4 13h16" opacity="0.35" />
                </BaseIcon>
            );
        case 'transport':
        case 'play':
            return (
                <BaseIcon {...props}>
                    <path d="M9 7.5v9l7-4.5z" fill="currentColor" stroke="none" />
                </BaseIcon>
            );
        case 'stop':
            return (
                <BaseIcon {...props}>
                    <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
                </BaseIcon>
            );
        case 'chevronDown':
            return (
                <BaseIcon {...props}>
                    <path d="M7 10l5 5 5-5" />
                </BaseIcon>
            );
        case 'status':
            return (
                <BaseIcon {...props}>
                    <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
                </BaseIcon>
            );
        case 'midiNote':
        case 'midiCC':
        case 'midiNoteOutput':
        case 'midiCCOutput':
        case 'midiSync':
            return (
                <BaseIcon {...props}>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M8 5v14" />
                    <path d="M12 10v9" />
                    <path d="M16 5v14" />
                </BaseIcon>
            );
        case 'note':
        case 'voice':
            return (
                <BaseIcon {...props}>
                    <path d="M15 5v9.5a3.5 3.5 0 1 1-2-3.2V7.4l6-1.6v7.7a3.5 3.5 0 1 1-2-3.2V5z" />
                </BaseIcon>
            );
        case 'osc':
        case 'lfo':
        case 'noise':
        case 'noiseBurst':
        case 'phaser':
        case 'flanger':
        case 'tremolo':
        case 'chorus':
        case 'waveShaper':
            return (
                <BaseIcon {...props}>
                    <path d="M3 12c2.2 0 2.8-6 5-6s2.8 12 5 12 2.8-12 5-12 2.8 6 3 6" />
                </BaseIcon>
            );
        case 'delay':
        case 'reverb':
        case 'convolver':
            return (
                <BaseIcon {...props}>
                    <path d="M5 7h10" />
                    <path d="M5 12h14" />
                    <path d="M5 17h8" />
                    <path d="M16 5l3 2-3 2" />
                </BaseIcon>
            );
        case 'compressor':
        case 'distortion':
            return (
                <BaseIcon {...props}>
                    <path d="M4 15c2-5 4-5 6 0s4 5 6 0 4-5 4-5" />
                    <path d="M4 9h16" opacity="0.35" />
                </BaseIcon>
            );
        case 'sampler':
        case 'mediaStream':
            return (
                <BaseIcon {...props}>
                    <rect x="8" y="4.5" width="8" height="11" rx="3.5" />
                    <path d="M6 11.5a6 6 0 0 0 12 0" />
                    <path d="M12 18v2" />
                    <path d="M9 20h6" />
                </BaseIcon>
            );
        case 'adsr':
            return (
                <BaseIcon {...props}>
                    <path d="M4 18l4-10 3 5 4-2 5 7" />
                </BaseIcon>
            );
        case 'panner':
        case 'panner3d':
            return (
                <BaseIcon {...props}>
                    <path d="M5 12h14" />
                    <path d="M8 8l-4 4 4 4" />
                    <path d="M16 8l4 4-4 4" />
                </BaseIcon>
            );
        case 'analyzer':
            return (
                <BaseIcon {...props}>
                    <path d="M5 18V9" />
                    <path d="M10 18V6" />
                    <path d="M15 18v-4" />
                    <path d="M20 18V8" />
                </BaseIcon>
            );
        case 'constantSource':
        case 'input':
        case 'uiTokens':
        case 'eventTrigger':
            return (
                <BaseIcon {...props}>
                    <path d="M6 9h12" />
                    <path d="M6 15h7" />
                    <circle cx="17.5" cy="15" r="2.5" />
                </BaseIcon>
            );
        case 'math':
        case 'compare':
        case 'mix':
        case 'clamp':
        case 'switch':
            return (
                <BaseIcon {...props}>
                    <path d="M6 8h12" />
                    <path d="M9 12h6" />
                    <path d="M8 16h8" />
                </BaseIcon>
            );
        default:
            return (
                <BaseIcon {...props}>
                    <rect x="5" y="5" width="14" height="14" rx="3" />
                </BaseIcon>
            );
    }
}

interface EditorNodeIconProps extends Omit<EditorIconProps, 'name'> {
    type: EditorNodeType;
}

export function EditorNodeIcon({ type, ...props }: EditorNodeIconProps) {
    return <EditorIcon name={type} {...props} />;
}
