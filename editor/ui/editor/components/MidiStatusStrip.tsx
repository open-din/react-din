import { type FC } from 'react';
import { useMidi } from '@din/react/midi';

interface MidiStatusStripProps {
    activity?: boolean;
}

const RadioIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
        <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
    </svg>
);

const ActivityIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export const MidiStatusStrip: FC<MidiStatusStripProps> = ({ activity = false }) => {
    const { inputs, outputs, status } = useMidi();

    return (
        <div className="flex items-center gap-4 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-800 shadow-xl pointer-events-auto">
            <div className="flex items-center gap-2 border-r border-zinc-800 pr-3">
                <RadioIcon className={`w-3.5 h-3.5 ${status === 'pending' ? 'text-blue-400 animate-pulse' : 'text-zinc-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">MIDI</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    <span className="text-xs font-medium text-zinc-300">{inputs.length} IN</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    <span className="text-xs font-medium text-zinc-300">{outputs.length} OUT</span>
                </div>
            </div>

            {activity && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <ActivityIcon className="w-3 h-3 text-amber-500 animate-pulse" />
                </div>
            )}
        </div>
    );
};
