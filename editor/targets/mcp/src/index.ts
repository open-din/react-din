import { randomUUID } from 'node:crypto';
import { BridgeServer } from './bridgeServer';
import { loadServerConfig } from './config';
import { createLogger } from './logger';
import { DinEditorMcpRuntime } from './runtime';
import { StdioMcpServer } from './stdioServer';

async function main() {
    const config = loadServerConfig();
    const logger = createLogger();
    logger.info('DIN Editor MCP startup config', {
        protocol: config.bridgeProtocol,
        host: config.bridgeHost,
        port: config.bridgePort,
        readOnly: config.readOnly,
        tlsDirectory: config.bridgeProtocol === 'https' ? config.tlsDirectory : null,
    });
    const bridgeServer = new BridgeServer({
        bridgeProtocol: config.bridgeProtocol,
        bridgeHost: config.bridgeHost,
        bridgePort: config.bridgePort,
        bridgeToken: randomUUID(),
        tlsDirectory: config.tlsDirectory,
        readOnly: config.readOnly,
        requestTimeoutMs: config.requestTimeoutMs,
        serverVersion: config.serverVersion,
        logger,
    });

    await bridgeServer.start();

    const runtime = new DinEditorMcpRuntime(bridgeServer.registry, {
        readOnly: config.readOnly,
        serverVersion: config.serverVersion,
        logger,
    });
    const stdioServer = new StdioMcpServer(runtime, logger);
    stdioServer.start();

    const shutdown = async () => {
        await bridgeServer.close();
        process.exit(0);
    };

    process.on('SIGINT', () => {
        void shutdown();
    });
    process.on('SIGTERM', () => {
        void shutdown();
    });
}

void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
});
