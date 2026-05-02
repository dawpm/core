import { describe, it, expect } from 'vitest';
import { PluginSchema, ManifestSchema, LockfileSchema } from '../src/index.js';

describe('PluginSchema', () => {
  it('accepts a valid plugin', () => {
    const ok = PluginSchema.parse({
      slug: 'dsk/overture',
      name: 'DSK Overture',
      description: 'Free orchestral VSTi.',
      author: 'DSK Music',
      license: 'freeware',
      homepage: 'https://www.dskmusic.com/dsk-overture',
      tags: ['orchestra'],
      download: {
        url: 'https://example.com/x.zip',
        sha256: 'a'.repeat(64),
        size: 100,
      },
      install: [{ format: 'vst', include: ['**/*.dll'], strip: 1 }],
    });
    expect(ok.slug).toBe('dsk/overture');
    expect(ok.install[0]!.strip).toBe(1);
  });

  it('rejects bad slugs', () => {
    expect(() => PluginSchema.parse({
      slug: 'BadSlug',
      name: 'x', description: 'x', author: 'x', license: 'x',
      download: { url: 'https://x/y.zip', sha256: 'a'.repeat(64), size: 1 },
      install: [{ format: 'vst', include: ['*.dll'] }],
    })).toThrow(/slug/);
  });

  it('rejects bad sha256', () => {
    expect(() => PluginSchema.parse({
      slug: 'a/b', name: 'x', description: 'x', author: 'x', license: 'x',
      download: { url: 'https://x/y.zip', sha256: 'short', size: 1 },
      install: [{ format: 'vst', include: ['*.dll'] }],
    })).toThrow();
  });
});

describe('ManifestSchema', () => {
  it('accepts versionless manifest', () => {
    const m = ManifestSchema.parse({
      name: 'demo',
      daw: 'fl-studio',
      dependencies: ['dsk/overture'],
    });
    expect(m.dependencies).toEqual(['dsk/overture']);
  });

  it('defaults dependencies to []', () => {
    const m = ManifestSchema.parse({ name: 'demo', daw: 'fl-studio' });
    expect(m.dependencies).toEqual([]);
  });

  it('rejects unknown daw', () => {
    expect(() => ManifestSchema.parse({ name: 'x', daw: 'reaper' })).toThrow();
  });
});

describe('LockfileSchema', () => {
  it('round-trips', () => {
    const l = LockfileSchema.parse({
      lockfileVersion: 1,
      name: 'demo',
      daw: 'fl-studio',
      packages: {
        'dsk/overture': {
          slug: 'dsk/overture',
          resolvedUrl: 'https://x/y.zip',
          sha256: 'a'.repeat(64),
          installedAt: '2025-01-01T00:00:00Z',
          installedFiles: ['/tmp/DSK Overture.dll'],
        },
      },
    });
    expect(Object.keys(l.packages)).toEqual(['dsk/overture']);
  });
});
