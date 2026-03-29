import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const cwd = process.cwd();
const patchPath = process.env.DIN_EDITOR_MCP_PATCH_PATH ?? `${cwd}/tmp/atmospheric-breakbeat-8bars.patch.json`;
const bridgePort = process.env.DIN_EDITOR_MCP_TEST_PORT ?? '17375';
const liveMode = process.env.DIN_EDITOR_MCP_LIVE === '1';

const patchText = await readFile(patchPath, 'utf8');

const child = spawn(process.execPath, [
    '--enable-source-maps',
    'editor/targets/mcp/dist/index.cjs',
    '--dev',
    '--bridge-protocol',
    'http',
    '--bridge-host',
    'localhost',
    '--bridge-port',
    bridgePort,
], {
    cwd,
    env: {
        ...process.env,
        DIN_EDITOR_MCP_BRIDGE_PROTOCOL: 'http',
        DIN_EDITOR_MCP_BRIDGE_HOST: 'localhost',
        DIN_EDITOR_MCP_BRIDGE_PORT: bridgePort,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
});

let stdoutBuffer = Buffer.alloc(0);
let stderrText = '';
let nextRpcId = 1;
const pending = new Map();

child.stderr.on('data', (chunk) => {
    stderrText += chunk.toString();
});

child.stdout.on('data', (chunk) => {
    stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);

    while (true) {
        const headerEnd = stdoutBuffer.indexOf('\r\n\r\n');
        if (headerEnd < 0) return;

        const headerText = stdoutBuffer.slice(0, headerEnd).toString('utf8');
        const match = /content-length:\s*(\d+)/i.exec(headerText);
        if (!match) {
            throw new Error(`Invalid MCP header: ${headerText}`);
        }

        const contentLength = Number.parseInt(match[1], 10);
        const messageEnd = headerEnd + 4 + contentLength;
        if (stdoutBuffer.length < messageEnd) return;

        const body = stdoutBuffer.slice(headerEnd + 4, messageEnd).toString('utf8');
        stdoutBuffer = stdoutBuffer.slice(messageEnd);

        const message = JSON.parse(body);
        const request = pending.get(message.id);
        if (!request) continue;
        pending.delete(message.id);

        if (message.error) {
            request.reject(new Error(`${message.error.message}${message.error.data ? ` ${JSON.stringify(message.error.data)}` : ''}`));
            continue;
        }

        request.resolve(message.result);
    }
});

child.on('exit', (code) => {
    const error = new Error(`DIN Editor MCP exited before completing the request chain (code ${code ?? 'unknown'}).\n${stderrText}`);
    pending.forEach((request) => request.reject(error));
    pending.clear();
});

function writeRpc(payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    child.stdin.write(body);
}

function callRpc(method, params = {}) {
    const id = nextRpcId++;
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`Timed out waiting for MCP response to "${method}".\n${stderrText}`));
        }, 10000);
        pending.set(id, { resolve, reject });
        writeRpc({ jsonrpc: '2.0', id, method, params });
        pending.set(id, {
            resolve: (value) => {
                clearTimeout(timeoutId);
                resolve(value);
            },
            reject: (error) => {
                clearTimeout(timeoutId);
                reject(error);
            },
        });
    });
}

function notifyRpc(method, params = {}) {
    writeRpc({ jsonrpc: '2.0', method, params });
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSession() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const result = await callRpc('tools/call', {
            name: 'editor_list_sessions',
            arguments: {},
        });
        const sessions = result?.structuredContent?.sessions ?? [];
        if (sessions.length > 0) {
            return sessions[0];
        }
        await delay(1000);
    }
    throw new Error(`No DIN Editor session connected.\n${stderrText}`);
}

try {
    await delay(1000);

    const initialize = await callRpc('initialize', {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'codex-din-mcp-check', version: '1.0.0' },
    });
    notifyRpc('notifications/initialized', {});

    const validate = await callRpc('tools/call', {
        name: 'editor_validate_patch',
        arguments: {
            path: patchPath,
        },
    });

    const codegen = await callRpc('tools/call', {
        name: 'editor_generate_code',
        arguments: {
            path: patchPath,
            includeProvider: true,
        },
    });

    const output = {
        initialize: initialize.serverInfo,
        validateSummary: validate?.structuredContent?.summary ?? null,
        generatedCodeLength: codegen?.structuredContent?.code?.length ?? 0,
    };

    if (!liveMode) {
        console.log(JSON.stringify(output, null, 2));
    } else {
        const session = await waitForSession();
        const sessionId = session.sessionId;

        const importResult = await callRpc('tools/call', {
            name: 'editor_import_patch',
            arguments: {
                sessionId,
                text: patchText,
            },
        });

        const playResult = await callRpc('tools/call', {
            name: 'editor_apply_operations',
            arguments: {
                sessionId,
                operations: [
                    { type: 'set_playing', playing: true },
                ],
            },
        });

        await delay(1500);

        const stateWhilePlaying = await callRpc('tools/call', {
            name: 'editor_get_state',
            arguments: { sessionId },
        });

        await callRpc('tools/call', {
            name: 'editor_apply_operations',
            arguments: {
                sessionId,
                operations: [
                    { type: 'set_playing', playing: false },
                ],
            },
        });

        const graphResult = await callRpc('tools/call', {
            name: 'editor_get_graph',
            arguments: { sessionId },
        });

        console.log(JSON.stringify({
            ...output,
            live: {
                sessionId,
                importSummary: importResult?.structuredContent?.summary ?? null,
                playSummary: playResult?.structuredContent?.summary ?? null,
                audioStatus: stateWhilePlaying?.structuredContent?.state?.audio ?? null,
                graph: graphResult?.structuredContent?.graph
                    ? {
                        name: graphResult.structuredContent.graph.name,
                        nodes: graphResult.structuredContent.graph.nodes.length,
                        edges: graphResult.structuredContent.graph.edges.length,
                    }
                    : null,
            },
        }, null, 2));
    }
} finally {
    if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGINT');
        await once(child, 'exit');
    }
}
