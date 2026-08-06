import { describe, expect, it } from 'vitest';
import { getGitHubUploadPartSize } from './githubClient';

describe('GitHub backup upload part sizing', () => {
    it('uses small sequential parts on iOS to avoid WebKit reloads', () => {
        expect(getGitHubUploadPartSize(true)).toBe(8 * 1024 * 1024);
    });

    it('keeps the Cloudflare-safe 80 MiB parts on other platforms', () => {
        expect(getGitHubUploadPartSize(false)).toBe(80 * 1024 * 1024);
    });
});
