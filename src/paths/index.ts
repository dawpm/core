import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Detect whether we are running in WSL.
 */
export function isWsl(): boolean {
  if (process.platform !== 'linux') return false;
  return /microsoft/i.test(os.release()) || process.env.WSL_DISTRO_NAME !== undefined;
}

/**
 * Translate a Windows path to a WSL Linux path. Idempotent.
 *   "C:\\Users\\me" -> "/mnt/c/Users/me"
 *   "/mnt/c/Users/me" -> unchanged
 */
export function winToWsl(p: string): string {
  if (!p) return p;
  if (p.startsWith('/mnt/')) return p.replace(/\\/g, '/');
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(p);
  if (!m) return p.replace(/\\/g, '/');
  const drive = m[1]!.toLowerCase();
  const rest = m[2]!.replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

/**
 * Translate a WSL path to a Windows path. Idempotent.
 */
export function wslToWin(p: string): string {
  if (!p) return p;
  const m = /^\/mnt\/([a-z])\/(.*)$/i.exec(p);
  if (!m) return p.replace(/\//g, '\\');
  const drive = m[1]!.toUpperCase();
  const rest = m[2]!.replace(/\//g, '\\');
  return `${drive}:\\${rest}`;
}

/**
 * Returns the path in the form expected by the host OS (or by WSL when running there).
 * For WSL we keep paths as /mnt/c/... style so Node fs ops work directly.
 */
export function toLocalFsPath(p: string): string {
  if (process.platform === 'win32') {
    if (p.startsWith('/mnt/')) return wslToWin(p);
    return p;
  }
  if (isWsl() && /^[A-Za-z]:[\\/]/.test(p)) return winToWsl(p);
  return p;
}

/**
 * Convert a local FS path to the form a Windows .exe expects when invoked from WSL.
 */
export function toWindowsToolPath(p: string): string {
  if (process.platform === 'win32') return p;
  if (isWsl()) return wslToWin(p);
  return p;
}

export function expandHome(p: string): string {
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
  return p;
}

export function expandEnv(p: string): string {
  return p.replace(/%([^%]+)%/g, (_, k: string) => process.env[k] ?? `%${k}%`)
          .replace(/\$\{([^}]+)\}/g, (_, k: string) => process.env[k] ?? `\${${k}}`);
}

export function expandPath(p: string): string {
  return expandHome(expandEnv(p));
}
