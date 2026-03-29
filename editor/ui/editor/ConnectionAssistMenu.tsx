import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { NodeSuggestion } from './nodeHelpers';

interface ConnectionAssistMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    query: string;
    suggestions: NodeSuggestion[];
    onClose: () => void;
    onQueryChange: (value: string) => void;
    onSelect: (suggestion: NodeSuggestion) => void;
}

export default function ConnectionAssistMenu({
    isOpen,
    position,
    query,
    suggestions,
    onClose,
    onQueryChange,
    onSelect,
}: ConnectionAssistMenuProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!isOpen) return;
        setActiveIndex(0);
        window.requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
    }, [isOpen, query, suggestions.length]);

    if (!isOpen) {
        return null;
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => {
                if (suggestions.length === 0) return 0;
                return (index + 1) % suggestions.length;
            });
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => {
                if (suggestions.length === 0) return 0;
                return (index - 1 + suggestions.length) % suggestions.length;
            });
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const suggestion = suggestions[activeIndex];
            if (suggestion) {
                onSelect(suggestion);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        }
    };

    return (
        <div
            className="connection-assist-menu"
            style={{ left: position.x, top: position.y }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Add and connect node"
        >
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={handleKeyDown}
                className="connection-assist-input"
                placeholder="Search nodes"
                aria-label="Search nodes"
            />

            {suggestions.length > 0 ? (
                <div className="connection-assist-list" role="listbox" aria-label="Compatible nodes">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={`${suggestion.type}:${suggestion.handleId}:${index}`}
                            type="button"
                            className={`connection-assist-item ${index === activeIndex ? 'active' : ''}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => onSelect(suggestion)}
                            role="option"
                            aria-selected={index === activeIndex}
                        >
                            <span className="connection-assist-icon" style={{ color: suggestion.color }}>{suggestion.icon}</span>
                            <span className="connection-assist-title">{suggestion.title}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="connection-assist-empty">
                    No compatible node found.
                </div>
            )}
        </div>
    );
}
