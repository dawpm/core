import { promises as fs, createWriteStream } from 'node:fs';
import * as path from 'node:path';
import yauzl from 'yauzl';
import micromatch from 'micromatch';
import type { InstallRule } from '../schemas/registry.js';

export interface ExtractedFile {
  /** Absolute destination path on the local filesystem. */
  dest: string;
  /** Path inside the zip (after strip), used for matching and logging. */
  zipPath: string;
}

/**
 * Strip N leading path components. Returns null if there are not enough components.
 */
function stripPath(p: string, n: number): string | null {
  if (n <= 0) return p;
  const parts = p.split('/');
  if (parts.length <= n) return null;
  return parts.slice(n).join('/');
}

function matches(rule: InstallRule, p: string): boolean {
  if (!micromatch.isMatch(p, rule.include, { dot: true, nocase: true })) return false;
  if (rule.exclude && rule.exclude.length > 0) {
    if (micromatch.isMatch(p, rule.exclude, { dot: true, nocase: true })) return false;
  }
  return true;
}

/**
 * Extract entries from `zipPath` matching `rule` into `destDir`.
 * Returns the list of files written.
 */
export function extractByRule(
  zipPath: string,
  rule: InstallRule,
  destDir: string,
): Promise<ExtractedFile[]> {
  return new Promise((resolve, reject) => {
    const written: ExtractedFile[] = [];
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error('failed to open zip'));
      zip.on('error', reject);
      zip.on('end', () => resolve(written));
      zip.readEntry();
      zip.on('entry', entry => {
        const norm = entry.fileName.replace(/\\/g, '/');
        // skip directory entries
        if (/\/$/.test(norm)) { zip.readEntry(); return; }
        // safety: no path traversal
        if (norm.includes('..')) { zip.readEntry(); return; }
        const stripped = stripPath(norm, rule.strip);
        if (stripped === null) { zip.readEntry(); return; }
        if (!matches(rule, stripped)) { zip.readEntry(); return; }

        // flatten to basename only — VST/FST install dirs don't want nested folders
        const dest = path.join(destDir, path.basename(stripped));
        zip.openReadStream(entry, (err2, rs) => {
          if (err2 || !rs) return reject(err2 ?? new Error('failed to open entry stream'));
          fs.mkdir(path.dirname(dest), { recursive: true })
            .then(() => {
              const ws = createWriteStream(dest);
              rs.pipe(ws);
              ws.on('close', () => {
                written.push({ dest, zipPath: stripped });
                zip.readEntry();
              });
              ws.on('error', reject);
            })
            .catch(reject);
        });
      });
    });
  });
}
