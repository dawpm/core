import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { parse, stringify } from 'yaml';
import { ManifestSchema, type Manifest, LockfileSchema, type Lockfile } from '../schemas/manifest.js';

export const MANIFEST_FILE = 'dawpm.yaml';
export const LOCKFILE_FILE = 'dawpm.lock.yaml';

export async function readManifest(cwd: string): Promise<Manifest> {
  const file = path.join(cwd, MANIFEST_FILE);
  const txt = await fs.readFile(file, 'utf8');
  return ManifestSchema.parse(parse(txt));
}

export async function writeManifest(cwd: string, manifest: Manifest): Promise<void> {
  const validated = ManifestSchema.parse(manifest);
  await fs.writeFile(path.join(cwd, MANIFEST_FILE), stringify(validated), 'utf8');
}

export async function manifestExists(cwd: string): Promise<boolean> {
  try { await fs.access(path.join(cwd, MANIFEST_FILE)); return true; } catch { return false; }
}

export async function readLockfile(cwd: string): Promise<Lockfile | null> {
  const file = path.join(cwd, LOCKFILE_FILE);
  try {
    const txt = await fs.readFile(file, 'utf8');
    return LockfileSchema.parse(parse(txt));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeLockfile(cwd: string, lock: Lockfile): Promise<void> {
  const validated = LockfileSchema.parse(lock);
  await fs.writeFile(path.join(cwd, LOCKFILE_FILE), stringify(validated), 'utf8');
}

export function emptyLockfile(manifest: Manifest): Lockfile {
  return { lockfileVersion: 1, name: manifest.name, daw: manifest.daw, packages: {} };
}
