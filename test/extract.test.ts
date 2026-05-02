import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { extractByRule } from '../src/installer/extract.js';

let work: string;
let zip: string;

beforeAll(async () => {
  work = await fs.mkdtemp(path.join(tmpdir(), 'dawpm-extract-'));
  // build a tiny zip with `zip` cli (preinstalled on linux runners)
  const src = path.join(work, 'src');
  await fs.mkdir(path.join(src, 'PluginRoot'), { recursive: true });
  await fs.writeFile(path.join(src, 'PluginRoot', 'thing.dll'), 'hello');
  await fs.writeFile(path.join(src, 'PluginRoot', 'README.txt'), 'docs');
  await fs.writeFile(path.join(src, 'TopLevel.txt'), 'top');
  zip = path.join(work, 'pkg.zip');
  const r = spawnSync('zip', ['-rq', zip, '.'], { cwd: src });
  if (r.status !== 0) throw new Error(`zip cli failed: ${r.stderr?.toString()}`);
});

afterAll(async () => {
  await fs.rm(work, { recursive: true, force: true });
});

describe('extractByRule', () => {
  it('strips and matches *.dll', async () => {
    const dest = path.join(work, 'out1');
    const written = await extractByRule(zip, { format: 'vst', include: ['**/*.dll'], strip: 1 }, dest);
    expect(written.map(w => path.basename(w.dest)).sort()).toEqual(['thing.dll']);
    const stat = await fs.stat(path.join(dest, 'thing.dll'));
    expect(stat.size).toBe(5);
  });

  it('honors exclude', async () => {
    const dest = path.join(work, 'out2');
    const written = await extractByRule(zip, {
      format: 'vst', include: ['**/*'], exclude: ['**/*.txt'], strip: 1,
    }, dest);
    expect(written.map(w => path.basename(w.dest))).toEqual(['thing.dll']);
  });

  it('skips entries with too few path components for strip', async () => {
    const dest = path.join(work, 'out3');
    // strip 2 means PluginRoot/thing.dll → discarded (only 2 parts, becomes empty after strip 2)
    const written = await extractByRule(zip, { format: 'vst', include: ['**/*'], strip: 2 }, dest);
    expect(written).toEqual([]);
  });
});
