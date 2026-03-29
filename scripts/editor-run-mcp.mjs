import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function run(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            ...options,
        });

        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}.`));
        });
        child.on('error', reject);
    });
}

const mode = process.argv[2] ?? 'start';
const cwd = fileURLToPath(new URL('..', import.meta.url));
const defaultDevBridgePort = '17374';

await run(process.execPath, [
    '--enable-source-maps',
    resolve(cwd, 'node_modules/tsup/dist/cli-default.js'),
    '--config',
    'editor/targets/mcp/tsup.config.ts',
], { cwd });

const env = { ...process.env };
if (mode === 'dev') {
    env.DIN_EDITOR_MCP_BRIDGE_PROTOCOL = 'http';
    env.DIN_EDITOR_MCP_BRIDGE_HOST = 'localhost';
    env.DIN_EDITOR_MCP_BRIDGE_PORT = defaultDevBridgePort;
}

await new Promise((resolve, reject) => {
    const childArgs = ['--enable-source-maps', 'editor/targets/mcp/dist/index.cjs'];
    if (mode === 'dev') {
        childArgs.push('--dev', '--bridge-protocol', 'http', '--bridge-host', 'localhost', '--bridge-port', defaultDevBridgePort);
    }

    const child = spawn(process.execPath, childArgs, {
        cwd,
        env,
        stdio: 'inherit',
    });

    const stop = (signal) => {
        child.kill(signal);
    };

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    child.on('exit', (code) => {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        if (code === 0 || code === null) {
            resolve();
            return;
        }
        reject(new Error(`DIN Editor MCP exited with code ${code}.`));
    });
    child.on('error', reject);
});
