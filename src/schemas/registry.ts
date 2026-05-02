import { z } from 'zod';

/**
 * Slug: "namespace/name", lowercase, [a-z0-9-].
 */
export const SlugSchema = z.string().regex(
  /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/,
  'slug must be "namespace/name" (lowercase, [a-z0-9-])'
);
export type Slug = z.infer<typeof SlugSchema>;

/**
 * Plugin install format. Determines which directory the adapter copies into.
 */
export const PluginFormatSchema = z.enum(['vst', 'vst3', 'fst']);
export type PluginFormat = z.infer<typeof PluginFormatSchema>;

export const InstallRuleSchema = z.object({
  format: PluginFormatSchema,
  include: z.array(z.string()).min(1),
  exclude: z.array(z.string()).optional(),
  /** Strip N leading path components from zip entries before applying include/exclude. */
  strip: z.number().int().min(0).default(0),
});
export type InstallRule = z.infer<typeof InstallRuleSchema>;

export const DownloadSchema = z.object({
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().positive(),
});
export type Download = z.infer<typeof DownloadSchema>;

/**
 * One plugin record, matching the data-repo yaml shape.
 */
export const PluginSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  homepage: z.string().url().optional(),
  image: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  download: DownloadSchema,
  install: z.array(InstallRuleSchema).min(1),
});
export type Plugin = z.infer<typeof PluginSchema>;

/**
 * Compiled registry index (v1/plugins.json).
 */
export const RegistryIndexSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  count: z.number().int().nonnegative(),
  plugins: z.array(PluginSchema),
});
export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
