# @dawpm/core

The shared library behind [dawpm](https://github.com/dawpm/dawpm).

It's not meant to be used directly — install [`@dawpm/cli`](https://www.npmjs.com/package/@dawpm/cli) instead. This package contains:

- Zod schemas for the manifest, lockfile, and registry index
- A typed registry client
- The installer (download, sha256 verify, glob-extract, cache by hash)
- DAW adapters (FL Studio, with more to come)
- A small config cascade for `~/.dawpmrc`

## Install

```sh
npm install @dawpm/core
```

## License

MIT
