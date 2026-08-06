import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('iOS viewport workaround boot boundary', () => {
    it('does not install the workaround before React boot renders', () => {
        const entry = fs.readFileSync(path.join(root, 'index.tsx'), 'utf8');
        expect(entry).not.toContain('installIOSStandaloneWorkaround');
    });

    it('installs the workaround only when BootSequence hands off to the lock screen', () => {
        const shell = fs.readFileSync(path.join(root, 'components/PhoneShell.tsx'), 'utf8');
        expect(shell).toContain('const finishBoot = () => {');
        expect(shell).toContain('installIOSStandaloneWorkaround();');
        expect(shell).toContain('onDone={finishBoot}');
    });
});
