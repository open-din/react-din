export interface Logger {
    info: (message: string, details?: unknown) => void;
    warn: (message: string, details?: unknown) => void;
    error: (message: string, details?: unknown) => void;
    mutation: (tool: string, details?: unknown) => void;
}

function serialize(details: unknown): string {
    if (details === undefined) return '';
    try {
        return ` ${JSON.stringify(details)}`;
    } catch {
        return ' {"unserializable":true}';
    }
}

function write(level: 'INFO' | 'WARN' | 'ERROR' | 'MUTATION', message: string, details?: unknown) {
    process.stderr.write(`${new Date().toISOString()} [din-editor-mcp] ${level} ${message}${serialize(details)}\n`);
}

export function createLogger(): Logger {
    return {
        info: (message, details) => write('INFO', message, details),
        warn: (message, details) => write('WARN', message, details),
        error: (message, details) => write('ERROR', message, details),
        mutation: (tool, details) => write('MUTATION', tool, details),
    };
}
