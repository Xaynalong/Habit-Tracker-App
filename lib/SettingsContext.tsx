import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'settings.v1';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Settings = {
  onboarded: boolean;
  haptics: boolean;
  sound: boolean;
  notificationsEnabled: boolean;
  defaultReminderTime: string; // HH:mm — used when a habit has no override
  devMode: boolean;
  theme: ThemePreference;
};

const DEFAULTS: Settings = {
  onboarded: false,
  haptics: true,
  sound: true,
  notificationsEnabled: false,
  defaultReminderTime: '09:00',
  devMode: false,
  theme: 'system',
};

type SettingsContextValue = {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Migrate from morning/evening to single default if needed
            if (parsed.morningReminder && !parsed.defaultReminderTime) {
              parsed.defaultReminderTime = parsed.morningReminder;
            }
            setSettings({ ...DEFAULTS, ...parsed });
          } catch {
            // ignore malformed
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
    }
  }, [settings, loaded]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loaded, update, reset }),
    [settings, loaded, update, reset]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
