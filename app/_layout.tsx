import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { HabitsProvider, useHabits } from '@/lib/HabitsContext';
import { rescheduleReminders } from '@/lib/notifications';
import { RewardProvider } from '@/lib/reward';
import { SettingsProvider, useSettings } from '@/lib/SettingsContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <Providers />;
}

function Providers() {
  return (
    <SettingsProvider>
      <HabitsProvider>
        <RewardProvider>
          <ThemedApp />
        </RewardProvider>
      </HabitsProvider>
    </SettingsProvider>
  );
}

function ThemedApp() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OnboardingGate />
      <ReminderSync />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="habit/[id]" options={{ title: 'Habit' }} />
      </Stack>
    </ThemeProvider>
  );
}

function ReminderSync() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { habits, loaded: habitsLoaded } = useHabits();
  useEffect(() => {
    if (!settingsLoaded || !habitsLoaded) return;
    rescheduleReminders(settings, habits).catch(() => {});
  }, [settings, habits, settingsLoaded, habitsLoaded]);
  return null;
}

function OnboardingGate() {
  const { settings, loaded } = useSettings();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loaded) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!settings.onboarded && !inOnboarding) {
      router.replace('/onboarding' as never);
    } else if (settings.onboarded && inOnboarding) {
      router.replace('/' as never);
    }
  }, [loaded, settings.onboarded, segments, router]);

  return null;
}
