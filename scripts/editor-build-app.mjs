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

const cwd = fileURLToPath(new URL('..', import.meta.url));

await run(process.execPath, [
    resolve(cwd, 'node_modules/vite/bin/vite.js'),
    'build',
    '--config',
    'editor/targets/app/vite.config.ts',
], { cwd });
await run(process.execPath, [
    resolve(cwd, 'node_modules/typescript/bin/tsc'),
    '-p',
    'editor/targets/app/tsconfig.json',
], { cwd });
