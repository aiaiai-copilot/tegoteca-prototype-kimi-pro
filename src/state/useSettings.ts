import { useEffect, useState } from 'react';

export interface UserSettings {
  contentReminder: boolean;
  showOwnCounts: boolean;
}

const defaults: UserSettings = { contentReminder: true, showOwnCounts: true };

function readSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem('tegoteca:settings');
    if (!raw) return defaults;
    const value = JSON.parse(raw) as Partial<UserSettings>;
    return {
      contentReminder: typeof value.contentReminder === 'boolean' ? value.contentReminder : true,
      showOwnCounts: typeof value.showOwnCounts === 'boolean' ? value.showOwnCounts : true,
    };
  } catch {
    return defaults;
  }
}

export function useSettings(): [UserSettings, (patch: Partial<UserSettings>) => void] {
  const [settings, setSettings] = useState<UserSettings>(readSettings);
  useEffect(() => {
    try {
      window.localStorage.setItem('tegoteca:settings', JSON.stringify(settings));
    } catch {
      // Настройки остаются действующими до перезапуска, если хранилище недоступно.
    }
  }, [settings]);
  return [settings, (patch) => setSettings((current) => ({ ...current, ...patch }))];
}
