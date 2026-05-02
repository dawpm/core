import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import ini from 'ini';

/**
 * Resolved dawpm config. All keys optional; consumers apply their own defaults.
 */
export interface DawpmConfig {
  registry?: string;
  registries?: string[];
  cache?: string;
  log?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  scanPaths?: Record<string, string[]>;
  daw?: Record<string, Record<string, string>>;
  token?: Record<string, string>;
  [k: string]: unknown;
}

const ENV_PREFIX = 'DAWPM_';

function envToConfig(env: NodeJS.ProcessEnv): DawpmConfig {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (!k.startsWith(ENV_PREFIX) || v === undefined) continue;
    const key = k.slice(ENV_PREFIX.length).toLowerCase().replace(/__/g, '.');
    out[key] = v;
  }
  return unflatten(out);
}

function unflatten(flat: Record<string, string>): DawpmConfig {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]!] = v;
  }
  return out as DawpmConfig;
}

function deepMerge<T extends Record<string, unknown>>(target: T, src: Record<string, unknown>): T {
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    const tv = (target as Record<string, unknown>)[k];
    if (
      typeof v === 'object' && v !== null && !Array.isArray(v) &&
      typeof tv === 'object' && tv !== null && !Array.isArray(tv)
    ) {
      (target as Record<string, unknown>)[k] = deepMerge(
        { ...(tv as Record<string, unknown>) },
        v as Record<string, unknown>
      );
    } else {
      (target as Record<string, unknown>)[k] = v;
    }
  }
  return target;
}

async function readIni(file: string): Promise<DawpmConfig> {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return ini.parse(txt) as DawpmConfig;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

async function walkUp(start: string): Promise<string[]> {
  const found: string[] = [];
  let dir = path.resolve(start);
  while (true) {
    const candidate = path.join(dir, '.dawpmrc');
    try { await fs.access(candidate); found.push(candidate); } catch { /* ignore */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return found.reverse();
}

export interface LoadConfigOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cli?: DawpmConfig;
  defaults?: DawpmConfig;
  /** Override the global config path (defaults to ~/.dawpmrc) */
  homeRcPath?: string;
  /** Override the system config path (defaults to /etc/dawpmrc) */
  systemRcPath?: string;
}

/**
 * Resolve config in npm-style precedence (later overrides earlier):
 *  1. defaults
 *  2. /etc/dawpmrc
 *  3. ~/.dawpmrc
 *  4. ./.dawpmrc walked up from cwd to root
 *  5. DAWPM_* env vars
 *  6. CLI flags
 */
export async function loadConfig(opts: LoadConfigOptions = {}): Promise<DawpmConfig> {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;
  const homeRc = opts.homeRcPath ?? path.join(os.homedir(), '.dawpmrc');
  const sysRc = opts.systemRcPath ?? '/etc/dawpmrc';

  let cfg: DawpmConfig = {};
  if (opts.defaults) deepMerge(cfg as Record<string, unknown>, opts.defaults);
  deepMerge(cfg as Record<string, unknown>, await readIni(sysRc));
  deepMerge(cfg as Record<string, unknown>, await readIni(homeRc));
  for (const f of await walkUp(cwd)) {
    deepMerge(cfg as Record<string, unknown>, await readIni(f));
  }
  deepMerge(cfg as Record<string, unknown>, envToConfig(env) as Record<string, unknown>);
  if (opts.cli) deepMerge(cfg as Record<string, unknown>, opts.cli as Record<string, unknown>);
  return cfg;
}

export function defaultCacheDir(): string {
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
    return path.join(local, 'dawpm', 'cache');
  }
  const xdg = process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache');
  return path.join(xdg, 'dawpm');
}
