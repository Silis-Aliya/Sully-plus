import { describe, expect, it } from 'vitest';
import { sanitizeHubMigrationPayload } from './hubMigration';

describe('Hub migration safety filter', () => {
    it('removes credentials recursively while preserving character and vector data', () => {
        const source = {
            characters: [{ id: 'char-1', name: 'Sully', systemPrompt: 'stay in character', apiKey: 'secret' }],
            memoryPalaceConfig: {
                embedding: { baseUrl: 'https://embedding.example', apiKey: 'secret', model: 'embed-v1' },
                serviceToken: 'secret',
            },
            memoryVectors: [{ memoryId: 'm1', vector: new Float32Array([0.25, 0.5]) }],
        };

        const result = sanitizeHubMigrationPayload(source) as any;
        expect(result.characters[0]).toEqual({ id: 'char-1', name: 'Sully', systemPrompt: 'stay in character' });
        expect(result.memoryPalaceConfig.embedding).toEqual({ baseUrl: 'https://embedding.example', model: 'embed-v1' });
        expect(result.memoryPalaceConfig.serviceToken).toBeUndefined();
        expect(result.memoryVectors[0].vector).toEqual([0.25, 0.5]);
    });
});
