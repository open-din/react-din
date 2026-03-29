import type { Logger } from './logger';
import { DinEditorMcpRuntime } from './runtime';

class RpcError extends Error {
    constructor(
        readonly code: number,
        message: string,
        readonly data?: unknown,
    ) {
        super(message);
    }
}

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class StdioMcpServer {
    private buffer = Buffer.alloc(0);

    constructor(
        private readonly runtime: DinEditorMcpRuntime,
        private readonly logger: Logger,
    ) {}

    start() {
        process.stdin.on('data', (chunk: Buffer) => {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            this.flushMessages().catch((error) => {
                this.logger.error('Failed to process MCP stdio message', {
                    message: error instanceof Error ? error.message : String(error),
                });
            });
        });

        process.stdin.resume();
    }

    private async flushMessages() {
        while (true) {
            const headerEnd = this.buffer.indexOf('\r\n\r\n');
            if (headerEnd < 0) return;

            const headerText = this.buffer.slice(0, headerEnd).toString('utf8');
            const headers = new Map<string, string>();
            headerText.split('\r\n').forEach((line) => {
                const separator = line.indexOf(':');
                if (separator < 0) return;
                headers.set(
                    line.slice(0, separator).trim().toLowerCase(),
                    line.slice(separator + 1).trim(),
                );
            });

            const contentLength = Number.parseInt(headers.get('content-length') ?? '', 10);
            if (!Number.isFinite(contentLength) || contentLength < 0) {
                throw new RpcError(-32700, 'Invalid Content-Length header.');
            }

            const messageEnd = headerEnd + 4 + contentLength;
            if (this.buffer.length < messageEnd) return;

            const body = this.buffer.slice(headerEnd + 4, messageEnd).toString('utf8');
            this.buffer = this.buffer.slice(messageEnd);

            const message = JSON.parse(body) as JsonRpcRequest;
            await this.handleMessage(message);
        }
    }

    private write(payload: unknown) {
        const body = Buffer.from(JSON.stringify(payload), 'utf8');
        process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
        process.stdout.write(body);
    }

    private async handleMessage(message: JsonRpcRequest) {
        const id = message.id;

        try {
            if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
                throw new RpcError(-32600, 'Invalid JSON-RPC request.');
            }

            const result = await this.dispatch(message.method, message.params);
            if (id !== undefined) {
                this.write({
                    jsonrpc: '2.0',
                    id,
                    result,
                });
            }
        } catch (error) {
            if (id === undefined) return;

            const rpcError = error instanceof RpcError
                ? error
                : new RpcError(-32603, error instanceof Error ? error.message : 'Internal server error.');
            this.write({
                jsonrpc: '2.0',
                id,
                error: {
                    code: rpcError.code,
                    message: rpcError.message,
                    data: rpcError.data,
                },
            });
        }
    }

    private async dispatch(method: string, params: unknown) {
        const input = isObject(params) ? params : {};

        if (method === 'initialize') {
            return this.runtime.initialize(typeof input.protocolVersion === 'string' ? input.protocolVersion : undefined);
        }
        if (method === 'ping') {
            return {};
        }
        if (method === 'shutdown') {
            return {};
        }
        if (method === 'notifications/initialized') {
            return {};
        }
        if (method === 'tools/list') {
            return this.runtime.listTools();
        }
        if (method === 'tools/call') {
            if (typeof input.name !== 'string') {
                throw new RpcError(-32602, '"name" is required for tools/call.');
            }
            return this.runtime.callTool(input.name, input.arguments);
        }
        if (method === 'resources/list') {
            return this.runtime.listResources();
        }
        if (method === 'resources/templates/list') {
            return this.runtime.listResourceTemplates();
        }
        if (method === 'resources/read') {
            if (typeof input.uri !== 'string') {
                throw new RpcError(-32602, '"uri" is required for resources/read.');
            }
            return this.runtime.readResource(input.uri);
        }

        throw new RpcError(-32601, `Method "${method}" is not supported.`);
    }
}
