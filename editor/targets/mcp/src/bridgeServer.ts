import { createServer as createHttpServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer, type Server as HttpsServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import WebSocket, { WebSocketServer } from 'ws';
import type { BridgeDiscoveryInfo, BridgeEnvelope } from '../../../bridge/protocol';
import type { EditorSessionHello } from '../../../core';
import type { Logger } from './logger';
import { SessionRegistry } from './sessionRegistry';
import { ensureLocalTlsBundle, type LocalTlsBundle } from './tls';

function isLoopbackAddress(remoteAddress: string | undefined): boolean {
    if (!remoteAddress) return false;
    return remoteAddress === '127.0.0.1'
        || remoteAddress === '::1'
        || remoteAddress === '::ffff:127.0.0.1';
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.end(`${JSON.stringify(payload)}\n`);
}

function sendText(
    response: ServerResponse,
    statusCode: number,
    contentType: string,
    payload: string,
) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.end(payload);
}

function sendBridgeError(
    socket: WebSocket,
    requestId: string | null,
    code: string,
    message: string,
) {
    socket.send(JSON.stringify({
        requestId,
        type: 'session.error',
        sessionId: null,
        ok: false,
        error: {
            code,
            message,
        },
    } satisfies BridgeEnvelope));
}

export class BridgeServer {
    readonly registry: SessionRegistry;
    private server: HttpServer | HttpsServer | null = null;
    private wsServer: WebSocketServer | null = null;
    private listeningPort: number | null = null;
    private tlsBundle: LocalTlsBundle | null = null;

    constructor(private readonly options: {
        bridgeProtocol: 'http' | 'https';
        bridgeHost: string;
        bridgePort: number;
        bridgeToken: string;
        tlsDirectory: string;
        readOnly: boolean;
        serverVersion: string;
        requestTimeoutMs: number;
        logger: Logger;
    }) {
        this.registry = new SessionRegistry({
            bridgeToken: options.bridgeToken,
            readOnly: options.readOnly,
            requestTimeoutMs: options.requestTimeoutMs,
            serverVersion: options.serverVersion,
            logger: options.logger,
        });
    }

    private handleHttpRequest(request: IncomingMessage, response: ServerResponse) {
        if (!isLoopbackAddress(request.socket.remoteAddress)) {
            sendJson(response, 403, { error: 'Loopback access only.' });
            return;
        }

        const url = new URL(request.url ?? '/', `${this.options.bridgeProtocol}://${this.options.bridgeHost}`);
        if (request.method === 'OPTIONS') {
            response.statusCode = 204;
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            response.end();
            return;
        }

        if (request.method === 'GET' && url.pathname === '/bridge-info') {
            sendJson(response, 200, this.getDiscoveryInfo());
            return;
        }

        if (request.method === 'GET' && url.pathname === '/bridge-ca') {
            if (!this.tlsBundle) {
                sendJson(response, 503, { error: 'TLS bundle not available yet.' });
                return;
            }
            sendText(response, 200, 'application/x-pem-file; charset=utf-8', this.tlsBundle.caCertPem);
            return;
        }

        sendJson(response, 404, { error: 'Not found.' });
    }

    private attachHttpAndUpgradeHandlers(server: HttpServer | HttpsServer, wsServer: WebSocketServer) {
        server.on('upgrade', (request, socket, head) => {
            if (!isLoopbackAddress(request.socket.remoteAddress)) {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            const url = new URL(request.url ?? '/', `${this.options.bridgeProtocol}://${this.options.bridgeHost}`);
            if (url.pathname !== '/bridge') {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }

            wsServer.handleUpgrade(request, socket, head, (client) => {
                this.attachClient(client);
            });
        });
    }

    private attachClient(socket: WebSocket) {
        socket.on('message', (data) => {
            let envelope: BridgeEnvelope;
            try {
                envelope = JSON.parse(String(data)) as BridgeEnvelope;
            } catch {
                sendBridgeError(socket, null, 'INVALID_JSON', 'Bridge payload must be valid JSON.');
                socket.close();
                return;
            }

            if (envelope.type === 'session.hello') {
                try {
                    const ack = this.registry.registerHello(socket, envelope.payload as EditorSessionHello);
                    socket.send(JSON.stringify({
                        requestId: envelope.requestId,
                        type: 'session.hello',
                        sessionId: ack.sessionId,
                        ok: true,
                        payload: ack,
                    } satisfies BridgeEnvelope));
                } catch (error) {
                    sendBridgeError(socket, envelope.requestId, 'HELLO_REJECTED', error instanceof Error ? error.message : 'Session hello rejected.');
                    socket.close();
                }
                return;
            }

            this.registry.handleEnvelope(socket, envelope);
        });

        socket.on('close', (code, reason) => {
            const closeReason = reason.toString('utf8').trim();
            const detail = closeReason
                ? `socket closed (code ${code}, reason "${closeReason}")`
                : `socket closed (code ${code})`;
            this.registry.detachSocket(socket, detail);
        });

        socket.on('error', (error) => {
            this.options.logger.warn('Bridge socket error', {
                message: error.message,
            });
            this.registry.detachSocket(socket, 'socket error');
        });
    }

    getDiscoveryInfo(): BridgeDiscoveryInfo {
        const port = this.listeningPort ?? this.options.bridgePort;
        const httpProtocol = this.options.bridgeProtocol;
        const wsProtocol = httpProtocol === 'https' ? 'wss' : 'ws';
        return {
            bridgeInfoUrl: `${httpProtocol}://${this.options.bridgeHost}:${port}/bridge-info`,
            bridgeCaUrl: httpProtocol === 'https'
                ? `${httpProtocol}://${this.options.bridgeHost}:${port}/bridge-ca`
                : null,
            bridgeUrl: `${wsProtocol}://${this.options.bridgeHost}:${port}/bridge`,
            bridgeToken: this.options.bridgeToken,
            readOnly: this.options.readOnly,
            serverVersion: this.options.serverVersion,
            certificateFingerprint256: this.tlsBundle?.fingerprint256 ?? null,
        };
    }

    async start() {
        if (this.options.bridgeProtocol === 'https') {
            this.tlsBundle = await ensureLocalTlsBundle({
                certDirectory: this.options.tlsDirectory,
                logger: this.options.logger,
            });
            this.server = createHttpsServer({
                key: this.tlsBundle.serverKeyPem,
                cert: this.tlsBundle.serverCertPem,
            }, this.handleHttpRequest.bind(this));
        } else {
            this.tlsBundle = null;
            this.server = createHttpServer(this.handleHttpRequest.bind(this));
        }
        this.wsServer = new WebSocketServer({ noServer: true });
        this.attachHttpAndUpgradeHandlers(this.server, this.wsServer);

        await new Promise<void>((resolve, reject) => {
            this.server!.once('error', reject);
            this.server!.listen(this.options.bridgePort, this.options.bridgeHost, () => {
                this.server!.off('error', reject);
                resolve();
            });
        });

        const address = this.server.address() as AddressInfo | null;
        this.listeningPort = address?.port ?? this.options.bridgePort;
        this.options.logger.info('DIN Editor bridge listening', {
            protocol: this.options.bridgeProtocol,
            host: this.options.bridgeHost,
            port: this.listeningPort,
            readOnly: this.options.readOnly,
            tlsDirectory: this.tlsBundle?.certDirectory ?? null,
            certificateFingerprint256: this.tlsBundle?.fingerprint256 ?? null,
        });
    }

    async close() {
        const wsServer = this.wsServer;
        const server = this.server;
        if (!wsServer || !server) {
            return;
        }

        for (const client of wsServer.clients) {
            client.close();
        }

        await Promise.all([
            new Promise<void>((resolve) => {
                wsServer.close(() => resolve());
            }),
            new Promise<void>((resolve) => {
                server.close(() => resolve());
            }),
        ]);

        this.wsServer = null;
        this.server = null;
    }
}
