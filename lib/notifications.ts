import { Platform } from 'react-native';

import type { Habit } from '@/lib/HabitsContext';
import type { Settings } from '@/lib/SettingsContext';

type NotificationsModule = typeof import('expo-notifications') | null;

let Notifications: NotificationsModule = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    Notifications = null;
  }
}

export const notificationsAvailable = () => !!Notifications;

export async function requestPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelAllScheduled(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export function parseHHMM(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

export function reminderTimeFor(habit: Habit, settings: Settings): string {
  return habit.reminderTime || settings.defaultReminderTime || '09:00';
}

export async function rescheduleReminders(settings: Settings, habits: Habit[]): Promise<void> {
  if (!Notifications) return;
  await cancelAllScheduled();
  if (!settings.notificationsEnabled) return;

  for (const habit of habits) {
    if (habit.reminderEnabled === false) continue;
    const time = parseHHMM(reminderTimeFor(habit, settings));
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${habit.emoji} ${habit.name}`,
          body:
            habit.type === 'volume'
              ? `Time for ${habit.name}. Tap to log.`
              : `Check in for ${habit.name}.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });
    } catch {
      // ignore individual scheduling errors
    }
  }
}
