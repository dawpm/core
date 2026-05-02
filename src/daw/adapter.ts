import type { PluginFormat } from '../schemas/registry.js';

export interface BuildOptions {
  project: string;
  output?: string;
  format?: 'wav' | 'mp3' | 'flac' | 'midi';
}

export interface BuildResult {
  outputs: string[];
}

export interface DiscoveredPlugin {
  name: string;
  format: string;
  path: string;
}

/**
 * Minimal DAW adapter. Each adapter derives all install dirs from its own
 * single root config key (e.g. [daw.fl-studio] root in .dawpmrc).
 */
export interface DawAdapter {
  readonly id: string;
  readonly name: string;

  /** Absolute install directory for a given plugin format. */
  installDirFor(format: PluginFormat): string;

  /** Default scan paths to walk when discovering already-installed plugins. */
  defaultScanPaths(): string[];

  /** Create a fresh empty project file. Must not overwrite. */
  initProject(projectPath: string): Promise<void>;

  /** Render the project. */
  build(opts: BuildOptions): Promise<BuildResult>;

  /** Walk scan paths and report installed plugins. */
  discover(scanPaths?: string[]): Promise<DiscoveredPlugin[]>;
}

export interface DawAdapterFactoryConfig {
  /** Per-DAW config from .dawpmrc, e.g. { root: 'C:\\Program Files\\Image-Line\\FL Studio 21' } */
  config?: Record<string, string>;
}
