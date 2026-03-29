import { execFile } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join as joinPath } from 'node:path';
import { promisify } from 'node:util';
import type { Logger } from './logger';

const execFileAsync = promisify(execFile);
const SERVER_CERT_RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CA_CERT_RENEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CA_VALIDITY_DAYS = 3650;
const SERVER_VALIDITY_DAYS = 825;
const CA_COMMON_NAME = 'DIN Editor MCP Local CA';
const SERVER_COMMON_NAME = 'localhost';

export interface LocalTlsBundle {
    certDirectory: string;
    caCertPath: string;
    caCertPem: string;
    serverCertPath: string;
    serverCertPem: string;
    serverKeyPath: string;
    serverKeyPem: string;
    fingerprint256: string;
    generatedNewAuthority: boolean;
    generatedNewServerCertificate: boolean;
}

interface TlsPaths {
    certDirectory: string;
    caKeyPath: string;
    caCertPath: string;
    caSerialPath: string;
    serverKeyPath: string;
    serverCertPath: string;
    serverCsrPath: string;
    serverExtPath: string;
}

function createTlsPaths(certDirectory: string): TlsPaths {
    return {
        certDirectory,
        caKeyPath: joinPath(certDirectory, 'ca.key.pem'),
        caCertPath: joinPath(certDirectory, 'ca.cert.pem'),
        caSerialPath: joinPath(certDirectory, 'ca.cert.srl'),
        serverKeyPath: joinPath(certDirectory, 'server.key.pem'),
        serverCertPath: joinPath(certDirectory, 'server.cert.pem'),
        serverCsrPath: joinPath(certDirectory, 'server.csr.pem'),
        serverExtPath: joinPath(certDirectory, 'server.ext'),
    };
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath, fsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function certificateIsFresh(certPath: string, renewWindowMs: number): Promise<boolean> {
    try {
        const pem = await readFile(certPath, 'utf8');
        const certificate = new X509Certificate(pem);
        const validTo = Date.parse(certificate.validTo);
        return Number.isFinite(validTo) && validTo - Date.now() > renewWindowMs;
    } catch {
        return false;
    }
}

async function runOpenSsl(args: string[], cwd: string) {
    try {
        await execFileAsync('openssl', args, { cwd });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`OpenSSL failed while preparing DIN Editor MCP TLS certificates: ${message}`);
    }
}

async function removeIfExists(filePath: string) {
    await rm(filePath, { force: true });
}

async function generateCertificateAuthority(paths: TlsPaths) {
    await removeIfExists(paths.caKeyPath);
    await removeIfExists(paths.caCertPath);
    await removeIfExists(paths.caSerialPath);

    await runOpenSsl([
        'genpkey',
        '-algorithm',
        'RSA',
        '-out',
        paths.caKeyPath,
        '-pkeyopt',
        'rsa_keygen_bits:2048',
    ], paths.certDirectory);

    await runOpenSsl([
        'req',
        '-x509',
        '-new',
        '-key',
        paths.caKeyPath,
        '-sha256',
        '-days',
        String(CA_VALIDITY_DAYS),
        '-subj',
        `/CN=${CA_COMMON_NAME}`,
        '-out',
        paths.caCertPath,
    ], paths.certDirectory);
}

async function generateServerCertificate(paths: TlsPaths) {
    await removeIfExists(paths.serverKeyPath);
    await removeIfExists(paths.serverCertPath);
    await removeIfExists(paths.serverCsrPath);
    await removeIfExists(paths.serverExtPath);

    await writeFile(
        paths.serverExtPath,
        [
            'basicConstraints=CA:FALSE',
            'keyUsage=digitalSignature,keyEncipherment',
            'extendedKeyUsage=serverAuth',
            'subjectAltName=@alt_names',
            '',
            '[alt_names]',
            'DNS.1=localhost',
            'IP.1=127.0.0.1',
            'IP.2=::1',
            '',
        ].join('\n'),
        'utf8',
    );

    await runOpenSsl([
        'genpkey',
        '-algorithm',
        'RSA',
        '-out',
        paths.serverKeyPath,
        '-pkeyopt',
        'rsa_keygen_bits:2048',
    ], paths.certDirectory);

    await runOpenSsl([
        'req',
        '-new',
        '-key',
        paths.serverKeyPath,
        '-subj',
        `/CN=${SERVER_COMMON_NAME}`,
        '-out',
        paths.serverCsrPath,
    ], paths.certDirectory);

    await runOpenSsl([
        'x509',
        '-req',
        '-in',
        paths.serverCsrPath,
        '-CA',
        paths.caCertPath,
        '-CAkey',
        paths.caKeyPath,
        '-CAcreateserial',
        '-out',
        paths.serverCertPath,
        '-days',
        String(SERVER_VALIDITY_DAYS),
        '-sha256',
        '-extfile',
        paths.serverExtPath,
    ], paths.certDirectory);

    await removeIfExists(paths.serverCsrPath);
    await removeIfExists(paths.serverExtPath);
}

export async function ensureLocalTlsBundle(options: {
    certDirectory: string;
    logger: Logger;
}): Promise<LocalTlsBundle> {
    await mkdir(options.certDirectory, { recursive: true });
    const paths = createTlsPaths(options.certDirectory);

    const caAvailable = await fileExists(paths.caKeyPath) && await fileExists(paths.caCertPath);
    const serverAvailable = await fileExists(paths.serverKeyPath) && await fileExists(paths.serverCertPath);
    const caFresh = caAvailable && await certificateIsFresh(paths.caCertPath, CA_CERT_RENEW_WINDOW_MS);
    const serverFresh = serverAvailable && await certificateIsFresh(paths.serverCertPath, SERVER_CERT_RENEW_WINDOW_MS);

    let generatedNewAuthority = false;
    let generatedNewServerCertificate = false;

    if (!caFresh) {
        await generateCertificateAuthority(paths);
        generatedNewAuthority = true;
        options.logger.info('Generated DIN Editor MCP local certificate authority', {
            certDirectory: options.certDirectory,
            caCertPath: paths.caCertPath,
        });
    }

    if (generatedNewAuthority || !serverFresh) {
        await generateServerCertificate(paths);
        generatedNewServerCertificate = true;
        options.logger.info('Generated DIN Editor MCP HTTPS server certificate', {
            certDirectory: options.certDirectory,
            serverCertPath: paths.serverCertPath,
        });
    }

    const [caCertPem, serverCertPem, serverKeyPem] = await Promise.all([
        readFile(paths.caCertPath, 'utf8'),
        readFile(paths.serverCertPath, 'utf8'),
        readFile(paths.serverKeyPath, 'utf8'),
    ]);
    const fingerprint256 = new X509Certificate(serverCertPem).fingerprint256;

    if (generatedNewAuthority) {
        options.logger.warn(
            'Trust the DIN Editor MCP local CA certificate in your browser or OS before using HTTPS/WSS from DIN Editor.',
            {
                caCertPath: paths.caCertPath,
                fingerprint256,
            },
        );
    }

    return {
        certDirectory: options.certDirectory,
        caCertPath: paths.caCertPath,
        caCertPem,
        serverCertPath: paths.serverCertPath,
        serverCertPem,
        serverKeyPath: paths.serverKeyPath,
        serverKeyPem,
        fingerprint256,
        generatedNewAuthority,
        generatedNewServerCertificate,
    };
}
