/**
 * `AudioWorkletGlobalScope` does not always provide `TextDecoder` / `TextEncoder` / `URL`.
 * wasm-bindgen JS glue instantiates `TextDecoder` at module load time, so these
 * must exist before any `import from 'din-wasm'` is evaluated.
 * Default WASM init uses `new URL("din_wasm_bg.wasm", import.meta.url)`, so `URL`
 * must exist before that runs.
 */
const g = globalThis as typeof globalThis & {
    TextDecoder?: typeof TextDecoder;
    TextEncoder?: typeof TextEncoder;
    URL?: typeof URL;
};

function utf8BytesToString(bytes: Uint8Array, fatal: boolean, ignoreBOM: boolean): string {
    let i = 0;
    if (ignoreBOM && bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        i = 3;
    }
    const len = bytes.length;
    let out = '';
    while (i < len) {
        const b0 = bytes[i++]!;
        if (b0 < 0x80) {
            out += String.fromCharCode(b0);
            continue;
        }
        if (b0 < 0xc0 || b0 >= 0xf5) {
            if (fatal) throw new TypeError('Invalid UTF-8');
            out += '\ufffd';
            continue;
        }
        if (b0 < 0xe0) {
            if (i >= len) {
                if (fatal) throw new TypeError('Invalid UTF-8');
                out += '\ufffd';
                continue;
            }
            const b1 = bytes[i++]!;
            if ((b1 & 0xc0) !== 0x80) {
                if (fatal) throw new TypeError('Invalid UTF-8');
                out += '\ufffd';
                continue;
            }
            const cp = ((b0 & 0x1f) << 6) | (b1 & 0x3f);
            if (cp < 0x80) {
                if (fatal) throw new TypeError('Invalid UTF-8');
                out += '\ufffd';
                continue;
            }
            out += String.fromCharCode(cp);
            continue;
        }
        if (b0 < 0xf0) {
            if (i + 1 >= len) {
                if (fatal) throw new TypeError('Invalid UTF-8');
                out += '\ufffd';
                continue;
            }
            const b1 = bytes[i++]!;
            const b2 = bytes[i++]!;
            if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80) {
                if (fatal) throw new TypeError('Invalid UTF-8');
                out += '\ufffd';
                continue;
            }
            const cp = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
            if (cp < 0x800 || (cp >= 0xd800 && cp <= 0xdfff)) {
                if (fatal) throw new TypeError('Invalid UTF-8');
                out += '\ufffd';
                continue;
            }
            out += String.fromCharCode(cp);
            continue;
        }
        if (i + 2 >= len) {
            if (fatal) throw new TypeError('Invalid UTF-8');
            out += '\ufffd';
            continue;
        }
        const b1 = bytes[i++]!;
        const b2 = bytes[i++]!;
        const b3 = bytes[i++]!;
        if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80) {
            if (fatal) throw new TypeError('Invalid UTF-8');
            out += '\ufffd';
            continue;
        }
        let cp = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
        if (cp < 0x10000 || cp > 0x10ffff) {
            if (fatal) throw new TypeError('Invalid UTF-8');
            out += '\ufffd';
            continue;
        }
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
    return out;
}

if (typeof g.TextDecoder === 'undefined') {
    class TextDecoderPolyfill implements TextDecoder {
        readonly encoding = 'utf-8';
        readonly fatal: boolean;
        readonly ignoreBOM: boolean;

        constructor(encoding?: string, options?: TextDecoderOptions) {
            const enc = encoding?.toLowerCase() ?? 'utf-8';
            if (enc !== 'utf-8' && enc !== 'utf8') {
                throw new RangeError(`The encoding ${encoding} is not supported.`);
            }
            this.fatal = options?.fatal ?? false;
            this.ignoreBOM = options?.ignoreBOM ?? false;
        }

        decode(input?: BufferSource, _options?: TextDecodeOptions): string {
            void _options;
            if (input == null) return '';
            const view =
                input instanceof ArrayBuffer
                    ? new Uint8Array(input)
                    : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
            return utf8BytesToString(view, this.fatal, this.ignoreBOM);
        }
    }

    g.TextDecoder = TextDecoderPolyfill as unknown as typeof TextDecoder;
}

if (typeof g.TextEncoder === 'undefined') {
    class TextEncoderPolyfill implements TextEncoder {
        readonly encoding = 'utf-8';

        encode(input = ''): Uint8Array<ArrayBuffer> {
            const s = String(input);
            const out: number[] = [];
            for (let i = 0; i < s.length; i++) {
                let c = s.charCodeAt(i)!;
                if (c < 0x80) {
                    out.push(c);
                } else if (c < 0x800) {
                    out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
                } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
                    const c2 = s.charCodeAt(i + 1)!;
                    if (c2 >= 0xdc00 && c2 <= 0xdfff) {
                        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                        i++;
                        out.push(
                            0xf0 | (c >> 18),
                            0x80 | ((c >> 12) & 0x3f),
                            0x80 | ((c >> 6) & 0x3f),
                            0x80 | (c & 0x3f)
                        );
                    } else {
                        out.push(0xef, 0xbf, 0xbd);
                    }
                } else if (c >= 0xdc00 && c <= 0xdfff) {
                    out.push(0xef, 0xbf, 0xbd);
                } else {
                    out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
                }
            }
            const buf = new ArrayBuffer(out.length);
            const u = new Uint8Array(buf);
            u.set(out);
            return u;
        }

        encodeInto(source: string, destination: Uint8Array): TextEncoderEncodeIntoResult {
            const encoded = this.encode(source);
            const n = Math.min(encoded.length, destination.length);
            destination.set(encoded.subarray(0, n));
            return { read: source.length, written: n };
        }
    }

    g.TextEncoder = TextEncoderPolyfill as unknown as typeof TextEncoder;
}

if (typeof g.URL === 'undefined') {
    /**
     * Minimal resolver for wasm-bindgen: `new URL("din_wasm_bg.wasm", import.meta.url)`.
     * Supports `instanceof URL` and `fetch(url)` (via `toString()` → `href`).
     */
    class URLPolyfill {
        readonly href: string;

        constructor(url: string, base?: string | URL) {
            if (base === undefined) {
                this.href = String(url);
                return;
            }
            const baseStr = typeof base === 'string' ? base : base.href;
            const withoutQueryHash = baseStr.replace(/[?#].*$/, '');
            const dir = withoutQueryHash.replace(/\/[^/]*$/, '/') || '/';
            this.href = dir + String(url);
        }

        toString(): string {
            return this.href;
        }
    }

    g.URL = URLPolyfill as unknown as typeof URL;
}
