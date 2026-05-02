import { promises as fs } from 'node:fs';
import { downloadFile } from './download.js';
import { extractByRule } from './extract.js';
import type { DawAdapter } from '../daw/adapter.js';
import type { Plugin } from '../schemas/registry.js';
import type { LockEntry } from '../schemas/manifest.js';

export interface InstallPluginOptions {
  plugin: Plugin;
  adapter: DawAdapter;
  cacheDir: string;
}

export interface InstallPluginResult {
  slug: string;
  installedFiles: string[];
  fromCache: boolean;
}

/**
 * Download → verify sha256 → extract every install rule into the adapter's
 * format-specific directory. Returns the final lockfile entry.
 */
export async function installPlugin(opts: InstallPluginOptions): Promise<{ entry: LockEntry; result: InstallPluginResult }> {
  const { plugin, adapter, cacheDir } = opts;
  const dl = await downloadFile({
    url: plugin.download.url,
    expectedSha256: plugin.download.sha256,
    cacheDir,
  });

  const installedFiles: string[] = [];
  for (const rule of plugin.install) {
    const dir = adapter.installDirFor(rule.format);
    await fs.mkdir(dir, { recursive: true });
    const written = await extractByRule(dl.path, rule, dir);
    for (const w of written) installedFiles.push(w.dest);
  }

  const entry: LockEntry = {
    slug: plugin.slug,
    resolvedUrl: plugin.download.url,
    sha256: plugin.download.sha256,
    installedAt: new Date().toISOString(),
    installedFiles,
  };
  return {
    entry,
    result: { slug: plugin.slug, installedFiles, fromCache: dl.fromCache },
  };
}

/**
 * Best-effort uninstall: deletes recorded files. Missing files are ignored.
 */
export async function uninstallPlugin(entry: LockEntry): Promise<{ removed: string[]; missing: string[] }> {
  const removed: string[] = [];
  const missing: string[] = [];
  for (const f of entry.installedFiles) {
    try {
      await fs.unlink(f);
      removed.push(f);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') missing.push(f);
      else throw err;
    }
  }
  return { removed, missing };
}
