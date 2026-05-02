# @dawpm/core

Core library for [dawpm](https://github.com/dawpm), a package manager for DAW
plugins, presets, and projects.

This package is not the CLI. For end users, install [`@dawpm/cli`](https://www.npmjs.com/package/@dawpm/cli).
This package exposes the building blocks the CLI and other tooling are built on:

- Zod schemas for the [Open Audio Stack](https://github.com/open-audio-stack/open-audio-stack-core) JSON format and the dawpm manifest/lockfile.
- YAML manifest (`dawpm.yaml`) and lockfile (`dawpm.lock.yaml`) read/write.
- INI config cascade (`.dawpmrc`) with npm-style precedence.
- HTTP registry client (`@dawpm/registry` compatible).
- Download / SHA-256 verify / zip extract installer pipeline.
- `DawAdapter` interface and a first implementation: `FlStudioAdapter`.
- WSL ⇄ Windows path translation utilities.

## Install

```sh
npm install @dawpm/core
```

## Usage

```ts
import {
  loadConfig,
  RegistryClient,
  getDawAdapter,
  resolveAndInstall,
  readManifest
} from '@dawpm/core';

const cfg = await loadConfig();
const manifest = await readManifest(process.cwd());
const adapter = getDawAdapter(manifest.daw.id);
const registry = new RegistryClient({ baseUrl: cfg.registry ?? 'https://registry.dawpm.dev' });
const result = await resolveAndInstall({
  manifest, registry, adapter,
  cacheDir: cfg.cache ?? '/tmp/dawpm-cache'
});
```

## Status

Pre-1.0. Public API may change. Schemas track Open Audio Stack v1.0.

## License

MIT
