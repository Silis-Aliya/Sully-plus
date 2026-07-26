import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('OS domain context split', () => {
  const osSource = readFileSync(new URL('../context/OSContext.tsx', import.meta.url), 'utf8');
  const shellSource = readFileSync(new URL('../components/PhoneShell.tsx', import.meta.url), 'utf8');
  const launcherSource = readFileSync(new URL('../apps/Launcher.tsx', import.meta.url), 'utf8');
  const chatSource = readFileSync(new URL('../apps/Chat.tsx', import.meta.url), 'utf8');
  const settingsSource = readFileSync(new URL('../apps/Settings.tsx', import.meta.url), 'utf8');

  it('provides stable navigation, character, notification, backup, appearance and config domains', () => {
    for (const provider of [
      'NavigationContext.Provider',
      'CharacterDataContext.Provider',
      'NotificationContext.Provider',
      'AlertContext.Provider',
      'MessageActivityContext.Provider',
      'SystemLogContext.Provider',
      'BackupContext.Provider',
      'AppearanceContext.Provider',
      'SystemConfigContext.Provider',
    ]) {
      expect(osSource).toContain(provider);
    }
    expect(osSource).toContain('const useStableActions =');
    expect(osSource).toContain('const notificationValue = useMemo<NotificationContextType>');
    expect(osSource).toContain('const backupValue = useMemo<BackupContextType>');
  });

  it('keeps always-mounted shell and launcher off the legacy aggregate context', () => {
    expect(shellSource).not.toContain('useOS(');
    expect(launcherSource).not.toContain('useOS(');
    expect(shellSource).toContain('useNavigation()');
    expect(shellSource).toContain('const AppViewport = React.memo');
    expect(shellSource).toContain('const GlobalAlerts = React.memo');
    expect(shellSource).toContain('useMessageActivity()');
    expect(shellSource).not.toContain('useNotifications()');
    expect(launcherSource).toContain('useCharacterData()');
  });

  it('keeps the high-cost chat and backup settings screens on domain hooks', () => {
    expect(chatSource).not.toContain('useOS(');
    expect(settingsSource).not.toContain('useOS(');
    expect(chatSource).toContain('useSystemConfig()');
    expect(settingsSource).toContain('useBackup()');
  });
});
