import { useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useSettings } from '@/lib/SettingsContext';

// Web variant: gate the OS scheme behind a hydration flag so SSR + first client
// render agree. After hydration, the user's explicit preference takes priority.
export function useColorScheme(): 'light' | 'dark' {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const native = useNativeColorScheme();
  const { settings } = useSettings();

  if (settings.theme === 'light') return 'light';
  if (settings.theme === 'dark') return 'dark';
  if (!hydrated) return 'light';
  return native === 'dark' ? 'dark' : 'light';
}
