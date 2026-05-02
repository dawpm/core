import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig } from '../src/config/cascade.js';

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dawpm-cfg-'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns defaults when no files exist', async () => {
    const cfg = await loadConfig({
      cwd: tmp,
      env: {},
      defaults: { registry: 'https://default.example' },
      homeRcPath: path.join(tmp, '__nope__'),
      systemRcPath: path.join(tmp, '__nope2__')
    });
    expect(cfg.registry).toBe('https://default.example');
  });

  it('overrides defaults with home rc', async () => {
    const home = path.join(tmp, '.dawpmrc');
    await fs.writeFile(home, 'registry = https://home.example\n');
    const cfg = await loadConfig({
      cwd: tmp,
      env: {},
      defaults: { registry: 'https://default.example' },
      homeRcPath: home,
      systemRcPath: path.join(tmp, '__nope__')
    });
    expect(cfg.registry).toBe('https://home.example');
  });

  it('walks up from cwd and project rc wins over home', async () => {
    const home = path.join(tmp, '.home.rc');
    await fs.writeFile(home, 'registry = https://home.example\n');
    const sub = path.join(tmp, 'a', 'b');
    await fs.mkdir(sub, { recursive: true });
    await fs.writeFile(path.join(tmp, 'a', '.dawpmrc'), 'registry = https://project.example\n');
    const cfg = await loadConfig({
      cwd: sub,
      env: {},
      homeRcPath: home,
      systemRcPath: path.join(tmp, '__nope__')
    });
    expect(cfg.registry).toBe('https://project.example');
  });

  it('env overrides files; cli overrides env', async () => {
    const cfg = await loadConfig({
      cwd: tmp,
      env: { DAWPM_REGISTRY: 'https://env.example' },
      cli: { registry: 'https://cli.example' },
      homeRcPath: path.join(tmp, '__nope__'),
      systemRcPath: path.join(tmp, '__nope__')
    });
    expect(cfg.registry).toBe('https://cli.example');
  });

  it('supports nested keys via dotted env (DAWPM_DAW__FL_STUDIO__EXE)', async () => {
    const cfg = await loadConfig({
      cwd: tmp,
      env: { 'DAWPM_DAW__FL-STUDIO__EXE': 'C:\\FL\\FL64.exe' },
      homeRcPath: path.join(tmp, '__nope__'),
      systemRcPath: path.join(tmp, '__nope__')
    });
    expect((cfg as any).daw?.['fl-studio']?.exe).toBe('C:\\FL\\FL64.exe');
  });
});
