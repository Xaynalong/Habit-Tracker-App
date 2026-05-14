import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useSettings } from '@/lib/SettingsContext';

export function useColorScheme(): 'light' | 'dark' {
  const native = useNativeColorScheme();
  const { settings } = useSettings();
  if (settings.theme === 'light') return 'light';
  if (settings.theme === 'dark') return 'dark';
  return native === 'dark' ? 'dark' : 'light';
}
