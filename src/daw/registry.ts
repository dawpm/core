import type { DawAdapter, DawAdapterFactoryConfig } from './adapter.js';
import { FlStudioAdapter } from './fl-studio.js';
import { SUPPORTED_DAWS, type DawId } from '../schemas/manifest.js';

export function listDaws(): readonly string[] {
  return SUPPORTED_DAWS;
}

export function getDawAdapter(id: DawId | string, opts: DawAdapterFactoryConfig = {}): DawAdapter {
  switch (id) {
    case 'fl-studio': return new FlStudioAdapter(opts);
    default:
      throw new Error(`unknown DAW "${id}". Available: ${SUPPORTED_DAWS.join(', ')}`);
  }
}
