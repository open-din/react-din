import { resolve as resolvePath } from 'node:path';

export interface ServerConfig {
    bridgeProtocol: 'http' | 'https';
    bridgeHost: string;
    bridgePort: number;
    readOnly: boolean;
    requestTimeoutMs: number;
    serverVersion: string;
    tlsDirectory: string;
}

function parseBridgeProtocol(value: string | undefined, fallback: 'http' | 'https'): 'http' | 'https' {
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'http' || normalized === 'https') {
        return normalized;
    }
    return fallback;
}

function parseBoolean(value: string | undefined): boolean {
    if (!value) return false;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseArgumentValue(args: string[], name: string): string | undefined {
    const prefix = `${name}=`;
    const inline = args.find((arg) => arg.startsWith(prefix));
    if (inline) {
        return inline.slice(prefix.length);
    }

    const index = args.findIndex((arg) => arg === name);
    if (index >= 0) {
        return args[index + 1];
    }

    return undefined;
}

export function loadServerConfig(
    env: NodeJS.ProcessEnv = process.env,
    args: string[] = process.argv.slice(2),
): ServerConfig {
    const isDevMode = args.includes('--dev');
    const bridgeProtocol = isDevMode
        ? parseBridgeProtocol(parseArgumentValue(args, '--bridge-protocol'), 'http')
        : parseBridgeProtocol(
            parseArgumentValue(args, '--bridge-protocol') ?? env.DIN_EDITOR_MCP_BRIDGE_PROTOCOL,
            'https',
        );
    const bridgeHost = isDevMode
        ? parseArgumentValue(args, '--bridge-host')?.trim() || 'localhost'
        : parseArgumentValue(args, '--bridge-host')
            ?? env.DIN_EDITOR_MCP_BRIDGE_HOST?.trim()
            ?? 'localhost';
    const bridgePort = isDevMode
        ? parseInteger(parseArgumentValue(args, '--bridge-port'), 17374)
        : parseInteger(
            parseArgumentValue(args, '--bridge-port') ?? env.DIN_EDITOR_MCP_BRIDGE_PORT,
            17373,
        );

    return {
        bridgeProtocol,
        bridgeHost,
        bridgePort,
        readOnly: parseBoolean(env.DIN_EDITOR_MCP_READ_ONLY),
        requestTimeoutMs: parseInteger(env.DIN_EDITOR_MCP_REQUEST_TIMEOUT_MS, 10_000),
        serverVersion: env.DIN_EDITOR_MCP_VERSION?.trim() || '0.1.0',
        tlsDirectory: resolvePath(
            process.cwd(),
            env.DIN_EDITOR_MCP_TLS_DIR?.trim() || '.din-editor-mcp/tls',
        ),
    };
}
