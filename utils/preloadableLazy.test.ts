import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createPreloadableLazy } from '../components/os/preloadableLazy';

const TestComponent: React.FC = () => null;

describe('createPreloadableLazy', () => {
  it('deduplicates concurrent preload requests and retries failures', async () => {
    const factory = vi.fn().mockRejectedValueOnce(new Error('temporary chunk failure')).mockResolvedValueOnce({ default: TestComponent });
    const Component = createPreloadableLazy(factory);
    await expect(Component.preload()).rejects.toThrow('temporary chunk failure');
    await expect(Component.preload()).resolves.toEqual({ default: TestComponent });
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
