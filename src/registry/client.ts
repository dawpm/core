import { request } from 'undici';
import { PluginSchema, RegistryIndexSchema, type Plugin, type RegistryIndex } from '../schemas/registry.js';

export class RegistryError extends Error {
  constructor(message: string, public status?: number, public url?: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

export interface RegistryClientOptions {
  /** Base URL of the dawpm registry frontend, e.g. https://dawpm-registry.vercel.app */
  baseUrl: string;
  timeoutMs?: number;
}

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  const res = await request(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
  });
  if (res.statusCode === 404) {
    throw new RegistryError(`not found: ${url}`, 404, url);
  }
  if (res.statusCode >= 400) {
    const body = await res.body.text().catch(() => '');
    throw new RegistryError(
      `GET ${url} failed: ${res.statusCode} ${body.slice(0, 200)}`,
      res.statusCode,
      url,
    );
  }
  return res.body.json() as Promise<T>;
}

/**
 * Talks to the dawpm registry frontend at /api/v1/plugins.
 */
export class RegistryClient {
  readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: RegistryClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  private url(p: string): string {
    return `${this.baseUrl}/api/v1${p}`;
  }

  /** GET /api/v1/plugins[?q=] — returns the full registry index, optionally filtered. */
  async list(q?: string): Promise<RegistryIndex> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const raw = await getJson<unknown>(this.url(`/plugins${qs}`), this.timeoutMs);
    return RegistryIndexSchema.parse(raw);
  }

  /** GET /api/v1/plugins/<ns>/<name> */
  async get(slug: string): Promise<Plugin> {
    const raw = await getJson<unknown>(this.url(`/plugins/${slug}`), this.timeoutMs);
    return PluginSchema.parse(raw);
  }

  async search(q: string): Promise<Plugin[]> {
    const idx = await this.list(q);
    return idx.plugins;
  }
}
