import { promises as fs, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import * as stream from 'node:stream';
import { promisify } from 'node:util';
import { request } from 'undici';
import { defaultCacheDir } from '../config/cascade.js';

const pipeline = promisify(stream.pipeline);

export class IntegrityError extends Error {
  constructor(message: string) { super(message); this.name = 'IntegrityError'; }
}

export interface DownloadOptions {
  url: string;
  expectedSha256: string;
  cacheDir?: string;
}

export interface DownloadedFile {
  path: string;
  sha256: string;
  size: number;
  fromCache: boolean;
}

async function sha256OfFile(file: string): Promise<string> {
  const hash = createHash('sha256');
  const fh = await fs.open(file, 'r');
  try {
    const rs = fh.createReadStream();
    for await (const chunk of rs) hash.update(chunk as Buffer);
  } finally {
    await fh.close();
  }
  return hash.digest('hex');
}

function urlToCacheName(url: string, sha256: string): string {
  const ext = path.extname(new URL(url).pathname) || '.bin';
  return `${sha256}${ext}`;
}

export async function downloadFile(opts: DownloadOptions): Promise<DownloadedFile> {
  const cacheDir = opts.cacheDir ?? defaultCacheDir();
  await fs.mkdir(cacheDir, { recursive: true });
  const target = path.join(cacheDir, urlToCacheName(opts.url, opts.expectedSha256));

  // Cache hit by sha256 — trust it (filename includes the hash).
  try {
    const stat = await fs.stat(target);
    return { path: target, sha256: opts.expectedSha256, size: stat.size, fromCache: true };
  } catch { /* fall through */ }

  const res = await request(opts.url, { method: 'GET', maxRedirections: 5 });
  if (res.statusCode >= 400) {
    throw new Error(`Download failed: HTTP ${res.statusCode} ${opts.url}`);
  }
  const tmp = `${target}.part`;
  await pipeline(res.body, createWriteStream(tmp));
  const got = await sha256OfFile(tmp);
  if (got.toLowerCase() !== opts.expectedSha256.toLowerCase()) {
    await fs.unlink(tmp).catch(() => undefined);
    throw new IntegrityError(
      `sha256 mismatch for ${opts.url}: got ${got}, expected ${opts.expectedSha256}`,
    );
  }
  await fs.rename(tmp, target);
  const stat = await fs.stat(target);
  return { path: target, sha256: got, size: stat.size, fromCache: false };
}
