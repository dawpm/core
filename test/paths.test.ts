import { describe, it, expect } from 'vitest';
import { winToWsl, wslToWin } from '../src/paths/index.js';

describe('path translation', () => {
  it('winToWsl converts drive letters', () => {
    expect(winToWsl('C:\\Users\\me')).toBe('/mnt/c/Users/me');
    expect(winToWsl('D:\\Audio\\proj.flp')).toBe('/mnt/d/Audio/proj.flp');
  });
  it('winToWsl is idempotent on /mnt paths', () => {
    expect(winToWsl('/mnt/c/Users/me')).toBe('/mnt/c/Users/me');
  });
  it('wslToWin converts /mnt paths', () => {
    expect(wslToWin('/mnt/c/Users/me')).toBe('C:\\Users\\me');
  });
  it('wslToWin handles non-mnt paths', () => {
    expect(wslToWin('/home/me')).toBe('\\home\\me');
  });
});
