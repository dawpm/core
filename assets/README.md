# Bundled assets

## `empty.flp`

Placeholder FL Studio project bundled with `@dawpm/core` so that `dawpm init` can
create a fresh `.flp` without needing FL Studio installed (FL has no CLI option to
create an empty project).

The current file is a minimal stub with the `FLhd` magic header. **Before
publishing 1.0** this should be replaced with a real, blank project saved from
FL Studio. To regenerate:

1. Open FL Studio
2. `File -> New from template -> Empty`
3. Save As `empty.flp`
4. Copy it over this file
