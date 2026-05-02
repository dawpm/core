import { z } from 'zod';
import { SlugSchema } from './registry.js';

export const SUPPORTED_DAWS = ['fl-studio'] as const;
export const DawIdSchema = z.enum(SUPPORTED_DAWS);
export type DawId = z.infer<typeof DawIdSchema>;

/**
 * dawpm.yaml — versionless project manifest.
 */
export const ManifestSchema = z.object({
  name: z.string().min(1),
  daw: DawIdSchema,
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  project: z.string().optional(),
  dependencies: z.array(SlugSchema).default([]),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Lockfile entry: pinned download + the absolute paths that were copied into the DAW.
 * Not semver — dawpm pins by sha256 of the source zip.
 */
export const LockEntrySchema = z.object({
  slug: SlugSchema,
  resolvedUrl: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  installedAt: z.string(),
  installedFiles: z.array(z.string()).default([]),
});
export type LockEntry = z.infer<typeof LockEntrySchema>;

export const LockfileSchema = z.object({
  lockfileVersion: z.literal(1),
  name: z.string(),
  daw: DawIdSchema,
  packages: z.record(SlugSchema, LockEntrySchema).default({}),
});
export type Lockfile = z.infer<typeof LockfileSchema>;
