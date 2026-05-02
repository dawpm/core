import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { DawAdapter, BuildOptions, BuildResult, DiscoveredPlugin, DawAdapterFactoryConfig } from './adapter.js';
import type { PluginFormat } from '../schemas/registry.js';
import { isWsl, toLocalFsPath, toWindowsToolPath, expandPath } from '../paths/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class FlStudioConfigError extends Error {
  constructor(message: string) { super(message); this.name = 'FlStudioConfigError'; }
}

/**
 * FL Studio adapter. The user supplies a single root in .dawpmrc:
 *
 *   [daw.fl-studio]
 *   root = C:\Program Files\Image-Line\FL Studio 21
 *
 * dawpm derives every other directory from that.
 */
export class FlStudioAdapter implements DawAdapter {
  readonly id = 'fl-studio';
  readonly name = 'FL Studio';
  private readonly root: string;

  constructor(opts: DawAdapterFactoryConfig = {}) {
    const root = opts.config?.root;
    if (!root) {
      throw new FlStudioConfigError(
        'FL Studio root not configured. Add the following to your .dawpmrc:\n\n' +
        '  [daw.fl-studio]\n' +
        '  root = C:\\Program Files\\Image-Line\\FL Studio 21\n'
      );
    }
    this.root = root;
  }

  private appdata(): string {
    return process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming');
  }

  installDirFor(format: PluginFormat): string {
    switch (format) {
      case 'vst3': return toLocalFsPath(path.join(this.root, 'Plugins', 'VST3'));
      case 'vst':  return toLocalFsPath(path.join(this.root, 'Plugins', 'VST'));
      case 'fst':  return toLocalFsPath(path.join(
        this.appdata(),
        'Image-Line', 'FL Studio', 'Presets', 'Plugin presets', 'Generators',
      ));
    }
  }

  defaultScanPaths(): string[] {
    return [
      path.join(this.root, 'Plugins', 'VST'),
      path.join(this.root, 'Plugins', 'VST3'),
    ];
  }

  async initProject(projectPath: string): Promise<void> {
    const local = toLocalFsPath(projectPath);
    try {
      await fs.access(local);
      throw new Error(`project already exists: ${projectPath}`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    await fs.mkdir(path.dirname(local), { recursive: true });
    const tpl = path.join(__dirname, '..', '..', 'assets', 'empty.flp');
    await fs.copyFile(tpl, local);
  }

  async build(opts: BuildOptions): Promise<BuildResult> {
    const exe = this.findFlExe();
    if (!exe) {
      throw new FlStudioConfigError(
        `FL Studio executable not found under ${this.root}. ` +
        `Expected FL64.exe in the FL Studio root directory.`,
      );
    }
    const projWin = toWindowsToolPath(opts.project);
    const out = opts.output ? toWindowsToolPath(opts.output) : undefined;
    const fmt = opts.format ?? 'wav';
    const args: string[] = [projWin, '/R'];
    args.push(`/E${fmt === 'midi' ? 'midi' : fmt}`);
    if (out) args.push(`/F${out}`);
    await runProcess(exe, args);
    return { outputs: out ? [out] : [] };
  }

  async discover(scanPaths?: string[]): Promise<DiscoveredPlugin[]> {
    const roots = (scanPaths ?? this.defaultScanPaths()).map(expandPath).map(toLocalFsPath);
    const found: DiscoveredPlugin[] = [];
    for (const r of roots) {
      try { await walk(r, found); } catch { /* missing path is fine */ }
    }
    return found;
  }

  private findFlExe(): string | null {
    const candidates = [
      path.join(this.root, 'FL64.exe'),
      path.join(this.root, 'FL.exe'),
    ];
    // synchronous existsSync would be cleaner; keep async API but probe at call time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsSync = require('node:fs');
    for (const c of candidates) {
      if (fsSync.existsSync(toLocalFsPath(c))) return c;
    }
    return null;
  }
}

async function walk(dir: string, found: DiscoveredPlugin[], depth = 0): Promise<void> {
  if (depth > 4) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.endsWith('.vst3')) {
        found.push({ name: path.basename(e.name, '.vst3'), format: 'vst3', path: full });
        continue;
      }
      await walk(full, found, depth + 1).catch(() => undefined);
    } else if (e.isFile()) {
      const lower = e.name.toLowerCase();
      if (lower.endsWith('.dll')) found.push({ name: path.basename(e.name, '.dll'), format: 'vst', path: full });
      else if (lower.endsWith('.fst')) found.push({ name: path.basename(e.name, '.fst'), format: 'fst', path: full });
    }
  }
}

function runProcess(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
  });
}

// Keep isWsl referenced for type-import side-effects without using it directly.
void isWsl;
